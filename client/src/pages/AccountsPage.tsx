import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatCents, formatDate } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Dialog } from "../components/ui/Dialog";
import { Skeleton } from "../components/ui/Skeleton";
import {
  Wallet,
  Plus,
  ArrowRight,
  Copy,
  CheckCircle2,
  Building,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [accountType, setAccountType] = useState<"SAVINGS" | "CURRENT">("CURRENT");
  const [currency, setCurrency] = useState("USD");
  const [nickname, setNickname] = useState("");
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounts");
      return res.data.data;
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (payload: { accountType: string; currency: string; nickname?: string }) => {
      const res = await api.post("/accounts", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setOpenModal(false);
      setNickname("");
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to open new account.");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createAccountMutation.mutate({
      accountType,
      currency,
      nickname: nickname.trim() || undefined,
    });
  };

  const handleCopy = (accNumber: string) => {
    navigator.clipboard.writeText(accNumber);
    setCopiedAccount(accNumber);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const accounts = data?.accounts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Bank Accounts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active depository accounts backed by customer liability ledger postings
          </p>
        </div>

        <Button variant="emerald" size="sm" onClick={() => setOpenModal(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Open New Account
        </Button>
      </div>

      {/* Account Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : accounts.length === 0 ? (
        <Card className="p-12 text-center">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">No accounts found</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Open a checking or savings account to start banking.
          </p>
          <Button variant="emerald" size="sm" onClick={() => setOpenModal(true)}>
            Open an Account
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc: any) => (
            <Card key={acc._id} className="overflow-hidden hover:border-primary/50 transition-all">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {acc.accountType} Account
                    </span>
                    <CardTitle className="text-lg mt-0.5">
                      {acc.nickname || `${acc.accountType} Deposit Account`}
                    </CardTitle>
                  </div>
                  <Badge variant={acc.status === "ACTIVE" ? "success" : "warning"}>
                    {acc.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-black tracking-tight text-foreground">
                      {formatCents(acc.availableBalanceCents, acc.currency)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ledger: {formatCents(acc.ledgerBalanceCents, acc.currency)}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
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
                    <span className="text-[10px] text-muted-foreground">Account Identifier</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Double-Entry Reconciled</span>
                  </div>

                  <Link to={`/accounts/${acc._id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      Ledger History
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Open Account Modal */}
      <Dialog
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title="Open New Depository Account"
        description="Creates an authorized customer deposit account linked to a dedicated double-entry general ledger code."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/80 mb-1.5">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("CURRENT")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  accountType === "CURRENT"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <p className="text-xs font-bold text-foreground">Current / Checking</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Everyday liquidity & transfers</p>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("SAVINGS")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  accountType === "SAVINGS"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <p className="text-xs font-bold text-foreground">High-Yield Savings</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Wealth preservation vault</p>
              </button>
            </div>
          </div>

          <Input
            label="Account Nickname (Optional)"
            type="text"
            placeholder="e.g. Travel Fund or Operating Checking"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createAccountMutation.isPending}
            >
              Provision Account
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

