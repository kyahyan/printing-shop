"use client";

import {
  Clock,
  Envelope,
  Handset,
  MapPin,
  Printer,
} from "@gravity-ui/icons";
import { Chip, Link, Separator, Surface, Typography } from "@heroui/react";
import { usePrintShop } from "@/context/PrintShopContext";

export function Footer() {
  const { settings } = usePrintShop();

  return (
    <footer className="mt-20 border-t border-separator bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="space-y-4 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Printer className="size-4" />
              </div>
              <span className="text-base font-semibold tracking-tight text-foreground">
                {settings.shopName}
              </span>
            </div>

            <Typography.Paragraph color="muted" size="sm" className="max-w-md">
              {settings.tagline}
            </Typography.Paragraph>

            <Surface variant="secondary" className="rounded-2xl p-4">
              <div className="mb-1 text-xs font-semibold text-foreground">
                Terms & Production Policy
              </div>
              <p className="text-xs leading-relaxed text-muted">
                {settings.paymentInstructions}
              </p>
            </Surface>
          </div>

          <div className="space-y-3 md:col-span-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Services & Desk
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <Link
                  href="/products"
                  className="text-sm text-muted no-underline hover:text-foreground"
                >
                  Catalog & Pricing Schedules
                </Link>
              </li>
              <li>
                <Link
                  href="/quotations"
                  className="text-sm text-muted no-underline hover:text-foreground"
                >
                  Formal Quotation Request
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="text-sm text-muted no-underline hover:text-foreground"
                >
                  Order & Quote Tracking
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  className="text-sm text-muted no-underline hover:text-foreground"
                >
                  Client Support Queue
                </Link>
              </li>
              <li>
                <Link
                  href="/staff/login"
                  className="text-sm text-muted no-underline hover:text-foreground"
                >
                  Staff & Administration
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3 md:col-span-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Studio Information
            </div>
            <Surface variant="secondary" className="rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5 text-xs">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted" />
                <span className="text-foreground">{settings.shopAddress}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-2.5 text-xs">
                <Handset className="size-3.5 shrink-0 text-muted" />
                <span className="font-mono text-foreground tabular-nums">
                  {settings.contactPhone}
                </span>
              </div>
              <Separator />
              <div className="flex items-center gap-2.5 text-xs">
                <Envelope className="size-3.5 shrink-0 text-muted" />
                <span className="text-foreground">{settings.contactEmail}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-2.5 text-xs">
                <Clock className="size-3.5 shrink-0 text-muted" />
                <span className="text-foreground">{settings.businessHours}</span>
              </div>
            </Surface>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted tabular-nums">
          <span>© 2026 {settings.shopName}. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="soft" color="default">
              <Chip.Label>
                {settings.currencyCode} ({settings.currencySymbol})
              </Chip.Label>
            </Chip>
            <Chip size="sm" variant="soft" color="default">
              <Chip.Label>VAT {settings.taxRate}%</Chip.Label>
            </Chip>
            <Chip size="sm" variant="soft" color="default">
              <Chip.Label>
                Quote Validity: {settings.quotationValidityDays}d
              </Chip.Label>
            </Chip>
          </div>
        </div>
      </div>
    </footer>
  );
}
