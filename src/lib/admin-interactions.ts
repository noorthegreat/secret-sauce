import { supabase } from "@/integrations/supabase/client";

export type AdminInteractionPeerRow = {
    other_user_id: string;
    created_at: string | null;
};

export type AdminMutualPair = {
    id: string;
    user_id: string;
    matched_user_id: string;
    match_type: "relationship" | "friendship";
    user_profile: any;
    matched_user_profile: any;
    user1_like_date: string | null;
    user2_like_date: string | null;
};

export type AdminLookupUserInteractions = {
    userId: string;
    outgoingLikes: AdminInteractionPeerRow[];
    incomingLikes: AdminInteractionPeerRow[];
    outgoingFriendshipLikes: AdminInteractionPeerRow[];
    incomingFriendshipLikes: AdminInteractionPeerRow[];
};

export type AdminUserInteractions = AdminLookupUserInteractions & {
    outgoingDislikes: AdminInteractionPeerRow[];
    incomingDislikes: AdminInteractionPeerRow[];
    outgoingFriendshipDislikes: AdminInteractionPeerRow[];
    incomingFriendshipDislikes: AdminInteractionPeerRow[];
};

export type AdminPairInteractionRow = {
    user_id: string;
    other_user_id: string;
    created_at: string | null;
};

const invokeAdminInteractions = async <T>(body: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.functions.invoke("admin-interactions", { body });
    if (error) throw error;
    return data as T;
};

export const fetchAdminMutualPairs = async () => {
    return invokeAdminInteractions<{ pairs: AdminMutualPair[] }>({ action: "mutual_pairs" });
};

export const fetchAdminLookupUsers = async (userIds: string[]) => {
    return invokeAdminInteractions<{ users: AdminLookupUserInteractions[] }>({
        action: "lookup_users",
        userIds,
    });
};

export const fetchAdminUserInteractions = async (userId: string, partnerIds: string[], includeDislikes = false) => {
    return invokeAdminInteractions<AdminUserInteractions>({
        action: "user_interactions",
        userId,
        partnerIds,
        includeDislikes,
    });
};

export const fetchAdminAllInteractions = async () => {
    return invokeAdminInteractions<{
        relationshipLikes: AdminPairInteractionRow[];
        relationshipDislikes: AdminPairInteractionRow[];
        friendshipLikes: AdminPairInteractionRow[];
        friendshipDislikes: AdminPairInteractionRow[];
    }>({ action: "all_interactions" });
};

export const fetchAdminLikeCounts = async (userIds: string[]) => {
    return invokeAdminInteractions<{
        counts: Record<string, { likes_given: number; likes_received: number }>;
    }>({
        action: "like_counts",
        userIds,
    });
};
