"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { LogOut, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { usePrintShop } from "@/context/PrintShopContext";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, currentUser, tickets, inquiries, queueSummary, logout } =
    usePrintShop();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff =
    currentUser?.role === "employee" || currentUser?.role === "super_admin";

  const queuedCount = isStaff
    ? tickets.filter((t) => t.status === "queued").length
    : queueSummary.queuedTickets;

  const pendingQuotes = isStaff
    ? inquiries.filter((q) => q.status === "pending_review").length
    : 0;

  const navItems = [
    { href: "/products", label: "Catalog & Pricing" },
    { href: "/quotations", label: "Request Quote" },
    { href: "/track", label: "Order Tracking" },
    {
      href: "/chat",
      label: "Support Desk",
      count: queuedCount > 0 ? queuedCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-separator bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        {/* Brand Identity */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background font-mono text-xs font-semibold tracking-tight">
            CJ
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground leading-none">
              {settings.shopName}
            </span>
            <span className="mt-1 hidden text-[11px] text-muted sm:block leading-none">
              Commercial Print & Production
            </span>
          </div>
        </Link>

        {/* Primary Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-surface-secondary font-medium text-foreground"
                    : "text-muted hover:bg-surface-secondary/60 hover:text-foreground"
                }`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className="rounded bg-surface-tertiary px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground tabular-nums">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {currentUser ? (
            <div className="hidden sm:flex items-center gap-2">
              {isStaff && (
                <Link href="/dashboard">
                  <Button
                    size="sm"
                    variant={pathname === "/dashboard" ? "primary" : "secondary"}
                  >
                    Operations
                    {pendingQuotes + queuedCount > 0 && (
                      <span className="ml-1 rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                        {pendingQuotes + queuedCount}
                      </span>
                    )}
                  </Button>
                </Link>
              )}

              {currentUser.role === "super_admin" && (
                <Link href="/admin">
                  <Button
                    size="sm"
                    variant={pathname === "/admin" ? "primary" : "secondary"}
                  >
                    Administration
                  </Button>
                </Link>
              )}

              {currentUser.role === "customer" && (
                <Link href="/account">
                  <Button
                    size="sm"
                    variant={pathname === "/account" ? "primary" : "secondary"}
                  >
                    {currentUser.fullName.split(" ")[0]}
                  </Button>
                </Link>
              )}

              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Sign out"
                onPress={async () => {
                  await logout();
                  router.push("/");
                  router.refresh();
                }}
              >
                <LogOut className="h-4 w-4 text-muted" />
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/account">
                <Button size="sm" variant="ghost">
                  Client Sign In
                </Button>
              </Link>
              <Link href="/staff/login">
                <Button size="sm" variant="secondary">
                  Staff Portal
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            className="lg:hidden"
            aria-label="Toggle navigation menu"
            onPress={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-separator bg-surface px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                    active
                      ? "bg-surface-secondary font-medium text-foreground"
                      : "text-muted hover:bg-surface-secondary hover:text-foreground"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="rounded bg-surface-tertiary px-1.5 py-0.5 font-mono text-xs text-foreground tabular-nums">
                      {item.count} in queue
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="my-2 border-t border-separator" />

            {currentUser ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {isStaff && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" variant="secondary">
                      Operations
                    </Button>
                  </Link>
                )}
                {currentUser.role === "super_admin" && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" variant="primary">
                      Administration
                    </Button>
                  </Link>
                )}
                {currentUser.role === "customer" && (
                  <Link href="/account" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" variant="secondary">
                      Client Account
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={async () => {
                    setMobileOpen(false);
                    await logout();
                    router.push("/");
                    router.refresh();
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/account" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="secondary">
                    Client Sign In
                  </Button>
                </Link>
                <Link href="/staff/login" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="primary">
                    Staff Portal
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
