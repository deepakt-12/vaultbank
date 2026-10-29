import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { v4 as uuidv4 } from "uuid";
import { formatCents } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Dialog } from "../components/ui/Dialog";
import { TransferReceiptModal, ReceiptData } from "../components/modals/TransferReceiptModal";
import {
  ArrowLeftRight,
  ShieldAlert,
  AlertCircle,
  UserCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
} from "lucide-react";

export function TransferPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // State
  const defaultSource = searchParams.get("source") || "";
  const [sourceAccountId, setSourceAccountId] = useState(defaultSource);
  const [destinationAccountNumber, setDestinationAccountNumber] = useState("");
  const [amountStr, setAmountStr] = useState("50.00");
  const [description, setDescription] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");

  // Recipient Lookup
  const [recipientData, setRecipientData] = useState<{
    recipientName: string;
    accountNumber: string;
    accountType: string;
  } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Modals & submission state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // 1. Fetch available customer accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await api.get("/accounts");
      return res.data.data.accounts;
    },
  });

  const accounts = accountsData || [];

  // Set default account if not set
  React.useEffect(() => {
    if (!sourceAccountId && accounts.length > 0) {
      setSourceAccountId(accounts[0]._id);
    }
  }, [accounts, sourceAccountId]);

  const selectedSourceAccount = accounts.find((a: any) => a._id === sourceAccountId);
  const parsedAmount = parseFloat(amountStr) || 0;
  const amountCents = Math.round(parsedAmount * 100);
  const isHighRisk = parsedAmount >= 5000;

  // Handle Recipient Account Lookup
  const handleLookupRecipient = async () => {
    if (!destinationAccountNumber.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);
    setRecipientData(null);

    try {
      const res = await api.get(`/accounts/lookup/${destinationAccountNumber.trim()}`);
      setRecipientData(res.data.data);
    } catch (err: any) {
      setLookupError(err.message || "Recipient account not found or inactive.");
    } finally {
      setIsLookingUp(false);
    }
  };

  // Open confirmation modal
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    if (!selectedSourceAccount) {
      setTransferError("Please select a source account.");
      return;
    }

    if (amountCents <= 0) {
      setTransferError("Transfer amount must be strictly greater than $0.00.");
      return;
    }

    if (amountCents > selectedSourceAccount.availableBalanceCents) {
      setTransferError(
        `Insufficient funds. Available: ${formatCents(
          selectedSourceAccount.availableBalanceCents,
          selectedSourceAccount.currency
        )}`
      );
      return;
    }

    if (!destinationAccountNumber.trim()) {
      setTransferError("Please specify a valid destination account number.");
      return;
    }

    if (destinationAccountNumber.trim() === selectedSourceAccount.accountNumber) {
      setTransferError("Cannot transfer funds to the same source account.");
      return;
    }

    setConfirmOpen(true);
  };

  // Execute Transfer
  const handleExecuteTransfer = async () => {
    setIsSubmitting(true);
    setTransferError(null);

    try {
      const idempotencyKey = uuidv4();
      const res = await api.post("/transfers", {
        idempotencyKey,
        sourceAccountId,
        destinationAccountNumber: destinationAccountNumber.trim(),
        amountCents,
        currency: selectedSourceAccount?.currency || "USD",
        description: description || "Funds Transfer",
        reauthPassword: isHighRisk ? reauthPassword : undefined,
      });

      const transfer = res.data.data.transfer;

      // Invalidate queries to update balances
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["account-transactions"] });

      setConfirmOpen(false);
      setReceipt({
        transferId: transfer.transferId,
        receiptNumber: transfer.receiptNumber,
        amountCents: transfer.amountCents,
        currency: transfer.currency,
        sourceAccountNumber: selectedSourceAccount?.accountNumber || "",
        destinationAccountNumber: destinationAccountNumber.trim(),
        recipientName: recipientData?.recipientName,
        description: transfer.description,
        createdAt: transfer.createdAt,
      });
      setReceiptModalOpen(true);

      // Reset form
      setAmountStr("50.00");
      setDescription("");
      setReauthPassword("");
      setRecipientData(null);
      setDestinationAccountNumber("");
    } catch (err: any) {
      setTransferError(err.message || "Failed to execute transfer.");
      setConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Transfer Money
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Execute atomic internal bank transfers governed by double-entry ledger invariants
        </p>
      </div>

      <Card className="border-border shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-white">
              <ArrowLeftRight className="h-4 w-4 text-emerald" />
            </div>
            <div>
              <CardTitle className="text-base">Internal Transfer Request</CardTitle>
              <CardDescription className="text-xs">
                Transfers settle immediately with cryptographic idempotency protection
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleOpenConfirm} className="space-y-5">
            {transferError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {/* 1. Source Account */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/80 mb-1.5">
                From Account
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                {accounts.map((acc: any) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.accountType} ({acc.accountNumber}) — Available:{" "}
                    {formatCents(acc.availableBalanceCents, acc.currency)}
                  </option>
                ))}
              </select>
              {selectedSourceAccount && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Available funds to transfer:{" "}
                  <strong className="text-foreground">
                    {formatCents(
                      selectedSourceAccount.availableBalanceCents,
                      selectedSourceAccount.currency
                    )}
                  </strong>
                </p>
              )}
            </div>

            {/* 2. Destination Account Number & Live Recipient Verification */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/80">
                To Account (Destination Account #)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. VB1234567890"
                  value={destinationAccountNumber}
                  onChange={(e) => {
                    setDestinationAccountNumber(e.target.value);
                    setRecipientData(null);
                    setLookupError(null);
                  }}
                  className="flex h-10 flex-1 rounded-lg border border-input bg-background/50 px-3 py-2 text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLookupRecipient}
                  isLoading={isLookingUp}
                >
                  Verify
                </Button>
              </div>

              {lookupError && (
                <p className="text-xs font-medium text-destructive">{lookupError}</p>
              )}

              {recipientData && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  <span>
                    Verified Recipient: <strong className="text-foreground">{recipientData.recipientName}</strong>{" "}
                    ({recipientData.accountType} Account)
                  </span>
                </div>
              )}
            </div>

            {/* 3. Transfer Amount */}
            <div>
              <Input
                label="Transfer Amount (USD)"
                type="number"
                step="0.01"
                min="0.01"
                max="100000"
                placeholder="50.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />

              {isHighRisk && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400 mt-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>
                    High-value transfer (≥ $5,000.00). In accordance with banking regulations, you will be required to re-authenticate.
                  </span>
                </div>
              )}
            </div>

            {/* 4. Description / Note */}
            <Input
              label="Transfer Memo / Description"
              type="text"
              placeholder="e.g. Consulting services or invoice settlement"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* 5. Reauthentication for High Risk */}
            {isHighRisk && (
              <Input
                label="Re-Authentication Password"
                type="password"
                placeholder="Enter your current password to authorize high-value transfer"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                required
              />
            )}

            <Button type="submit" variant="emerald" className="w-full gap-2">
              Review Transfer & Confirm
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Funds Transfer"
        description="Please carefully verify the transfer details. Once submitted, this transaction will be immutably committed to the general ledger."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border divide-y divide-border bg-muted/30 text-xs">
            <div className="flex justify-between p-3">
              <span className="text-muted-foreground">From Account</span>
              <span className="font-mono font-medium text-foreground">
                {selectedSourceAccount?.accountNumber} ({selectedSourceAccount?.accountType})
              </span>
            </div>

            <div className="flex justify-between p-3">
              <span className="text-muted-foreground">To Account</span>
              <span className="font-mono font-medium text-foreground">
                {destinationAccountNumber}
              </span>
            </div>

            {recipientData?.recipientName && (
              <div className="flex justify-between p-3">
                <span className="text-muted-foreground">Recipient Name</span>
                <span className="font-semibold text-foreground">
                  {recipientData.recipientName}
                </span>
              </div>
            )}

            <div className="flex justify-between p-3">
              <span className="text-muted-foreground">Transfer Amount</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                ${parsedAmount.toFixed(2)} USD
              </span>
            </div>

            <div className="flex justify-between p-3">
              <span className="text-muted-foreground">Memo</span>
              <span className="text-foreground">{description || "Funds Transfer"}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-primary" />
            <span>Guaranteed idempotent execution via SHA-256 payload fingerprinting</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="emerald"
              size="sm"
              onClick={handleExecuteTransfer}
              isLoading={isSubmitting}
            >
              Authorize & Transfer Now
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Official Receipt Modal */}
      <TransferReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={receipt}
      />
    </div>
  );
}
