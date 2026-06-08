import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_INCIDENT_TARGETS = [
  { id: "952ab5ab-ad5f-46a2-a017-1bc00e71cce7", name: "Shadi", cap: 2 },
  { id: "9f4e3b19-a9e9-4030-94b2-ea92c030675a", name: "Huaiyue", cap: 1 },
  { id: "ea813d7a-c9f5-4e3e-9874-5b8157f6d8c8", name: "Maria", cap: 1 },
  { id: "1fb61660-638d-4ecb-b4c5-8cec3604047c", name: "Nam", cap: 1 },
  { id: "d237c913-49c4-4cb7-a21b-388fd9f4b840", name: "Vivian", cap: 1 },
  { id: "664288c2-d44c-4232-8dcb-43df42956ec8", name: "Jan", cap: 1 },
  { id: "d655d1bc-1f46-4154-b009-2fbcd94b7add", name: "Tabea", cap: 1 },
  { id: "7bce266c-91c3-4509-b729-9116f70a017c", name: "Wenjie", cap: 2 },
  { id: "d40c4b59-5c88-4a8b-b091-d76554711bfe", name: "Rioha", cap: 1 },
  { id: "42da20ee-fdb4-4472-aef8-3f6792dfc183", name: "Salome", cap: 1 },
  { id: "bd27e435-fa3f-40a3-9d43-565a0bae7b8c", name: "Aurelio", cap: 1 },
  { id: "710eb111-af13-4097-8f3f-510930619ccd", name: "Luca", cap: 1 },
  { id: "e2ccfe41-35e8-4526-9794-d32574cb4678", name: "Michelle", cap: 2 },
  { id: "53638f3c-7b6a-4cc5-a331-1185725c2d70", name: "Mike", cap: 1 },
  { id: "94f71ad9-7250-4021-86c6-1703ddeb5606", name: "Sarina", cap: 1 },
];
function normalizeTargets(targets) {
  return targets.map((target) => ({
    id: String(target.id),
    name: String(target.name),
    cap: Number(target.cap) || 1,
  }));
}

function parseTargetsFromEnv() {
  const raw = process.env.REPLACEMENT_TARGETS_JSON;
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("REPLACEMENT_TARGETS_JSON must be a non-empty JSON array.");
  }
  return normalizeTargets(parsed);
}

const INCIDENT_TARGETS = parseTargetsFromEnv() || DEFAULT_INCIDENT_TARGETS;
const INCIDENT_TARGET_IDS = new Set(INCIDENT_TARGETS.map((target) => target.id));

const INCIDENT_REMOVED_REPEAT_PAIRS = new Set(
  [
    ["952ab5ab-ad5f-46a2-a017-1bc00e71cce7", "9f4e3b19-a9e9-4030-94b2-ea92c030675a"],
    ["952ab5ab-ad5f-46a2-a017-1bc00e71cce7", "ea813d7a-c9f5-4e3e-9874-5b8157f6d8c8"],
    ["1fb61660-638d-4ecb-b4c5-8cec3604047c", "d237c913-49c4-4cb7-a21b-388fd9f4b840"],
    ["664288c2-d44c-4232-8dcb-43df42956ec8", "d655d1bc-1f46-4154-b009-2fbcd94b7add"],
    ["7bce266c-91c3-4509-b729-9116f70a017c", "d40c4b59-5c88-4a8b-b091-d76554711bfe"],
    ["42da20ee-fdb4-4472-aef8-3f6792dfc183", "bd27e435-fa3f-40a3-9d43-565a0bae7b8c"],
    ["710eb111-af13-4097-8f3f-510930619ccd", "e2ccfe41-35e8-4526-9794-d32574cb4678"],
    ["53638f3c-7b6a-4cc5-a331-1185725c2d70", "e2ccfe41-35e8-4526-9794-d32574cb4678"],
    ["7bce266c-91c3-4509-b729-9116f70a017c", "94f71ad9-7250-4021-86c6-1703ddeb5606"],
  ].map(([userA, userB]) => buildPairKey(userA, userB))
);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function buildPairKey(userA, userB) {
  return [userA, userB].sort().join("|");
}

function formatCandidateRow(userId, row) {
  const isUser1 = row.user1_id === userId;
  return {
    pairKey: buildPairKey(row.user1_id, row.user2_id),
    partnerId: isUser1 ? row.user2_id : row.user1_id,
    partnerName: isUser1 ? row.user2_name : row.user1_name,
    compatibilityScore: Number(row.compatibility_score) || 0,
    userLikedPartner: Boolean(isUser1 ? row.user1_liked_user2 : row.user2_liked_user1),
    partnerLikedUser: Boolean(isUser1 ? row.user2_liked_user1 : row.user1_liked_user2),
    unansweredLikeRematchCount: Number(row.unanswered_like_rematch_count) || 0,
  };
}

async function invokeDebugCandidates({
  supabaseUrl,
  publishableKey,
  accessToken,
  cronSecret,
  userId,
}) {
  const headers = {
    apikey: publishableKey,
    "Content-Type": "application/json",
    "dry-run": "true",
    "x-algorithm": "relationship",
    "x-send-emails": "false",
    "x-max-matches-per-user": "5",
  };

  if (cronSecret) {
    headers["X-Cron-Secret"] = cronSecret;
  } else if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/match-users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ debug_user_id: userId }),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload?.error || `match-users debug failed for ${userId}: HTTP ${response.status}`);
  }
  if (payload?.error) {
    throw new Error(`match-users debug failed for ${userId}: ${payload.error}`);
  }

  return (payload?.candidates || [])
    .filter((row) => row.user1_id === userId || row.user2_id === userId)
    .map((row) => formatCandidateRow(userId, row));
}

function buildRestHeaders(publishableKey, authToken) {
  return {
    Accept: "application/json",
    apikey: publishableKey,
    Authorization: `Bearer ${authToken}`,
  };
}

function normalizeAuthToken(token) {
  return String(token || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  let payload = [];
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      const snippet = text.slice(0, 160).replace(/\s+/g, " ");
      throw new Error(`Non-JSON response from ${url}: ${snippet}`);
    }
  }
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

function incrementAvailabilityCounter(availabilityByUser, userId, field) {
  if (!availabilityByUser.has(userId)) {
    availabilityByUser.set(userId, {
      currentRelationshipMatches: 0,
      activeRelationshipDates: 0,
    });
  }
  availabilityByUser.get(userId)[field] += 1;
}

async function fetchBroaderAvailability({
  supabaseUrl,
  publishableKey,
  authToken,
}) {
  const headers = buildRestHeaders(publishableKey, authToken);
  const [currentMatches, activeDates] = await Promise.all([
    fetchJson(
      `${supabaseUrl}/rest/v1/matches?select=user_id,matched_user_id&from_algorithm=eq.relationship&match_type=eq.relationship`,
      headers
    ),
    fetchJson(
      `${supabaseUrl}/rest/v1/dates?select=user1_id,user2_id&match_type=eq.relationship&status=in.(pending,confirmed,limbo)`,
      headers
    ),
  ]);

  const availabilityByUser = new Map();

  for (const row of currentMatches) {
    incrementAvailabilityCounter(availabilityByUser, row.user_id, "currentRelationshipMatches");
    incrementAvailabilityCounter(availabilityByUser, row.matched_user_id, "currentRelationshipMatches");
  }

  for (const row of activeDates) {
    incrementAvailabilityCounter(availabilityByUser, row.user1_id, "activeRelationshipDates");
    incrementAvailabilityCounter(availabilityByUser, row.user2_id, "activeRelationshipDates");
  }

  return availabilityByUser;
}

function pickSuggestedPairs(targets, candidateMap) {
  const byId = new Map(targets.map((target) => [target.id, target]));
  const edges = [];

  for (const target of targets) {
    for (const candidate of candidateMap.get(target.id) || []) {
      if (!byId.has(candidate.partnerId)) continue;
      if (target.id > candidate.partnerId) continue;

      const reverse = (candidateMap.get(candidate.partnerId) || []).find(
        (row) => row.partnerId === target.id
      );
      if (!reverse) continue;
      if (INCIDENT_REMOVED_REPEAT_PAIRS.has(candidate.pairKey)) continue;

      edges.push({
        userA: target.id,
        userAName: target.name,
        userB: candidate.partnerId,
        userBName: byId.get(candidate.partnerId).name,
        score: Math.round((candidate.compatibilityScore + reverse.compatibilityScore) / 2),
        eitherLiked: candidate.userLikedPartner || candidate.partnerLikedUser || reverse.userLikedPartner || reverse.partnerLikedUser,
        maxUnansweredRematchCount: Math.max(
          candidate.unansweredLikeRematchCount,
          reverse.unansweredLikeRematchCount
        ),
      });
    }
  }

  edges.sort((left, right) =>
    Number(left.eitherLiked) - Number(right.eitherLiked) ||
    left.maxUnansweredRematchCount - right.maxUnansweredRematchCount ||
    right.score - left.score ||
    left.userAName.localeCompare(right.userAName) ||
    left.userBName.localeCompare(right.userBName)
  );

  const remainingCaps = new Map(targets.map((target) => [target.id, target.cap]));
  const selected = [];

  for (const edge of edges) {
    const aRemaining = remainingCaps.get(edge.userA) || 0;
    const bRemaining = remainingCaps.get(edge.userB) || 0;
    if (aRemaining <= 0 || bRemaining <= 0) continue;

    selected.push(edge);
    remainingCaps.set(edge.userA, aRemaining - 1);
    remainingCaps.set(edge.userB, bRemaining - 1);
  }

  return { selected, remainingCaps, edges };
}

function getRemainingTargets(targets, remainingCaps) {
  return targets
    .map((target) => ({
      ...target,
      remaining: remainingCaps.get(target.id) || 0,
    }))
    .filter((target) => target.remaining > 0);
}

function pickBroaderPairs(unresolvedTargets, candidateMap, availabilityByUser) {
  const remainingTargetCaps = new Map(unresolvedTargets.map((target) => [target.id, target.remaining]));
  const remainingPartnerCaps = new Map();
  const edges = [];

  for (const target of unresolvedTargets) {
    for (const candidate of candidateMap.get(target.id) || []) {
      if (INCIDENT_TARGET_IDS.has(candidate.partnerId)) continue;
      if (INCIDENT_REMOVED_REPEAT_PAIRS.has(candidate.pairKey)) continue;

      const availability = availabilityByUser.get(candidate.partnerId) || {
        currentRelationshipMatches: 0,
        activeRelationshipDates: 0,
      };
      if (availability.activeRelationshipDates > 0) continue;

      edges.push({
        userA: target.id,
        userAName: target.name,
        userB: candidate.partnerId,
        userBName: candidate.partnerName,
        score: candidate.compatibilityScore,
        currentRelationshipMatches: availability.currentRelationshipMatches,
        eitherLiked: candidate.userLikedPartner || candidate.partnerLikedUser,
        maxUnansweredRematchCount: candidate.unansweredLikeRematchCount,
      });
    }
  }

  edges.sort((left, right) =>
    Number(left.eitherLiked) - Number(right.eitherLiked) ||
    left.maxUnansweredRematchCount - right.maxUnansweredRematchCount ||
    left.currentRelationshipMatches - right.currentRelationshipMatches ||
    right.score - left.score ||
    left.userAName.localeCompare(right.userAName) ||
    left.userBName.localeCompare(right.userBName)
  );

  const selected = [];
  for (const edge of edges) {
    const aRemaining = remainingTargetCaps.get(edge.userA) || 0;
    const bRemaining = remainingPartnerCaps.has(edge.userB) ? remainingPartnerCaps.get(edge.userB) : 1;
    if (aRemaining <= 0 || bRemaining <= 0) continue;

    selected.push(edge);
    remainingTargetCaps.set(edge.userA, aRemaining - 1);
    remainingPartnerCaps.set(edge.userB, bRemaining - 1);
  }

  return { selected, remainingTargetCaps, edges };
}

function printPerUserCandidates(targets, candidateMap) {
  console.log("\nPer-user candidate pool inside replacement set:\n");
  for (const target of targets) {
    const candidates = (candidateMap.get(target.id) || [])
      .filter((row) => candidateMap.has(row.partnerId))
      .filter((row) => !INCIDENT_REMOVED_REPEAT_PAIRS.has(row.pairKey))
      .sort((left, right) =>
        Number(left.userLikedPartner || left.partnerLikedUser) -
          Number(right.userLikedPartner || right.partnerLikedUser) ||
        left.unansweredLikeRematchCount - right.unansweredLikeRematchCount ||
        right.compatibilityScore - left.compatibilityScore
      );

    console.log(`${target.name} (${target.cap} slot${target.cap === 1 ? "" : "s"}):`);
    if (candidates.length === 0) {
      console.log("  - no in-pool candidates after excluding removed repeats");
      continue;
    }

    for (const candidate of candidates.slice(0, 8)) {
      const notes = [];
      if (candidate.userLikedPartner || candidate.partnerLikedUser) notes.push("existing like");
      if (candidate.unansweredLikeRematchCount > 0) {
        notes.push(`rematch_count=${candidate.unansweredLikeRematchCount}`);
      }
      const suffix = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
      console.log(`  - ${candidate.partnerName} ${candidate.compatibilityScore}${suffix}`);
    }
  }
}

function printSuggestedPairs(selected, remainingCaps, targets) {
  console.log("\nSuggested replacement pairs:\n");
  if (selected.length === 0) {
    console.log("No in-pool replacement pairs found.");
  } else {
    selected.forEach((edge, index) => {
      const notes = [];
      if (edge.eitherLiked) notes.push("existing like");
      if (edge.maxUnansweredRematchCount > 0) {
        notes.push(`rematch_count=${edge.maxUnansweredRematchCount}`);
      }
      const suffix = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
      console.log(
        `${index + 1}. ${edge.userAName} <-> ${edge.userBName} (${edge.score})${suffix}`
      );
    });
  }

  const unresolved = getRemainingTargets(targets, remainingCaps);

  console.log("\nUnfilled slots:\n");
  if (unresolved.length === 0) {
    console.log("None.");
  } else {
    unresolved.forEach((target) => {
      console.log(`- ${target.name}: ${target.remaining}`);
    });
  }
}

function printBroaderCandidates(unresolvedTargets, candidateMap, availabilityByUser) {
  console.log("\nBroader candidate pool:\n");
  for (const target of unresolvedTargets) {
    const candidates = (candidateMap.get(target.id) || [])
      .filter((row) => !INCIDENT_TARGET_IDS.has(row.partnerId))
      .filter((row) => !INCIDENT_REMOVED_REPEAT_PAIRS.has(row.pairKey))
      .filter((row) => {
        const availability = availabilityByUser.get(row.partnerId) || {
          currentRelationshipMatches: 0,
          activeRelationshipDates: 0,
        };
        return availability.activeRelationshipDates === 0;
      })
      .sort((left, right) =>
        Number(left.userLikedPartner || left.partnerLikedUser) -
          Number(right.userLikedPartner || right.partnerLikedUser) ||
        left.unansweredLikeRematchCount - right.unansweredLikeRematchCount ||
        ((availabilityByUser.get(left.partnerId)?.currentRelationshipMatches || 0) -
          (availabilityByUser.get(right.partnerId)?.currentRelationshipMatches || 0)) ||
        right.compatibilityScore - left.compatibilityScore
      );

    console.log(`${target.name} (${target.remaining} slot${target.remaining === 1 ? "" : "s"}):`);
    if (candidates.length === 0) {
      console.log("  - no broader candidates");
      continue;
    }

    for (const candidate of candidates.slice(0, 8)) {
      const notes = [];
      const currentMatches = availabilityByUser.get(candidate.partnerId)?.currentRelationshipMatches || 0;
      if (currentMatches > 0) notes.push(`current_matches=${currentMatches}`);
      if (candidate.userLikedPartner || candidate.partnerLikedUser) notes.push("existing like");
      if (candidate.unansweredLikeRematchCount > 0) {
        notes.push(`rematch_count=${candidate.unansweredLikeRematchCount}`);
      }
      const suffix = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
      console.log(`  - ${candidate.partnerName} ${candidate.compatibilityScore}${suffix}`);
    }
  }
}

function printBroaderSuggestedPairs(selected, remainingTargetCaps, unresolvedTargets) {
  console.log("\nSuggested broader replacement pairs:\n");
  if (selected.length === 0) {
    console.log("No broader replacement pairs found.");
  } else {
    selected.forEach((edge, index) => {
      const notes = [];
      if (edge.currentRelationshipMatches > 0) {
        notes.push(`current_matches=${edge.currentRelationshipMatches}`);
      }
      if (edge.eitherLiked) notes.push("existing like");
      if (edge.maxUnansweredRematchCount > 0) {
        notes.push(`rematch_count=${edge.maxUnansweredRematchCount}`);
      }
      const suffix = notes.length > 0 ? ` [${notes.join(", ")}]` : "";
      console.log(
        `${index + 1}. ${edge.userAName} <-> ${edge.userBName} (${edge.score})${suffix}`
      );
    });
  }

  console.log("\nStill unfilled after broader pass:\n");
  const unresolved = unresolvedTargets
    .map((target) => ({
      ...target,
      remaining: remainingTargetCaps.get(target.id) || 0,
    }))
    .filter((target) => target.remaining > 0);
  if (unresolved.length === 0) {
    console.log("None.");
  } else {
    unresolved.forEach((target) => {
      console.log(`- ${target.name}: ${target.remaining}`);
    });
  }
}

function printSql(selected) {
  console.log("\nSQL values block:\n");
  if (selected.length === 0) {
    console.log("-- No suggested pairs");
    return;
  }

  console.log("with manual_replacements(user_a, user_b, compatibility_score) as (");
  console.log("  values");
  selected.forEach((edge, index) => {
    const suffix = index === selected.length - 1 ? "" : ",";
    console.log(
      `    ('${edge.userA}'::uuid, '${edge.userB}'::uuid, ${edge.score})${suffix}`
    );
  });
  console.log(")");
  console.log("select * from manual_replacements;");
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));

  const useBroaderPool = process.argv.includes("--broader");
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const accessToken = normalizeAuthToken(process.env.SUPABASE_ACCESS_TOKEN || "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const cronSecret = process.env.CRON_SECRET || "";

  if (!supabaseUrl || !publishableKey) {
    console.error("Missing Supabase URL or publishable key in environment.");
    process.exit(1);
  }

  if (!accessToken && !cronSecret) {
    console.error("Set SUPABASE_ACCESS_TOKEN (admin session JWT) or CRON_SECRET before running.");
    console.error("Example:");
    console.error("  SUPABASE_ACCESS_TOKEN=... node scripts/suggest-manual-replacements.mjs");
    process.exit(1);
  }

  const candidateMap = new Map();
  await Promise.all(
    INCIDENT_TARGETS.map(async (target) => {
      const candidates = await invokeDebugCandidates({
        supabaseUrl,
        publishableKey,
        accessToken,
        cronSecret,
        userId: target.id,
      });
      candidateMap.set(target.id, candidates);
    })
  );

  printPerUserCandidates(INCIDENT_TARGETS, candidateMap);

  const { selected, remainingCaps } = pickSuggestedPairs(INCIDENT_TARGETS, candidateMap);
  printSuggestedPairs(selected, remainingCaps, INCIDENT_TARGETS);
  let finalSelected = [...selected];

  if (useBroaderPool) {
    const restAuthToken = serviceRoleKey || accessToken;
    if (!restAuthToken) {
      console.error("Broader mode requires SUPABASE_ACCESS_TOKEN or SUPABASE_SERVICE_ROLE_KEY.");
      process.exit(1);
    }

    const unresolvedTargets = getRemainingTargets(INCIDENT_TARGETS, remainingCaps);
    const availabilityByUser = await fetchBroaderAvailability({
      supabaseUrl,
      publishableKey,
      authToken: restAuthToken,
    });
    printBroaderCandidates(unresolvedTargets, candidateMap, availabilityByUser);

    const broader = pickBroaderPairs(unresolvedTargets, candidateMap, availabilityByUser);
    printBroaderSuggestedPairs(broader.selected, broader.remainingTargetCaps, unresolvedTargets);
    finalSelected = [...finalSelected, ...broader.selected];
  }

  printSql(finalSelected);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
