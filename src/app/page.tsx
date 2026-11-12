"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Headset,
  Layers,
  PackageCheck,
  Ruler,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { Product } from "@/types/printshop";
import { ProductPriceModal } from "@/components/ProductPriceModal";

const ACCENT_GRADIENTS: Record<Product["accentColor"], string> = {
  cyan: "from-cyan-500/20 via-sky-500/10 to-transparent border-cyan-500/30",
  magenta:
    "from-pink-500/20 via-fuchsia-500/10 to-transparent border-pink-500/30",
  amber:
    "from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30",
  indigo:
    "from-indigo-500/20 via-blue-500/10 to-transparent border-indigo-500/30",
  emerald:
    "from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30",
  rose: "from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30",
};

export default function HomePage() {
  const router = useRouter();
  const { settings, products, tickets, formatCurrency } = usePrintShop();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [refQuery, setRefQuery] = useState("");

  const activeProducts = products.filter((p) => p.isActive);
  const queuedTickets = tickets.filter((t) => t.status === "queued").length;

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refQuery.trim()) return;
    router.push(`/track?ref=${encodeURIComponent(refQuery.trim())}`);
  };

  return (
    <div className="space-y-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-separator bg-gradient-to-b from-surface-secondary/70 via-background to-background py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-separator bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>
                  Transparent Price-Per-Size • Formal Quotations • Live Queue
                  Support
                </span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Commercial Printing &{" "}
                <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-500 bg-clip-text text-transparent">
                  Instant Quotations
                </span>{" "}
                Built Around Your Exact Size.
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                {settings.tagline}. Click any print product to inspect real-time
                pricing per dimension, volume discounts, and substrate options —
                or request a tailored quotation with a trackable Reference
                Number.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/products">
                  <Button variant="primary" size="lg">
                    <Ruler className="h-4 w-4" />
                    Explore Price-Per-Size Catalog
                  </Button>
                </Link>
                <Link href="/quotations">
                  <Button variant="secondary" size="lg">
                    <FileSpreadsheet className="h-4 w-4" />
                    Request Custom Quotation
                  </Button>
                </Link>
              </div>

              {/* Quick Reference Lookup Bar */}
              <form
                onSubmit={handleTrackSubmit}
                className="flex max-w-xl flex-col gap-2 rounded-2xl border border-separator bg-surface p-2.5 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-center gap-2 px-2">
                  <Search className="h-4 w-4 shrink-0 text-muted" />
                  <input
                    value={refQuery}
                    onChange={(e) => setRefQuery(e.target.value)}
                    placeholder={`Enter Reference # (${settings.quotePrefix}-..., ${settings.orderPrefix}-..., or ${settings.ticketPrefix}-...)`}
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm">
                  Track Status
                </Button>
              </form>
            </div>

            {/* Hero Interactive Highlights Card */}
            <div className="lg:col-span-5">
              <Card className="border border-separator bg-surface p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-separator pb-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Live Print Floor Overview
                    </div>
                    <h2 className="text-lg font-bold text-foreground">
                      {settings.shopName}
                    </h2>
                  </div>
                  <Chip size="sm" color="success" variant="soft">
                    Presses Online
                  </Chip>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-separator bg-surface-secondary/60 p-3.5">
                    <div className="text-xs text-muted">Active Catalog</div>
                    <div className="mt-1 text-2xl font-extrabold text-foreground">
                      {activeProducts.length} Lines
                    </div>
                    <div className="text-[11px] text-emerald-500">
                      {activeProducts.reduce((acc, p) => acc + p.sizes.length, 0)}{" "}
                      size tiers ready
                    </div>
                  </div>
                  <div className="rounded-xl border border-separator bg-surface-secondary/60 p-3.5">
                    <div className="text-xs text-muted">Chat Ticket Queue</div>
                    <div className="mt-1 text-2xl font-extrabold text-foreground">
                      {queuedTickets} Waiting
                    </div>
                    <div className="text-[11px] text-accent">
                      Live ticket routing
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2.5 rounded-xl bg-surface-secondary/50 p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>
                      <strong>Click any product</strong> to view exact{" "}
                      <strong>Price Per Size</strong> & bulk 100+ / 500+ breaks
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl bg-surface-secondary/50 p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    <span>
                      <strong>Reference Number Tracking</strong> for every
                      Inquiry (<code className="font-mono">QT-...</code>) and
                      Order (<code className="font-mono">ORD-...</code>)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl bg-surface-secondary/50 p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      <strong>Queued Customer Support Chat</strong> — see your
                      live queue number until a print specialist claims your
                      ticket
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-separator pt-3 text-xs text-muted">
                  <span>Have a Reference Number?</span>
                  <Link
                    href="/track"
                    className="font-semibold text-accent hover:underline"
                  >
                    Open Reference Tracker →
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS WITH CLICK-TO-VIEW PRICE PER SIZE */}
      <section className="mx-auto max-w-7xl px-4 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">
              Transparent Size & Volume Pricing
            </div>
            <h2 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
              Click Any Print Product to See Price Per Size
            </h2>
            <p className="mt-1 text-sm text-muted">
              Compare standard dimensions, bulk tiers, substrates, and finishes
              — then order immediately or request a formal quote.
            </p>
          </div>
          <Link href="/products">
            <Button variant="secondary">
              View All {activeProducts.length} Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {activeProducts.length === 0 ? (
          <Card className="border border-dashed border-separator bg-surface p-12 text-center space-y-4">
            <Layers className="mx-auto h-10 w-10 text-muted" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">
                No Catalog Products Published Yet
              </h3>
              <p className="mx-auto max-w-md text-sm text-muted">
                Sign in to the Super Admin Dashboard to create your print
                products and per-size pricing tiers, or request a custom
                quotation right now.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/quotations">
                <Button variant="primary">
                  <FileSpreadsheet className="h-4 w-4" />
                  Request Custom Quotation
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="secondary">
                  <ShieldCheck className="h-4 w-4" />
                  Add Products in Super Admin
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeProducts.map((product) => {
              const lowestSize = [...product.sizes].sort(
                (a, b) => a.unitPrice - b.unitPrice
              )[0];
              return (
                <Card
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="group cursor-pointer border border-separator bg-surface transition hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg flex flex-col justify-between p-0 overflow-hidden"
                >
                  <div>
                    <div
                      className={`border-b bg-gradient-to-br p-5 ${
                        ACCENT_GRADIENTS[product.accentColor] ||
                        ACCENT_GRADIENTS.indigo
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Chip size="sm" color="default" variant="secondary">
                          {product.category}
                        </Chip>
                        {product.badge && (
                          <Chip size="sm" color="accent" variant="soft">
                            {product.badge}
                          </Chip>
                        )}
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-foreground group-hover:text-accent transition">
                        {product.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                        {product.shortDescription}
                      </p>
                    </div>

                    {/* Preview of first 3 sizes right on card */}
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted">
                        <span>Available Sizes ({product.sizes.length})</span>
                        <span>Price ({product.baseUnit})</span>
                      </div>
                      <div className="space-y-1.5">
                        {product.sizes.slice(0, 3).map((sz) => (
                          <div
                            key={sz.id}
                            className="flex items-center justify-between rounded-lg bg-surface-secondary/60 px-2.5 py-1.5 text-xs"
                          >
                            <span className="truncate font-medium text-foreground pr-2">
                              {sz.sizeLabel}
                            </span>
                            <span className="shrink-0 font-bold text-accent">
                              {formatCurrency(sz.unitPrice)}
                            </span>
                          </div>
                        ))}
                        {product.sizes.length > 3 && (
                          <div className="text-center text-[11px] text-muted pt-0.5">
                            + {product.sizes.length - 3} more sizes & bulk
                            discounts
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-separator bg-surface-secondary/30 px-5 py-3.5">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted">
                        Starts at
                      </div>
                      <div className="text-base font-extrabold text-foreground">
                        {lowestSize ? formatCurrency(lowestSize.unitPrice) : "—"}{" "}
                        <span className="text-xs font-normal text-muted">
                          {product.baseUnit}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => setSelectedProduct(product)}
                    >
                      <Ruler className="h-3.5 w-3.5" />
                      See Price Per Size
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* WORKFLOW PILLARS */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 rounded-3xl border border-separator bg-surface p-8 md:grid-cols-4">
          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">
              1. Pick Size & Specs
            </h3>
            <p className="text-xs leading-relaxed text-muted">
              Click any print line to compare standard sizes, 100+ and 500+
              volume rates, paper GSM, and lamination.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-500">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">
              2. Quote or Direct Order
            </h3>
            <p className="text-xs leading-relaxed text-muted">
              Need custom dimensions or multi-SKU splits? Request a formal
              quotation (<code className="font-mono">QT-...</code>) or place an
              order right away.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-500">
              <Headset className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">
              3. Queued Support Chat
            </h3>
            <p className="text-xs leading-relaxed text-muted">
              Join our live ticket queue to verify artwork bleeds, negotiate
              rush schedules, and talk directly with our estimators.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/12 text-fuchsia-500">
              <PackageCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-foreground">
              4. Track Reference #
            </h3>
            <p className="text-xs leading-relaxed text-muted">
              Follow your job from Pre-Press Check to Printing, Finishing, and
              Ready for Pickup using your Reference Number or Account.
            </p>
          </div>
        </div>
      </section>

      {/* ROLE PORTALS BANNER */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-separator bg-surface p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <Chip size="sm" color="accent" variant="soft">
                Customer Accounts
              </Chip>
              <h3 className="text-xl font-bold text-foreground">
                Manage Repeat Print Runs & Approved Quotes
              </h3>
              <p className="text-sm text-muted">
                Create a free customer account to save all your Quotation
                References, convert approved quotes into production orders in
                one click, and keep your chat ticket history.
              </p>
            </div>
            <div>
              <Link href="/account">
                <Button variant="primary">
                  Create / Open Customer Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="border border-separator bg-surface p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <Chip size="sm" color="warning" variant="soft">
                Staff & Super Admin Portals
              </Chip>
              <h3 className="text-xl font-bold text-foreground">
                Employee Order Desk, Chat Queue & Super Admin Pricing
              </h3>
              <p className="text-sm text-muted">
                Employees respond to inquiries, take walk-in counter orders with
                reference slips, and claim queued chat tickets. Super Admins
                manage products, per-size pricing, staff roles, and shop
                settings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/staff/login">
                <Button variant="secondary">
                  <ShieldCheck className="h-4 w-4" />
                  Open Staff Login Portal
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <ProductPriceModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
