"use client";

import React, { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Check,
  CircleCheck,
  Comments,
  Copy,
  FileText,
  Link as LinkIcon,
  Magnifier,
  Plus,
} from "@gravity-ui/icons";
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  Description,
  FieldError,
  Fieldset,
  Form,
  Input,
  InputGroup,
  Label,
  ListBox,
  NumberField,
  Select,
  Separator,
  Spinner,
  Surface,
  Tabs,
  TextArea,
  TextField,
  Typography,
  toast,
} from "@heroui/react";
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      toast.success(`Quotation ${created.referenceNumber} submitted`);
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
    toast.success("Reference copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-8">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Request Quotation</Breadcrumbs.Item>
      </Breadcrumbs>

      <div>
        <Typography.Heading
          level={1}
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Request Formal Quotation
        </Typography.Heading>
        <Typography.Paragraph color="muted" size="sm" className="mt-1.5 max-w-2xl">
          Submit specifications for corporate runs, non-standard dimensions,
          multi-SKU splits, or structural packaging. Every request is assigned a
          unique{" "}
          <Typography.Code>
            {settings.quotePrefix}-YYYY-XXXXXXXX
          </Typography.Code>{" "}
          reference valid for {settings.quotationValidityDays} days once quoted.
        </Typography.Paragraph>
      </div>

      {submittedQuote ? (
        <Card className="mx-auto max-w-2xl p-6">
          <Card.Header>
            <div className="flex items-center gap-2.5">
              <CircleCheck className="size-5 text-success" />
              <Card.Title className="text-lg">
                Quotation Inquiry Registered
              </Card.Title>
            </div>
            <Card.Description>
              Specifications for{" "}
              <span className="font-medium text-foreground">
                {submittedQuote.subject}
              </span>{" "}
              have been routed to our estimating desk.
            </Card.Description>
          </Card.Header>

          <Card.Content className="space-y-4">
            <Surface
              variant="secondary"
              className="flex items-center justify-between rounded-2xl p-4"
            >
              <div>
                <div className="text-xs font-medium text-muted">
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
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </Surface>

            <Surface
              variant="secondary"
              className="grid gap-3 rounded-2xl p-4 text-xs sm:grid-cols-2"
            >
              <div>
                <div className="text-muted">Product / Line</div>
                <div className="mt-0.5 font-medium text-foreground">
                  {submittedQuote.productName} ({submittedQuote.selectedSize})
                </div>
              </div>
              <div>
                <div className="text-muted">Quantity & Substrate</div>
                <div className="mt-0.5 font-medium text-foreground tabular-nums">
                  {submittedQuote.quantity.toLocaleString()} ·{" "}
                  {submittedQuote.material}
                </div>
              </div>
            </Surface>
          </Card.Content>

          <Card.Footer className="flex-wrap gap-2.5 border-t border-separator pt-4">
            <NextLink
              href={`/track?ref=${encodeURIComponent(submittedQuote.referenceNumber)}`}
            >
              <Button variant="primary">
                <Magnifier className="size-4" />
                Track Quotation Status
              </Button>
            </NextLink>
            <NextLink
              href={`/chat?ref=${encodeURIComponent(submittedQuote.referenceNumber)}`}
            >
              <Button variant="secondary">
                <Comments className="size-4" />
                Open Support Ticket
              </Button>
            </NextLink>
            <Button
              variant="ghost"
              onPress={() => {
                setSubmittedQuote(null);
                setSubject("");
                setNotes("");
              }}
            >
              <Plus className="size-4" />
              Submit Another Request
            </Button>
          </Card.Footer>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* RFQ Form Card */}
          <Card className="p-6 lg:col-span-8">
            <Card.Header className="pb-4">
              <Card.Title>Project Specifications</Card.Title>
              <Card.Description>
                Choose a published catalog line as a baseline or specify a fully
                bespoke print project.
              </Card.Description>
            </Card.Header>

            <Card.Content>
              <Form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Validation Error</Alert.Title>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                {/* HeroUI Tabs for Specification Basis */}
                <Tabs
                  selectedKey={jobMode}
                  onSelectionChange={(key) =>
                    setJobMode(key as "catalog" | "custom")
                  }
                >
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Specification Basis">
                      <Tabs.Tab
                        id="catalog"
                        isDisabled={activeProducts.length === 0}
                      >
                        Catalog Line Basis{" "}
                        {activeProducts.length === 0 ? "(Empty)" : ""}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="custom">
                        Custom / Bespoke Project
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                </Tabs>

                <Fieldset className="w-full">
                  <Fieldset.Legend>Print Run Details</Fieldset.Legend>
                  <Fieldset.Group>
                    <TextField
                      isRequired
                      name="subject"
                      value={subject}
                      onChange={setSubject}
                    >
                      <Label>Project Reference Title</Label>
                      <Input
                        variant="secondary"
                        placeholder="e.g., 1,000 Die-Cut Matte Pouch Labels (4 SKU Variants)"
                      />
                      <FieldError />
                    </TextField>

                    {jobMode === "catalog" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                          variant="secondary"
                          value={selectedProductId}
                          onChange={(key) =>
                            key && setSelectedProductId(String(key))
                          }
                        >
                          <Label>Catalog Product</Label>
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

                        <Select
                          variant="secondary"
                          value={selectedSizeId}
                          onChange={(key) =>
                            key && setSelectedSizeId(String(key))
                          }
                        >
                          <Label>Base Size Schedule</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {(selectedProduct?.sizes ?? []).map((sz) => {
                                const label = `${sz.sizeLabel} — ${formatCurrency(sz.unitPrice)}`;
                                return (
                                  <ListBox.Item
                                    key={sz.id}
                                    id={sz.id}
                                    textValue={label}
                                  >
                                    {label}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                );
                              })}
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        <Select
                          variant="secondary"
                          value={material}
                          onChange={(key) => key && setMaterial(String(key))}
                        >
                          <Label>Substrate / Stock</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {(selectedProduct?.materials ?? []).map((m) => (
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

                        <Select
                          variant="secondary"
                          value={finish}
                          onChange={(key) => key && setFinish(String(key))}
                        >
                          <Label>Finishing / Lamination</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {(selectedProduct?.finishes ?? []).map((f) => (
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
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          isRequired
                          name="customProductName"
                          value={customProductName}
                          onChange={setCustomProductName}
                        >
                          <Label>Product / Format Type</Label>
                          <Input
                            variant="secondary"
                            placeholder="e.g., Rigid Packaging Box / Saddle-Stitched Catalog"
                          />
                          <FieldError />
                        </TextField>

                        <TextField
                          name="material"
                          value={material}
                          onChange={setMaterial}
                        >
                          <Label>Preferred Paper / Board Stock</Label>
                          <Input
                            variant="secondary"
                            placeholder="e.g., 300gsm Matte C2S / 1200gsm Chipboard"
                          />
                        </TextField>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                      <NumberField
                        isRequired
                        minValue={1}
                        step={10}
                        variant="secondary"
                        value={quantity}
                        onChange={(v) =>
                          !Number.isNaN(v) && setQuantity(Math.max(1, v))
                        }
                      >
                        <Label>Target Quantity</Label>
                        <NumberField.Group>
                          <NumberField.DecrementButton />
                          <NumberField.Input className="tabular-nums" />
                          <NumberField.IncrementButton />
                        </NumberField.Group>
                      </NumberField>

                      <TextField
                        name="customDimensions"
                        value={customDimensions}
                        onChange={setCustomDimensions}
                      >
                        <Label>Custom Trim Size (Optional)</Label>
                        <Input
                          variant="secondary"
                          placeholder="e.g., 5.5 × 8.25 in + 3mm bleed"
                        />
                      </TextField>

                      <TextField
                        name="targetDate"
                        type="date"
                        value={targetDate}
                        onChange={setTargetDate}
                      >
                        <Label>Target Delivery Date</Label>
                        <Input variant="secondary" />
                      </TextField>
                    </div>

                    <TextField
                      name="artworkUrl"
                      type="url"
                      value={artworkUrl}
                      onChange={setArtworkUrl}
                    >
                      <Label>Print-Ready Artwork URL (HTTPS)</Label>
                      <InputGroup variant="secondary">
                        <InputGroup.Prefix>
                          <LinkIcon className="size-4 text-muted" />
                        </InputGroup.Prefix>
                        <InputGroup.Input placeholder="https://drive.google.com/..." />
                      </InputGroup>
                      <Description>
                        Google Drive, Dropbox, or WeTransfer HTTPS link.
                      </Description>
                    </TextField>

                    <TextField
                      name="notes"
                      value={notes}
                      onChange={setNotes}
                    >
                      <Label>Technical Notes & Finishing Instructions</Label>
                      <TextArea
                        variant="secondary"
                        rows={3}
                        placeholder="Specify Pantone spot colors, foil stamping, die-cut requirements, SKU breakdown, or shipping destination..."
                      />
                    </TextField>
                  </Fieldset.Group>
                </Fieldset>

                <Separator />

                <Fieldset className="w-full">
                  <Fieldset.Legend>Client Contact Details</Fieldset.Legend>
                  <Fieldset.Group>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        isRequired
                        name="customerName"
                        value={customerName}
                        onChange={setCustomerName}
                      >
                        <Label>Contact Name</Label>
                        <Input variant="secondary" placeholder="Full name" />
                        <FieldError />
                      </TextField>

                      <TextField
                        name="companyName"
                        value={companyName}
                        onChange={setCompanyName}
                      >
                        <Label>Company / Organization (Optional)</Label>
                        <Input variant="secondary" placeholder="Company name" />
                      </TextField>

                      <TextField
                        isRequired
                        name="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={setCustomerEmail}
                      >
                        <Label>Email Address</Label>
                        <Input
                          variant="secondary"
                          placeholder="procurement@company.com"
                        />
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
                        <Input
                          variant="secondary"
                          placeholder="+63 917 555 0199"
                        />
                        <FieldError />
                      </TextField>
                    </div>
                  </Fieldset.Group>
                </Fieldset>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isPending={submitting}
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner color="current" size="sm" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                        {isPending
                          ? "Submitting Request..."
                          : "Submit Quotation Inquiry"}
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Content>
          </Card>

          {/* Right Benchmark & Support Sidebar */}
          <div className="space-y-5 lg:col-span-4">
            <Card>
              <Card.Header>
                <Card.Title>Catalog Benchmark</Card.Title>
                <Card.Description>
                  Real-time schedule reference prior to estimator review.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                {jobMode === "catalog" && estimate && selectedProduct ? (
                  <div className="space-y-3 text-xs tabular-nums">
                    <Surface variant="secondary" className="rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Volume Schedule</span>
                        <Chip size="sm" color="accent" variant="soft">
                          <Chip.Label>{estimate.appliedTier}</Chip.Label>
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
                      <Separator />
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-medium text-foreground">
                          Net Benchmark (Excl. VAT)
                        </span>
                        <span className="font-mono text-base font-semibold text-foreground">
                          {formatCurrency(estimate.lineTotal)}
                        </span>
                      </div>
                    </Surface>
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
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Pre-Press Consultation</Card.Title>
                <Card.Description>
                  Unsure which paper caliper or lamination suits your
                  application? Connect with an estimator in our live support
                  ticket queue.
                </Card.Description>
              </Card.Header>
              <Card.Footer>
                <NextLink href="/chat" className="w-full">
                  <Button variant="secondary" fullWidth>
                    <Comments className="size-4" />
                    Open Support Queue
                  </Button>
                </NextLink>
              </Card.Footer>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
