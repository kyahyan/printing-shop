"use client";

import React, { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  ArrowUpRightFromSquare,
  Check,
  Comments,
  Copy,
  FileText,
  Gear,
  Headphones,
  PaperPlane,
  Plus,
  ShieldCheck,
  ShoppingBag,
  TrashBin,
  Tray,
} from "@gravity-ui/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  ListBox,
  NumberField,
  ScrollShadow,
  Select,
  Separator,
  Spinner,
  Surface,
  Switch,
  Table,
  Tabs,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  toast,
} from "@heroui/react";
import { usePrintShop } from "@/context/PrintShopContext";
import type {
  OrderItem,
  PaymentStatus,
  ProductionStatus,
  TicketPriority,
} from "@/types/printshop";
import { sanitizeExternalUrl } from "@/lib/security";

export default function EmployeeDashboardPage() {
  const {
    loading,
    currentUser,
    settings,
    products,
    inquiries,
    orders,
    tickets,
    formatCurrency,
    calculateProductPrice,
    sendQuotation,
    convertQuotationToOrder,
    createOrder,
    updateOrderStatus,
    claimTicket,
    claimNextQueuedTicket,
    sendChatMessage,
    updateTicketStatus,
    getQueuePosition,
    toggleEmployeeOnline,
  } = usePrintShop();

  const isAuthorized =
    currentUser?.role === "employee" || currentUser?.role === "super_admin";

  const [deskError, setDeskError] = useState<string | null>(null);

  // --- TAB 1: INQUIRIES & QUOTATIONS STATE ---
  const [quoteFilter, setQuoteFilter] = useState<string>("all");
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(
    inquiries[0]?.id ?? null
  );
  const [quoteUnitPrice, setQuoteUnitPrice] = useState<number>(0);
  const [quoteSetupFee, setQuoteSetupFee] = useState<number>(0);
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteValidUntil, setQuoteValidUntil] = useState<string>("");
  const [quoteRemarks, setQuoteRemarks] = useState<string>("");
  const [quoteSavedToast, setQuoteSavedToast] = useState<string | null>(null);

  const selectedInquiry = useMemo(
    () =>
      inquiries.find((i) => i.id === selectedInquiryId) ?? inquiries[0] ?? null,
    [inquiries, selectedInquiryId]
  );

  useEffect(() => {
    if (!selectedInquiry) return;
    if (selectedInquiry.quotedUnitPrice != null) {
      setQuoteUnitPrice(selectedInquiry.quotedUnitPrice);
      setQuoteSetupFee(selectedInquiry.quotedSetupFee ?? 0);
      setQuoteDiscount(selectedInquiry.quotedDiscount ?? 0);
      setQuoteRemarks(selectedInquiry.staffRemarks ?? "");
      setQuoteValidUntil(selectedInquiry.validUntil ?? "");
    } else {
      const prod = products.find((p) => p.id === selectedInquiry.productId);
      const sz = prod?.sizes.find(
        (s) => s.sizeLabel === selectedInquiry.selectedSize
      );
      if (prod && sz) {
        const calc = calculateProductPrice(
          prod,
          sz.id,
          selectedInquiry.material,
          selectedInquiry.finish,
          selectedInquiry.quantity
        );
        setQuoteUnitPrice(calc.effectiveUnitPrice);
        setQuoteSetupFee(calc.setupFee);
      } else {
        setQuoteUnitPrice(15);
        setQuoteSetupFee(0);
      }
      setQuoteDiscount(0);
      setQuoteRemarks("");
      const valid = new Date();
      valid.setDate(valid.getDate() + (settings.quotationValidityDays || 14));
      setQuoteValidUntil(valid.toISOString().slice(0, 10));
    }
  }, [
    calculateProductPrice,
    products,
    selectedInquiry,
    settings.quotationValidityDays,
  ]);

  // --- TAB 2: WALK-IN / COUNTER ORDER TAKING STATE ---
  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products]
  );
  const [posProductId, setPosProductId] = useState<string>(
    activeProducts[0]?.id ?? ""
  );
  const posProduct = useMemo(
    () =>
      activeProducts.find((p) => p.id === posProductId) ?? activeProducts[0],
    [activeProducts, posProductId]
  );
  const [posSizeId, setPosSizeId] = useState<string>(
    activeProducts[0]?.sizes[0]?.id ?? ""
  );
  const [posMaterial, setPosMaterial] = useState<string>(
    activeProducts[0]?.materials[0]?.name ?? ""
  );
  const [posFinish, setPosFinish] = useState<string>(
    activeProducts[0]?.finishes[0]?.name ?? ""
  );
  const [posQty, setPosQty] = useState<number>(1);
  const [draftItems, setDraftItems] = useState<OrderItem[]>([]);

  const [posCustomerName, setPosCustomerName] = useState("");
  const [posCustomerEmail, setPosCustomerEmail] = useState("");
  const [posCustomerPhone, setPosCustomerPhone] = useState("");
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posPaymentStatus, setPosPaymentStatus] =
    useState<PaymentStatus>("downpayment_paid");
  const [posPaymentMethod, setPosPaymentMethod] = useState("cash");
  const [posAmountPaid] = useState<number>(0);
  const [posDelivery, setPosDelivery] = useState<"pickup" | "courier">(
    "pickup"
  );
  const [posNotes, setPosNotes] = useState("");
  const [posEstDate, setPosEstDate] = useState("");
  const [createdWalkInRef, setCreatedWalkInRef] = useState<string | null>(null);

  useEffect(() => {
    if (!posProductId && activeProducts[0]) {
      setPosProductId(activeProducts[0].id);
    }
  }, [activeProducts, posProductId]);

  useEffect(() => {
    if (posProduct) {
      setPosSizeId(posProduct.sizes[0]?.id ?? "");
      setPosMaterial(posProduct.materials[0]?.name ?? "");
      setPosFinish(posProduct.finishes[0]?.name ?? "");
      setPosQty(posProduct.minOrderQty || 1);
    }
  }, [posProduct]);

  // --- TAB 3: CHAT QUEUE & TICKETING CONSOLE STATE ---
  const [ticketViewFilter, setTicketViewFilter] = useState<
    "queued" | "active" | "resolved"
  >("queued");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets[0]?.id ?? null
  );
  const [staffReply, setStaffReply] = useState("");
  const [internalNoteDraft, setInternalNoteDraft] = useState("");

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? tickets[0] ?? null,
    [selectedTicketId, tickets]
  );

  useEffect(() => {
    if (selectedTicket) {
      setInternalNoteDraft(selectedTicket.internalNotes ?? "");
    }
  }, [selectedTicket]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-20 text-sm text-muted">
        <Spinner size="sm" />
        <span>Loading Operations Desk...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Card className="p-8 text-center">
          <Card.Header className="items-center">
            <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <Card.Title className="text-lg">
              Staff Authorization Required
            </Card.Title>
            <Card.Description>
              Sign in with an active Employee or Super Administrator account to
              access quotations, counter POS orders, and the support queue.
            </Card.Description>
          </Card.Header>
          <Card.Footer className="justify-center pt-2">
            <NextLink href="/staff/login">
              <Button variant="primary">Open Staff Portal</Button>
            </NextLink>
          </Card.Footer>
        </Card>
      </div>
    );
  }

  const pendingInquiriesCount = inquiries.filter(
    (i) => i.status === "pending_review"
  ).length;
  const queuedTickets = tickets.filter((t) => t.status === "queued");
  const activeOrdersCount = orders.filter(
    (o) =>
      o.productionStatus !== "completed" && o.productionStatus !== "cancelled"
  ).length;
  const readyForPickupCount = orders.filter(
    (o) => o.productionStatus === "ready_for_pickup"
  ).length;

  const filteredInquiries = inquiries.filter((i) =>
    quoteFilter === "all" ? true : i.status === quoteFilter
  );

  const computedQuoteTotal = selectedInquiry
    ? Math.max(
        0,
        Number(
          (
            quoteUnitPrice * selectedInquiry.quantity +
            quoteSetupFee -
            quoteDiscount
          ).toFixed(2)
        )
      )
    : 0;

  const safeArtworkHref = selectedInquiry?.artworkUrl
    ? sanitizeExternalUrl(selectedInquiry.artworkUrl)
    : null;

  const handleSendQuoteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInquiry) return;
    setDeskError(null);
    try {
      await sendQuotation(selectedInquiry.id, {
        quotedUnitPrice: quoteUnitPrice,
        quotedSetupFee: quoteSetupFee,
        quotedDiscount: quoteDiscount,
        staffRemarks: quoteRemarks,
        validUntil: quoteValidUntil,
      });
      const msg = `Quotation ${selectedInquiry.referenceNumber} published (${formatCurrency(
        computedQuoteTotal
      )}).`;
      setQuoteSavedToast(msg);
      toast.success(msg);
      setTimeout(() => setQuoteSavedToast(null), 3500);
    } catch (err) {
      setDeskError(
        err instanceof Error ? err.message : "Failed to publish quotation."
      );
    }
  };

  const handleConvertInquiry = async (inquiryId: string) => {
    setDeskError(null);
    try {
      const ord = await convertQuotationToOrder(inquiryId, {
        paymentStatus: "downpayment_paid",
        paymentMethod: "bank_transfer",
        deliveryMethod: "pickup",
      });
      if (ord) {
        const msg = `Converted quotation to Order ${ord.referenceNumber}.`;
        setQuoteSavedToast(msg);
        toast.success(msg);
        setTimeout(() => setQuoteSavedToast(null), 4000);
      }
    } catch (err) {
      setDeskError(
        err instanceof Error ? err.message : "Failed to convert quotation."
      );
    }
  };

  const handleAddPosItem = () => {
    if (!posProduct) return;
    const sz =
      posProduct.sizes.find((s) => s.id === posSizeId) ?? posProduct.sizes[0];
    if (!sz) return;
    const calc = calculateProductPrice(
      posProduct,
      sz.id,
      posMaterial,
      posFinish,
      posQty
    );

    const item: OrderItem = {
      id: `pos-item-${Date.now()}`,
      productId: posProduct.id,
      sizeId: sz.id,
      productName: posProduct.name,
      sizeLabel: sz.sizeLabel,
      material: posMaterial,
      finish: posFinish,
      quantity: posQty,
      unitPrice: calc.effectiveUnitPrice,
      setupFee: calc.setupFee,
      lineTotal: calc.lineTotal,
    };
    setDraftItems((prev) => [...prev, item]);
  };

  const posSubtotal = draftItems.reduce((s, i) => s + i.lineTotal, 0);
  const posTaxable = Math.max(0, posSubtotal - posDiscount);
  const posTax = Number(((posTaxable * settings.taxRate) / 100).toFixed(2));
  const posGrandTotal = Number((posTaxable + posTax).toFixed(2));

  const handleCreateWalkInOrder = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (draftItems.length === 0) return;
    setDeskError(null);
    try {
      const paid =
        posPaymentStatus === "paid"
          ? posGrandTotal
          : posPaymentStatus === "unpaid"
            ? 0
            : posAmountPaid || Number((posGrandTotal * 0.5).toFixed(2));

      const created = await createOrder({
        customerName: posCustomerName,
        customerEmail: posCustomerEmail || "counter@clayjar.com.ph",
        customerPhone: posCustomerPhone,
        orderSource: "walk_in",
        items: draftItems,
        discountAmount: posDiscount,
        paymentStatus: posPaymentStatus,
        amountPaid: paid,
        paymentMethod: posPaymentMethod,
        deliveryMethod: posDelivery,
        notes: posNotes || undefined,
        estimatedCompletion: posEstDate || undefined,
      });

      setCreatedWalkInRef(created.referenceNumber);
      toast.success(`Counter Order ${created.referenceNumber} issued`);
      setDraftItems([]);
      setPosCustomerName("");
      setPosCustomerEmail("");
      setPosCustomerPhone("");
      setPosDiscount(0);
      setPosNotes("");
    } catch (err) {
      setDeskError(
        err instanceof Error ? err.message : "Failed to create counter order."
      );
    }
  };

  const handleClaimNext = async () => {
    const claimed = await claimNextQueuedTicket();
    if (claimed) {
      setSelectedTicketId(claimed.id);
      setTicketViewFilter("active");
      toast.success(`Claimed ticket ${claimed.ticketNumber}`);
    }
  };

  const handleStaffSendChat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTicket || !staffReply.trim()) return;
    setDeskError(null);
    try {
      if (selectedTicket.status === "queued") {
        await claimTicket(selectedTicket.id);
      }
      await sendChatMessage(
        selectedTicket.id,
        staffReply,
        "employee",
        currentUser.fullName
      );
      setStaffReply("");
    } catch (err) {
      setDeskError(
        err instanceof Error ? err.message : "Failed to send message."
      );
    }
  };

  const filteredTicketsList = tickets.filter((t) => {
    if (ticketViewFilter === "queued") return t.status === "queued";
    if (ticketViewFilter === "active") return t.status === "active";
    return t.status === "resolved" || t.status === "closed";
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Chip size="sm" variant="soft" color="accent" className="mb-2">
            <Chip.Label>
              Operations Workspace · {currentUser.fullName} (
              {currentUser.department || currentUser.role.replace("_", " ")})
            </Chip.Label>
          </Chip>
          <Typography.Heading
            level={1}
            className="text-2xl font-bold tracking-tight"
          >
            Estimating, Production & Support Desk
          </Typography.Heading>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Surface variant="secondary" className="rounded-2xl px-3.5 py-2">
            <Switch
              isSelected={Boolean(currentUser.isOnline)}
              onChange={() => void toggleEmployeeOnline(currentUser.id)}
            >
              <Switch.Content className="text-xs font-medium">
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                {currentUser.isOnline ? "On Duty (Queue)" : "Away"}
              </Switch.Content>
            </Switch>
          </Surface>

          {currentUser.role === "super_admin" && (
            <NextLink href="/admin">
              <Button size="sm" variant="secondary">
                <Gear className="size-3.5" />
                Administration
              </Button>
            </NextLink>
          )}
        </div>
      </div>

      {deskError && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Operations Error</Alert.Title>
            <Alert.Description>{deskError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Operational KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 tabular-nums">
        <Card className="p-4">
          <Card.Description>Pending Quotations</Card.Description>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {pendingInquiriesCount}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {inquiries.length} total inquiries
          </div>
        </Card>

        <Card className="p-4">
          <Card.Description>Active Production</Card.Description>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {activeOrdersCount}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            Pre-press, press & finishing
          </div>
        </Card>

        <Card className="p-4">
          <Card.Description>Queued Support</Card.Description>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {queuedTickets.length}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {tickets.filter((t) => t.status === "active").length} active threads
          </div>
        </Card>

        <Card className="p-4">
          <Card.Description>Ready for Release</Card.Description>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {readyForPickupCount}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            Awaiting pickup / dispatch
          </div>
        </Card>
      </div>

      {/* WORKSPACE TABS */}
      <Tabs defaultSelectedKey="inquiries" className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Operations modules">
            <Tabs.Tab id="inquiries">
              Quotations ({inquiries.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="orders">
              Counter POS & Orders ({orders.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="chatqueue">
              Support Queue ({queuedTickets.length} waiting)
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ================================================================
            TAB 1: INQUIRIES & QUOTATIONS DESK
        ================================================================ */}
        <Tabs.Panel id="inquiries" className="space-y-4 pt-5">
          {quoteSavedToast && (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Quotation Updated</Alert.Title>
                <Alert.Description>{quoteSavedToast}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left List */}
            <div className="space-y-3 lg:col-span-5">
              <ToggleButtonGroup
                aria-label="Filter quotations"
                size="sm"
                selectionMode="single"
                selectedKeys={new Set([quoteFilter])}
                onSelectionChange={(keys) => {
                  const first = [...keys][0];
                  if (first) setQuoteFilter(String(first));
                }}
              >
                {[
                  { id: "all", label: "All" },
                  { id: "pending_review", label: "Needs Quote" },
                  { id: "quoted", label: "Quoted" },
                  { id: "converted_to_order", label: "Converted" },
                ].map((f, idx) => (
                  <ToggleButton key={f.id} id={f.id}>
                    {idx > 0 && <ToggleButtonGroup.Separator />}
                    {f.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <ScrollShadow className="max-h-[620px] pr-1">
                <div className="space-y-2.5">
                  {filteredInquiries.length === 0 ? (
                    <Card className="p-8">
                      <EmptyState className="flex flex-col items-center justify-center gap-2 text-center">
                        <Tray className="size-5 text-muted" />
                        <span className="text-xs text-muted">
                          No quotation inquiries in this filter.
                        </span>
                      </EmptyState>
                    </Card>
                  ) : (
                    filteredInquiries.map((inq) => {
                      const active = selectedInquiry?.id === inq.id;
                      return (
                        <Card
                          key={inq.id}
                          variant={active ? "secondary" : "default"}
                          onClick={() => setSelectedInquiryId(inq.id)}
                          className="cursor-pointer p-4 tabular-nums transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {inq.referenceNumber}
                            </span>
                            <Chip
                              size="sm"
                              color={
                                inq.status === "pending_review"
                                  ? "warning"
                                  : inq.status === "quoted"
                                    ? "success"
                                    : "default"
                              }
                              variant="soft"
                            >
                              <Chip.Label>
                                {inq.status.replace(/_/g, " ")}
                              </Chip.Label>
                            </Chip>
                          </div>
                          <div className="mt-1.5 line-clamp-1 text-sm font-medium text-foreground">
                            {inq.subject}
                          </div>
                          <div className="mt-1 text-xs text-muted">
                            {inq.customerName} · {inq.quantity.toLocaleString()}{" "}
                            units · {inq.selectedSize}
                          </div>
                          {inq.quotedTotal != null && (
                            <div className="mt-1.5 font-mono text-xs font-semibold text-accent">
                              Quoted: {formatCurrency(inq.quotedTotal)}
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollShadow>
            </div>

            {/* Right Estimator Composer */}
            <div className="lg:col-span-7">
              {selectedInquiry ? (
                <Card className="p-6">
                  <Card.Header className="flex-row flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-base font-semibold text-foreground">
                        {selectedInquiry.referenceNumber}
                      </span>
                      <Card.Title className="mt-1 text-base">
                        {selectedInquiry.subject}
                      </Card.Title>
                      <Card.Description>
                        {selectedInquiry.customerName} (
                        {selectedInquiry.customerEmail} ·{" "}
                        {selectedInquiry.customerPhone})
                        {selectedInquiry.companyName
                          ? ` — ${selectedInquiry.companyName}`
                          : ""}
                      </Card.Description>
                    </div>

                    {selectedInquiry.status !== "converted_to_order" &&
                      selectedInquiry.quotedTotal != null && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            handleConvertInquiry(selectedInquiry.id)
                          }
                        >
                          <ShoppingBag className="size-3.5" />
                          Convert to Order
                        </Button>
                      )}
                  </Card.Header>

                  <Card.Content className="space-y-5 pt-4">
                    {/* Specs Summary */}
                    <Surface
                      variant="secondary"
                      className="grid gap-3 rounded-2xl p-4 text-xs sm:grid-cols-2 tabular-nums"
                    >
                      <div>
                        <span className="text-muted">Product: </span>
                        <span className="font-medium text-foreground">
                          {selectedInquiry.productName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Size: </span>
                        <span className="font-medium text-foreground">
                          {selectedInquiry.selectedSize}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Substrate: </span>
                        <span className="font-medium text-foreground">
                          {selectedInquiry.material}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Finishing: </span>
                        <span className="font-medium text-foreground">
                          {selectedInquiry.finish}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Quantity: </span>
                        <span className="font-mono font-medium text-foreground">
                          {selectedInquiry.quantity.toLocaleString()}
                        </span>
                      </div>
                      {selectedInquiry.targetDate && (
                        <div>
                          <span className="text-muted">Target Date: </span>
                          <span className="font-mono font-medium text-foreground">
                            {selectedInquiry.targetDate}
                          </span>
                        </div>
                      )}
                      {selectedInquiry.customDimensions && (
                        <div className="sm:col-span-2">
                          <span className="text-muted">Custom Trim: </span>
                          <span className="font-mono text-foreground">
                            {selectedInquiry.customDimensions}
                          </span>
                        </div>
                      )}
                      {selectedInquiry.artworkUrl && (
                        <div className="flex items-center gap-1.5 sm:col-span-2">
                          <span className="text-muted">Artwork URL:</span>
                          {safeArtworkHref ? (
                            <Link
                              href={safeArtworkHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium"
                            >
                              Open Verified HTTPS Link
                              <ArrowUpRightFromSquare className="ml-1 size-3" />
                            </Link>
                          ) : (
                            <Chip size="sm" color="danger" variant="soft">
                              <Chip.Label>Blocked non-HTTPS link</Chip.Label>
                            </Chip>
                          )}
                        </div>
                      )}
                      {selectedInquiry.notes && (
                        <Surface className="rounded-xl p-3 text-muted sm:col-span-2">
                          <span className="font-medium text-foreground">
                            Client Notes:{" "}
                          </span>
                          {selectedInquiry.notes}
                        </Surface>
                      )}
                    </Surface>

                    <Separator />

                    {/* Estimator Pricing Form */}
                    <Form
                      onSubmit={handleSendQuoteSubmit}
                      className="flex flex-col gap-4"
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Issue Formal Quotation
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4 tabular-nums">
                        <NumberField
                          isRequired
                          minValue={0}
                          step={0.5}
                          variant="secondary"
                          value={quoteUnitPrice}
                          onChange={(v) =>
                            !Number.isNaN(v) && setQuoteUnitPrice(v)
                          }
                        >
                          <Label>Unit ({settings.currencySymbol})</Label>
                          <NumberField.Group>
                            <NumberField.DecrementButton />
                            <NumberField.Input />
                            <NumberField.IncrementButton />
                          </NumberField.Group>
                        </NumberField>

                        <NumberField
                          minValue={0}
                          step={10}
                          variant="secondary"
                          value={quoteSetupFee}
                          onChange={(v) =>
                            !Number.isNaN(v) && setQuoteSetupFee(v)
                          }
                        >
                          <Label>Setup Fee</Label>
                          <NumberField.Group>
                            <NumberField.DecrementButton />
                            <NumberField.Input />
                            <NumberField.IncrementButton />
                          </NumberField.Group>
                        </NumberField>

                        <NumberField
                          minValue={0}
                          step={10}
                          variant="secondary"
                          value={quoteDiscount}
                          onChange={(v) =>
                            !Number.isNaN(v) && setQuoteDiscount(v)
                          }
                        >
                          <Label>Discount</Label>
                          <NumberField.Group>
                            <NumberField.DecrementButton />
                            <NumberField.Input />
                            <NumberField.IncrementButton />
                          </NumberField.Group>
                        </NumberField>

                        <TextField
                          name="quoteValidUntil"
                          type="date"
                          value={quoteValidUntil}
                          onChange={setQuoteValidUntil}
                        >
                          <Label>Valid Until</Label>
                          <Input variant="secondary" />
                        </TextField>
                      </div>

                      <TextField
                        name="quoteRemarks"
                        value={quoteRemarks}
                        onChange={setQuoteRemarks}
                      >
                        <Label>Estimator Breakdown & Terms</Label>
                        <TextArea
                          variant="secondary"
                          rows={2}
                          placeholder="Include proof schedule, tooling details, or volume break notes..."
                        />
                      </TextField>

                      <Surface
                        variant="secondary"
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 tabular-nums"
                      >
                        <div>
                          <div className="text-xs text-muted">
                            Net Quotation ({selectedInquiry.quantity}×{" "}
                            {formatCurrency(quoteUnitPrice)} + Setup − Discount)
                          </div>
                          <div className="mt-0.5 font-mono text-xl font-semibold text-foreground">
                            {formatCurrency(computedQuoteTotal)}
                          </div>
                        </div>
                        <Button type="submit" variant="primary">
                          <FileText className="size-4" />
                          Publish Quotation
                        </Button>
                      </Surface>
                    </Form>
                  </Card.Content>
                </Card>
              ) : (
                <Card className="p-10">
                  <EmptyState className="flex flex-col items-center justify-center gap-2 text-center">
                    <Tray className="size-6 text-muted" />
                    <span className="text-sm text-muted">
                      Select an inquiry on the left to prepare an estimate.
                    </span>
                  </EmptyState>
                </Card>
              )}
            </div>
          </div>
        </Tabs.Panel>

        {/* ================================================================
            TAB 2: TAKE ORDERS (POS) & PRODUCTION MANAGEMENT
        ================================================================ */}
        <Tabs.Panel id="orders" className="space-y-8 pt-5">
          {/* COUNTER ORDER BUILDER */}
          <Card className="p-6">
            <Card.Header className="flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <Card.Title className="text-base">
                  Counter POS Order Entry
                </Card.Title>
                <Card.Description>
                  Compose multi-line walk-in or telephone orders with automatic
                  per-size calculation and reference generation.
                </Card.Description>
              </div>
              {createdWalkInRef && (
                <Surface
                  variant="secondary"
                  className="flex items-center gap-2.5 rounded-2xl px-4 py-2 text-xs"
                >
                  <Check className="size-4 text-success" />
                  <span>
                    Issued:{" "}
                    <strong className="font-mono text-foreground">
                      {createdWalkInRef}
                    </strong>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      navigator.clipboard.writeText(createdWalkInRef);
                      toast.success("Order reference copied");
                    }}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                </Surface>
              )}
            </Card.Header>

            <Card.Content className="space-y-5 pt-4">
              {activeProducts.length === 0 ? (
                <EmptyState className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                  <Tray className="size-6 text-muted" />
                  <p className="text-xs text-muted">
                    No active catalog products configured. Add products in
                    Administration to enable counter POS order entry.
                  </p>
                  {currentUser.role === "super_admin" && (
                    <NextLink href="/admin">
                      <Button size="sm" variant="primary">
                        Open Administration
                      </Button>
                    </NextLink>
                  )}
                </EmptyState>
              ) : (
                <Surface
                  variant="secondary"
                  className="grid items-end gap-3 rounded-2xl p-4 sm:grid-cols-12"
                >
                  <div className="sm:col-span-3">
                    <Select
                      value={posProductId}
                      onChange={(key) => key && setPosProductId(String(key))}
                    >
                      <Label>Product Line</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {activeProducts.map((p) => (
                            <ListBox.Item
                              key={p.id}
                              id={p.id}
                              textValue={p.name}
                            >
                              {p.name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="sm:col-span-3">
                    <Select
                      value={posSizeId}
                      onChange={(key) => key && setPosSizeId(String(key))}
                    >
                      <Label>Size Schedule</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {(posProduct?.sizes ?? []).map((sz) => {
                            const txt = `${sz.sizeLabel} (${formatCurrency(sz.unitPrice)})`;
                            return (
                              <ListBox.Item
                                key={sz.id}
                                id={sz.id}
                                textValue={txt}
                              >
                                {txt}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            );
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Select
                      value={posMaterial}
                      onChange={(key) => key && setPosMaterial(String(key))}
                    >
                      <Label>Substrate</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {(posProduct?.materials ?? []).map((m) => (
                            <ListBox.Item
                              key={m.name}
                              id={m.name}
                              textValue={m.name}
                            >
                              {m.name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Select
                      value={posFinish}
                      onChange={(key) => key && setPosFinish(String(key))}
                    >
                      <Label>Finish</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {(posProduct?.finishes ?? []).map((f) => (
                            <ListBox.Item
                              key={f.name}
                              id={f.name}
                              textValue={f.name}
                            >
                              {f.name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <NumberField
                      minValue={1}
                      step={1}
                      value={posQty}
                      onChange={(v) =>
                        !Number.isNaN(v) && setPosQty(Math.max(1, v))
                      }
                    >
                      <Label>Quantity</Label>
                      <NumberField.Group>
                        <NumberField.DecrementButton />
                        <NumberField.Input className="tabular-nums" />
                        <NumberField.IncrementButton />
                      </NumberField.Group>
                    </NumberField>
                  </div>

                  <div className="sm:col-span-12 flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      isDisabled={!posProduct}
                      onPress={handleAddPosItem}
                    >
                      <Plus className="size-4" />
                      Add Line Item
                    </Button>
                  </div>
                </Surface>
              )}

              {/* Draft Items + Checkout */}
              {draftItems.length > 0 && (
                <Form
                  onSubmit={handleCreateWalkInOrder}
                  className="flex flex-col gap-4"
                >
                  <Table variant="secondary">
                    <Table.ScrollContainer>
                      <Table.Content aria-label="Draft POS line items">
                        <Table.Header>
                          <Table.Column isRowHeader>Line Item</Table.Column>
                          <Table.Column>Stock & Finish</Table.Column>
                          <Table.Column>Total</Table.Column>
                          <Table.Column>Action</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {draftItems.map((item) => (
                            <Table.Row
                              key={item.id}
                              id={item.id}
                              className="tabular-nums"
                            >
                              <Table.Cell className="font-medium text-foreground">
                                {item.quantity}× {item.productName} —{" "}
                                {item.sizeLabel}
                              </Table.Cell>
                              <Table.Cell className="text-xs text-muted">
                                {item.material} · {item.finish}
                              </Table.Cell>
                              <Table.Cell className="font-mono font-medium text-foreground">
                                {formatCurrency(item.lineTotal)}
                              </Table.Cell>
                              <Table.Cell>
                                <Button
                                  size="sm"
                                  variant="danger-soft"
                                  isIconOnly
                                  aria-label="Remove line item"
                                  onPress={() =>
                                    setDraftItems((prev) =>
                                      prev.filter((x) => x.id !== item.id)
                                    )
                                  }
                                >
                                  <TrashBin className="size-3.5" />
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <TextField
                      isRequired
                      name="posCustomerName"
                      value={posCustomerName}
                      onChange={setPosCustomerName}
                    >
                      <Label>Client Name</Label>
                      <Input variant="secondary" placeholder="Full name" />
                      <FieldError />
                    </TextField>

                    <TextField
                      isRequired
                      name="posCustomerPhone"
                      value={posCustomerPhone}
                      onChange={setPosCustomerPhone}
                    >
                      <Label>Telephone / Mobile</Label>
                      <Input variant="secondary" placeholder="+63 917..." />
                      <FieldError />
                    </TextField>

                    <TextField
                      name="posCustomerEmail"
                      type="email"
                      value={posCustomerEmail}
                      onChange={setPosCustomerEmail}
                    >
                      <Label>Email (Optional)</Label>
                      <Input
                        variant="secondary"
                        placeholder="client@email.com"
                      />
                    </TextField>

                    <TextField
                      name="posEstDate"
                      type="date"
                      value={posEstDate}
                      onChange={setPosEstDate}
                    >
                      <Label>Scheduled Completion</Label>
                      <Input variant="secondary" />
                    </TextField>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <Select
                      variant="secondary"
                      value={posPaymentStatus}
                      onChange={(key) =>
                        key && setPosPaymentStatus(key as PaymentStatus)
                      }
                    >
                      <Label>Payment Status</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="paid" textValue="Paid in Full">
                            Paid in Full
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="downpayment_paid"
                            textValue="50% Downpayment"
                          >
                            50% Downpayment
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="unpaid"
                            textValue="Unpaid / Invoice"
                          >
                            Unpaid / Invoice
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Select
                      variant="secondary"
                      value={posPaymentMethod}
                      onChange={(key) => key && setPosPaymentMethod(String(key))}
                    >
                      <Label>Settlement Channel</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="cash" textValue="Counter Cash">
                            Counter Cash
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="gcash_ewallet"
                            textValue="GCash / Maya"
                          >
                            GCash / Maya
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="bank_transfer"
                            textValue="Bank Transfer"
                          >
                            Bank Transfer
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="card" textValue="Card Terminal">
                            Card Terminal
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <NumberField
                      minValue={0}
                      step={10}
                      variant="secondary"
                      value={posDiscount}
                      onChange={(v) => !Number.isNaN(v) && setPosDiscount(v)}
                    >
                      <Label>Discount ({settings.currencySymbol})</Label>
                      <NumberField.Group>
                        <NumberField.DecrementButton />
                        <NumberField.Input className="tabular-nums" />
                        <NumberField.IncrementButton />
                      </NumberField.Group>
                    </NumberField>

                    <Select
                      variant="secondary"
                      value={posDelivery}
                      onChange={(key) =>
                        key && setPosDelivery(key as "pickup" | "courier")
                      }
                    >
                      <Label>Fulfillment</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="pickup" textValue="Studio Pickup">
                            Studio Pickup
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item
                            id="courier"
                            textValue="Courier Dispatch"
                          >
                            Courier Dispatch
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <TextField
                    name="posNotes"
                    value={posNotes}
                    onChange={setPosNotes}
                  >
                    <Label>Production Job Ticket Notes</Label>
                    <Input
                      variant="secondary"
                      placeholder="File reference, Pantone spot inks, finishing notes..."
                    />
                  </TextField>

                  <Surface
                    variant="secondary"
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 tabular-nums"
                  >
                    <div className="space-y-0.5 text-xs">
                      <div className="text-muted">
                        Subtotal: {formatCurrency(posSubtotal)} · VAT (
                        {settings.taxRate}%): {formatCurrency(posTax)}
                      </div>
                      <div className="font-mono text-lg font-semibold text-foreground">
                        Total: {formatCurrency(posGrandTotal)}
                      </div>
                    </div>
                    <Button type="submit" variant="primary">
                      <ShoppingBag className="size-4" />
                      Issue Production Order
                    </Button>
                  </Surface>
                </Form>
              )}
            </Card.Content>
          </Card>

          {/* PRODUCTION ORDERS QUEUE */}
          <div className="space-y-3">
            <Typography.Heading level={2} className="text-lg font-bold">
              Production Schedule ({orders.length})
            </Typography.Heading>
            {orders.length === 0 ? (
              <Card className="p-8">
                <EmptyState className="flex flex-col items-center justify-center gap-2 text-center">
                  <Tray className="size-6 text-muted" />
                  <span className="text-xs text-muted">
                    No production orders logged yet.
                  </span>
                </EmptyState>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <Card key={ord.id} className="p-5 tabular-nums">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {ord.referenceNumber}
                          </span>
                          <Chip size="sm" color="accent" variant="soft">
                            <Chip.Label>
                              {ord.orderSource.replace(/_/g, " ")}
                            </Chip.Label>
                          </Chip>
                        </div>
                        <div className="text-xs text-muted">
                          <span className="font-medium text-foreground">
                            {ord.customerName}
                          </span>{" "}
                          ({ord.customerPhone}) ·{" "}
                          {ord.items
                            .map(
                              (i) =>
                                `${i.quantity}× ${i.productName} [${i.sizeLabel}]`
                            )
                            .join(", ")}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-end gap-3 text-xs">
                        <Select
                          className="w-44"
                          variant="secondary"
                          value={ord.productionStatus}
                          onChange={(key) => {
                            if (key) {
                              void updateOrderStatus(ord.id, {
                                productionStatus: key as ProductionStatus,
                              });
                            }
                          }}
                        >
                          <Label>Production Stage</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item
                                id="received"
                                textValue="01 Received"
                              >
                                01 Received
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id="prepress_check"
                                textValue="02 Pre-Press"
                              >
                                02 Pre-Press
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id="printing"
                                textValue="03 Printing"
                              >
                                03 Printing
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id="finishing"
                                textValue="04 Finishing"
                              >
                                04 Finishing
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id="ready_for_pickup"
                                textValue="05 Ready"
                              >
                                05 Ready
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id="completed"
                                textValue="06 Completed"
                              >
                                06 Completed
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id="cancelled"
                                textValue="Cancelled"
                              >
                                Cancelled
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        <Select
                          className="w-36"
                          variant="secondary"
                          value={ord.paymentStatus}
                          onChange={(key) => {
                            if (key) {
                              const nextPay = key as PaymentStatus;
                              void updateOrderStatus(ord.id, {
                                paymentStatus: nextPay,
                                amountPaid:
                                  nextPay === "paid"
                                    ? ord.totalAmount
                                    : ord.amountPaid,
                              });
                            }
                          }}
                        >
                          <Label>Payment</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="unpaid" textValue="Unpaid">
                                Unpaid
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item
                                id="downpayment_paid"
                                textValue="50% DP"
                              >
                                50% DP
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              <ListBox.Item id="paid" textValue="Paid">
                                Paid
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        <div className="pb-1 pl-2 text-right">
                          <div className="font-mono font-semibold text-foreground">
                            {formatCurrency(ord.totalAmount)}
                          </div>
                          <div className="font-mono text-[11px] text-muted">
                            Paid: {formatCurrency(ord.amountPaid)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs.Panel>

        {/* ================================================================
            TAB 3: CUSTOMER CHAT QUEUE & TICKETING CONSOLE
        ================================================================ */}
        <Tabs.Panel id="chatqueue" className="pt-5">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Queue Column */}
            <div className="space-y-3 lg:col-span-4">
              <Card className="p-4">
                <Card.Header className="flex-row items-center justify-between pb-3">
                  <Card.Title className="text-sm tabular-nums">
                    Queue ({queuedTickets.length})
                  </Card.Title>
                  <Button
                    size="sm"
                    variant="primary"
                    isDisabled={queuedTickets.length === 0}
                    onPress={handleClaimNext}
                  >
                    Claim Next
                  </Button>
                </Card.Header>

                <Card.Content className="space-y-3">
                  <ToggleButtonGroup
                    aria-label="Filter support queue"
                    size="sm"
                    fullWidth
                    selectionMode="single"
                    selectedKeys={new Set([ticketViewFilter])}
                    onSelectionChange={(keys) => {
                      const first = [...keys][0];
                      if (first)
                        setTicketViewFilter(
                          first as "queued" | "active" | "resolved"
                        );
                    }}
                  >
                    {(["queued", "active", "resolved"] as const).map(
                      (tab, idx) => (
                        <ToggleButton
                          key={tab}
                          id={tab}
                          className="capitalize tabular-nums"
                        >
                          {idx > 0 && <ToggleButtonGroup.Separator />}
                          {tab} (
                          {
                            tickets.filter((t) =>
                              tab === "resolved"
                                ? t.status === "resolved" ||
                                  t.status === "closed"
                                : t.status === tab
                            ).length
                          }
                          )
                        </ToggleButton>
                      )
                    )}
                  </ToggleButtonGroup>

                  <ScrollShadow className="max-h-[460px]">
                    <div className="space-y-2">
                      {filteredTicketsList.length === 0 ? (
                        <EmptyState className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                          <Comments className="size-5 text-muted" />
                          <span className="text-xs text-muted">
                            No {ticketViewFilter} tickets.
                          </span>
                        </EmptyState>
                      ) : (
                        filteredTicketsList.map((t) => {
                          const pos = getQueuePosition(t.id);
                          const isSel = selectedTicket?.id === t.id;
                          return (
                            <Surface
                              key={t.id}
                              variant={isSel ? "tertiary" : "secondary"}
                              onClick={() => setSelectedTicketId(t.id)}
                              className="cursor-pointer rounded-2xl p-3.5 transition-colors hover:bg-default"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-semibold text-foreground">
                                  {t.ticketNumber}
                                </span>
                                <div className="flex items-center gap-1 tabular-nums">
                                  {t.status === "queued" && (
                                    <Chip
                                      size="sm"
                                      color="warning"
                                      variant="soft"
                                    >
                                      <Chip.Label>#{pos}</Chip.Label>
                                    </Chip>
                                  )}
                                  <Chip
                                    size="sm"
                                    color={
                                      t.priority === "urgent"
                                        ? "danger"
                                        : t.priority === "high"
                                          ? "warning"
                                          : "default"
                                    }
                                    variant="soft"
                                  >
                                    <Chip.Label>{t.priority}</Chip.Label>
                                  </Chip>
                                </div>
                              </div>
                              <div className="mt-1 text-xs font-medium text-foreground">
                                {t.customerName} — {t.topic}
                              </div>
                              {t.linkedReference && (
                                <div className="mt-0.5 font-mono text-[11px] text-muted">
                                  Ref: {t.linkedReference}
                                </div>
                              )}
                            </Surface>
                          );
                        })
                      )}
                    </div>
                  </ScrollShadow>
                </Card.Content>
              </Card>
            </div>

            {/* Active Conversation */}
            <div className="lg:col-span-8">
              {selectedTicket ? (
                <Card className="flex h-[600px] flex-col overflow-hidden p-0">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Badge.Anchor>
                        <Avatar size="sm" color="accent">
                          <Avatar.Fallback>
                            <Headphones className="size-4" />
                          </Avatar.Fallback>
                        </Avatar>
                        <Badge
                          color={
                            selectedTicket.status === "active"
                              ? "success"
                              : "warning"
                          }
                          placement="bottom-right"
                          size="sm"
                        />
                      </Badge.Anchor>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {selectedTicket.ticketNumber}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {selectedTicket.customerName}
                          </span>
                          <span className="text-xs text-muted">
                            ({selectedTicket.customerEmail})
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          {selectedTicket.topic}
                          {selectedTicket.linkedReference
                            ? ` · Ref: ${selectedTicket.linkedReference}`
                            : ""}
                          {selectedTicket.assignedEmployeeName
                            ? ` · Assigned: ${selectedTicket.assignedEmployeeName}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        aria-label="Ticket priority"
                        className="w-32"
                        variant="secondary"
                        value={selectedTicket.priority}
                        onChange={(key) => {
                          if (key) {
                            void updateTicketStatus(selectedTicket.id, {
                              priority: key as TicketPriority,
                            });
                          }
                        }}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item id="normal" textValue="Standard">
                              Standard
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="high" textValue="High">
                              High
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="urgent" textValue="Urgent">
                              Urgent
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      {selectedTicket.status === "queued" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => void claimTicket(selectedTicket.id)}
                        >
                          Claim Ticket
                        </Button>
                      )}

                      {selectedTicket.status === "active" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            void updateTicketStatus(selectedTicket.id, {
                              status: "resolved",
                            })
                          }
                        >
                          <Check className="size-3.5" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Internal Staff Note Bar (Protected by RLS) */}
                  <Surface
                    variant="secondary"
                    className="flex items-center gap-2 border-b border-separator px-4 py-2"
                  >
                    <span className="shrink-0 text-xs font-medium text-muted">
                      Internal Note:
                    </span>
                    <TextField
                      aria-label="Internal staff note"
                      className="flex-1"
                      value={internalNoteDraft}
                      onChange={setInternalNoteDraft}
                    >
                      <Input
                        placeholder="Private staff handoff note (restricted to staff)..."
                        onBlur={() =>
                          void updateTicketStatus(selectedTicket.id, {
                            internalNotes: internalNoteDraft,
                          })
                        }
                      />
                    </TextField>
                  </Surface>

                  {/* Messages */}
                  <ScrollShadow className="flex-1 p-5">
                    <div className="space-y-3">
                      {selectedTicket.messages.map((m) => {
                        if (m.senderRole === "system") {
                          return (
                            <Surface
                              key={m.id}
                              variant="secondary"
                              className="mx-auto max-w-md rounded-xl px-3.5 py-2 text-center text-xs text-muted"
                            >
                              {m.message}
                            </Surface>
                          );
                        }
                        const isEmployee = m.senderRole === "employee";
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${
                              isEmployee ? "items-end" : "items-start"
                            }`}
                          >
                            <span className="mb-1 text-[11px] text-muted">
                              {m.senderName} ({m.senderRole})
                            </span>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                isEmployee
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-default text-foreground"
                              }`}
                            >
                              {m.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollShadow>

                  {/* Reply Box */}
                  <Form
                    onSubmit={handleStaffSendChat}
                    className="flex flex-row items-center gap-2 border-t border-separator p-4"
                  >
                    <TextField
                      aria-label="Reply to client"
                      className="flex-1"
                      value={staffReply}
                      onChange={setStaffReply}
                    >
                      <Input
                        variant="secondary"
                        placeholder={
                          selectedTicket.status === "queued"
                            ? "Reply to claim and respond..."
                            : "Write message to client..."
                        }
                      />
                    </TextField>
                    <Button type="submit" variant="primary">
                      <PaperPlane className="size-4" />
                      Send
                    </Button>
                  </Form>
                </Card>
              ) : (
                <Card className="p-12">
                  <EmptyState className="flex flex-col items-center justify-center gap-2 text-center">
                    <Comments className="size-6 text-muted" />
                    <span className="text-sm text-muted">
                      Select a ticket from the queue on the left.
                    </span>
                  </EmptyState>
                </Card>
              )}
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
