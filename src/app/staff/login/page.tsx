"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { AlertCircle } from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import { sanitizeSafeNextPath } from "@/lib/security";

function StaffLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNextPath = searchParams.get("next");
  const errorParam = searchParams.get("error");

  const { login, settings } = usePrintShop();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "account_disabled"
      ? "Your staff account has been deactivated by an administrator."
      : null
  );
  const [loading, setLoading] = useState(false);

  const safeNextPreview = rawNextPath
    ? sanitizeSafeNextPath(rawNextPath, "")
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(email, password, true);
    setLoading(false);

    if (!res.ok || !res.user) {
      setError(res.error || "Unable to authenticate credentials.");
      return;
    }

    router.refresh();
    const defaultTarget =
      res.user.role === "super_admin" ? "/admin" : "/dashboard";
    const resolvedTarget = sanitizeSafeNextPath(rawNextPath, defaultTarget);

    if (
      resolvedTarget.startsWith("/admin") &&
      res.user.role !== "super_admin"
    ) {
      router.push("/dashboard");
      return;
    }

    router.push(resolvedTarget);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          Internal Access
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {settings.shopName} Staff Portal
        </h1>
        <p className="text-xs leading-relaxed text-muted">
          Restricted to authorized operations personnel and system
          administrators.
        </p>
      </div>

      {safeNextPreview && (
        <div className="flex items-center gap-2 rounded-lg border border-separator bg-surface-secondary px-3.5 py-2.5 text-xs text-muted">
          <span>
            Authenticate to continue to{" "}
            <code className="font-mono font-medium text-foreground">
              {safeNextPreview}
            </code>
            .
          </span>
        </div>
      )}

      <Card className="border border-separator bg-surface p-6 space-y-5 shadow-surface">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Work Email
            </label>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@clayjar.com.ph"
              className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Password
            </label>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isDisabled={loading}
          >
            {loading ? "Authenticating..." : "Sign In to Workspace"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted">
          Loading Staff Authentication...
        </div>
      }
    >
      <StaffLoginContent />
    </Suspense>
  );
}
