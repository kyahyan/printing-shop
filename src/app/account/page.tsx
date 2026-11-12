"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Chip, Tabs } from "@heroui/react";
import { AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";

function CustomerAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const {
    currentUser,
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam === "staff_only" || errorParam === "unauthorized"
      ? "That workspace is restricted to authorized staff and administrators."
      : errorParam === "invalid_or_expired_link"
        ? "The verification link is invalid or expired. Please sign in or request a new link."
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
        `Account registered for ${email}. Please verify your email inbox before signing in.`
      );
      setAuthTab("signin");
      return;
    }
    router.refresh();
  };

  const handleApproveQuote = async (referenceNumber: string) => {
    setErrorMsg(null);
    try {
      await convertQuotationToOrder(referenceNumber);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Unable to convert quotation to order."
      );
    }
  };

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 space-y-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Client Portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in or register an account
          </h1>
          <p className="text-xs leading-relaxed text-muted">
            Access your production orders, approve formal quotations, and review
            support ticket threads.
          </p>
        </div>

        <Card className="border border-separator bg-surface p-6 space-y-5">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-separator bg-surface-secondary p-1">
            <button
              type="button"
              onClick={() => {
                setAuthTab("signin");
                setErrorMsg(null);
              }}
              className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                authTab === "signin"
                  ? "bg-surface text-foreground shadow-2xs"
                  : "text-muted hover:text-foreground"
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
              className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                authTab === "register"
                  ? "bg-surface text-foreground shadow-2xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          {confirmEmailNotice && (
            <div className="flex items-start gap-2 rounded-lg border border-separator bg-surface-secondary p-3 text-xs text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{confirmEmailNotice}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {authTab === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
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
                isDisabled={submitting}
              >
                {submitting ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Full Name *
                </label>
                <input
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Company / Organization (Optional)
                </label>
                <input
                  autoComplete="organization"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Telephone / Mobile *
                </label>
                <input
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 917 000 0000"
                  className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Password *
                </label>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isDisabled={submitting}
              >
                {submitting ? "Registering..." : "Create Client Account"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-8">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Header */}
      <Card className="border border-separator bg-surface p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {currentUser.fullName}
            </h1>
            <Chip size="sm" color="default" variant="secondary">
              {currentUser.role.replace("_", " ")}
            </Chip>
          </div>
          <p className="mt-1 text-xs text-muted">
            {currentUser.email}
            {currentUser.phone ? ` · ${currentUser.phone}` : ""}
            {currentUser.companyName ? ` · ${currentUser.companyName}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(currentUser.role === "employee" ||
            currentUser.role === "super_admin") && (
            <Link href="/dashboard">
              <Button size="sm" variant="secondary">
                Operations Desk
              </Button>
            </Link>
          )}
          {currentUser.role === "super_admin" && (
            <Link href="/admin">
              <Button size="sm" variant="secondary">
                Administration
              </Button>
            </Link>
          )}
          <Link href="/products">
            <Button size="sm" variant="primary">
              Browse Catalog
            </Button>
          </Link>
          <Link href="/quotations">
            <Button size="sm" variant="secondary">
              Request Quote
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

      {/* Account Sections */}
      <Tabs defaultSelectedKey="orders" className="space-y-4">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Client account records">
            <Tabs.Tab id="orders">
              Orders ({myOrders.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="quotes">
              Quotations ({myQuotes.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="tickets">
              Support Tickets ({myTickets.length})
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ORDERS PANEL */}
        <Tabs.Panel id="orders" className="space-y-3">
          {myOrders.length === 0 ? (
            <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
              No production orders recorded under this account.
            </Card>
          ) : (
            myOrders.map((ord) => (
              <Card
                key={ord.id}
                className="border border-separator bg-surface p-5 flex flex-wrap items-center justify-between gap-4 tabular-nums"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {ord.referenceNumber}
                    </span>
                    <Chip size="sm" color="success" variant="soft">
                      {ord.productionStatus.replace(/_/g, " ")}
                    </Chip>
                    <Chip
                      size="sm"
                      color={
                        ord.paymentStatus === "paid" ? "default" : "warning"
                      }
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
                      .join(" · ")}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[11px] text-muted">Total</div>
                    <div className="font-mono text-sm font-semibold text-foreground">
                      {formatCurrency(ord.totalAmount)}
                    </div>
                  </div>
                  <Link
                    href={`/track?ref=${encodeURIComponent(ord.referenceNumber)}`}
                  >
                    <Button size="sm" variant="secondary">
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </Tabs.Panel>

        {/* QUOTATIONS PANEL */}
        <Tabs.Panel id="quotes" className="space-y-3">
          {myQuotes.length === 0 ? (
            <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
              No quotation inquiries submitted under this account.
            </Card>
          ) : (
            myQuotes.map((q) => (
              <Card
                key={q.id}
                className="border border-separator bg-surface p-5 flex flex-wrap items-center justify-between gap-4 tabular-nums"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
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
                      {q.status.replace(/_/g, " ")}
                    </Chip>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {q.subject}
                  </div>
                  <div className="text-xs text-muted">
                    {q.productName} · {q.selectedSize} ·{" "}
                    {q.quantity.toLocaleString()} units
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {q.quotedTotal != null && (
                    <div className="text-right">
                      <div className="text-[11px] text-muted">Quoted Net</div>
                      <div className="font-mono text-sm font-semibold text-foreground">
                        {formatCurrency(q.quotedTotal)}
                      </div>
                    </div>
                  )}
                  {q.status === "quoted" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => handleApproveQuote(q.referenceNumber)}
                    >
                      Approve & Order
                    </Button>
                  )}
                  <Link
                    href={`/track?ref=${encodeURIComponent(q.referenceNumber)}`}
                  >
                    <Button size="sm" variant="secondary">
                      Inspect
                    </Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </Tabs.Panel>

        {/* TICKETS PANEL */}
        <Tabs.Panel id="tickets" className="space-y-3">
          {myTickets.length === 0 ? (
            <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
              No support tickets recorded under this account.
            </Card>
          ) : (
            myTickets.map((t) => (
              <Card
                key={t.id}
                className="border border-separator bg-surface p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
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
                      {t.status}
                    </Chip>
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {t.topic}
                  </div>
                </div>
                <Link href={`/chat?ticket=${encodeURIComponent(t.id)}`}>
                  <Button size="sm" variant="secondary">
                    Open Thread
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
          Loading Client Portal...
        </div>
      }
    >
      <CustomerAccountContent />
    </Suspense>
  );
}
