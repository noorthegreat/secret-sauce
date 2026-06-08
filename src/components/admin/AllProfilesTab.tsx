import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, ArrowUpDown, ChevronLeft, ChevronRight, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { LongPressButton } from "@/components/ui/long-press-button";
import { fetchAdminLikeCounts } from "@/lib/admin-interactions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AllProfilesTabProps {
    selectedForMatch: any[];
    onToggleSelectForMatch: (profile: any) => void;
    onViewProfile: (profile: any) => void;
    onEmailProfile: (profile: any) => void;
}

interface AdminProfileStats {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    photo_url: string | null;
    age: number | null;
    bio: string | null;
    additional_photos: string[] | null;
    created_at: string | null;
    total_matches: number;
    likes_received: number;
    likes_given: number;
    total_dates: number;
    completed_dates: number;
}

const compareValues = (
    left: string | number | null | undefined,
    right: string | number | null | undefined,
    direction: "asc" | "desc"
) => {
    const multiplier = direction === "asc" ? 1 : -1;

    if (typeof left === "number" && typeof right === "number") {
        return (left - right) * multiplier;
    }

    const normalizedLeft = String(left ?? "").toLowerCase();
    const normalizedRight = String(right ?? "").toLowerCase();
    return normalizedLeft.localeCompare(normalizedRight, undefined, { sensitivity: "base" }) * multiplier;
};

export const AllProfilesTab = ({
    selectedForMatch,
    onToggleSelectForMatch,
    onViewProfile,
    onEmailProfile
}: AllProfilesTabProps) => {
    const { toast } = useToast();
    const [profiles, setProfiles] = useState<AdminProfileStats[]>([]);
    const [totalProfiles, setTotalProfiles] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [sortColumn, setSortColumn] = useState<keyof AdminProfileStats | string>("first_name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(0);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<AdminProfileStats | null>(null);
    const [activeDatesCount, setActiveDatesCount] = useState(0);
    const [isLoadingDates, setIsLoadingDates] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const pageSize = 50;
    const isLocalDev = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    const fetchProfilesDirectly = async () => {
        const [
            { data: profilesData, error: profilesError },
            { data: privateRows, error: privateError },
            { data: matchHistoryRows, error: matchHistoryError },
            { data: datesRows, error: datesError },
        ] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, first_name, photo_url, age, bio, additional_photos, created_at"),
            supabase
                .from("private_profile_data" as any)
                .select("user_id, last_name, email, created_at"),
            supabase
                .from("match_history")
                .select("user_id, matched_user_id"),
            supabase
                .from("dates")
                .select("user1_id, user2_id, status"),
        ]);

        if (profilesError) throw profilesError;
        if (privateError) throw privateError;
        if (matchHistoryError) throw matchHistoryError;
        if (datesError) throw datesError;

        const profileIds = (profilesData || []).map((profile: any) => profile.id);
        let likeCounts: Record<string, { likes_given: number; likes_received: number }> = {};
        if (!isLocalDev) {
            try {
                const likeCountData = await fetchAdminLikeCounts(profileIds);
                likeCounts = likeCountData.counts || {};
            } catch (error) {
                console.warn("Falling back without like counts:", error);
            }
        }

        const privateByUserId = new Map((privateRows || []).map((row: any) => [row.user_id, row]));
        const distinctMatchesByUser = new Map<string, Set<string>>();
        const likesReceivedByUser = new Map<string, number>();
        const likesGivenByUser = new Map<string, number>();
        const totalDatesByUser = new Map<string, number>();
        const completedDatesByUser = new Map<string, number>();

        (matchHistoryRows || []).forEach((row: any) => {
            if (!distinctMatchesByUser.has(row.user_id)) {
                distinctMatchesByUser.set(row.user_id, new Set());
            }
            distinctMatchesByUser.get(row.user_id)?.add(row.matched_user_id);
        });

        Object.entries(likeCounts).forEach(([userId, counts]) => {
            likesGivenByUser.set(userId, counts.likes_given || 0);
            likesReceivedByUser.set(userId, counts.likes_received || 0);
        });

        (datesRows || []).forEach((row: any) => {
            totalDatesByUser.set(row.user1_id, (totalDatesByUser.get(row.user1_id) || 0) + 1);
            totalDatesByUser.set(row.user2_id, (totalDatesByUser.get(row.user2_id) || 0) + 1);

            if (row.status === "completed") {
                completedDatesByUser.set(row.user1_id, (completedDatesByUser.get(row.user1_id) || 0) + 1);
                completedDatesByUser.set(row.user2_id, (completedDatesByUser.get(row.user2_id) || 0) + 1);
            }
        });

        const allProfiles: AdminProfileStats[] = (profilesData || []).map((profile: any) => {
            const privateRow = privateByUserId.get(profile.id);
            return {
                id: profile.id,
                first_name: profile.first_name || "",
                last_name: privateRow?.last_name || "",
                email: privateRow?.email || "",
                photo_url: profile.photo_url || null,
                age: profile.age ?? null,
                bio: profile.bio ?? null,
                additional_photos: profile.additional_photos ?? null,
                created_at: profile.created_at ?? privateRow?.created_at ?? null,
                total_matches: distinctMatchesByUser.get(profile.id)?.size || 0,
                likes_received: likesReceivedByUser.get(profile.id) || 0,
                likes_given: likesGivenByUser.get(profile.id) || 0,
                total_dates: totalDatesByUser.get(profile.id) || 0,
                completed_dates: completedDatesByUser.get(profile.id) || 0,
            };
        });

        const sortedProfiles = [...allProfiles].sort((left, right) => {
            const primary = compareValues(
                left[sortColumn as keyof AdminProfileStats] as string | number | null | undefined,
                right[sortColumn as keyof AdminProfileStats] as string | number | null | undefined,
                sortDirection
            );

            if (primary !== 0) return primary;

            const firstNameTieBreak = compareValues(left.first_name, right.first_name, "asc");
            if (firstNameTieBreak !== 0) return firstNameTieBreak;

            return compareValues(left.last_name, right.last_name, "asc");
        });

        const pageStart = page * pageSize;
        const pageEnd = pageStart + pageSize;

        setProfiles(sortedProfiles.slice(pageStart, pageEnd));
        setTotalProfiles(sortedProfiles.length);
    };

    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            if (isLocalDev) {
                await fetchProfilesDirectly();
                return;
            }

            const { data, error } = await supabase.functions.invoke('admin-list-profile-stats', {
                body: {
                    page,
                    pageSize,
                    sortColumn,
                    sortDirection,
                }
            });
            if (error) throw error;
            setProfiles((data?.profiles || []).map((profile: any) => ({
                age: null,
                bio: null,
                additional_photos: null,
                created_at: null,
                ...profile,
            })));
            setTotalProfiles(data?.totalCount || 0);
        } catch (error: any) {
            const message = String(error?.message || "");
            const shouldTryDirectFallback =
                message.includes("Edge Function") ||
                message.includes("Failed to send a request");

            if (shouldTryDirectFallback) {
                try {
                    await fetchProfilesDirectly();
                    return;
                } catch (fallbackError: any) {
                    toast({
                        title: "Error fetching profiles",
                        description: fallbackError.message || message,
                        variant: "destructive",
                    });
                    return;
                }
            }

            toast({
                title: "Error fetching profiles",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, [page, sortColumn, sortDirection]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("desc"); // Default to desc for numbers usually
        }
        setPage(0); // Reset to first page
    };

    const renderSortIcon = (column: string) => {
        if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />;
    };

    const handleOpenDeleteDialog = async (profile: AdminProfileStats) => {
        setProfileToDelete(profile);
        setDeleteDialogOpen(true);
        setActiveDatesCount(0);
        setIsLoadingDates(true);

        try {
            const { count, error } = await supabase
                .from("dates")
                .select("id", { count: "exact", head: true })
                .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
                .in("status", ["pending", "confirmed"]);

            if (error) throw error;
            setActiveDatesCount(count || 0);
        } catch (error) {
            console.error("Error loading active dates for user:", error);
        } finally {
            setIsLoadingDates(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!profileToDelete) return;
        setIsDeleting(true);

        try {
            const { error } = await supabase.functions.invoke("delete-account", {
                body: { target_user_id: profileToDelete.id }
            });
            if (error) throw error;

            toast({
                title: "User Deleted",
                description: `${profileToDelete.first_name} ${profileToDelete.last_name} has been deleted.`,
            });
            setDeleteDialogOpen(false);
            setProfileToDelete(null);
            setActiveDatesCount(0);
            await fetchProfiles();
        } catch (error: any) {
            toast({
                title: "Failed to delete user",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>All Profiles</span>
                    <div className="flex items-center gap-2 text-sm">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span>Page {page + 1}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPage(page + 1)}
                            disabled={((page + 1) * pageSize) >= totalProfiles || isLoading}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px] cursor-pointer hover:bg-muted" onClick={() => handleSort("first_name")}>
                                    <div className="flex items-center">User {renderSortIcon("first_name")}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("total_matches")}>
                                    <div className="flex items-center">Matches {renderSortIcon("total_matches")}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("likes_received")}>
                                    <div className="flex items-center">Likes Recv {renderSortIcon("likes_received")}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("likes_given")}>
                                    <div className="flex items-center">Likes Given {renderSortIcon("likes_given")}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("total_dates")}>
                                    <div className="flex items-center">Total Dates {renderSortIcon("total_dates")}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("completed_dates")}>
                                    <div className="flex items-center">Completed Dates {renderSortIcon("completed_dates")}</div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                                </TableRow>
                            ) : profiles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">No profiles found.</TableCell>
                                </TableRow>
                            ) : (
                                profiles.map((profile) => (
                                    <TableRow key={profile.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewProfile(profile)}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={profile.photo_url || "/placeholder.svg"}
                                                    alt={profile.first_name}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{profile.first_name} {profile.last_name}</span>
                                                    <span className="text-xs text-muted-foreground">{profile.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{profile.total_matches}</TableCell>
                                        <TableCell className="text-center">{profile.likes_received}</TableCell>
                                        <TableCell className="text-center">{profile.likes_given}</TableCell>
                                        <TableCell className="text-center">{profile.total_dates}</TableCell>
                                        <TableCell className="text-center">{profile.completed_dates}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant={selectedForMatch.find(p => p.id === profile.id) ? "default" : "outline"}
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => onToggleSelectForMatch(profile)}
                                                    title={selectedForMatch.find(p => p.id === profile.id) ? "Selected" : "Select for Match"}
                                                >
                                                    <Users className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => onEmailProfile(profile)}
                                                    title="Send Email"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => handleOpenDeleteDialog(profile)}
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Delete User
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{profileToDelete?.first_name} {profileToDelete?.last_name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        {isLoadingDates ? (
                            <div className="flex items-center justify-center py-3">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : activeDatesCount > 0 ? (
                            <p className="text-sm font-medium text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                                Warning: this user has {activeDatesCount} active date(s). Partners will be notified of cancellation.
                            </p>
                        ) : (
                            <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                                No active dates found for this user.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        <LongPressButton
                            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            progressColor="bg-black/20"
                            onLongPress={handleDeleteProfile}
                            disabled={isDeleting || isLoadingDates}
                        >
                            {isDeleting ? "Deleting..." : "Hold to Delete User"}
                        </LongPressButton>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
