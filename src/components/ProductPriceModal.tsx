"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip, Modal, Table } from "@heroui/react";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import type { Order, Product } from "@/types/printshop";
import { usePrintShop } from "@/context/PrintShopContext";

interface ProductPriceModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductPriceModal({
  product,
  isOpen,
  onClose,
}: ProductPriceModalProps) {
  const {
    currentUser,
    settings,
    formatCurrency,
    calculateProductPrice,
    createOrder,
    submitInquiry,
  } = usePrintShop();

  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [selectedFinish, setSelectedFinish] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [actionMode, setActionMode] = useState<"browse" | "order" | "quote">(
    "browse"
  );

  // Customer contact fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "courier">(
    "pickup"
  );
  const [paymentMethod, setPaymentMethod] = useState("gcash_ewallet");
  const [customNotes, setCustomNotes] = useState("");
  const [customDimensions, setCustomDimensions] = useState("");

  // Result & submission state
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [createdQuoteRef, setCreatedQuoteRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedSizeId(product.sizes[0]?.id ?? "");
      setSelectedMaterial(product.materials[0]?.name ?? "");
      setSelectedFinish(product.finishes[0]?.name ?? "");
      setQuantity(product.minOrderQty || 1);
      setActionMode("browse");
      setCreatedOrder(null);
      setCreatedQuoteRef(null);
      setSubmitError(null);
      setCustomNotes("");
      setCustomDimensions("");
    }
  }, [product]);

  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.fullName);
      setCustomerEmail(currentUser.email);
      setCustomerPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  const breakdown = useMemo(() => {
    if (!product) {
      return {
        effectiveUnitPrice: 0,
        setupFee: 0,
        lineTotal: 0,
        appliedTier: "Standard" as const,
      };
    }
    return calculateProductPrice(
      product,
      selectedSizeId,
      selectedMaterial,
      selectedFinish,
      quantity
    );
  }, [
    calculateProductPrice,
    product,
    quantity,
    selectedFinish,
    selectedMaterial,
    selectedSizeId,
  ]);

  if (!product) return null;

  const selectedSize =
    product.sizes.find((s) => s.id === selectedSizeId) ?? product.sizes[0];
  const taxAmount = Number(
    ((breakdown.lineTotal * settings.taxRate) / 100).toFixed(2)
  );
  const estimatedGrandTotal = Number(
    (breakdown.lineTotal + taxAmount).toFixed(2)
  );

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSize || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const order = await createOrder({
        customerName,
        customerEmail,
        customerPhone,
        orderSource: "online",
        items: [
          {
            id: `item-${selectedSize.id}`,
            productId: product.id,
            sizeId: selectedSize.id,
            productName: product.name,
            sizeLabel: selectedSize.sizeLabel,
            material: selectedMaterial,
            finish: selectedFinish,
            quantity,
            unitPrice: breakdown.effectiveUnitPrice,
            setupFee: breakdown.setupFee,
            lineTotal: breakdown.lineTotal,
          },
        ],
        paymentStatus: "unpaid",
        paymentMethod,
        deliveryMethod,
        notes: customNotes,
      });
      setCreatedOrder(order);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to submit order. Please verify your details."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSize || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const quote = await submitInquiry({
        customerName,
        customerEmail,
        customerPhone,
        companyName: currentUser?.companyName,
        subject: `${product.name} — ${selectedSize.sizeLabel} (${quantity} ${product.baseUnit})`,
        productId: product.id,
        productName: product.name,
        selectedSize: selectedSize.sizeLabel,
        material: selectedMaterial,
        finish: selectedFinish,
        quantity,
        customDimensions: customDimensions || undefined,
        notes: customNotes || undefined,
      });
      setCreatedQuoteRef(quote.referenceNumber);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to submit quotation inquiry. Please verify your details."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable
    >
      <Modal.Container size="lg" scroll="inside" placement="center">
        <Modal.Dialog className="max-w-4xl">
          <Modal.CloseTrigger />
          <Modal.Header className="border-b border-separator pb-4">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-medium text-foreground">
                {product.category}
              </span>
              <span>·</span>
              <span>Lead time: {product.leadTimeDays}</span>
              {product.badge && (
                <>
                  <span>·</span>
                  <span>{product.badge}</span>
                </>
              )}
            </div>
            <Modal.Heading className="text-xl font-semibold tracking-tight">
              {product.name}
            </Modal.Heading>
            <p className="mt-1 text-sm text-muted">{product.description}</p>
          </Modal.Header>

          <Modal.Body className="space-y-6 py-5">
            {createdOrder ? (
              <Card className="border border-separator bg-surface p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Production Order Registered
                    </h3>
                    <p className="mt-0.5 text-sm text-muted">
                      Retain your reference number below to monitor production
                      stages or coordinate with our pre-press desk.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-separator bg-surface-secondary px-4 py-3">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Order Reference
                    </div>
                    <div className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                      {createdOrder.referenceNumber}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => copyReference(createdOrder.referenceNumber)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>

                <div className="text-xs text-muted tabular-nums">
                  Order Total:{" "}
                  <strong className="font-mono text-foreground">
                    {formatCurrency(createdOrder.totalAmount)}
                  </strong>{" "}
                  (inclusive of {settings.taxRate}% VAT)
                </div>

                <div className="flex flex-wrap gap-2.5 border-t border-separator pt-4">
                  <Link
                    href={`/track?ref=${encodeURIComponent(createdOrder.referenceNumber)}`}
                    onClick={onClose}
                  >
                    <Button variant="primary" size="sm">
                      View Order Status
                    </Button>
                  </Link>
                  <Link
                    href={`/chat?ref=${encodeURIComponent(createdOrder.referenceNumber)}`}
                    onClick={onClose}
                  >
                    <Button variant="secondary" size="sm">
                      Open Support Ticket
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : createdQuoteRef ? (
              <Card className="border border-separator bg-surface p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Quotation Inquiry Logged
                    </h3>
                    <p className="mt-0.5 text-sm text-muted">
                      Our estimating desk will review your specifications and
                      publish a formal quotation under this reference.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-separator bg-surface-secondary px-4 py-3">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Quotation Reference
                    </div>
                    <div className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                      {createdQuoteRef}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => copyReference(createdQuoteRef)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2.5 border-t border-separator pt-4">
                  <Link
                    href={`/track?ref=${encodeURIComponent(createdQuoteRef)}`}
                    onClick={onClose}
                  >
                    <Button variant="primary" size="sm">
                      Track Quotation
                    </Button>
                  </Link>
                  <Link
                    href={`/chat?ref=${encodeURIComponent(createdQuoteRef)}`}
                    onClick={onClose}
                  >
                    <Button variant="secondary" size="sm">
                      Consult Support Desk
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <>
                {/* PER-SIZE SCHEDULE TABLE */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Size & Volume Schedule ({product.baseUnit})
                    </h4>
                    <span className="text-xs text-muted tabular-nums">
                      Minimum run: {product.minOrderQty} {product.baseUnit}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-separator">
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content
                          aria-label={`${product.name} price per size`}
                        >
                          <Table.Header>
                            <Table.Column isRowHeader>Size Option</Table.Column>
                            <Table.Column>Dimensions</Table.Column>
                            <Table.Column>Standard</Table.Column>
                            <Table.Column>100+ Bulk</Table.Column>
                            <Table.Column>500+ Wholesale</Table.Column>
                            <Table.Column>Setup</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {product.sizes.map((sz) => {
                              const isSelected = sz.id === selectedSize?.id;
                              return (
                                <Table.Row
                                  key={sz.id}
                                  id={sz.id}
                                  onAction={() => setSelectedSizeId(sz.id)}
                                  className={`cursor-pointer transition-colors tabular-nums ${
                                    isSelected
                                      ? "bg-accent/10 font-medium"
                                      : "hover:bg-surface-secondary"
                                  }`}
                                >
                                  <Table.Cell>
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="radio"
                                        checked={isSelected}
                                        onChange={() =>
                                          setSelectedSizeId(sz.id)
                                        }
                                        className="accent-current"
                                        aria-label={sz.sizeLabel}
                                      />
                                      <span className="font-medium text-foreground">
                                        {sz.sizeLabel}
                                      </span>
                                    </div>
                                  </Table.Cell>
                                  <Table.Cell className="font-mono text-xs text-muted">
                                    {sz.dimensions}
                                  </Table.Cell>
                                  <Table.Cell className="font-mono font-medium text-foreground">
                                    {formatCurrency(sz.unitPrice)}
                                  </Table.Cell>
                                  <Table.Cell className="font-mono text-foreground">
                                    {sz.bulk100Price != null
                                      ? formatCurrency(sz.bulk100Price)
                                      : "—"}
                                  </Table.Cell>
                                  <Table.Cell className="font-mono font-medium text-accent">
                                    {sz.bulk500Price != null
                                      ? formatCurrency(sz.bulk500Price)
                                      : "—"}
                                  </Table.Cell>
                                  <Table.Cell className="font-mono text-xs text-muted">
                                    {sz.setupFee > 0
                                      ? formatCurrency(sz.setupFee)
                                      : "Included"}
                                  </Table.Cell>
                                </Table.Row>
                              );
                            })}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </div>
                </div>

                {/* SPECIFICATION CONFIGURATOR & LIVE ESTIMATE */}
                <div className="grid gap-4 rounded-xl border border-separator bg-surface-secondary/50 p-4 md:grid-cols-3">
                  <div className="space-y-3.5 md:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Specification Parameters
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Substrate / Paper Stock
                        </label>
                        <select
                          value={selectedMaterial}
                          onChange={(e) => setSelectedMaterial(e.target.value)}
                          className="h-9 w-full rounded-lg border border-separator bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                        >
                          {product.materials.map((m) => (
                            <option key={m.name} value={m.name}>
                              {m.name}{" "}
                              {m.priceMultiplier !== 1
                                ? `(${m.priceMultiplier > 1 ? "+" : ""}${Math.round(
                                    (m.priceMultiplier - 1) * 100
                                  )}%)`
                                : "(Base)"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Lamination / Finishing
                        </label>
                        <select
                          value={selectedFinish}
                          onChange={(e) => setSelectedFinish(e.target.value)}
                          className="h-9 w-full rounded-lg border border-separator bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
                        >
                          {product.finishes.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.name}{" "}
                              {f.addPerUnit > 0
                                ? `(+${formatCurrency(f.addPerUnit)})`
                                : "(Included)"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">
                        Run Quantity ({product.baseUnit})
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min={product.minOrderQty}
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(
                              Math.max(
                                product.minOrderQty || 1,
                                Number.parseInt(e.target.value || "1", 10)
                              )
                            )
                          }
                          className="h-9 w-28 rounded-lg border border-separator bg-surface px-3 font-mono text-sm font-medium text-foreground outline-none focus:border-accent tabular-nums"
                        />
                        {[product.minOrderQty, 50, 100, 250, 500]
                          .filter(
                            (v, idx, arr) =>
                              v >= product.minOrderQty && arr.indexOf(v) === idx
                          )
                          .map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setQuantity(preset)}
                              className={`h-9 rounded-lg border px-2.5 font-mono text-xs font-medium transition-colors tabular-nums ${
                                quantity === preset
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-separator bg-surface text-muted hover:text-foreground"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Itemized Summary */}
                  <div className="flex flex-col justify-between rounded-lg border border-separator bg-surface p-4 tabular-nums">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Rate Schedule</span>
                        <Chip size="sm" color="default" variant="secondary">
                          {breakdown.appliedTier}
                        </Chip>
                      </div>
                      <div className="flex items-center justify-between text-muted">
                        <span>Unit Rate</span>
                        <span className="font-mono font-medium text-foreground">
                          {formatCurrency(breakdown.effectiveUnitPrice)}
                        </span>
                      </div>
                      {breakdown.setupFee > 0 && (
                        <div className="flex items-center justify-between text-muted">
                          <span>Setup / Plate</span>
                          <span className="font-mono text-foreground">
                            {formatCurrency(breakdown.setupFee)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-muted">
                        <span>Net Subtotal ({quantity}×)</span>
                        <span className="font-mono text-foreground">
                          {formatCurrency(breakdown.lineTotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted">
                        <span>VAT ({settings.taxRate}%)</span>
                        <span className="font-mono text-foreground">
                          {formatCurrency(taxAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-separator pt-3">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
                        Estimated Total
                      </div>
                      <div className="mt-0.5 font-mono text-xl font-semibold text-foreground">
                        {formatCurrency(estimatedGrandTotal)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ORDER / QUOTE FORM */}
                {actionMode === "browse" ? (
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setSubmitError(null);
                        setActionMode("quote");
                      }}
                    >
                      Request Formal Quote
                    </Button>
                    <Button
                      variant="primary"
                      onPress={() => {
                        setSubmitError(null);
                        setActionMode("order");
                      }}
                    >
                      Place Direct Order
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={
                      actionMode === "order"
                        ? handlePlaceOrder
                        : handleRequestQuote
                    }
                    className="space-y-4 rounded-xl border border-separator bg-surface p-4"
                  >
                    <div className="flex items-center justify-between border-b border-separator pb-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        {actionMode === "order"
                          ? "Direct Production Order"
                          : "Formal Quotation Inquiry"}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitError(null);
                          setActionMode("browse");
                        }}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Contact Name *
                        </label>
                        <input
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Full name"
                          className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Email Address *
                        </label>
                        <input
                          required
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Telephone / Mobile *
                        </label>
                        <input
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+63 917 000 0000"
                          className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    {actionMode === "order" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted">
                            Fulfillment Method
                          </label>
                          <select
                            value={deliveryMethod}
                            onChange={(e) =>
                              setDeliveryMethod(
                                e.target.value as "pickup" | "courier"
                              )
                            }
                            className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            <option value="pickup">
                              Studio Pickup ({settings.shopName})
                            </option>
                            <option value="courier">
                              Courier Dispatch (Client-Arranged / Freight)
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted">
                            Settlement Channel
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                          >
                            <option value="gcash_ewallet">
                              GCash / Maya E-Wallet
                            </option>
                            <option value="bank_transfer">
                              Corporate Bank Transfer (BDO / BPI)
                            </option>
                            <option value="cash">Counter Settlement</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Custom Trim Dimensions / Dieline Notes (Optional)
                        </label>
                        <input
                          value={customDimensions}
                          onChange={(e) => setCustomDimensions(e.target.value)}
                          placeholder="e.g., 4.25 × 6.5 in custom die-cut with foil stamping"
                          className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">
                        Artwork File Link (HTTPS) & Production Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Provide Google Drive / Dropbox link, Pantone references, SKU split, or target completion date..."
                        className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        isDisabled={submitting}
                      >
                        {submitting
                          ? "Submitting..."
                          : actionMode === "order"
                            ? `Submit Order (${formatCurrency(estimatedGrandTotal)})`
                            : "Submit Quotation Inquiry"}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
