"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip, Tabs } from "@heroui/react";
import {
  Briefcase,
  CheckCircle2,
  Database,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { usePrintShop } from "@/context/PrintShopContext";
import type {
  AppSettings,
  FinishOption,
  MaterialOption,
  Product,
  ProductSizeTier,
  UserProfile,
  UserRole,
} from "@/types/printshop";

const CURRENCY_PRESETS = [
  { code: "PHP", symbol: "₱", label: "Philippine Peso (₱)" },
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (S$)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
];

function createBlankProduct(seed = "draft"): Product {
  return {
    id: `prod-${seed}`,
    slug: `custom-product-${seed}`,
    name: "New Print Product Line",
    category: "Commercial Print",
    shortDescription: "High-resolution custom print product priced per size.",
    description:
      "Full-color commercial printing with customizable sizes, paper weights, and protective lamination.",
    baseUnit: "per pc",
    minOrderQty: 1,
    leadTimeDays: "2–3 business days",
    badge: "New",
    featured: true,
    isActive: true,
    accentColor: "indigo",
    sizes: [
      {
        id: `sz-${seed}-1`,
        sizeLabel: "Standard Small (A5)",
        dimensions: "148 × 210 mm",
        unitPrice: 12,
        bulk100Price: 9.5,
        bulk500Price: 7.5,
        setupFee: 0,
      },
    ],
    materials: [{ name: "Standard 250 GSM Matte Stock", priceMultiplier: 1.0 }],
    finishes: [{ name: "Clean Trim Finish", addPerUnit: 0 }],
  };
}

export default function SuperAdminPage() {
  const {
    currentUser,
    supabaseConnected,
    settings,
    products,
    users,
    orders,
    inquiries,
    tickets,
    formatCurrency,
    updateSettings,
    upsertProduct,
    deleteProduct,
    upsertUser,
    resetDemoData,
  } = usePrintShop();

  // --- PRODUCT EDITOR STATE ---
  const [editingProduct, setEditingProduct] = useState<Product>(
    products[0] ?? createBlankProduct()
  );
  const [productSavedMsg, setProductSavedMsg] = useState<string | null>(null);

  // --- SETTINGS FORM STATE ---
  const [settingsForm, setSettingsForm] = useState<AppSettings>(settings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // --- STAFF CREATION STATE ---
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffDept, setStaffDept] = useState("Front Desk & Quotations");
  const [staffRole, setStaffRole] = useState<UserRole>("employee");
  const [staffPass, setStaffPass] = useState("staff123");

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Card className="border border-separator bg-surface p-8 space-y-4">
          <ShieldCheck className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-extrabold text-foreground">
            Super Admin Access Required
          </h1>
          <p className="text-sm text-muted">
            Only Super Administrators can modify Application Settings, Products,
            Price-Per-Size Matrices, and Staff Permissions.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/staff/login">
              <Button variant="primary">Sign In as Super Admin</Button>
            </Link>
            {currentUser?.role === "employee" && (
              <Link href="/dashboard">
                <Button variant="secondary">Return to Employee Desk</Button>
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
      sizeLabel: "Custom Size Tier",
      dimensions: "Specify W × H",
      unitPrice: 100,
      bulk100Price: 85,
      bulk500Price: 70,
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

  const handleFinishChange = (idx: number, patch: Partial<FinishOption>) => {
    setEditingProduct((prev) => ({
      ...prev,
      finishes: prev.finishes.map((f, i) =>
        i === idx ? { ...f, ...patch } : f
      ),
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = editingProduct.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const updated = { ...editingProduct, slug: cleanSlug || editingProduct.slug };
    await upsertProduct(updated);
    setEditingProduct(updated);
    setProductSavedMsg(
      `Saved "${updated.name}" with ${updated.sizes.length} size pricing tiers!`
    );
    setTimeout(() => setProductSavedMsg(null), 3500);
  };

  // Staff Handler
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const newStaff: UserProfile = {
      id: `usr-staff-${Date.now()}`,
      fullName: staffName.trim(),
      email: staffEmail.trim().toLowerCase(),
      phone: staffPhone.trim(),
      role: staffRole,
      department: staffDept,
      isActive: true,
      isOnline: true,
      passwordHint: staffPass,
      createdAt: new Date().toISOString(),
    };
    await upsertUser(newStaff);
    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
  };

  // Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(settingsForm);
    setSettingsSavedMsg(
      "Application settings, currency, tax & shop details updated!"
    );
    setTimeout(() => setSettingsSavedMsg(null), 3500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-separator pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Chip size="sm" color="warning" variant="soft">
              Super Admin Command Center
            </Chip>
            <span className="text-xs text-muted">
              Administrator:{" "}
              <strong className="text-foreground">{currentUser.fullName}</strong>
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
            Products, Price-Per-Size Matrix, Staff & App Settings
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard">
            <Button size="sm" variant="secondary">
              <Briefcase className="h-4 w-4" />
              Switch to Employee Desk
            </Button>
          </Link>
          {!supabaseConnected && (
            <Button size="sm" variant="ghost" onPress={resetDemoData}>
              <RotateCcw className="h-4 w-4" />
              Reset Seed Data
            </Button>
          )}
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-separator bg-surface p-4">
          <div className="text-xs text-muted">Booked Order Value</div>
          <div className="mt-1 text-2xl font-extrabold text-foreground">
            {formatCurrency(totalOrderRevenue)}
          </div>
          <div className="text-[11px] text-emerald-500">
            Collected: {formatCurrency(totalCollected)}
          </div>
        </Card>

        <Card className="border border-separator bg-surface p-4">
          <div className="text-xs text-muted">Open Quoted Pipeline</div>
          <div className="mt-1 text-2xl font-extrabold text-accent">
            {formatCurrency(quotedPipeline)}
          </div>
          <div className="text-[11px] text-muted">
            {inquiries.length} total inquiries
          </div>
        </Card>

        <Card className="border border-separator bg-surface p-4">
          <div className="text-xs text-muted">Products & Size Tiers</div>
          <div className="mt-1 text-2xl font-extrabold text-foreground">
            {products.length} Products
          </div>
          <div className="text-[11px] text-muted">
            {products.reduce((s, p) => s + p.sizes.length, 0)} configured size
            prices
          </div>
        </Card>

        <Card className="border border-separator bg-surface p-4">
          <div className="text-xs text-muted">Team & Queue Health</div>
          <div className="mt-1 text-2xl font-extrabold text-foreground">
            {users.filter((u) => u.role !== "customer").length} Staff
          </div>
          <div className="text-[11px] text-amber-500">
            {tickets.filter((t) => t.status === "queued").length} queued chat
            tickets
          </div>
        </Card>
      </div>

      {/* MAIN SUPER ADMIN TABS */}
      <Tabs defaultSelectedKey="products" className="space-y-5">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Super Admin sections">
            <Tabs.Tab id="products">
              <Layers className="mr-1.5 inline h-4 w-4" />
              Products & Price-Per-Size ({products.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="staff">
              <Users className="mr-1.5 inline h-4 w-4" />
              Employees & Accounts ({users.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="settings">
              <Settings className="mr-1.5 inline h-4 w-4" />
              Application Settings & Supabase
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ================================================================
            TAB 1: PRODUCTS & PRICE-PER-SIZE MATRIX CRUD
        ================================================================ */}
        <Tabs.Panel id="products" className="space-y-4">
          {productSavedMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              {productSavedMsg}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Product Selector Sidebar */}
            <div className="space-y-3 lg:col-span-4">
              <Button
                variant="primary"
                fullWidth
                onPress={() =>
                  setEditingProduct(createBlankProduct(String(Date.now())))
                }
              >
                <Plus className="h-4 w-4" />
                Create New Print Product
              </Button>

              <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
                {products.map((prod) => {
                  const selected = editingProduct.id === prod.id;
                  return (
                    <Card
                      key={prod.id}
                      onClick={() => setEditingProduct(prod)}
                      className={`cursor-pointer border p-4 transition ${
                        selected
                          ? "border-accent bg-accent/10"
                          : "border-separator bg-surface hover:border-accent/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-accent">
                          {prod.category}
                        </span>
                        <Chip
                          size="sm"
                          color={prod.isActive ? "success" : "default"}
                          variant="soft"
                        >
                          {prod.isActive ? "Active" : "Hidden"}
                        </Chip>
                      </div>
                      <div className="mt-1 text-sm font-bold text-foreground">
                        {prod.name}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {prod.sizes.length} sizes • Min {prod.minOrderQty}{" "}
                        {prod.baseUnit}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Product & Price-Per-Size Matrix Editor */}
            <div className="lg:col-span-8">
              <Card className="border border-separator bg-surface p-6">
                <form onSubmit={handleSaveProduct} className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator pb-4">
                    <h2 className="text-lg font-bold text-foreground">
                      Configure Product & Per-Size Pricing
                    </h2>
                    <div className="flex items-center gap-2">
                      {products.some((p) => p.id === editingProduct.id) && (
                        <Button
                          size="sm"
                          variant="danger-soft"
                          onPress={() => {
                            const remaining = products.filter(
                              (p) => p.id !== editingProduct.id
                            );
                            deleteProduct(editingProduct.id);
                            setEditingProduct(
                              remaining[0] ?? createBlankProduct()
                            );
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Product
                        </Button>
                      )}
                      <Button type="submit" size="sm" variant="primary">
                        <Save className="h-3.5 w-3.5" />
                        Save Product & Prices
                      </Button>
                    </div>
                  </div>

                  {/* Core Metadata */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-foreground">
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
                        className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm font-semibold text-foreground"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
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
                        className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Pricing Unit Label
                      </label>
                      <input
                        value={editingProduct.baseUnit}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            baseUnit: e.target.value,
                          }))
                        }
                        placeholder="per pc / per box / per sq.ft"
                        className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
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
                        className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Turnaround Lead Time
                      </label>
                      <input
                        value={editingProduct.leadTimeDays}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            leadTimeDays: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 items-center">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Highlight Badge (Optional)
                      </label>
                      <input
                        value={editingProduct.badge || ""}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            badge: e.target.value || undefined,
                          }))
                        }
                        placeholder="Best Seller / Waterproof"
                        className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground pt-4">
                      <input
                        type="checkbox"
                        checked={editingProduct.isActive}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-blue-600"
                      />
                      Visible in Public Catalog
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground pt-4">
                      <input
                        type="checkbox"
                        checked={editingProduct.featured}
                        onChange={(e) =>
                          setEditingProduct((prev) => ({
                            ...prev,
                            featured: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-blue-600"
                      />
                      Featured on Home Page
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Short Catalog Summary
                    </label>
                    <input
                      value={editingProduct.shortDescription}
                      onChange={(e) =>
                        setEditingProduct((prev) => ({
                          ...prev,
                          shortDescription: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-xs text-foreground"
                    />
                  </div>

                  {/* PRICE PER SIZE MATRIX EDITOR */}
                  <div className="space-y-3 border-t border-separator pt-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Price-Per-Size Tiers ({settings.currencySymbol})
                        </h3>
                        <p className="text-[11px] text-muted">
                          Set exact unit price, 100+ bulk price, 500+ wholesale
                          price, and setup fee for each size.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={handleAddSizeTier}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Size Tier
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {editingProduct.sizes.map((sz) => (
                        <div
                          key={sz.id}
                          className="grid gap-2 rounded-xl border border-separator bg-surface-secondary/40 p-3 sm:grid-cols-12 items-end"
                        >
                          <div className="sm:col-span-3">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              Size Label
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
                              className="w-full rounded-lg border border-separator bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              Dimensions
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
                              className="w-full rounded-lg border border-separator bg-surface px-2.5 py-1.5 text-xs text-foreground"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="mb-0.5 block text-[10px] text-muted">
                              Base Price
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
                              className="w-full rounded-lg border border-separator bg-surface px-2 py-1.5 text-xs font-bold text-foreground"
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
                              className="w-full rounded-lg border border-separator bg-surface px-2 py-1.5 text-xs text-foreground"
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
                              className="w-full rounded-lg border border-separator bg-surface px-2 py-1.5 text-xs text-foreground"
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
                              className="w-full rounded-lg border border-separator bg-surface px-2 py-1.5 text-xs text-foreground"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveSizeTier(sz.id)}
                              disabled={editingProduct.sizes.length <= 1}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 disabled:opacity-30"
                              aria-label="Remove size tier"
                            >
                              <Trash2 className="h-4 w-4" />
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
                        <span className="text-xs font-bold text-foreground">
                          Materials & Multipliers
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              materials: [
                                ...prev.materials,
                                { name: "New Stock", priceMultiplier: 1.15 },
                              ],
                            }))
                          }
                          className="text-xs font-semibold text-accent hover:underline"
                        >
                          + Add Material
                        </button>
                      </div>
                      {editingProduct.materials.map((m, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            value={m.name}
                            onChange={(e) =>
                              handleMaterialChange(idx, {
                                name: e.target.value,
                              })
                            }
                            className="flex-1 rounded-lg border border-separator bg-surface-secondary/50 px-2.5 py-1.5 text-xs text-foreground"
                          />
                          <input
                            type="number"
                            step="0.05"
                            value={m.priceMultiplier}
                            onChange={(e) =>
                              handleMaterialChange(idx, {
                                priceMultiplier: Number.parseFloat(
                                  e.target.value || "1"
                                ),
                              })
                            }
                            className="w-20 rounded-lg border border-separator bg-surface-secondary/50 px-2 py-1.5 text-xs text-foreground"
                            title="Multiplier (1.0 = base)"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Finishes & Add-On Rates
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              finishes: [
                                ...prev.finishes,
                                { name: "New Finish", addPerUnit: 10 },
                              ],
                            }))
                          }
                          className="text-xs font-semibold text-accent hover:underline"
                        >
                          + Add Finish
                        </button>
                      </div>
                      {editingProduct.finishes.map((f, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            value={f.name}
                            onChange={(e) =>
                              handleFinishChange(idx, { name: e.target.value })
                            }
                            className="flex-1 rounded-lg border border-separator bg-surface-secondary/50 px-2.5 py-1.5 text-xs text-foreground"
                          />
                          <input
                            type="number"
                            step="0.25"
                            value={f.addPerUnit}
                            onChange={(e) =>
                              handleFinishChange(idx, {
                                addPerUnit: Number.parseFloat(
                                  e.target.value || "0"
                                ),
                              })
                            }
                            className="w-20 rounded-lg border border-separator bg-surface-secondary/50 px-2 py-1.5 text-xs text-foreground"
                            title="Add-on per unit"
                          />
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
            <h2 className="text-lg font-bold text-foreground">
              Add Employee / Admin Account
            </h2>
            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Full Name *
                </label>
                <input
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Patricia Gomez"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Work Email *
                </label>
                <input
                  required
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="patricia@clayjarprint.com"
                  className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Phone
                  </label>
                  <input
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="+63 917..."
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Role
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                  >
                    <option value="employee">Employee</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Department
                  </label>
                  <input
                    value={staffDept}
                    onChange={(e) => setStaffDept(e.target.value)}
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Initial Password
                  </label>
                  <input
                    value={staffPass}
                    onChange={(e) => setStaffPass(e.target.value)}
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
              <Button type="submit" variant="primary" fullWidth>
                <UserPlus className="h-4 w-4" />
                Provision Staff Account
              </Button>
            </form>
          </Card>

          <Card className="border border-separator bg-surface p-6 space-y-4 lg:col-span-7">
            <h2 className="text-lg font-bold text-foreground">
              Directory of Staff & Customer Accounts ({users.length})
            </h2>
            <div className="divide-y divide-separator">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
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
                          Deactivated
                        </Chip>
                      )}
                    </div>
                    <div className="text-muted">
                      {u.email}
                      {u.department ? ` • ${u.department}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        upsertUser({ ...u, role: e.target.value as UserRole })
                      }
                      className="rounded-lg border border-separator bg-surface-secondary px-2 py-1 text-foreground"
                    >
                      <option value="customer">Customer</option>
                      <option value="employee">Employee</option>
                      <option value="super_admin">Super Admin</option>
                    </select>

                    <Button
                      size="sm"
                      variant={u.isActive ? "secondary" : "primary"}
                      onPress={() =>
                        upsertUser({ ...u, isActive: !u.isActive })
                      }
                    >
                      {u.isActive ? "Disable" : "Activate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Tabs.Panel>

        {/* ================================================================
            TAB 3: APPLICATION SETTINGS & SUPABASE CONFIGURATION
        ================================================================ */}
        <Tabs.Panel id="settings" className="space-y-6">
          {settingsSavedMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              {settingsSavedMsg}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="border border-separator bg-surface p-6 lg:col-span-8">
              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="flex items-center justify-between border-b border-separator pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Global Print Shop & Quotation Settings
                    </h2>
                    <p className="text-xs text-muted">
                      Controls branding, currency, tax, reference prefixes,
                      payment instructions, and chat queue limits.
                    </p>
                  </div>
                  <Button type="submit" variant="primary">
                    <Save className="h-4 w-4" />
                    Save All Settings
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Print Shop Name
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
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Storefront Tagline
                    </label>
                    <input
                      value={settingsForm.tagline}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          tagline: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>

                {/* Currency, Tax, Validity */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Currency
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
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    >
                      {CURRENCY_PRESETS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Tax / VAT Rate (%)
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
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
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
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>

                {/* Reference Number Prefixes */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Order Reference Prefix
                    </label>
                    <input
                      value={settingsForm.orderPrefix}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          orderPrefix: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 font-mono text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Quotation Reference Prefix
                    </label>
                    <input
                      value={settingsForm.quotePrefix}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          quotePrefix: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 font-mono text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Chat Ticket Prefix
                    </label>
                    <input
                      value={settingsForm.ticketPrefix}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          ticketPrefix: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 font-mono text-sm text-foreground"
                    />
                  </div>
                </div>

                {/* Contact & Shop Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
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
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Contact Phone / Hotline
                    </label>
                    <input
                      value={settingsForm.contactPhone}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          contactPhone: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Shop Physical Address
                    </label>
                    <input
                      value={settingsForm.shopAddress}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          shopAddress: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
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
                      className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Payment & Downpayment Instructions (Displayed on Invoices &
                    Footer)
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
                    className="w-full rounded-xl border border-separator bg-surface-secondary/50 px-3 py-2 text-sm text-foreground"
                  />
                </div>

                {/* Chat Queue Routing */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-secondary/50 p-4">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={settingsForm.autoAssignTickets}
                      onChange={(e) =>
                        setSettingsForm((p) => ({
                          ...p,
                          autoAssignTickets: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-blue-600"
                    />
                    Auto-assign incoming chat tickets to online employees
                  </label>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted">Max active chats / staff:</span>
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
                      className="w-16 rounded-lg border border-separator bg-surface px-2.5 py-1 text-center font-bold text-foreground"
                    />
                  </div>
                </div>
              </form>
            </Card>

            {/* Supabase Readiness Card */}
            <Card className="border border-separator bg-surface p-6 space-y-4 lg:col-span-4 h-fit">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Database className="h-4 w-4 text-accent" />
                Supabase Backend Integration
              </div>
              <Chip
                size="sm"
                color={supabaseConnected ? "success" : "warning"}
                variant="soft"
              >
                {supabaseConnected
                  ? "Connected to Supabase Cloud"
                  : "Awaiting .env.local Credentials"}
              </Chip>
              <p className="text-xs leading-relaxed text-muted">
                This project includes the full PostgreSQL schema, Row Level
                Security (RLS) policies, and Realtime triggers in{" "}
                <code className="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-foreground">
                  supabase/schema.sql
                </code>
                .
              </p>
              <div className="rounded-xl bg-surface-secondary p-3.5 font-mono text-[11px] text-foreground space-y-1">
                <div className="text-muted"># .env.local</div>
                <div>NEXT_PUBLIC_SUPABASE_URL=...</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</div>
              </div>
              <p className="text-xs text-muted">
                Send your Supabase Project URL and Anon Key anytime and we will
                wire and seed your live database immediately.
              </p>
            </Card>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
