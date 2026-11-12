"use client";

import Link from "next/link";
import { usePrintShop } from "@/context/PrintShopContext";

export function Footer() {
  const { settings } = usePrintShop();

  return (
    <footer className="mt-24 border-t border-separator bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="space-y-4 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background font-mono text-xs font-semibold">
                CJ
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {settings.shopName}
              </span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              {settings.tagline}
            </p>
            <div className="rounded-lg border border-separator bg-surface-secondary/60 px-3.5 py-3 text-xs leading-relaxed text-muted">
              <span className="font-medium text-foreground">
                Terms & Production Policy:{" "}
              </span>
              {settings.paymentInstructions}
            </div>
          </div>

          <div className="space-y-3 text-sm md:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Services & Desk
            </h4>
            <ul className="space-y-2 text-muted">
              <li>
                <Link
                  href="/products"
                  className="transition-colors hover:text-foreground"
                >
                  Catalog & Pricing Schedules
                </Link>
              </li>
              <li>
                <Link
                  href="/quotations"
                  className="transition-colors hover:text-foreground"
                >
                  Formal Quotation Request
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="transition-colors hover:text-foreground"
                >
                  Reference Lookup
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  className="transition-colors hover:text-foreground"
                >
                  Client Support Queue
                </Link>
              </li>
              <li>
                <Link
                  href="/staff/login"
                  className="transition-colors hover:text-foreground"
                >
                  Staff & Administration
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 text-sm md:col-span-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Studio Information
            </h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-separator/70 pb-1.5">
                <dt className="text-muted">Location</dt>
                <dd className="text-right text-foreground">
                  {settings.shopAddress}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-separator/70 pb-1.5">
                <dt className="text-muted">Telephone</dt>
                <dd className="text-right font-mono text-xs text-foreground tabular-nums">
                  {settings.contactPhone}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-separator/70 pb-1.5">
                <dt className="text-muted">Email</dt>
                <dd className="text-right text-foreground">
                  {settings.contactEmail}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Hours</dt>
                <dd className="text-right text-foreground">
                  {settings.businessHours}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-separator pt-6 text-xs text-muted tabular-nums">
          <span>© 2026 {settings.shopName}. All rights reserved.</span>
          <span>
            Settlement Currency: {settings.currencyCode} ({settings.currencySymbol}) ·
            Applicable VAT: {settings.taxRate}% · Quote Validity:{" "}
            {settings.quotationValidityDays} days
          </span>
        </div>
      </div>
    </footer>
  );
}
