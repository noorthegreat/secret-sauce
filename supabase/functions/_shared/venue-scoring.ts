/**
 * Shared venue scoring logic used by check-match-and-create-date and admin-fix-venue-dates.
 *
 * Scoring factors (higher = better), each worth 0–10 pts:
 *   - Proximity         : 0–10 (distance to user midpoint, capped at MAX_DIST_KM)
 *   - Budget fit        : 0–10 (how close price_range is to resolvedSpending)
 *   - Type preference   : 0–10 (10 if matches resolved preference, 5 if matches either user's type)
 *   - Feedback score    : 0–10 (avg_feedback_score out of 5, scaled ×2; neutral 5 if unknown)
 *
 * Partner bonus: +30 on top (roughly 3× a perfect single factor), ensuring partners
 * surface prominently while still being beatable by a significantly better fit.
 */

export const MAX_DIST_KM = 5;

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scoreVenue(
    venue: any,
    midLat: number,
    midLon: number,
    hasLocation: boolean,
    resolvedSpending: number,
    preferredType: string | null,
    vt1: string | null,
    vt2: string | null,
): number {
    let score = 0;

    // Partner bonus (+30 — roughly 3× a perfect single factor)
    if (venue.is_partner) score += 30;

    // Proximity (0–10)
    if (hasLocation && venue.latitude && venue.longitude) {
        const dist = calculateDistance(midLat, midLon, venue.latitude, venue.longitude);
        score += Math.max(0, 10 * (1 - dist / MAX_DIST_KM));
    } else {
        score += 5; // neutral when no coords
    }

    // Budget fit (0–10)
    if (venue.price_range !== null && venue.price_range !== undefined && resolvedSpending > 0) {
        const diff = Math.abs(venue.price_range - resolvedSpending);
        score += Math.max(0, 10 * (1 - diff / resolvedSpending));
    } else {
        score += 5; // neutral when no price data
    }

    // Type preference (0–10)
    if (preferredType && venue.type === preferredType) {
        score += 10;
    } else if ((vt1 && venue.type === vt1) || (vt2 && venue.type === vt2)) {
        score += 5;
    }

    // Feedback score (0–10): avg rating is 1–5, scale to 0–10. Neutral 5 if no data yet.
    if (venue.avg_feedback_score !== null && venue.avg_feedback_score !== undefined) {
        score += (venue.avg_feedback_score / 5) * 10;
    } else {
        score += 5;
    }

    return score;
}

/**
 * Pick the top 2 venues by score, preferring different venue types for variety.
 * Returns an array of up to 2 venue IDs, and the timezone of the top pick.
 */
export function selectTopTwoVenues(
    venues: any[],
    userData: any[],
    user1Prefs: any,
    user2Prefs: any,
): { venueOptions: string[]; timezone: string | null } {
    const venueTypes = ["coffee", "bar", "restaurant", "activity"];

    const p1 = user1Prefs?.preferences as any;
    const p2 = user2Prefs?.preferences as any;

    const resolvedSpending = Math.min(
        typeof p1?.spending === "number" ? p1.spending : 20,
        typeof p2?.spending === "number" ? p2.spending : 20,
    );

    const vt1: string | null = venueTypes.includes(p1?.venue_type) ? p1.venue_type : null;
    const vt2: string | null = venueTypes.includes(p2?.venue_type) ? p2.venue_type : null;

    const resolvePreferredType = (): string | null => {
        if (vt1 && vt2) {
            if (vt1 === vt2) return vt1;
            const priority: Record<string, number> = { coffee: 0, bar: 1, restaurant: 2, activity: 3 };
            return priority[vt1] <= priority[vt2] ? vt1 : vt2;
        }
        return vt1 || vt2 || null;
    };
    const preferredType = resolvePreferredType();

    const validLocations = userData.filter((u: any) => u.latitude !== null && u.longitude !== null);
    let midLat = 0, midLon = 0;
    const hasLocation = validLocations.length > 0;
    if (validLocations.length >= 2) {
        midLat = (validLocations[0].latitude + validLocations[1].latitude) / 2;
        midLon = (validLocations[0].longitude + validLocations[1].longitude) / 2;
    } else if (validLocations.length === 1) {
        midLat = validLocations[0].latitude;
        midLon = validLocations[0].longitude;
    }

    // Budget is a scoring factor only (see scoreVenue's "Budget fit"), never a hard
    // gate — a date should still get venue options even when every nearby venue is
    // above the user's budget. Cheaper venues just rank higher.
    if (venues.length === 0) return { venueOptions: [], timezone: null };

    // Score all venues (already filtered upstream to those open during shared availability).
    const scored = venues.map((v: any) => ({
        venue: v,
        score: scoreVenue(v, midLat, midLon, hasLocation, resolvedSpending, preferredType, vt1, vt2),
    })).sort((a, b) => b.score - a.score);

    // Top 2 by score — location, type preference, and budget are all factored in
    const options = scored.slice(0, 2).map(({ venue }) => venue.id);

    // Timezone from the top pick
    const topVenue = scored.find(({ venue }) => venue.id === options[0])?.venue;
    const timezone = topVenue?.timezone || null;

    return { venueOptions: options, timezone };
}
