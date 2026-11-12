"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip, Modal, Table } from "@heroui/react";
import {
  CheckCircle2,
  Clock,
  Copy,
  FileSpreadsheet,
  Layers,
  Ruler,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
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

  // Result confirmation
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [createdQuoteRef, setCreatedQuoteRef] = useState<string | null>(null);
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
    if (!selectedSize) return;
    const order = await createOrder({
      customerName,
      customerEmail,
      customerPhone,
      orderSource: "online",
      items: [
        {
          id: `item-${Date.now()}`,
          productId: product.id,
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
  };

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSize) return;
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
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Chip size="sm" color="accent" variant="soft">
                {product.category}
              </Chip>
              {product.badge && (
                <Chip size="sm" color="warning" variant="soft">
                  {product.badge}
                </Chip>
              )}
              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" />
                Lead time: {product.leadTimeDays}
              </span>
            </div>
            <Modal.Heading className="text-xl font-bold">
              {product.name}
            </Modal.Heading>
            <p className="mt-1 text-sm text-muted">{product.description}</p>
          </Modal.Header>

          <Modal.Body className="space-y-6 py-5">
            {createdOrder ? (
              <Card className="border border-emerald-500/40 bg-emerald-500/5 p-6 text-center space-y-4">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Order Submitted Successfully!
                  </h3>
                  <p className="text-sm text-muted">
                    Save your Order Reference Number below to track production or
                    chat with our pre-press desk.
                  </p>
                </div>
                <div className="mx-auto flex max-w-sm items-center justify-between rounded-xl border border-separator bg-surface px-4 py-3">
                  <div className="text-left">
                    <div className="text-[11px] uppercase tracking-wider text-muted">
                      Order Reference #
                    </div>
                    <div className="font-mono text-lg font-bold text-accent">
                      {createdOrder.referenceNumber}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => copyReference(createdOrder.referenceNumber)}
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="text-xs text-muted">
                  Total Estimated Amount:{" "}
                  <strong className="text-foreground">
                    {formatCurrency(createdOrder.totalAmount)}
                  </strong>{" "}
                  (incl. {settings.taxRate}% VAT)
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Link
                    href={`/track?ref=${createdOrder.referenceNumber}`}
                    onClick={onClose}
                  >
                    <Button variant="primary">Track Order Status</Button>
                  </Link>
                  <Link
                    href={`/chat?ref=${createdOrder.referenceNumber}`}
                    onClick={onClose}
                  >
                    <Button variant="secondary">Chat About This Order</Button>
                  </Link>
                </div>
              </Card>
            ) : createdQuoteRef ? (
              <Card className="border border-accent/40 bg-accent/5 p-6 text-center space-y-4">
                <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Quotation Request Received!
                  </h3>
                  <p className="text-sm text-muted">
                    Our print estimators will review your size & specifications
                    and post your formal quotation under this reference number.
                  </p>
                </div>
                <div className="mx-auto flex max-w-sm items-center justify-between rounded-xl border border-separator bg-surface px-4 py-3">
                  <div className="text-left">
                    <div className="text-[11px] uppercase tracking-wider text-muted">
                      Quotation Reference #
                    </div>
                    <div className="font-mono text-lg font-bold text-accent">
                      {createdQuoteRef}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => copyReference(createdQuoteRef)}
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Link href={`/track?ref=${createdQuoteRef}`} onClick={onClose}>
                    <Button variant="primary">Track Quotation</Button>
                  </Link>
                  <Link href={`/chat?ref=${createdQuoteRef}`} onClick={onClose}>
                    <Button variant="secondary">Join Chat Queue</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <>
                {/* PRICE PER SIZE MATRIX TABLE */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Ruler className="h-4 w-4 text-accent" />
                      Price Per Size Matrix ({product.baseUnit}) — Click any row
                      to select
                    </h4>
                    <span className="text-xs text-muted">
                      Min. order: {product.minOrderQty} {product.baseUnit}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-separator">
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content
                          aria-label={`${product.name} price per size`}
                        >
                          <Table.Header>
                            <Table.Column isRowHeader>Size Option</Table.Column>
                            <Table.Column>Exact Dimensions</Table.Column>
                            <Table.Column>Standard Price</Table.Column>
                            <Table.Column>100+ Bulk</Table.Column>
                            <Table.Column>500+ Wholesale</Table.Column>
                            <Table.Column>Setup Fee</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {product.sizes.map((sz) => {
                              const isSelected = sz.id === selectedSize?.id;
                              return (
                                <Table.Row
                                  key={sz.id}
                                  id={sz.id}
                                  onAction={() => setSelectedSizeId(sz.id)}
                                  className={`cursor-pointer transition ${
                                    isSelected
                                      ? "bg-accent/12 font-medium"
                                      : "hover:bg-surface-secondary"
                                  }`}
                                >
                                  <Table.Cell>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        checked={isSelected}
                                        onChange={() =>
                                          setSelectedSizeId(sz.id)
                                        }
                                        className="accent-blue-600"
                                        aria-label={sz.sizeLabel}
                                      />
                                      <span className="font-medium text-foreground">
                                        {sz.sizeLabel}
                                      </span>
                                    </div>
                                  </Table.Cell>
                                  <Table.Cell className="text-xs text-muted">
                                    {sz.dimensions}
                                  </Table.Cell>
                                  <Table.Cell className="font-semibold text-foreground">
                                    {formatCurrency(sz.unitPrice)}
                                  </Table.Cell>
                                  <Table.Cell className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    {sz.bulk100Price != null
                                      ? formatCurrency(sz.bulk100Price)
                                      : "—"}
                                  </Table.Cell>
                                  <Table.Cell className="text-accent font-semibold">
                                    {sz.bulk500Price != null
                                      ? formatCurrency(sz.bulk500Price)
                                      : "—"}
                                  </Table.Cell>
                                  <Table.Cell className="text-xs text-muted">
                                    {sz.setupFee > 0
                                      ? formatCurrency(sz.setupFee)
                                      : "Free"}
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

                {/* INTERACTIVE CONFIGURATOR & LIVE CALCULATOR */}
                <div className="grid gap-4 rounded-2xl border border-separator bg-surface-secondary/50 p-4 md:grid-cols-3">
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Layers className="h-4 w-4 text-accent" />
                      Configure Specifications
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Paper / Substrate Material
                        </label>
                        <select
                          value={selectedMaterial}
                          onChange={(e) => setSelectedMaterial(e.target.value)}
                          className="w-full rounded-xl border border-separator bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
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
                          className="w-full rounded-xl border border-separator bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
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
                        Quantity ({product.baseUnit})
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min={product.minOrderQty}
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(
                              Math.max(
                                1,
                                Number.parseInt(e.target.value || "1", 10)
                              )
                            )
                          }
                          className="w-32 rounded-xl border border-separator bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-accent"
                        />
                        {[
                          product.minOrderQty,
                          50,
                          100,
                          250,
                          500,
                        ]
                          .filter((v, idx, arr) => v >= product.minOrderQty && arr.indexOf(v) === idx)
                          .map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setQuantity(preset)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                                quantity === preset
                                  ? "border-accent bg-accent text-accent-foreground"
                                  : "border-separator bg-surface text-muted hover:text-foreground"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Price Box */}
                  <div className="flex flex-col justify-between rounded-xl border border-separator bg-surface p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Pricing Tier</span>
                        <Chip size="sm" color="success" variant="soft">
                          <Sparkles className="mr-1 inline h-3 w-3" />
                          {breakdown.appliedTier}
                        </Chip>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>Unit Price ({selectedSize?.sizeLabel})</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(breakdown.effectiveUnitPrice)}
                        </span>
                      </div>
                      {breakdown.setupFee > 0 && (
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>Plate / Setup Fee</span>
                          <span>{formatCurrency(breakdown.setupFee)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>Subtotal ({quantity}×)</span>
                        <span>{formatCurrency(breakdown.lineTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>Tax ({settings.taxRate}%)</span>
                        <span>{formatCurrency(taxAmount)}</span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-separator pt-3">
                      <div className="text-[11px] uppercase tracking-wider text-muted">
                        Estimated Total
                      </div>
                      <div className="text-2xl font-extrabold text-accent">
                        {formatCurrency(estimatedGrandTotal)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTION FORMS (ORDER OR QUOTATION) */}
                {actionMode === "browse" ? (
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <Button
                      variant="secondary"
                      onPress={() => setActionMode("quote")}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Request Custom Quotation
                    </Button>
                    <Button
                      variant="primary"
                      onPress={() => setActionMode("order")}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Order This Size Now
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={
                      actionMode === "order"
                        ? handlePlaceOrder
                        : handleRequestQuote
                    }
                    className="space-y-4 rounded-2xl border border-accent/30 bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground">
                        {actionMode === "order"
                          ? "Complete Direct Order & Generate Reference #"
                          : "Request Official Quotation & Reference #"}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActionMode("browse")}
                        className="text-xs text-muted hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Full Name *
                        </label>
                        <input
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Juan Dela Cruz"
                          className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
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
                          placeholder="you@company.com"
                          className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Mobile / Phone *
                        </label>
                        <input
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+63 917 000 0000"
                          className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
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
                            className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                          >
                            <option value="pickup">
                              Store Pickup ({settings.shopName})
                            </option>
                            <option value="courier">
                              Courier Delivery (Lalamove / Grab / Freight)
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted">
                            Preferred Payment Channel
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                          >
                            <option value="gcash_ewallet">
                              GCash / Maya E-Wallet
                            </option>
                            <option value="bank_transfer">
                              Bank Transfer (BDO / BPI)
                            </option>
                            <option value="cash">Pay at Print Shop Counter</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Custom Dimensions / Special Cut (Optional)
                        </label>
                        <input
                          value={customDimensions}
                          onChange={(e) => setCustomDimensions(e.target.value)}
                          placeholder="e.g., Custom 4.25 × 6.5 in die-cut arch with gold foil"
                          className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">
                        Artwork Link (Google Drive / Canva / Dropbox) & Print
                        Notes
                      </label>
                      <textarea
                        rows={2}
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Paste artwork link, Pantone notes, SKU split, or target deadline..."
                        className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="submit" variant="primary">
                        {actionMode === "order"
                          ? `Confirm Order (${formatCurrency(estimatedGrandTotal)})`
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
