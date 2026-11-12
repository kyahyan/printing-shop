"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip, Tabs } from "@heroui/react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
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
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-muted">
        Loading Operations Desk...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Card className="border border-separator bg-surface p-8 space-y-4">
          <h1 className="text-lg font-semibold text-foreground">
            Staff Authorization Required
          </h1>
          <p className="text-xs leading-relaxed text-muted">
            Sign in with an active Employee or Super Administrator account to
            access quotations, counter POS orders, and the support queue.
          </p>
          <div className="flex justify-center">
            <Link href="/staff/login">
              <Button variant="primary">Open Staff Portal</Button>
            </Link>
          </div>
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

  const handleSendQuoteSubmit = async (e: React.FormEvent) => {
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
      setQuoteSavedToast(
        `Quotation ${selectedInquiry.referenceNumber} published (${formatCurrency(
          computedQuoteTotal
        )}).`
      );
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
        setQuoteSavedToast(
          `Converted quotation to Production Order ${ord.referenceNumber}.`
        );
        setTimeout(() => setQuoteSavedToast(null), 4000);
      }
    } catch (err) {
      setDeskError(
        err instanceof Error ? err.message : "Failed to convert quotation."
      );
    }
  };

  // POS Item Adder
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

  const handleCreateWalkInOrder = async (e: React.FormEvent) => {
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

  // Chat Queue Handlers
  const handleClaimNext = async () => {
    const claimed = await claimNextQueuedTicket();
    if (claimed) {
      setSelectedTicketId(claimed.id);
      setTicketViewFilter("active");
    }
  };

  const handleStaffSendChat = async (e: React.FormEvent) => {
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
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-separator pb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Operations Workspace · {currentUser.fullName} (
            {currentUser.department || currentUser.role.replace("_", " ")})
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Estimating, Production & Support Desk
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={currentUser.isOnline ? "primary" : "secondary"}
            onPress={() => toggleEmployeeOnline(currentUser.id)}
          >
            <span
              className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
                currentUser.isOnline
                  ? "bg-emerald-400"
                  : "bg-muted"
              }`}
            />
            {currentUser.isOnline ? "On Duty (Queue)" : "Away"}
          </Button>

          {currentUser.role === "super_admin" && (
            <Link href="/admin">
              <Button size="sm" variant="secondary">
                Administration
              </Button>
            </Link>
          )}
        </div>
      </div>

      {deskError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{deskError}</span>
        </div>
      )}

      {/* Operational KPI Ledger */}
      <div className="grid grid-cols-2 divide-x divide-y divide-separator overflow-hidden rounded-xl border border-separator bg-surface md:grid-cols-4 md:divide-y-0 tabular-nums">
        <div className="p-4">
          <div className="text-xs text-muted">Pending Quotations</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {pendingInquiriesCount}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {inquiries.length} total inquiries
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-muted">Active Production</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {activeOrdersCount}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            Pre-press, press & finishing
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-muted">Queued Support</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {queuedTickets.length}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {tickets.filter((t) => t.status === "active").length} active threads
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-muted">Ready for Release</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {readyForPickupCount}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            Awaiting pickup / dispatch
          </div>
        </div>
      </div>

      {/* WORKSPACE TABS */}
      <Tabs defaultSelectedKey="inquiries" className="space-y-5">
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
        <Tabs.Panel id="inquiries" className="space-y-4">
          {quoteSavedToast && (
            <div className="flex items-center gap-2 rounded-lg border border-separator bg-surface px-4 py-3 text-xs font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{quoteSavedToast}</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left List */}
            <div className="space-y-3 lg:col-span-5">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "All" },
                  { id: "pending_review", label: "Needs Quote" },
                  { id: "quoted", label: "Quoted" },
                  { id: "converted_to_order", label: "Converted" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setQuoteFilter(f.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      quoteFilter === f.id
                        ? "bg-foreground text-background"
                        : "border border-separator bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {filteredInquiries.length === 0 ? (
                  <Card className="border border-separator bg-surface p-8 text-center text-xs text-muted">
                    No quotation inquiries in this filter.
                  </Card>
                ) : (
                  filteredInquiries.map((inq) => {
                    const active = selectedInquiry?.id === inq.id;
                    return (
                      <Card
                        key={inq.id}
                        onClick={() => setSelectedInquiryId(inq.id)}
                        className={`cursor-pointer border p-4 transition-colors tabular-nums ${
                          active
                            ? "border-foreground/40 bg-surface-secondary"
                            : "border-separator bg-surface hover:bg-surface-secondary/50"
                        }`}
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
                            {inq.status.replace(/_/g, " ")}
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
                          <div className="mt-1.5 font-mono text-xs font-semibold text-foreground">
                            Quoted: {formatCurrency(inq.quotedTotal)}
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Estimator Composer */}
            <div className="lg:col-span-7">
              {selectedInquiry ? (
                <Card className="border border-separator bg-surface p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-separator pb-4">
                    <div>
                      <span className="font-mono text-base font-semibold text-foreground">
                        {selectedInquiry.referenceNumber}
                      </span>
                      <h2 className="mt-1 text-base font-semibold text-foreground">
                        {selectedInquiry.subject}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted">
                        {selectedInquiry.customerName} (
                        {selectedInquiry.customerEmail} ·{" "}
                        {selectedInquiry.customerPhone})
                        {selectedInquiry.companyName
                          ? ` — ${selectedInquiry.companyName}`
                          : ""}
                      </p>
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
                          Convert to Order
                        </Button>
                      )}
                  </div>

                  {/* Specs Summary */}
                  <div className="grid gap-3 rounded-lg border border-separator bg-background p-4 text-xs sm:grid-cols-2 tabular-nums">
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
                      <div className="sm:col-span-2 flex items-center gap-1.5">
                        <span className="text-muted">Artwork URL:</span>
                        {safeArtworkHref ? (
                          <a
                            href={safeArtworkHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                          >
                            Open Verified HTTPS Link
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-danger">
                            Blocked non-HTTPS link
                          </span>
                        )}
                      </div>
                    )}
                    {selectedInquiry.notes && (
                      <div className="sm:col-span-2 rounded-md border border-separator bg-surface p-2.5 text-muted">
                        <span className="font-medium text-foreground">
                          Client Notes:{" "}
                        </span>
                        {selectedInquiry.notes}
                      </div>
                    )}
                  </div>

                  {/* Estimator Pricing Form */}
                  <form onSubmit={handleSendQuoteSubmit} className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Issue Formal Quotation
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-4 tabular-nums">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Unit Rate ({settings.currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          required
                          value={quoteUnitPrice}
                          onChange={(e) =>
                            setQuoteUnitPrice(
                              Number.parseFloat(e.target.value || "0")
                            )
                          }
                          className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm font-medium text-foreground outline-none focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Setup / Tooling
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={quoteSetupFee}
                          onChange={(e) =>
                            setQuoteSetupFee(
                              Number.parseFloat(e.target.value || "0")
                            )
                          }
                          className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Discount ({settings.currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={quoteDiscount}
                          onChange={(e) =>
                            setQuoteDiscount(
                              Number.parseFloat(e.target.value || "0")
                            )
                          }
                          className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Valid Until
                        </label>
                        <input
                          type="date"
                          value={quoteValidUntil}
                          onChange={(e) => setQuoteValidUntil(e.target.value)}
                          className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">
                        Estimator Breakdown & Terms
                      </label>
                      <textarea
                        rows={2}
                        value={quoteRemarks}
                        onChange={(e) => setQuoteRemarks(e.target.value)}
                        placeholder="Include proof schedule, tooling details, or volume break notes..."
                        className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-separator bg-surface-secondary/50 p-4 tabular-nums">
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
                        Publish Quotation
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
                  Select an inquiry on the left to prepare an estimate.
                </Card>
              )}
            </div>
          </div>
        </Tabs.Panel>

        {/* ================================================================
            TAB 2: TAKE ORDERS (POS) & PRODUCTION MANAGEMENT
        ================================================================ */}
        <Tabs.Panel id="orders" className="space-y-8">
          {/* COUNTER ORDER BUILDER */}
          <Card className="border border-separator bg-surface p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator pb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Counter POS Order Entry
                </h2>
                <p className="text-xs text-muted">
                  Compose multi-line walk-in or telephone orders with automatic
                  per-size calculation and reference generation.
                </p>
              </div>
              {createdWalkInRef && (
                <div className="flex items-center gap-2 rounded-lg border border-separator bg-surface-secondary px-3.5 py-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Issued:{" "}
                    <strong className="font-mono text-foreground">
                      {createdWalkInRef}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(createdWalkInRef)
                    }
                    className="rounded border border-separator bg-surface px-2 py-0.5 text-[11px] font-medium hover:text-accent"
                  >
                    <Copy className="mr-1 inline h-3 w-3" />
                    Copy
                  </button>
                </div>
              )}
            </div>

            {activeProducts.length === 0 ? (
              <div className="rounded-lg border border-separator bg-background p-6 text-center text-xs text-muted">
                No active catalog products configured. Add products in{" "}
                <Link
                  href="/admin"
                  className="font-medium text-accent hover:underline"
                >
                  Administration
                </Link>{" "}
                to enable counter POS order entry.
              </div>
            ) : (
              <div className="grid items-end gap-3 rounded-lg border border-separator bg-background p-4 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Product Line
                  </label>
                  <select
                    value={posProductId}
                    onChange={(e) => setPosProductId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-separator bg-surface px-2.5 text-xs text-foreground outline-none focus:border-accent"
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Size Schedule
                  </label>
                  <select
                    value={posSizeId}
                    onChange={(e) => setPosSizeId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-separator bg-surface px-2.5 text-xs text-foreground outline-none focus:border-accent"
                  >
                    {posProduct?.sizes.map((sz) => (
                      <option key={sz.id} value={sz.id}>
                        {sz.sizeLabel} ({formatCurrency(sz.unitPrice)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Substrate
                  </label>
                  <select
                    value={posMaterial}
                    onChange={(e) => setPosMaterial(e.target.value)}
                    className="h-9 w-full rounded-lg border border-separator bg-surface px-2.5 text-xs text-foreground outline-none focus:border-accent"
                  >
                    {posProduct?.materials.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Finish
                  </label>
                  <select
                    value={posFinish}
                    onChange={(e) => setPosFinish(e.target.value)}
                    className="h-9 w-full rounded-lg border border-separator bg-surface px-2.5 text-xs text-foreground outline-none focus:border-accent"
                  >
                    {posProduct?.finishes.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={posQty}
                    onChange={(e) =>
                      setPosQty(
                        Math.max(1, Number.parseInt(e.target.value || "1", 10))
                      )
                    }
                    className="h-9 w-full rounded-lg border border-separator bg-surface px-2.5 font-mono text-xs font-medium text-foreground outline-none focus:border-accent tabular-nums"
                  />
                </div>

                <div className="sm:col-span-1">
                  <Button
                    size="sm"
                    variant="primary"
                    fullWidth
                    className="h-9"
                    isDisabled={!posProduct}
                    onPress={handleAddPosItem}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Draft Items + Checkout */}
            {draftItems.length > 0 && (
              <form onSubmit={handleCreateWalkInOrder} className="space-y-4">
                <div className="divide-y divide-separator rounded-lg border border-separator tabular-nums">
                  {draftItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-medium text-foreground">
                          {item.quantity}× {item.productName} — {item.sizeLabel}
                        </span>
                        <span className="ml-2 text-muted">
                          ({item.material} · {item.finish})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-foreground">
                          {formatCurrency(item.lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftItems((prev) =>
                              prev.filter((x) => x.id !== item.id)
                            )
                          }
                          className="text-muted hover:text-danger"
                          aria-label="Remove line item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <input
                    required
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                    placeholder="Client Full Name *"
                    className="h-9 rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                  />
                  <input
                    required
                    value={posCustomerPhone}
                    onChange={(e) => setPosCustomerPhone(e.target.value)}
                    placeholder="Telephone / Mobile *"
                    className="h-9 rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                  />
                  <input
                    type="email"
                    value={posCustomerEmail}
                    onChange={(e) => setPosCustomerEmail(e.target.value)}
                    placeholder="Client Email (Optional)"
                    className="h-9 rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                  />
                  <input
                    type="date"
                    value={posEstDate}
                    onChange={(e) => setPosEstDate(e.target.value)}
                    className="h-9 rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                    title="Scheduled completion date"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted">
                      Payment Status
                    </label>
                    <select
                      value={posPaymentStatus}
                      onChange={(e) =>
                        setPosPaymentStatus(e.target.value as PaymentStatus)
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                    >
                      <option value="paid">Paid in Full</option>
                      <option value="downpayment_paid">50% Downpayment</option>
                      <option value="unpaid">Unpaid / Invoice</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-muted">
                      Settlement Channel
                    </label>
                    <select
                      value={posPaymentMethod}
                      onChange={(e) => setPosPaymentMethod(e.target.value)}
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                    >
                      <option value="cash">Counter Cash</option>
                      <option value="gcash_ewallet">GCash / Maya</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card Terminal</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-muted">
                      Discount ({settings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={posDiscount}
                      onChange={(e) =>
                        setPosDiscount(
                          Number.parseFloat(e.target.value || "0")
                        )
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-xs text-foreground outline-none focus:border-accent tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-muted">
                      Fulfillment
                    </label>
                    <select
                      value={posDelivery}
                      onChange={(e) =>
                        setPosDelivery(e.target.value as "pickup" | "courier")
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                    >
                      <option value="pickup">Studio Pickup</option>
                      <option value="courier">Courier Dispatch</option>
                    </select>
                  </div>
                </div>

                <input
                  value={posNotes}
                  onChange={(e) => setPosNotes(e.target.value)}
                  placeholder="Production job ticket notes (file reference, Pantone, finishing instructions)..."
                  className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                />

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-separator bg-surface-secondary/50 p-4 tabular-nums">
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
                    Issue Production Order
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* PRODUCTION ORDERS QUEUE */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Production Schedule ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <Card className="border border-separator bg-surface p-8 text-center text-xs text-muted">
                No production orders logged yet.
              </Card>
            ) : (
              <div className="space-y-2.5">
                {orders.map((ord) => (
                  <Card
                    key={ord.id}
                    className="border border-separator bg-surface p-5 tabular-nums"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {ord.referenceNumber}
                          </span>
                          <Chip size="sm" color="default" variant="secondary">
                            {ord.orderSource.replace(/_/g, " ")}
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

                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div>
                          <label className="mr-1.5 text-muted">Stage:</label>
                          <select
                            value={ord.productionStatus}
                            onChange={(e) =>
                              updateOrderStatus(ord.id, {
                                productionStatus: e.target
                                  .value as ProductionStatus,
                              })
                            }
                            className="h-8 rounded-md border border-separator bg-background px-2.5 font-medium text-foreground outline-none focus:border-accent"
                          >
                            <option value="received">01 Received</option>
                            <option value="prepress_check">02 Pre-Press</option>
                            <option value="printing">03 Printing</option>
                            <option value="finishing">04 Finishing</option>
                            <option value="ready_for_pickup">05 Ready</option>
                            <option value="completed">06 Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div>
                          <label className="mr-1.5 text-muted">Payment:</label>
                          <select
                            value={ord.paymentStatus}
                            onChange={(e) => {
                              const nextPay = e.target.value as PaymentStatus;
                              updateOrderStatus(ord.id, {
                                paymentStatus: nextPay,
                                amountPaid:
                                  nextPay === "paid"
                                    ? ord.totalAmount
                                    : ord.amountPaid,
                              });
                            }}
                            className="h-8 rounded-md border border-separator bg-background px-2.5 font-medium text-foreground outline-none focus:border-accent"
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="downpayment_paid">50% DP</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>

                        <div className="pl-2 text-right">
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
        <Tabs.Panel id="chatqueue">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Queue Column */}
            <div className="space-y-3 lg:col-span-4">
              <Card className="border border-separator bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground tabular-nums">
                    Queue ({queuedTickets.length})
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    isDisabled={queuedTickets.length === 0}
                    onPress={handleClaimNext}
                  >
                    Claim Next
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-lg border border-separator bg-surface-secondary p-1 text-xs tabular-nums">
                  {(["queued", "active", "resolved"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTicketViewFilter(tab)}
                      className={`rounded-md py-1.5 font-medium capitalize transition-colors ${
                        ticketViewFilter === tab
                          ? "bg-surface text-foreground shadow-2xs"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {tab} (
                      {
                        tickets.filter((t) =>
                          tab === "resolved"
                            ? t.status === "resolved" || t.status === "closed"
                            : t.status === tab
                        ).length
                      }
                      )
                    </button>
                  ))}
                </div>

                <div className="max-h-[470px] space-y-2 overflow-y-auto">
                  {filteredTicketsList.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted">
                      No {ticketViewFilter} tickets.
                    </p>
                  ) : (
                    filteredTicketsList.map((t) => {
                      const pos = getQueuePosition(t.id);
                      const isSel = selectedTicket?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                            isSel
                              ? "border-foreground/40 bg-surface-secondary"
                              : "border-separator bg-background hover:bg-surface-secondary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {t.ticketNumber}
                            </span>
                            <div className="flex items-center gap-1 tabular-nums">
                              {t.status === "queued" && (
                                <Chip size="sm" color="warning" variant="soft">
                                  #{pos}
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
                                {t.priority}
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
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Active Conversation */}
            <div className="lg:col-span-8">
              {selectedTicket ? (
                <Card className="flex h-[580px] flex-col overflow-hidden border border-separator bg-surface p-0">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator bg-surface-secondary/60 px-5 py-3.5">
                    <div>
                      <div className="flex items-center gap-2">
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

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) =>
                          updateTicketStatus(selectedTicket.id, {
                            priority: e.target.value as TicketPriority,
                          })
                        }
                        className="h-8 rounded-md border border-separator bg-surface px-2.5 text-xs text-foreground outline-none focus:border-accent"
                      >
                        <option value="normal">Standard</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>

                      {selectedTicket.status === "queued" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => claimTicket(selectedTicket.id)}
                        >
                          Claim Ticket
                        </Button>
                      )}

                      {selectedTicket.status === "active" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            updateTicketStatus(selectedTicket.id, {
                              status: "resolved",
                            })
                          }
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Internal Staff Note Bar (Protected by RLS — never exposed via RPC to clients) */}
                  <div className="flex items-center gap-2 border-b border-separator bg-background px-4 py-2 text-xs">
                    <span className="shrink-0 font-medium text-muted">
                      Internal Note:
                    </span>
                    <input
                      value={internalNoteDraft}
                      onChange={(e) => setInternalNoteDraft(e.target.value)}
                      onBlur={() =>
                        updateTicketStatus(selectedTicket.id, {
                          internalNotes: internalNoteDraft,
                        })
                      }
                      placeholder="Private staff handoff note (restricted to staff)..."
                      className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted"
                    />
                  </div>

                  {/* Messages */}
                  <div className="flex-1 space-y-3 overflow-y-auto p-5">
                    {selectedTicket.messages.map((m) => {
                      if (m.senderRole === "system") {
                        return (
                          <div
                            key={m.id}
                            className="mx-auto max-w-md rounded-md border border-separator bg-surface-secondary/50 px-3 py-1.5 text-center text-[11px] text-muted"
                          >
                            {m.message}
                          </div>
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
                            className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              isEmployee
                                ? "bg-foreground text-background"
                                : "border border-separator bg-surface-secondary text-foreground"
                            }`}
                          >
                            {m.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Box */}
                  <form
                    onSubmit={handleStaffSendChat}
                    className="flex items-center gap-2 border-t border-separator p-4"
                  >
                    <input
                      value={staffReply}
                      onChange={(e) => setStaffReply(e.target.value)}
                      placeholder={
                        selectedTicket.status === "queued"
                          ? "Reply to claim and respond..."
                          : "Write message to client..."
                      }
                      className="h-10 flex-1 rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                    <Button type="submit" variant="primary" className="h-10">
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </form>
                </Card>
              ) : (
                <Card className="border border-separator bg-surface p-12 text-center text-sm text-muted">
                  Select a ticket from the queue on the left.
                </Card>
              )}
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
