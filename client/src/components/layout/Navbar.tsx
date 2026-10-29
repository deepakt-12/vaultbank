import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  Shield,
  User as UserIcon,
  Menu,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export function Navbar({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const { user, logout, isStaff } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Notifications query
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const unreadCount = notificationsData?.unreadCount || 0;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Mobile Menu */}
        <div className="flex items-center gap-4">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white shadow-md">
              <Shield className="h-5 w-5 text-emerald" />
            </div>
            <span className="text-foreground">
              Vault<span className="text-emerald font-extrabold">Bank</span>
            </span>
          </Link>

          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Double-Entry Core Active
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 rounded-lg border border-border p-1.5 pr-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-white text-xs font-semibold">
                  {user.fullName.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-foreground leading-none">{user.fullName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{user.role}</p>
                </div>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-1 shadow-xl animate-in zoom-in-95 z-50"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-foreground">{user.fullName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="mt-1">
                      <Badge variant={user.role === "ADMIN" ? "destructive" : "default"}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-1">
                    <Link
                      to="/settings"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
                    >
                      <UserIcon className="h-3.5 w-3.5" />
                      Security & Settings
                    </Link>

                    {isStaff && (
                      <Link
                        to="/admin"
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-primary font-medium hover:bg-muted"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Admin Console
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Open Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

