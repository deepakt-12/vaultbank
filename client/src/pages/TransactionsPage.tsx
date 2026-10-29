import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatCents, formatDate } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { TransferReceiptModal, ReceiptData } from "../components/modals/TransferReceiptModal";
import {
  History,
  Search,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CheckCircle2,
} from "lucide-react";

export function TransactionsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["transfers", page],
    queryFn: async () => {
      const res = await api.get(`/transfers?page=${page}&limit=15`);
      return res.data.data;
    },
  });

  const transfers = data?.transfers || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  const filteredTransfers = transfers.filter((tx: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.receiptNumber.toLowerCase().includes(term) ||
      (tx.description && tx.description.toLowerCase().includes(term)) ||
      (tx.destinationAccountId?.accountNumber &&
        tx.destinationAccountId.accountNumber.toLowerCase().includes(term))
    );
  });

  const handleOpenReceipt = (tx: any) => {
    setSelectedReceipt({
      transferId: tx.transferId,
      receiptNumber: tx.receiptNumber,
      amountCents: tx.amountCents,
      currency: tx.currency,
      sourceAccountNumber: tx.sourceAccountId?.accountNumber || "N/A",
      destinationAccountNumber: tx.destinationAccountId?.accountNumber || "N/A",
      description: tx.description,
      createdAt: tx.createdAt,
    });
    setReceiptOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Transaction History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log of all posted transfers associated with your customer ID
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search by receipt # or memo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions Table Card */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <History className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No transaction records found</p>
              <p className="text-xs">Transfers initiated or received will appear here with printable receipts.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Receipt Number</th>
                      <th className="pb-3">Counterparty Account</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Amount</th>
                      <th className="pb-3 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTransfers.map((tx: any) => {
                      const isSender = tx.sourceUserId === user?._id;
                      const counterpartyAccount = isSender
                        ? tx.destinationAccountId?.accountNumber
                        : tx.sourceAccountId?.accountNumber;

                      return (
                        <tr key={tx._id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 text-muted-foreground whitespace-nowrap">
                            {formatDate(tx.createdAt)}
                          </td>
                          <td className="py-3 font-mono text-[11px] text-muted-foreground">
                            {tx.receiptNumber}
                          </td>
                          <td className="py-3 font-mono text-foreground font-medium">
                            {counterpartyAccount || "External Account"}
                          </td>
                          <td className="py-3 font-medium text-foreground">
                            {tx.description || "Internal Funds Transfer"}
                          </td>
                          <td className="py-3">
                            <Badge variant={tx.status === "POSTED" ? "success" : "default"}>
                              {tx.status}
                            </Badge>
                          </td>
                          <td
                            className={`py-3 text-right font-bold whitespace-nowrap ${
                              isSender
                                ? "text-foreground"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isSender ? "-" : "+"}
                            {formatCents(tx.amountCents, tx.currency)}
                          </td>
                          <td className="py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReceipt(tx)}
                              className="h-7 px-2 text-xs gap-1"
                            >
                              <Receipt className="h-3.5 w-3.5 text-primary" />
                              View
                            </Button>
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

      {/* Receipt Modal */}
      <TransferReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={selectedReceipt}
      />
    </div>
  );
}

