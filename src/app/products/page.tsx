"use client";

import React, { useMemo, useState } from "react";
import NextLink from "next/link";
import {
  ArrowsRotateLeft,
  FileText,
  Sliders,
  Tray,
} from "@gravity-ui/icons";
import {
  Breadcrumbs,
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  SearchField,
  Table,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@heroui/react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { Product } from "@/types/printshop";
import { ProductPriceModal } from "@/components/ProductPriceModal";

export default function ProductsPage() {
  const { products, currentUser, formatCurrency } = usePrintShop();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products]
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(activeProducts.map((p) => p.category)));
    return ["All", ...unique];
  }, [activeProducts]);

  const filtered = useMemo(() => {
    return activeProducts.filter((p) => {
      const matchCat =
        selectedCategory === "All" || p.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sizes.some(
          (s) =>
            s.sizeLabel.toLowerCase().includes(q) ||
            s.dimensions.toLowerCase().includes(q)
        );
      return matchCat && matchQuery;
    });
  }, [activeProducts, search, selectedCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 space-y-8">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item>Catalog & Pricing</Breadcrumbs.Item>
      </Breadcrumbs>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Typography.Heading
            level={1}
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Catalog & Per-Size Rate Schedules
          </Typography.Heading>
          <Typography.Paragraph color="muted" size="sm" className="mt-1.5 max-w-2xl">
            Select any print line to calculate volume pricing across dimensions,
            paper substrates, and finishing options, or request a bespoke
            quotation.
          </Typography.Paragraph>
        </div>
        <NextLink href="/quotations">
          <Button variant="primary">
            <FileText className="size-4" />
            Request Custom Specification Quote
          </Button>
        </NextLink>
      </div>

      {/* HeroUI Filters & Search */}
      {activeProducts.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="overflow-x-auto">
            <ToggleButtonGroup
              aria-label="Filter by product category"
              selectionMode="single"
              selectedKeys={new Set([selectedCategory])}
              onSelectionChange={(keys) => {
                const first = [...keys][0];
                if (first) setSelectedCategory(String(first));
              }}
            >
              {categories.map((cat, idx) => (
                <ToggleButton key={cat} id={cat}>
                  {idx > 0 && <ToggleButtonGroup.Separator />}
                  {cat}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>

          <SearchField
            className="w-full md:w-80"
            value={search}
            onChange={setSearch}
          >
            <Label className="sr-only">Filter catalog</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Filter by product, size, or dimension..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      )}

      {/* Product Directory */}
      {activeProducts.length === 0 ? (
        <Card className="p-10">
          <EmptyState className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default text-muted">
              <Tray className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                No catalog products published yet
              </h3>
              <p className="max-w-lg text-sm text-muted">
                Publish your print products and per-size pricing matrices from
                the Administration workspace, or submit a custom project
                quotation directly.
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
                  <Button variant="secondary">Open Administration</Button>
                </NextLink>
              ) : (
                <NextLink href="/staff/login">
                  <Button variant="secondary">Staff Portal</Button>
                </NextLink>
              )}
            </div>
          </EmptyState>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10">
          <EmptyState className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-default text-muted">
              <Tray className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                No matching specifications found
              </h3>
              <p className="text-sm text-muted">
                Clear your current filters or request a quotation for
                non-standard dimensions.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                setSearch("");
                setSelectedCategory("All");
              }}
            >
              <ArrowsRotateLeft className="size-3.5" />
              Reset Filters
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((product) => (
            <Card key={product.id} className="flex flex-col justify-between">
              <div>
                <Card.Header className="gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Chip size="sm" variant="soft" color="accent">
                        <Chip.Label>{product.category}</Chip.Label>
                      </Chip>
                      {product.badge && (
                        <Chip size="sm" variant="soft" color="warning">
                          <Chip.Label>{product.badge}</Chip.Label>
                        </Chip>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      Lead time: {product.leadTimeDays}
                    </span>
                  </div>
                  <Card.Title className="pt-1 text-lg">
                    {product.name}
                  </Card.Title>
                  <Card.Description>{product.shortDescription}</Card.Description>
                </Card.Header>

                <Card.Content className="pt-2">
                  <Table variant="secondary">
                    <Table.ScrollContainer>
                      <Table.Content
                        aria-label={`${product.name} size schedule`}
                      >
                        <Table.Header>
                          <Table.Column isRowHeader>Size Option</Table.Column>
                          <Table.Column>Dimensions</Table.Column>
                          <Table.Column>1+ Rate</Table.Column>
                          <Table.Column>500+ Rate</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {product.sizes.map((sz) => (
                            <Table.Row
                              key={sz.id}
                              id={sz.id}
                              className="tabular-nums"
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
                              <Table.Cell className="font-mono font-semibold text-accent">
                                {sz.bulk500Price != null
                                  ? formatCurrency(sz.bulk500Price)
                                  : "—"}
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Content>
                    </Table.ScrollContainer>
                  </Table>
                </Card.Content>
              </div>

              <Card.Footer className="flex-wrap items-center justify-between gap-3 border-t border-separator pt-4">
                <div className="text-xs text-muted tabular-nums">
                  Minimum run:{" "}
                  <span className="font-medium text-foreground">
                    {product.minOrderQty} {product.baseUnit}
                  </span>{" "}
                  · {product.materials.length} substrates
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => setSelectedProduct(product)}
                >
                  <Sliders className="size-3.5" />
                  Configure & Calculate
                </Button>
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}

      <ProductPriceModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
