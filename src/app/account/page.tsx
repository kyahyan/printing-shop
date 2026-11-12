"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Chip, Tabs } from "@heroui/react";
import {
  Briefcase,
  CheckCircle2,
  FileSpreadsheet,
  LogOut,
  MessageSquare,
  Package,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";

function CustomerAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const {
    currentUser,
    supabaseConnected,
    orders,
    inquiries,
    tickets,
    formatCurrency,
    login,
    registerCustomer,
    convertQuotationToOrder,
    logout,
  } = usePrintShop();

  const [authTab, setAuthTab] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState(
    supabaseConnected ? "" : "daniel@northstarcoffee.ph"
  );
  const [password, setPassword] = useState(
    supabaseConnected ? "" : "customer123"
  );
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam === "staff_only" || errorParam === "unauthorized"
      ? "That route is restricted to Print Shop Employees and Super Administrators."
      : errorParam === "invalid_or_expired_link"
      ? "The confirmation link was invalid or expired. Please sign in or request a new link."
      : null
  );
  const [confirmEmailNotice, setConfirmEmailNotice] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(
      (o) =>
        o.customerId === currentUser.id ||
        o.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [currentUser, orders]);

  const myQuotes = useMemo(() => {
    if (!currentUser) return [];
    return inquiries.filter(
      (q) =>
        q.customerId === currentUser.id ||
        q.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [currentUser, inquiries]);

  const myTickets = useMemo(() => {
    if (!currentUser) return [];
    return tickets.filter(
      (t) =>
        t.customerId === currentUser.id ||
        t.customerEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [currentUser, tickets]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setConfirmEmailNotice(null);
    const res = await login(email, password, false);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || "Sign in failed.");
      return;
    }
    router.refresh();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setConfirmEmailNotice(null);
    const res = await registerCustomer({
      fullName,
      email,
      phone,
      companyName,
      password,
    });
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || "Registration failed.");
      return;
    }
    if (res.needsEmailConfirmation) {
      setConfirmEmailNotice(
        `Account created for ${email}! Please check your email inbox to confirm your address, then sign in.`
      );
      setAuthTab("signin");
      return;
    }
    router.refresh();
  };

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 space-y-6">
        <div className="text-center space-y-2">
          <Chip size="sm" color="accent" variant="soft">
            Supabase Auth Portal
          </Chip>
          <h1 className="text-2xl font-extrabold text-foreground">
            Sign In or Create a Customer Account
          </h1>
          <p className="text-xs text-muted">
            Track your print orders, approve custom quotations, and keep all
            Reference Numbers in one place.
          </p>
        </div>

        <Card className="border border-separator bg-surface p-6 space-y-5">
          <div className="flex rounded-xl bg-surface-secondary p-1">
            <button
              type="button"
              onClick={() => {
                setAuthTab("signin");
                setErrorMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                authTab === "signin"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab("register");
                setEmail("");
                setPassword("");
                setErrorMsg(null);
                setConfirmEmailNotice(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                authTab === "register"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted"
              }`}
            >
              Create Account
            </button>
          </div>

          {confirmEmailNotice && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{confirmEmailNotice}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {authTab === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
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
                isDisabled={submitting}
              >
                <UserCheck className="h-4 w-4" />
                {submitting ? "Signing In..." : "Sign In to Account"}
              </Button>

              {!supabaseConnected && (
                <div className="rounded-xl border border-separator bg-surface-secondary/50 p-3 text-[11px] text-muted">
                  <strong className="text-foreground">Demo Customer:</strong>{" "}
                  <code className="font-mono">daniel@northstarcoffee.ph</code> /{" "}
                  <code className="font-mono">customer123</code>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Full Name *
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sofia Mendoza"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Company / Brand (Optional)
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Studio Solace"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sofia@studiosolace.ph"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Mobile Number *
                </label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 917 888 1234"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Password *
                </label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isDisabled={submitting}
              >
                <UserPlus className="h-4 w-4" />
                {submitting ? "Creating Account..." : "Create Customer Account"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Header */}
      <Card className="border border-separator bg-surface p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-foreground">
              {currentUser.fullName}
            </h1>
            <Chip size="sm" color="accent" variant="soft">
              {currentUser.role.replace("_", " ").toUpperCase()}
            </Chip>
          </div>
          <p className="mt-1 text-xs text-muted">
            {currentUser.email} • {currentUser.phone || "No phone saved"}
            {currentUser.companyName ? ` • ${currentUser.companyName}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(currentUser.role === "employee" ||
            currentUser.role === "super_admin") && (
            <Link href="/dashboard">
              <Button size="sm" variant="secondary">
                <Briefcase className="h-4 w-4" />
                Employee Desk
              </Button>
            </Link>
          )}
          {currentUser.role === "super_admin" && (
            <Link href="/admin">
              <Button size="sm" variant="secondary">
                <ShieldCheck className="h-4 w-4" />
                Super Admin
              </Button>
            </Link>
          )}
          <Link href="/products">
            <Button size="sm" variant="primary">
              <ShoppingBag className="h-4 w-4" />
              New Print Order
            </Button>
          </Link>
          <Link href="/quotations">
            <Button size="sm" variant="secondary">
              <FileSpreadsheet className="h-4 w-4" />
              New Quotation
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onPress={async () => {
              await logout();
              router.refresh();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </Card>

      {/* HeroUI v3 Compound Tabs */}
      <Tabs defaultSelectedKey="orders" className="space-y-4">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Customer account sections">
            <Tabs.Tab id="orders">
              Orders ({myOrders.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="quotes">
              Quotations & Inquiries ({myQuotes.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="tickets">
              Support Tickets ({myTickets.length})
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ORDERS PANEL */}
        <Tabs.Panel id="orders" className="space-y-4">
          {myOrders.length === 0 ? (
            <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
              You have no orders yet. Browse our Price-Per-Size catalog to start
              an order!
            </Card>
          ) : (
            myOrders.map((ord) => (
              <Card
                key={ord.id}
                className="border border-separator bg-surface p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-accent" />
                    <span className="font-mono text-base font-bold text-accent">
                      {ord.referenceNumber}
                    </span>
                    <Chip size="sm" color="success" variant="soft">
                      {ord.productionStatus.replace(/_/g, " ").toUpperCase()}
                    </Chip>
                    <Chip
                      size="sm"
                      color={ord.paymentStatus === "paid" ? "accent" : "warning"}
                      variant="soft"
                    >
                      {ord.paymentStatus.replace(/_/g, " ")}
                    </Chip>
                  </div>
                  <div className="text-xs text-muted">
                    {ord.items
                      .map(
                        (i) =>
                          `${i.quantity}× ${i.productName} (${i.sizeLabel})`
                      )
                      .join(" • ")}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-muted">Total</div>
                    <div className="font-extrabold text-foreground">
                      {formatCurrency(ord.totalAmount)}
                    </div>
                  </div>
                  <Link href={`/track?ref=${ord.referenceNumber}`}>
                    <Button size="sm" variant="secondary">
                      Track Job
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </Tabs.Panel>

        {/* QUOTATIONS PANEL */}
        <Tabs.Panel id="quotes" className="space-y-4">
          {myQuotes.length === 0 ? (
            <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
              No quotations submitted under your account yet.
            </Card>
          ) : (
            myQuotes.map((q) => (
              <Card
                key={q.id}
                className="border border-separator bg-surface p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-accent">
                      {q.referenceNumber}
                    </span>
                    <Chip
                      size="sm"
                      color={
                        q.status === "quoted"
                          ? "success"
                          : q.status === "converted_to_order"
                          ? "accent"
                          : "warning"
                      }
                      variant="soft"
                    >
                      {q.status.replace(/_/g, " ").toUpperCase()}
                    </Chip>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {q.subject}
                  </div>
                  <div className="text-xs text-muted">
                    {q.productName} • {q.selectedSize} • Qty:{" "}
                    {q.quantity.toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {q.quotedTotal != null && (
                    <div className="text-right">
                      <div className="text-[11px] text-muted">Quoted Total</div>
                      <div className="text-base font-extrabold text-accent">
                        {formatCurrency(q.quotedTotal)}
                      </div>
                    </div>
                  )}
                  {q.status === "quoted" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => convertQuotationToOrder(q.id)}
                    >
                      Approve & Order
                    </Button>
                  )}
                  <Link href={`/track?ref=${q.referenceNumber}`}>
                    <Button size="sm" variant="secondary">
                      Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </Tabs.Panel>

        {/* TICKETS PANEL */}
        <Tabs.Panel id="tickets" className="space-y-4">
          {myTickets.length === 0 ? (
            <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
              No support chat tickets yet.
            </Card>
          ) : (
            myTickets.map((t) => (
              <Card
                key={t.id}
                className="border border-separator bg-surface p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-accent">
                      {t.ticketNumber}
                    </span>
                    <Chip
                      size="sm"
                      color={
                        t.status === "active"
                          ? "success"
                          : t.status === "queued"
                          ? "warning"
                          : "default"
                      }
                      variant="soft"
                    >
                      {t.status.toUpperCase()}
                    </Chip>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {t.topic}
                  </div>
                </div>
                <Link href={`/chat?ticket=${t.id}`}>
                  <Button size="sm" variant="secondary">
                    <MessageSquare className="h-4 w-4" />
                    Open Chat
                  </Button>
                </Link>
              </Card>
            ))
          )}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

export default function CustomerAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted">
          Loading Account Portal...
        </div>
      }
    >
      <CustomerAccountContent />
    </Suspense>
  );
}
