import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  Building2,
  Users,
  History,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Layers,
} from "lucide-react";

export function AdminDashboardPage() {
  const { data: usersData } = useQuery({
    queryKey: ["admin-users", { limit: 1 }],
    queryFn: async () => {
      const res = await api.get("/admin/users?limit=1");
      return res.data.data;
    },
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["admin-transactions", { limit: 1 }],
    queryFn: async () => {
      const res = await api.get("/admin/transactions?limit=1");
      return res.data.data;
    },
  });

  const { data: adjustmentsData } = useQuery({
    queryKey: ["admin-adjustments"],
    queryFn: async () => {
      const res = await api.get("/admin/adjustments");
      return res.data.data.adjustments;
    },
  });

  const { data: auditData } = useQuery({
    queryKey: ["admin-audit", { limit: 1 }],
    queryFn: async () => {
      const res = await api.get("/admin/audit-events?limit=1");
      return res.data.data;
    },
  });

  const totalUsers = usersData?.pagination?.total || 0;
  const totalTransfers = transactionsData?.pagination?.total || 0;
  const pendingAdjustments =
    adjustmentsData?.filter((a: any) => a.status === "PENDING_APPROVAL").length || 0;
  const totalAuditEvents = auditData?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="navy">Back-Office Operating System</Badge>
          <span className="text-xs text-muted-foreground font-mono">v1.0.0-PROD</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl mt-1">
          Administrative & Compliance Console
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Real-time oversight of double-entry ledger operations, audit streams, and dual-control approvals
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
              <span>Customer Base</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground">{totalUsers}</p>
            <p className="text-[11px] text-muted-foreground">Registered bank accounts</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
              <span>Ledger Transfers</span>
              <History className="h-4 w-4 text-emerald" />
            </div>
            <p className="text-3xl font-black text-foreground">{totalTransfers}</p>
            <p className="text-[11px] text-muted-foreground">Committed double-entry entries</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
              <span>Maker-Checker Queue</span>
              <FileCheck2 className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {pendingAdjustments}
            </p>
            <p className="text-[11px] text-muted-foreground">Awaiting secondary checker review</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
              <span>Audit Log Events</span>
              <ShieldAlert className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground">{totalAuditEvents}</p>
            <p className="text-[11px] text-muted-foreground">Immutable operational records</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald" />
                <CardTitle className="text-base">Customer Directory & Access Control</CardTitle>
              </div>
              <Link to="/admin/users">
                <Button variant="outline" size="sm" className="gap-1">
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-xs">
              Look up customers, inspect bank accounts, and manage account statuses (Lock / Unlock / Suspend)
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Maker-Checker Adjustment Approval Queue</CardTitle>
              </div>
              <Link to="/admin/adjustments">
                <Button variant="outline" size="sm" className="gap-1">
                  Queue ({pendingAdjustments}) <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-xs">
              Enforce dual-authorization governance. Makers submit balance adjustments; Checkers approve or reject.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Platform Transaction Monitor</CardTitle>
              </div>
              <Link to="/admin/transactions">
                <Button variant="outline" size="sm" className="gap-1">
                  Monitor <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-xs">
              Live surveillance of internal transfers with automated risk scores and receipt validation
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Immutable Audit Event Stream</CardTitle>
              </div>
              <Link to="/admin/audit">
                <Button variant="outline" size="sm" className="gap-1">
                  Inspect <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-xs">
              Complete chronological audit trail recording authentication, adjustments, and administrative events
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
