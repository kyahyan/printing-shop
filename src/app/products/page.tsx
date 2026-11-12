"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@heroui/react";
import { Search } from "lucide-react";
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
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-separator pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Standard Specifications
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Catalog & Per-Size Rate Schedules
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Select any print line to calculate volume pricing across dimensions,
            paper substrates, and finishing options, or request a bespoke
            quotation.
          </p>
        </div>
        <Link href="/quotations">
          <Button variant="primary">Request Custom Specification Quote</Button>
        </Link>
      </div>

      {/* Filters & Search */}
      {activeProducts.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-foreground text-background"
                    : "border border-separator bg-surface text-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by product, size, or dimension..."
              className="h-9 w-full rounded-lg border border-separator bg-surface pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent"
            />
          </div>
        </div>
      )}

      {/* Product Directory */}
      {activeProducts.length === 0 ? (
        <Card className="border border-separator bg-surface p-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground">
                No catalog products published yet
              </h3>
              <p className="max-w-xl text-sm text-muted">
                Publish your print products and per-size pricing matrices from
                the Administration workspace, or submit a custom project
                quotation directly.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/quotations">
                <Button variant="primary">Request Custom Quotation</Button>
              </Link>
              {currentUser?.role === "super_admin" ? (
                <Link href="/admin">
                  <Button variant="secondary">Open Administration</Button>
                </Link>
              ) : (
                <Link href="/staff/login">
                  <Button variant="secondary">Staff Portal</Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border border-separator bg-surface p-10 text-center space-y-3">
          <h3 className="text-base font-semibold text-foreground">
            No matching specifications found
          </h3>
          <p className="text-sm text-muted">
            Clear your current filters or request a quotation for non-standard
            dimensions.
          </p>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                setSearch("");
                setSelectedCategory("All");
              }}
            >
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((product) => (
            <Card
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="cursor-pointer border border-separator bg-surface p-6 transition-colors hover:border-foreground/30 flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {product.category}
                    </span>
                    {product.badge && (
                      <span className="rounded bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-muted">
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <span>Lead time: {product.leadTimeDays}</span>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {product.shortDescription}
                  </p>
                </div>

                {/* Per-Size Rate Schedule */}
                <div className="overflow-hidden rounded-lg border border-separator">
                  <div className="grid grid-cols-12 bg-surface-secondary px-3 py-2 text-[11px] font-medium text-muted">
                    <div className="col-span-5">Size Option</div>
                    <div className="col-span-3">Dimensions</div>
                    <div className="col-span-2 text-right">1+ Rate</div>
                    <div className="col-span-2 text-right">500+ Rate</div>
                  </div>
                  <div className="divide-y divide-separator text-xs tabular-nums">
                    {product.sizes.map((sz) => (
                      <div
                        key={sz.id}
                        className="grid grid-cols-12 items-center px-3 py-2"
                      >
                        <div className="col-span-5 truncate pr-2 font-medium text-foreground">
                          {sz.sizeLabel}
                        </div>
                        <div className="col-span-3 truncate pr-1 font-mono text-[11px] text-muted">
                          {sz.dimensions}
                        </div>
                        <div className="col-span-2 text-right font-mono font-medium text-foreground">
                          {formatCurrency(sz.unitPrice)}
                        </div>
                        <div className="col-span-2 text-right font-mono font-medium text-accent">
                          {sz.bulk500Price != null
                            ? formatCurrency(sz.bulk500Price)
                            : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator pt-4">
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
                  Configure & Calculate
                </Button>
              </div>
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
