import React from "react";
import { Shield, Lock, FileCheck, Layers, RefreshCw, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";

export function SecurityInfoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Shield className="h-4 w-4" />
          Fintech Security Architecture
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          VaultBank Security & Ledger Specification
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          How VaultBank prevents race conditions, double spending, unauthorized adjustments, and session fixation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-bold">
              <Layers className="h-5 w-5 text-emerald" />
              <CardTitle className="text-base">Double-Entry Financial Accounting</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              Traditional naive applications deduct from account A and add to account B with two detached updates.
              If an error occurs between updates, funds vanish or are created from thin air.
            </p>
            <p>
              VaultBank models every financial event as an immutable <strong className="text-foreground">Journal Entry</strong> with balanced debit and credit legs.
              The fundamental balance invariant <span className="font-mono text-foreground font-semibold">∑ Debits ≡ ∑ Credits</span> is validated at the application and schema layers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-bold">
              <RefreshCw className="h-5 w-5 text-emerald" />
              <CardTitle className="text-base">Multi-Document ACID Transactions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              Transfers occur in MongoDB sessions utilizing replica sets. The sender's balance is verified and updated using an atomic conditional query:
              <span className="block font-mono bg-muted p-1.5 rounded my-1 text-foreground">
                {"{ _id: senderId, availableBalanceCents: { $gte: amount } }"}
              </span>
              This mathematically guarantees that simultaneous concurrent requests cannot overdraft the account.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-bold">
              <Lock className="h-5 w-5 text-emerald" />
              <CardTitle className="text-base">Argon2id & Opaque Sessions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              Passwords are protected using the memory-hard <strong className="text-foreground">Argon2id</strong> algorithm, resistant to GPU/ASIC cracking.
            </p>
            <p>
              Authentication relies on opaque high-entropy session tokens stored in <span className="font-mono text-foreground">HttpOnly, SameSite=Lax</span> cookies, immune to JavaScript XSS theft.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-bold">
              <FileCheck className="h-5 w-5 text-emerald" />
              <CardTitle className="text-base">Maker-Checker Administrative Controls</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              No single operator can unilaterally change an account balance. Administrative adjustments require dual authorization:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-foreground">Maker</strong> initiates an adjustment with reason code and audit notes.</li>
              <li><strong className="text-foreground">Checker</strong> must review and approve. The system strictly prohibits the Maker from approving their own request.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
