"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip } from "@heroui/react";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { InquiryQuotation } from "@/types/printshop";
import { sanitizeExternalUrl } from "@/lib/security";

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

  const [jobMode, setJobMode] = useState<"catalog" | "custom">("custom");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  const [material, setMaterial] = useState<string>("");
  const [finish, setFinish] = useState<string>("");
  const [modeInitialized, setModeInitialized] = useState(false);

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedProduct = useMemo(
    () =>
      activeProducts.find((p) => p.id === selectedProductId) ??
      activeProducts[0] ??
      null,
    [activeProducts, selectedProductId]
  );

  useEffect(() => {
    if (activeProducts.length > 0 && !modeInitialized) {
      setSelectedProductId(activeProducts[0].id);
      setJobMode("catalog");
      setModeInitialized(true);
    }
  }, [activeProducts, modeInitialized]);

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
    if (submitting) return;
    setError(null);

    const trimmedArtwork = artworkUrl.trim();
    if (trimmedArtwork && !sanitizeExternalUrl(trimmedArtwork)) {
      setError(
        "Artwork file link must be a valid HTTPS URL (e.g., https://drive.google.com/...)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const chosenSizeLabel =
        jobMode === "catalog"
          ? selectedProduct?.sizes.find((s) => s.id === selectedSizeId)
              ?.sizeLabel || "Standard Size"
          : customDimensions || "Custom Specification";

      const prodName =
        jobMode === "catalog"
          ? selectedProduct?.name || "Catalog Print Line"
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
        material: material || "Estimator Recommendation",
        finish: finish || "Standard Finish",
        quantity,
        customDimensions: customDimensions || undefined,
        artworkUrl: trimmedArtwork || undefined,
        targetDate: targetDate || undefined,
        notes: notes || undefined,
      });

      setSubmittedQuote(created);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit quotation request. Please verify your entries."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-8">
      <div className="border-b border-separator pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
          Estimating Desk
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Request Formal Quotation
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Submit specifications for corporate runs, non-standard dimensions,
          multi-SKU splits, or structural packaging. Every request is assigned a
          unique{" "}
          <code className="font-mono text-xs text-foreground">
            {settings.quotePrefix}-YYYY-XXXXXXXX
          </code>{" "}
          reference valid for {settings.quotationValidityDays} days once quoted.
        </p>
      </div>

      {submittedQuote ? (
        <Card className="mx-auto max-w-2xl border border-separator bg-surface p-8 space-y-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                Quotation Inquiry Registered
              </h2>
              <p className="text-sm text-muted">
                Specifications for{" "}
                <span className="font-medium text-foreground">
                  {submittedQuote.subject}
                </span>{" "}
                have been routed to our estimating desk.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-separator bg-surface-secondary px-5 py-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
                Quotation Reference
              </div>
              <div className="mt-0.5 font-mono text-xl font-semibold text-foreground">
                {submittedQuote.referenceNumber}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => handleCopy(submittedQuote.referenceNumber)}
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <dl className="grid gap-2 rounded-lg border border-separator bg-background p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted">Product / Line</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {submittedQuote.productName} ({submittedQuote.selectedSize})
              </dd>
            </div>
            <div>
              <dt className="text-muted">Quantity & Substrate</dt>
              <dd className="mt-0.5 font-medium text-foreground tabular-nums">
                {submittedQuote.quantity.toLocaleString()} ·{" "}
                {submittedQuote.material}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2.5 border-t border-separator pt-4">
            <Link
              href={`/track?ref=${encodeURIComponent(submittedQuote.referenceNumber)}`}
            >
              <Button variant="primary">Track Quotation Status</Button>
            </Link>
            <Link
              href={`/chat?ref=${encodeURIComponent(submittedQuote.referenceNumber)}`}
            >
              <Button variant="secondary">Open Support Ticket</Button>
            </Link>
            <Button
              variant="ghost"
              onPress={() => {
                setSubmittedQuote(null);
                setSubject("");
                setNotes("");
              }}
            >
              Submit Another Request
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* RFQ Form */}
          <Card className="border border-separator bg-surface p-6 lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Specification Basis */}
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-separator bg-surface-secondary p-1">
                <button
                  type="button"
                  disabled={activeProducts.length === 0}
                  onClick={() => setJobMode("catalog")}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    jobMode === "catalog"
                      ? "bg-surface text-foreground shadow-2xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Catalog Line Basis{" "}
                  {activeProducts.length === 0 ? "(Empty)" : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setJobMode("custom")}
                  className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    jobMode === "custom"
                      ? "bg-surface text-foreground shadow-2xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Custom / Bespoke Project
                </button>
              </div>

              {/* Project Subject */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Project Reference Title *
                </label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., 1,000 Die-Cut Matte Pouch Labels (4 SKU Variants)"
                  className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>

              {jobMode === "catalog" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      Catalog Product
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    >
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      Base Size Schedule
                    </label>
                    <select
                      value={selectedSizeId}
                      onChange={(e) => setSelectedSizeId(e.target.value)}
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    >
                      {selectedProduct?.sizes.map((sz) => (
                        <option key={sz.id} value={sz.id}>
                          {sz.sizeLabel} — {formatCurrency(sz.unitPrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      Substrate / Stock
                    </label>
                    <select
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    >
                      {selectedProduct?.materials.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      Finishing / Lamination
                    </label>
                    <select
                      value={finish}
                      onChange={(e) => setFinish(e.target.value)}
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
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
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      Product / Format Type *
                    </label>
                    <input
                      required
                      value={customProductName}
                      onChange={(e) => setCustomProductName(e.target.value)}
                      placeholder="e.g., Rigid Packaging Box / Saddle-Stitched Catalog"
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      Preferred Paper / Board Stock
                    </label>
                    <input
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      placeholder="e.g., 300gsm Matte C2S / 1200gsm Chipboard"
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              {/* Quantity, Custom Dimensions, Deadline */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
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
                    className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 font-mono text-sm font-medium text-foreground outline-none focus:border-accent tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Custom Trim Size (Optional)
                  </label>
                  <input
                    value={customDimensions}
                    onChange={(e) => setCustomDimensions(e.target.value)}
                    placeholder="e.g., 5.5 × 8.25 in + 3mm bleed"
                    className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Artwork & Notes */}
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Print-Ready Artwork URL (HTTPS — Google Drive, Dropbox,
                    WeTransfer)
                  </label>
                  <input
                    type="url"
                    value={artworkUrl}
                    onChange={(e) => setArtworkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 font-mono text-xs text-foreground outline-none placeholder:font-sans focus:border-accent"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Technical Notes & Finishing Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Specify Pantone spot colors, foil stamping, die-cut requirements, SKU breakdown, or shipping destination..."
                    className="w-full rounded-lg border border-separator bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Client Contact */}
              <div className="border-t border-separator pt-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  Client Contact Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Contact Name *
                    </label>
                    <input
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full name"
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Company / Organization (Optional)
                    </label>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company name"
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
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
                      placeholder="procurement@company.com"
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
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
                      placeholder="+63 917 555 0199"
                      className="h-10 w-full rounded-lg border border-separator bg-background px-3.5 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isDisabled={submitting}
                >
                  {submitting
                    ? "Submitting Request..."
                    : "Submit Quotation Inquiry"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Right Sidebar */}
          <div className="space-y-5 lg:col-span-4">
            <Card className="border border-separator bg-surface p-6 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                Catalog Benchmark
              </div>

              {jobMode === "catalog" && estimate && selectedProduct ? (
                <div className="space-y-3 text-xs tabular-nums">
                  <div className="rounded-lg border border-separator bg-background p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Volume Schedule</span>
                      <Chip size="sm" color="default" variant="secondary">
                        {estimate.appliedTier}
                      </Chip>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Benchmark Unit Rate</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(estimate.effectiveUnitPrice)}
                      </span>
                    </div>
                    {estimate.setupFee > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Setup / Plate</span>
                        <span className="font-mono text-foreground">
                          {formatCurrency(estimate.setupFee)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-separator pt-2.5">
                      <span className="font-medium text-foreground">
                        Net Benchmark (Excl. VAT)
                      </span>
                      <span className="font-mono text-base font-semibold text-foreground">
                        {formatCurrency(estimate.lineTotal)}
                      </span>
                    </div>
                  </div>
                  <p className="leading-relaxed text-muted">
                    Formal quotations allow estimators to evaluate gang-run
                    sheet imposition, multi-SKU splits, trade discounts, and
                    freight consolidation.
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted">
                  For custom trim dimensions and structural packaging, our
                  pre-press estimators compute press sheet yield and finishing
                  setup before issuing an itemized quotation under your
                  reference code.
                </p>
              )}
            </Card>

            <Card className="border border-separator bg-surface p-6 space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-foreground">
                Pre-Press Consultation
              </h3>
              <p className="leading-relaxed text-muted">
                Unsure which paper caliper or lamination suits your application?
                Connect with an estimator in our live support ticket queue.
              </p>
              <Link href="/chat">
                <Button variant="secondary" fullWidth>
                  Open Support Queue
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
