import React from "react";
import { Link, Outlet } from "react-router-dom";
import { Shield, Sun, Moon, CheckCircle2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../ui/Button";

export function PublicLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Public Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white shadow-md">
              <Shield className="h-5 w-5 text-emerald" />
            </div>
            <span>
              Vault<span className="text-emerald font-extrabold">Bank</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Platform Features
            </Link>
            <Link to="/security-info" className="hover:text-foreground transition-colors">
              Security & Ledger Model
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-border bg-card/40 py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-medium text-foreground">
            <Shield className="h-4 w-4 text-emerald" />
            VaultBank Architectural Digital Banking Demonstration
          </div>
          <p>
            Equipped with MongoDB Multi-Document ACID Transactions, Double-Entry General Ledger, Argon2id Password Hashing, and Idempotency Protection.
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Simulated portfolio application. Real currency is not accepted or transferred.
          </p>
        </div>
      </footer>
    </div>
  );
}
