import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { Bell, CheckCheck, ShieldAlert, ArrowLeftRight, Info } from "lucide-react";

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const getIcon = (type: string) => {
    switch (type) {
      case "TRANSACTION":
        return <ArrowLeftRight className="h-4 w-4 text-emerald" />;
      case "SECURITY":
        return <ShieldAlert className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Notifications & Alerts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Security alerts, transfer notifications, and ledger event logs
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markReadMutation.mutate("all")}
            className="gap-1.5"
            isLoading={markReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs">You're all caught up! New account alerts will be delivered here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n: any) => (
                <div
                  key={n._id}
                  className={`flex items-start justify-between gap-4 py-4 transition-colors ${
                    !n.read ? "bg-muted/30 -mx-6 px-6" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border shrink-0 shadow-sm">
                      {getIcon(n.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{n.title}</span>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        <Badge variant={n.type === "SECURITY" ? "warning" : "default"}>
                          {n.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/80">{formatDate(n.createdAt)}</p>
                    </div>
                  </div>

                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markReadMutation.mutate(n._id)}
                      className="text-xs h-7 px-2"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
