import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { ShieldAlert, Terminal, Clock, UserCheck } from "lucide-react";

export function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: async () => {
      const res = await api.get(`/admin/audit-events?page=${page}&limit=25`);
      return res.data.data;
    },
  });

  const events = data?.events || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Immutable Audit Log Stream
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tamper-evident operational trail tracking all security events, authentication, and financial operations
        </p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No audit events recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Action Event</th>
                      <th className="pb-3">Actor / Subject</th>
                      <th className="pb-3">IP Address</th>
                      <th className="pb-3 text-right">Payload Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((ev: any) => {
                      const isExpanded = expandedId === ev._id;
                      return (
                        <React.Fragment key={ev._id}>
                          <tr className="hover:bg-muted/40 transition-colors">
                            <td className="py-3 text-muted-foreground whitespace-nowrap">
                              {formatDate(ev.createdAt)}
                            </td>
                            <td className="py-3">
                              <Badge
                                variant={
                                  ev.action.includes("FAILED") || ev.action.includes("LOCKED")
                                    ? "destructive"
                                    : ev.action.includes("ADMIN")
                                    ? "warning"
                                    : "default"
                                }
                                className="font-mono text-[10px]"
                              >
                                {ev.action}
                              </Badge>
                            </td>
                            <td className="py-3">
                              {ev.userId ? (
                                <div>
                                  <span className="font-bold text-foreground block">
                                    {ev.userId.fullName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {ev.userId.email} ({ev.userId.role})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Anonymous / System</span>
                              )}
                            </td>
                            <td className="py-3 font-mono text-[11px] text-muted-foreground">
                              {ev.ipAddress}
                            </td>
                            <td className="py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedId(isExpanded ? null : ev._id)}
                                className="h-6 text-[11px] px-2 text-primary"
                              >
                                {isExpanded ? "Collapse" : "Inspect Payload"}
                              </Button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="p-3 bg-muted/40">
                                <div className="rounded-lg bg-card border border-border p-3 text-[11px] font-mono text-foreground space-y-1">
                                  <p className="text-muted-foreground font-semibold">User-Agent: {ev.userAgent}</p>
                                  <pre className="text-xs overflow-x-auto text-emerald-600 dark:text-emerald-400">
                                    {JSON.stringify(ev.details, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
                  <span className="text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => prev - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((prev) => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

