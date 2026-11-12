"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip } from "@heroui/react";
import {
  Clock,
  FileSpreadsheet,
  Filter,
  Ruler,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type { Product } from "@/types/printshop";
import { ProductPriceModal } from "@/components/ProductPriceModal";

export default function ProductsPage() {
  const { products, formatCurrency } = usePrintShop();
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
    <div className="mx-auto max-w-7xl px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-separator pb-6">
        <div>
          <Chip size="sm" color="accent" variant="soft">
            Interactive Print Catalog
          </Chip>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            Products & Price-Per-Size Directory
          </h1>
          <p className="mt-1 text-sm text-muted">
            Select any product below to inspect its complete size matrix, bulk
            quantity breaks, paper stocks, and instant order/quotation options.
          </p>
        </div>
        <Link href="/quotations">
          <Button variant="primary">
            <FileSpreadsheet className="h-4 w-4" />
            Need a Custom Non-Standard Size? Get a Quote
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 h-4 w-4 text-muted" />
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-accent text-accent-foreground shadow-xs"
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
            placeholder="Search product or size (e.g. A4, 3ft, Vinyl)..."
            className="w-full rounded-xl border border-separator bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Product Cards with Expanded Size Preview */}
      {filtered.length === 0 ? (
        <Card className="border border-separator bg-surface p-12 text-center space-y-3">
          <SlidersHorizontal className="mx-auto h-8 w-8 text-muted" />
          <h3 className="text-lg font-bold text-foreground">
            No matching print products found
          </h3>
          <p className="text-sm text-muted">
            Try clearing your search filter or submit a custom print quotation
            for specialized jobs.
          </p>
          <div>
            <Button
              variant="secondary"
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
              className="cursor-pointer border border-separator bg-surface p-6 transition hover:border-accent/60 hover:shadow-lg flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" color="accent" variant="soft">
                      {product.category}
                    </Chip>
                    {product.badge && (
                      <Chip size="sm" color="warning" variant="soft">
                        {product.badge}
                      </Chip>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    {product.leadTimeDays}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {product.shortDescription}
                  </p>
                </div>

                {/* Full Price-Per-Size Mini Table */}
                <div className="overflow-hidden rounded-xl border border-separator">
                  <div className="grid grid-cols-12 bg-surface-secondary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <div className="col-span-5">Size</div>
                    <div className="col-span-3">Dimensions</div>
                    <div className="col-span-2 text-right">1+ Rate</div>
                    <div className="col-span-2 text-right">500+ Rate</div>
                  </div>
                  <div className="divide-y divide-separator text-xs">
                    {product.sizes.map((sz) => (
                      <div
                        key={sz.id}
                        className="grid grid-cols-12 items-center px-3 py-2 hover:bg-surface-secondary/40"
                      >
                        <div className="col-span-5 font-medium text-foreground pr-2 truncate">
                          {sz.sizeLabel}
                        </div>
                        <div className="col-span-3 text-[11px] text-muted truncate pr-1">
                          {sz.dimensions}
                        </div>
                        <div className="col-span-2 text-right font-semibold text-foreground">
                          {formatCurrency(sz.unitPrice)}
                        </div>
                        <div className="col-span-2 text-right font-semibold text-accent">
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
                <div className="text-xs text-muted">
                  Min. Qty:{" "}
                  <strong className="text-foreground">
                    {product.minOrderQty} {product.baseUnit}
                  </strong>{" "}
                  • {product.materials.length} substrates
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => setSelectedProduct(product)}
                >
                  <Ruler className="h-4 w-4" />
                  Calculate Price / Order / Quote
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

