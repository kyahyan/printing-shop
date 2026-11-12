"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Chip } from "@heroui/react";
import { AlertCircle, CheckCircle2, Search } from "lucide-react";
import {
  type ReferenceLookupResult,
  usePrintShop,
} from "@/context/PrintShopContext";
import type { ProductionStatus } from "@/types/printshop";

const PRODUCTION_STEPS: { key: ProductionStatus; label: string }[] = [
  { key: "received", label: "Received" },
  { key: "prepress_check", label: "Pre-Press" },
  { key: "printing", label: "Printing" },
  { key: "finishing", label: "Finishing" },
  { key: "ready_for_pickup", label: "Ready" },
  { key: "completed", label: "Completed" },
];

function TrackContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || "";

  const {
    lookupReference,
    formatCurrency,
    convertQuotationToOrder,
    getQueuePosition,
    settings,
  } = usePrintShop();

  const [query, setQuery] = useState(initialRef);
  const [searchedRef, setSearchedRef] = useState(initialRef);
  const [result, setResult] = useState<ReferenceLookupResult>({ found: false });
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [convertedOrderRef, setConvertedOrderRef] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (initialRef) {
      setQuery(initialRef);
      setSearchedRef(initialRef);
    }
  }, [initialRef]);

  useEffect(() => {
    let active = true;
    const trimmed = searchedRef.trim();
    if (!trimmed) {
      setResult({ found: false });
      setLoading(false);
      return;
    }

    setLoading(true);
    setActionError(null);
    lookupReference(trimmed)
      .then((res) => {
        if (active) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setResult({ found: false });
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [lookupReference, searchedRef]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setConvertedOrderRef(null);
    setActionError(null);
    setSearchedRef(query.trim());
  };

  const handleAcceptQuote = async (referenceNumber: string) => {
    if (approving) return;
    setApproving(true);
    setActionError(null);
    try {
      const newOrd = await convertQuotationToOrder(referenceNumber, {
        paymentStatus: "unpaid",
        paymentMethod: "bank_transfer",
        deliveryMethod: "pickup",
      });
      if (newOrd) {
        setConvertedOrderRef(newOrd.referenceNumber);
        setQuery(newOrd.referenceNumber);
        setSearchedRef(newOrd.referenceNumber);
      } else {
        setActionError(
          "Unable to convert quotation. Ensure the quotation is still valid."
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to convert quotation to order."
      );
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
      <div className="border-b border-separator pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          Status Verification
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Reference Lookup
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Enter an exact Order (
          <code className="font-mono text-xs text-foreground">
            {settings.orderPrefix}-...
          </code>
          ), Quotation (
          <code className="font-mono text-xs text-foreground">
            {settings.quotePrefix}-...
          </code>
          ), or Support Ticket (
          <code className="font-mono text-xs text-foreground">
            {settings.ticketPrefix}-...
          </code>
          ) reference code.
        </p>
      </div>

      {/* Search Form */}
      <Card className="border border-separator bg-surface p-4">
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-2.5 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${settings.orderPrefix}-2026-..., ${settings.quotePrefix}-2026-..., or ${settings.ticketPrefix}-...`}
              className="h-10 w-full rounded-lg border border-separator bg-background pl-10 pr-4 font-mono text-sm text-foreground outline-none placeholder:font-sans focus:border-accent"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            className="h-10"
            isDisabled={loading}
          >
            {loading ? "Checking..." : "Look Up Reference"}
          </Button>
        </form>
      </Card>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {convertedOrderRef && (
        <div className="flex items-center gap-2.5 rounded-lg border border-separator bg-surface px-4 py-3 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            Quotation approved and converted to Production Order{" "}
            <strong className="font-mono">{convertedOrderRef}</strong>.
          </span>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
          Retrieving reference record...
        </Card>
      )}

      {/* ORDER RESULT */}
      {!loading && result.order && (
        <Card className="border border-separator bg-surface p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-separator pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-lg font-semibold text-foreground">
                  {result.order.referenceNumber}
                </span>
                <Chip
                  size="sm"
                  color={
                    result.order.paymentStatus === "paid"
                      ? "success"
                      : result.order.paymentStatus === "downpayment_paid"
                        ? "warning"
                        : "default"
                  }
                  variant="soft"
                >
                  {result.order.paymentStatus.replace(/_/g, " ")}
                </Chip>
              </div>
              <p className="mt-1 text-xs text-muted">
                Client:{" "}
                <span className="font-medium text-foreground">
                  {result.order.customerName}
                </span>{" "}
                · Channel: {result.order.orderSource.replace(/_/g, " ")}
                {result.order.takenByName
                  ? ` · Coordinator: ${result.order.takenByName}`
                  : ""}
              </p>
            </div>
            <Link
              href={`/chat?ref=${encodeURIComponent(result.order.referenceNumber)}`}
            >
              <Button size="sm" variant="secondary">
                Open Support Ticket
              </Button>
            </Link>
          </div>

          {/* Production Stage Bar */}
          {result.order.productionStatus !== "cancelled" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted">
                  Production Stage
                </span>
                {result.order.estimatedCompletion && (
                  <span className="text-muted tabular-nums">
                    Scheduled completion: {result.order.estimatedCompletion}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                {PRODUCTION_STEPS.map((step, idx) => {
                  const currentIdx = PRODUCTION_STEPS.findIndex(
                    (s) => s.key === result.order?.productionStatus
                  );
                  const done = idx <= currentIdx;
                  const current = idx === currentIdx;
                  return (
                    <div
                      key={step.key}
                      className={`rounded-lg border px-3 py-2.5 text-xs ${
                        current
                          ? "border-foreground bg-foreground text-background font-medium"
                          : done
                            ? "border-separator bg-surface-secondary text-foreground font-medium"
                            : "border-separator bg-background text-muted"
                      }`}
                    >
                      <div className="font-mono text-[10px] opacity-75">
                        0{idx + 1}
                      </div>
                      <div className="mt-0.5 truncate">{step.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <Chip color="danger" variant="soft">
                Order Cancelled
              </Chip>
            </div>
          )}

          {/* Items Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Specification Items
            </h3>
            <div className="divide-y divide-separator rounded-lg border border-separator">
              {result.order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs tabular-nums"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {item.productName} — {item.sizeLabel}
                    </div>
                    <div className="mt-0.5 text-muted">
                      {item.material} · {item.finish} ·{" "}
                      <span className="font-mono">
                        {item.quantity.toLocaleString()} ×{" "}
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  </div>
                  <div className="font-mono font-medium text-foreground">
                    {formatCurrency(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="flex flex-col items-end space-y-1.5 border-t border-separator pt-4 text-xs tabular-nums">
            <div className="flex w-64 justify-between text-muted">
              <span>Net Subtotal</span>
              <span className="font-mono text-foreground">
                {formatCurrency(result.order.subtotal)}
              </span>
            </div>
            {result.order.discountAmount > 0 && (
              <div className="flex w-64 justify-between text-muted">
                <span>Discount</span>
                <span className="font-mono text-foreground">
                  -{formatCurrency(result.order.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex w-64 justify-between text-muted">
              <span>VAT ({settings.taxRate}%)</span>
              <span className="font-mono text-foreground">
                {formatCurrency(result.order.taxAmount)}
              </span>
            </div>
            <div className="flex w-64 justify-between border-t border-separator pt-1.5 text-sm font-semibold text-foreground">
              <span>Total Amount</span>
              <span className="font-mono">
                {formatCurrency(result.order.totalAmount)}
              </span>
            </div>
            <div className="flex w-64 justify-between text-muted">
              <span>Paid to Date</span>
              <span className="font-mono text-foreground">
                {formatCurrency(result.order.amountPaid)}
              </span>
            </div>
            <div className="flex w-64 justify-between font-medium text-foreground">
              <span>Balance Due</span>
              <span className="font-mono text-accent">
                {formatCurrency(
                  Math.max(0, result.order.totalAmount - result.order.amountPaid)
                )}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* QUOTATION / INQUIRY RESULT */}
      {!loading && result.inquiry && (
        <Card className="border border-separator bg-surface p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-separator pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-lg font-semibold text-foreground">
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
                  {result.inquiry.status.replace(/_/g, " ")}
                </Chip>
              </div>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                {result.inquiry.subject}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Prepared for {result.inquiry.customerName}
                {result.inquiry.companyName
                  ? ` (${result.inquiry.companyName})`
                  : ""}
              </p>
            </div>

            <Link
              href={`/chat?ref=${encodeURIComponent(result.inquiry.referenceNumber)}`}
            >
              <Button size="sm" variant="secondary">
                Consult Estimator
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border border-separator bg-background p-4 space-y-2">
              <div className="font-semibold uppercase tracking-wider text-muted">
                Submitted Specifications
              </div>
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Product</dt>
                  <dd className="text-right font-medium text-foreground">
                    {result.inquiry.productName}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Size</dt>
                  <dd className="text-right text-foreground">
                    {result.inquiry.selectedSize}
                  </dd>
                </div>
                {result.inquiry.customDimensions && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Custom Trim</dt>
                    <dd className="text-right font-mono text-foreground">
                      {result.inquiry.customDimensions}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Stock & Finish</dt>
                  <dd className="text-right text-foreground">
                    {result.inquiry.material} · {result.inquiry.finish}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Quantity</dt>
                  <dd className="text-right font-mono font-medium text-foreground tabular-nums">
                    {result.inquiry.quantity.toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-separator bg-background p-4 flex flex-col justify-between space-y-4 tabular-nums">
              {result.inquiry.quotedTotal != null ? (
                <>
                  <div className="space-y-2">
                    <div className="font-semibold uppercase tracking-wider text-muted">
                      Issued Quotation
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Unit Rate</span>
                      <span className="font-mono text-foreground">
                        {formatCurrency(result.inquiry.quotedUnitPrice || 0)}
                      </span>
                    </div>
                    {(result.inquiry.quotedSetupFee || 0) > 0 && (
                      <div className="flex justify-between text-muted">
                        <span>Setup / Tooling</span>
                        <span className="font-mono text-foreground">
                          {formatCurrency(result.inquiry.quotedSetupFee || 0)}
                        </span>
                      </div>
                    )}
                    {(result.inquiry.quotedDiscount || 0) > 0 && (
                      <div className="flex justify-between text-muted">
                        <span>Adjustment</span>
                        <span className="font-mono text-foreground">
                          -{formatCurrency(result.inquiry.quotedDiscount || 0)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-separator pt-2 text-sm font-semibold text-foreground">
                      <span>Net Quoted Total</span>
                      <span className="font-mono">
                        {formatCurrency(result.inquiry.quotedTotal)}
                      </span>
                    </div>
                    {result.inquiry.validUntil && (
                      <div className="text-[11px] text-muted">
                        Valid through {result.inquiry.validUntil} · Issued by{" "}
                        {result.inquiry.handledByName || "Estimating Desk"}
                      </div>
                    )}
                  </div>

                  {result.inquiry.staffRemarks && (
                    <div className="rounded-md border border-separator bg-surface px-3 py-2 text-xs text-muted">
                      <span className="font-medium text-foreground">
                        Estimator Remarks:{" "}
                      </span>
                      {result.inquiry.staffRemarks}
                    </div>
                  )}

                  {result.inquiry.status === "quoted" && (
                    <Button
                      variant="primary"
                      isDisabled={approving}
                      onPress={() =>
                        handleAcceptQuote(result.inquiry!.referenceNumber)
                      }
                    >
                      {approving
                        ? "Converting..."
                        : "Approve Quote & Place Order"}
                    </Button>
                  )}

                  {result.inquiry.convertedOrderRef && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(result.inquiry!.convertedOrderRef!);
                        setSearchedRef(result.inquiry!.convertedOrderRef!);
                      }}
                      className="text-left text-xs font-medium text-accent hover:underline"
                    >
                      View Production Order {result.inquiry.convertedOrderRef} →
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-1.5">
                  <div className="font-semibold text-foreground">
                    Pending Estimator Evaluation
                  </div>
                  <p className="leading-relaxed text-muted">
                    Our pre-press estimators are computing sheet imposition and
                    run pricing for this inquiry. Once finalized, your itemized
                    schedule will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* CHAT TICKET RESULT */}
      {!loading && result.ticket && (
        <Card className="border border-separator bg-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-lg font-semibold text-foreground">
                {result.ticket.ticketNumber}
              </div>
              <div className="mt-0.5 text-xs text-muted">
                Subject: {result.ticket.topic} · Client:{" "}
                {result.ticket.customerName}
              </div>
            </div>
            <Chip
              size="sm"
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
                ? `Queue #${result.ticket.queuePosition ?? (getQueuePosition(result.ticket.id) || 1)}`
                : result.ticket.status}
            </Chip>
          </div>
          <div>
            <Link href={`/chat?ticket=${encodeURIComponent(result.ticket.id)}`}>
              <Button variant="primary" size="sm">
                Open Support Thread
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {!loading && !searchedRef && (
        <Card className="border border-separator bg-surface p-10 text-center space-y-1.5">
          <h3 className="text-sm font-semibold text-foreground">
            Enter a Reference Code Above
          </h3>
          <p className="text-xs text-muted">
            Provide your Quotation, Order, or Support Ticket reference number to
            inspect live production status and financial details.
          </p>
        </Card>
      )}

      {!loading &&
        searchedRef &&
        !result.order &&
        !result.inquiry &&
        !result.ticket && (
          <Card className="border border-separator bg-surface p-10 text-center space-y-1.5">
            <h3 className="text-base font-semibold text-foreground">
              No record located for &ldquo;{searchedRef}&rdquo;
            </h3>
            <p className="text-xs text-muted">
              Verify the exact reference code including prefix (
              {settings.orderPrefix}-, {settings.quotePrefix}-, or{" "}
              {settings.ticketPrefix}-) and try again.
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
          Loading Reference Lookup...
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
