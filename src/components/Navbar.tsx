"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightFromSquare,
  Bars,
  Comments,
  FileText,
  Gear,
  LayoutCellsLarge,
  Magnifier,
  Person,
  Printer,
  ShieldCheck,
  ShoppingBag,
} from "@gravity-ui/icons";
import {
  Avatar,
  Badge,
  Button,
  Chip,
  Drawer,
  Dropdown,
  Label,
  Separator,
} from "@heroui/react";
import { ThemeToggle } from "./ThemeToggle";
import { usePrintShop } from "@/context/PrintShopContext";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, currentUser, tickets, inquiries, queueSummary, logout } =
    usePrintShop();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isStaff =
    currentUser?.role === "employee" || currentUser?.role === "super_admin";

  const queuedCount = isStaff
    ? tickets.filter((t) => t.status === "queued").length
    : queueSummary.queuedTickets;

  const pendingQuotes = isStaff
    ? inquiries.filter((q) => q.status === "pending_review").length
    : 0;

  const initials = currentUser?.fullName
    ? currentUser.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CJ";

  const navItems = [
    { href: "/products", label: "Catalog & Pricing", icon: ShoppingBag },
    { href: "/quotations", label: "Request Quote", icon: FileText },
    { href: "/track", label: "Order Tracking", icon: Magnifier },
    {
      href: "/chat",
      label: "Support Desk",
      icon: Comments,
      count: queuedCount > 0 ? queuedCount : undefined,
    },
  ];

  const handleSignOut = async () => {
    setDrawerOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-separator bg-surface/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand Identity */}
        <NextLink href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs">
            <Printer className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground leading-none">
              {settings.shopName}
            </span>
            <span className="mt-1 hidden text-xs text-muted sm:block leading-none">
              Commercial Print & Production
            </span>
          </div>
        </NextLink>

        {/* Primary Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <NextLink key={item.href} href={item.href}>
                <Button
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                  className={active ? "font-medium" : "text-muted hover:text-foreground"}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                  {item.count !== undefined && (
                    <Chip size="sm" color="accent" variant="soft">
                      <Chip.Label className="tabular-nums">{item.count}</Chip.Label>
                    </Chip>
                  )}
                </Button>
              </NextLink>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {currentUser ? (
            <div className="hidden sm:flex items-center gap-2">
              {isStaff && (
                <NextLink href="/dashboard">
                  <Button
                    size="sm"
                    variant={pathname === "/dashboard" ? "primary" : "secondary"}
                  >
                    <LayoutCellsLarge className="size-3.5" />
                    Operations
                    {pendingQuotes + queuedCount > 0 && (
                      <Chip size="sm" color="warning" variant="soft">
                        <Chip.Label className="tabular-nums">
                          {pendingQuotes + queuedCount}
                        </Chip.Label>
                      </Chip>
                    )}
                  </Button>
                </NextLink>
              )}

              {currentUser.role === "super_admin" && (
                <NextLink href="/admin">
                  <Button
                    size="sm"
                    variant={pathname === "/admin" ? "primary" : "secondary"}
                  >
                    <Gear className="size-3.5" />
                    Admin
                  </Button>
                </NextLink>
              )}

              {/* HeroUI Account Dropdown */}
              <Dropdown>
                <Button
                  aria-label="Account menu"
                  size="sm"
                  variant="tertiary"
                  className="gap-2 pl-1.5 pr-2.5"
                >
                  <Badge.Anchor>
                    <Avatar size="sm">
                      <Avatar.Fallback>{initials}</Avatar.Fallback>
                    </Avatar>
                    <Badge color="success" placement="bottom-right" size="sm" />
                  </Badge.Anchor>
                  <span className="max-w-[110px] truncate text-xs font-medium">
                    {currentUser.fullName.split(" ")[0]}
                  </span>
                </Button>
                <Dropdown.Popover>
                  <Dropdown.Menu
                    aria-label="User actions"
                    onAction={(key) => {
                      if (key === "account") router.push("/account");
                      if (key === "dashboard") router.push("/dashboard");
                      if (key === "admin") router.push("/admin");
                      if (key === "logout") void handleSignOut();
                    }}
                  >
                    {currentUser.role === "customer" && (
                      <Dropdown.Item id="account" textValue="Client Account">
                        <Person className="size-4 shrink-0 text-muted" />
                        <Label>Client Account</Label>
                      </Dropdown.Item>
                    )}
                    {isStaff && (
                      <Dropdown.Item id="dashboard" textValue="Operations Desk">
                        <LayoutCellsLarge className="size-4 shrink-0 text-muted" />
                        <Label>Operations Desk</Label>
                      </Dropdown.Item>
                    )}
                    {currentUser.role === "super_admin" && (
                      <Dropdown.Item id="admin" textValue="System Administration">
                        <Gear className="size-4 shrink-0 text-muted" />
                        <Label>System Administration</Label>
                      </Dropdown.Item>
                    )}
                    <Dropdown.Item
                      id="logout"
                      textValue="Sign out"
                      variant="danger"
                    >
                      <ArrowRightFromSquare className="size-4 shrink-0 text-danger" />
                      <Label>Sign out</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <NextLink href="/account">
                <Button size="sm" variant="ghost">
                  <Person className="size-3.5" />
                  Client Sign In
                </Button>
              </NextLink>
              <NextLink href="/staff/login">
                <Button size="sm" variant="secondary">
                  <ShieldCheck className="size-3.5" />
                  Staff Portal
                </Button>
              </NextLink>
            </div>
          )}

          {/* Mobile HeroUI Drawer */}
          <div className="lg:hidden">
            <Button
              size="sm"
              variant="tertiary"
              isIconOnly
              aria-label="Open navigation drawer"
              onPress={() => setDrawerOpen(true)}
            >
              <Bars className="size-4" />
            </Button>

            <Drawer.Backdrop isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
              <Drawer.Content placement="right">
                <Drawer.Dialog>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Printer className="size-4" />
                      </div>
                      <Drawer.Heading className="text-base">
                        {settings.shopName}
                      </Drawer.Heading>
                    </div>
                  </Drawer.Header>
                  <Drawer.Body>
                    <nav className="flex flex-col gap-1.5">
                      {navItems.map((item) => {
                        const active =
                          pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;
                        return (
                          <NextLink
                            key={item.href}
                            href={item.href}
                            onClick={() => setDrawerOpen(false)}
                          >
                            <Button
                              fullWidth
                              variant={active ? "secondary" : "ghost"}
                              className="justify-between"
                            >
                              <span className="flex items-center gap-2.5">
                                <Icon className="size-4 text-muted" />
                                {item.label}
                              </span>
                              {item.count !== undefined && (
                                <Chip size="sm" color="accent" variant="soft">
                                  <Chip.Label className="tabular-nums">
                                    {item.count}
                                  </Chip.Label>
                                </Chip>
                              )}
                            </Button>
                          </NextLink>
                        );
                      })}
                    </nav>

                    <Separator className="my-4" />

                    {currentUser ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 rounded-2xl bg-default p-3">
                          <Avatar size="sm">
                            <Avatar.Fallback>{initials}</Avatar.Fallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">
                              {currentUser.fullName}
                            </div>
                            <div className="truncate text-xs text-muted">
                              {currentUser.email}
                            </div>
                          </div>
                        </div>

                        {isStaff && (
                          <NextLink
                            href="/dashboard"
                            onClick={() => setDrawerOpen(false)}
                          >
                            <Button fullWidth variant="secondary">
                              <LayoutCellsLarge className="size-4" />
                              Operations Desk
                            </Button>
                          </NextLink>
                        )}
                        {currentUser.role === "super_admin" && (
                          <NextLink
                            href="/admin"
                            onClick={() => setDrawerOpen(false)}
                          >
                            <Button fullWidth variant="primary">
                              <Gear className="size-4" />
                              System Administration
                            </Button>
                          </NextLink>
                        )}
                        {currentUser.role === "customer" && (
                          <NextLink
                            href="/account"
                            onClick={() => setDrawerOpen(false)}
                          >
                            <Button fullWidth variant="secondary">
                              <Person className="size-4" />
                              Client Account
                            </Button>
                          </NextLink>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <NextLink
                          href="/account"
                          onClick={() => setDrawerOpen(false)}
                        >
                          <Button fullWidth variant="secondary">
                            <Person className="size-4" />
                            Client Sign In
                          </Button>
                        </NextLink>
                        <NextLink
                          href="/staff/login"
                          onClick={() => setDrawerOpen(false)}
                        >
                          <Button fullWidth variant="primary">
                            <ShieldCheck className="size-4" />
                            Staff Portal
                          </Button>
                        </NextLink>
                      </div>
                    )}
                  </Drawer.Body>
                  {currentUser && (
                    <Drawer.Footer>
                      <Button
                        fullWidth
                        variant="danger-soft"
                        onPress={handleSignOut}
                      >
                        <ArrowRightFromSquare className="size-4" />
                        Sign Out
                      </Button>
                    </Drawer.Footer>
                  )}
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </div>
        </div>
      </div>
    </header>
  );
}
