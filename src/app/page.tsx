"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import { ArrowRight, Search } from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { Product } from "@/types/printshop";
import { ProductPriceModal } from "@/components/ProductPriceModal";

export default function HomePage() {
  const router = useRouter();
  const {
    settings,
    products,
    tickets,
    currentUser,
    queueSummary,
    formatCurrency,
  } = usePrintShop();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [refQuery, setRefQuery] = useState("");

  const activeProducts = products.filter((p) => p.isActive);
  const totalSizeTiers = activeProducts.reduce(
    (acc, p) => acc + p.sizes.length,
    0
  );

  const isStaff =
    currentUser?.role === "employee" || currentUser?.role === "super_admin";
  const queuedTickets = isStaff
    ? tickets.filter((t) => t.status === "queued").length
    : queueSummary.queuedTickets;

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refQuery.trim()) return;
    router.push(`/track?ref=${encodeURIComponent(refQuery.trim())}`);
  };

  return (
    <div className="space-y-20">
      {/* ARCHITECTURAL HERO */}
      <section className="border-b border-separator bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-start gap-12 lg:grid-cols-12">
            <div className="space-y-7 lg:col-span-7">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
                  Commercial Print & Production Desk
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]">
                  Precision commercial printing priced by exact specification.
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-muted">
                  {settings.tagline}. Inspect published per-size unit schedules,
                  volume breaks, and paper substrates, or submit custom project
                  specifications for a formal quotation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/products">
                  <Button variant="primary" size="lg">
                    Browse Catalog & Pricing
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/quotations">
                  <Button variant="secondary" size="lg">
                    Request Formal Quotation
                  </Button>
                </Link>
              </div>

              {/* Reference Lookup */}
              <div className="max-w-xl pt-2">
                <label
                  htmlFor="hero-ref-input"
                  className="mb-2 block text-xs font-medium text-muted"
                >
                  Track an existing order, quotation, or support ticket
                </label>
                <form
                  onSubmit={handleTrackSubmit}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="hero-ref-input"
                      value={refQuery}
                      onChange={(e) => setRefQuery(e.target.value)}
                      placeholder={`${settings.orderPrefix}-2026-..., ${settings.quotePrefix}-2026-..., or ${settings.ticketPrefix}-...`}
                      className="h-10 w-full rounded-lg border border-separator bg-background pl-10 pr-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:font-sans placeholder:text-muted focus:border-accent"
                    />
                  </div>
                  <Button type="submit" variant="secondary" className="h-10">
                    Look Up Reference
                  </Button>
                </form>
              </div>
            </div>

            {/* Studio Operations Ledger Card */}
            <div className="lg:col-span-5">
              <Card className="border border-separator bg-background p-6 shadow-surface space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-separator pb-4">
                  <div>
                    <p className="text-xs font-medium text-muted">
                      Production & Estimating Status
                    </p>
                    <h2 className="mt-0.5 text-base font-semibold text-foreground">
                      {settings.shopName}
                    </h2>
                  </div>
                  <Chip size="sm" color="success" variant="soft">
                    Operational
                  </Chip>
                </div>

                <div className="grid grid-cols-3 divide-x divide-separator rounded-lg border border-separator bg-surface">
                  <div className="p-3.5">
                    <div className="text-[11px] text-muted">Catalog Lines</div>
                    <div className="mt-1 text-xl font-semibold text-foreground tabular-nums">
                      {activeProducts.length}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted tabular-nums">
                      {totalSizeTiers} size specs
                    </div>
                  </div>
                  <div className="p-3.5">
                    <div className="text-[11px] text-muted">Specialists</div>
                    <div className="mt-1 text-xl font-semibold text-foreground tabular-nums">
                      {queueSummary.onlineSpecialists}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      On duty
                    </div>
                  </div>
                  <div className="p-3.5">
                    <div className="text-[11px] text-muted">Support Queue</div>
                    <div className="mt-1 text-xl font-semibold text-foreground tabular-nums">
                      {queuedTickets}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      Waiting
                    </div>
                  </div>
                </div>

                <dl className="space-y-2.5 text-xs">
                  <div className="flex items-baseline justify-between gap-4 border-b border-separator/70 pb-2">
                    <dt className="text-muted">Volume Tiers</dt>
                    <dd className="font-medium text-foreground">
                      Standard · 100+ Bulk · 500+ Wholesale
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-b border-separator/70 pb-2">
                    <dt className="text-muted">Quotation Validity</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {settings.quotationValidityDays} calendar days
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-b border-separator/70 pb-2">
                    <dt className="text-muted">Settlement & Tax</dt>
                    <dd className="font-medium text-foreground tabular-nums">
                      {settings.currencyCode} ({settings.currencySymbol}) ·{" "}
                      {settings.taxRate}% VAT
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted">Operating Hours</dt>
                    <dd className="font-medium text-foreground">
                      {settings.businessHours}
                    </dd>
                  </div>
                </dl>

                <div className="flex items-center justify-between border-t border-separator pt-3 text-xs">
                  <span className="text-muted">
                    Need pre-press or substrate guidance?
                  </span>
                  <Link
                    href="/chat"
                    className="font-medium text-accent hover:underline"
                  >
                    Open Support Desk →
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CATALOG SPECIFICATION DIRECTORY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-separator pb-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Print Catalog & Size Schedules
            </h2>
            <p className="mt-1 text-sm text-muted">
              Select any product line to inspect full dimension matrices, bulk
              unit pricing, paper stocks, and finishing options.
            </p>
          </div>
          {activeProducts.length > 0 && (
            <Link href="/products">
              <Button variant="secondary" size="sm">
                View Full Directory ({activeProducts.length})
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {activeProducts.length === 0 ? (
          <Card className="border border-separator bg-surface p-10">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  No standard catalog schedules published yet
                </h3>
                <p className="max-w-xl text-sm text-muted">
                  Administrators can configure standard print lines and per-size
                  rate tables in the Administration workspace. Clients may
                  submit custom specifications directly through the Quotation
                  Desk.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2.5">
                <Link href="/quotations">
                  <Button variant="primary">Request Custom Quotation</Button>
                </Link>
                {currentUser?.role === "super_admin" ? (
                  <Link href="/admin">
                    <Button variant="secondary">Manage Catalog</Button>
                  </Link>
                ) : (
                  <Link href="/staff/login">
                    <Button variant="secondary">Staff Portal</Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeProducts.map((product) => {
              const lowestSize = [...product.sizes].sort(
                (a, b) => a.unitPrice - b.unitPrice
              )[0];
              return (
                <Card
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="group cursor-pointer border border-separator bg-surface p-0 transition-colors hover:border-foreground/30 flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    <div className="border-b border-separator p-5">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted">
                        <span className="font-medium text-foreground/80">
                          {product.category}
                        </span>
                        <span>Lead time: {product.leadTimeDays}</span>
                      </div>
                      <div className="mt-2.5 flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                          {product.name}
                        </h3>
                        {product.badge && (
                          <span className="shrink-0 rounded bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-muted">
                            {product.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                        {product.shortDescription}
                      </p>
                    </div>

                    <div className="p-5">
                      <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-muted">
                        <span>Size ({product.sizes.length})</span>
                        <span>Rate ({product.baseUnit})</span>
                      </div>
                      <div className="divide-y divide-separator rounded-md border border-separator">
                        {product.sizes.slice(0, 3).map((sz) => (
                          <div
                            key={sz.id}
                            className="flex items-center justify-between px-3 py-2 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-medium text-foreground">
                                {sz.sizeLabel}
                              </span>
                              <span className="ml-1.5 font-mono text-[11px] text-muted">
                                {sz.dimensions}
                              </span>
                            </div>
                            <span className="shrink-0 font-mono font-medium text-foreground tabular-nums">
                              {formatCurrency(sz.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {product.sizes.length > 3 && (
                        <p className="mt-2 text-[11px] text-muted">
                          +{product.sizes.length - 3} additional size options &
                          volume tiers
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-separator bg-surface-secondary/40 px-5 py-3.5">
                    <div className="tabular-nums">
                      <span className="text-[11px] text-muted">From </span>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {lowestSize ? formatCurrency(lowestSize.unitPrice) : "—"}
                      </span>
                      <span className="text-[11px] text-muted">
                        {" "}
                        {product.baseUnit}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => setSelectedProduct(product)}
                    >
                      Configure & Price
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* PRODUCTION PROCESS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-separator bg-surface">
          <div className="border-b border-separator px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Standard Production & Estimating Workflow
            </h2>
          </div>
          <div className="grid divide-y divide-separator md:grid-cols-4 md:divide-x md:divide-y-0">
            <div className="p-6 space-y-2">
              <div className="font-mono text-xs font-medium text-muted">01</div>
              <h3 className="text-sm font-semibold text-foreground">
                Specification & Sizing
              </h3>
              <p className="text-xs leading-relaxed text-muted">
                Select standard dimensions, paper GSM substrates, and lamination
                schedules, or define custom trim dimensions.
              </p>
            </div>
            <div className="p-6 space-y-2">
              <div className="font-mono text-xs font-medium text-muted">02</div>
              <h3 className="text-sm font-semibold text-foreground">
                Direct Order or Formal Quote
              </h3>
              <p className="text-xs leading-relaxed text-muted">
                Place standard runs directly with server-verified pricing or
                request an estimator-reviewed quotation (
                <code className="font-mono text-foreground">QT-...</code>).
              </p>
            </div>
            <div className="p-6 space-y-2">
              <div className="font-mono text-xs font-medium text-muted">03</div>
              <h3 className="text-sm font-semibold text-foreground">
                Pre-Press & Support Queue
              </h3>
              <p className="text-xs leading-relaxed text-muted">
                Consult directly with a pre-press specialist in our live ticket
                queue to verify bleed tolerances, dielines, and schedules.
              </p>
            </div>
            <div className="p-6 space-y-2">
              <div className="font-mono text-xs font-medium text-muted">04</div>
              <h3 className="text-sm font-semibold text-foreground">
                Tracked Production
              </h3>
              <p className="text-xs leading-relaxed text-muted">
                Monitor job progress across Pre-Press, Printing, Finishing,
                Quality Control, and Dispatch using your Reference Number.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PORTAL ACCESS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-separator bg-surface p-6 flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Client Accounts
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                Centralize Repeat Print Runs & Quotations
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                Register a client account to maintain an archive of your
                quotations, convert approved estimates into production orders,
                and access active support tickets.
              </p>
            </div>
            <div>
              <Link href="/account">
                <Button variant="primary">
                  Access Client Portal
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="border border-separator bg-surface p-6 flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Internal Operations
              </p>
              <h3 className="text-lg font-semibold text-foreground">
                Operations Desk & System Administration
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                Authorized staff issue quotations, log walk-in counter orders,
                update press stages, and service queued tickets. Super Admins
                manage catalog pricing and personnel access.
              </p>
            </div>
            <div>
              <Link href="/staff/login">
                <Button variant="secondary">Sign In to Staff Portal</Button>
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
