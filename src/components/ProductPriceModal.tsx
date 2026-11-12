"use client";

import React, { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Check,
  CircleCheck,
  Comments,
  Copy,
  FileText,
  Magnifier,
  Printer,
  ShoppingBag,
} from "@gravity-ui/icons";
import {
  Alert,
  Button,
  Card,
  Chip,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  NumberField,
  Select,
  Separator,
  Spinner,
  Surface,
  Table,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from "@heroui/react";
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

  const presetQuantities = [product.minOrderQty, 50, 100, 250, 500].filter(
    (v, idx, arr) => v >= product.minOrderQty && arr.indexOf(v) === idx
  );

  const handlePlaceOrder = async (e: React.FormEvent<HTMLFormElement>) => {
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
      toast.success(`Order ${order.referenceNumber} registered`);
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

  const handleRequestQuote = async (e: React.FormEvent<HTMLFormElement>) => {
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
      toast.success(`Quotation ${quote.referenceNumber} logged`);
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
    toast.success("Reference copied to clipboard");
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
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
              <Printer className="size-5" />
            </Modal.Icon>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="soft" color="accent">
                <Chip.Label>{product.category}</Chip.Label>
              </Chip>
              <Chip size="sm" variant="soft" color="default">
                <Chip.Label>Lead time: {product.leadTimeDays}</Chip.Label>
              </Chip>
              {product.badge && (
                <Chip size="sm" variant="soft" color="warning">
                  <Chip.Label>{product.badge}</Chip.Label>
                </Chip>
              )}
            </div>
            <Modal.Heading className="text-xl font-semibold tracking-tight">
              {product.name}
            </Modal.Heading>
            <p className="mt-1 text-sm text-muted">{product.description}</p>
          </Modal.Header>

          <Modal.Body className="space-y-6 py-4">
            {createdOrder ? (
              <Card variant="secondary">
                <Card.Header>
                  <div className="flex items-center gap-2.5">
                    <CircleCheck className="size-5 text-success" />
                    <Card.Title>Production Order Registered</Card.Title>
                  </div>
                  <Card.Description>
                    Retain your reference number below to monitor production
                    stages or coordinate with our pre-press desk.
                  </Card.Description>
                </Card.Header>
                <Card.Content className="space-y-4">
                  <Surface className="flex items-center justify-between rounded-2xl p-4">
                    <div>
                      <div className="text-xs font-medium text-muted">
                        Order Reference
                      </div>
                      <div className="mt-0.5 font-mono text-lg font-semibold text-foreground">
                        {createdOrder.referenceNumber}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        copyReference(createdOrder.referenceNumber)
                      }
                    >
                      {copied ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </Surface>

                  <div className="text-xs text-muted tabular-nums">
                    Order Total:{" "}
                    <strong className="font-mono text-foreground">
                      {formatCurrency(createdOrder.totalAmount)}
                    </strong>{" "}
                    (inclusive of {settings.taxRate}% VAT)
                  </div>
                </Card.Content>
                <Card.Footer className="flex flex-wrap gap-2">
                  <NextLink
                    href={`/track?ref=${encodeURIComponent(createdOrder.referenceNumber)}`}
                    onClick={onClose}
                  >
                    <Button variant="primary" size="sm">
                      <Magnifier className="size-3.5" />
                      View Order Status
                    </Button>
                  </NextLink>
                  <NextLink
                    href={`/chat?ref=${encodeURIComponent(createdOrder.referenceNumber)}`}
                    onClick={onClose}
                  >
                    <Button variant="secondary" size="sm">
                      <Comments className="size-3.5" />
                      Open Support Ticket
                    </Button>
                  </NextLink>
                </Card.Footer>
              </Card>
            ) : createdQuoteRef ? (
              <Card variant="secondary">
                <Card.Header>
                  <div className="flex items-center gap-2.5">
                    <CircleCheck className="size-5 text-success" />
                    <Card.Title>Quotation Inquiry Logged</Card.Title>
                  </div>
                  <Card.Description>
                    Our estimating desk will review your specifications and
                    publish a formal quotation under this reference.
                  </Card.Description>
                </Card.Header>
                <Card.Content>
                  <Surface className="flex items-center justify-between rounded-2xl p-4">
                    <div>
                      <div className="text-xs font-medium text-muted">
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
                      {copied ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </Surface>
                </Card.Content>
                <Card.Footer className="flex flex-wrap gap-2">
                  <NextLink
                    href={`/track?ref=${encodeURIComponent(createdQuoteRef)}`}
                    onClick={onClose}
                  >
                    <Button variant="primary" size="sm">
                      <Magnifier className="size-3.5" />
                      Track Quotation
                    </Button>
                  </NextLink>
                  <NextLink
                    href={`/chat?ref=${encodeURIComponent(createdQuoteRef)}`}
                    onClick={onClose}
                  >
                    <Button variant="secondary" size="sm">
                      <Comments className="size-3.5" />
                      Consult Support Desk
                    </Button>
                  </NextLink>
                </Card.Footer>
              </Card>
            ) : (
              <>
                {/* PER-SIZE SCHEDULE TABLE */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Size & Volume Schedule ({product.baseUnit})
                    </span>
                    <Chip size="sm" variant="soft" color="default">
                      <Chip.Label className="tabular-nums">
                        Minimum run: {product.minOrderQty} {product.baseUnit}
                      </Chip.Label>
                    </Chip>
                  </div>

                  <Table variant="secondary">
                    <Table.ScrollContainer>
                      <Table.Content
                        aria-label={`${product.name} price per size`}
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={
                          selectedSize ? new Set([selectedSize.id]) : new Set()
                        }
                        onSelectionChange={(keys) => {
                          if (keys !== "all") {
                            const first = [...keys][0];
                            if (first) setSelectedSizeId(String(first));
                          }
                        }}
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
                          {product.sizes.map((sz) => (
                            <Table.Row
                              key={sz.id}
                              id={sz.id}
                              className="cursor-pointer tabular-nums"
                            >
                              <Table.Cell className="font-medium text-foreground">
                                {sz.sizeLabel}
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
                              <Table.Cell className="font-mono font-semibold text-accent">
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
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                </div>

                {/* SPECIFICATION CONFIGURATOR & LIVE ESTIMATE */}
                <Surface
                  variant="secondary"
                  className="grid gap-5 rounded-3xl p-5 md:grid-cols-3"
                >
                  <div className="space-y-4 md:col-span-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Specification Parameters
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        className="w-full"
                        value={selectedMaterial}
                        onChange={(key) => {
                          if (key) setSelectedMaterial(String(key));
                        }}
                      >
                        <Label>Substrate / Paper Stock</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {product.materials.map((m) => {
                              const textLabel = `${m.name} ${
                                m.priceMultiplier !== 1
                                  ? `(${m.priceMultiplier > 1 ? "+" : ""}${Math.round(
                                      (m.priceMultiplier - 1) * 100
                                    )}%)`
                                  : "(Base)"
                              }`;
                              return (
                                <ListBox.Item
                                  key={m.name}
                                  id={m.name}
                                  textValue={textLabel}
                                >
                                  {textLabel}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              );
                            })}
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      <Select
                        className="w-full"
                        value={selectedFinish}
                        onChange={(key) => {
                          if (key) setSelectedFinish(String(key));
                        }}
                      >
                        <Label>Lamination / Finishing</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {product.finishes.map((f) => {
                              const textLabel = `${f.name} ${
                                f.addPerUnit > 0
                                  ? `(+${formatCurrency(f.addPerUnit)})`
                                  : "(Included)"
                              }`;
                              return (
                                <ListBox.Item
                                  key={f.name}
                                  id={f.name}
                                  textValue={textLabel}
                                >
                                  {textLabel}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              );
                            })}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                      <NumberField
                        className="w-40"
                        minValue={product.minOrderQty || 1}
                        step={1}
                        value={quantity}
                        onChange={(val) => {
                          if (!Number.isNaN(val)) {
                            setQuantity(
                              Math.max(product.minOrderQty || 1, val)
                            );
                          }
                        }}
                      >
                        <Label>Run Quantity ({product.baseUnit})</Label>
                        <NumberField.Group>
                          <NumberField.DecrementButton />
                          <NumberField.Input className="tabular-nums" />
                          <NumberField.IncrementButton />
                        </NumberField.Group>
                      </NumberField>

                      <ToggleButtonGroup
                        aria-label="Preset quantities"
                        size="sm"
                        selectionMode="single"
                        selectedKeys={
                          presetQuantities.includes(quantity)
                            ? new Set([String(quantity)])
                            : new Set()
                        }
                        onSelectionChange={(keys) => {
                          const first = [...keys][0];
                          if (first) setQuantity(Number(first));
                        }}
                      >
                        {presetQuantities.map((preset, idx) => (
                          <ToggleButton
                            key={preset}
                            id={String(preset)}
                            className="tabular-nums"
                          >
                            {idx > 0 && <ToggleButtonGroup.Separator />}
                            {preset}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </div>
                  </div>

                  {/* Itemized Summary Card */}
                  <Card className="justify-between tabular-nums">
                    <Card.Content className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Rate Schedule</span>
                        <Chip size="sm" color="accent" variant="soft">
                          <Chip.Label>{breakdown.appliedTier}</Chip.Label>
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
                    </Card.Content>
                    <Card.Footer className="flex-col items-start border-t border-separator pt-3">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
                        Estimated Total
                      </span>
                      <span className="mt-0.5 font-mono text-xl font-semibold text-foreground">
                        {formatCurrency(estimatedGrandTotal)}
                      </span>
                    </Card.Footer>
                  </Card>
                </Surface>

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
                      <FileText className="size-4" />
                      Request Formal Quote
                    </Button>
                    <Button
                      variant="primary"
                      onPress={() => {
                        setSubmitError(null);
                        setActionMode("order");
                      }}
                    >
                      <ShoppingBag className="size-4" />
                      Place Direct Order
                    </Button>
                  </div>
                ) : (
                  <Card variant="secondary">
                    <Card.Header className="flex-row items-center justify-between">
                      <div>
                        <Card.Title>
                          {actionMode === "order"
                            ? "Direct Production Order"
                            : "Formal Quotation Inquiry"}
                        </Card.Title>
                        <Card.Description>
                          {actionMode === "order"
                            ? "Submit job specifications and generate your production reference."
                            : "Request a formal quotation reviewed by our estimating desk."}
                        </Card.Description>
                      </div>
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => {
                          setSubmitError(null);
                          setActionMode("browse");
                        }}
                      >
                        Cancel
                      </Button>
                    </Card.Header>
                    <Card.Content>
                      <Form
                        onSubmit={
                          actionMode === "order"
                            ? handlePlaceOrder
                            : handleRequestQuote
                        }
                        className="flex flex-col gap-4"
                      >
                        {submitError && (
                          <Alert status="danger">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>Submission Error</Alert.Title>
                              <Alert.Description>
                                {submitError}
                              </Alert.Description>
                            </Alert.Content>
                          </Alert>
                        )}

                        <div className="grid gap-3 sm:grid-cols-3">
                          <TextField
                            isRequired
                            name="customerName"
                            value={customerName}
                            onChange={setCustomerName}
                          >
                            <Label>Contact Name</Label>
                            <Input placeholder="Full name" />
                            <FieldError />
                          </TextField>

                          <TextField
                            isRequired
                            name="customerEmail"
                            type="email"
                            value={customerEmail}
                            onChange={setCustomerEmail}
                          >
                            <Label>Email Address</Label>
                            <Input placeholder="name@company.com" />
                            <FieldError />
                          </TextField>

                          <TextField
                            isRequired
                            name="customerPhone"
                            type="tel"
                            value={customerPhone}
                            onChange={setCustomerPhone}
                          >
                            <Label>Telephone / Mobile</Label>
                            <Input placeholder="+63 917 000 0000" />
                            <FieldError />
                          </TextField>
                        </div>

                        {actionMode === "order" ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Select
                              className="w-full"
                              value={deliveryMethod}
                              onChange={(key) => {
                                if (key)
                                  setDeliveryMethod(
                                    key as "pickup" | "courier"
                                  );
                              }}
                            >
                              <Label>Fulfillment Method</Label>
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  <ListBox.Item
                                    id="pickup"
                                    textValue={`Studio Pickup (${settings.shopName})`}
                                  >
                                    Studio Pickup ({settings.shopName})
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                  <ListBox.Item
                                    id="courier"
                                    textValue="Courier Dispatch (Client-Arranged / Freight)"
                                  >
                                    Courier Dispatch (Client-Arranged / Freight)
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                </ListBox>
                              </Select.Popover>
                            </Select>

                            <Select
                              className="w-full"
                              value={paymentMethod}
                              onChange={(key) => {
                                if (key) setPaymentMethod(String(key));
                              }}
                            >
                              <Label>Settlement Channel</Label>
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  <ListBox.Item
                                    id="gcash_ewallet"
                                    textValue="GCash / Maya E-Wallet"
                                  >
                                    GCash / Maya E-Wallet
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                  <ListBox.Item
                                    id="bank_transfer"
                                    textValue="Corporate Bank Transfer (BDO / BPI)"
                                  >
                                    Corporate Bank Transfer (BDO / BPI)
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                  <ListBox.Item
                                    id="cash"
                                    textValue="Counter Settlement"
                                  >
                                    Counter Settlement
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </div>
                        ) : (
                          <TextField
                            name="customDimensions"
                            value={customDimensions}
                            onChange={setCustomDimensions}
                          >
                            <Label>
                              Custom Trim Dimensions / Dieline Notes (Optional)
                            </Label>
                            <Input placeholder="e.g., 4.25 × 6.5 in custom die-cut with foil stamping" />
                          </TextField>
                        )}

                        <TextField
                          name="customNotes"
                          value={customNotes}
                          onChange={setCustomNotes}
                        >
                          <Label>
                            Artwork File Link (HTTPS) & Production Instructions
                          </Label>
                          <TextArea
                            rows={2}
                            placeholder="Provide Google Drive / Dropbox link, Pantone references, SKU split, or target completion date..."
                          />
                          <Description>
                            Include print-ready PDF links or special finishing
                            notes.
                          </Description>
                        </TextField>

                        <Separator />

                        <div className="flex justify-end gap-2">
                          <Button
                            type="submit"
                            variant="primary"
                            isPending={submitting}
                          >
                            {({ isPending }) => (
                              <>
                                {isPending && (
                                  <Spinner color="current" size="sm" />
                                )}
                                {isPending
                                  ? "Submitting..."
                                  : actionMode === "order"
                                    ? `Submit Order (${formatCurrency(estimatedGrandTotal)})`
                                    : "Submit Quotation Inquiry"}
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    </Card.Content>
                  </Card>
                )}
              </>
            )}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
