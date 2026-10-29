import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatCents, formatDate } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";

export function AccountDetailsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  // 1. Fetch Account Details
  const { data: accountData, isLoading: accountLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      const res = await api.get(`/accounts/${accountId}`);
      return res.data.data.account;
    },
    enabled: !!accountId,
  });

  // 2. Fetch Ledger Postings for this Account
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ["account-transactions", accountId, page],
    queryFn: async () => {
      const res = await api.get(`/accounts/${accountId}/transactions?page=${page}&limit=15`);
      return res.data.data;
    },
    enabled: !!accountId,
  });

  const account = accountData;
  const postings = transactionsData?.postings || [];
  const pagination = transactionsData?.pagination || { page: 1, totalPages: 1 };

  const handleExportCsv = () => {
    if (!accountId) return;
    // Trigger browser download via API
    window.open(`/api/v1/accounts/${accountId}/export-csv`, "_blank");
  };

  const handleCopy = () => {
    if (account?.accountNumber) {
      navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (accountLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <Card className="p-12 text-center space-y-3">
        <h3 className="text-base font-bold text-foreground">Bank Account Not Found</h3>
        <p className="text-xs text-muted-foreground">The requested account does not exist or access is restricted.</p>
        <Link to="/accounts">
          <Button variant="outline" size="sm">
            Back to Accounts
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/accounts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Accounts Overview
        </Link>
      </div>

      {/* Account Hero Summary Card */}
      <Card className="bg-card border-border shadow-md">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {account.accountType} Account
                </span>
                <Badge variant={account.status === "ACTIVE" ? "success" : "warning"}>
                  {account.status}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                {account.nickname || `${account.accountType} Deposit Account`}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald" />
                Export Statement (CSV)
              </Button>
              <Link to={`/transfer?source=${account._id}`}>
                <Button variant="primary" size="sm">
                  Send From Here
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-border pt-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Available Balance</p>
              <p className="text-3xl font-black text-foreground mt-1">
                {formatCents(account.availableBalanceCents, account.currency)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Authoritative Ledger Balance</p>
              <p className="text-3xl font-black text-foreground/80 mt-1">
                {formatCents(account.ledgerBalanceCents, account.currency)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Account Number</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-base font-bold text-foreground">
                  {account.accountNumber}
                </span>
                <button
                  onClick={handleCopy}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {copied && <span className="text-xs text-emerald font-semibold">Copied!</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Immutable Ledger Postings Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Immutable Ledger Postings</CardTitle>
            <CardDescription className="text-xs">
              Every debit and credit posting linked to this account's general ledger liability
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Double-Entry Balanced
          </div>
        </CardHeader>

        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : postings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Receipt className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No postings recorded yet</p>
              <p className="text-xs">Transactions posted to this account will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-3">Posting Date</th>
                      <th className="pb-3">Journal Reference</th>
                      <th className="pb-3">Transaction Description</th>
                      <th className="pb-3">Direction</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {postings.map((p: any) => {
                      const isCredit = p.direction === "CREDIT";
                      const journal = p.journalEntryId;
                      return (
                        <tr key={p._id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 text-muted-foreground whitespace-nowrap">
                            {formatDate(p.createdAt)}
                          </td>
                          <td className="py-3 font-mono text-[11px] text-muted-foreground">
                            {journal?.reference ? journal.reference.slice(0, 18) + "..." : "N/A"}
                          </td>
                          <td className="py-3 font-medium text-foreground">
                            {journal?.description || "Ledger posting"}
                          </td>
                          <td className="py-3">
                            <Badge variant={isCredit ? "success" : "default"}>
                              {p.direction}
                            </Badge>
                          </td>
                          <td
                            className={`py-3 text-right font-bold whitespace-nowrap ${
                              isCredit
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-foreground"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {formatCents(p.amountCents, p.currency)}
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

