"use client";

import React, { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  ArrowsRotateLeft,
  CircleFill,
  Eye,
  EyeSlash,
  FloppyDisk,
  LayoutCellsLarge,
  PersonPlus,
  Plus,
  ShieldCheck,
  TrashBin,
  Tray,
} from "@gravity-ui/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  FieldError,
  Fieldset,
  Form,
  Input,
  InputGroup,
  Label,
  ListBox,
  NumberField,
  ScrollShadow,
  Select,
  Separator,
  Spinner,
  Surface,
  Switch,
  Tabs,
  TextArea,
  TextField,
  Typography,
  toast,
} from "@heroui/react";
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
  const [showStaffPass, setShowStaffPass] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffFeedback, setStaffFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-20 text-sm text-muted">
        <Spinner size="sm" />
        <span>Loading Administration Workspace...</span>
      </div>
    );
  }

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Card className="p-8 text-center">
          <Card.Header className="items-center">
            <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <Card.Title className="text-lg">
              Administrator Authorization Required
            </Card.Title>
            <Card.Description>
              System settings, catalog pricing schedules, and staff permissions
              are restricted to Super Administrators.
            </Card.Description>
          </Card.Header>
          <Card.Footer className="justify-center gap-2.5 pt-2">
            <NextLink href="/staff/login">
              <Button variant="primary">Sign In</Button>
            </NextLink>
            {currentUser?.role === "employee" && (
              <NextLink href="/dashboard">
                <Button variant="secondary">Operations Desk</Button>
              </NextLink>
            )}
          </Card.Footer>
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

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
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
    const msg = `Saved "${res.product.name}" (${res.product.sizes.length} size schedules) to database.`;
    setProductSavedMsg(msg);
    toast.success(msg);
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
    toast.success("Product removed from database");
    setTimeout(() => setProductSavedMsg(null), 3000);
  };

  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const msg = `Provisioned ${staffRole.replace("_", " ")} account for ${staffEmail}.`;
    setStaffFeedback({
      type: "success",
      message: msg,
    });
    toast.success(msg);
    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffPass("");
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
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
    toast.success("Global system settings saved");
    setTimeout(() => setSettingsSavedMsg(null), 4000);
  };

  const isSavedProduct = products.some((p) => p.id === editingProduct.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Chip size="sm" variant="soft" color="accent" className="mb-2">
            <ShieldCheck width={12} />
            <Chip.Label>
              System Administration · {currentUser.fullName} (
              {currentUser.email})
            </Chip.Label>
          </Chip>
          <Typography.Heading
            level={1}
            className="text-2xl font-bold tracking-tight"
          >
            Catalog Pricing, Personnel & System Configuration
          </Typography.Heading>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => {
              void refreshData();
              toast("Synced database state");
            }}
          >
            <ArrowsRotateLeft className="size-3.5" />
            Sync
          </Button>
          <NextLink href="/dashboard">
            <Button size="sm" variant="secondary">
              <LayoutCellsLarge className="size-3.5" />
              Operations Desk
            </Button>
          </NextLink>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 tabular-nums">
        <Card className="p-4">
          <Card.Description>Booked Order Value</Card.Description>
          <div className="mt-1 font-mono text-2xl font-bold text-foreground">
            {formatCurrency(totalOrderRevenue)}
          </div>
          <div className="mt-0.5 font-mono text-xs text-muted">
            Collected: {formatCurrency(totalCollected)}
          </div>
        </Card>

        <Card className="p-4">
          <Card.Description>Open Quoted Pipeline</Card.Description>
          <div className="mt-1 font-mono text-2xl font-bold text-foreground">
            {formatCurrency(quotedPipeline)}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {inquiries.length} total inquiries
          </div>
        </Card>

        <Card className="p-4">
          <Card.Description>Catalog Lines</Card.Description>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {products.length}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {products.reduce((s, p) => s + p.sizes.length, 0)} size schedules
          </div>
        </Card>

        <Card className="p-4">
          <Card.Description>Personnel & Queue</Card.Description>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {users.filter((u) => u.role !== "customer").length} staff
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {tickets.filter((t) => t.status === "queued").length} queued tickets
          </div>
        </Card>
      </div>

      {/* ADMINISTRATION TABS */}
      <Tabs defaultSelectedKey="products" className="w-full">
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
        <Tabs.Panel id="products" className="space-y-4 pt-5">
          {productSavedMsg && (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Catalog Updated</Alert.Title>
                <Alert.Description>{productSavedMsg}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          {productErrorMsg && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Save Failed</Alert.Title>
                <Alert.Description>{productErrorMsg}</Alert.Description>
              </Alert.Content>
            </Alert>
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
                <Plus className="size-4" />
                New Product Schedule
              </Button>

              {products.length === 0 ? (
                <Card className="p-6">
                  <EmptyState className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                    <Tray className="size-6 text-muted" />
                    <div className="text-sm font-semibold text-foreground">
                      No catalog lines published
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      Complete the specification and per-size pricing form on
                      the right and click{" "}
                      <strong className="text-foreground">Save Schedule</strong>{" "}
                      to publish your first product line.
                    </p>
                  </EmptyState>
                </Card>
              ) : (
                <ScrollShadow className="max-h-[650px] pr-1">
                  <div className="space-y-2.5">
                    {products.map((prod) => {
                      const selected = editingProduct.id === prod.id;
                      return (
                        <Card
                          key={prod.id}
                          variant={selected ? "secondary" : "default"}
                          onClick={() => {
                            setProductErrorMsg(null);
                            setEditingProduct(prod);
                          }}
                          className="cursor-pointer p-4 tabular-nums transition-colors"
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
                              <Chip.Label>
                                {prod.isActive ? "Published" : "Hidden"}
                              </Chip.Label>
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
                </ScrollShadow>
              )}
            </div>

            {/* Product & Price-Per-Size Matrix Editor */}
            <div className="lg:col-span-8">
              <Card className="p-6">
                <Form
                  onSubmit={handleSaveProduct}
                  className="flex flex-col gap-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Card.Title className="text-lg">
                        {isSavedProduct
                          ? `Edit Schedule: ${editingProduct.name}`
                          : "Create Product Schedule"}
                      </Card.Title>
                      <Card.Description>
                        Persists directly to{" "}
                        <Typography.Code>products</Typography.Code> and{" "}
                        <Typography.Code>product_sizes</Typography.Code> with
                        server-side order pricing enforcement.
                      </Card.Description>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSavedProduct && (
                        <Button
                          size="sm"
                          variant="danger-soft"
                          onPress={handleDeleteCurrentProduct}
                        >
                          <TrashBin className="size-3.5" />
                          Delete
                        </Button>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        isPending={savingProduct}
                      >
                        {({ isPending }) => (
                          <>
                            {isPending ? (
                              <Spinner color="current" size="sm" />
                            ) : (
                              <FloppyDisk className="size-3.5" />
                            )}
                            {isPending ? "Saving..." : "Save Schedule"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Core Metadata */}
                  <Fieldset className="w-full">
                    <Fieldset.Legend>Product Details</Fieldset.Legend>
                    <Fieldset.Group>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <TextField
                          isRequired
                          className="sm:col-span-2"
                          name="productName"
                          value={editingProduct.name}
                          onChange={(val) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              name: val,
                            }))
                          }
                        >
                          <Label>Product Name</Label>
                          <Input
                            variant="secondary"
                            placeholder="e.g., Commercial Flyers / Large Format Tarpaulin"
                          />
                          <FieldError />
                        </TextField>

                        <TextField
                          isRequired
                          name="category"
                          value={editingProduct.category}
                          onChange={(val) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              category: val,
                            }))
                          }
                        >
                          <Label>Category</Label>
                          <Input
                            variant="secondary"
                            placeholder="e.g., Commercial Print"
                          />
                          <FieldError />
                        </TextField>

                        <TextField
                          isRequired
                          name="baseUnit"
                          value={editingProduct.baseUnit}
                          onChange={(val) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              baseUnit: val,
                            }))
                          }
                        >
                          <Label>Pricing Unit</Label>
                          <Input
                            variant="secondary"
                            placeholder="per pc / per box / per sq.ft"
                          />
                          <FieldError />
                        </TextField>

                        <NumberField
                          minValue={1}
                          step={1}
                          variant="secondary"
                          value={editingProduct.minOrderQty}
                          onChange={(v) =>
                            !Number.isNaN(v) &&
                            setEditingProduct((prev) => ({
                              ...prev,
                              minOrderQty: Math.max(1, v),
                            }))
                          }
                        >
                          <Label>Minimum Order Qty</Label>
                          <NumberField.Group>
                            <NumberField.DecrementButton />
                            <NumberField.Input className="tabular-nums" />
                            <NumberField.IncrementButton />
                          </NumberField.Group>
                        </NumberField>

                        <TextField
                          name="leadTimeDays"
                          value={editingProduct.leadTimeDays}
                          onChange={(val) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              leadTimeDays: val,
                            }))
                          }
                        >
                          <Label>Standard Lead Time</Label>
                          <Input
                            variant="secondary"
                            placeholder="2–3 business days"
                          />
                        </TextField>
                      </div>

                      <div className="grid items-end gap-4 sm:grid-cols-3">
                        <TextField
                          name="badge"
                          value={editingProduct.badge || ""}
                          onChange={(val) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              badge: val || undefined,
                            }))
                          }
                        >
                          <Label>Specification Tag (Optional)</Label>
                          <Input
                            variant="secondary"
                            placeholder="Offset / Same-Day Eligible"
                          />
                        </TextField>

                        <Surface
                          variant="secondary"
                          className="rounded-2xl px-3.5 py-2.5"
                        >
                          <Switch
                            isSelected={editingProduct.isActive}
                            onChange={(val) =>
                              setEditingProduct((prev) => ({
                                ...prev,
                                isActive: val,
                              }))
                            }
                          >
                            <Switch.Content className="text-xs font-medium">
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                              Published in Catalog
                            </Switch.Content>
                          </Switch>
                        </Surface>

                        <Surface
                          variant="secondary"
                          className="rounded-2xl px-3.5 py-2.5"
                        >
                          <Switch
                            isSelected={editingProduct.featured}
                            onChange={(val) =>
                              setEditingProduct((prev) => ({
                                ...prev,
                                featured: val,
                              }))
                            }
                          >
                            <Switch.Content className="text-xs font-medium">
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                              Featured Line
                            </Switch.Content>
                          </Switch>
                        </Surface>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          isRequired
                          name="shortDescription"
                          value={editingProduct.shortDescription}
                          onChange={(val) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              shortDescription: val,
                            }))
                          }
                        >
                          <Label>Catalog Summary</Label>
                          <Input
                            variant="secondary"
                            placeholder="Concise summary shown on directory cards"
                          />
                          <FieldError />
                        </TextField>

                        <TextField
                          name="description"
                          value={editingProduct.description}
                          onChange={(val) =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              description: val,
                            }))
                          }
                        >
                          <Label>Detailed Technical Description</Label>
                          <Input
                            variant="secondary"
                            placeholder="Full specifications shown in configurator modal"
                          />
                        </TextField>
                      </div>
                    </Fieldset.Group>
                  </Fieldset>

                  <Separator />

                  {/* PRICE PER SIZE MATRIX EDITOR */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                          Per-Size Rate Schedule ({settings.currencySymbol})
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          Define base unit rate, optional 100+ and 500+ volume
                          rates, and plate/setup fee per size.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={handleAddSizeTier}
                      >
                        <Plus className="size-3.5" />
                        Add Size
                      </Button>
                    </div>

                    <div className="space-y-3 tabular-nums">
                      {editingProduct.sizes.map((sz) => (
                        <Surface
                          key={sz.id}
                          variant="secondary"
                          className="grid items-end gap-2.5 rounded-2xl p-3.5 sm:grid-cols-12"
                        >
                          <TextField
                            isRequired
                            className="sm:col-span-3"
                            value={sz.sizeLabel}
                            onChange={(val) =>
                              handleSizeChange(sz.id, "sizeLabel", val)
                            }
                          >
                            <Label>Size Label</Label>
                            <Input placeholder="A4 / 2ft × 5ft" />
                          </TextField>

                          <TextField
                            isRequired
                            className="sm:col-span-3"
                            value={sz.dimensions}
                            onChange={(val) =>
                              handleSizeChange(sz.id, "dimensions", val)
                            }
                          >
                            <Label>Dimensions</Label>
                            <Input
                              placeholder="210 × 297 mm"
                              className="font-mono"
                            />
                          </TextField>

                          <NumberField
                            isRequired
                            className="sm:col-span-2"
                            minValue={0}
                            step={0.5}
                            value={sz.unitPrice}
                            onChange={(v) =>
                              !Number.isNaN(v) &&
                              handleSizeChange(sz.id, "unitPrice", v)
                            }
                          >
                            <Label>Base Rate</Label>
                            <NumberField.Group>
                              <NumberField.Input />
                            </NumberField.Group>
                          </NumberField>

                          <NumberField
                            className="sm:col-span-1"
                            minValue={0}
                            step={0.5}
                            value={sz.bulk100Price ?? NaN}
                            onChange={(v) =>
                              handleSizeChange(
                                sz.id,
                                "bulk100Price",
                                Number.isNaN(v) ? undefined : v
                              )
                            }
                          >
                            <Label>100+</Label>
                            <NumberField.Group>
                              <NumberField.Input placeholder="—" />
                            </NumberField.Group>
                          </NumberField>

                          <NumberField
                            className="sm:col-span-1"
                            minValue={0}
                            step={0.5}
                            value={sz.bulk500Price ?? NaN}
                            onChange={(v) =>
                              handleSizeChange(
                                sz.id,
                                "bulk500Price",
                                Number.isNaN(v) ? undefined : v
                              )
                            }
                          >
                            <Label>500+</Label>
                            <NumberField.Group>
                              <NumberField.Input placeholder="—" />
                            </NumberField.Group>
                          </NumberField>

                          <NumberField
                            className="sm:col-span-1"
                            minValue={0}
                            step={10}
                            value={sz.setupFee}
                            onChange={(v) =>
                              !Number.isNaN(v) &&
                              handleSizeChange(sz.id, "setupFee", v)
                            }
                          >
                            <Label>Setup</Label>
                            <NumberField.Group>
                              <NumberField.Input />
                            </NumberField.Group>
                          </NumberField>

                          <div className="flex justify-end sm:col-span-1">
                            <Button
                              size="sm"
                              variant="danger-soft"
                              isIconOnly
                              isDisabled={editingProduct.sizes.length <= 1}
                              aria-label="Remove size tier"
                              onPress={() => handleRemoveSizeTier(sz.id)}
                            >
                              <TrashBin className="size-3.5" />
                            </Button>
                          </div>
                        </Surface>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* SUBSTRATES & FINISHES */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          Substrates & Multipliers (1.0 = Base)
                        </span>
                        <Button
                          size="sm"
                          variant="tertiary"
                          onPress={() =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              materials: [
                                ...prev.materials,
                                { name: "", priceMultiplier: 1.0 },
                              ],
                            }))
                          }
                        >
                          <Plus className="size-3.5" />
                          Add
                        </Button>
                      </div>
                      {editingProduct.materials.map((m, idx) => (
                        <Surface
                          key={idx}
                          variant="secondary"
                          className="flex items-center gap-2 rounded-2xl p-2.5"
                        >
                          <TextField
                            isRequired
                            aria-label="Substrate name"
                            className="flex-1"
                            value={m.name}
                            onChange={(val) =>
                              handleMaterialChange(idx, { name: val })
                            }
                          >
                            <Input placeholder="Stock / Paper GSM" />
                          </TextField>

                          <NumberField
                            aria-label="Price multiplier"
                            className="w-24"
                            minValue={0.1}
                            step={0.05}
                            value={m.priceMultiplier}
                            onChange={(v) =>
                              !Number.isNaN(v) &&
                              handleMaterialChange(idx, { priceMultiplier: v })
                            }
                          >
                            <NumberField.Group>
                              <NumberField.Input className="tabular-nums" />
                            </NumberField.Group>
                          </NumberField>

                          <Button
                            size="sm"
                            variant="danger-soft"
                            isIconOnly
                            isDisabled={editingProduct.materials.length <= 1}
                            aria-label="Remove material"
                            onPress={() => handleRemoveMaterial(idx)}
                          >
                            <TrashBin className="size-3.5" />
                          </Button>
                        </Surface>
                      ))}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          Finishes & Unit Add-Ons ({settings.currencySymbol})
                        </span>
                        <Button
                          size="sm"
                          variant="tertiary"
                          onPress={() =>
                            setEditingProduct((prev) => ({
                              ...prev,
                              finishes: [
                                ...prev.finishes,
                                { name: "", addPerUnit: 0 },
                              ],
                            }))
                          }
                        >
                          <Plus className="size-3.5" />
                          Add
                        </Button>
                      </div>
                      {editingProduct.finishes.map((f, idx) => (
                        <Surface
                          key={idx}
                          variant="secondary"
                          className="flex items-center gap-2 rounded-2xl p-2.5"
                        >
                          <TextField
                            isRequired
                            aria-label="Finish name"
                            className="flex-1"
                            value={f.name}
                            onChange={(val) =>
                              handleFinishChange(idx, { name: val })
                            }
                          >
                            <Input placeholder="Lamination / Finish" />
                          </TextField>

                          <NumberField
                            aria-label="Add per unit"
                            className="w-24"
                            minValue={0}
                            step={0.5}
                            value={f.addPerUnit}
                            onChange={(v) =>
                              !Number.isNaN(v) &&
                              handleFinishChange(idx, { addPerUnit: v })
                            }
                          >
                            <NumberField.Group>
                              <NumberField.Input className="tabular-nums" />
                            </NumberField.Group>
                          </NumberField>

                          <Button
                            size="sm"
                            variant="danger-soft"
                            isIconOnly
                            isDisabled={editingProduct.finishes.length <= 1}
                            aria-label="Remove finish"
                            onPress={() => handleRemoveFinish(idx)}
                          >
                            <TrashBin className="size-3.5" />
                          </Button>
                        </Surface>
                      ))}
                    </div>
                  </div>
                </Form>
              </Card>
            </div>
          </div>
        </Tabs.Panel>

        {/* ================================================================
            TAB 2: EMPLOYEE & ROLE MANAGEMENT
        ================================================================ */}
        <Tabs.Panel id="staff" className="grid gap-6 pt-5 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-5">
            <Card.Header>
              <Card.Title className="text-base">
                Provision Staff Account
              </Card.Title>
              <Card.Description>
                Registers a Supabase Auth account and assigns staff permissions.
              </Card.Description>
            </Card.Header>

            <Card.Content className="space-y-4 pt-4">
              {staffFeedback && (
                <Alert
                  status={
                    staffFeedback.type === "success" ? "success" : "danger"
                  }
                >
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {staffFeedback.message}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <Form
                onSubmit={handleCreateStaff}
                className="flex flex-col gap-3.5"
              >
                <TextField
                  isRequired
                  name="staffName"
                  value={staffName}
                  onChange={setStaffName}
                >
                  <Label>Full Name</Label>
                  <Input variant="secondary" placeholder="Full name" />
                  <FieldError />
                </TextField>

                <TextField
                  isRequired
                  name="staffEmail"
                  type="email"
                  value={staffEmail}
                  onChange={setStaffEmail}
                >
                  <Label>Work Email</Label>
                  <Input
                    variant="secondary"
                    placeholder="staff@clayjar.com.ph"
                  />
                  <FieldError />
                </TextField>

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    name="staffPhone"
                    value={staffPhone}
                    onChange={setStaffPhone}
                  >
                    <Label>Telephone</Label>
                    <Input variant="secondary" placeholder="+63 917..." />
                  </TextField>

                  <Select
                    variant="secondary"
                    value={staffRole}
                    onChange={(key) => key && setStaffRole(key as UserRole)}
                  >
                    <Label>Access Role</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="employee" textValue="Employee">
                          Employee
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="super_admin" textValue="Super Admin">
                          Super Admin
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    name="staffDept"
                    value={staffDept}
                    onChange={setStaffDept}
                  >
                    <Label>Department</Label>
                    <Input variant="secondary" />
                  </TextField>

                  <TextField
                    isRequired
                    minLength={8}
                    name="staffPass"
                    value={staffPass}
                    onChange={setStaffPass}
                  >
                    <Label>Initial Password</Label>
                    <InputGroup variant="secondary">
                      <InputGroup.Input
                        type={showStaffPass ? "text" : "password"}
                        placeholder="Min. 8 chars"
                      />
                      <InputGroup.Suffix className="pe-0">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label={
                            showStaffPass ? "Hide password" : "Show password"
                          }
                          onPress={() => setShowStaffPass((prev) => !prev)}
                        >
                          {showStaffPass ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeSlash className="size-4" />
                          )}
                        </Button>
                      </InputGroup.Suffix>
                    </InputGroup>
                    <FieldError />
                  </TextField>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isPending={creatingStaff}
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? (
                        <Spinner color="current" size="sm" />
                      ) : (
                        <PersonPlus className="size-4" />
                      )}
                      {isPending ? "Provisioning..." : "Provision Account"}
                    </>
                  )}
                </Button>
              </Form>
            </Card.Content>
          </Card>

          <Card className="p-6 lg:col-span-7">
            <Card.Header>
              <Card.Title className="text-base tabular-nums">
                Account Directory ({users.length})
              </Card.Title>
              <Card.Description>
                Manage personnel role assignments and active workspace access.
              </Card.Description>
            </Card.Header>

            <Card.Content className="space-y-3 pt-4">
              {users.map((u) => {
                const initials = u.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <Surface
                    key={u.id}
                    variant="secondary"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <Avatar.Fallback>{initials}</Avatar.Fallback>
                      </Avatar>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
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
                            <Chip.Label>{u.role.replace("_", " ")}</Chip.Label>
                          </Chip>
                          {!u.isActive && (
                            <Chip size="sm" color="danger" variant="soft">
                              <Chip.Label>Disabled</Chip.Label>
                            </Chip>
                          )}
                        </div>
                        <div className="mt-0.5 text-muted">
                          {u.email}
                          {u.department ? ` · ${u.department}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        aria-label={`Role for ${u.fullName}`}
                        className="w-36"
                        isDisabled={u.id === currentUser.id}
                        value={u.role}
                        onChange={(key) => {
                          if (key) {
                            void upsertUser({
                              ...u,
                              role: key as UserRole,
                            });
                          }
                        }}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item id="customer" textValue="Customer">
                              Customer
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="employee" textValue="Employee">
                              Employee
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item
                              id="super_admin"
                              textValue="Super Admin"
                            >
                              Super Admin
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      {u.id !== currentUser.id && (
                        <Button
                          size="sm"
                          variant={u.isActive ? "secondary" : "primary"}
                          onPress={() =>
                            void upsertUser({ ...u, isActive: !u.isActive })
                          }
                        >
                          {u.isActive ? "Disable" : "Enable"}
                        </Button>
                      )}
                    </div>
                  </Surface>
                );
              })}
            </Card.Content>
          </Card>
        </Tabs.Panel>

        {/* ================================================================
            TAB 3: APPLICATION SETTINGS & SECURITY STATUS
        ================================================================ */}
        <Tabs.Panel id="settings" className="space-y-6 pt-5">
          {settingsSavedMsg && (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Configuration Saved</Alert.Title>
                <Alert.Description>{settingsSavedMsg}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          {settingsErrorMsg && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Update Failed</Alert.Title>
                <Alert.Description>{settingsErrorMsg}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="p-6 lg:col-span-8">
              <Form
                onSubmit={handleSaveSettings}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Card.Title className="text-lg">
                      Global Commercial & Studio Settings
                    </Card.Title>
                    <Card.Description>
                      Controls studio identity, tax rate, reference prefixes,
                      settlement instructions, and queue routing.
                    </Card.Description>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    isPending={savingSettings}
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner color="current" size="sm" />
                        ) : (
                          <FloppyDisk className="size-3.5" />
                        )}
                        {isPending ? "Saving..." : "Save Settings"}
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    isRequired
                    value={settingsForm.shopName}
                    onChange={(val) =>
                      setSettingsForm((p) => ({ ...p, shopName: val }))
                    }
                  >
                    <Label>Studio Name</Label>
                    <Input variant="secondary" />
                  </TextField>

                  <TextField
                    value={settingsForm.tagline}
                    onChange={(val) =>
                      setSettingsForm((p) => ({ ...p, tagline: val }))
                    }
                  >
                    <Label>Tagline</Label>
                    <Input variant="secondary" />
                  </TextField>
                </div>

                {/* Currency, Tax, Validity */}
                <div className="grid gap-4 sm:grid-cols-3 tabular-nums">
                  <Select
                    variant="secondary"
                    value={settingsForm.currencyCode}
                    onChange={(key) => {
                      const found = CURRENCY_PRESETS.find(
                        (c) => c.code === String(key)
                      );
                      if (found) {
                        setSettingsForm((p) => ({
                          ...p,
                          currencyCode: found.code,
                          currencySymbol: found.symbol,
                        }));
                      }
                    }}
                  >
                    <Label>Settlement Currency</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {CURRENCY_PRESETS.map((c) => (
                          <ListBox.Item
                            key={c.code}
                            id={c.code}
                            textValue={c.label}
                          >
                            {c.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <NumberField
                    minValue={0}
                    step={0.5}
                    variant="secondary"
                    value={settingsForm.taxRate}
                    onChange={(v) =>
                      !Number.isNaN(v) &&
                      setSettingsForm((p) => ({ ...p, taxRate: v }))
                    }
                  >
                    <Label>VAT / Tax Rate (%)</Label>
                    <NumberField.Group>
                      <NumberField.DecrementButton />
                      <NumberField.Input />
                      <NumberField.IncrementButton />
                    </NumberField.Group>
                  </NumberField>

                  <NumberField
                    minValue={1}
                    step={1}
                    variant="secondary"
                    value={settingsForm.quotationValidityDays}
                    onChange={(v) =>
                      !Number.isNaN(v) &&
                      setSettingsForm((p) => ({
                        ...p,
                        quotationValidityDays: v,
                      }))
                    }
                  >
                    <Label>Quote Validity (Days)</Label>
                    <NumberField.Group>
                      <NumberField.DecrementButton />
                      <NumberField.Input />
                      <NumberField.IncrementButton />
                    </NumberField.Group>
                  </NumberField>
                </div>

                {/* Reference Number Prefixes */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <TextField
                    value={settingsForm.orderPrefix}
                    onChange={(val) =>
                      setSettingsForm((p) => ({
                        ...p,
                        orderPrefix: val.toUpperCase(),
                      }))
                    }
                  >
                    <Label>Order Prefix</Label>
                    <Input variant="secondary" className="font-mono" />
                  </TextField>

                  <TextField
                    value={settingsForm.quotePrefix}
                    onChange={(val) =>
                      setSettingsForm((p) => ({
                        ...p,
                        quotePrefix: val.toUpperCase(),
                      }))
                    }
                  >
                    <Label>Quotation Prefix</Label>
                    <Input variant="secondary" className="font-mono" />
                  </TextField>

                  <TextField
                    value={settingsForm.ticketPrefix}
                    onChange={(val) =>
                      setSettingsForm((p) => ({
                        ...p,
                        ticketPrefix: val.toUpperCase(),
                      }))
                    }
                  >
                    <Label>Ticket Prefix</Label>
                    <Input variant="secondary" className="font-mono" />
                  </TextField>
                </div>

                {/* Contact & Shop Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    value={settingsForm.contactEmail}
                    onChange={(val) =>
                      setSettingsForm((p) => ({ ...p, contactEmail: val }))
                    }
                  >
                    <Label>Contact Email</Label>
                    <Input variant="secondary" />
                  </TextField>

                  <TextField
                    value={settingsForm.contactPhone}
                    onChange={(val) =>
                      setSettingsForm((p) => ({ ...p, contactPhone: val }))
                    }
                  >
                    <Label>Telephone</Label>
                    <Input variant="secondary" className="font-mono" />
                  </TextField>

                  <TextField
                    value={settingsForm.shopAddress}
                    onChange={(val) =>
                      setSettingsForm((p) => ({ ...p, shopAddress: val }))
                    }
                  >
                    <Label>Studio Address</Label>
                    <Input variant="secondary" />
                  </TextField>

                  <TextField
                    value={settingsForm.businessHours}
                    onChange={(val) =>
                      setSettingsForm((p) => ({ ...p, businessHours: val }))
                    }
                  >
                    <Label>Operating Hours</Label>
                    <Input variant="secondary" />
                  </TextField>
                </div>

                <TextField
                  value={settingsForm.paymentInstructions}
                  onChange={(val) =>
                    setSettingsForm((p) => ({
                      ...p,
                      paymentInstructions: val,
                    }))
                  }
                >
                  <Label>Settlement & Production Terms</Label>
                  <TextArea variant="secondary" rows={2} />
                </TextField>

                {/* Chat Queue Routing */}
                <Surface
                  variant="secondary"
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
                >
                  <Switch
                    isSelected={settingsForm.autoAssignTickets}
                    onChange={(val) =>
                      setSettingsForm((p) => ({
                        ...p,
                        autoAssignTickets: val,
                      }))
                    }
                  >
                    <Switch.Content className="text-xs font-medium">
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      Automatically assign incoming tickets to on-duty
                      specialists
                    </Switch.Content>
                  </Switch>

                  <NumberField
                    className="w-40"
                    minValue={1}
                    maxValue={20}
                    step={1}
                    value={settingsForm.maxActiveChatsPerEmployee}
                    onChange={(v) =>
                      !Number.isNaN(v) &&
                      setSettingsForm((p) => ({
                        ...p,
                        maxActiveChatsPerEmployee: v,
                      }))
                    }
                  >
                    <Label>Max Active / Staff</Label>
                    <NumberField.Group>
                      <NumberField.DecrementButton />
                      <NumberField.Input className="tabular-nums" />
                      <NumberField.IncrementButton />
                    </NumberField.Group>
                  </NumberField>
                </Surface>
              </Form>
            </Card>

            {/* Live Database & Security Posture Card */}
            <Card className="h-fit p-6 lg:col-span-4">
              <Card.Header className="flex-row items-center justify-between">
                <Card.Title className="text-base">
                  Database & Security Posture
                </Card.Title>
                <Chip
                  size="sm"
                  color={supabaseConnected ? "success" : "danger"}
                  variant="soft"
                >
                  <CircleFill width={6} />
                  <Chip.Label>
                    {supabaseConnected ? "Connected" : "Offline"}
                  </Chip.Label>
                </Chip>
              </Card.Header>

              <Card.Content className="space-y-4 pt-4">
                <Surface
                  variant="secondary"
                  className="rounded-2xl p-4 space-y-2.5 text-xs tabular-nums"
                >
                  <div className="flex justify-between">
                    <span className="text-muted">Published Products</span>
                    <span className="font-mono font-medium text-foreground">
                      {products.length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted">Size Schedules</span>
                    <span className="font-mono font-medium text-foreground">
                      {products.reduce((acc, p) => acc + p.sizes.length, 0)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted">Quotations</span>
                    <span className="font-mono font-medium text-foreground">
                      {inquiries.length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted">Production Orders</span>
                    <span className="font-mono font-medium text-foreground">
                      {orders.length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted">Support Tickets</span>
                    <span className="font-mono font-medium text-foreground">
                      {tickets.length}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted">Registered Accounts</span>
                    <span className="font-mono font-medium text-foreground">
                      {users.length}
                    </span>
                  </div>
                </Surface>
                <p className="text-xs leading-relaxed text-muted">
                  Protected by PostgreSQL Row Level Security, server-side
                  pricing RPCs, non-enumerable CSPRNG reference codes, and HTTP
                  Content Security Policy headers.
                </p>
              </Card.Content>
            </Card>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
