import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  History,
  PieChart,
  ShieldAlert,
  Users,
  FileCheck2,
  LockKeyhole,
  Info,
  Building2,
} from "lucide-react";
import { cn } from "../../lib/utils";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { isStaff, user } = useAuth();

  const navItems = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Accounts", to: "/accounts", icon: Wallet },
    { label: "Transfer Funds", to: "/transfer", icon: ArrowLeftRight },
    { label: "Transactions", to: "/transactions", icon: History },
    { label: "Spending Analytics", to: "/analytics", icon: PieChart },
    { label: "Security & Settings", to: "/settings", icon: LockKeyhole },
  ];

  const adminItems = [
    { label: "Admin Console", to: "/admin", icon: Building2 },
    { label: "User Directory", to: "/admin/users", icon: Users },
    { label: "Transaction Monitor", to: "/admin/transactions", icon: History },
    { label: "Maker-Checker Queue", to: "/admin/adjustments", icon: FileCheck2 },
    { label: "Audit Event Trail", to: "/admin/audit", icon: ShieldAlert },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card/60 backdrop-blur-md p-4">
      {/* Navigation Links */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        <div>
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">
            Banking Core
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-navy-900 text-white dark:bg-primary dark:text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Staff & Admin Section */}
        {isStaff && (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Back-Office Management
              </p>
              <span className="text-[10px] font-bold uppercase rounded bg-primary/10 text-primary px-1.5 py-0.2">
                {user?.role}
              </span>
            </div>
            <nav className="space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-navy-800 text-white dark:bg-secondary dark:text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Simulated Funds Disclaimer Box */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Educational Simulator</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                VaultBank operates on simulated funds with double-entry ledger atomicity. Real money is never handled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
