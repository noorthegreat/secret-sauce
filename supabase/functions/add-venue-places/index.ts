// For the admin panel, add venues to the database by searching.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Classify venue type based on Google Places types array.
 * Returns: 'coffee', 'bar', 'restaurant', 'activity'
 */
function classifyVenueType(types: string[]): string {
    const activityTypes = [
        'museum', 'art_gallery', 'tourist_attraction', 'park',
        'amusement_park', 'aquarium', 'zoo', 'stadium',
        'bowling_alley', 'gym', 'spa', 'movie_theater',
        'performing_arts_theater', 'library', 'church',
        'place_of_worship', 'university', 'school',
        'botanical_garden', 'national_park', 'hiking_area',
    ];

    const barTypes = [
        'bar', 'night_club', 'casino', 'pub', 'wine_bar',
    ];

    const restaurantTypes = [
        'restaurant', 'meal_delivery', 'meal_takeaway',
        'italian_restaurant', 'japanese_restaurant', 'chinese_restaurant',
        'french_restaurant', 'indian_restaurant', 'mexican_restaurant',
        'thai_restaurant', 'vietnamese_restaurant', 'korean_restaurant',
        'american_restaurant', 'mediterranean_restaurant', 'seafood_restaurant',
        'steak_house', 'sushi_restaurant', 'pizza_restaurant',
        'hamburger_restaurant', 'brunch_restaurant', 'ramen_restaurant',
    ];

    const coffeeTypes = [
        'cafe', 'coffee_shop', 'bakery', 'ice_cream_shop',
    ];

    // Check in priority order: activity > bar > restaurant > coffee (default)
    if (types.some(t => activityTypes.includes(t))) return 'activity';
    if (types.some(t => barTypes.includes(t))) return 'bar';
    if (types.some(t => restaurantTypes.includes(t))) return 'restaurant';
    if (types.some(t => coffeeTypes.includes(t))) return 'coffee';

    return 'coffee'; // fallback
}

/**
 * Map Google Places priceLevel to approximate CHF price per person.
 * Returns null if unknown.
 */
function mapPriceLevel(priceLevel: string | undefined): number | null {
    switch (priceLevel) {
        case 'PRICE_LEVEL_FREE': return 0;
        case 'PRICE_LEVEL_INEXPENSIVE': return 10;
        case 'PRICE_LEVEL_MODERATE': return 25;
        case 'PRICE_LEVEL_EXPENSIVE': return 50;
        case 'PRICE_LEVEL_VERY_EXPENSIVE': return 80;
        default: return null;
    }
}

function defaultPriceForType(type: string): number {
    switch (type) {
        case 'coffee': return 10;
        case 'bar': return 18;
        case 'restaurant': return 35;
        case 'activity': return 0;
        default: return 15;
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')!;

        const authHeader = req.headers.get("Authorization");
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader ?? "" } },
        });

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { data: hasAdminRole } = await supabaseClient.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
        });

        if (!hasAdminRole) {
            return new Response(
                JSON.stringify({ error: "Forbidden: Admin access required" }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { query, venueType: overrideType, priceRange: overridePrice, mode, placeId } = await req.json();

        if (!query && !placeId) {
            return new Response(
                JSON.stringify({ error: "Query or placeId is required" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // MODE: "search" — return multiple results for the user to pick from
        if (mode === "search") {
            console.log(`Searching for venues: ${query}`);
            const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
            const searchResponse = await fetch(searchUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": googleApiKey,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types,places.priceLevel,places.photos"
                },
                body: JSON.stringify({ textQuery: query, maxResultCount: 5 })
            });

            if (!searchResponse.ok) {
                const errorText = await searchResponse.text();
                throw new Error(`Google API Error: ${searchResponse.status} ${errorText}`);
            }

            const searchData = await searchResponse.json();
            const results = (searchData.places || []).map((p: any) => {
                const inferredType = classifyVenueType(p.types || []);
                let photoUrl = null;
                if (p.photos && p.photos.length > 0) {
                    photoUrl = `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=200&maxWidthPx=300&key=${googleApiKey}`;
                }
                return {
                    placeId: p.id,
                    name: p.displayName?.text || "",
                    address: p.formattedAddress || "",
                    types: p.types || [],
                    inferredType,
                    priceLevel: p.priceLevel || null,
                    priceRange: mapPriceLevel(p.priceLevel) ?? defaultPriceForType(inferredType),
                    photoUrl,
                };
            });

            return new Response(
                JSON.stringify({ success: true, results }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // MODE: "add" (default) — fetch full details for one place and insert
        // If placeId is provided, look up by ID; otherwise search by query
        let place: any;

        if (placeId) {
            console.log(`Looking up place by ID: ${placeId}`);
            const lookupUrl = `https://places.googleapis.com/v1/places/${placeId}`;
            const lookupResponse = await fetch(lookupUrl, {
                method: "GET",
                headers: {
                    "X-Goog-Api-Key": googleApiKey,
                    "X-Goog-FieldMask": "name,id,displayName,formattedAddress,types,websiteUri,regularOpeningHours,utcOffsetMinutes,location,photos,priceLevel"
                }
            });

            if (!lookupResponse.ok) {
                const errorText = await lookupResponse.text();
                throw new Error(`Google API Error (Lookup): ${lookupResponse.status} ${errorText}`);
            }

            place = await lookupResponse.json();
        } else {
            console.log(`Searching for venue: ${query}`);
            const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
            const searchResponse = await fetch(searchUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": googleApiKey,
                    "X-Goog-FieldMask": "places.name,places.id,places.displayName,places.formattedAddress,places.types,places.websiteUri,places.regularOpeningHours,places.utcOffsetMinutes,places.location,places.photos,places.priceLevel"
                },
                body: JSON.stringify({ textQuery: query, maxResultCount: 1 })
            });

            if (!searchResponse.ok) {
                const errorText = await searchResponse.text();
                throw new Error(`Google API Error (Search): ${searchResponse.status} ${errorText}`);
            }

            const searchData = await searchResponse.json();
            place = searchData.places?.[0];
        }

        if (!place) {
            return new Response(
                JSON.stringify({ error: "No venue found" }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log("Found place:", place.displayName?.text, "Types:", place.types, "PriceLevel:", place.priceLevel);

        // 2. Transform Data
        const name = place.displayName?.text || query;
        const address = place.formattedAddress || "";
        const website = place.websiteUri || "";
        const location = place.location;

        // Classify type (allow admin override)
        const types = place.types || [];
        const type = overrideType || classifyVenueType(types);

        // Map price (allow admin override)
        const price_range = overridePrice ?? mapPriceLevel(place.priceLevel) ?? defaultPriceForType(type);

        // Process Hours
        const hours: Record<string, { start: number; end: number } | null> = {
            "0": null, "1": null, "2": null, "3": null, "4": null, "5": null, "6": null
        };

        if (place.regularOpeningHours?.periods) {
            place.regularOpeningHours.periods.forEach((period: any) => {
                if (period.open && period.close) {
                    const day = period.open.day.toString();
                    const startSlot = (period.open.hour * 2) + (period.open.minute >= 30 ? 1 : 0);
                    const endSlot = (period.close.hour * 2) + (period.close.minute >= 30 ? 1 : 0);

                    if (period.open.day === period.close.day) {
                        hours[day] = { start: startSlot, end: endSlot };
                    } else {
                        hours[day] = { start: startSlot, end: 48 };
                    }
                }
            });
        }

        // Timezone
        let timezone = "UTC";
        if (location) {
            const timestamp = Math.floor(Date.now() / 1000);
            const timezoneUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${location.latitude},${location.longitude}&timestamp=${timestamp}&key=${googleApiKey}`;
            const timezoneResponse = await fetch(timezoneUrl);

            if (timezoneResponse.ok) {
                const timezoneData = await timezoneResponse.json();
                if (timezoneData.timeZoneId) {
                    timezone = timezoneData.timeZoneId;
                }
            }
        }

        // Prepare hours_full (original hours) and truncated hours
        const hours_full = JSON.parse(JSON.stringify(hours));

        // Truncate hours based on type
        if (type === "coffee") {
            Object.keys(hours).forEach(day => {
                if (hours[day]) {
                    const limit = 33;
                    if (hours[day]!.end > limit) {
                        if (hours[day]!.start >= limit) {
                            hours[day] = null;
                        } else {
                            hours[day]!.end = limit;
                        }
                    }
                }
            });
        } else if (type === "bar") {
            Object.keys(hours).forEach(day => {
                if (hours[day]) {
                    const limit = 34;
                    if (hours[day]!.start < limit) {
                        if (limit >= hours[day]!.end) {
                            hours[day] = null;
                        } else {
                            hours[day]!.start = limit;
                        }
                    }
                }
            });
        }
        // activity and restaurant types: no hour truncation

        // Photo Handling
        let imageUrl = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2000&auto=format&fit=crop";

        if (place.photos && place.photos.length > 0) {
            try {
                const photo = place.photos[0];
                const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=1200&key=${googleApiKey}`;

                const photoResponse = await fetch(photoUrl);
                if (photoResponse.ok) {
                    const photoBlob = await photoResponse.blob();
                    const fileName = `${place.id}_${Date.now()}.jpg`;

                    const { data: uploadData, error: uploadError } = await supabaseClient
                        .storage
                        .from('venue-photos')
                        .upload(fileName, photoBlob, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabaseClient
                            .storage
                            .from('venue-photos')
                            .getPublicUrl(fileName);

                        imageUrl = publicUrl;
                    } else {
                        console.error("Storage Upload Error:", uploadError);
                    }
                }
            } catch (err) {
                console.error("Error processing photo:", err);
            }
        }

        // 3. Insert
        const { data: insertedVenue, error: insertError } = await supabaseClient
            .from('venues')
            .insert({
                name,
                address,
                website,
                type,
                hours,
                hours_full,
                timezone,
                latitude: location?.latitude || null,
                longitude: location?.longitude || null,
                image: imageUrl,
                price_range,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error("Insert Error:", insertError);
            throw insertError;
        }

        return new Response(
            JSON.stringify({ success: true, venue: insertedVenue }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
