"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip, Tabs } from "@heroui/react";
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type {
  AppSettings,
  FinishOption,
  MaterialOption,
  Product,
  ProductSizeTier,
  UserRole,
} from "@/types/printshop";

const CURRENCY_PRESETS = [
  { code: "PHP", symbol: "₱", label: "Philippine Peso (₱)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (S$)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
];

function createBlankProduct(seed = "new"): Product {
  return {
    id: `draft-${seed}`,
    slug: "",
    name: "",
    category: "",
    shortDescription: "",
    description: "",
    baseUnit: "per pc",
    minOrderQty: 1,
    leadTimeDays: "2–3 business days",
    badge: "",
    featured: true,
    isActive: true,
    accentColor: "indigo",
    sizes: [
      {
        id: `sz-${seed}-1`,
        sizeLabel: "",
        dimensions: "",
        unitPrice: 0,
        bulk100Price: undefined,
        bulk500Price: undefined,
        setupFee: 0,
      },
    ],
    materials: [{ name: "Standard Stock", priceMultiplier: 1.0 }],
    finishes: [{ name: "Standard Finish", addPerUnit: 0 }],
  };
}

export default function SuperAdminPage() {
  const {
    loading,
    currentUser,
    supabaseConnected,
    settings,
    products,
    users,
    orders,
    inquiries,
    tickets,
    refreshData,
    formatCurrency,
    updateSettings,
    upsertProduct,
    deleteProduct,
    provisionStaffAccount,
    upsertUser,
  } = usePrintShop();

  // --- PRODUCT EDITOR STATE ---
  const [editingProduct, setEditingProduct] = useState<Product>(() =>
    createBlankProduct("init")
  );
  const [hasInitializedProduct, setHasInitializedProduct] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productSavedMsg, setProductSavedMsg] = useState<string | null>(null);
  const [productErrorMsg, setProductErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !hasInitializedProduct) {
      if (products.length > 0) {
        setEditingProduct(products[0]);
      }
      setHasInitializedProduct(true);
    }
  }, [loading, hasInitializedProduct, products]);

  // --- SETTINGS FORM STATE ---
  const [settingsForm, setSettingsForm] = useState<AppSettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // --- STAFF CREATION STATE ---
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffDept, setStaffDept] = useState("Estimating & Pre-Press");
  const [staffRole, setStaffRole] = useState<UserRole>("employee");
  const [staffPass, setStaffPass] = useState("");
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffFeedback, setStaffFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-muted">
        Loading Administration Workspace...
      </div>
    );
  }

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Card className="border border-separator bg-surface p-8 space-y-4">
          <h1 className="text-lg font-semibold text-foreground">
            Administrator Authorization Required
          </h1>
          <p className="text-xs leading-relaxed text-muted">
            System settings, catalog pricing schedules, and staff permissions
            are restricted to Super Administrators.
          </p>
          <div className="flex justify-center gap-2.5">
            <Link href="/staff/login">
              <Button variant="primary">Sign In</Button>
            </Link>
            {currentUser?.role === "employee" && (
              <Link href="/dashboard">
                <Button variant="secondary">Operations Desk</Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Executive KPIs
  const totalOrderRevenue = orders
    .filter((o) => o.productionStatus !== "cancelled")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCollected = orders
    .filter((o) => o.productionStatus !== "cancelled")
    .reduce((sum, o) => sum + o.amountPaid, 0);
  const quotedPipeline = inquiries
    .filter((q) => q.status === "quoted" && q.quotedTotal != null)
    .reduce((sum, q) => sum + (q.quotedTotal || 0), 0);

  // Product Editor Handlers
  const handleSizeChange = (
    sizeId: string,
    field: keyof ProductSizeTier,
    value: string | number | undefined
  ) => {
    setEditingProduct((prev) => ({
      ...prev,
      sizes: prev.sizes.map((s) =>
        s.id === sizeId ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleAddSizeTier = () => {
    const newTier: ProductSizeTier = {
      id: `sz-${Date.now()}`,
      sizeLabel: "",
      dimensions: "",
      unitPrice: 0,
      bulk100Price: undefined,
      bulk500Price: undefined,
      setupFee: 0,
    };
    setEditingProduct((prev) => ({
      ...prev,
      sizes: [...prev.sizes, newTier],
    }));
  };

  const handleRemoveSizeTier = (sizeId: string) => {
    if (editingProduct.sizes.length <= 1) return;
    setEditingProduct((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((s) => s.id !== sizeId),
    }));
  };

  const handleMaterialChange = (
    idx: number,
    patch: Partial<MaterialOption>
  ) => {
    setEditingProduct((prev) => ({
      ...prev,
      materials: prev.materials.map((m, i) =>
        i === idx ? { ...m, ...patch } : m
      ),
    }));
  };

  const handleRemoveMaterial = (idx: number) => {
    if (editingProduct.materials.length <= 1) return;
    setEditingProduct((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== idx),
    }));
  };

  const handleFinishChange = (idx: number, patch: Partial<FinishOption>) => {
    setEditingProduct((prev) => ({
      ...prev,
      finishes: prev.finishes.map((f, i) =>
        i === idx ? { ...f, ...patch } : f
      ),
    }));
  };

  const handleRemoveFinish = (idx: number) => {
    if (editingProduct.finishes.length <= 1) return;
    setEditingProduct((prev) => ({
      ...prev,
      finishes: prev.finishes.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setProductErrorMsg(null);
    setProductSavedMsg(null);

    const cleanSlug = editingProduct.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const payload: Product = {
      ...editingProduct,
      slug: cleanSlug || editingProduct.slug,
      description:
        editingProduct.description.trim() ||
        editingProduct.shortDescription.trim(),
    };

    const res = await upsertProduct(payload);
    setSavingProduct(false);

    if (!res.ok || !res.product) {
      setProductErrorMsg(res.error || "Unable to save product schedule.");
      return;
    }

    setEditingProduct(res.product);
    setProductSavedMsg(
      `Saved "${res.product.name}" (${res.product.sizes.length} size schedules) to database.`
    );
    setTimeout(() => setProductSavedMsg(null), 4000);
  };

  const handleDeleteCurrentProduct = async () => {
    const targetId = editingProduct.id;
    const remaining = products.filter((p) => p.id !== targetId);
    const res = await deleteProduct(targetId);
    if (!res.ok) {
      setProductErrorMsg(res.error || "Unable to delete product.");
      return;
    }
    setEditingProduct(remaining[0] ?? createBlankProduct(String(Date.now())));
    setProductSavedMsg("Product removed from database.");
    setTimeout(() => setProductSavedMsg(null), 3000);
  };

  // Staff Handler
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStaff(true);
    setStaffFeedback(null);

    const res = await provisionStaffAccount({
      fullName: staffName,
      email: staffEmail,
      phone: staffPhone,
      department: staffDept,
      role: staffRole,
      password: staffPass,
    });
    setCreatingStaff(false);

    if (!res.ok) {
      setStaffFeedback({
        type: "error",
        message: res.error || "Failed to provision staff account.",
      });
      return;
    }

    setStaffFeedback({
      type: "success",
      message: `Provisioned ${staffRole.replace("_", " ")} account for ${staffEmail}.`,
    });
    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffPass("");
  };

  // Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsErrorMsg(null);
    setSettingsSavedMsg(null);

    const res = await updateSettings(settingsForm);
    setSavingSettings(false);

    if (!res.ok) {
      setSettingsErrorMsg(res.error || "Failed to update settings.");
      return;
    }

    setSettingsSavedMsg("Global system settings saved to database.");
    setTimeout(() => setSettingsSavedMsg(null), 4000);
  };

  const isSavedProduct = products.some((p) => p.id === editingProduct.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-separator pb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            System Administration · {currentUser.fullName} ({currentUser.email})
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Catalog Pricing, Personnel & System Configuration
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              void refreshData();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync
          </Button>
          <Link href="/dashboard">
            <Button size="sm" variant="secondary">
              Operations Desk
            </Button>
          </Link>
        </div>
      </div>

      {/* Executive KPI Ledger */}
      <div className="grid grid-cols-2 divide-x divide-y divide-separator overflow-hidden rounded-xl border border-separator bg-surface lg:grid-cols-4 lg:divide-y-0 tabular-nums">
        <div className="p-4">
          <div className="text-xs text-muted">Booked Order Value</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-foreground">
            {formatCurrency(totalOrderRevenue)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">
            Collected: {formatCurrency(totalCollected)}
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-muted">Open Quoted Pipeline</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-foreground">
            {formatCurrency(quotedPipeline)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {inquiries.length} total inquiries
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-muted">Catalog Lines</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {products.length}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {products.reduce((s, p) => s + p.sizes.length, 0)} size schedules
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-muted">Personnel & Queue</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {users.filter((u) => u.role !== "customer").length} staff
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {tickets.filter((t) => t.status === "queued").length} queued tickets
          </div>
        </div>
      </div>

      {/* ADMINISTRATION TABS */}
      <Tabs defaultSelectedKey="products" className="space-y-5">
        <Tabs.ListContainer>
          <Tabs.List aria-label="System administration modules">
            <Tabs.Tab id="products">
              Catalog & Size Pricing ({products.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="staff">
              Personnel & Access ({users.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="settings">
              Global Settings & Security
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ================================================================
            TAB 1: PRODUCTS & PRICE-PER-SIZE MATRIX CRUD
        ================================================================ */}
        <Tabs.Panel id="products" className="space-y-4">
          {productSavedMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-separator bg-surface px-4 py-3 text-xs font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{productSavedMsg}</span>
            </div>
          )}
          {productErrorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{productErrorMsg}</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Product Selector Sidebar */}
            <div className="space-y-3 lg:col-span-4">
              <Button
                variant="primary"
                fullWidth
                onPress={() => {
                  setProductErrorMsg(null);
                  setProductSavedMsg(null);
                  setEditingProduct(createBlankProduct(String(Date.now())));
                }}
              >
                <Plus className="h-4 w-4" />
                New Product Schedule
              </Button>

              {products.length === 0 ? (
                <Card className="border border-separator bg-surface p-6 space-y-1.5">
                  <div className="text-sm font-semibold text-foreground">
                    No catalog lines published
                  </div>
                  <p className="text-xs leading-relaxed text-muted">
                    Complete the specification and per-size pricing form on the
                    right and click{" "}
                    <strong className="text-foreground">Save Schedule</strong>{" "}
                    to publish your first product line.
                  </p>
                </Card>
              ) : (
                <div className="max-h-[650px] space-y-2 overflow-y-auto pr-1">
                  {products.map((prod) => {
                    const selected = editingProduct.id === prod.id;
                    return (
                      <Card
                        key={prod.id}
                        onClick={() => {
                          setProductErrorMsg(null);
                          setEditingProduct(prod);
                        }}
                        className={`cursor-pointer border p-4 transition-colors tabular-nums ${
                          selected
                            ? "border-foreground/40 bg-surface-secondary"
                            : "border-separator bg-surface hover:bg-surface-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted">
                            {prod.category}
                          </span>
                          <Chip
                            size="sm"
                            color={prod.isActive ? "success" : "default"}
                            variant="soft"
                          >
                            {prod.isActive ? "Published" : "Hidden"}
                          </Chip>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {prod.name}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {prod.sizes.length} sizes · Min {prod.minOrderQty}{" "}
                          {prod.baseUnit}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Product & Price-Per-Size Matrix Editor */}
            <div className="lg:col-span-8">
              <Card className="border border-separator bg-surface p-6">
                <form onSubmit={handleSaveProduct} className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator pb-4">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        {isSavedProduct
                          ? `Edit Schedule: ${editingProduct.name}`
                          : "Create Product Schedule"}
                      </h2>
                      <p className="text-xs text-muted">
                        Persists directly to{" "}
                        <code className="font-mono text-foreground">
                          products
                        </code>{" "}
                        and{" "}
                        <code className="font-mono text-foreground">
                          product_sizes
                        </code>{" "}
                        with server-side order pricing enforcement.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSavedProduct && (
                        <Button
                          size="sm"
                          variant="danger-soft"
                          onPress={handleDeleteCurrentProduct}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        isDisabled={savingProduct}
                      >
                        <Save className="h-3.5 w-3.5" />
                        {savingProduct ? "Saving..." : "Save Schedule"}
                      </Button>
                    </div>
                  </div>

                  {/* Core Metadata */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Product Name *
                      </label>
                      <input
                        required
                        value={editingProduct.name}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="e.g., Commercial Flyers / Large Format Tarpaulin"
                        className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Category *
                      </label>
                      <input
                        required
                        value={editingProduct.category}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        placeholder="e.g., Commercial Print"
                        className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Pricing Unit *
                      </label>
                      <input
                        required
                        value={editingProduct.baseUnit}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            baseUnit: e.target.value,
                          }))
                        }
                        placeholder="per pc / per box / per sq.ft"
                        className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Minimum Order Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={editingProduct.minOrderQty}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            minOrderQty: Math.max(
                              1,
                              Number.parseInt(e.target.value || "1", 10)
                            ),
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Standard Lead Time
                      </label>
                      <input
                        value={editingProduct.leadTimeDays}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            leadTimeDays: e.target.value,
                          }))
                        }
                        placeholder="2–3 business days"
                        className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid items-center gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Specification Tag (Optional)
                      </label>
                      <input
                        value={editingProduct.badge || ""}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            badge: e.target.value || undefined,
                          }))
                        }
                        placeholder="Offset / Same-Day Eligible"
                        className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <label className="flex items-center gap-2 pt-4 text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={editingProduct.isActive}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-current"
                      />
                      Published in Public Catalog
                    </label>

                    <label className="flex items-center gap-2 pt-4 text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={editingProduct.featured}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            featured: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-current"
                      />
                      Featured on Storefront
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Catalog Summary *
                      </label>
                      <input
                        required
                        value={editingProduct.shortDescription}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            shortDescription: e.target.value,
                          }))
                        }
                        placeholder="Concise summary shown on directory cards"
                        className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Detailed Technical Description
                      </label>
                      <input
                        value={editingProduct.description}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Full specifications shown in configurator modal"
                        className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-xs text-foreground outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* PRICE PER SIZE MATRIX EDITOR */}
                  <div className="space-y-3 border-t border-separator pt-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Per-Size Rate Schedule ({settings.currencySymbol})
                        </h3>
                        <p className="mt-0.5 text-[11px] text-muted">
                          Define base unit rate, optional 100+ and 500+ volume
                          rates, and plate/setup fee per size.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={handleAddSizeTier}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Size
                      </Button>
                    </div>

                    <div className="space-y-2 tabular-nums">
                      {editingProduct.sizes.map((sz) => (
                        <div
                          key={sz.id}
                          className="grid items-end gap-2 rounded-lg border border-separator bg-background p-3 sm:grid-cols-12"
                        >
                          <div className="sm:col-span-3">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              Size Label *
                            </label>
                            <input
                              required
                              value={sz.sizeLabel}
                              onChange={(e) =>
                                handleSizeChange(
                                  sz.id,
                                  "sizeLabel",
                                  e.target.value
                                )
                              }
                              placeholder="A4 / 2ft × 5ft"
                              className="h-8 w-full rounded-md border border-separator bg-surface px-2.5 text-xs font-medium text-foreground outline-none focus:border-accent"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              Dimensions *
                            </label>
                            <input
                              required
                              value={sz.dimensions}
                              onChange={(e) =>
                                handleSizeChange(
                                  sz.id,
                                  "dimensions",
                                  e.target.value
                                )
                              }
                              placeholder="210 × 297 mm"
                              className="h-8 w-full rounded-md border border-separator bg-surface px-2.5 font-mono text-xs text-foreground outline-none focus:border-accent"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              Base Rate *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              required
                              value={sz.unitPrice}
                              onChange={(e) =>
                                handleSizeChange(
                                  sz.id,
                                  "unitPrice",
                                  Number.parseFloat(e.target.value || "0")
                                )
                              }
                              className="h-8 w-full rounded-md border border-separator bg-surface px-2 font-mono text-xs font-semibold text-foreground outline-none focus:border-accent"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              100+
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={sz.bulk100Price ?? ""}
                              onChange={(e) =>
                                handleSizeChange(
                                  sz.id,
                                  "bulk100Price",
                                  e.target.value
                                    ? Number.parseFloat(e.target.value)
                                    : undefined
                                )
                              }
                              className="h-8 w-full rounded-md border border-separator bg-surface px-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              500+
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={sz.bulk500Price ?? ""}
                              onChange={(e) =>
                                handleSizeChange(
                                  sz.id,
                                  "bulk500Price",
                                  e.target.value
                                    ? Number.parseFloat(e.target.value)
                                    : undefined
                                )
                              }
                              className="h-8 w-full rounded-md border border-separator bg-surface px-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                            />
                          </div>

                          <div className="sm:col-span-1">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              Setup
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={sz.setupFee}
                              onChange={(e) =>
                                handleSizeChange(
                                  sz.id,
                                  "setupFee",
                                  Number.parseFloat(e.target.value || "0")
                                )
                              }
                              className="h-8 w-full rounded-md border border-separator bg-surface px-2 font-mono text-xs text-foreground outline-none focus:border-accent"
                            />
                          </div>

                          <div className="flex justify-end sm:col-span-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveSizeTier(sz.id)}
                              disabled={editingProduct.sizes.length <= 1}
                              className="rounded p-1.5 text-muted hover:text-danger disabled:opacity-30"
                              aria-label="Remove size tier"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SUBSTRATES & FINISHES */}
                  <div className="grid gap-4 border-t border-separator pt-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          Substrates & Multipliers (1.0 = Base)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              materials: [
                                ...prev.materials,
                                { name: "", priceMultiplier: 1.0 },
                              ],
                            }))
                          }
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          + Add Substrate
                        </button>
                      </div>
                      {editingProduct.materials.map((m, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            required
                            value={m.name}
                            onChange={(e) =>
                              handleMaterialChange(idx, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Stock / Paper GSM"
                            className="h-8 flex-1 rounded-md border border-separator bg-background px-2.5 text-xs text-foreground outline-none focus:border-accent"
                          />
                          <input
                            type="number"
                            step="0.05"
                            min={0.1}
                            value={m.priceMultiplier}
                            onChange={(e) =>
                              handleMaterialChange(idx, {
                                priceMultiplier: Number.parseFloat(
                                  e.target.value || "1"
                                ),
                              })
                            }
                            className="h-8 w-20 rounded-md border border-separator bg-background px-2 font-mono text-xs text-foreground outline-none focus:border-accent tabular-nums"
                            title="Multiplier (1.0 = base)"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            disabled={editingProduct.materials.length <= 1}
                            className="rounded p-1 text-muted hover:text-danger disabled:opacity-30"
                            aria-label="Remove material"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          Finishes & Unit Add-Ons ({settings.currencySymbol})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              finishes: [
                                ...prev.finishes,
                                { name: "", addPerUnit: 0 },
                              ],
                            }))
                          }
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          + Add Finish
                        </button>
                      </div>
                      {editingProduct.finishes.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            required
                            value={f.name}
                            onChange={(e) =>
                              handleFinishChange(idx, { name: e.target.value })
                            }
                            placeholder="Lamination / Finish"
                            className="h-8 flex-1 rounded-md border border-separator bg-background px-2.5 text-xs text-foreground outline-none focus:border-accent"
                          />
                          <input
                            type="number"
                            step="0.25"
                            min={0}
                            value={f.addPerUnit}
                            onChange={(e) =>
                              handleFinishChange(idx, {
                                addPerUnit: Number.parseFloat(
                                  e.target.value || "0"
                                ),
                              })
                            }
                            className="h-8 w-20 rounded-md border border-separator bg-background px-2 font-mono text-xs text-foreground outline-none focus:border-accent tabular-nums"
                            title="Add-on per unit"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFinish(idx)}
                            disabled={editingProduct.finishes.length <= 1}
                            className="rounded p-1 text-muted hover:text-danger disabled:opacity-30"
                            aria-label="Remove finish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        </Tabs.Panel>

        {/* ================================================================
            TAB 2: EMPLOYEE & ROLE MANAGEMENT
        ================================================================ */}
        <Tabs.Panel id="staff" className="grid gap-6 lg:grid-cols-12">
          <Card className="border border-separator bg-surface p-6 space-y-4 lg:col-span-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Provision Staff Account
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Registers a Supabase Auth account and assigns staff permissions.
              </p>
            </div>

            {staffFeedback && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
                  staffFeedback.type === "success"
                    ? "border-separator bg-surface-secondary text-foreground"
                    : "border-danger/30 bg-danger/10 text-danger"
                }`}
              >
                {staffFeedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{staffFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Full Name *
                </label>
                <input
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Full name"
                  className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Work Email *
                </label>
                <input
                  required
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@clayjar.com.ph"
                  className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Telephone
                  </label>
                  <input
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="+63 917..."
                    className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Access Role
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as UserRole)}
                    className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                  >
                    <option value="employee">Employee</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Department
                  </label>
                  <input
                    value={staffDept}
                    onChange={(e) => setStaffDept(e.target.value)}
                    className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Initial Password *
                  </label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={staffPass}
                    onChange={(e) => setStaffPass(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isDisabled={creatingStaff}
              >
                {creatingStaff ? "Provisioning..." : "Provision Account"}
              </Button>
            </form>
          </Card>

          <Card className="border border-separator bg-surface p-6 space-y-4 lg:col-span-7">
            <h2 className="text-base font-semibold text-foreground tabular-nums">
              Account Directory ({users.length})
            </h2>
            <div className="divide-y divide-separator">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {u.fullName}
                      </span>
                      <Chip
                        size="sm"
                        color={
                          u.role === "super_admin"
                            ? "warning"
                            : u.role === "employee"
                              ? "accent"
                              : "default"
                        }
                        variant="soft"
                      >
                        {u.role.replace("_", " ")}
                      </Chip>
                      {!u.isActive && (
                        <Chip size="sm" color="danger" variant="soft">
                          Disabled
                        </Chip>
                      )}
                    </div>
                    <div className="mt-0.5 text-muted">
                      {u.email}
                      {u.department ? ` · ${u.department}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser.id}
                      onChange={(e) =>
                        upsertUser({ ...u, role: e.target.value as UserRole })
                      }
                      className="h-8 rounded-md border border-separator bg-background px-2 text-foreground outline-none disabled:opacity-50"
                    >
                      <option value="customer">Customer</option>
                      <option value="employee">Employee</option>
                      <option value="super_admin">Super Admin</option>
                    </select>

                    {u.id !== currentUser.id && (
                      <Button
                        size="sm"
                        variant={u.isActive ? "secondary" : "primary"}
                        onPress={() =>
                          upsertUser({ ...u, isActive: !u.isActive })
                        }
                      >
                        {u.isActive ? "Disable" : "Enable"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Tabs.Panel>

        {/* ================================================================
            TAB 3: APPLICATION SETTINGS & SECURITY STATUS
        ================================================================ */}
        <Tabs.Panel id="settings" className="space-y-6">
          {settingsSavedMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-separator bg-surface px-4 py-3 text-xs font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{settingsSavedMsg}</span>
            </div>
          )}
          {settingsErrorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{settingsErrorMsg}</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="border border-separator bg-surface p-6 lg:col-span-8">
              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="flex items-center justify-between border-b border-separator pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Global Commercial & Studio Settings
                    </h2>
                    <p className="text-xs text-muted">
                      Controls studio identity, tax rate, reference prefixes,
                      settlement instructions, and queue routing.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    isDisabled={savingSettings}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingSettings ? "Saving..." : "Save Settings"}
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Studio Name
                    </label>
                    <input
                      required
                      value={settingsForm.shopName}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          shopName: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Tagline
                    </label>
                    <input
                      value={settingsForm.tagline}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          tagline: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Currency, Tax, Validity */}
                <div className="grid gap-4 sm:grid-cols-3 tabular-nums">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Settlement Currency
                    </label>
                    <select
                      value={settingsForm.currencyCode}
                      onChange={(e) => {
                        const found = CURRENCY_PRESETS.find(
                          (c) => c.code === e.target.value
                        );
                        if (found) {
                          setSettingsForm((p) => ({
                            ...p,
                            currencyCode: found.code,
                            currencySymbol: found.symbol,
                          }));
                        }
                      }}
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    >
                      {CURRENCY_PRESETS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      VAT / Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={settingsForm.taxRate}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          taxRate: Number.parseFloat(e.target.value || "0"),
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Quotation Validity (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={settingsForm.quotationValidityDays}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          quotationValidityDays: Number.parseInt(
                            e.target.value || "14",
                            10
                          ),
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Reference Number Prefixes */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Order Prefix
                    </label>
                    <input
                      value={settingsForm.orderPrefix}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          orderPrefix: e.target.value.toUpperCase(),
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Quotation Prefix
                    </label>
                    <input
                      value={settingsForm.quotePrefix}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          quotePrefix: e.target.value.toUpperCase(),
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Ticket Prefix
                    </label>
                    <input
                      value={settingsForm.ticketPrefix}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          ticketPrefix: e.target.value.toUpperCase(),
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* Contact & Shop Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Contact Email
                    </label>
                    <input
                      value={settingsForm.contactEmail}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          contactEmail: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Telephone
                    </label>
                    <input
                      value={settingsForm.contactPhone}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          contactPhone: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 font-mono text-xs text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Studio Address
                    </label>
                    <input
                      value={settingsForm.shopAddress}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          shopAddress: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Operating Hours
                    </label>
                    <input
                      value={settingsForm.businessHours}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          businessHours: e.target.value,
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-separator bg-background px-3 text-sm text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Settlement & Production Terms
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.paymentInstructions}
                    onChange={(e) =>
                      setSettingsForm((p) => ({
                        ...p,
                        paymentInstructions: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>

                {/* Chat Queue Routing */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-separator bg-background p-4">
                  <label className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={settingsForm.autoAssignTickets}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          autoAssignTickets: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-current"
                    />
                    Automatically assign incoming tickets to on-duty specialists
                  </label>

                  <div className="flex items-center gap-2 text-xs tabular-nums">
                    <span className="text-muted">Max active / staff:</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settingsForm.maxActiveChatsPerEmployee}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          maxActiveChatsPerEmployee: Number.parseInt(
                            e.target.value || "5",
                            10
                          ),
                        }))
                      }
                      className="h-8 w-16 rounded-md border border-separator bg-surface px-2 text-center font-mono font-medium text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </form>
            </Card>

            {/* Live Database & Security Posture Card */}
            <Card className="border border-separator bg-surface p-6 space-y-4 lg:col-span-4 h-fit">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Database & Security Posture
                </span>
                <Chip
                  size="sm"
                  color={supabaseConnected ? "success" : "danger"}
                  variant="soft"
                >
                  {supabaseConnected ? "Connected" : "Offline"}
                </Chip>
              </div>
              <div className="divide-y divide-separator rounded-lg border border-separator bg-background px-3.5 text-xs tabular-nums">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Published Products</span>
                  <span className="font-mono font-medium text-foreground">
                    {products.length}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Size Schedules</span>
                  <span className="font-mono font-medium text-foreground">
                    {products.reduce((acc, p) => acc + p.sizes.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Quotations</span>
                  <span className="font-mono font-medium text-foreground">
                    {inquiries.length}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Production Orders</span>
                  <span className="font-mono font-medium text-foreground">
                    {orders.length}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Support Tickets</span>
                  <span className="font-mono font-medium text-foreground">
                    {tickets.length}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted">Registered Accounts</span>
                  <span className="font-mono font-medium text-foreground">
                    {users.length}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                Protected by PostgreSQL Row Level Security, server-side pricing
                RPCs, non-enumerable CSPRNG reference codes, and HTTP Content
                Security Policy headers.
              </p>
            </Card>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
