"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";

function StaffLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const errorParam = searchParams.get("error");

  const { login, settings } = usePrintShop();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "account_disabled"
      ? "Your staff account has been disabled by a Super Administrator."
      : null
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(email, password, true);
    setLoading(false);

    if (!res.ok || !res.user) {
      setError(res.error || "Unable to authenticate.");
      return;
    }

    router.refresh();
    if (
      nextPath &&
      nextPath.startsWith("/") &&
      !nextPath.startsWith("//") &&
      (res.user.role === "super_admin" || !nextPath.startsWith("/admin"))
    ) {
      router.push(nextPath);
      return;
    }

    if (res.user.role === "super_admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-14 space-y-6">
      <div className="text-center space-y-2">
        <Chip size="sm" color="warning" variant="soft">
          Protected Staff Route
        </Chip>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {settings.shopName} Staff Portal
        </h1>
        <p className="text-xs text-muted">
          Authorized portal for Print Shop Employees (Order Desk, Quotations &
          Chat Queue) and Super Administrators.
        </p>
      </div>

      {nextPath && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            Please sign in with an authorized staff account to access{" "}
            <code className="font-mono font-bold">{nextPath}</code>.
          </span>
        </div>
      )}

      <Card className="border border-separator bg-surface p-6 space-y-5 shadow-lg">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Staff Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@clayjar.com.ph"
              className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Password
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isDisabled={loading}
          >
            <KeyRound className="h-4 w-4" />
            {loading ? "Verifying Credentials..." : "Sign In to Staff Workspace"}
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
        <div className="mx-auto max-w-xl px-4 py-20 text-center text-sm text-muted">
          Loading Staff Authentication...
        </div>
      }
    >
      <StaffLoginContent />
    </Suspense>
  );
}
