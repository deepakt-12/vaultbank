import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Shield, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+1415555");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ token: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/register", {
        fullName,
        email,
        phoneNumber,
        password,
      });

      setSuccessData({ token: res.data.data.verificationToken });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your inputs.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white mb-2 shadow">
              <Shield className="h-5 w-5 text-emerald" />
            </div>
            <CardTitle className="text-xl">Open a VaultBank Account</CardTitle>
            <CardDescription className="text-xs">
              Instant checking & high-yield savings accounts with double-entry security
            </CardDescription>
          </CardHeader>

          <CardContent>
            {successData ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-foreground">Account Created Successfully!</h3>
                <p className="text-xs text-muted-foreground">
                  Your primary checking and high-yield savings accounts have been provisioned in the ledger.
                </p>

                <div className="rounded-xl border border-border bg-muted/40 p-3 text-left space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Email Verification Token:</p>
                  <p className="font-mono text-[11px] text-muted-foreground break-all">
                    {successData.token}
                  </p>
                </div>

                <div className="pt-2">
                  <Link to={`/verify-email?token=${successData.token}`}>
                    <Button variant="emerald" className="w-full gap-2">
                      Complete Email Verification
                      <ArrowRight className="h-4 w-4" />
                    </Button>
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
                  label="Full Name"
                  type="text"
                  placeholder="Sarah Connor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="sarah@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  label="Phone Number (E.164 Format)"
                  type="text"
                  placeholder="+14155552671"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />

                <div>
                  <Input
                    label="Master Password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  {/* Password rules checklist */}
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground mt-2 px-1">
                    <span className={hasLength ? "text-emerald font-medium" : ""}>
                      ✓ Min 8 characters
                    </span>
                    <span className={hasUpper ? "text-emerald font-medium" : ""}>
                      ✓ 1 uppercase letter
                    </span>
                    <span className={hasLower ? "text-emerald font-medium" : ""}>
                      ✓ 1 lowercase letter
                    </span>
                    <span className={hasNumber && hasSpecial ? "text-emerald font-medium" : ""}>
                      ✓ 1 number & 1 symbol
                    </span>
                  </div>
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  Create My Bank Accounts
                </Button>

                <div className="text-center text-xs text-muted-foreground pt-2">
                  Already hold an account?{" "}
                  <Link to="/login" className="font-semibold text-primary hover:underline">
                    Sign In
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

