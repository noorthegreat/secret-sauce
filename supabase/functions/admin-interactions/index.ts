import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { authenticateEdgeRequest } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InteractionRow = {
  user_id: string;
  other_user_id: string;
  created_at: string | null;
};

type TableConfig = {
  table: "likes" | "dislikes" | "friendship_likes" | "friendship_dislikes";
  targetColumn: "liked_user_id" | "disliked_user_id";
};

const INTERACTION_CONFIG = {
  relationshipLikes: { table: "likes", targetColumn: "liked_user_id" },
  relationshipDislikes: { table: "dislikes", targetColumn: "disliked_user_id" },
  friendshipLikes: { table: "friendship_likes", targetColumn: "liked_user_id" },
  friendshipDislikes: { table: "friendship_dislikes", targetColumn: "disliked_user_id" },
} satisfies Record<string, TableConfig>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeRows = <T extends Record<string, any>>(rows: T[] | null, targetColumn: string): InteractionRow[] =>
  (rows || []).map((row) => ({
    user_id: row.user_id,
    other_user_id: row[targetColumn],
    created_at: row.created_at ?? null,
  }));

const fetchRowsByUserIds = async (
  supabase: any,
  config: TableConfig,
  userIds: string[],
  direction: "outgoing" | "incoming",
) => {
  const targetColumn = config.targetColumn;
  const selectColumns = `user_id, ${targetColumn}, created_at`;
  const query = supabase.from(config.table).select(selectColumns);

  if (userIds.length > 0) {
    if (direction === "outgoing") {
      query.in("user_id", userIds);
    } else {
      query.in(targetColumn, userIds);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return normalizeRows(data as Record<string, any>[] | null, targetColumn);
};

const fetchRowsForUser = async (
  supabase: any,
  config: TableConfig,
  userId: string,
  partnerIds: string[],
) => {
  const targetColumn = config.targetColumn;
  const selectColumns = `user_id, ${targetColumn}, created_at`;

  let outgoingQuery = supabase.from(config.table).select(selectColumns).eq("user_id", userId);
  let incomingQuery = supabase.from(config.table).select(selectColumns).eq(targetColumn, userId);

  if (partnerIds.length > 0) {
    outgoingQuery = outgoingQuery.in(targetColumn, partnerIds);
    incomingQuery = incomingQuery.in("user_id", partnerIds);
  }

  const [{ data: outgoingRows, error: outgoingError }, { data: incomingRows, error: incomingError }] = await Promise.all([
    outgoingQuery,
    incomingQuery,
  ]);

  if (outgoingError) throw outgoingError;
  if (incomingError) throw incomingError;

  return {
    outgoing: normalizeRows(outgoingRows as Record<string, any>[] | null, targetColumn).map((row) => ({
      other_user_id: row.other_user_id,
      created_at: row.created_at,
    })),
    incoming: normalizeRows(incomingRows as Record<string, any>[] | null, targetColumn).map((row) => ({
      other_user_id: row.user_id,
      created_at: row.created_at,
    })),
  };
};

const buildMutualList = (
  likes: Array<{ user_id: string; other_user_id: string; created_at: string | null }>,
  matchType: "relationship" | "friendship",
) => {
  const likedBy = new Map<string, Set<string>>();
  const likeDates = new Map<string, string | null>();
  const mutualPairs = new Set<string>();
  const mutualList: Array<{
    user_id: string;
    matched_user_id: string;
    match_type: "relationship" | "friendship";
    user1_like_date: string | null;
    user2_like_date: string | null;
  }> = [];

  likes.forEach((like) => {
    if (!likedBy.has(like.user_id)) {
      likedBy.set(like.user_id, new Set());
    }
    likedBy.get(like.user_id)?.add(like.other_user_id);
    likeDates.set(`${like.user_id}-${like.other_user_id}`, like.created_at);
  });

  likes.forEach((like) => {
    const u1 = like.user_id;
    const u2 = like.other_user_id;

    if (!likedBy.get(u2)?.has(u1)) return;

    const key = `${matchType}:${[u1, u2].sort().join("-")}`;
    if (mutualPairs.has(key)) return;

    mutualPairs.add(key);
    mutualList.push({
      user_id: u1,
      matched_user_id: u2,
      match_type: matchType,
      user1_like_date: likeDates.get(`${u1}-${u2}`) ?? null,
      user2_like_date: likeDates.get(`${u2}-${u1}`) ?? null,
    });
  });

  return mutualList;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateEdgeRequest(req, { requireAdmin: true });
    if (auth.error) {
      return json({ error: auth.error.message }, auth.error.status);
    }

    const supabase = auth.context!.supabase;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "all_interactions") {
      const [
        relationshipLikes,
        relationshipDislikes,
        friendshipLikes,
        friendshipDislikes,
      ] = await Promise.all([
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.relationshipLikes, [], "outgoing"),
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.relationshipDislikes, [], "outgoing"),
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.friendshipLikes, [], "outgoing"),
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.friendshipDislikes, [], "outgoing"),
      ]);

      return json({
        relationshipLikes,
        relationshipDislikes,
        friendshipLikes,
        friendshipDislikes,
      });
    }

    if (action === "mutual_pairs") {
      const [relationshipLikes, friendshipLikes] = await Promise.all([
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.relationshipLikes, [], "outgoing"),
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.friendshipLikes, [], "outgoing"),
      ]);

      const mutualList = [
        ...buildMutualList(relationshipLikes, "relationship"),
        ...buildMutualList(friendshipLikes, "friendship"),
      ];

      const userIds = Array.from(
        new Set(mutualList.flatMap((pair) => [pair.user_id, pair.matched_user_id]).filter(Boolean)),
      );

      if (userIds.length === 0) {
        return json({ pairs: [] });
      }

      const [{ data: profilesData, error: profilesError }, { data: privateData, error: privateError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, age, additional_photos, photo_url")
          .in("id", userIds),
        supabase
          .from("private_profile_data")
          .select("user_id, last_name")
          .in("user_id", userIds),
      ]);

      if (profilesError) throw profilesError;
      if (privateError) throw privateError;

      const privateByUser = new Map((privateData || []).map((row: any) => [row.user_id, row]));
      const profilesMap = new Map(
        (profilesData || []).map((profile: any) => [
          profile.id,
          { ...profile, last_name: privateByUser.get(profile.id)?.last_name ?? null },
        ]),
      );

      const pairs = mutualList
        .map((pair) => ({
          id: `${pair.match_type}:${[pair.user_id, pair.matched_user_id].sort().join("-")}`,
          user_id: pair.user_id,
          matched_user_id: pair.matched_user_id,
          match_type: pair.match_type,
          user_profile: profilesMap.get(pair.user_id) || null,
          matched_user_profile: profilesMap.get(pair.matched_user_id) || null,
          user1_like_date: pair.user1_like_date,
          user2_like_date: pair.user2_like_date,
        }))
        .filter((pair) => pair.user_profile && pair.matched_user_profile);

      return json({ pairs });
    }

    if (action === "lookup_users") {
      const userIds = Array.isArray(body.userIds)
        ? body.userIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
        : [];

      if (userIds.length === 0) {
        return json({ users: [] });
      }

      const [
        relationshipOutgoing,
        relationshipIncoming,
        friendshipOutgoing,
        friendshipIncoming,
      ] = await Promise.all([
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.relationshipLikes, userIds, "outgoing"),
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.relationshipLikes, userIds, "incoming"),
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.friendshipLikes, userIds, "outgoing"),
        fetchRowsByUserIds(supabase, INTERACTION_CONFIG.friendshipLikes, userIds, "incoming"),
      ]);

      const userPayload = userIds.map((userId: string) => ({
        userId,
        outgoingLikes: relationshipOutgoing
          .filter((row) => row.user_id === userId)
          .map((row) => ({ other_user_id: row.other_user_id, created_at: row.created_at })),
        incomingLikes: relationshipIncoming
          .filter((row) => row.other_user_id === userId)
          .map((row) => ({ other_user_id: row.user_id, created_at: row.created_at })),
        outgoingFriendshipLikes: friendshipOutgoing
          .filter((row) => row.user_id === userId)
          .map((row) => ({ other_user_id: row.other_user_id, created_at: row.created_at })),
        incomingFriendshipLikes: friendshipIncoming
          .filter((row) => row.other_user_id === userId)
          .map((row) => ({ other_user_id: row.user_id, created_at: row.created_at })),
      }));

      return json({ users: userPayload });
    }

    if (action === "user_interactions") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const partnerIds = Array.isArray(body.partnerIds)
        ? body.partnerIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
        : [];
      const includeDislikes = body.includeDislikes === true;

      if (!userId) {
        return json({ error: "Missing userId" }, 400);
      }

      const [
        relationshipLikes,
        friendshipLikes,
        relationshipDislikes,
        friendshipDislikes,
      ] = await Promise.all([
        fetchRowsForUser(supabase, INTERACTION_CONFIG.relationshipLikes, userId, partnerIds),
        fetchRowsForUser(supabase, INTERACTION_CONFIG.friendshipLikes, userId, partnerIds),
        includeDislikes
          ? fetchRowsForUser(supabase, INTERACTION_CONFIG.relationshipDislikes, userId, partnerIds)
          : Promise.resolve({ outgoing: [], incoming: [] }),
        includeDislikes
          ? fetchRowsForUser(supabase, INTERACTION_CONFIG.friendshipDislikes, userId, partnerIds)
          : Promise.resolve({ outgoing: [], incoming: [] }),
      ]);

      return json({
        userId,
        outgoingLikes: relationshipLikes.outgoing,
        incomingLikes: relationshipLikes.incoming,
        outgoingFriendshipLikes: friendshipLikes.outgoing,
        incomingFriendshipLikes: friendshipLikes.incoming,
        outgoingDislikes: relationshipDislikes.outgoing,
        incomingDislikes: relationshipDislikes.incoming,
        outgoingFriendshipDislikes: friendshipDislikes.outgoing,
        incomingFriendshipDislikes: friendshipDislikes.incoming,
      });
    }

    if (action === "like_counts") {
      const userIds = Array.isArray(body.userIds)
        ? body.userIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
        : [];

      if (userIds.length === 0) {
        return json({ counts: {} });
      }

      const [{ data: outgoingRows, error: outgoingError }, { data: incomingRows, error: incomingError }] = await Promise.all([
        supabase.from("likes").select("user_id").in("user_id", userIds),
        supabase.from("likes").select("liked_user_id").in("liked_user_id", userIds),
      ]);

      if (outgoingError) throw outgoingError;
      if (incomingError) throw incomingError;

      const counts: Record<string, { likes_given: number; likes_received: number }> = {};

      userIds.forEach((userId: string) => {
        counts[userId] = { likes_given: 0, likes_received: 0 };
      });

      (outgoingRows || []).forEach((row: any) => {
        if (!counts[row.user_id]) {
          counts[row.user_id] = { likes_given: 0, likes_received: 0 };
        }
        counts[row.user_id].likes_given += 1;
      });

      (incomingRows || []).forEach((row: any) => {
        if (!counts[row.liked_user_id]) {
          counts[row.liked_user_id] = { likes_given: 0, likes_received: 0 };
        }
        counts[row.liked_user_id].likes_received += 1;
      });

      return json({ counts });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error: any) {
    return json({ error: error.message || "Unknown error" }, 400);
  }
});
