import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { formatCents, formatDate } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Dialog } from "../../components/ui/Dialog";
import { Skeleton } from "../../components/ui/Skeleton";
import {
  FileCheck2,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Info,
} from "lucide-react";

export function AdminAdjustmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Maker request form state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amountStr, setAmountStr] = useState("100.00");
  const [reasonCode, setReasonCode] = useState("FEE_REBATE");
  const [notes, setNotes] = useState("");
  const [makerError, setMakerError] = useState<string | null>(null);

  // Checker review dialog state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<any | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reviewNotes, setReviewNotes] = useState("");
  const [checkerError, setCheckerError] = useState<string | null>(null);

  // 1. Fetch adjustment requests queue
  const { data: adjustmentsData, isLoading } = useQuery({
    queryKey: ["admin-adjustments"],
    queryFn: async () => {
      const res = await api.get("/admin/adjustments");
      return res.data.data.adjustments;
    },
  });

  // 2. Fetch bank accounts for maker selection
  const { data: accountsData } = useQuery({
    queryKey: ["admin-accounts-list"],
    queryFn: async () => {
      const res = await api.get("/admin/users?limit=50");
      return res.data.data.users;
    },
  });

  const adjustments = adjustmentsData || [];

  // Maker Mutation: Request adjustment
  const requestMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/admin/adjustments", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-adjustments"] });
      setRequestModalOpen(false);
      setNotes("");
    },
    onError: (err: any) => {
      setMakerError(err.message || "Failed to submit adjustment request.");
    },
  });

  // Checker Mutation: Review adjustment
  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/admin/adjustments/${id}/review`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setReviewModalOpen(false);
      setReviewNotes("");
      setSelectedAdjustment(null);
    },
    onError: (err: any) => {
      setCheckerError(err.message || "Failed to process adjustment review.");
    },
  });

  const handleMakerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMakerError(null);
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setMakerError("Please enter a valid positive dollar amount.");
      return;
    }
    requestMutation.mutate({
      accountId,
      direction,
      amountCents: Math.round(amount * 100),
      reasonCode,
      notes,
    });
  };

  const handleOpenReview = (adj: any, dec: "APPROVE" | "REJECT") => {
    setSelectedAdjustment(adj);
    setDecision(dec);
    setReviewNotes(dec === "APPROVE" ? "Verified and approved" : "Rejected due to policy");
    setCheckerError(null);
    setReviewModalOpen(true);
  };

  const handleCheckerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustment) return;
    reviewMutation.mutate({
      id: selectedAdjustment._id,
      payload: {
        decision,
        reviewNotes,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Maker-Checker Adjustment Queue
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict dual-authorization workflow for administrative ledger balance adjustments
          </p>
        </div>

        <Button
          variant="emerald"
          size="sm"
          onClick={() => {
            setMakerError(null);
            setRequestModalOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Request Adjustment (Maker)
        </Button>
      </div>

      {/* Policy Notice Box */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground block">Maker-Checker Dual Control Policy</strong>
          <span>
            Financial integrity requires separation of duties. The user who initiates (Maker) an adjustment
            request cannot approve (Checker) it. A second authorized administrator or compliance officer
            must review and authorize the journal posting.
          </span>
        </div>
      </div>

      {/* Adjustments Table */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : adjustments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <FileCheck2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No adjustment requests in queue</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Target Account</th>
                    <th className="pb-3">Direction</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Reason Code</th>
                    <th className="pb-3">Maker (Initiator)</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Checker Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {adjustments.map((adj: any) => {
                    const isMaker = adj.requestedBy?._id === user?._id;
                    const isPending = adj.status === "PENDING_APPROVAL";

                    return (
                      <tr key={adj._id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(adj.createdAt)}
                        </td>
                        <td className="py-3 font-mono font-medium text-foreground">
                          {adj.accountId?.accountNumber || adj.accountId}
                        </td>
                        <td className="py-3">
                          <Badge variant={adj.direction === "CREDIT" ? "success" : "default"}>
                            {adj.direction}
                          </Badge>
                        </td>
                        <td className="py-3 font-bold text-foreground">
                          {formatCents(adj.amountCents, adj.accountId?.currency || "USD")}
                        </td>
                        <td className="py-3 font-medium text-foreground">{adj.reasonCode}</td>
                        <td className="py-3">
                          <span className="font-semibold text-foreground block">
                            {adj.requestedBy?.fullName || "Staff"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {adj.requestedBy?.email}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              adj.status === "APPROVED"
                                ? "success"
                                : adj.status === "REJECTED"
                                ? "destructive"
                                : "warning"
                            }
                          >
                            {adj.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          {isPending ? (
                            isMaker ? (
                              <span
                                className="text-[10px] text-muted-foreground italic"
                                title="Maker cannot approve their own adjustment"
                              >
                                Cannot Self-Approve
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="emerald"
                                  size="sm"
                                  onClick={() => handleOpenReview(adj, "APPROVE")}
                                  className="h-7 text-xs px-2"
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleOpenReview(adj, "REJECT")}
                                  className="h-7 text-xs px-2"
                                >
                                  Reject
                                </Button>
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              Reviewed by {adj.reviewedBy?.fullName?.split(" ")[0] || "Checker"}
                            </span>
                          )}
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

      {/* Maker Form Modal: Request Adjustment */}
      <Dialog
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Initiate Balance Adjustment (Maker)"
        description="Submit an adjustment proposal for checker verification. No balance changes occur until authorized by a secondary reviewer."
      >
        <form onSubmit={handleMakerSubmit} className="space-y-4">
          {makerError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{makerError}</span>
            </div>
          )}

          <Input
            label="Target Account ID (MongoDB ObjectId)"
            type="text"
            placeholder="Paste BankAccount _id"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value.trim())}
            required
            helperText="Inspect customer bank accounts to copy the target account ID."
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/80 mb-1.5">
              Adjustment Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection("CREDIT")}
                className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                  direction === "CREDIT"
                    ? "border-emerald bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                CREDIT (Deposit to Customer)
              </button>
              <button
                type="button"
                onClick={() => setDirection("DEBIT")}
                className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                  direction === "DEBIT"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                DEBIT (Deduct from Customer)
              </button>
            </div>
          </div>

          <Input
            label="Amount (USD)"
            type="number"
            step="0.01"
            min="0.01"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/80 mb-1.5">
              Reason Code
            </label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="FEE_REBATE">FEE_REBATE (Customer Service Fee Reimbursement)</option>
              <option value="ERROR_CORRECTION">ERROR_CORRECTION (System Correction)</option>
              <option value="GOODWILL_CREDIT">GOODWILL_CREDIT (Account Opening Incentive)</option>
              <option value="DISPUTE_SETTLEMENT">DISPUTE_SETTLEMENT (Disputed Charge Resolution)</option>
            </select>
          </div>

          <Input
            label="Comprehensive Operational Notes"
            type="text"
            placeholder="Detailed rationale for audit trail (min 10 characters)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRequestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={requestMutation.isPending}
            >
              Submit for Checker Approval
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Checker Form Modal: Review Adjustment */}
      <Dialog
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`${decision === "APPROVE" ? "Authorize & Commit" : "Reject"} Adjustment`}
        description="As a secondary checker, your authorization will immediately commit the balanced double-entry journal entry."
      >
        <form onSubmit={handleCheckerSubmit} className="space-y-4">
          {checkerError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{checkerError}</span>
            </div>
          )}

          <div className="rounded-xl border border-border p-3.5 bg-muted/40 text-xs space-y-1">
            <p>
              Target Account:{" "}
              <strong className="font-mono text-foreground">
                {selectedAdjustment?.accountId?.accountNumber}
              </strong>
            </p>
            <p>
              Amount:{" "}
              <strong className="text-foreground">
                {formatCents(selectedAdjustment?.amountCents || 0)} ({selectedAdjustment?.direction})
              </strong>
            </p>
            <p>
              Reason: <strong className="text-foreground">{selectedAdjustment?.reasonCode}</strong>
            </p>
            <p className="text-muted-foreground mt-1">Maker: {selectedAdjustment?.requestedBy?.fullName}</p>
          </div>

          <Input
            label="Checker Review Notes"
            type="text"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            required
            helperText="Recorded permanently in the immutable audit log."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={decision === "APPROVE" ? "emerald" : "destructive"}
              size="sm"
              isLoading={reviewMutation.isPending}
            >
              Confirm {decision}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
