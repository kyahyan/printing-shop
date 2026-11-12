"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Chip } from "@heroui/react";
import {
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  MessageSquare,
  Package,
  Printer,
  Search,
  ShoppingBag,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { ProductionStatus } from "@/types/printshop";

const PRODUCTION_STEPS: { key: ProductionStatus; label: string }[] = [
  { key: "received", label: "Order Received" },
  { key: "prepress_check", label: "Pre-Press & Proof" },
  { key: "printing", label: "On Press" },
  { key: "finishing", label: "Cutting & Laminating" },
  { key: "ready_for_pickup", label: "Ready / Dispatch" },
  { key: "completed", label: "Completed" },
];

function TrackContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || "";

  const {
    findByReference,
    formatCurrency,
    convertQuotationToOrder,
    getQueuePosition,
    settings,
  } = usePrintShop();

  const [query, setQuery] = useState(initialRef);
  const [searchedRef, setSearchedRef] = useState(initialRef);
  const [convertedOrderRef, setConvertedOrderRef] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (initialRef) {
      setQuery(initialRef);
      setSearchedRef(initialRef);
    }
  }, [initialRef]);

  const result = findByReference(searchedRef);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setConvertedOrderRef(null);
    setSearchedRef(query.trim());
  };

  const handleAcceptQuote = async (inquiryId: string) => {
    const newOrd = await convertQuotationToOrder(inquiryId, {
      paymentStatus: "unpaid",
      paymentMethod: "bank_transfer",
      deliveryMethod: "pickup",
    });
    if (newOrd) {
      setConvertedOrderRef(newOrd.referenceNumber);
      setQuery(newOrd.referenceNumber);
      setSearchedRef(newOrd.referenceNumber);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <div className="text-center space-y-2">
        <Chip size="sm" color="accent" variant="soft">
          Real-Time Reference Lookup
        </Chip>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Track Quotation, Order, or Ticket Reference
        </h1>
        <p className="text-sm text-muted">
          Enter your <code className="font-mono">{settings.quotePrefix}-...</code>,{" "}
          <code className="font-mono">{settings.orderPrefix}-...</code>, or{" "}
          <code className="font-mono">{settings.ticketPrefix}-...</code> Reference
          Number below.
        </p>
      </div>

      {/* Search Form */}
      <Card className="border border-separator bg-surface p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Enter Reference Number (e.g., ${settings.quotePrefix}-..., ${settings.orderPrefix}-..., or ${settings.ticketPrefix}-...)`}
              className="w-full rounded-xl border border-separator bg-surface-secondary/50 py-2.5 pl-10 pr-4 font-mono text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <Button type="submit" variant="primary">
            Lookup Reference
          </Button>
        </form>
      </Card>

      {convertedOrderRef && (
        <Card className="border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-foreground">
          Quotation approved and converted to Production Order{" "}
          <strong className="font-mono text-emerald-500">
            {convertedOrderRef}
          </strong>
          !
        </Card>
      )}

      {/* ORDER RESULT */}
      {result.order && (
        <Card className="border border-separator bg-surface p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-separator pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                <span className="font-mono text-xl font-extrabold text-accent">
                  {result.order.referenceNumber}
                </span>
                <Chip
                  size="sm"
                  color={
                    result.order.paymentStatus === "paid"
                      ? "success"
                      : result.order.paymentStatus === "downpayment_paid"
                      ? "warning"
                      : "danger"
                  }
                  variant="soft"
                >
                  Payment: {result.order.paymentStatus.replace("_", " ")}
                </Chip>
              </div>
              <p className="mt-1 text-sm text-muted">
                Customer:{" "}
                <strong className="text-foreground">
                  {result.order.customerName}
                </strong>{" "}
                • Source: {result.order.orderSource.replace("_", " ")}
                {result.order.takenByName
                  ? ` • Handled by ${result.order.takenByName}`
                  : ""}
              </p>
            </div>
            <Link href={`/chat?ref=${result.order.referenceNumber}`}>
              <Button size="sm" variant="secondary">
                <MessageSquare className="h-4 w-4" />
                Open Support Ticket
              </Button>
            </Link>
          </div>

          {/* Visual Production Stepper */}
          {result.order.productionStatus !== "cancelled" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted">
                  Live Print Production Stage
                </span>
                {result.order.estimatedCompletion && (
                  <span className="flex items-center gap-1 text-muted">
                    <Clock className="h-3.5 w-3.5 text-accent" />
                    Est. Completion: {result.order.estimatedCompletion}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                {PRODUCTION_STEPS.map((step, idx) => {
                  const currentIdx = PRODUCTION_STEPS.findIndex(
                    (s) => s.key === result.order?.productionStatus
                  );
                  const done = idx <= currentIdx;
                  return (
                    <div
                      key={step.key}
                      className={`rounded-xl border p-3 text-center text-xs transition ${
                        done
                          ? "border-accent bg-accent/10 text-foreground font-semibold"
                          : "border-separator bg-surface-secondary/40 text-muted"
                      }`}
                    >
                      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold bg-surface">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Chip color="danger" variant="soft">
              Order Cancelled
            </Chip>
          )}

          {/* Items Breakdown */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">
              Order Line Items
            </h3>
            <div className="divide-y divide-separator rounded-xl border border-separator">
              {result.order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3.5 text-xs"
                >
                  <div>
                    <div className="font-bold text-foreground">
                      {item.productName} — {item.sizeLabel}
                    </div>
                    <div className="text-muted">
                      {item.material} • {item.finish} • Qty:{" "}
                      {item.quantity.toLocaleString()} ×{" "}
                      {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                  <div className="font-bold text-foreground">
                    {formatCurrency(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end space-y-1 border-t border-separator pt-4 text-xs">
            <div className="text-muted">
              Subtotal: {formatCurrency(result.order.subtotal)}
            </div>
            {result.order.discountAmount > 0 && (
              <div className="text-emerald-500">
                Discount: -{formatCurrency(result.order.discountAmount)}
              </div>
            )}
            <div className="text-muted">
              Tax ({settings.taxRate}%): {formatCurrency(result.order.taxAmount)}
            </div>
            <div className="text-base font-extrabold text-foreground">
              Total: {formatCurrency(result.order.totalAmount)}
            </div>
            <div className="text-muted">
              Paid: {formatCurrency(result.order.amountPaid)} •{" "}
              <strong className="text-accent">
                Balance Due:{" "}
                {formatCurrency(
                  Math.max(0, result.order.totalAmount - result.order.amountPaid)
                )}
              </strong>
            </div>
          </div>
        </Card>
      )}

      {/* QUOTATION / INQUIRY RESULT */}
      {result.inquiry && (
        <Card className="border border-separator bg-surface p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-separator pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-accent" />
                <span className="font-mono text-xl font-extrabold text-accent">
                  {result.inquiry.referenceNumber}
                </span>
                <Chip
                  size="sm"
                  color={
                    result.inquiry.status === "quoted" ||
                    result.inquiry.status === "approved"
                      ? "success"
                      : result.inquiry.status === "converted_to_order"
                      ? "accent"
                      : "warning"
                  }
                  variant="soft"
                >
                  {result.inquiry.status.replace(/_/g, " ").toUpperCase()}
                </Chip>
              </div>
              <h2 className="mt-1 text-lg font-bold text-foreground">
                {result.inquiry.subject}
              </h2>
              <p className="text-xs text-muted">
                Requested by {result.inquiry.customerName}
                {result.inquiry.companyName
                  ? ` (${result.inquiry.companyName})`
                  : ""}
              </p>
            </div>

            <Link href={`/chat?ref=${result.inquiry.referenceNumber}`}>
              <Button size="sm" variant="secondary">
                <MessageSquare className="h-4 w-4" />
                Chat With Estimator
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-xl bg-surface-secondary/50 p-4 space-y-1.5">
              <div className="font-semibold text-foreground">
                Requested Specifications
              </div>
              <div className="text-muted">
                Product:{" "}
                <span className="text-foreground">
                  {result.inquiry.productName}
                </span>
              </div>
              <div className="text-muted">
                Size:{" "}
                <span className="text-foreground">
                  {result.inquiry.selectedSize}
                </span>
              </div>
              {result.inquiry.customDimensions && (
                <div className="text-muted">
                  Custom Cut:{" "}
                  <span className="text-foreground">
                    {result.inquiry.customDimensions}
                  </span>
                </div>
              )}
              <div className="text-muted">
                Material & Finish:{" "}
                <span className="text-foreground">
                  {result.inquiry.material} • {result.inquiry.finish}
                </span>
              </div>
              <div className="text-muted">
                Quantity:{" "}
                <strong className="text-foreground">
                  {result.inquiry.quantity.toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="rounded-xl border border-separator bg-surface p-4 flex flex-col justify-between space-y-3">
              {result.inquiry.quotedTotal != null ? (
                <>
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground">
                      Official Estimator Quotation
                    </div>
                    <div className="text-muted">
                      Quoted Unit Rate:{" "}
                      <strong className="text-foreground">
                        {formatCurrency(result.inquiry.quotedUnitPrice || 0)}
                      </strong>
                    </div>
                    {(result.inquiry.quotedSetupFee || 0) > 0 && (
                      <div className="text-muted">
                        Setup / Die Fee:{" "}
                        {formatCurrency(result.inquiry.quotedSetupFee || 0)}
                      </div>
                    )}
                    {(result.inquiry.quotedDiscount || 0) > 0 && (
                      <div className="text-emerald-500">
                        Estimator Discount: -
                        {formatCurrency(result.inquiry.quotedDiscount || 0)}
                      </div>
                    )}
                    <div className="pt-2 text-xl font-extrabold text-accent">
                      Quoted Net Total:{" "}
                      {formatCurrency(result.inquiry.quotedTotal)}
                    </div>
                    {result.inquiry.validUntil && (
                      <div className="text-[11px] text-muted">
                        Valid until: {result.inquiry.validUntil} • Prepared by{" "}
                        {result.inquiry.handledByName || "Staff"}
                      </div>
                    )}
                  </div>

                  {result.inquiry.staffRemarks && (
                    <div className="rounded-lg bg-accent/10 p-2.5 text-xs text-foreground">
                      <strong>Estimator Note:</strong>{" "}
                      {result.inquiry.staffRemarks}
                    </div>
                  )}

                  {result.inquiry.status === "quoted" && (
                    <Button
                      variant="primary"
                      onPress={() => handleAcceptQuote(result.inquiry!.id)}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Approve Quote & Convert to Order
                    </Button>
                  )}

                  {result.inquiry.convertedOrderRef && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(result.inquiry!.convertedOrderRef!);
                        setSearchedRef(result.inquiry!.convertedOrderRef!);
                      }}
                      className="text-left text-xs font-semibold text-accent hover:underline"
                    >
                      View Converted Order {result.inquiry.convertedOrderRef} →
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-2 text-muted">
                  <Printer className="h-6 w-6 text-amber-500" />
                  <div className="font-semibold text-foreground">
                    Estimator Review in Progress
                  </div>
                  <p>
                    Our print estimators are computing paper imposition and
                    volume pricing for your request. Check back shortly or open
                    a live chat ticket!
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* CHAT TICKET RESULT */}
      {result.ticket && (
        <Card className="border border-separator bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-xl font-extrabold text-accent">
                {result.ticket.ticketNumber}
              </div>
              <div className="text-sm text-muted">
                Topic: {result.ticket.topic} • Customer:{" "}
                {result.ticket.customerName}
              </div>
            </div>
            <Chip
              color={
                result.ticket.status === "active"
                  ? "success"
                  : result.ticket.status === "queued"
                  ? "warning"
                  : "default"
              }
              variant="soft"
            >
              {result.ticket.status === "queued"
                ? `#${getQueuePosition(result.ticket.id)} in Queue`
                : result.ticket.status.toUpperCase()}
            </Chip>
          </div>
          <Link href={`/chat?ticket=${result.ticket.id}`}>
            <Button variant="primary">Open Live Chat Conversation</Button>
          </Link>
        </Card>
      )}

      {!searchedRef && (
        <Card className="border border-dashed border-separator bg-surface p-10 text-center space-y-2">
          <Search className="mx-auto h-7 w-7 text-muted" />
          <h3 className="text-base font-bold text-foreground">
            Enter a Reference Number Above
          </h3>
          <p className="text-xs text-muted">
            Paste your Quotation (<code className="font-mono">{settings.quotePrefix}-...</code>), Order (<code className="font-mono">{settings.orderPrefix}-...</code>), or Support Ticket (<code className="font-mono">{settings.ticketPrefix}-...</code>) Reference Number to check real-time progress.
          </p>
        </Card>
      )}

      {searchedRef && !result.order && !result.inquiry && !result.ticket && (
        <Card className="border border-separator bg-surface p-10 text-center space-y-2">
          <h3 className="text-lg font-bold text-foreground">
            No matching record for &ldquo;{searchedRef}&rdquo;
          </h3>
          <p className="text-xs text-muted">
            Double-check the prefix ({settings.quotePrefix}-,{" "}
            {settings.orderPrefix}-, or {settings.ticketPrefix}-) and try again.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted">
          Loading Reference Tracker...
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}

