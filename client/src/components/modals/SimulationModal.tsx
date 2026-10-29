import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { api } from "../../lib/api";
import { v4 as uuidv4 } from "uuid";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, AlertCircle, Sparkles } from "lucide-react";

export interface AccountOption {
  _id: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  availableBalanceCents: number;
}

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  defaultAccountId?: string;
}

export function SimulationModal({ isOpen, onClose, accounts, defaultAccountId }: SimulationModalProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId || accounts[0]?._id || "");
  const [amountStr, setAmountStr] = useState("100.00");
  const [description, setDescription] = useState("Demo Capital Injection");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-select first account if not set
  React.useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0]._id);
    }
  }, [accounts, selectedAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const parsedAmount = parseFloat(amountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid positive dollar amount.");
      }

      const amountCents = Math.round(parsedAmount * 100);
      const idempotencyKey = uuidv4();

      if (mode === "DEPOSIT") {
        await api.post("/accounts/simulate-deposit", {
          accountId: selectedAccountId,
          amountCents,
          description: description || "Simulated Deposit",
          idempotencyKey,
        });
        setSuccessMsg(`Simulated deposit of $${parsedAmount.toFixed(2)} completed successfully!`);
      } else {
        await api.post("/accounts/simulate-withdrawal", {
          accountId: selectedAccountId,
          amountCents,
          description: description || "Simulated Withdrawal",
          idempotencyKey,
        });
        setSuccessMsg(`Simulated withdrawal of $${parsedAmount.toFixed(2)} completed successfully!`);
      }

      // Refresh accounts and queries
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });

      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to process simulation operation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Simulate Funds (Educational Demo)"
      description="Inject or withdraw simulated funds directly into your test accounts. Every simulation posts a balanced double-entry ledger entry from the system vault."
    >
      <div className="flex gap-2 p-1 bg-muted rounded-lg mb-4">
        <button
          type="button"
          onClick={() => {
            setMode("DEPOSIT");
            setDescription("Demo Capital Injection");
            setError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
            mode === "DEPOSIT"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald" />
          Deposit Simulation
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("WITHDRAW");
            setDescription("Demo Fund Withdrawal");
            setError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
            mode === "WITHDRAW"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
          Withdrawal Simulation
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/80 mb-1.5">
            Target Account
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            {accounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.accountType} ({acc.accountNumber}) - ${(acc.availableBalanceCents / 100).toFixed(2)}{" "}
                {acc.currency}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Amount (USD)"
          type="number"
          step="0.01"
          min="1"
          max="500000"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          required
        />

        <Input
          label="Simulation Note / Reference"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={mode === "DEPOSIT" ? "emerald" : "primary"}
            size="sm"
            isLoading={isLoading}
          >
            {mode === "DEPOSIT" ? "Credit Simulated Funds" : "Debit Simulated Funds"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

