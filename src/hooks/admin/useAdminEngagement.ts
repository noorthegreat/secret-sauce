import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type WeeklyTotal = {
  week: string;
  interactions: number;
  likes: number;
  dislikes: number;
  matchesReceived: number;
  datesCompleted: number;
  mutualOutcomes: number;
  activeUsers: number;
};

type MutualOutcomeSummary = {
  total: number;
  relationship: number;
  friendship: number;
};

export type UserEngagement = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  photo_url: string | null;
  is_paused: boolean;
  created_at: string | null;
  last_activity: string | null;
  total_interactions_12w: number;
  total_matches_12w: number;
  total_dates_completed: number;
  consecutive_inactive_weeks: number;
  status: "active" | "warning" | "at_risk" | "inactive";
};


type StatusSummary = {
  active: number;
  warning: number;
  at_risk: number;
  inactive: number;
  paused: number;
};

export type EngagementData = {
  users: UserEngagement[];
  weeklyTotals: WeeklyTotal[];
  statusSummary: StatusSummary;
  mutualOutcomeSummary: MutualOutcomeSummary;
  weeks: string[];
  currentWeek: string;
  inactivityStartDate?: string;
  inactivityWeeksTracked?: number;
  usersWithStrikes?: number;
  penaltyPaused?: number;
};

export const useAdminEngagement = () => {
  const { toast } = useToast();
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.functions.invoke("admin-engagement-stats");
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result as EngagementData);
    } catch (error: any) {
      console.error("Error loading engagement stats:", error);
      toast({
        title: "Error",
        description: "Failed to load engagement statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, refresh: load };
};
