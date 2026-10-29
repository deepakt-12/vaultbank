import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatCents, formatDate } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { History, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

export function AdminTransactionsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions", page],
    queryFn: async () => {
      const res = await api.get(`/admin/transactions?page=${page}&limit=15`);
      return res.data.data;
    },
  });

  const transfers = data?.transfers || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Transaction Surveillance & Monitoring
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time oversight of all internal transfers, counterparty accounts, and algorithmic risk flags
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
          ) : transfers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <History className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No system transfers found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Receipt Number</th>
                      <th className="pb-3">Sender</th>
                      <th className="pb-3">Recipient</th>
                      <th className="pb-3">Risk Assessment</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transfers.map((tx: any) => {
                      const isHighRisk = tx.riskScore >= 50;
                      return (
                        <tr key={tx._id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 text-muted-foreground whitespace-nowrap">
                            {formatDate(tx.createdAt)}
                          </td>
                          <td className="py-3 font-mono text-[11px] text-muted-foreground">
                            {tx.receiptNumber}
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-foreground block">
                              {tx.sourceUserId?.fullName || "User"}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {tx.sourceAccountId?.accountNumber}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-foreground block">
                              {tx.destinationUserId?.fullName || "User"}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {tx.destinationAccountId?.accountNumber}
                            </span>
                          </td>
                          <td className="py-3">
                            {isHighRisk ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                High ({tx.riskScore})
                              </Badge>
                            ) : tx.riskScore > 0 ? (
                              <Badge variant="warning">Med ({tx.riskScore})</Badge>
                            ) : (
                              <Badge variant="success">Standard (0)</Badge>
                            )}
                          </td>
                          <td className="py-3">
                            <Badge variant={tx.status === "POSTED" ? "success" : "default"}>
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right font-black whitespace-nowrap text-foreground">
                            {formatCents(tx.amountCents, tx.currency)}
                          </td>
                        </tr>
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

