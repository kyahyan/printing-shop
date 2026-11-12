"use client";

import Link from "next/link";
import { Clock, Mail, MapPin, Phone, Printer } from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";

export function Footer() {
  const { settings } = usePrintShop();

  return (
    <footer className="mt-20 border-t border-separator bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Printer className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-foreground">
                {settings.shopName}
              </span>
            </div>
            <p className="max-w-md text-sm text-muted">{settings.tagline}</p>
            <div className="rounded-xl border border-separator bg-surface-secondary/60 p-3 text-xs text-muted">
              <strong className="text-foreground">Payment & Production Policy: </strong>
              {settings.paymentInstructions}
            </div>
          </div>

          <div className="space-y-2.5 text-sm">
            <h4 className="font-semibold text-foreground">Customer Services</h4>
            <ul className="space-y-2 text-muted">
              <li>
                <Link href="/products" className="hover:text-foreground">
                  Products & Price-Per-Size Matrix
                </Link>
              </li>
              <li>
                <Link href="/quotations" className="hover:text-foreground">
                  Request Custom Quotation
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-foreground">
                  Track Order / Quote Reference #
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-foreground">
                  Live Chat Support Queue
                </Link>
              </li>
              <li>
                <Link href="/staff/login" className="hover:text-foreground">
                  Employee & Super Admin Login
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <h4 className="font-semibold text-foreground">Print Shop Contact</h4>
            <ul className="space-y-2 text-muted">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{settings.shopAddress}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-accent" />
                <span>{settings.contactPhone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-accent" />
                <span>{settings.contactEmail}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-accent" />
                <span>{settings.businessHours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-separator pt-6 text-xs text-muted">
          <span>
            © 2026 {settings.shopName}. All rights reserved.
          </span>
          <span>
            Currency: {settings.currencyCode} ({settings.currencySymbol}) • Tax/VAT:{" "}
            {settings.taxRate}%
          </span>
        </div>
      </div>
    </footer>
  );
}
