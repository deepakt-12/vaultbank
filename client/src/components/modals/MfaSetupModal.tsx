import React, { useState } from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { api } from "../../lib/api";
import { ShieldCheck, Copy, AlertTriangle, Key } from "lucide-react";

interface MfaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MfaSetupModal({ isOpen, onClose, onSuccess }: MfaSetupModalProps) {
  const [step, setStep] = useState<"INIT" | "VERIFY" | "BACKUP">("INIT");
  const [mfaData, setMfaData] = useState<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Fetch setup secret when opened
  React.useEffect(() => {
    if (isOpen) {
      setStep("INIT");
      setError(null);
      setIsLoading(true);
      api
        .post("/auth/mfa/setup")
        .then((res) => {
          setMfaData(res.data.data);
          setStep("VERIFY");
        })
        .catch((err) => {
          setError(err.message || "Failed to initialize MFA setup.");
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/auth/mfa/verify", { code });
      setStep("BACKUP");
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    if (mfaData?.secret) {
      navigator.clipboard.writeText(mfaData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Two-Factor Authentication (TOTP)"
      description="Protect your banking account by requiring a 6-digit code from Google Authenticator, Authy, or 1Password."
    >
      {step === "VERIFY" && mfaData && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex flex-col items-center justify-center p-3 bg-muted/40 rounded-xl border border-border">
            <img
              src={mfaData.qrCodeUrl}
              alt="MFA QR Code"
              className="h-44 w-44 rounded-lg bg-white p-2 shadow-sm"
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Scan with Google Authenticator or your password manager
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Or Enter Secret Key Manually
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={mfaData.secret}
                className="flex-1 rounded-lg border border-input bg-muted/50 px-3 py-2 text-xs font-mono text-foreground"
              />
              <Button type="button" variant="outline" size="sm" onClick={copySecret}>
                <Copy className="h-3.5 w-3.5" />
                {copiedSecret ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <Input
            label="6-Digit Verification Code"
            type="text"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            error={error || undefined}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="emerald" size="sm" isLoading={isLoading}>
              Verify & Enable
            </Button>
          </div>
        </form>
      )}

      {step === "BACKUP" && mfaData && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <span className="font-semibold">Two-factor authentication is now active on your account!</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Key className="h-4 w-4 text-amber-500" />
              <span>One-Time Emergency Backup Codes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Save these codes in a secure place. If you ever lose your phone or authenticator app, each code can be used once to access your account.
            </p>

            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/60 rounded-xl border border-border font-mono text-xs text-center font-bold">
              {mfaData.backupCodes.map((c, i) => (
                <div key={i} className="p-1.5 bg-card rounded border border-border">
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onSuccess();
                onClose();
              }}
            >
              I Have Saved My Backup Codes
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
