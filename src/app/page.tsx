"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  CircleFill,
  Comments,
  FileText,
  Layers,
  Magnifier,
  Person,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Tray,
} from "@gravity-ui/icons";
import {
  Accordion,
  Button,
  Card,
  Chip,
  EmptyState,
  Form,
  Label,
  Link,
  SearchField,
  Separator,
  Surface,
  Table,
  Typography,
} from "@heroui/react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { Product } from "@/types/printshop";
import { ProductPriceModal } from "@/components/ProductPriceModal";

const PRINT_SPECS_FAQ = [
  {
    title: "How are per-size unit rates and bulk tiers calculated?",
    content:
      "Every catalog product maintains an itemized dimension matrix with Standard (1+), Bulk (100+), and Wholesale (500+) unit rates, combined with paper stock multipliers and per-unit lamination fees.",
  },
  {
    title: "When should I request a formal quotation instead of ordering directly?",
    content:
      "Use Request Formal Quotation for custom die-cut dimensions, multi-SKU artwork splits, Pantone spot inks, specialty rigid packaging, or trade runs above 1,000 units.",
  },
  {
    title: "What pre-press file specifications do you accept?",
    content:
      "Provide print-ready PDF/X-1a or packaged Adobe Illustrator files in CMYK color mode at 300 DPI minimum, with 3mm full bleed and outlined fonts via HTTPS link.",
  },
  {
    title: "How do reference codes and live support queuing work?",
    content:
      "Every order (ORD-...), quotation (QT-...), and support ticket (TKT-...) receives a unique non-enumerable reference code so you can track production stages or consult an estimator without creating an account first.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const {
    settings,
    products,
    tickets,
    currentUser,
    queueSummary,
    formatCurrency,
  } = usePrintShop();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [refQuery, setRefQuery] = useState("");

  const activeProducts = products.filter((p) => p.isActive);
  const totalSizeTiers = activeProducts.reduce(
    (acc, p) => acc + p.sizes.length,
    0
  );

  const isStaff =
    currentUser?.role === "employee" || currentUser?.role === "super_admin";
  const queuedTickets = isStaff
    ? tickets.filter((t) => t.status === "queued").length
    : queueSummary.queuedTickets;

  const handleTrackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!refQuery.trim()) return;
    router.push(`/track?ref=${encodeURIComponent(refQuery.trim())}`);
  };

  return (
    <div className="space-y-20 pb-8">
      {/* HERO SECTION */}
      <section className="border-b border-separator bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="space-y-7 lg:col-span-7">
              <div className="space-y-4">
                <Chip color="accent" variant="soft" size="md">
                  <CircleFill width={6} />
                  <Chip.Label>Commercial Print & Production Desk</Chip.Label>
                </Chip>

                <Typography.Heading
                  level={1}
                  className="text-3xl font-bold tracking-tight sm:text-5xl sm:leading-[1.1]"
                >
                  Precision commercial printing priced by exact specification.
                </Typography.Heading>

                <Typography.Paragraph color="muted" className="max-w-2xl text-base leading-relaxed">
                  {settings.tagline}. Inspect published per-size unit schedules,
                  volume breaks, and paper substrates, or submit custom project
                  specifications for a formal quotation.
                </Typography.Paragraph>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <NextLink href="/products">
                  <Button variant="primary" size="lg">
                    <ShoppingBag className="size-4" />
                    Browse Catalog & Pricing
                    <ArrowRight className="size-4" />
                  </Button>
                </NextLink>
                <NextLink href="/quotations">
                  <Button variant="secondary" size="lg">
                    <FileText className="size-4" />
                    Request Formal Quotation
                  </Button>
                </NextLink>
              </div>

              {/* HeroUI SearchField Reference Lookup */}
              <Surface variant="secondary" className="max-w-xl rounded-3xl p-4">
                <Form
                  onSubmit={handleTrackSubmit}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <SearchField
                    className="flex-1"
                    name="ref"
                    value={refQuery}
                    onChange={setRefQuery}
                  >
                    <Label>Track an order, quotation, or support ticket</Label>
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input
                        placeholder={`${settings.orderPrefix}-..., ${settings.quotePrefix}-..., or ${settings.ticketPrefix}-...`}
                        className="font-mono placeholder:font-sans"
                      />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <Button type="submit" variant="primary">
                    <Magnifier className="size-4" />
                    Look Up
                  </Button>
                </Form>
              </Surface>
            </div>

            {/* Studio Operations Card */}
            <div className="lg:col-span-5">
              <Card variant="secondary" className="p-6">
                <Card.Header className="flex-row items-start justify-between gap-4">
                  <div>
                    <Card.Description>
                      Production & Estimating Status
                    </Card.Description>
                    <Card.Title className="mt-1 text-lg">
                      {settings.shopName}
                    </Card.Title>
                  </div>
                  <Chip size="sm" color="success" variant="soft">
                    <CircleFill width={6} />
                    <Chip.Label>Operational</Chip.Label>
                  </Chip>
                </Card.Header>

                <Card.Content className="space-y-5 pt-2">
                  <div className="grid grid-cols-3 gap-2.5">
                    <Surface className="rounded-2xl p-3.5">
                      <div className="text-xs text-muted">Catalog Lines</div>
                      <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                        {activeProducts.length}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted tabular-nums">
                        {totalSizeTiers} size specs
                      </div>
                    </Surface>
                    <Surface className="rounded-2xl p-3.5">
                      <div className="text-xs text-muted">Specialists</div>
                      <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                        {queueSummary.onlineSpecialists}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        On duty
                      </div>
                    </Surface>
                    <Surface className="rounded-2xl p-3.5">
                      <div className="text-xs text-muted">Queue</div>
                      <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                        {queuedTickets}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        Waiting
                      </div>
                    </Surface>
                  </div>

                  <Surface className="rounded-2xl p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted">Volume Tiers</span>
                      <span className="font-medium text-foreground">
                        Standard · 100+ Bulk · 500+ Wholesale
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted">Quotation Validity</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {settings.quotationValidityDays} calendar days
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted">Settlement & Tax</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {settings.currencyCode} ({settings.currencySymbol}) ·{" "}
                        {settings.taxRate}% VAT
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted">Operating Hours</span>
                      <span className="font-medium text-foreground">
                        {settings.businessHours}
                      </span>
                    </div>
                  </Surface>
                </Card.Content>

                <Card.Footer className="justify-between pt-2 text-xs">
                  <span className="text-muted">
                    Need pre-press or substrate guidance?
                  </span>
                  <Link href="/chat" className="font-medium text-xs">
                    Open Support Desk
                    <Link.Icon />
                  </Link>
                </Card.Footer>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CATALOG SPECIFICATION DIRECTORY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Typography.Heading level={2} className="text-2xl font-bold tracking-tight">
              Print Catalog & Size Schedules
            </Typography.Heading>
            <Typography.Paragraph color="muted" size="sm" className="mt-1">
              Select any product line to inspect full dimension matrices, bulk
              unit pricing, paper stocks, and finishing options.
            </Typography.Paragraph>
          </div>
          {activeProducts.length > 0 && (
            <NextLink href="/products">
              <Button variant="secondary" size="sm">
                View Full Directory ({activeProducts.length})
                <ArrowRight className="size-3.5" />
              </Button>
            </NextLink>
          )}
        </div>

        {activeProducts.length === 0 ? (
          <Card className="p-10">
            <EmptyState className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-default text-muted">
                <Tray className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  No standard catalog schedules published yet
                </h3>
                <p className="max-w-lg text-sm text-muted">
                  Administrators can configure standard print lines and per-size
                  rate tables in the Administration workspace. Clients may
                  submit custom specifications directly through the Quotation
                  Desk.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                <NextLink href="/quotations">
                  <Button variant="primary">
                    <FileText className="size-4" />
                    Request Custom Quotation
                  </Button>
                </NextLink>
                {currentUser?.role === "super_admin" ? (
                  <NextLink href="/admin">
                    <Button variant="secondary">Manage Catalog</Button>
                  </NextLink>
                ) : (
                  <NextLink href="/staff/login">
                    <Button variant="secondary">Staff Portal</Button>
                  </NextLink>
                )}
              </div>
            </EmptyState>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activeProducts.map((product) => {
              const lowestSize = [...product.sizes].sort(
                (a, b) => a.unitPrice - b.unitPrice
              )[0];
              return (
                <Card
                  key={product.id}
                  className="flex flex-col justify-between"
                >
                  <div>
                    <Card.Header className="gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Chip size="sm" variant="soft" color="accent">
                          <Chip.Label>{product.category}</Chip.Label>
                        </Chip>
                        <span className="text-xs text-muted">
                          Lead: {product.leadTimeDays}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pt-1">
                        <Card.Title className="text-base">
                          {product.name}
                        </Card.Title>
                        {product.badge && (
                          <Chip size="sm" variant="soft" color="warning">
                            <Chip.Label>{product.badge}</Chip.Label>
                          </Chip>
                        )}
                      </div>
                      <Card.Description className="line-clamp-2">
                        {product.shortDescription}
                      </Card.Description>
                    </Card.Header>

                    <Card.Content className="pt-2">
                      <Table variant="secondary">
                        <Table.ScrollContainer>
                          <Table.Content
                            aria-label={`${product.name} sizes`}
                          >
                            <Table.Header>
                              <Table.Column isRowHeader>Size</Table.Column>
                              <Table.Column>Rate</Table.Column>
                            </Table.Header>
                            <Table.Body>
                              {product.sizes.slice(0, 3).map((sz) => (
                                <Table.Row key={sz.id} id={sz.id}>
                                  <Table.Cell>
                                    <span className="font-medium text-foreground">
                                      {sz.sizeLabel}
                                    </span>
                                    <span className="ml-1.5 font-mono text-[11px] text-muted">
                                      {sz.dimensions}
                                    </span>
                                  </Table.Cell>
                                  <Table.Cell className="font-mono font-medium text-foreground tabular-nums">
                                    {formatCurrency(sz.unitPrice)}
                                  </Table.Cell>
                                </Table.Row>
                              ))}
                            </Table.Body>
                          </Table.Content>
                        </Table.ScrollContainer>
                      </Table>
                      {product.sizes.length > 3 && (
                        <p className="mt-2 text-xs text-muted">
                          +{product.sizes.length - 3} more size tiers available
                        </p>
                      )}
                    </Card.Content>
                  </div>

                  <Card.Footer className="items-center justify-between border-t border-separator pt-4">
                    <div className="tabular-nums">
                      <span className="text-xs text-muted">From </span>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {lowestSize ? formatCurrency(lowestSize.unitPrice) : "—"}
                      </span>
                      <span className="text-xs text-muted">
                        {" "}
                        {product.baseUnit}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => setSelectedProduct(product)}
                    >
                      Configure & Price
                    </Button>
                  </Card.Footer>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* PRODUCTION WORKFLOW */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
        <div>
          <Typography.Heading level={2} className="text-2xl font-bold tracking-tight">
            Production & Estimating Workflow
          </Typography.Heading>
          <Typography.Paragraph color="muted" size="sm" className="mt-1">
            Structured commercial print intake from initial specification to dispatch.
          </Typography.Paragraph>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <Card.Header>
              <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Layers className="size-4" />
              </div>
              <Card.Title>01. Specification & Sizing</Card.Title>
              <Card.Description>
                Select standard dimensions, paper GSM substrates, and lamination
                schedules, or define custom trim dimensions.
              </Card.Description>
            </Card.Header>
          </Card>

          <Card>
            <Card.Header>
              <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <FileText className="size-4" />
              </div>
              <Card.Title>02. Order or Formal Quote</Card.Title>
              <Card.Description>
                Place standard runs directly with server-verified pricing or
                request an estimator-reviewed quotation.
              </Card.Description>
            </Card.Header>
          </Card>

          <Card>
            <Card.Header>
              <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Comments className="size-4" />
              </div>
              <Card.Title>03. Support Ticket Queue</Card.Title>
              <Card.Description>
                Consult directly with a pre-press specialist in our live ticket
                queue to verify bleed tolerances and dielines.
              </Card.Description>
            </Card.Header>
          </Card>

          <Card>
            <Card.Header>
              <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Printer className="size-4" />
              </div>
              <Card.Title>04. Tracked Production</Card.Title>
              <Card.Description>
                Monitor job progress across Pre-Press, Printing, Finishing, and
                Dispatch using your unique Reference Code.
              </Card.Description>
            </Card.Header>
          </Card>
        </div>
      </section>

      {/* SPECIFICATIONS ACCORDION & PORTAL ACCESS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div>
              <Typography.Heading level={2} className="text-xl font-bold tracking-tight">
                Pre-Press & Ordering Specifications
              </Typography.Heading>
              <Typography.Paragraph color="muted" size="sm" className="mt-1">
                Technical standards for files, quotations, and volume tiers.
              </Typography.Paragraph>
            </div>

            <Accordion variant="surface" className="w-full">
              {PRINT_SPECS_FAQ.map((item, idx) => (
                <Accordion.Item key={idx}>
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      {item.title}
                      <Accordion.Indicator>
                        <ChevronDown />
                      </Accordion.Indicator>
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>{item.content}</Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-5">
            <Card className="flex-1 justify-between">
              <Card.Header>
                <Chip size="sm" variant="soft" color="accent" className="mb-1 w-fit">
                  <Person width={12} />
                  <Chip.Label>Client Accounts</Chip.Label>
                </Chip>
                <Card.Title>Centralize Repeat Runs & Quotations</Card.Title>
                <Card.Description>
                  Register a client account to maintain an archive of your
                  quotations, convert approved estimates into production orders,
                  and manage support tickets.
                </Card.Description>
              </Card.Header>
              <Card.Footer>
                <NextLink href="/account">
                  <Button variant="primary">
                    Access Client Portal
                    <ArrowRight className="size-4" />
                  </Button>
                </NextLink>
              </Card.Footer>
            </Card>

            <Card className="flex-1 justify-between">
              <Card.Header>
                <Chip size="sm" variant="soft" color="default" className="mb-1 w-fit">
                  <ShieldCheck width={12} />
                  <Chip.Label>Internal Operations</Chip.Label>
                </Chip>
                <Card.Title>Operations Desk & Administration</Card.Title>
                <Card.Description>
                  Authorized staff issue quotations, log walk-in counter orders,
                  update press stages, and service queued tickets. Super Admins
                  configure catalog pricing and personnel.
                </Card.Description>
              </Card.Header>
              <Card.Footer>
                <NextLink href="/staff/login">
                  <Button variant="secondary">
                    <ShieldCheck className="size-4" />
                    Sign In to Staff Portal
                  </Button>
                </NextLink>
              </Card.Footer>
            </Card>
          </div>
        </div>
      </section>

      <ProductPriceModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
