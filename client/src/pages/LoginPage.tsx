import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Shield, AlertCircle, KeyRound, Sparkles } from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
        mfaCode: requiresMfa ? mfaCode : undefined,
      });

      if (res.data.data.requiresMfa) {
        setRequiresMfa(true);
        setIsLoading(false);
        return;
      }

      login(res.data.data.user);
      if (["ADMIN", "COMPLIANCE", "SUPPORT"].includes(res.data.data.user.role)) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setRequiresMfa(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Demo Fast-Login Pills */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span>One-Click Demo Accounts (Seed Credentials)</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleDemoFill("customer1@vaultbank.test", "CustomerPass123!")}
              className="rounded border border-border bg-card p-1.5 text-left hover:border-emerald/50 transition-colors"
            >
              <span className="font-bold block text-foreground">Sarah Connor</span>
              <span className="text-muted-foreground">Customer ($57.5k)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("customer2@vaultbank.test", "CustomerPass123!")}
              className="rounded border border-border bg-card p-1.5 text-left hover:border-emerald/50 transition-colors"
            >
              <span className="font-bold block text-foreground">John Doe</span>
              <span className="text-muted-foreground">Customer ($23.2k)</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("admin@vaultbank.test", "VaultAdmin123!")}
              className="rounded border border-border bg-card p-1.5 text-left hover:border-primary/50 transition-colors"
            >
              <span className="font-bold block text-primary">Alex Hamilton</span>
              <span className="text-muted-foreground">System Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("compliance@vaultbank.test", "VaultCompliance123!")}
              className="rounded border border-border bg-card p-1.5 text-left hover:border-primary/50 transition-colors"
            >
              <span className="font-bold block text-primary">Elena Rostova</span>
              <span className="text-muted-foreground">Compliance Officer</span>
            </button>
          </div>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white mb-2 shadow">
              <Shield className="h-5 w-5 text-emerald" />
            </div>
            <CardTitle className="text-xl">Sign In to VaultBank</CardTitle>
            <CardDescription className="text-xs">
              Secure cookie-authenticated session with progressive throttling
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!requiresMfa ? (
                <>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="sarah@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                        Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-xs">
                    <KeyRound className="h-4 w-4 text-emerald" />
                    <span>Enter the 6-digit code from your authenticator app or backup code.</span>
                  </div>
                  <Input
                    label="Two-Factor Verification Code"
                    type="text"
                    maxLength={8}
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.trim())}
                    required
                    autoFocus
                  />
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                {requiresMfa ? "Verify & Enter Vault" : "Sign In"}
              </Button>

              <div className="text-center text-xs text-muted-foreground pt-2">
                Don't have an account yet?{" "}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  Open an Account
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
