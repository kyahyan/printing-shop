"use client";

import React, { Suspense, useMemo, useState } from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightFromSquare,
  Check,
  Comments,
  Envelope,
  Eye,
  EyeSlash,
  FileText,
  Gear,
  LayoutCellsLarge,
  Magnifier,
  Person,
  ShoppingBag,
  Tray,
} from "@gravity-ui/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Description,
  EmptyState,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  Spinner,
  Tabs,
  TextField,
  toast,
} from "@heroui/react";
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
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
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
    toast.success("Signed in successfully");
    router.refresh();
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
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
    toast.success("Client account created");
    router.refresh();
  };

  const handleApproveQuote = async (referenceNumber: string) => {
    setErrorMsg(null);
    try {
      const ord = await convertQuotationToOrder(referenceNumber);
      if (ord) toast.success(`Converted to Order ${ord.referenceNumber}`);
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
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="p-6">
          <Card.Header>
            <Chip size="sm" color="accent" variant="soft" className="mb-1 w-fit">
              <Person width={12} />
              <Chip.Label>Client Portal</Chip.Label>
            </Chip>
            <Card.Title className="text-xl">
              {authTab === "signin"
                ? "Sign in to your account"
                : "Register a client account"}
            </Card.Title>
            <Card.Description>
              Access your production orders, approve formal quotations, and
              review support ticket threads.
            </Card.Description>
          </Card.Header>

          <Card.Content className="space-y-5 pt-4">
            <Tabs
              selectedKey={authTab}
              onSelectionChange={(key) => {
                setAuthTab(key as "signin" | "register");
                setErrorMsg(null);
                setConfirmEmailNotice(null);
              }}
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label="Authentication mode" className="w-full">
                  <Tabs.Tab id="signin">
                    Sign In
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="register">
                    Register
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>

            {confirmEmailNotice && (
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Check Your Inbox</Alert.Title>
                  <Alert.Description>{confirmEmailNotice}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {errorMsg && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Authentication Error</Alert.Title>
                  <Alert.Description>{errorMsg}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {authTab === "signin" ? (
              <Form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <TextField
                  isRequired
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={setEmail}
                >
                  <Label>Email Address</Label>
                  <InputGroup variant="secondary">
                    <InputGroup.Prefix>
                      <Envelope className="size-4 text-muted" />
                    </InputGroup.Prefix>
                    <InputGroup.Input placeholder="name@company.com" />
                  </InputGroup>
                  <FieldError />
                </TextField>

                <TextField
                  isRequired
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                >
                  <Label>Password</Label>
                  <InputGroup variant="secondary">
                    <InputGroup.Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                    />
                    <InputGroup.Suffix className="pe-0">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onPress={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeSlash className="size-4" />
                        )}
                      </Button>
                    </InputGroup.Suffix>
                  </InputGroup>
                  <FieldError />
                </TextField>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isPending={submitting}
                >
                  {({ isPending }) => (
                    <>
                      {isPending && <Spinner color="current" size="sm" />}
                      {isPending ? "Signing In..." : "Sign In"}
                    </>
                  )}
                </Button>
              </Form>
            ) : (
              <Form onSubmit={handleRegister} className="flex flex-col gap-3.5">
                <TextField
                  isRequired
                  name="fullName"
                  autoComplete="name"
                  value={fullName}
                  onChange={setFullName}
                >
                  <Label>Full Name</Label>
                  <Input variant="secondary" placeholder="Full name" />
                  <FieldError />
                </TextField>

                <TextField
                  name="companyName"
                  autoComplete="organization"
                  value={companyName}
                  onChange={setCompanyName}
                >
                  <Label>Company / Organization (Optional)</Label>
                  <Input variant="secondary" placeholder="Company name" />
                </TextField>

                <TextField
                  isRequired
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={setEmail}
                >
                  <Label>Email Address</Label>
                  <Input variant="secondary" placeholder="name@company.com" />
                  <FieldError />
                </TextField>

                <TextField
                  isRequired
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={setPhone}
                >
                  <Label>Telephone / Mobile</Label>
                  <Input variant="secondary" placeholder="+63 917 000 0000" />
                  <FieldError />
                </TextField>

                <TextField
                  isRequired
                  name="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                >
                  <Label>Password</Label>
                  <InputGroup variant="secondary">
                    <InputGroup.Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                    />
                    <InputGroup.Suffix className="pe-0">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onPress={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeSlash className="size-4" />
                        )}
                      </Button>
                    </InputGroup.Suffix>
                  </InputGroup>
                  <Description>Use at least 8 characters.</Description>
                  <FieldError />
                </TextField>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isPending={submitting}
                >
                  {({ isPending }) => (
                    <>
                      {isPending && <Spinner color="current" size="sm" />}
                      {isPending ? "Registering..." : "Create Client Account"}
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Card.Content>
        </Card>
      </div>
    );
  }

  const initials = currentUser.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-8">
      {errorMsg && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error</Alert.Title>
            <Alert.Description>{errorMsg}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Profile Header Card */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Badge.Anchor>
              <Avatar size="lg" color="accent">
                <Avatar.Fallback>{initials}</Avatar.Fallback>
              </Avatar>
              <Badge color="success" placement="bottom-right" size="sm" />
            </Badge.Anchor>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {currentUser.fullName}
                </h1>
                <Chip size="sm" color="accent" variant="soft">
                  <Chip.Label>{currentUser.role.replace("_", " ")}</Chip.Label>
                </Chip>
              </div>
              <p className="mt-1 text-xs text-muted">
                {currentUser.email}
                {currentUser.phone ? ` · ${currentUser.phone}` : ""}
                {currentUser.companyName ? ` · ${currentUser.companyName}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(currentUser.role === "employee" ||
              currentUser.role === "super_admin") && (
              <NextLink href="/dashboard">
                <Button size="sm" variant="secondary">
                  <LayoutCellsLarge className="size-3.5" />
                  Operations Desk
                </Button>
              </NextLink>
            )}
            {currentUser.role === "super_admin" && (
              <NextLink href="/admin">
                <Button size="sm" variant="secondary">
                  <Gear className="size-3.5" />
                  Administration
                </Button>
              </NextLink>
            )}
            <NextLink href="/products">
              <Button size="sm" variant="primary">
                <ShoppingBag className="size-3.5" />
                Browse Catalog
              </Button>
            </NextLink>
            <NextLink href="/quotations">
              <Button size="sm" variant="secondary">
                <FileText className="size-3.5" />
                Request Quote
              </Button>
            </NextLink>
            <Button
              size="sm"
              variant="danger-soft"
              onPress={async () => {
                await logout();
                router.refresh();
              }}
            >
              <ArrowRightFromSquare className="size-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </Card>

      {/* Account Sections */}
      <Tabs defaultSelectedKey="orders" className="w-full">
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
        <Tabs.Panel id="orders" className="space-y-3 pt-4">
          {myOrders.length === 0 ? (
            <Card className="p-10">
              <EmptyState className="flex flex-col items-center justify-center gap-3 text-center">
                <Tray className="size-6 text-muted" />
                <span className="text-sm text-muted">
                  No production orders recorded under this account.
                </span>
              </EmptyState>
            </Card>
          ) : (
            myOrders.map((ord) => (
              <Card key={ord.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 tabular-nums">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {ord.referenceNumber}
                      </span>
                      <Chip size="sm" color="success" variant="soft">
                        <Chip.Label>
                          {ord.productionStatus.replace(/_/g, " ")}
                        </Chip.Label>
                      </Chip>
                      <Chip
                        size="sm"
                        color={
                          ord.paymentStatus === "paid" ? "default" : "warning"
                        }
                        variant="soft"
                      >
                        <Chip.Label>
                          {ord.paymentStatus.replace(/_/g, " ")}
                        </Chip.Label>
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
                    <NextLink
                      href={`/track?ref=${encodeURIComponent(ord.referenceNumber)}`}
                    >
                      <Button size="sm" variant="secondary">
                        <Magnifier className="size-3.5" />
                        View Details
                      </Button>
                    </NextLink>
                  </div>
                </div>
              </Card>
            ))
          )}
        </Tabs.Panel>

        {/* QUOTATIONS PANEL */}
        <Tabs.Panel id="quotes" className="space-y-3 pt-4">
          {myQuotes.length === 0 ? (
            <Card className="p-10">
              <EmptyState className="flex flex-col items-center justify-center gap-3 text-center">
                <Tray className="size-6 text-muted" />
                <span className="text-sm text-muted">
                  No quotation inquiries submitted under this account.
                </span>
              </EmptyState>
            </Card>
          ) : (
            myQuotes.map((q) => (
              <Card key={q.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 tabular-nums">
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
                        <Chip.Label>{q.status.replace(/_/g, " ")}</Chip.Label>
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
                        <Check className="size-3.5" />
                        Approve & Order
                      </Button>
                    )}
                    <NextLink
                      href={`/track?ref=${encodeURIComponent(q.referenceNumber)}`}
                    >
                      <Button size="sm" variant="secondary">
                        Inspect
                      </Button>
                    </NextLink>
                  </div>
                </div>
              </Card>
            ))
          )}
        </Tabs.Panel>

        {/* TICKETS PANEL */}
        <Tabs.Panel id="tickets" className="space-y-3 pt-4">
          {myTickets.length === 0 ? (
            <Card className="p-10">
              <EmptyState className="flex flex-col items-center justify-center gap-3 text-center">
                <Tray className="size-6 text-muted" />
                <span className="text-sm text-muted">
                  No support tickets recorded under this account.
                </span>
              </EmptyState>
            </Card>
          ) : (
            myTickets.map((t) => (
              <Card key={t.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
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
                        <Chip.Label>{t.status}</Chip.Label>
                      </Chip>
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {t.topic}
                    </div>
                  </div>
                  <NextLink href={`/chat?ticket=${encodeURIComponent(t.id)}`}>
                    <Button size="sm" variant="secondary">
                      <Comments className="size-3.5" />
                      Open Thread
                    </Button>
                  </NextLink>
                </div>
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
        <div className="mx-auto flex max-w-md items-center justify-center gap-3 px-4 py-20 text-sm text-muted">
          <Spinner size="sm" />
          <span>Loading Client Portal...</span>
        </div>
      }
    >
      <CustomerAccountContent />
    </Suspense>
  );
}
