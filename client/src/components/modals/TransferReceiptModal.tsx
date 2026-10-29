import React from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { CheckCircle2, Printer, Shield, Copy } from "lucide-react";
import { formatCents, formatDate } from "../../lib/utils";

export interface ReceiptData {
  transferId: string;
  receiptNumber: string;
  amountCents: number;
  currency: string;
  sourceAccountNumber: string;
  destinationAccountNumber: string;
  recipientName?: string;
  description: string;
  createdAt: string | Date;
}

interface TransferReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export function TransferReceiptModal({ isOpen, onClose, receipt }: TransferReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReceiptNumber = () => {
    navigator.clipboard.writeText(receipt.receiptNumber);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Transfer Confirmation Receipt">
      <div className="space-y-6 pt-2" id="printable-receipt">
        {/* Receipt Header Badge */}
        <div className="flex flex-col items-center justify-center text-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-2 shadow-md">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Funds Successfully Transferred
          </p>
          <h2 className="text-2xl font-extrabold text-foreground mt-1">
            {formatCents(receipt.amountCents, receipt.currency)}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Double-Entry Journal Posted</p>
        </div>

        {/* Receipt Details Table */}
        <div className="rounded-xl border border-border divide-y divide-border bg-card/50 text-xs">
          <div className="flex justify-between p-3">
            <span className="text-muted-foreground">Receipt Number</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
              <span>{receipt.receiptNumber}</span>
              <button
                type="button"
                onClick={handleCopyReceiptNumber}
                className="hover:text-primary transition-colors"
                title="Copy Receipt #"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex justify-between p-3">
            <span className="text-muted-foreground">Transfer ID</span>
            <span className="font-mono text-muted-foreground truncate max-w-[200px]">
              {receipt.transferId}
            </span>
          </div>

          <div className="flex justify-between p-3">
            <span className="text-muted-foreground">Date & Time</span>
            <span className="font-medium text-foreground">{formatDate(receipt.createdAt)}</span>
          </div>

          <div className="flex justify-between p-3">
            <span className="text-muted-foreground">Source Account</span>
            <span className="font-mono font-medium text-foreground">
              {receipt.sourceAccountNumber}
            </span>
          </div>

          <div className="flex justify-between p-3">
            <span className="text-muted-foreground">Recipient Account</span>
            <span className="font-mono font-medium text-foreground">
              {receipt.destinationAccountNumber}
            </span>
          </div>

          {receipt.recipientName && (
            <div className="flex justify-between p-3">
              <span className="text-muted-foreground">Recipient Name</span>
              <span className="font-medium text-foreground">{receipt.recipientName}</span>
            </div>
          )}

          <div className="flex justify-between p-3">
            <span className="text-muted-foreground">Description / Memo</span>
            <span className="font-medium text-foreground">{receipt.description || "N/A"}</span>
          </div>

          <div className="flex justify-between p-3">
            <span className="text-muted-foreground">Ledger Status</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">POSTED & COMMITTED</span>
          </div>
        </div>

        {/* Security watermark */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-emerald" />
          <span>Cryptographically validated via VaultBank Multi-Document Session</span>
        </div>

        {/* Modal Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

