import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Trash2, AlertTriangle } from "lucide-react";

type ErrorLog = {
    id: string;
    created_at: string;
    message: string | null;
    stack: string | null;
    url: string | null;
    user_agent: string | null;
    user_id: string | null;
    context: { type?: string; componentStack?: string; [key: string]: unknown } | null;
};

export const AdminErrorLogsTab = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("client_error_logs" as never)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200);
        if (error) {
            toast({ title: "Error", description: "Failed to load error logs: " + error.message, variant: "destructive" });
        } else {
            setLogs((data as unknown as ErrorLog[]) || []);
        }
        setLoading(false);
    };

    const clearAll = async () => {
        if (!window.confirm("Delete ALL client error logs? This cannot be undone.")) return;
        setClearing(true);
        const { error } = await supabase
            .from("client_error_logs" as never)
            .delete()
            .gte("created_at", "1900-01-01");
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            setLogs([]);
            toast({ title: "Cleared", description: "All error logs deleted." });
        }
        setClearing(false);
    };

    const fmt = (iso: string) => {
        try {
            return new Date(iso).toLocaleString();
        } catch {
            return iso;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" /> Client Error Logs ({logs.length})
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Front-end errors &amp; unhandled rejections reported by the app (most recent 200).
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
                            </Button>
                            <Button variant="destructive" size="sm" onClick={clearAll} disabled={clearing || logs.length === 0}>
                                <Trash2 className="h-4 w-4 mr-2" /> Clear all
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No errors logged. 🎉</p>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div key={log.id} className="rounded-lg border border-border/60 p-3 text-sm">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <span className="font-semibold text-destructive break-all">
                                            {log.message || "(no message)"}
                                        </span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {fmt(log.created_at)}
                                        </span>
                                    </div>
                                    {log.url && (
                                        <div className="text-xs text-muted-foreground mt-1 break-all">{log.url}</div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {log.context?.type ? <span className="mr-3">type: {String(log.context.type)}</span> : null}
                                        <span className="mr-3">user: {log.user_id ? `${log.user_id.slice(0, 8)}…` : "anon"}</span>
                                    </div>
                                    {(log.stack || log.context?.componentStack) && (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-xs text-muted-foreground">
                                                Stack / details
                                            </summary>
                                            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs bg-muted/40 p-2 rounded">
{log.stack || ""}{log.context?.componentStack ? `\n--- component stack ---\n${log.context.componentStack}` : ""}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
