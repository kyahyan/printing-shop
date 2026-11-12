"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip } from "@heroui/react";
import {
  Calculator,
  Calendar,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Link2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { InquiryQuotation } from "@/types/printshop";

export default function QuotationsPage() {
  const {
    products,
    currentUser,
    settings,
    formatCurrency,
    calculateProductPrice,
    submitInquiry,
  } = usePrintShop();

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products]
  );

  const [jobMode, setJobMode] = useState<"catalog" | "custom">("catalog");
  const [selectedProductId, setSelectedProductId] = useState<string>(
    activeProducts[0]?.id ?? ""
  );
  const [selectedSizeId, setSelectedSizeId] = useState<string>(
    activeProducts[0]?.sizes[0]?.id ?? ""
  );
  const [material, setMaterial] = useState<string>(
    activeProducts[0]?.materials[0]?.name ?? ""
  );
  const [finish, setFinish] = useState<string>(
    activeProducts[0]?.finishes[0]?.name ?? ""
  );

  // Custom job overrides
  const [customProductName, setCustomProductName] = useState("");
  const [customDimensions, setCustomDimensions] = useState("");
  const [quantity, setQuantity] = useState<number>(200);
  const [subject, setSubject] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  // Contact details
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [submittedQuote, setSubmittedQuote] =
    useState<InquiryQuotation | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedProduct = useMemo(
    () => activeProducts.find((p) => p.id === selectedProductId) ?? null,
    [activeProducts, selectedProductId]
  );

  useEffect(() => {
    if (selectedProduct && jobMode === "catalog") {
      setSelectedSizeId(selectedProduct.sizes[0]?.id ?? "");
      setMaterial(selectedProduct.materials[0]?.name ?? "");
      setFinish(selectedProduct.finishes[0]?.name ?? "");
      setQuantity((prev) => Math.max(prev, selectedProduct.minOrderQty));
    }
  }, [selectedProduct, jobMode]);

  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.fullName);
      setCustomerEmail(currentUser.email);
      setCustomerPhone(currentUser.phone || "");
      setCompanyName(currentUser.companyName || "");
    }
  }, [currentUser]);

  const estimate = useMemo(() => {
    if (jobMode !== "catalog" || !selectedProduct) return null;
    return calculateProductPrice(
      selectedProduct,
      selectedSizeId,
      material,
      finish,
      quantity
    );
  }, [
    calculateProductPrice,
    finish,
    jobMode,
    material,
    quantity,
    selectedProduct,
    selectedSizeId,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenSizeLabel =
      jobMode === "catalog"
        ? selectedProduct?.sizes.find((s) => s.id === selectedSizeId)
            ?.sizeLabel || "Standard Size"
        : customDimensions || "Custom Bespoke Size";

    const prodName =
      jobMode === "catalog"
        ? selectedProduct?.name || "Print Product"
        : customProductName || "Custom Print Project";

    const created = await submitInquiry({
      customerName,
      customerEmail,
      customerPhone,
      companyName: companyName || undefined,
      subject:
        subject.trim() || `${prodName} — ${chosenSizeLabel} (${quantity} pcs)`,
      productId: jobMode === "catalog" ? selectedProduct?.id : undefined,
      productName: prodName,
      selectedSize: chosenSizeLabel,
      material: material || "Custom / Recommend Best Stock",
      finish: finish || "Standard Finish",
      quantity,
      customDimensions: customDimensions || undefined,
      artworkUrl: artworkUrl || undefined,
      targetDate: targetDate || undefined,
      notes: notes || undefined,
    });

    setSubmittedQuote(created);
  };

  const handleCopy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      <div className="border-b border-separator pb-6">
        <Chip size="sm" color="accent" variant="soft">
          Inquiries & Custom Quotations
        </Chip>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
          Request a Formal Print Quotation
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Ideal for bulk corporate runs, custom die-cut dimensions, multi-SKU
          label splits, or bespoke packaging. Every inquiry receives a unique{" "}
          <code className="font-mono text-foreground">
            {settings.quotePrefix}-YYYY-XXXX
          </code>{" "}
          Reference Number valid for {settings.quotationValidityDays} days once
          quoted.
        </p>
      </div>

      {submittedQuote ? (
        <Card className="mx-auto max-w-2xl border border-accent/40 bg-surface p-8 text-center space-y-5 shadow-lg">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">
              Quotation Request Logged!
            </h2>
            <p className="text-sm text-muted">
              Our estimating team has received your specifications for{" "}
              <strong className="text-foreground">
                {submittedQuote.subject}
              </strong>
              .
            </p>
          </div>

          <div className="mx-auto flex max-w-md items-center justify-between rounded-2xl border border-separator bg-surface-secondary px-5 py-4">
            <div className="text-left">
              <div className="text-xs uppercase tracking-wider text-muted">
                Quotation Reference Number
              </div>
              <div className="font-mono text-2xl font-extrabold text-accent">
                {submittedQuote.referenceNumber}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => handleCopy(submittedQuote.referenceNumber)}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <div className="rounded-xl border border-separator bg-surface-secondary/40 p-4 text-left text-xs space-y-1 text-muted">
            <div>
              <strong className="text-foreground">Product:</strong>{" "}
              {submittedQuote.productName} ({submittedQuote.selectedSize})
            </div>
            <div>
              <strong className="text-foreground">Quantity:</strong>{" "}
              {submittedQuote.quantity.toLocaleString()} •{" "}
              <strong className="text-foreground">Material:</strong>{" "}
              {submittedQuote.material}
            </div>
            <div>
              <strong className="text-foreground">Status:</strong> Pending
              Estimator Review
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href={`/track?ref=${submittedQuote.referenceNumber}`}>
              <Button variant="primary">Track Quotation Status</Button>
            </Link>
            <Link href={`/chat?ref=${submittedQuote.referenceNumber}`}>
              <Button variant="secondary">
                <MessageSquare className="h-4 w-4" />
                Discuss in Live Chat Queue
              </Button>
            </Link>
            <Button
              variant="ghost"
              onPress={() => {
                setSubmittedQuote(null);
                setSubject("");
                setNotes("");
              }}
            >
              Submit Another Inquiry
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Form */}
          <Card className="border border-separator bg-surface p-6 lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex flex-wrap gap-2 rounded-xl bg-surface-secondary p-1.5">
                <button
                  type="button"
                  onClick={() => setJobMode("catalog")}
                  className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    jobMode === "catalog"
                      ? "bg-surface text-foreground shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Based on Catalog Product & Size
                </button>
                <button
                  type="button"
                  onClick={() => setJobMode("custom")}
                  className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    jobMode === "custom"
                      ? "bg-surface text-foreground shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Fully Custom / Bespoke Print Project
                </button>
              </div>

              {/* Project Subject */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Inquiry / Project Title *
                </label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., 1,000 Die-Cut Matte Coffee Pouch Labels (4 Flavor Variants)"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>

              {jobMode === "catalog" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Select Print Product
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    >
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Select Base Size (Price Per Size)
                    </label>
                    <select
                      value={selectedSizeId}
                      onChange={(e) => setSelectedSizeId(e.target.value)}
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    >
                      {selectedProduct?.sizes.map((sz) => (
                        <option key={sz.id} value={sz.id}>
                          {sz.sizeLabel} — {formatCurrency(sz.unitPrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Paper / Material Stock
                    </label>
                    <select
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    >
                      {selectedProduct?.materials.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Lamination / Finishing
                    </label>
                    <select
                      value={finish}
                      onChange={(e) => setFinish(e.target.value)}
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    >
                      {selectedProduct?.finishes.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Custom Product Type *
                    </label>
                    <input
                      required
                      value={customProductName}
                      onChange={(e) => setCustomProductName(e.target.value)}
                      placeholder="e.g., Rigid Magnetic Gift Box / Hardbound Catalog"
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Preferred Paper / Board / Material
                    </label>
                    <input
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="e.g., 1200gsm Chipboard wrapped in Matte Artpaper"
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              {/* Quantity, Custom Dimensions, Deadline */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Target Quantity *
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Number.parseInt(e.target.value || "1", 10))
                      )
                    }
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Exact Custom Dimensions (Optional)
                  </label>
                  <input
                    value={customDimensions}
                    onChange={(e) => setCustomDimensions(e.target.value)}
                    placeholder="e.g., 5.5 × 8.25 in + 3mm bleed"
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-accent" />
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Artwork & Notes */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground">
                    <Link2 className="h-3.5 w-3.5 text-accent" />
                    Artwork / Print-Ready File Link (Google Drive, Dropbox,
                    WeTransfer, Canva)
                  </label>
                  <input
                    value={artworkUrl}
                    onChange={(e) => setArtworkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Detailed Specifications & Finishing Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mention Pantone color matching, foil stamping, die-cut shape, number of design variants, or delivery address..."
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Customer Contact */}
              <div className="border-t border-separator pt-5">
                <h3 className="mb-3 text-sm font-bold text-foreground">
                  Contact Information for Quotation Delivery
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Full Name *
                    </label>
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Company / Brand Name (Optional)
                    </label>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Northstar Roasters Inc."
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
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
                      placeholder="billing@company.com"
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Mobile / Viber / WhatsApp *
                    </label>
                    <input
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+63 917 555 0199"
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="lg">
                  <FileSpreadsheet className="h-4 w-4" />
                  Submit Inquiry & Get Reference #
                </Button>
              </div>
            </form>
          </Card>

          {/* Right Sidebar: Live Benchmark Estimate */}
          <div className="space-y-5 lg:col-span-4">
            <Card className="border border-separator bg-surface p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Calculator className="h-4 w-4 text-accent" />
                Instant Catalog Benchmark
              </div>

              {jobMode === "catalog" && estimate && selectedProduct ? (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl bg-surface-secondary p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Volume Tier</span>
                      <Chip size="sm" color="success" variant="soft">
                        <Sparkles className="mr-1 inline h-3 w-3" />
                        {estimate.appliedTier}
                      </Chip>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Benchmark Unit Rate</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(estimate.effectiveUnitPrice)}
                      </span>
                    </div>
                    {estimate.setupFee > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Setup / Plate</span>
                        <span>{formatCurrency(estimate.setupFee)}</span>
                      </div>
                    )}
                    <div className="border-t border-separator pt-2 flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        Pre-Tax Benchmark
                      </span>
                      <span className="text-lg font-extrabold text-accent">
                        {formatCurrency(estimate.lineTotal)}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted leading-relaxed">
                    Submitting a quotation lets our estimators apply custom
                    multi-design grouping discounts, trade/agency rates, or
                    freight bundling beyond standard catalog rates.
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted">
                  For custom structural packaging or bespoke sizes, our
                  pre-press team calculates sheet imposition yield and sends an
                  itemized quote directly to your Reference Number.
                </p>
              )}
            </Card>

            <Card className="border border-separator bg-surface p-6 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-foreground">
                Need Immediate Estimator Advice?
              </h3>
              <p className="text-muted leading-relaxed">
                Not sure whether 157 GSM C2S or 300 GSM Matte Board fits your
                project? Hop into our live support ticket queue to speak with a
                pre-press specialist.
              </p>
              <Link href="/chat">
                <Button variant="secondary" fullWidth>
                  <MessageSquare className="h-4 w-4" />
                  Join Live Support Chat Queue
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

