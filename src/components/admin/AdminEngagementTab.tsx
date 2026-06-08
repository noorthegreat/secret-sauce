import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Activity, AlertTriangle, RefreshCw, Search, TrendingDown, TrendingUp, Users,
  PauseCircle, XCircle, Eye, BarChart3, ScatterChart as ScatterIcon, Info
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import { useAdminEngagement, type UserEngagement } from "@/hooks/admin/useAdminEngagement";
import { format } from "date-fns";

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "bg-green-500",
    badge: "default" as const,
    icon: TrendingUp,
    description: "Interacted with all matches in recent weeks",
  },
  warning: {
    label: "Warning",
    color: "bg-yellow-500",
    badge: "secondary" as const,
    icon: AlertTriangle,
    description: "1 week without interactions (had matches). Gets a warning email.",
  },
  at_risk: {
    label: "At Risk",
    color: "bg-orange-500",
    badge: "destructive" as const,
    icon: TrendingDown,
    description: "2 consecutive weeks without interactions (had matches). Gets a warning email.",
  },
  inactive: {
    label: "Auto-Pause",
    color: "bg-red-500",
    badge: "destructive" as const,
    icon: XCircle,
    description: "3+ consecutive weeks without interactions (had matches). Will be auto-paused.",
  },
};

type SortKey = "name" | "interactions" | "matches" | "dates" | "inactive_weeks" | "last_activity";

export const AdminEngagementTab = () => {
  const { data, loading, refresh } = useAdminEngagement();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("inactive_weeks");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    let users = data.users.filter((u) => !u.is_paused);

    if (statusFilter !== "all") {
      users = users.filter((u) => u.status === statusFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.first_name.toLowerCase().includes(q) ||
          (u.last_name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }

    const dir = sortAsc ? 1 : -1;
    users.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return dir * a.first_name.localeCompare(b.first_name);
        case "interactions":
          return dir * (a.total_interactions_12w - b.total_interactions_12w);
        case "matches":
          return dir * (a.total_matches_12w - b.total_matches_12w);
        case "dates":
          return dir * (a.total_dates_completed - b.total_dates_completed);
        case "inactive_weeks":
          return dir * (a.consecutive_inactive_weeks - b.consecutive_inactive_weeks);
        case "last_activity":
          return dir * ((a.last_activity || "").localeCompare(b.last_activity || ""));
        default:
          return 0;
      }
    });

    return users;
  }, [data, search, statusFilter, sortBy, sortAsc]);

  const matchDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<number, number>();
    for (const u of data.users.filter(u => !u.is_paused)) {
      const m = u.total_matches_12w;
      counts.set(m, (counts.get(m) || 0) + 1);
    }
    const maxMatches = Math.max(0, ...counts.keys());
    const result = [];
    for (let i = 0; i <= maxMatches; i++) {
      result.push({ matches: i, count: counts.get(i) || 0 });
    }
    return result;
  }, [data]);

  const activityByMatches = useMemo(() => {
    if (!data) return [];
    const buckets = new Map<number, { totalInteractions: number; count: number }>();
    for (const u of data.users.filter(u => !u.is_paused)) {
      const m = u.total_matches_12w;
      const bucket = buckets.get(m) || { totalInteractions: 0, count: 0 };
      bucket.totalInteractions += u.total_interactions_12w;
      bucket.count++;
      buckets.set(m, bucket);
    }
    const maxMatches = Math.max(0, ...buckets.keys());
    const result = [];
    for (let i = 0; i <= maxMatches; i++) {
      const b = buckets.get(i);
      result.push({
        matchBucket: `${i}`,
        avgInteractions: b ? b.totalInteractions / b.count : 0,
        userCount: b?.count || 0,
      });
    }
    return result;
  }, [data]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading engagement data...</div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Failed to load engagement data</p>
        <Button onClick={refresh}>Retry</Button>
      </div>
    );
  }

  const { statusSummary, weeklyTotals } = data;
  const inactivityActive = (data.inactivityWeeksTracked || 0) > 0;

  const weeklyChartData = weeklyTotals.map((w) => ({
    ...w,
    label: format(new Date(w.week), "MMM d"),
  }));

  const statusCards = [
    { key: "active", name: "Active", value: statusSummary.active, fill: "#22c55e", desc: STATUS_CONFIG.active.description },
    { key: "warning", name: "Warning", value: statusSummary.warning, fill: "#eab308", desc: STATUS_CONFIG.warning.description },
    { key: "at_risk", name: "At Risk", value: statusSummary.at_risk, fill: "#f97316", desc: STATUS_CONFIG.at_risk.description },
    { key: "inactive", name: "Auto-Pause", value: statusSummary.inactive, fill: "#ef4444", desc: STATUS_CONFIG.inactive.description },
    { key: "paused", name: "Paused", value: statusSummary.paused, fill: "#6b7280", desc: "Already paused (manually or auto-paused)" },
    {
      key: "mutual_outcomes",
      name: "Mutual Outcomes",
      value: data.mutualOutcomeSummary?.total ?? 0,
      fill: "#8b5cf6",
      desc: `Completed meetups with a mutual positive outcome. Dates -> match: ${data.mutualOutcomeSummary?.relationship ?? 0}. Hangouts -> friends: ${data.mutualOutcomeSummary?.friendship ?? 0}.`,
    },
    { key: "strikes", name: "Has Strikes", value: data.usersWithStrikes ?? 0, fill: "#f59e0b", desc: "Users with at least 1 date penalty strike (missed availability)" },
    { key: "penalty_paused", name: "Penalty Paused", value: data.penaltyPaused ?? 0, fill: "#dc2626", desc: "Users auto-paused due to 3+ penalty strikes from missing date availability" },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Inactivity Rule Banner */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-medium">Inactivity Auto-Pause Rule</p>
                <p className="text-muted-foreground">
                  Tracking starts <strong>{data.inactivityStartDate || "2026-03-23"}</strong>.
                  {inactivityActive
                    ? ` ${data.inactivityWeeksTracked} week(s) tracked so far.`
                    : " Not yet active — no eligible weeks have passed."
                  }
                  {" "}Weeks where a user received <strong>0 matches</strong> are excluded (they had nothing to interact with).
                </p>
                <p className="text-muted-foreground">
                  <strong>1 week inactive</strong> → warning email &nbsp;|&nbsp;
                  <strong>2 weeks</strong> → at risk (warning email) &nbsp;|&nbsp;
                  <strong>3+ weeks</strong> → auto-paused + notification
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {statusCards.map((s) => (
            <Tooltip key={s.key}>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{s.name}</CardTitle>
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.fill }} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{s.value}</div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p className="text-xs">{s.desc}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Weekly Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Weekly Engagement Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="interactions" name="Total Interactions" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="likes" name="Likes" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="dislikes" name="Dislikes" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="activeUsers" name="Active Users" fill="#2563eb" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="matchesReceived" name="Matches Given" fill="#0d9488" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="datesCompleted" name="Dates Completed" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="mutualOutcomes" name="Mutual Outcomes" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active Users Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Weekly Active Users (users who interacted)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="activeUsers" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Match Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Match Distribution (how many students get how many matches)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={matchDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="matches" fontSize={12} label={{ value: "Matches received", position: "insideBottom", offset: -5 }} />
                  <YAxis fontSize={12} label={{ value: "# Students", angle: -90, position: "insideLeft" }} />
                  <RechartsTooltip formatter={(value: number) => [`${value} students`, "Count"]} />
                  <Bar dataKey="count" name="Students" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                    {matchDistribution.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#ef4444" : "#7c3aed"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity vs Matches Correlation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScatterIcon className="h-5 w-5" />
              Activity vs Matches Correlation
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Each bar group shows average interactions for users with that many matches
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityByMatches}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="matchBucket" fontSize={12} label={{ value: "Matches received", position: "insideBottom", offset: -5 }} />
                  <YAxis fontSize={12} label={{ value: "Avg interactions", angle: -90, position: "insideLeft" }} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      name === "avgInteractions" ? value.toFixed(1) : value,
                      name === "avgInteractions" ? "Avg Interactions" : "Users"
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="avgInteractions" name="Avg Interactions" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="userCount" name="# Users" fill="#7c3aed" radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Engagement ({filteredUsers.length} users)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={refresh}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">✅ Active</SelectItem>
                  <SelectItem value="warning">⚠️ Warning (1w)</SelectItem>
                  <SelectItem value="at_risk">🟠 At Risk (2w)</SelectItem>
                  <SelectItem value="inactive">🔴 Auto-Pause (3w+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                      User {sortBy === "name" ? (sortAsc ? "↑" : "↓") : ""}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("interactions")}>
                      Interactions {sortBy === "interactions" ? (sortAsc ? "↑" : "↓") : ""}
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("matches")}>
                      Matches {sortBy === "matches" ? (sortAsc ? "↑" : "↓") : ""}
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("dates")}>
                      Dates {sortBy === "dates" ? (sortAsc ? "↑" : "↓") : ""}
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("inactive_weeks")}>
                      Inactive Wks {sortBy === "inactive_weeks" ? (sortAsc ? "↑" : "↓") : ""}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("last_activity")}>
                      Last Active {sortBy === "last_activity" ? (sortAsc ? "↑" : "↓") : ""}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const cfg = STATUS_CONFIG[user.status];
                    const isExpanded = expandedUser === user.id;
                    return (
                      <React.Fragment key={user.id}>
                        <TableRow className={isExpanded ? "border-b-0" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photo_url || undefined} />
                                <AvatarFallback>{(user.first_name?.[0] || "?").toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {user.first_name} {user.last_name || ""}
                                </div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant={cfg.badge} className="text-xs">
                                  {cfg.label}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[250px]">
                                <p className="text-xs">{cfg.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right font-mono">{user.total_interactions_12w}</TableCell>
                          <TableCell className="text-right font-mono">{user.total_matches_12w}</TableCell>
                          <TableCell className="text-right font-mono">{user.total_dates_completed}</TableCell>
                          <TableCell className="text-right">
                            <span className={user.consecutive_inactive_weeks >= 3 ? "text-red-500 font-bold" : user.consecutive_inactive_weeks >= 2 ? "text-orange-500 font-semibold" : ""}>
                              {user.consecutive_inactive_weeks}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.last_activity ? format(new Date(user.last_activity), "MMM d, yyyy") : "Never"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${user.id}-detail`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <UserWeeklyDetail user={user} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

const UserWeeklyDetail = ({ user }: { user: UserEngagement }) => {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">
        {user.first_name} {user.last_name || ""}
      </h4>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total Interactions:</span>{" "}
          <span className="font-mono font-semibold">{user.total_interactions_12w}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Matches:</span>{" "}
          <span className="font-mono font-semibold">{user.total_matches_12w}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Dates Completed:</span>{" "}
          <span className="font-mono font-semibold">{user.total_dates_completed}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Inactive Weeks:</span>{" "}
          <span className="font-mono font-semibold">{user.consecutive_inactive_weeks}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Last Active:</span>{" "}
          <span className="font-mono font-semibold">
            {user.last_activity ? format(new Date(user.last_activity), "MMM d, yyyy") : "Never"}
          </span>
        </div>
      </div>
    </div>
  );
};
