import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatCents, formatDate } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { SimulationModal } from "../components/modals/SimulationModal";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ShieldCheck,
  Sparkles,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export function DashboardPage() {
  const { user } = useAuth();
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // 1. Fetch User Accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounts");
      return res.data.data;
    },
  });

  // 2. Fetch Recent Transfers
  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ["transfers", { limit: 5 }],
    queryFn: async () => {
      const res = await api.get("/transfers?limit=5");
      return res.data.data;
    },
  });

  const accounts = accountsData?.accounts || [];
  const summary = accountsData?.summary || { totalAvailableCents: 0, totalLedgerCents: 0 };
  const transfers = transfersData?.transfers || [];

  const handleCopy = (accNumber: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedAccount(accNumber);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  // Mock analytics curve derived from balances for visual aesthetic
  const chartData = [
    { name: "Day 1", balance: (summary.totalAvailableCents / 100) * 0.88 },
    { name: "Day 5", balance: (summary.totalAvailableCents / 100) * 0.92 },
    { name: "Day 10", balance: (summary.totalAvailableCents / 100) * 0.95 },
    { name: "Day 15", balance: (summary.totalAvailableCents / 100) * 0.9 },
    { name: "Day 20", balance: (summary.totalAvailableCents / 100) * 0.98 },
    { name: "Today", balance: summary.totalAvailableCents / 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Welcome back, {user?.fullName.split(" ")[0]}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your finances are synchronized with the double-entry general ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="emerald"
            size="sm"
            onClick={() => setSimulationModalOpen(true)}
            className="gap-1.5 shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Simulate Funds
          </Button>

          <Link to="/transfer">
            <Button variant="primary" size="sm" className="gap-1.5">
              <ArrowLeftRight className="h-4 w-4" />
              Transfer Money
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Balance Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-850 text-white border-navy-800 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

          <CardContent className="p-6 sm:p-8 space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-light uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald" />
                Total Authoritative Available Balance
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-white/80">
                USD Portfolio
              </span>
            </div>

            <div>
              {accountsLoading ? (
                <Skeleton className="h-12 w-64 bg-white/20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                    {formatCents(summary.totalAvailableCents, summary.primaryCurrency || "USD")}
                  </span>
                </div>
              )}
              <p className="text-xs text-white/60 mt-1">
                Ledger Book Balance: {formatCents(summary.totalLedgerCents, summary.primaryCurrency || "USD")}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link to="/transfer">
                <Button variant="emerald" size="sm" className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Send Payment
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSimulationModalOpen(true)}
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 gap-2"
              >
                <ArrowDownLeft className="h-4 w-4" />
                Simulate Deposit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Analytics Mini Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
              <span>30-Day Liquidity Trend</span>
              <TrendingUp className="h-4 w-4 text-emerald" />
            </div>
            <CardTitle className="text-lg font-bold">Account Health</CardTitle>
          </CardHeader>

          <CardContent className="pb-3">
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    formatter={(val: number) => [`$${val.toFixed(2)}`, "Liquidity"]}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "11px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#balGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-1">
              Active ledger accounts in reconciliation: {accounts.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Cards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Your Bank Accounts</h2>
          <Link to="/accounts" className="text-xs font-semibold text-primary hover:underline">
            Manage Accounts →
          </Link>
        </div>

        {accountsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc: any) => (
              <Card key={acc._id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {acc.accountType} Account
                      </span>
                      <h3 className="text-base font-bold text-foreground">
                        {acc.nickname || `${acc.accountType} Account`}
                      </h3>
                    </div>
                    <Badge variant={acc.status === "ACTIVE" ? "success" : "warning"}>
                      {acc.status}
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between border-t border-border/50 pt-3">
                    <div>
                      <span className="text-2xl font-black tracking-tight text-foreground">
                        {formatCents(acc.availableBalanceCents, acc.currency)}
                      </span>
                      <p className="text-[11px] text-muted-foreground">Available Balance</p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                        <span>{acc.accountNumber}</span>
                        <button
                          onClick={() => handleCopy(acc.accountNumber)}
                          className="hover:text-primary transition-colors"
                          title="Copy account number"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {copiedAccount === acc.accountNumber && (
                        <span className="text-[10px] text-emerald font-semibold block">Copied!</span>
                      )}
                      <p className="text-[10px] text-muted-foreground">Account Number</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <Link
                      to={`/accounts/${acc._id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      View Ledger Transactions →
                    </Link>
                    <Link
                      to={`/transfer?source=${acc._id}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      Pay From This Account
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Recent Ledger Transfers</CardTitle>
            <CardDescription className="text-xs">
              Latest transactions committed to the double-entry journal
            </CardDescription>
          </div>
          <Link to="/transactions">
            <Button variant="outline" size="sm">
              View All History
            </Button>
          </Link>
        </CardHeader>

        <CardContent>
          {transfersLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No transactions posted yet</p>
              <p className="text-xs text-muted-foreground">
                Initiate a simulated deposit or internal transfer to begin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Receipt</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transfers.map((tx: any) => {
                    const isSender = tx.sourceUserId === user?._id;
                    return (
                      <tr key={tx._id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3 font-medium text-foreground">
                          {tx.description || "Internal Funds Transfer"}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-muted-foreground">
                          {tx.receiptNumber}
                        </td>
                        <td className="py-3">
                          <Badge variant={tx.status === "POSTED" ? "success" : "default"}>
                            {tx.status}
                          </Badge>
                        </td>
                        <td
                          className={`py-3 text-right font-bold whitespace-nowrap ${
                            isSender ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {isSender ? "-" : "+"}
                          {formatCents(tx.amountCents, tx.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Educational Simulation Modal */}
      <SimulationModal
        isOpen={simulationModalOpen}
        onClose={() => setSimulationModalOpen(false)}
        accounts={accounts}
      />
    </div>
  );
}

