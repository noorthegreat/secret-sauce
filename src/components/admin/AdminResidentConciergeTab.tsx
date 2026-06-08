import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  listResidentJoinRequests,
  type ManagedBuilding,
  type ResidentJoinRequest,
  type ResidentJoinRequestStatus,
  type ResidentJoinRequestSummary,
  updateResidentJoinRequestStatus,
} from "@/lib/residentConcierge";
import { Building2, CheckCircle2, Clock3, RefreshCcw, XCircle } from "lucide-react";

const STATUS_OPTIONS: Array<{ label: string; value: ResidentJoinRequestStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending_review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Withdrawn", value: "withdrawn" },
];

const emptySummary: ResidentJoinRequestSummary = {
  pending_review: 0,
  approved: 0,
  rejected: 0,
  withdrawn: 0,
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusBadgeVariant(status: ResidentJoinRequestStatus) {
  switch (status) {
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "withdrawn":
      return "secondary";
    case "pending_review":
    default:
      return "outline";
  }
}

function requestGoals(request: ResidentJoinRequest) {
  const labels: string[] = [];
  if (request.wants_friendships) labels.push("Friendship");
  if (request.wants_networking) labels.push("Networking");
  return labels.join(" + ") || "Not set";
}

function contactPrefs(request: ResidentJoinRequest) {
  const labels: string[] = [];
  if (request.contact_via_sms) labels.push("SMS");
  if (request.contact_via_email) labels.push("Email");
  return labels.join(" / ") || "None";
}

export const AdminResidentConciergeTab = () => {
  const { toast } = useToast();
  const [buildingSlug, setBuildingSlug] = useState("chorus-apartments");
  const [building, setBuilding] = useState<ManagedBuilding | null>(null);
  const [requests, setRequests] = useState<ResidentJoinRequest[]>([]);
  const [summary, setSummary] = useState<ResidentJoinRequestSummary>(emptySummary);
  const [filterStatus, setFilterStatus] = useState<ResidentJoinRequestStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  const totalRequests = useMemo(
    () => summary.pending_review + summary.approved + summary.rejected + summary.withdrawn,
    [summary],
  );

  const loadRequests = async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await listResidentJoinRequests({
        buildingSlug: buildingSlug.trim().toLowerCase(),
        status: filterStatus === "all" ? undefined : filterStatus,
      });

      setBuilding(result.building);
      setRequests(result.requests);
      setSummary(result.summary || emptySummary);
    } catch (error) {
      toast({
        title: "Unable to load Resident Concierge requests",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [buildingSlug, filterStatus]);

  const handleStatusUpdate = async (requestId: string, status: ResidentJoinRequestStatus) => {
    setUpdatingRequestId(requestId);

    try {
      await updateResidentJoinRequestStatus(requestId, status);
      toast({
        title: "Request updated",
        description: `Resident request moved to ${status.replace("_", " ")}.`,
      });
      await loadRequests({ silent: true });
    } catch (error) {
      toast({
        title: "Unable to update request",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setUpdatingRequestId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Resident Concierge Intake Review
          </CardTitle>
          <CardDescription>
            Review resident opt-ins for the first building pilots and move requests through approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="building-slug">Building slug</Label>
              <Input
                id="building-slug"
                value={buildingSlug}
                onChange={(event) => setBuildingSlug(event.target.value)}
                placeholder="chorus-apartments"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => loadRequests({ silent: true })}
                disabled={isRefreshing || isLoading}
                className="gap-2"
              >
                <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {building && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{building.name}</span>
                <Badge variant={building.is_active ? "default" : "secondary"}>
                  {building.is_active ? "Active" : "Inactive"}
                </Badge>
                {building.invite_code && <Badge variant="outline">Invite code: {building.invite_code}</Badge>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending_review}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <XCircle className="h-4 w-4" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Resident requests</CardTitle>
            <CardDescription>Building-scoped intake requests for friendship and networking opt-ins.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={filterStatus === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading Resident Concierge requests...</div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No resident join requests match this filter yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Goals</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {request.first_name} {request.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">{request.email}</div>
                        <div className="text-sm text-muted-foreground">{request.phone_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{request.unit_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.move_in_date ? `Move-in: ${request.move_in_date}` : "Move-in not provided"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{requestGoals(request)}</TableCell>
                    <TableCell>{contactPrefs(request)}</TableCell>
                    <TableCell>{formatTimestamp(request.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(request.status)}>
                        {request.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={request.status === "approved" ? "default" : "outline"}
                          onClick={() => handleStatusUpdate(request.id, "approved")}
                          disabled={updatingRequestId === request.id}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={request.status === "pending_review" ? "default" : "outline"}
                          onClick={() => handleStatusUpdate(request.id, "pending_review")}
                          disabled={updatingRequestId === request.id}
                        >
                          Pending
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={request.status === "rejected" ? "destructive" : "outline"}
                          onClick={() => handleStatusUpdate(request.id, "rejected")}
                          disabled={updatingRequestId === request.id}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
