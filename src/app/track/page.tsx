"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import NextLink from "next/link";
import {
  Check,
  Comments,
  FileText,
  Magnifier,
  ShoppingBag,
  Tray,
} from "@gravity-ui/icons";
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  EmptyState,
  Form,
  Label,
  ProgressBar,
  SearchField,
  Separator,
  Spinner,
  Surface,
  Table,
  Typography,
  toast,
} from "@heroui/react";
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

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
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
        toast.success(`Converted to Order ${newOrd.referenceNumber}`);
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

  const currentStageIdx = result.order
    ? PRODUCTION_STEPS.findIndex(
        (s) => s.key === result.order?.productionStatus
      )
    : -1;
  const progressValue =
    currentStageIdx >= 0
      ? Math.round(((currentStageIdx + 1) / PRODUCTION_STEPS.length) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-8">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Order & Quote Tracking</Breadcrumbs.Item>
      </Breadcrumbs>

      <div>
        <Typography.Heading
          level={1}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Reference Lookup
        </Typography.Heading>
        <Typography.Paragraph color="muted" size="sm" className="mt-1.5">
          Enter an exact Order (
          <Typography.Code>{settings.orderPrefix}-...</Typography.Code>),
          Quotation (
          <Typography.Code>{settings.quotePrefix}-...</Typography.Code>), or
          Support Ticket (
          <Typography.Code>{settings.ticketPrefix}-...</Typography.Code>)
          reference code.
        </Typography.Paragraph>
      </div>

      {/* HeroUI Search Card */}
      <Card className="p-5">
        <Form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <SearchField
            className="flex-1"
            variant="secondary"
            value={query}
            onChange={setQuery}
          >
            <Label>Reference Number</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder={`${settings.orderPrefix}-..., ${settings.quotePrefix}-..., or ${settings.ticketPrefix}-...`}
                className="font-mono placeholder:font-sans"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <Button type="submit" variant="primary" isPending={loading}>
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Magnifier className="size-4" />
                )}
                {isPending ? "Checking..." : "Look Up Reference"}
              </>
            )}
          </Button>
        </Form>
      </Card>

      {actionError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Action Failed</Alert.Title>
            <Alert.Description>{actionError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {convertedOrderRef && (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Quotation Approved</Alert.Title>
            <Alert.Description>
              Converted to Production Order{" "}
              <strong className="font-mono">{convertedOrderRef}</strong>.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* LOADING STATE */}
      {loading && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Spinner size="md" />
            <span className="text-sm text-muted">
              Retrieving reference record...
            </span>
          </div>
        </Card>
      )}

      {/* ORDER RESULT */}
      {!loading && result.order && (
        <Card className="p-6">
          <Card.Header className="flex-row flex-wrap items-start justify-between gap-4">
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
                  <Chip.Label>
                    {result.order.paymentStatus.replace(/_/g, " ")}
                  </Chip.Label>
                </Chip>
              </div>
              <Card.Description className="mt-1">
                Client:{" "}
                <span className="font-medium text-foreground">
                  {result.order.customerName}
                </span>{" "}
                · Channel: {result.order.orderSource.replace(/_/g, " ")}
                {result.order.takenByName
                  ? ` · Coordinator: ${result.order.takenByName}`
                  : ""}
              </Card.Description>
            </div>
            <NextLink
              href={`/chat?ref=${encodeURIComponent(result.order.referenceNumber)}`}
            >
              <Button size="sm" variant="secondary">
                <Comments className="size-3.5" />
                Open Support Ticket
              </Button>
            </NextLink>
          </Card.Header>

          <Card.Content className="space-y-6 pt-4">
            {/* HeroUI ProgressBar + 6-Stage Production Tracker */}
            {result.order.productionStatus !== "cancelled" ? (
              <Surface variant="secondary" className="rounded-2xl p-4 space-y-4">
                <ProgressBar
                  aria-label="Production progress"
                  className="w-full"
                  value={progressValue}
                >
                  <Label>
                    Production Stage:{" "}
                    {PRODUCTION_STEPS[currentStageIdx]?.label ?? "Received"}
                  </Label>
                  <ProgressBar.Output />
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>

                {result.order.estimatedCompletion && (
                  <p className="text-xs text-muted tabular-nums">
                    Scheduled completion: {result.order.estimatedCompletion}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                  {PRODUCTION_STEPS.map((step, idx) => {
                    const done = idx <= currentStageIdx;
                    const current = idx === currentStageIdx;
                    return (
                      <div
                        key={step.key}
                        className={`rounded-xl px-3 py-2 text-xs transition-colors ${
                          current
                            ? "bg-accent text-accent-foreground font-semibold"
                            : done
                              ? "bg-surface text-foreground font-medium"
                              : "bg-surface/50 text-muted"
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
              </Surface>
            ) : (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Order Cancelled</Alert.Title>
                  <Alert.Description>
                    This production order has been marked as cancelled.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                Specification Items
              </div>
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Order items">
                    <Table.Header>
                      <Table.Column isRowHeader>Product & Size</Table.Column>
                      <Table.Column>Stock & Finish</Table.Column>
                      <Table.Column>Run</Table.Column>
                      <Table.Column>Line Total</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {result.order.items.map((item) => (
                        <Table.Row
                          key={item.id}
                          id={item.id}
                          className="tabular-nums"
                        >
                          <Table.Cell className="font-medium text-foreground">
                            {item.productName} — {item.sizeLabel}
                          </Table.Cell>
                          <Table.Cell className="text-xs text-muted">
                            {item.material} · {item.finish}
                          </Table.Cell>
                          <Table.Cell className="font-mono text-xs text-muted">
                            {item.quantity.toLocaleString()} ×{" "}
                            {formatCurrency(item.unitPrice)}
                          </Table.Cell>
                          <Table.Cell className="font-mono font-medium text-foreground">
                            {formatCurrency(item.lineTotal)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>

            <Separator />

            {/* Financial Summary */}
            <div className="flex flex-col items-end space-y-1.5 text-xs tabular-nums">
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
              <Separator className="my-1 w-64" />
              <div className="flex w-64 justify-between text-sm font-semibold text-foreground">
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
                    Math.max(
                      0,
                      result.order.totalAmount - result.order.amountPaid
                    )
                  )}
                </span>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* QUOTATION / INQUIRY RESULT */}
      {!loading && result.inquiry && (
        <Card className="p-6">
          <Card.Header className="flex-row flex-wrap items-start justify-between gap-4">
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
                  <Chip.Label>
                    {result.inquiry.status.replace(/_/g, " ")}
                  </Chip.Label>
                </Chip>
              </div>
              <Card.Title className="mt-1 text-base">
                {result.inquiry.subject}
              </Card.Title>
              <Card.Description>
                Prepared for {result.inquiry.customerName}
                {result.inquiry.companyName
                  ? ` (${result.inquiry.companyName})`
                  : ""}
              </Card.Description>
            </div>

            <NextLink
              href={`/chat?ref=${encodeURIComponent(result.inquiry.referenceNumber)}`}
            >
              <Button size="sm" variant="secondary">
                <Comments className="size-3.5" />
                Consult Estimator
              </Button>
            </NextLink>
          </Card.Header>

          <Card.Content className="grid gap-4 pt-4 text-xs sm:grid-cols-2">
            <Surface variant="secondary" className="rounded-2xl p-4 space-y-2.5">
              <div className="font-semibold uppercase tracking-wider text-muted">
                Submitted Specifications
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted">Product</span>
                <span className="text-right font-medium text-foreground">
                  {result.inquiry.productName}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between gap-3">
                <span className="text-muted">Size</span>
                <span className="text-right text-foreground">
                  {result.inquiry.selectedSize}
                </span>
              </div>
              {result.inquiry.customDimensions && (
                <>
                  <Separator />
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">Custom Trim</span>
                    <span className="text-right font-mono text-foreground">
                      {result.inquiry.customDimensions}
                    </span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between gap-3">
                <span className="text-muted">Stock & Finish</span>
                <span className="text-right text-foreground">
                  {result.inquiry.material} · {result.inquiry.finish}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between gap-3">
                <span className="text-muted">Quantity</span>
                <span className="text-right font-mono font-medium text-foreground tabular-nums">
                  {result.inquiry.quantity.toLocaleString()}
                </span>
              </div>
            </Surface>

            <Surface
              variant="secondary"
              className="flex flex-col justify-between rounded-2xl p-4 space-y-4 tabular-nums"
            >
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
                    <Separator />
                    <div className="flex justify-between pt-1 text-sm font-semibold text-foreground">
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
                    <Surface className="rounded-xl p-3 text-xs text-muted">
                      <span className="font-medium text-foreground">
                        Estimator Remarks:{" "}
                      </span>
                      {result.inquiry.staffRemarks}
                    </Surface>
                  )}

                  {result.inquiry.status === "quoted" && (
                    <Button
                      variant="primary"
                      isPending={approving}
                      onPress={() =>
                        handleAcceptQuote(result.inquiry!.referenceNumber)
                      }
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          {isPending
                            ? "Converting..."
                            : "Approve Quote & Place Order"}
                        </>
                      )}
                    </Button>
                  )}

                  {result.inquiry.convertedOrderRef && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        setQuery(result.inquiry!.convertedOrderRef!);
                        setSearchedRef(result.inquiry!.convertedOrderRef!);
                      }}
                    >
                      <ShoppingBag className="size-3.5" />
                      View Order {result.inquiry.convertedOrderRef}
                    </Button>
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
            </Surface>
          </Card.Content>
        </Card>
      )}

      {/* CHAT TICKET RESULT */}
      {!loading && result.ticket && (
        <Card className="p-6">
          <Card.Header className="flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-lg font-semibold text-foreground">
                {result.ticket.ticketNumber}
              </span>
              <Card.Description className="mt-0.5">
                Subject: {result.ticket.topic} · Client:{" "}
                {result.ticket.customerName}
              </Card.Description>
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
              <Chip.Label>
                {result.ticket.status === "queued"
                  ? `Queue #${result.ticket.queuePosition ?? (getQueuePosition(result.ticket.id) || 1)}`
                  : result.ticket.status}
              </Chip.Label>
            </Chip>
          </Card.Header>
          <Card.Footer>
            <NextLink
              href={`/chat?ticket=${encodeURIComponent(result.ticket.id)}`}
            >
              <Button variant="primary" size="sm">
                <Comments className="size-3.5" />
                Open Support Thread
              </Button>
            </NextLink>
          </Card.Footer>
        </Card>
      )}

      {!loading && !searchedRef && (
        <Card className="p-10">
          <EmptyState className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-default text-muted">
              <FileText className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Enter a Reference Code Above
              </h3>
              <p className="max-w-md text-xs text-muted">
                Provide your Quotation, Order, or Support Ticket reference
                number to inspect live production status and financial details.
              </p>
            </div>
          </EmptyState>
        </Card>
      )}

      {!loading &&
        searchedRef &&
        !result.order &&
        !result.inquiry &&
        !result.ticket && (
          <Card className="p-10">
            <EmptyState className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-default text-muted">
                <Tray className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  No record located for &ldquo;{searchedRef}&rdquo;
                </h3>
                <p className="max-w-md text-xs text-muted">
                  Verify the exact reference code including prefix (
                  {settings.orderPrefix}-, {settings.quotePrefix}-, or{" "}
                  {settings.ticketPrefix}-) and try again.
                </p>
              </div>
            </EmptyState>
          </Card>
        )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-3 px-4 py-16 text-sm text-muted">
          <Spinner size="sm" />
          <span>Loading Reference Lookup...</span>
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
