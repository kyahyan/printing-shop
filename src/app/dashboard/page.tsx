"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip, Tabs } from "@heroui/react";
import {
  Briefcase,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Headset,
  Package,
  Plus,
  Printer,
  Send,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserCheck,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type {
  OrderItem,
  PaymentStatus,
  ProductionStatus,
  TicketPriority,
} from "@/types/printshop";

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
    () => inquiries.find((i) => i.id === selectedInquiryId) ?? inquiries[0] ?? null,
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
      // Auto-suggest benchmark price from catalog product if matched
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
    () => activeProducts.find((p) => p.id === posProductId) ?? activeProducts[0],
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
  const [posAmountPaid, setPosAmountPaid] = useState<number>(0);
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
        Loading Employee Operations Desk...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <Card className="border border-separator bg-surface p-8 space-y-4">
          <Briefcase className="mx-auto h-12 w-12 text-accent" />
          <h1 className="text-2xl font-extrabold text-foreground">
            Employee Authorization Required
          </h1>
          <p className="text-sm text-muted">
            Sign in with an Employee or Super Admin account to access Inquiries,
            Order Taking, and the Customer Support Chat Queue.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/staff/login">
              <Button variant="primary">Go to Staff Login</Button>
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
    (o) => o.productionStatus !== "completed" && o.productionStatus !== "cancelled"
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

  const handleSendQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;
    await sendQuotation(selectedInquiry.id, {
      quotedUnitPrice: quoteUnitPrice,
      quotedSetupFee: quoteSetupFee,
      quotedDiscount: quoteDiscount,
      staffRemarks: quoteRemarks,
      validUntil: quoteValidUntil,
    });
    setQuoteSavedToast(
      `Quotation ${selectedInquiry.referenceNumber} sent (${formatCurrency(
        computedQuoteTotal
      )})`
    );
    setTimeout(() => setQuoteSavedToast(null), 3500);
  };

  const handleConvertInquiry = async (inquiryId: string) => {
    const ord = await convertQuotationToOrder(inquiryId, {
      paymentStatus: "downpayment_paid",
      paymentMethod: "bank_transfer",
      deliveryMethod: "pickup",
    });
    if (ord) {
      setQuoteSavedToast(
        `Converted to Production Order ${ord.referenceNumber}!`
      );
      setTimeout(() => setQuoteSavedToast(null), 4000);
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
    const paid =
      posPaymentStatus === "paid"
        ? posGrandTotal
        : posPaymentStatus === "unpaid"
        ? 0
        : posAmountPaid || Number((posGrandTotal * 0.5).toFixed(2));

    const created = await createOrder({
      customerName: posCustomerName,
      customerEmail: posCustomerEmail || "walkin@customer.local",
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
  };

  const filteredTicketsList = tickets.filter((t) => {
    if (ticketViewFilter === "queued") return t.status === "queued";
    if (ticketViewFilter === "active") return t.status === "active";
    return t.status === "resolved" || t.status === "closed";
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Top Staff Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-separator pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Chip size="sm" color="accent" variant="soft">
              Employee Operations Desk
            </Chip>
            <span className="text-xs text-muted">
              Signed in as{" "}
              <strong className="text-foreground">{currentUser.fullName}</strong>{" "}
              ({currentUser.department || currentUser.role})
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
            Inquiries, Order Desk & Support Queue
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant={currentUser.isOnline ? "primary" : "secondary"}
            onPress={() => toggleEmployeeOnline(currentUser.id)}
          >
            <UserCheck className="h-4 w-4" />
            {currentUser.isOnline
              ? "Queue Status: Online"
              : "Queue Status: Away"}
          </Button>

          {currentUser.role === "super_admin" && (
            <Link href="/admin">
              <Button size="sm" variant="secondary">
                <ShieldCheck className="h-4 w-4" />
                Super Admin Settings & Pricing
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border border-separator bg-surface p-4">
          <div className="text-xs text-muted">Pending Quote Inquiries</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-500">
            {pendingInquiriesCount}
          </div>
          <div className="text-[11px] text-muted">
            {inquiries.length} total inquiries logged
          </div>
        </Card>

        <Card className="border border-separator bg-surface p-4">
          <div className="text-xs text-muted">Active Production Jobs</div>
          <div className="mt-1 text-2xl font-extrabold text-accent">
            {activeOrdersCount}
          </div>
          <div className="text-[11px] text-muted">
            Across pre-press, press & finishing
          </div>
        </Card>

        <Card className="border border-separator bg-surface p-4">
          <div className="text-xs text-muted">Waiting in Chat Queue</div>
          <div className="mt-1 text-2xl font-extrabold text-rose-500">
            {queuedTickets.length}
          </div>
          <div className="text-[11px] text-muted">
            {tickets.filter((t) => t.status === "active").length} active chats
            in progress
          </div>
        </Card>

        <Card className="border border-separator bg-surface p-4">
          <div className="text-xs text-muted">Ready for Customer Pickup</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-500">
            {
              orders.filter((o) => o.productionStatus === "ready_for_pickup")
                .length
            }
          </div>
          <div className="text-[11px] text-muted">Awaiting release / courier</div>
        </Card>
      </div>

      {/* WORKSPACE TABS */}
      <Tabs defaultSelectedKey="inquiries" className="space-y-5">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Employee workspace modules">
            <Tabs.Tab id="inquiries">
              Inquiries & Quotations ({inquiries.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="orders">
              Take Orders (POS) & Production ({orders.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="chatqueue">
              Customer Chat Queue ({queuedTickets.length} Waiting)
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ================================================================
            TAB 1: INQUIRIES & QUOTATIONS DESK
        ================================================================ */}
        <Tabs.Panel id="inquiries" className="space-y-4">
          {quoteSavedToast && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-500">
              {quoteSavedToast}
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      quoteFilter === f.id
                        ? "bg-accent text-accent-foreground"
                        : "border border-separator bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {filteredInquiries.length === 0 ? (
                  <Card className="border border-dashed border-separator bg-surface p-8 text-center text-xs text-muted">
                    No inquiries found in this view yet.
                  </Card>
                ) : (
                  filteredInquiries.map((inq) => {
                    const active = selectedInquiry?.id === inq.id;
                    return (
                      <Card
                        key={inq.id}
                        onClick={() => setSelectedInquiryId(inq.id)}
                        className={`cursor-pointer border p-4 transition ${
                          active
                            ? "border-accent bg-accent/8"
                            : "border-separator bg-surface hover:border-accent/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-accent">
                            {inq.referenceNumber}
                          </span>
                          <Chip
                            size="sm"
                            color={
                              inq.status === "pending_review"
                                ? "warning"
                                : inq.status === "quoted"
                                ? "success"
                                : "accent"
                            }
                            variant="soft"
                          >
                            {inq.status.replace(/_/g, " ")}
                          </Chip>
                        </div>
                        <div className="mt-1.5 text-sm font-bold text-foreground line-clamp-1">
                          {inq.subject}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {inq.customerName} • Qty:{" "}
                          {inq.quantity.toLocaleString()} • {inq.selectedSize}
                        </div>
                        {inq.quotedTotal != null && (
                          <div className="mt-1.5 text-xs font-bold text-emerald-500">
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
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-accent" />
                        <span className="font-mono text-lg font-extrabold text-accent">
                          {selectedInquiry.referenceNumber}
                        </span>
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-foreground">
                        {selectedInquiry.subject}
                      </h2>
                      <p className="text-xs text-muted">
                        {selectedInquiry.customerName} (
                        {selectedInquiry.customerEmail} •{" "}
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
                          <ShoppingBag className="h-4 w-4" />
                          Convert to Order
                        </Button>
                      )}
                  </div>

                  {/* Specs Summary */}
                  <div className="grid gap-3 rounded-xl bg-surface-secondary/60 p-4 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-muted">Product:</span>{" "}
                      <strong className="text-foreground">
                        {selectedInquiry.productName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted">Selected Size:</span>{" "}
                      <strong className="text-foreground">
                        {selectedInquiry.selectedSize}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted">Material:</span>{" "}
                      <strong className="text-foreground">
                        {selectedInquiry.material}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted">Finish:</span>{" "}
                      <strong className="text-foreground">
                        {selectedInquiry.finish}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted">Quantity:</span>{" "}
                      <strong className="text-foreground">
                        {selectedInquiry.quantity.toLocaleString()}
                      </strong>
                    </div>
                    {selectedInquiry.targetDate && (
                      <div>
                        <span className="text-muted">Target Deadline:</span>{" "}
                        <strong className="text-amber-500">
                          {selectedInquiry.targetDate}
                        </strong>
                      </div>
                    )}
                    {selectedInquiry.customDimensions && (
                      <div className="sm:col-span-2">
                        <span className="text-muted">Custom Dimensions:</span>{" "}
                        <strong className="text-foreground">
                          {selectedInquiry.customDimensions}
                        </strong>
                      </div>
                    )}
                    {selectedInquiry.artworkUrl && (
                      <div className="sm:col-span-2 flex items-center gap-1.5">
                        <span className="text-muted">Artwork File:</span>
                        <a
                          href={selectedInquiry.artworkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                        >
                          Open Customer Artwork Link
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {selectedInquiry.notes && (
                      <div className="sm:col-span-2 rounded-lg bg-surface p-2.5 text-muted">
                        <strong className="text-foreground">
                          Customer Notes:
                        </strong>{" "}
                        {selectedInquiry.notes}
                      </div>
                    )}
                  </div>

                  {/* Estimator Pricing Form */}
                  <form onSubmit={handleSendQuoteSubmit} className="space-y-4">
                    <h3 className="text-sm font-bold text-foreground">
                      Prepare & Send Formal Quotation
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Unit Price ({settings.currencySymbol})
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
                          className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm font-semibold text-foreground"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Setup / Die Fee
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
                          className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
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
                          className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
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
                          className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">
                        Estimator Remarks / Breakdown Note to Customer
                      </label>
                      <textarea
                        rows={2}
                        value={quoteRemarks}
                        onChange={(e) => setQuoteRemarks(e.target.value)}
                        placeholder="e.g., Includes digital proof, die-line setup, and 500+ bulk discount tier."
                        className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
                      <div>
                        <div className="text-xs text-muted">
                          Calculated Net Quotation ({selectedInquiry.quantity}×{" "}
                          {formatCurrency(quoteUnitPrice)} + Setup − Discount)
                        </div>
                        <div className="text-2xl font-extrabold text-accent">
                          {formatCurrency(computedQuoteTotal)}
                        </div>
                      </div>
                      <Button type="submit" variant="primary">
                        <Send className="h-4 w-4" />
                        Publish Quotation to Reference #
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Card className="border border-separator bg-surface p-10 text-center text-sm text-muted">
                  Select an inquiry on the left to prepare a quotation.
                </Card>
              )}
            </div>
          </div>
        </Tabs.Panel>

        {/* ================================================================
            TAB 2: TAKE ORDERS (POS) & PRODUCTION MANAGEMENT
        ================================================================ */}
        <Tabs.Panel id="orders" className="space-y-8">
          {/* WALK-IN / PHONE COUNTER ORDER TAKING */}
          <Card className="border border-separator bg-surface p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Take Customer Order (Walk-In / Phone Counter POS)
                </h2>
                <p className="text-xs text-muted">
                  Build a multi-item print order using live per-size pricing and
                  issue an instant{" "}
                  <code className="font-mono">{settings.orderPrefix}-...</code>{" "}
                  Reference Slip.
                </p>
              </div>
              {createdWalkInRef && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>
                    Created Ref:{" "}
                    <strong className="font-mono text-emerald-500">
                      {createdWalkInRef}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(createdWalkInRef)
                    }
                    className="rounded bg-surface px-2 py-0.5 font-medium hover:text-accent"
                  >
                    <Copy className="inline h-3 w-3 mr-1" />
                    Copy
                  </button>
                </div>
              )}
            </div>

            {/* Line Item Selector */}
            {activeProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-separator bg-surface-secondary/40 p-6 text-center text-xs text-muted">
                No active catalog products yet. Create products and size pricing
                in{" "}
                <Link href="/admin" className="font-semibold text-accent underline">
                  Super Admin
                </Link>{" "}
                to enable counter POS order taking.
              </div>
            ) : (
              <div className="grid gap-3 rounded-xl bg-surface-secondary/50 p-4 sm:grid-cols-12 items-end">
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-muted">
                    Product
                  </label>
                  <select
                    value={posProductId}
                    onChange={(e) => setPosProductId(e.target.value)}
                    className="w-full rounded-xl border border-separator bg-surface px-3 py-2 text-xs text-foreground"
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
                    Size (Price Per Size)
                  </label>
                  <select
                    value={posSizeId}
                    onChange={(e) => setPosSizeId(e.target.value)}
                    className="w-full rounded-xl border border-separator bg-surface px-3 py-2 text-xs text-foreground"
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
                    Material
                  </label>
                  <select
                    value={posMaterial}
                    onChange={(e) => setPosMaterial(e.target.value)}
                    className="w-full rounded-xl border border-separator bg-surface px-3 py-2 text-xs text-foreground"
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
                    className="w-full rounded-xl border border-separator bg-surface px-3 py-2 text-xs text-foreground"
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
                    className="w-full rounded-xl border border-separator bg-surface px-2.5 py-2 text-xs font-bold text-foreground"
                  />
                </div>

                <div className="sm:col-span-1">
                  <Button
                    size="sm"
                    variant="primary"
                    fullWidth
                    isDisabled={!posProduct}
                    onPress={handleAddPosItem}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Draft Items + Customer Checkout */}
            {draftItems.length > 0 && (
              <form onSubmit={handleCreateWalkInOrder} className="space-y-4">
                <div className="divide-y divide-separator rounded-xl border border-separator">
                  {draftItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground">
                          {item.quantity}× {item.productName} — {item.sizeLabel}
                        </span>
                        <span className="ml-2 text-muted">
                          ({item.material} • {item.finish})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">
                          {formatCurrency(item.lineTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraftItems((prev) =>
                              prev.filter((x) => x.id !== item.id)
                            )
                          }
                          className="text-rose-500 hover:opacity-80"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
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
                    placeholder="Customer Full Name *"
                    className="rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                  />
                  <input
                    required
                    value={posCustomerPhone}
                    onChange={(e) => setPosCustomerPhone(e.target.value)}
                    placeholder="Mobile Number *"
                    className="rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                  />
                  <input
                    type="email"
                    value={posCustomerEmail}
                    onChange={(e) => setPosCustomerEmail(e.target.value)}
                    placeholder="Customer Email (Optional)"
                    className="rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                  />
                  <input
                    type="date"
                    value={posEstDate}
                    onChange={(e) => setPosEstDate(e.target.value)}
                    className="rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                    title="Estimated completion date"
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
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                    >
                      <option value="paid">Paid in Full</option>
                      <option value="downpayment_paid">50% Downpayment</option>
                      <option value="unpaid">Unpaid / Bill Later</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-muted">
                      Payment Method
                    </label>
                    <select
                      value={posPaymentMethod}
                      onChange={(e) => setPosPaymentMethod(e.target.value)}
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                    >
                      <option value="cash">Cash Counter</option>
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
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-muted">
                      Release Mode
                    </label>
                    <select
                      value={posDelivery}
                      onChange={(e) =>
                        setPosDelivery(e.target.value as "pickup" | "courier")
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                    >
                      <option value="pickup">Counter Pickup</option>
                      <option value="courier">Courier Dispatch</option>
                    </select>
                  </div>
                </div>

                <input
                  value={posNotes}
                  onChange={(e) => setPosNotes(e.target.value)}
                  placeholder="Job ticket notes (file name, lamination instruction, Pantone code)..."
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                />

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
                  <div className="text-xs space-y-0.5">
                    <div className="text-muted">
                      Subtotal: {formatCurrency(posSubtotal)} • VAT (
                      {settings.taxRate}%): {formatCurrency(posTax)}
                    </div>
                    <div className="text-xl font-extrabold text-accent">
                      Grand Total: {formatCurrency(posGrandTotal)}
                    </div>
                  </div>
                  <Button type="submit" variant="primary">
                    <Printer className="h-4 w-4" />
                    Issue Order & Generate Reference #
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* LIVE PRODUCTION ORDERS QUEUE */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">
              Active Print Floor Orders ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <Card className="border border-dashed border-separator bg-surface p-8 text-center text-xs text-muted">
                No production orders have been placed yet.
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                <Card
                  key={ord.id}
                  className="border border-separator bg-surface p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-accent" />
                        <span className="font-mono text-base font-extrabold text-accent">
                          {ord.referenceNumber}
                        </span>
                        <Chip size="sm" color="default" variant="secondary">
                          {ord.orderSource.replace("_", " ")}
                        </Chip>
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        <strong className="text-foreground">
                          {ord.customerName}
                        </strong>{" "}
                        ({ord.customerPhone}) •{" "}
                        {ord.items
                          .map(
                            (i) =>
                              `${i.quantity}× ${i.productName} [${i.sizeLabel}]`
                          )
                          .join(", ")}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
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
                          className="rounded-lg border border-separator bg-surface-secondary px-2.5 py-1.5 font-semibold text-foreground"
                        >
                          <option value="received">1. Received</option>
                          <option value="prepress_check">
                            2. Pre-Press Check
                          </option>
                          <option value="printing">3. Printing</option>
                          <option value="finishing">4. Finishing</option>
                          <option value="ready_for_pickup">
                            5. Ready for Pickup
                          </option>
                          <option value="completed">6. Completed</option>
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
                          className="rounded-lg border border-separator bg-surface-secondary px-2.5 py-1.5 font-semibold text-foreground"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="downpayment_paid">50% DP Paid</option>
                          <option value="paid">Paid Full</option>
                        </select>
                      </div>

                      <div className="text-right pl-2">
                        <div className="font-extrabold text-foreground">
                          {formatCurrency(ord.totalAmount)}
                        </div>
                        <div className="text-[11px] text-muted">
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
                  <div className="text-sm font-bold text-foreground">
                    Live Ticket Queue ({queuedTickets.length})
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    isDisabled={queuedTickets.length === 0}
                    onPress={handleClaimNext}
                  >
                    <Headset className="h-3.5 w-3.5" />
                    Claim Next
                  </Button>
                </div>

                <div className="flex rounded-xl bg-surface-secondary p-1 text-xs">
                  {(["queued", "active", "resolved"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTicketViewFilter(tab)}
                      className={`flex-1 rounded-lg py-1.5 font-semibold capitalize transition ${
                        ticketViewFilter === tab
                          ? "bg-surface text-foreground shadow-xs"
                          : "text-muted"
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

                <div className="space-y-2 max-h-[470px] overflow-y-auto">
                  {filteredTicketsList.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted">
                      No {ticketViewFilter} tickets right now.
                    </p>
                  ) : (
                    filteredTicketsList.map((t) => {
                      const pos = getQueuePosition(t.id);
                      const isSel = selectedTicket?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`cursor-pointer rounded-xl border p-3 transition ${
                            isSel
                              ? "border-accent bg-accent/10"
                              : "border-separator bg-surface-secondary/40 hover:border-accent/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-accent">
                              {t.ticketNumber}
                            </span>
                            <div className="flex items-center gap-1">
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
                          <div className="mt-1 text-xs font-bold text-foreground">
                            {t.customerName} — {t.topic}
                          </div>
                          {t.linkedReference && (
                            <div className="font-mono text-[11px] text-muted">
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

            {/* Active Conversation & Ticket Controls */}
            <div className="lg:col-span-8">
              {selectedTicket ? (
                <Card className="flex h-[580px] flex-col overflow-hidden border border-separator bg-surface p-0">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator bg-surface-secondary/60 px-5 py-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-accent">
                          {selectedTicket.ticketNumber}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {selectedTicket.customerName}
                        </span>
                        <span className="text-xs text-muted">
                          ({selectedTicket.customerEmail})
                        </span>
                      </div>
                      <div className="text-xs text-muted">
                        Topic: {selectedTicket.topic}
                        {selectedTicket.linkedReference
                          ? ` • Linked Ref: ${selectedTicket.linkedReference}`
                          : ""}
                        {selectedTicket.assignedEmployeeName
                          ? ` • Claimed by ${selectedTicket.assignedEmployeeName}`
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
                        className="rounded-lg border border-separator bg-surface px-2.5 py-1 text-xs text-foreground"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>

                      {selectedTicket.status === "queued" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => claimTicket(selectedTicket.id)}
                        >
                          Accept Ticket
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
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Internal Staff Note Bar */}
                  <div className="flex items-center gap-2 border-b border-separator bg-amber-500/5 px-4 py-2 text-xs">
                    <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">
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
                      placeholder="Add private staff handoff note (hidden from customer)..."
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
                            className="mx-auto max-w-md rounded-full bg-surface-secondary px-4 py-1 text-center text-[11px] text-muted"
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
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                              isEmployee
                                ? "bg-accent text-accent-foreground rounded-br-xs"
                                : "border border-separator bg-surface-secondary text-foreground rounded-bl-xs"
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
                          ? "Reply to automatically claim this queued ticket..."
                          : "Send message to customer..."
                      }
                      className="flex-1 rounded-xl border border-separator bg-surface-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                    <Button type="submit" variant="primary">
                      <Send className="h-4 w-4" />
                      Reply
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

