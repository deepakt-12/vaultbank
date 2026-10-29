import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Dialog } from "../../components/ui/Dialog";
import { Skeleton } from "../../components/ui/Skeleton";
import { Users, Search, Lock, Unlock, Shield, AlertCircle, CheckCircle2 } from "lucide-react";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Status Change Dialog
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [statusToSet, setStatusToSet] = useState<"ACTIVE" | "LOCKED" | "SUSPENDED">("LOCKED");
  const [reason, setReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, searchTerm],
    queryFn: async () => {
      const res = await api.get(`/admin/users?page=${page}&limit=15&search=${encodeURIComponent(searchTerm)}`);
      return res.data.data;
    },
  });

  const users = data?.users || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status, reason }: { userId: string; status: string; reason: string }) => {
      const res = await api.patch(`/admin/users/${userId}/status`, { status, reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDialogOpen(false);
      setReason("");
      setSelectedUser(null);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to update user status.");
    },
  });

  const handleOpenStatusDialog = (user: any, newStatus: "ACTIVE" | "LOCKED" | "SUSPENDED") => {
    setSelectedUser(user);
    setStatusToSet(newStatus);
    setReason("");
    setActionError(null);
    setDialogOpen(true);
  };

  const handleConfirmStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    updateStatusMutation.mutate({
      userId: selectedUser._id,
      status: statusToSet,
      reason,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Customer Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit user profiles, roles, authentication states, and account lockouts
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by full name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No users matched search query</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-3">Customer Name</th>
                      <th className="pb-3">Email Address</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">MFA</th>
                      <th className="pb-3">Registered</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u: any) => (
                      <tr key={u._id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 font-bold text-foreground">{u.fullName}</td>
                        <td className="py-3 font-mono text-[11px] text-muted-foreground">{u.email}</td>
                        <td className="py-3">
                          <Badge variant={u.role === "ADMIN" ? "destructive" : "default"}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              u.status === "ACTIVE"
                                ? "success"
                                : u.status === "LOCKED"
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span className={u.mfaEnabled ? "text-emerald font-bold" : "text-muted-foreground"}>
                            {u.mfaEnabled ? "Active" : "Off"}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="py-3 text-right">
                          {u.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenStatusDialog(u, "LOCKED")}
                              className="text-amber-600 hover:text-amber-500 h-7 text-xs px-2 gap-1"
                            >
                              <Lock className="h-3 w-3" />
                              Lock
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenStatusDialog(u, "ACTIVE")}
                              className="text-emerald-600 hover:text-emerald-500 h-7 text-xs px-2 gap-1"
                            >
                              <Unlock className="h-3 w-3" />
                              Unlock
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
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

      {/* Status Modification Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={`Change User Status: ${statusToSet}`}
        description={`Modifying access for ${selectedUser?.fullName} (${selectedUser?.email})`}
      >
        <form onSubmit={handleConfirmStatus} className="space-y-4">
          {actionError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <Input
            label="Mandatory Audit Reason"
            type="text"
            placeholder="e.g. Suspicious transfer velocity or customer request"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            helperText="This reason will be immutably recorded in the security audit trail."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={statusToSet === "ACTIVE" ? "emerald" : "destructive"}
              size="sm"
              isLoading={updateStatusMutation.isPending}
            >
              Confirm Status Change
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

