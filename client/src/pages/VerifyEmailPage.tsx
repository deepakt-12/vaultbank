import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from "lucide-react";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (tokenToUse: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/auth/verify-email", { token: tokenToUse });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to verify email. The token may be expired or already used.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      handleVerify(urlToken);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white mb-2 shadow">
              <ShieldCheck className="h-5 w-5 text-emerald" />
            </div>
            <CardTitle className="text-xl">Verify Email Address</CardTitle>
            <CardDescription className="text-xs">
              Confirm your email address using the single-use cryptographic token
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground">Email Verified Successfully</h3>
                <p className="text-xs text-muted-foreground">
                  Your VaultBank email is now confirmed. You can now sign in to your dashboard.
                </p>

                <div className="pt-2">
                  <Link to="/login">
                    <Button variant="primary" className="w-full gap-2">
                      Sign In to Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify(token);
                }}
                className="space-y-4"
              >
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="Verification Token"
                  type="text"
                  placeholder="Paste 64-character verification token"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  required
                />

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Verify My Email
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

