import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { MfaSetupModal } from "../components/modals/MfaSetupModal";
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Lock,
  User as UserIcon,
} from "lucide-react";

export function SettingsPage() {
  const { user, refreshUser, logoutAll } = useAuth();
  const queryClient = useQueryClient();

  // Profile form state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // MFA modal
  const [mfaModalOpen, setMfaModalOpen] = useState(false);

  // Active Sessions Query
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const res = await api.get("/auth/sessions");
      return res.data.data.sessions;
    },
  });

  const sessions = sessionsData || [];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileMsg(null);

    try {
      await api.patch("/users/me", { fullName, phoneNumber });
      await refreshUser();
      setProfileMsg("Profile updated successfully.");
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
    } catch (err: any) {
      alert("Failed to revoke session: " + err.message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Security & Account Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage cryptographic authentication factors, active sessions, and profile credentials
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-emerald" />
              <CardTitle className="text-base">Customer Profile</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Primary identification credentials
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{profileMsg}</span>
                </div>
              )}

              {profileError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <Input
                label="Full Legal Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/80 mb-1.5">
                  Email Address
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="flex-1 rounded-lg border border-input bg-muted/60 px-3 py-2 text-xs font-mono text-muted-foreground cursor-not-allowed"
                  />
                  <Badge variant={user?.isEmailVerified ? "success" : "warning"}>
                    {user?.isEmailVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
              </div>

              <Input
                label="Phone Number"
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" size="sm" isLoading={profileLoading}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Multi-Factor Authentication Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald" />
              <CardTitle className="text-base">Two-Factor Authentication (TOTP)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Require an authenticator code on sign in and high-value transfers
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <Smartphone className="h-7 w-7 text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">Authenticator App</p>
                  <p className="text-[11px] text-muted-foreground">Google Authenticator, Authy, or 1Password</p>
                </div>
              </div>
              <Badge variant={user?.mfaEnabled ? "success" : "default"}>
                {user?.mfaEnabled ? "Active & Enforced" : "Disabled"}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              When enabled, signing in requires your master password and a time-sensitive 6-digit TOTP code.
            </p>

            <Button
              variant={user?.mfaEnabled ? "outline" : "emerald"}
              size="sm"
              onClick={() => setMfaModalOpen(true)}
            >
              {user?.mfaEnabled ? "Reconfigure Authenticator App" : "Enable Two-Factor Authentication"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Management Card */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-emerald" />
              <CardTitle className="text-base">Active Persistent Sessions</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Opaque session identifiers stored securely in MongoDB
            </CardDescription>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (confirm("Are you sure you want to log out of all active sessions across all devices?")) {
                await logoutAll();
                window.location.href = "/login";
              }
            }}
            className="gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            Revoke All Other Sessions
          </Button>
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-border text-xs">
            {sessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-3.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {s.isCurrent ? "Current Device" : "Other Device"}
                    </span>
                    {s.isCurrent && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="text-muted-foreground truncate max-w-sm sm:max-w-md font-mono text-[11px]">
                    {s.userAgent}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80">
                    IP: {s.ipAddress} • Last active: {formatDate(s.lastActiveAt)}
                  </p>
                </div>

                {!s.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeSession(s.id)}
                    className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* TOTP Setup Modal */}
      <MfaSetupModal
        isOpen={mfaModalOpen}
        onClose={() => setMfaModalOpen(false)}
        onSuccess={() => {
          refreshUser();
        }}
      />
    </div>
  );
}
