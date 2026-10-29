import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { KeyRound, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultToken, setResultToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      if (res.data.data.resetToken) {
        setResultToken(res.data.data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white mb-2 shadow">
              <KeyRound className="h-5 w-5 text-emerald" />
            </div>
            <CardTitle className="text-xl">Reset Your Password</CardTitle>
            <CardDescription className="text-xs">
              We'll issue a single-use token to securely reset your credentials
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitted ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground">Password Reset Dispatched</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If an account exists for {email}, a secure password reset token has been generated.
                </p>

                {resultToken && (
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-left space-y-1 text-xs">
                    <p className="font-semibold text-foreground">Demo Reset Token:</p>
                    <p className="font-mono text-[11px] text-muted-foreground break-all">{resultToken}</p>
                    <div className="pt-2">
                      <Link to={`/reset-password?token=${resultToken}`}>
                        <Button variant="emerald" size="sm" className="w-full gap-2">
                          Proceed to Reset Password
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Link to="/login" className="text-xs font-semibold text-primary hover:underline">
                    Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="sarah@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Send Reset Token
                </Button>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  <Link to="/login" className="font-semibold text-primary hover:underline">
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

