"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import {
  Briefcase,
  FileSpreadsheet,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Printer,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { usePrintShop } from "@/context/PrintShopContext";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, currentUser, tickets, inquiries, logout } = usePrintShop();
  const [mobileOpen, setMobileOpen] = useState(false);

  const queuedCount = tickets.filter((t) => t.status === "queued").length;
  const pendingQuotes = inquiries.filter(
    (q) => q.status === "pending_review"
  ).length;

  const navItems = [
    { href: "/products", label: "Products & Sizes", icon: Layers },
    { href: "/quotations", label: "Get Quotation", icon: FileSpreadsheet },
    { href: "/track", label: "Track Reference", icon: Search },
    {
      href: "/chat",
      label: "Support Queue",
      icon: MessageSquare,
      badge: queuedCount > 0 ? String(queuedCount) : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-separator bg-background/85 backdrop-blur-xl">
      <div className="cmyk-bar h-1 w-full" />

      {/* Main Navigation Row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm transition group-hover:scale-105">
            <Printer className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight text-foreground">
              {settings.shopName}
            </div>
            <div className="text-[11px] text-muted hidden sm:block">
              Print • Quotations • Custom Sizing
            </div>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-accent/12 text-accent"
                    : "text-muted hover:bg-surface-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <Chip size="sm" color="warning" variant="soft">
                    {item.badge}
                  </Chip>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {currentUser ? (
            <div className="hidden sm:flex items-center gap-2">
              {(currentUser.role === "employee" ||
                currentUser.role === "super_admin") && (
                <Link href="/dashboard">
                  <Button
                    size="sm"
                    variant={pathname === "/dashboard" ? "primary" : "secondary"}
                  >
                    <Briefcase className="h-4 w-4" />
                    Employee Desk
                    {pendingQuotes + queuedCount > 0 && (
                      <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[11px] font-semibold text-amber-500">
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
                    <ShieldCheck className="h-4 w-4" />
                    Super Admin
                  </Button>
                </Link>
              )}

              {currentUser.role === "customer" && (
                <Link href="/account">
                  <Button
                    size="sm"
                    variant={pathname === "/account" ? "primary" : "secondary"}
                  >
                    <User className="h-4 w-4" />
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
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/account">
                <Button size="sm" variant="secondary">
                  <User className="h-4 w-4" />
                  Customer Account
                </Button>
              </Link>
              <Link href="/staff/login">
                <Button size="sm" variant="primary">
                  <Briefcase className="h-4 w-4" />
                  Staff Login
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Hamburger */}
          <Button
            size="sm"
            variant="secondary"
            isIconOnly
            className="lg:hidden"
            aria-label="Toggle Menu"
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
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-secondary"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    {item.label}
                  </span>
                  {item.badge && (
                    <Chip size="sm" color="warning" variant="soft">
                      {item.badge} queued
                    </Chip>
                  )}
                </Link>
              );
            })}
            <div className="my-2 border-t border-separator" />
            {currentUser ? (
              <div className="flex flex-wrap gap-2">
                {(currentUser.role === "employee" ||
                  currentUser.role === "super_admin") && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" variant="secondary">
                      <Briefcase className="h-4 w-4" />
                      Employee Desk
                    </Button>
                  </Link>
                )}
                {currentUser.role === "super_admin" && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}>
                    <Button size="sm" variant="primary">
                      <ShieldCheck className="h-4 w-4" />
                      Super Admin
                    </Button>
                  </Link>
                )}
                <Link href="/account" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="secondary">
                    <User className="h-4 w-4" />
                    My Account
                  </Button>
                </Link>
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
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link href="/account" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="secondary">
                    <User className="h-4 w-4" />
                    Customer Portal
                  </Button>
                </Link>
                <Link href="/staff/login" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="primary">
                    <Briefcase className="h-4 w-4" />
                    Staff / Admin Portal
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
