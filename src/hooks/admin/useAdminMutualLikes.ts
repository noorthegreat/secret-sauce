import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchAdminMutualPairs, type AdminMutualPair } from "@/lib/admin-interactions";

export const useAdminMutualLikes = () => {
    const { toast } = useToast();
    const [historicalMutualLikes, setHistoricalMutualLikes] = useState<AdminMutualPair[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistoricalMutualLikes = async () => {
        try {
            setLoading(true);
            const { pairs } = await fetchAdminMutualPairs();
            setHistoricalMutualLikes(pairs || []);
        } catch (error: any) {
            console.error("Error loading historical likes:", error);
            toast({
                title: "Error",
                description: "Failed to load mutual likes history",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistoricalMutualLikes();
    }, []);

    return { historicalMutualLikes, loading, refreshMutualLikes: loadHistoricalMutualLikes };
};
