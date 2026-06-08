import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Network, RefreshCw, User, Eye, Search, ChevronDown } from "lucide-react";

type ProfileNode = {
    id: string;
    first_name: string;
    age: number | null;
    is_paused: boolean;
    completed_questionnaire: boolean;
    completed_friendship_questionnaire: boolean | null;
    gender: string;
};

type MatchEdge = {
    source: string;
    target: string;
    matchScore: number;
    pastDates: number;
    pastDateRecords?: PastDateRecord[];
    likes: number;
    dislikes: number;
    matchType: "relationship" | "friendship" | "unknown";
};

type ColorBy = "gender" | "age_group" | "paused" | "questionnaire" | "friendship_questionnaire";
type ClusterBy = "none" | "match_score" | "gender" | "age_group" | "paused" | "questionnaire" | "friendship_questionnaire";
type MatchTypeFilter = "all" | "relationship" | "friendship";
type EdgeWeightBy = "match_score" | "past_dates" | "likes" | "dislikes";

type PersonalityAnswerRow = {
    user_id: string;
    answer: string;
    answer_custom: string | null;
};

type ProfileRow = {
    id: string;
    first_name: string;
    age: number | null;
    is_paused: boolean | null;
    completed_questionnaire: boolean | null;
    completed_friendship_questionnaire: boolean | null;
};

type MatchRow = {
    user_id: string;
    matched_user_id: string;
    compatibility_score: number | null;
    match_type: string | null;
};

type DateRow = {
    user1_id: string;
    user2_id: string;
    date_time: string | null;
    status: string | null;
};

type PastDateRecord = {
    date_time: string | null;
    status: string | null;
};

type LikeRow = {
    user_id: string;
    liked_user_id: string;
};

type DislikeRow = {
    user_id: string;
    disliked_user_id: string;
};

const GENDER_LABELS: Record<string, string> = {
    A: "Woman",
    B: "Man",
    C: "Non-binary",
    D: "Prefer not to say",
};

const COLOR_PALETTES: Record<ColorBy, string[]> = {
    gender: ["#2563eb", "#f50b78", "#efc744", "#7d7d7d", "#545454"],
    age_group: ["#e3f2fd", "#90caf9", "#42a5f5", "#1e88e5", "#1976d2", "#0d47a1"],
    paused: ["#10b981", "#f43f5e", "#64748b"],
    questionnaire: ["#7c3aed", "#bfbfbf", "#64748b"],
    friendship_questionnaire: ["#7c3aed", "#bfbfbf", "#64748b"],
};

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 1200;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hashToUnit = (input: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
};

const toGenderLabel = (row?: PersonalityAnswerRow): string => {
    if (!row) return "Unknown";
    if (row.answer_custom && row.answer_custom.trim()) return row.answer_custom.trim();
    return GENDER_LABELS[row.answer] || "Unknown";
};

const ageGroup = (age: number | null): string => {
    if (typeof age !== "number") return "Unknown";
    if (age < 21) return "<21";
    if (age <= 24) return "21-24";
    if (age <= 28) return "25-28";
    if (age <= 34) return "29-34";
    return "35+";
};

const getNodeAttribute = (node: ProfileNode, colorBy: ColorBy): string => {
    if (colorBy === "gender") return node.gender || "Unknown";
    if (colorBy === "age_group") return ageGroup(node.age);
    if (colorBy === "paused") return node.is_paused ? "Paused" : "Active";
    if (colorBy === "questionnaire") return node.completed_questionnaire ? "Completed" : "Incomplete";
    return node.completed_friendship_questionnaire ? "Completed" : "Incomplete";
};

const getEdgeWeight = (edge: MatchEdge, weightBy: EdgeWeightBy): number => {
    switch (weightBy) {
        case "past_dates":
            return edge.pastDates;
        case "likes":
            return edge.likes;
        case "dislikes":
            return edge.dislikes;
        default:
            return edge.matchScore;
    }
};

const getEdgeWeightMax = (edges: MatchEdge[], weightBy: EdgeWeightBy): number => {
    if (weightBy === "match_score") return 100;
    let max = 0;
    for (const edge of edges) {
        const value = getEdgeWeight(edge, weightBy);
        if (value > max) max = value;
    }
    return Math.max(1, max);
};

const EDGE_WEIGHT_LABELS: Record<EdgeWeightBy, string> = {
    match_score: "Match Score",
    past_dates: "Past Dates",
    likes: "Likes",
    dislikes: "Dislikes",
};

const EDGE_WEIGHT_BY_OPTIONS: EdgeWeightBy[] = ["match_score", "past_dates", "likes", "dislikes"];

// Returns the maximum normalised weight (0–100) across the selected
// attributes for a single edge. Each attribute is normalised against its
// own max so that the threshold slider can use a single 0–100 scale even
// when the user has selected attributes with very different value ranges
// (e.g. match score 0–100 vs. likes 0–2).
const getMaxNormalizedWeight = (
    edge: MatchEdge,
    weightBys: EdgeWeightBy[],
    maxes: Map<EdgeWeightBy, number>,
): number => {
    if (weightBys.length === 0) return 0;
    let best = 0;
    for (const w of weightBys) {
        const wMax = maxes.get(w) ?? 1;
        if (wMax <= 0) continue;
        const norm = (getEdgeWeight(edge, w) / wMax) * 100;
        if (norm > best) best = norm;
    }
    return best;
};

const formatWeightByLabel = (weightBys: EdgeWeightBy[]): string => {
    if (weightBys.length === 0) return "None selected";
    if (weightBys.length === EDGE_WEIGHT_BY_OPTIONS.length) return "All attributes";
    return weightBys.map((w) => EDGE_WEIGHT_LABELS[w]).join(", ");
};

interface AdminUserNetworkTabProps {
    onViewProfile?: (profile: { id: string; first_name: string }) => void;
}

export const AdminUserNetworkTab = ({ onViewProfile }: AdminUserNetworkTabProps = {}) => {
    const { toast } = useToast();
    const svgRef = useRef<SVGSVGElement | null>(null);
    const isPanningRef = useRef(false);
    const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<ProfileNode[]>([]);
    const [edges, setEdges] = useState<MatchEdge[]>([]);
    const [threshold, setThreshold] = useState(0);
    const [colorBy, setColorBy] = useState<ColorBy>("gender");
    const [clusterBy, setClusterBy] = useState<ClusterBy>("none");
    const [matchTypeFilter, setMatchTypeFilter] = useState<MatchTypeFilter>("all");
    const [weightBy, setWeightBy] = useState<EdgeWeightBy[]>(["match_score"]);
    const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [hoveredCategory, setHoveredCategory] = useState<"matches" | "past_dates" | "likes" | "dislikes" | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewport, setViewport] = useState({ scale: 1, tx: 0, ty: 0 });
    const [directionalLikes, setDirectionalLikes] = useState<Set<string>>(new Set());
    const [directionalDislikes, setDirectionalDislikes] = useState<Set<string>>(new Set());

    const loadData = async () => {
        setLoading(true);
        try {
            const [
                { data: profileRows, error: profileError },
                { data: matchRows, error: matchError },
                { data: genderRows, error: genderError },
                { data: dateRows, error: dateError },
                { data: likeRows, error: likeError },
                { data: dislikeRows, error: dislikeError },
            ] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id, first_name, age, is_paused, completed_questionnaire, completed_friendship_questionnaire"),
                supabase
                    .from("matches")
                    .select("user_id, matched_user_id, compatibility_score, match_type"),
                supabase
                    .from("personality_answers")
                    .select("user_id, answer, answer_custom")
                    .eq("question_number", 16),
                // Past dates between users (date_time already in the past).
                // Switch to .eq("is_completed", true) if you only want dates
                // that were marked as actually completed.
                supabase
                    .from("dates")
                    .select("user1_id, user2_id, date_time, status")
                    .lt("date_time", new Date().toISOString()),
                // Likes are directional (user_id → liked_user_id). The edge
                // weight counts how many like-arrows exist between a pair
                // (0, 1, or 2). Assumes `likes` mirrors `dislikes`.
                supabase
                    .from("likes")
                    .select("user_id, liked_user_id"),
                // Dislikes follow the same directional pattern as likes.
                supabase
                    .from("dislikes")
                    .select("user_id, disliked_user_id"),
            ]);

            if (profileError) throw profileError;
            if (matchError) throw matchError;
            if (genderError) throw genderError;
            if (dateError) throw dateError;
            if (likeError) throw likeError;
            if (dislikeError) throw dislikeError;

            const profileRowsTyped = (profileRows || []) as ProfileRow[];
            const matchRowsTyped = (matchRows || []) as MatchRow[];
            const genderRowsTyped = (genderRows || []) as PersonalityAnswerRow[];

            const genderByUser = new Map<string, PersonalityAnswerRow>();
            genderRowsTyped.forEach((row) => {
                if (!genderByUser.has(row.user_id)) {
                    genderByUser.set(row.user_id, row);
                }
            });

            const users: ProfileNode[] = profileRowsTyped.map((row) => ({
                id: row.id,
                first_name: row.first_name,
                age: row.age,
                is_paused: !!row.is_paused,
                completed_questionnaire: !!row.completed_questionnaire,
                completed_friendship_questionnaire: !!row.completed_friendship_questionnaire,
                gender: toGenderLabel(genderByUser.get(row.id)),
            }));

            const dateRowsTyped = (dateRows || []) as DateRow[];

            const deduped = new Map<string, MatchEdge>();
            matchRowsTyped.forEach((row) => {
                const a = String(row.user_id);
                const b = String(row.matched_user_id);
                if (!a || !b || a === b) return;
                const [source, target] = a < b ? [a, b] : [b, a];
                const matchType: MatchEdge["matchType"] = row.match_type === "friendship"
                    ? "friendship"
                    : row.match_type === "relationship"
                        ? "relationship"
                        : "unknown";
                const key = `${source}|${target}|${matchType}`;
                const matchScore = Number(row.compatibility_score || 0);
                const existing = deduped.get(key);
                if (!existing || matchScore > existing.matchScore) {
                    deduped.set(key, {
                        source,
                        target,
                        matchScore,
                        pastDates: existing?.pastDates ?? 0,
                        likes: existing?.likes ?? 0,
                        dislikes: existing?.dislikes ?? 0,
                        matchType,
                    });
                }
            });

            const likeRowsTyped = (likeRows || []) as LikeRow[];
            const dislikeRowsTyped = (dislikeRows || []) as DislikeRow[];

            // Aggregate counts per undirected user pair. For directional
            // tables (likes/dislikes), each row contributes 1, so a pair can
            // reach a max count of 2 (mutual).
            const aggregateUndirected = <T,>(
                rows: T[],
                getA: (row: T) => string | undefined | null,
                getB: (row: T) => string | undefined | null,
            ): Map<string, number> => {
                const map = new Map<string, number>();
                rows.forEach((row) => {
                    const a = String(getA(row) || "");
                    const b = String(getB(row) || "");
                    if (!a || !b || a === b) return;
                    const [source, target] = a < b ? [a, b] : [b, a];
                    const pairKey = `${source}|${target}`;
                    map.set(pairKey, (map.get(pairKey) || 0) + 1);
                });
                return map;
            };

            const pastDatesByPair = aggregateUndirected(
                dateRowsTyped,
                (r) => r.user1_id,
                (r) => r.user2_id,
            );

            // Per-pair list of full past-date records (date + status) so the
            // profile card can show the status of each date instead of just
            // a count.
            const pastDateRecordsByPair = new Map<string, PastDateRecord[]>();
            dateRowsTyped.forEach((row) => {
                const a = String(row.user1_id || "");
                const b = String(row.user2_id || "");
                if (!a || !b || a === b) return;
                const [source, target] = a < b ? [a, b] : [b, a];
                const pairKey = `${source}|${target}`;
                const list = pastDateRecordsByPair.get(pairKey) || [];
                list.push({ date_time: row.date_time, status: row.status });
                pastDateRecordsByPair.set(pairKey, list);
            });
            const likesByPair = aggregateUndirected(
                likeRowsTyped,
                (r) => r.user_id,
                (r) => r.liked_user_id,
            );
            const dislikesByPair = aggregateUndirected(
                dislikeRowsTyped,
                (r) => r.user_id,
                (r) => r.disliked_user_id,
            );

            // Merge per-pair counts into existing edges. If a pair has counts
            // but no match row, create an "unknown"-type edge so it can still
            // appear on the graph.
            const mergePairCounts = (
                countsByPair: Map<string, number>,
                field: "pastDates" | "likes" | "dislikes",
            ) => {
                countsByPair.forEach((count, pairKey) => {
                    const [source, target] = pairKey.split("|");
                    const matchTypes: Array<MatchEdge["matchType"]> = [
                        "relationship",
                        "friendship",
                        "unknown",
                    ];
                    const existingKeys = matchTypes
                        .map((mt) => `${pairKey}|${mt}`)
                        .filter((key) => deduped.has(key));

                    if (existingKeys.length === 0) {
                        const blank: MatchEdge = {
                            source,
                            target,
                            matchScore: 0,
                            pastDates: 0,
                            likes: 0,
                            dislikes: 0,
                            matchType: "unknown",
                        };
                        deduped.set(`${pairKey}|unknown`, { ...blank, [field]: count });
                    } else {
                        existingKeys.forEach((key) => {
                            const edge = deduped.get(key)!;
                            deduped.set(key, { ...edge, [field]: count });
                        });
                    }
                });
            };

            mergePairCounts(pastDatesByPair, "pastDates");
            mergePairCounts(likesByPair, "likes");
            mergePairCounts(dislikesByPair, "dislikes");

            // Attach the full past-date record list to every edge that exists
            // for a pair with past dates. mergePairCounts above guarantees at
            // least one edge exists for each such pair.
            pastDateRecordsByPair.forEach((records, pairKey) => {
                const matchTypes: Array<MatchEdge["matchType"]> = [
                    "relationship",
                    "friendship",
                    "unknown",
                ];
                matchTypes.forEach((mt) => {
                    const key = `${pairKey}|${mt}`;
                    if (deduped.has(key)) {
                        const edge = deduped.get(key)!;
                        deduped.set(key, { ...edge, pastDateRecords: records });
                    }
                });
            });

            // Track directional likes/dislikes (from -> to) so the node
            // details panel can show outgoing likes/dislikes for the
            // selected node specifically.
            const dirLikes = new Set<string>();
            likeRowsTyped.forEach((row) => {
                const a = String(row.user_id || "");
                const b = String(row.liked_user_id || "");
                if (!a || !b || a === b) return;
                dirLikes.add(`${a}|${b}`);
            });
            const dirDislikes = new Set<string>();
            dislikeRowsTyped.forEach((row) => {
                const a = String(row.user_id || "");
                const b = String(row.disliked_user_id || "");
                if (!a || !b || a === b) return;
                dirDislikes.add(`${a}|${b}`);
            });

            setDirectionalLikes(dirLikes);
            setDirectionalDislikes(dirDislikes);
            setProfiles(users);
            setEdges(Array.from(deduped.values()));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            toast({
                title: "Error",
                description: `Failed to load user network: ${message}`,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setHiddenCategories([]);
    }, [colorBy]);

    // Threshold is now expressed as a percentage (0–100) of each selected
    // attribute's max, so it doesn't need to be reset when the selection
    // changes. Toggling a checkbox no longer disturbs the user's threshold.

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const stopPageScroll = (event: WheelEvent) => {
            event.preventDefault();
        };
        svg.addEventListener("wheel", stopPageScroll, { passive: false });
        return () => {
            svg.removeEventListener("wheel", stopPageScroll);
        };
    }, [loading]);

    const visibleProfiles = useMemo(
        () => profiles.filter((node) => !hiddenCategories.includes(getNodeAttribute(node, colorBy))),
        [profiles, colorBy, hiddenCategories],
    );

    const visibleNodeIds = useMemo(() => new Set(visibleProfiles.map((node) => node.id)), [visibleProfiles]);

    // When the search box is non-empty, this is the set of node ids whose
    // first_name matches the query (case-insensitive substring). When the
    // box is empty we return null so the rest of the code can distinguish
    // "no search" from "search with zero matches".
    const searchMatchIds = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return null;
        const ids = new Set<string>();
        for (const node of visibleProfiles) {
            if ((node.first_name || "").toLowerCase().includes(q)) {
                ids.add(node.id);
            }
        }
        return ids;
    }, [searchQuery, visibleProfiles]);

    const edgeWeightMaxes = useMemo(() => {
        const map = new Map<EdgeWeightBy, number>();
        for (const w of EDGE_WEIGHT_BY_OPTIONS) {
            map.set(w, getEdgeWeightMax(edges, w));
        }
        return map;
    }, [edges]);

    const filteredEdges = useMemo(
        () =>
            edges.filter((edge) => {
                // With multi-select edge weight attributes, the threshold is
                // a percentage (0–100). An edge passes if any selected
                // attribute's normalised weight is at or above the threshold.
                if (getMaxNormalizedWeight(edge, weightBy, edgeWeightMaxes) < threshold) return false;
                if (matchTypeFilter !== "all" && edge.matchType !== matchTypeFilter) return false;
                return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
            }),
        [edges, threshold, matchTypeFilter, weightBy, visibleNodeIds, edgeWeightMaxes],
    );

    const sortedEdges = useMemo(
        () => [...filteredEdges].sort(
            (a, b) => getMaxNormalizedWeight(b, weightBy, edgeWeightMaxes) - getMaxNormalizedWeight(a, weightBy, edgeWeightMaxes),
        ),
        [filteredEdges, weightBy, edgeWeightMaxes],
    );

    // Threshold runs on a fixed 0–100 percentage scale because weights are
    // normalised per attribute inside getMaxNormalizedWeight.
    const weightMax = 100;

    const displayedEdges = useMemo(() => sortedEdges.slice(0, 4500), [sortedEdges]);

    const positions = useMemo(() => {
        const map = new Map<string, { x: number; y: number }>();
        const n = visibleProfiles.length;
        if (n === 0) return map;

        const cx = VIEWBOX_WIDTH / 2;
        const cy = VIEWBOX_HEIGHT / 2;
        // Use the full viewbox: build an ellipse that fills it (minus a small margin)
        // and place cluster centroids / initial positions along it.
        const layoutMargin = 80;
        const layoutRx = VIEWBOX_WIDTH / 2 - layoutMargin;
        const layoutRy = VIEWBOX_HEIGHT / 2 - layoutMargin;

        // Build a centroid for each cluster category so nodes can be pulled toward it.
        // Match-score mode does not use centroids; it relies on per-edge spring forces.
        const clusterCenters = new Map<string, { x: number; y: number }>();
        if (clusterBy !== "none" && clusterBy !== "match_score") {
            const categories = Array.from(
                new Set(visibleProfiles.map((node) => getNodeAttribute(node, clusterBy as ColorBy))),
            ).sort();
            // Inset the centroids slightly so each cluster has room to spread
            // outward toward the viewbox edges via repulsion.
            const centroidRx = layoutRx * 0.7;
            const centroidRy = layoutRy * 0.7;
            categories.forEach((cat, i) => {
                if (categories.length === 1) {
                    clusterCenters.set(cat, { x: cx, y: cy });
                    return;
                }
                const angle = (2 * Math.PI * i) / categories.length;
                clusterCenters.set(cat, {
                    x: cx + centroidRx * Math.cos(angle),
                    y: cy + centroidRy * Math.sin(angle),
                });
            });
        }

        const pos = visibleProfiles.map((node, index) => {
            let startX: number;
            let startY: number;
            if (clusterBy !== "none" && clusterBy !== "match_score") {
                const cat = getNodeAttribute(node, clusterBy as ColorBy);
                const center = clusterCenters.get(cat) || { x: cx, y: cy };
                const r = hashToUnit(node.id) * 50;
                const a = hashToUnit(node.id + ":angle") * 2 * Math.PI;
                startX = center.x + r * Math.cos(a);
                startY = center.y + r * Math.sin(a);
            } else {
                const angle = (2 * Math.PI * index) / n;
                const jitter = (hashToUnit(node.id) - 0.5) * 16;
                startX = cx + (layoutRx + jitter) * Math.cos(angle);
                startY = cy + (layoutRy + jitter) * Math.sin(angle);
            }
            return {
                id: node.id,
                x: startX,
                y: startY,
                vx: 0,
                vy: 0,
            };
        });

        // Pre-compute index-based edge pairs for the match-score spring layout so
        // the inner loop avoids repeated Map lookups.
        const idxById = new Map<string, number>();
        pos.forEach((p, i) => idxById.set(p.id, i));
        const springEdges = clusterBy === "match_score"
            ? filteredEdges
                .map((edge) => {
                    const a = idxById.get(edge.source);
                    const b = idxById.get(edge.target);
                    if (a == null || b == null) return null;
                    // Cluster strategy "match_score" always uses the underlying
                    // compatibility score, independent of the edge weight
                    // attribute selected for filtering/rendering.
                    return { a, b, weight: edge.matchScore };
                })
                .filter((x): x is { a: number; b: number; weight: number } => !!x)
            : [];

        const iterations = n > 350 ? 120 : 170;
        const coulombK = n > 350 ? 6400 : 8600;
        // No velocity decay in match-score mode so spring oscillations can settle
        // purely through the cluster-pull / repulsion balance instead of being damped.
        const damping = clusterBy === "match_score" ? 1.0 : 0.9;
        const dt = 0.95;
        const clusterPull = 0.05;

        for (let iter = 0; iter < iterations; iter++) {
            // Categorical cluster attraction: pull each node toward its assigned cluster center.
            if (clusterBy !== "none" && clusterBy !== "match_score") {
                for (let i = 0; i < pos.length; i++) {
                    const p = pos[i];
                    const node = visibleProfiles[i];
                    const cat = getNodeAttribute(node, clusterBy as ColorBy);
                    const center = clusterCenters.get(cat);
                    if (!center) continue;
                    p.vx += (center.x - p.x) * clusterPull;
                    p.vy += (center.y - p.y) * clusterPull;
                }
            }

            // Match-score springs: connected nodes pull together with strength and
            // rest length parameterised by the compatibility score. Hooke's law:
            // F = -k(d - rest), with higher scores → stiffer spring + shorter rest.
            if (clusterBy === "match_score") {
                for (const edge of springEdges) {
                    const p1 = pos[edge.a];
                    const p2 = pos[edge.b];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
                    const springK = 0.006 + (edge.weight / 100) * 0.05;
                    const restLength = clamp(118 - edge.weight * 0.65, 42, 108);
                    const force = springK * (dist - restLength);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    p1.vx += fx;
                    p1.vy += fy;
                    p2.vx -= fx;
                    p2.vy -= fy;
                }
            }

            if (n <= 260) {
                for (let i = 0; i < pos.length; i++) {
                    for (let j = i + 1; j < pos.length; j++) {
                        const p1 = pos[i];
                        const p2 = pos[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const dist2 = dx * dx + dy * dy + 9;
                        const dist = Math.sqrt(dist2);
                        const force = coulombK / dist2;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        p1.vx += fx;
                        p1.vy += fy;
                        p2.vx -= fx;
                        p2.vy -= fy;
                    }
                }
            } else {
                const repulsionSamples = 10;
                for (let i = 0; i < pos.length; i++) {
                    const p1 = pos[i];
                    for (let s = 0; s < repulsionSamples; s++) {
                        const seed = `${iter}:${i}:${s}`;
                        const j = Math.floor(hashToUnit(seed) * pos.length);
                        if (j === i) continue;
                        const p2 = pos[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const dist2 = dx * dx + dy * dy + 9;
                        const dist = Math.sqrt(dist2);
                        const force = coulombK / dist2;
                        p1.vx += (dx / dist) * force;
                        p1.vy += (dy / dist) * force;
                    }
                }
            }

            for (const p of pos) {
                p.vx *= damping;
                p.vy *= damping;
                p.x += clamp(p.vx * dt, -18, 18);
                p.y += clamp(p.vy * dt, -18, 18);

                if (clusterBy === "none" || clusterBy === "match_score") {
                    // Light pull toward the canvas center keeps unanchored layouts
                    // (no centroid pull) from drifting outward indefinitely.
                    p.x += (cx - p.x) * 0.008;
                    p.y += (cy - p.y) * 0.008;
                }

                p.x = clamp(p.x, 28, VIEWBOX_WIDTH - 28);
                p.y = clamp(p.y, 28, VIEWBOX_HEIGHT - 28);
            }
        }

        pos.forEach((p) => {
            map.set(p.id, { x: p.x, y: p.y });
        });

        return map;
    }, [visibleProfiles, clusterBy, filteredEdges]);

    const nodeColorMap = useMemo(() => {
        const categories = Array.from(
            new Set(profiles.map((node) => getNodeAttribute(node, colorBy))),
        );

        if (colorBy === "gender") {
            const order = ["Man", "Woman", "Non-binary", "Prefer not to say", "Unknown"];
            categories.sort((a, b) => {
                const ai = order.indexOf(a);
                const bi = order.indexOf(b);
                if (ai === -1 && bi === -1) return a.localeCompare(b);
                if (ai === -1) return 1;
                if (bi === -1) return -1;
                return ai - bi;
            });
        } else {
            categories.sort((a, b) => a.localeCompare(b));
        }

        const map = new Map<string, string>();
        const palette = COLOR_PALETTES[colorBy] || COLOR_PALETTES.gender;
        categories.forEach((category, index) => {
            map.set(category, palette[index % palette.length]);
        });
        return map;
    }, [profiles, colorBy]);

    const legendItems = useMemo(() => {
        const items = Array.from(nodeColorMap.entries());
        if (colorBy === "gender") {
            const order = ["Man", "Woman", "Non-binary", "Prefer not to say", "Unknown"];
            return items.sort(([a], [b]) => {
                const ai = order.indexOf(a);
                const bi = order.indexOf(b);
                if (ai === -1 && bi === -1) return a.localeCompare(b);
                if (ai === -1) return 1;
                if (bi === -1) return -1;
                return ai - bi;
            });
        }
        return items;
    }, [nodeColorMap, colorBy]);

    const nodeById = useMemo(() => {
        const map = new Map<string, ProfileNode>();
        profiles.forEach((p) => map.set(p.id, p));
        return map;
    }, [profiles]);

    const connectedEdgesForSelected = useMemo(() => {
        if (!selectedNodeId) return [] as Array<MatchEdge & { partner: ProfileNode | null }>;
        return filteredEdges
            .filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId)
            .map((edge) => {
                const partnerId = edge.source === selectedNodeId ? edge.target : edge.source;
                return {
                    ...edge,
                    partner: nodeById.get(partnerId) || null,
                };
            })
            .sort((a, b) => getMaxNormalizedWeight(b, weightBy, edgeWeightMaxes) - getMaxNormalizedWeight(a, weightBy, edgeWeightMaxes));
    }, [filteredEdges, selectedNodeId, nodeById, weightBy, edgeWeightMaxes]);

    // Matches: edges where the pair has a non-zero compatibility score.
    const matchesList = useMemo(
        () => connectedEdgesForSelected.filter((edge) => edge.matchScore > 0),
        [connectedEdgesForSelected],
    );

    // Past dates: edges where the pair has at least one past date together.
    const pastDatesList = useMemo(
        () => connectedEdgesForSelected.filter((edge) => edge.pastDates > 0),
        [connectedEdgesForSelected],
    );

    // Likes: directional outgoing likes from the selected node to others.
    // Filtered to currently visible nodes so legend filters still apply.
    const likesList = useMemo(() => {
        if (!selectedNodeId) return [] as Array<{ partner: ProfileNode | null; partnerId: string }>;
        const out: Array<{ partner: ProfileNode | null; partnerId: string }> = [];
        directionalLikes.forEach((key) => {
            const [fromId, toId] = key.split("|");
            if (fromId !== selectedNodeId) return;
            if (!visibleNodeIds.has(toId)) return;
            out.push({ partner: nodeById.get(toId) || null, partnerId: toId });
        });
        return out.sort((a, b) =>
            (a.partner?.first_name || "").localeCompare(b.partner?.first_name || ""),
        );
    }, [selectedNodeId, directionalLikes, visibleNodeIds, nodeById]);

    // Dislikes: directional outgoing dislikes from the selected node to others.
    const dislikesList = useMemo(() => {
        if (!selectedNodeId) return [] as Array<{ partner: ProfileNode | null; partnerId: string }>;
        const out: Array<{ partner: ProfileNode | null; partnerId: string }> = [];
        directionalDislikes.forEach((key) => {
            const [fromId, toId] = key.split("|");
            if (fromId !== selectedNodeId) return;
            if (!visibleNodeIds.has(toId)) return;
            out.push({ partner: nodeById.get(toId) || null, partnerId: toId });
        });
        return out.sort((a, b) =>
            (a.partner?.first_name || "").localeCompare(b.partner?.first_name || ""),
        );
    }, [selectedNodeId, directionalDislikes, visibleNodeIds, nodeById]);

    const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) || null : null;

    const toggleCategory = (category: string) => {
        setHiddenCategories((prev) =>
            prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
        );
    };

    const handleWheel: React.WheelEventHandler<SVGSVGElement> = (event) => {
        // No preventDefault here — React's onWheel is passive, so it's a no-op.
        // Page-scroll blocking is handled by the native non-passive listener above.
        const svg = svgRef.current;
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const vx = event.clientX - rect.left;
        const vy = event.clientY - rect.top;

        setViewport((prev) => {
            const factor = event.deltaY < 0 ? 1.12 : 0.89;
            const nextScale = clamp(prev.scale * factor, 0.35, 4.5);
            const wx = (vx - prev.tx) / prev.scale;
            const wy = (vy - prev.ty) / prev.scale;
            const tx = vx - wx * nextScale;
            const ty = vy - wy * nextScale;
            return { scale: nextScale, tx, ty };
        });
    };

    const handlePointerDown: React.PointerEventHandler<SVGSVGElement> = (event) => {
        if (event.target !== event.currentTarget) return;
        setSelectedNodeId(null);
        isPanningRef.current = true;
        panStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            tx: viewport.tx,
            ty: viewport.ty,
        };
    };

    const handlePointerMove: React.PointerEventHandler<SVGSVGElement> = (event) => {
        if (!isPanningRef.current || !panStartRef.current) return;
        const dx = event.clientX - panStartRef.current.x;
        const dy = event.clientY - panStartRef.current.y;
        setViewport((prev) => ({
            ...prev,
            tx: panStartRef.current!.tx + dx,
            ty: panStartRef.current!.ty + dy,
        }));
    };

    const stopPanning = () => {
        isPanningRef.current = false;
        panStartRef.current = null;
    };

    useEffect(() => {
        if (selectedNodeId && !nodeById.has(selectedNodeId)) {
            setSelectedNodeId(null);
        }
    }, [selectedNodeId, nodeById]);

    useEffect(() => {
        if (selectedNodeId && !visibleNodeIds.has(selectedNodeId)) {
            setSelectedNodeId(null);
        }
    }, [selectedNodeId, visibleNodeIds]);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading user network...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2">
                        <Network className="h-5 w-5" />
                        User Match Network
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setViewport({ scale: 1, tx: 0, ty: 0 })}>
                            Reset View
                        </Button>
                        <Button variant="outline" size="sm" onClick={loadData}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                                Threshold {weightBy.length === 1 ? `(${EDGE_WEIGHT_LABELS[weightBy[0]]})` : "(% of max)"}
                            </span>
                            <span className="text-muted-foreground">{threshold}%</span>
                        </div>
                        <Slider
                            value={[threshold]}
                            min={0}
                            max={weightMax}
                            step={1}
                            onValueChange={(value) => setThreshold(value[0] ?? 0)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Hides edges whose normalised weight is below this percentage of the max for any selected attribute.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Node Color</label>
                        <Select value={colorBy} onValueChange={(value) => setColorBy(value as ColorBy)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select node color attribute" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gender">Gender</SelectItem>
                                <SelectItem value="age_group">Age Group</SelectItem>
                                <SelectItem value="paused">Account Status</SelectItem>
                                <SelectItem value="questionnaire">Romance Questionnaire</SelectItem>
                                <SelectItem value="friendship_questionnaire">Friendship Questionnaire</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Cluster Strategy</label>
                        <Select value={clusterBy} onValueChange={(value) => setClusterBy(value as ClusterBy)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select cluster strategy" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="match_score">Match Score</SelectItem>
                                <SelectItem value="gender">Gender</SelectItem>
                                <SelectItem value="age_group">Age Group</SelectItem>
                                <SelectItem value="paused">Account Status</SelectItem>
                                <SelectItem value="questionnaire">Romance Questionnaire</SelectItem>
                                <SelectItem value="friendship_questionnaire">Friendship Questionnaire</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Match Type</label>
                        <Select value={matchTypeFilter} onValueChange={(value) => setMatchTypeFilter(value as MatchTypeFilter)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter match type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="relationship">Relationship</SelectItem>
                                <SelectItem value="friendship">Friendship</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Edge Type</label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between font-normal"
                                >
                                    <span className="truncate text-left">
                                        {formatWeightByLabel(weightBy)}
                                    </span>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                {EDGE_WEIGHT_BY_OPTIONS.map((option) => (
                                    <DropdownMenuCheckboxItem
                                        key={option}
                                        checked={weightBy.includes(option)}
                                        // Keep the menu open so the user can toggle several
                                        // options without reopening the dropdown each time.
                                        onSelect={(event) => event.preventDefault()}
                                        onCheckedChange={(checked) => {
                                            setWeightBy((prev) => {
                                                if (checked) {
                                                    return prev.includes(option) ? prev : [...prev, option];
                                                }
                                                return prev.filter((value) => value !== option);
                                            });
                                        }}
                                    >
                                        {EDGE_WEIGHT_LABELS[option]}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search by name..."
                            className="pl-8"
                        />
                    </div>
                    {searchMatchIds && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                                {searchMatchIds.size} match{searchMatchIds.size === 1 ? "" : "es"}
                            </span>
                            {searchMatchIds.size === 1 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const onlyId = Array.from(searchMatchIds)[0];
                                        setSelectedNodeId(onlyId);
                                    }}
                                >
                                    Select node
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                                Clear
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-medium text-sm">Show</span>
                    {legendItems.map(([label, color]) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => toggleCategory(label)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 transition-colors ${hiddenCategories.includes(label)
                                ? "opacity-45 line-through"
                                : "bg-muted/40 hover:bg-muted"
                                }`}
                            title={hiddenCategories.includes(label) ? `Show ${label}` : `Hide ${label}`}
                        >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                            {label}
                        </button>
                    ))}
                    {hiddenCategories.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setHiddenCategories([])}>
                            Clear category filters
                        </Button>
                    )}
                </div>

                <div className={`grid grid-cols-1 gap-4 ${selectedNode ? "xl:grid-cols-3" : ""}`}>
                    <div className={`rounded-lg border bg-card p-2 ${selectedNode ? "xl:col-span-2" : ""}`}>
                        <svg
                            ref={svgRef}
                            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                            className="aspect-square max-h-[72vh] w-full cursor-grab overscroll-contain active:cursor-grabbing"
                            style={{ touchAction: "none" }}
                            onWheel={handleWheel}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={stopPanning}
                            onPointerLeave={stopPanning}
                        >
                            <defs>
                                <marker
                                    id="arrow-like"
                                    viewBox="0 0 10 10"
                                    refX="9"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                    markerUnits="userSpaceOnUse"
                                >
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
                                </marker>
                                <marker
                                    id="arrow-dislike"
                                    viewBox="0 0 10 10"
                                    refX="9"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                    markerUnits="userSpaceOnUse"
                                >
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
                                </marker>
                            </defs>
                            <g transform={`translate(${viewport.tx} ${viewport.ty}) scale(${viewport.scale})`}>
                                {displayedEdges.flatMap((edge) => {
                                    const source = positions.get(edge.source);
                                    const target = positions.get(edge.target);
                                    if (!source || !target) return [];

                                    // Intensity is the max normalised weight (0–100) across
                                    // the selected attributes, scaled by how far it exceeds
                                    // the threshold (also 0–100).
                                    const normalized = getMaxNormalizedWeight(edge, weightBy, edgeWeightMaxes);
                                    const intensity = Math.max(0, Math.min(1, (normalized - threshold) / Math.max(1, 100 - threshold)));
                                    const strokeWidth = 0.8 + intensity * 2.4;
                                    // When a node is selected, fade edges that don't touch it so the
                                    // selected node's connections stand out.
                                    const isFaded = selectedNodeId !== null && edge.source !== selectedNodeId && edge.target !== selectedNodeId;
                                    const opacity = (intensity * 0.7) * (isFaded ? 0.03 : 1);

                                    const renderUndirected = weightBy.includes("match_score") || weightBy.includes("past_dates");
                                    const renderLikes = weightBy.includes("likes");
                                    const renderDislikes = weightBy.includes("dislikes");

                                    const elements: JSX.Element[] = [];

                                    // Match score / past dates are undirected — render a single
                                    // line coloured by match type, with no arrowhead.
                                    if (renderUndirected) {
                                        const stroke = edge.matchType === "friendship"
                                            ? "#0f766e"
                                            : edge.matchType === "relationship"
                                                ? "#7c3aed"
                                                : "#64748b";
                                        elements.push(
                                            <line
                                                key={`${edge.source}-${edge.target}-${edge.matchType}-base`}
                                                x1={source.x}
                                                y1={source.y}
                                                x2={target.x}
                                                y2={target.y}
                                                stroke={stroke}
                                                strokeWidth={strokeWidth}
                                                strokeOpacity={opacity}
                                            />,
                                        );
                                    }

                                    // Likes / dislikes are directional. When both kinds are
                                    // selected together, we put each on its own perpendicular
                                    // lane so they don't overlap. Within a single kind, mutual
                                    // edges still get the existing forward/reverse separation.
                                    if (renderLikes || renderDislikes) {
                                        const dx = target.x - source.x;
                                        const dy = target.y - source.y;
                                        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
                                        const ux = dx / dist;
                                        const uy = dy / dist;
                                        const px = -uy;
                                        const py = ux;
                                        const nodeRadius = 9;

                                        const bothSelected = renderLikes && renderDislikes;
                                        const directionalSpecs: Array<{
                                            kind: "likes" | "dislikes";
                                            stroke: string;
                                            markerId: string;
                                            set: Set<string>;
                                            laneOffset: number;
                                        }> = [];
                                        if (renderLikes) {
                                            directionalSpecs.push({
                                                kind: "likes",
                                                stroke: "#16a34a",
                                                markerId: "arrow-like",
                                                set: directionalLikes,
                                                laneOffset: bothSelected ? -3.4 : 0,
                                            });
                                        }
                                        if (renderDislikes) {
                                            directionalSpecs.push({
                                                kind: "dislikes",
                                                stroke: "#dc2626",
                                                markerId: "arrow-dislike",
                                                set: directionalDislikes,
                                                laneOffset: bothSelected ? 3.4 : 0,
                                            });
                                        }

                                        for (const spec of directionalSpecs) {
                                            const hasForward = spec.set.has(`${edge.source}|${edge.target}`);
                                            const hasReverse = spec.set.has(`${edge.target}|${edge.source}`);
                                            const sep = hasForward && hasReverse ? 2.6 : 0;
                                            const lane = spec.laneOffset;

                                            if (hasForward) {
                                                elements.push(
                                                    <line
                                                        key={`${edge.source}-${edge.target}-${spec.kind}-fwd`}
                                                        x1={source.x + ux * nodeRadius + px * (sep + lane)}
                                                        y1={source.y + uy * nodeRadius + py * (sep + lane)}
                                                        x2={target.x - ux * nodeRadius + px * (sep + lane)}
                                                        y2={target.y - uy * nodeRadius + py * (sep + lane)}
                                                        stroke={spec.stroke}
                                                        strokeWidth={strokeWidth}
                                                        strokeOpacity={opacity}
                                                        markerEnd={`url(#${spec.markerId})`}
                                                    />,
                                                );
                                            }
                                            if (hasReverse) {
                                                elements.push(
                                                    <line
                                                        key={`${edge.source}-${edge.target}-${spec.kind}-rev`}
                                                        x1={target.x - ux * nodeRadius - px * (sep - lane)}
                                                        y1={target.y - uy * nodeRadius - py * (sep - lane)}
                                                        x2={source.x + ux * nodeRadius - px * (sep - lane)}
                                                        y2={source.y + uy * nodeRadius - py * (sep - lane)}
                                                        stroke={spec.stroke}
                                                        strokeWidth={strokeWidth}
                                                        strokeOpacity={opacity}
                                                        markerEnd={`url(#${spec.markerId})`}
                                                    />,
                                                );
                                            }
                                        }
                                    }

                                    return elements;
                                })}

                                {selectedNodeId && hoveredCategory && (() => {
                                    // Category overlay: when a connection card is hovered, draw all
                                    // edges of that category outgoing from the selected node, regardless
                                    // of the user's edge-weight-attribute selection. The edge to the
                                    // hovered partner renders fully opaque; the rest at 0.5 to provide
                                    // peripheral context.
                                    const sourcePos = positions.get(selectedNodeId);
                                    if (!sourcePos) return null;
                                    type OverlayEdge = { partnerId: string; directional: boolean; stroke: string; markerEnd?: string };
                                    const collected: OverlayEdge[] = [];
                                    if (hoveredCategory === "matches") {
                                        matchesList.forEach((edge) => {
                                            const partnerId = edge.partner?.id;
                                            if (!partnerId) return;
                                            const stroke = edge.matchType === "friendship"
                                                ? "#0f766e"
                                                : edge.matchType === "relationship"
                                                    ? "#7c3aed"
                                                    : "#64748b";
                                            collected.push({ partnerId, directional: false, stroke });
                                        });
                                    } else if (hoveredCategory === "past_dates") {
                                        pastDatesList.forEach((edge) => {
                                            const partnerId = edge.partner?.id;
                                            if (!partnerId) return;
                                            collected.push({ partnerId, directional: false, stroke: "#f59e0b" });
                                        });
                                    } else if (hoveredCategory === "likes") {
                                        likesList.forEach((item) => {
                                            collected.push({ partnerId: item.partnerId, directional: true, stroke: "#16a34a", markerEnd: "url(#arrow-like)" });
                                        });
                                    } else if (hoveredCategory === "dislikes") {
                                        dislikesList.forEach((item) => {
                                            collected.push({ partnerId: item.partnerId, directional: true, stroke: "#dc2626", markerEnd: "url(#arrow-dislike)" });
                                        });
                                    }
                                    return collected.map((oe, i) => {
                                        const partnerPos = positions.get(oe.partnerId);
                                        if (!partnerPos) return null;
                                        const isHoveredPartner = oe.partnerId === hoveredNodeId;
                                        const opacity = isHoveredPartner ? 1 : 0.5;
                                        const strokeWidth = isHoveredPartner ? 3 : 2;
                                        if (oe.directional) {
                                            const dx = partnerPos.x - sourcePos.x;
                                            const dy = partnerPos.y - sourcePos.y;
                                            const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
                                            const ux = dx / dist;
                                            const uy = dy / dist;
                                            const nodeRadius = 9;
                                            return (
                                                <line
                                                    key={`overlay-${hoveredCategory}-${oe.partnerId}-${i}`}
                                                    x1={sourcePos.x + ux * nodeRadius}
                                                    y1={sourcePos.y + uy * nodeRadius}
                                                    x2={partnerPos.x - ux * nodeRadius}
                                                    y2={partnerPos.y - uy * nodeRadius}
                                                    stroke={oe.stroke}
                                                    strokeWidth={strokeWidth}
                                                    strokeOpacity={opacity}
                                                    markerEnd={oe.markerEnd}
                                                />
                                            );
                                        }
                                        return (
                                            <line
                                                key={`overlay-${hoveredCategory}-${oe.partnerId}-${i}`}
                                                x1={sourcePos.x}
                                                y1={sourcePos.y}
                                                x2={partnerPos.x}
                                                y2={partnerPos.y}
                                                stroke={oe.stroke}
                                                strokeWidth={strokeWidth}
                                                strokeOpacity={opacity}
                                            />
                                        );
                                    });
                                })()}

                                {[...visibleProfiles]
                                    .sort((a, b) => {
                                        if (a.id === selectedNodeId) return 1;
                                        if (b.id === selectedNodeId) return -1;
                                        if (a.id === hoveredNodeId) return 1;
                                        if (b.id === hoveredNodeId) return -1;
                                        const aMatch = searchMatchIds?.has(a.id) ?? false;
                                        const bMatch = searchMatchIds?.has(b.id) ?? false;
                                        if (aMatch && !bMatch) return 1;
                                        if (!aMatch && bMatch) return -1;
                                        return 0;
                                    })
                                    .map((node) => {
                                        const pos = positions.get(node.id);
                                        if (!pos) return null;
                                        const category = getNodeAttribute(node, colorBy);
                                        const fill = nodeColorMap.get(category) || "#64748b";
                                        const isSelected = node.id === selectedNodeId;
                                        const isHovered = !isSelected && node.id === hoveredNodeId;
                                        const isSearchDimmed = searchMatchIds !== null && !searchMatchIds.has(node.id);
                                        const isSearchHighlighted = searchMatchIds !== null && searchMatchIds.has(node.id);

                                        return (
                                            <g key={node.id}>
                                                {(isSelected || isHovered) && (
                                                    <>
                                                        <circle
                                                            cx={pos.x}
                                                            cy={pos.y}
                                                            r={22}
                                                            fill={fill}
                                                            fillOpacity={isSelected ? 0.18 : 0.12}
                                                            stroke="none"
                                                            pointerEvents="none"
                                                        />
                                                        <circle
                                                            cx={pos.x}
                                                            cy={pos.y}
                                                            r={16}
                                                            fill="none"
                                                            stroke={fill}
                                                            strokeWidth={isSelected ? 2.5 : 2}
                                                            strokeOpacity={isSelected ? 0.95 : 0.7}
                                                            strokeDasharray={isHovered ? "4 3" : undefined}
                                                            pointerEvents="none"
                                                        />
                                                    </>
                                                )}
                                                <circle
                                                    cx={pos.x}
                                                    cy={pos.y}
                                                    r={isSelected ? 12 : isHovered ? 11 : isSearchHighlighted ? 11 : 8}
                                                    fill={fill}
                                                    stroke={isSelected ? fill : isHovered ? fill : isSearchHighlighted ? "#f59e0b" : "#0f172a"}
                                                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : isSearchHighlighted ? 2.5 : 1}
                                                    fillOpacity={isSearchDimmed ? 0.2 : 1}
                                                    strokeOpacity={isSearchDimmed ? 0.25 : 1}
                                                    className="cursor-pointer"
                                                    onClick={() => setSelectedNodeId(node.id)}
                                                >
                                                    <title>{`${node.first_name} (${category})`}</title>
                                                </circle>
                                            </g>
                                        );
                                    })}
                            </g>
                        </svg>
                    </div>

                    {selectedNode && (
                        <div className="rounded-lg border bg-card p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">Profile Details</h3>
                                <div className="flex items-center gap-1">
                                    {selectedNodeId && (
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedNodeId(null)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {selectedNode && (
                                <div className="space-y-4 text-sm">
                                    <div className="rounded-md border p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="font-semibold">{selectedNode.first_name}</div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={!onViewProfile || !selectedNode}
                                                onClick={() => selectedNode && onViewProfile?.(selectedNode)}
                                                title="Show profile"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                            <span>Gender</span>
                                            <span className="text-foreground">{selectedNode.gender}</span>
                                            <span>Age</span>
                                            <span className="text-foreground">{selectedNode.age ?? "Unknown"}</span>
                                            <span>Status</span>
                                            <span className="text-foreground">{selectedNode.is_paused ? "Paused" : "Active"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-2 text-xs font-medium text-muted-foreground">
                                            Connections (visible)
                                        </div>
                                        <div className="max-h-[510px] space-y-4 overflow-auto pr-1">
                                            <section className="space-y-2">
                                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    <span>Matches</span>
                                                    <span>{matchesList.length}</span>
                                                </div>
                                                {matchesList.slice(0, 35).map((edge, idx) => (
                                                    <div
                                                        key={`${edge.source}-${edge.target}-${edge.matchType}-${idx}`}
                                                        className={`rounded-md border p-2 cursor-pointer transition-colors hover:bg-muted/40 ${edge.partner && hoveredNodeId === edge.partner.id ? "ring-2 ring-primary/40" : ""}`}
                                                        onMouseEnter={() => {
                                                            if (edge.partner) setHoveredNodeId(edge.partner.id);
                                                            setHoveredCategory("matches");
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredNodeId(null);
                                                            setHoveredCategory(null);
                                                        }}
                                                        onClick={() => edge.partner && setSelectedNodeId(edge.partner.id)}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="font-medium">{edge.partner?.first_name || "Unknown user"}</div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={!onViewProfile || !edge.partner}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    edge.partner && onViewProfile?.(edge.partner);
                                                                }}
                                                                title="Show profile"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            <span style={{ color: '#00cc5f' }}>{(weightBy.length === 0 ? (["match_score"] as EdgeWeightBy[]) : weightBy).map((w) => w === "match_score" ? `${edge.matchScore}% Match` : w === "past_dates" ? `${edge.pastDates} past date${edge.pastDates === 1 ? "" : "s"}` : w === "likes" ? `${edge.likes} like${edge.likes === 1 ? "" : "s"}` : `${edge.dislikes} dislike${edge.dislikes === 1 ? "" : "s"}`).join(" • ")}</span> • Type: {edge.matchType}
                                                        </div>
                                                    </div>
                                                ))}
                                                {matchesList.length === 0 && (
                                                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                                        No matches.
                                                    </div>
                                                )}
                                            </section>

                                            <section className="space-y-2">
                                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    <span>Past dates</span>
                                                    <span>{pastDatesList.length}</span>
                                                </div>
                                                {pastDatesList.slice(0, 35).map((edge, idx) => (
                                                    <div
                                                        key={`pastdate-${edge.source}-${edge.target}-${idx}`}
                                                        className={`rounded-md border p-2 cursor-pointer transition-colors hover:bg-muted/40 ${edge.partner && hoveredNodeId === edge.partner.id ? "ring-2 ring-primary/40" : ""}`}
                                                        onMouseEnter={() => {
                                                            if (edge.partner) setHoveredNodeId(edge.partner.id);
                                                            setHoveredCategory("past_dates");
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredNodeId(null);
                                                            setHoveredCategory(null);
                                                        }}
                                                        onClick={() => edge.partner && setSelectedNodeId(edge.partner.id)}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="font-medium">{edge.partner?.first_name || "Unknown user"}</div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={!onViewProfile || !edge.partner}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    edge.partner && onViewProfile?.(edge.partner);
                                                                }}
                                                                title="Show profile"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {(edge.pastDateRecords && edge.pastDateRecords.length > 0
                                                                ? edge.pastDateRecords
                                                                : [{ status: null }]
                                                            ).map((r, i, arr) => {
                                                                const raw = (r.status || "unknown").toLowerCase();
                                                                const label = raw.toUpperCase();
                                                                const colorClass =
                                                                    raw === "completed"
                                                                        ? "#00cc5f"
                                                                        : raw === "cancelled"
                                                                            ? "#ff4d4d"
                                                                            : "#808080";
                                                                return (
                                                                    <span key={i}>
                                                                        <span style={{ color: colorClass }}>{label}</span>
                                                                        {i < arr.length - 1 && " • "}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                                {pastDatesList.length === 0 && (
                                                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                                        No past dates.
                                                    </div>
                                                )}
                                            </section>

                                            <section className="space-y-2">
                                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    <span>Likes</span>
                                                    <span>{likesList.length}</span>
                                                </div>
                                                {likesList.slice(0, 35).map((item, idx) => (
                                                    <div
                                                        key={`like-${item.partnerId}-${idx}`}
                                                        className={`rounded-md border p-2 cursor-pointer transition-colors hover:bg-muted/40 ${hoveredNodeId === item.partnerId ? "ring-2 ring-primary/40" : ""}`}
                                                        onMouseEnter={() => {
                                                            setHoveredNodeId(item.partnerId);
                                                            setHoveredCategory("likes");
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredNodeId(null);
                                                            setHoveredCategory(null);
                                                        }}
                                                        onClick={() => setSelectedNodeId(item.partnerId)}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="font-medium">{item.partner?.first_name || "Unknown user"}</div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={!onViewProfile || !item.partner}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    item.partner && onViewProfile?.(item.partner);
                                                                }}
                                                                title="Show profile"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {likesList.length === 0 && (
                                                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                                        No outgoing likes.
                                                    </div>
                                                )}
                                            </section>

                                            <section className="space-y-2">
                                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    <span>Dislikes</span>
                                                    <span>{dislikesList.length}</span>
                                                </div>
                                                {dislikesList.slice(0, 35).map((item, idx) => (
                                                    <div
                                                        key={`dislike-${item.partnerId}-${idx}`}
                                                        className={`rounded-md border p-2 cursor-pointer transition-colors hover:bg-muted/40 ${hoveredNodeId === item.partnerId ? "ring-2 ring-primary/40" : ""}`}
                                                        onMouseEnter={() => {
                                                            setHoveredNodeId(item.partnerId);
                                                            setHoveredCategory("dislikes");
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredNodeId(null);
                                                            setHoveredCategory(null);
                                                        }}
                                                        onClick={() => setSelectedNodeId(item.partnerId)}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="font-medium">{item.partner?.first_name || "Unknown user"}</div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={!onViewProfile || !item.partner}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    item.partner && onViewProfile?.(item.partner);
                                                                }}
                                                                title="Show profile"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {dislikesList.length === 0 && (
                                                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                                        No outgoing dislikes.
                                                    </div>
                                                )}
                                            </section>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div className="rounded-md border p-3">
                        <div className="text-muted-foreground">Users (visible / all)</div>
                        <div className="text-lg font-semibold">{visibleProfiles.length} / {profiles.length}</div>
                    </div>
                    <div className="rounded-md border p-3">
                        <div className="text-muted-foreground">Edges (all)</div>
                        <div className="text-lg font-semibold">{edges.length}</div>
                    </div>
                    <div className="rounded-md border p-3">
                        <div className="text-muted-foreground">Edges (visible)</div>
                        <div className="text-lg font-semibold">{filteredEdges.length}</div>
                    </div>
                    <div className="rounded-md border p-3">
                        <div className="text-muted-foreground">Visible threshold</div>
                        <div className="text-lg font-semibold">{threshold}+</div>
                    </div>
                </div>

                {sortedEdges.length > displayedEdges.length && (
                    <p className="text-xs text-muted-foreground">
                        Rendering top {displayedEdges.length.toLocaleString()} edges for performance.
                    </p>
                )}

                {displayedEdges.length === 0 && (
                    <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                        No edges match the current threshold.
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
