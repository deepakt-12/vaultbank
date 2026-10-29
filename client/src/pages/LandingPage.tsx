import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  ArrowRight,
  Lock,
  Zap,
  Layers,
  Database,
  BarChart3,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "../components/ui/Button";

export function LandingPage() {
  const highlights = [
    {
      icon: Layers,
      title: "Double-Entry Accounting Core",
      desc: "Every transaction produces immutable debit and credit legs. Total debits strictly balance total credits.",
    },
    {
      icon: Database,
      title: "MongoDB ACID Transactions",
      desc: "Financial operations execute within multi-document sessions with sufficient-funds atomic validations.",
    },
    {
      icon: Lock,
      title: "Defense-in-Depth Cryptography",
      desc: "Argon2id password hashing, single-use high-entropy tokens, TOTP MFA, and anti-CSRF request headers.",
    },
    {
      icon: Zap,
      title: "Strict Idempotency Protection",
      desc: "Cryptographic SHA-256 request fingerprinting prevents duplicate payments and race conditions.",
    },
    {
      icon: BarChart3,
      title: "Real-Time Ledger Balances",
      desc: "Continuous reconciliation of derived customer balances against immutable ledger postings.",
    },
    {
      icon: Shield,
      title: "Maker-Checker Governance",
      desc: "Administrative ledger adjustments enforce dual-authorization maker-checker separation of duties.",
    },
  ];

  return (
    <div className="space-y-24 py-12 md:py-20">
      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-4 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Enterprise Fintech Architecture Specification
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
          Next-Generation Digital Banking Engineered on{" "}
          <span className="text-emerald font-extrabold">Cryptographic Integrity</span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          VaultBank demonstrates production-grade full-stack banking engineering: a balanced double-entry
          general ledger, multi-document ACID transactions, Argon2id security, and complete auditability.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link to="/register">
            <Button variant="emerald" size="lg" className="gap-2">
              Open Demo Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Explore Demo Logins
            </Button>
          </Link>
        </div>

        {/* Live Architecture Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 text-left">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Ledger Invariant</p>
            <p className="text-lg font-bold text-foreground mt-1">Debits = Credits</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Strict Equilibrium</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Currency Precision</p>
            <p className="text-lg font-bold text-foreground mt-1">Integer Minor Units</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Zero Float Rounding</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Password Hash</p>
            <p className="text-lg font-bold text-foreground mt-1">Argon2id</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">OWASP Standard</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Idempotency</p>
            <p className="text-lg font-bold text-foreground mt-1">SHA-256 Fingerprint</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Anti-Double Spend</p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Architectural Guarantees
          </h2>
          <p className="text-sm text-muted-foreground">
            Built from the ground up to prevent race conditions, overdrafts, and unauthorized tampering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-emerald/40 transition-colors space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-navy-900 text-white flex items-center justify-center shadow-sm">
                <h.icon className="h-5 w-5 text-emerald" />
              </div>
              <h3 className="text-base font-bold text-foreground">{h.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

