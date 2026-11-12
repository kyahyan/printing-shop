"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@supabase/supabase-js";
import type {
  AppSettings,
  ChatMessage,
  ChatTicket,
  InquiryQuotation,
  Order,
  OrderItem,
  PaymentStatus,
  Product,
  ProductionStatus,
  QuotationStatus,
  TicketPriority,
  TicketStatus,
  UserProfile,
  UserRole,
} from "@/types/printshop";
import {
  getSupabaseBrowserClient,
  getSupabasePublicKey,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

const DEFAULT_SETTINGS: AppSettings = {
  shopName: "Clayjar Print Studio",
  tagline: "Precision Commercial Printing, Custom Packaging & Large Format",
  currencyCode: "PHP",
  currencySymbol: "₱",
  taxRate: 12,
  quotationValidityDays: 14,
  orderPrefix: "ORD",
  quotePrefix: "QT",
  ticketPrefix: "TKT",
  contactEmail: "hello@clayjar.com.ph",
  contactPhone: "+63 (02) 8555-0194",
  shopAddress: "Metro Manila, Philippines",
  businessHours: "Mon – Sat: 8:30 AM – 6:30 PM",
  paymentInstructions:
    "50% downpayment required to initiate printing. Include your Order Reference Number in the payment note.",
  autoAssignTickets: false,
  maxActiveChatsPerEmployee: 5,
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PriceBreakdown {
  effectiveUnitPrice: number;
  setupFee: number;
  lineTotal: number;
  appliedTier: "Standard" | "100+ Bulk" | "500+ Wholesale";
}

interface CreateInquiryInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName?: string;
  subject: string;
  productId?: string;
  productName: string;
  selectedSize: string;
  material: string;
  finish: string;
  quantity: number;
  customDimensions?: string;
  artworkUrl?: string;
  notes?: string;
  targetDate?: string;
}

interface CreateOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderSource: "online" | "walk_in" | "from_quotation";
  quotationId?: string;
  quotationRef?: string;
  items: OrderItem[];
  discountAmount?: number;
  amountPaid?: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  deliveryMethod: "pickup" | "courier";
  notes?: string;
  estimatedCompletion?: string;
}

interface OpenTicketInput {
  customerName: string;
  customerEmail: string;
  topic: string;
  linkedReference?: string;
  priority?: TicketPriority;
  initialMessage: string;
}

interface PrintShopContextValue {
  loading: boolean;
  supabaseConnected: boolean;
  settings: AppSettings;
  users: UserProfile[];
  currentUser: UserProfile | null;
  products: Product[];
  inquiries: InquiryQuotation[];
  orders: Order[];
  tickets: ChatTicket[];
  refreshData: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  calculateProductPrice: (
    product: Product,
    sizeId: string,
    materialName: string,
    finishName: string,
    quantity: number
  ) => PriceBreakdown;
  // Auth
  login: (
    email: string,
    password: string,
    staffOnly?: boolean
  ) => Promise<{ ok: boolean; error?: string; user?: UserProfile }>;
  registerCustomer: (input: {
    fullName: string;
    email: string;
    phone: string;
    companyName?: string;
    password: string;
  }) => Promise<{
    ok: boolean;
    error?: string;
    user?: UserProfile;
    needsEmailConfirmation?: boolean;
  }>;
  logout: () => Promise<void>;
  // Inquiries & Quotations
  submitInquiry: (input: CreateInquiryInput) => Promise<InquiryQuotation>;
  sendQuotation: (
    inquiryId: string,
    quote: {
      quotedUnitPrice: number;
      quotedSetupFee: number;
      quotedDiscount: number;
      staffRemarks: string;
      validUntil: string;
    }
  ) => Promise<void>;
  updateInquiryStatus: (
    inquiryId: string,
    status: QuotationStatus
  ) => Promise<void>;
  convertQuotationToOrder: (
    inquiryId: string,
    paymentInfo?: {
      paymentStatus?: PaymentStatus;
      amountPaid?: number;
      paymentMethod?: string;
      deliveryMethod?: "pickup" | "courier";
    }
  ) => Promise<Order | null>;
  // Orders
  createOrder: (input: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (
    orderId: string,
    updates: {
      productionStatus?: ProductionStatus;
      paymentStatus?: PaymentStatus;
      amountPaid?: number;
      estimatedCompletion?: string;
      notes?: string;
    }
  ) => Promise<void>;
  // Reference Finder
  findByReference: (ref: string) => {
    order?: Order;
    inquiry?: InquiryQuotation;
    ticket?: ChatTicket;
  };
  // Chat Queue & Ticketing
  openChatTicket: (input: OpenTicketInput) => Promise<ChatTicket>;
  claimTicket: (ticketId: string) => Promise<void>;
  claimNextQueuedTicket: () => Promise<ChatTicket | null>;
  sendChatMessage: (
    ticketId: string,
    message: string,
    senderRole?: "customer" | "employee" | "system",
    senderNameOverride?: string
  ) => Promise<void>;
  updateTicketStatus: (
    ticketId: string,
    updates: {
      status?: TicketStatus;
      priority?: TicketPriority;
      internalNotes?: string;
      assignedEmployeeId?: string;
      assignedEmployeeName?: string;
    }
  ) => Promise<void>;
  getQueuePosition: (ticketId: string) => number;
  // Super Admin & Staff Database Controls
  updateSettings: (next: AppSettings) => Promise<{ ok: boolean; error?: string }>;
  upsertProduct: (
    product: Product
  ) => Promise<{ ok: boolean; error?: string; product?: Product }>;
  deleteProduct: (productId: string) => Promise<{ ok: boolean; error?: string }>;
  provisionStaffAccount: (input: {
    fullName: string;
    email: string;
    phone: string;
    department: string;
    role: UserRole;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  upsertUser: (user: UserProfile) => Promise<void>;
  toggleEmployeeOnline: (userId: string) => Promise<void>;
}

const PrintShopContext = createContext<PrintShopContextValue | null>(null);

function makeRandomDigits(len = 4): string {
  const min = Math.pow(10, len - 1);
  const max = Math.pow(10, len) - 1;
  return String(Math.floor(min + Math.random() * (max - min)));
}

export function PrintShopProvider({ children }: { children: React.ReactNode }) {
  const supabaseConnected = isSupabaseConfigured();
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<InquiryQuotation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<ChatTicket[]>([]);

  const refreshData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const [
      settingsRes,
      productsRes,
      inquiriesRes,
      ordersRes,
      ticketsRes,
      profilesRes,
    ] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("products")
        .select("*, product_sizes(*)")
        .order("created_at", { ascending: true }),
      supabase
        .from("inquiries_quotations")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("chat_tickets")
        .select("*, chat_messages(*)")
        .order("queued_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);

    if (settingsRes.data) {
      const s = settingsRes.data;
      setSettings({
        shopName: s.shop_name,
        tagline: s.tagline,
        currencyCode: s.currency_code,
        currencySymbol: s.currency_symbol,
        taxRate: Number(s.tax_rate),
        quotationValidityDays: s.quotation_validity_days,
        orderPrefix: s.order_prefix,
        quotePrefix: s.quote_prefix,
        ticketPrefix: s.ticket_prefix,
        contactEmail: s.contact_email,
        contactPhone: s.contact_phone,
        shopAddress: s.shop_address,
        businessHours: s.business_hours,
        paymentInstructions: s.payment_instructions,
        autoAssignTickets: s.auto_assign_tickets,
        maxActiveChatsPerEmployee: s.max_active_chats_per_employee,
      });
    }

    if (productsRes.data) {
      setProducts(
        productsRes.data.map((p: Record<string, unknown>) => {
          const rawSizes = Array.isArray(p.product_sizes)
            ? (p.product_sizes as Record<string, unknown>[])
            : [];
          const sortedSizes = [...rawSizes].sort(
            (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
          );
          return {
            id: String(p.id),
            slug: String(p.slug),
            name: String(p.name),
            category: String(p.category),
            shortDescription: String(p.short_description),
            description: String(p.description),
            baseUnit: String(p.base_unit),
            minOrderQty: Number(p.min_order_qty),
            leadTimeDays: String(p.lead_time_days),
            badge: p.badge ? String(p.badge) : undefined,
            featured: Boolean(p.featured),
            isActive: Boolean(p.is_active),
            accentColor: (p.accent_color as Product["accentColor"]) || "indigo",
            materials: (p.materials as Product["materials"]) || [],
            finishes: (p.finishes as Product["finishes"]) || [],
            sizes: sortedSizes.map((sz) => ({
              id: String(sz.id),
              sizeLabel: String(sz.size_label),
              dimensions: String(sz.dimensions),
              unitPrice: Number(sz.unit_price),
              bulk100Price:
                sz.bulk_100_price != null
                  ? Number(sz.bulk_100_price)
                  : undefined,
              bulk500Price:
                sz.bulk_500_price != null
                  ? Number(sz.bulk_500_price)
                  : undefined,
              setupFee: Number(sz.setup_fee || 0),
            })),
          };
        })
      );
    }

    if (inquiriesRes.data) {
      setInquiries(
        inquiriesRes.data.map((q: Record<string, unknown>) => ({
          id: String(q.id),
          referenceNumber: String(q.reference_number),
          customerId: q.customer_id ? String(q.customer_id) : undefined,
          customerName: String(q.customer_name),
          customerEmail: String(q.customer_email),
          customerPhone: String(q.customer_phone),
          companyName: q.company_name ? String(q.company_name) : undefined,
          subject: String(q.subject),
          productId: q.product_id ? String(q.product_id) : undefined,
          productName: String(q.product_name),
          selectedSize: String(q.selected_size),
          material: String(q.material || ""),
          finish: String(q.finish || ""),
          quantity: Number(q.quantity),
          customDimensions: q.custom_dimensions
            ? String(q.custom_dimensions)
            : undefined,
          artworkUrl: q.artwork_url ? String(q.artwork_url) : undefined,
          notes: q.notes ? String(q.notes) : undefined,
          targetDate: q.target_date ? String(q.target_date) : undefined,
          status: q.status as QuotationStatus,
          quotedUnitPrice:
            q.quoted_unit_price != null
              ? Number(q.quoted_unit_price)
              : undefined,
          quotedSetupFee:
            q.quoted_setup_fee != null ? Number(q.quoted_setup_fee) : undefined,
          quotedDiscount:
            q.quoted_discount != null ? Number(q.quoted_discount) : undefined,
          quotedTotal:
            q.quoted_total != null ? Number(q.quoted_total) : undefined,
          staffRemarks: q.staff_remarks ? String(q.staff_remarks) : undefined,
          validUntil: q.valid_until ? String(q.valid_until) : undefined,
          handledBy: q.handled_by ? String(q.handled_by) : undefined,
          handledByName: q.handled_by_name
            ? String(q.handled_by_name)
            : undefined,
          convertedOrderRef: q.converted_order_ref
            ? String(q.converted_order_ref)
            : undefined,
          createdAt: String(q.created_at),
          updatedAt: String(q.updated_at),
        }))
      );
    }

    if (ordersRes.data) {
      setOrders(
        ordersRes.data.map((o: Record<string, unknown>) => ({
          id: String(o.id),
          referenceNumber: String(o.reference_number),
          quotationId: o.quotation_id ? String(o.quotation_id) : undefined,
          customerId: o.customer_id ? String(o.customer_id) : undefined,
          customerName: String(o.customer_name),
          customerEmail: String(o.customer_email),
          customerPhone: String(o.customer_phone),
          orderSource: o.order_source as Order["orderSource"],
          items: (o.items as OrderItem[]) || [],
          subtotal: Number(o.subtotal),
          taxAmount: Number(o.tax_amount),
          discountAmount: Number(o.discount_amount),
          totalAmount: Number(o.total_amount),
          amountPaid: Number(o.amount_paid),
          paymentStatus: o.payment_status as PaymentStatus,
          paymentMethod: String(o.payment_method),
          productionStatus: o.production_status as ProductionStatus,
          deliveryMethod: o.delivery_method as Order["deliveryMethod"],
          notes: o.notes ? String(o.notes) : undefined,
          takenByEmployeeId: o.taken_by_employee_id
            ? String(o.taken_by_employee_id)
            : undefined,
          takenByName: o.taken_by_name ? String(o.taken_by_name) : undefined,
          estimatedCompletion: o.estimated_completion
            ? String(o.estimated_completion)
            : undefined,
          createdAt: String(o.created_at),
          updatedAt: String(o.updated_at),
        }))
      );
    }

    if (ticketsRes.data) {
      setTickets(
        ticketsRes.data.map((t: Record<string, unknown>) => {
          const rawMsgs = Array.isArray(t.chat_messages)
            ? (t.chat_messages as Record<string, unknown>[])
            : [];
          const sortedMsgs = [...rawMsgs].sort(
            (a, b) =>
              new Date(String(a.created_at)).getTime() -
              new Date(String(b.created_at)).getTime()
          );
          return {
            id: String(t.id),
            ticketNumber: String(t.ticket_number),
            customerId: t.customer_id ? String(t.customer_id) : undefined,
            customerName: String(t.customer_name),
            customerEmail: String(t.customer_email),
            topic: String(t.topic),
            linkedReference: t.linked_reference
              ? String(t.linked_reference)
              : undefined,
            priority: t.priority as TicketPriority,
            status: t.status as TicketStatus,
            assignedEmployeeId: t.assigned_employee_id
              ? String(t.assigned_employee_id)
              : undefined,
            assignedEmployeeName: t.assigned_employee_name
              ? String(t.assigned_employee_name)
              : undefined,
            internalNotes: t.internal_notes
              ? String(t.internal_notes)
              : undefined,
            queuedAt: String(t.queued_at),
            claimedAt: t.claimed_at ? String(t.claimed_at) : undefined,
            resolvedAt: t.resolved_at ? String(t.resolved_at) : undefined,
            messages: sortedMsgs.map((m) => ({
              id: String(m.id),
              ticketId: String(m.ticket_id),
              senderRole: m.sender_role as ChatMessage["senderRole"],
              senderName: String(m.sender_name),
              message: String(m.message),
              createdAt: String(m.created_at),
            })),
          };
        })
      );
    }

    if (profilesRes.data) {
      setUsers(
        profilesRes.data.map((u: Record<string, unknown>) => ({
          id: String(u.id),
          fullName: String(u.full_name),
          email: String(u.email),
          phone: u.phone ? String(u.phone) : "",
          companyName: u.company_name ? String(u.company_name) : undefined,
          role: (u.role as UserProfile["role"]) || "customer",
          department: u.department ? String(u.department) : undefined,
          isActive: Boolean(u.is_active ?? true),
          isOnline: Boolean(u.is_online ?? false),
          createdAt: String(u.created_at),
        }))
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    async function syncAuthUser() {
      if (!supabase || !active) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        setCurrentUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      const mapped: UserProfile = {
        id: user.id,
        fullName:
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.email ||
          "User",
        email: profile?.email || user.email || "",
        phone: profile?.phone || user.user_metadata?.phone || "",
        companyName:
          profile?.company_name ||
          user.user_metadata?.company_name ||
          undefined,
        role: profile?.role || "customer",
        department: profile?.department || undefined,
        isActive: profile?.is_active ?? true,
        isOnline: profile?.is_online ?? true,
        createdAt: profile?.created_at || new Date().toISOString(),
      };

      setCurrentUser(mapped);
    }

    syncAuthUser().then(() => {
      if (active) refreshData();
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        refreshData();
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        syncAuthUser().then(() => {
          if (active) refreshData();
        });
      }
    });

    const channel = supabase
      .channel("clayjar-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_tickets" },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inquiries_quotations" },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => refreshData()
      )
      .subscribe();

    return () => {
      active = false;
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  const formatCurrency = useCallback(
    (amount: number) => {
      const sym = settings.currencySymbol || "₱";
      return `${sym}${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [settings.currencySymbol]
  );

  const calculateProductPrice = useCallback(
    (
      product: Product,
      sizeId: string,
      materialName: string,
      finishName: string,
      quantity: number
    ): PriceBreakdown => {
      const size =
        product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
      if (!size) {
        return {
          effectiveUnitPrice: 0,
          setupFee: 0,
          lineTotal: 0,
          appliedTier: "Standard",
        };
      }

      let base = size.unitPrice;
      let appliedTier: PriceBreakdown["appliedTier"] = "Standard";
      if (quantity >= 500 && size.bulk500Price != null) {
        base = size.bulk500Price;
        appliedTier = "500+ Wholesale";
      } else if (quantity >= 100 && size.bulk100Price != null) {
        base = size.bulk100Price;
        appliedTier = "100+ Bulk";
      }

      const mat = product.materials.find((m) => m.name === materialName);
      const fin = product.finishes.find((f) => f.name === finishName);
      const multiplier = mat?.priceMultiplier ?? 1;
      const finishAdd = fin?.addPerUnit ?? 0;

      const effectiveUnitPrice = Number(
        (base * multiplier + finishAdd).toFixed(2)
      );
      const setupFee = size.setupFee || 0;
      const lineTotal = Number(
        (effectiveUnitPrice * Math.max(1, quantity) + setupFee).toFixed(2)
      );

      return { effectiveUnitPrice, setupFee, lineTotal, appliedTier };
    },
    []
  );

  // AUTHENTICATION
  const login = useCallback(
    async (email: string, password: string, staffOnly = false) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return { ok: false, error: "Supabase client is not configured." };
      }

      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        return {
          ok: false,
          error: error?.message || "Invalid email or password.",
        };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      const mapped: UserProfile = {
        id: data.user.id,
        fullName:
          profile?.full_name ||
          data.user.user_metadata?.full_name ||
          cleanEmail,
        email: cleanEmail,
        phone: profile?.phone || "",
        companyName: profile?.company_name || undefined,
        role: profile?.role || "customer",
        department: profile?.department || undefined,
        isActive: profile?.is_active ?? true,
        isOnline: profile?.is_online ?? true,
        createdAt: profile?.created_at || new Date().toISOString(),
      };

      if (!mapped.isActive) {
        await supabase.auth.signOut();
        return {
          ok: false,
          error: "This account has been deactivated by an administrator.",
        };
      }

      if (staffOnly && mapped.role === "customer") {
        await supabase.auth.signOut();
        return {
          ok: false,
          error: "This portal is restricted to authorized Print Shop Staff.",
        };
      }

      setCurrentUser(mapped);
      await refreshData();
      return { ok: true, user: mapped };
    },
    [refreshData]
  );

  const registerCustomer = useCallback(
    async (input: {
      fullName: string;
      email: string;
      phone: string;
      companyName?: string;
      password: string;
    }) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return { ok: false, error: "Supabase client is not configured." };
      }

      const cleanEmail = input.email.trim().toLowerCase();
      const redirectBase =
        typeof window !== "undefined" ? window.location.origin : "";

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: input.password,
        options: {
          emailRedirectTo: redirectBase
            ? `${redirectBase}/auth/callback?next=/account`
            : undefined,
          data: {
            full_name: input.fullName.trim(),
            phone: input.phone.trim(),
            company_name: input.companyName?.trim() || null,
          },
        },
      });

      if (error || !data.user) {
        return {
          ok: false,
          error: error?.message || "Could not create account.",
        };
      }

      const newUser: UserProfile = {
        id: data.user.id,
        fullName: input.fullName.trim(),
        email: cleanEmail,
        phone: input.phone.trim(),
        companyName: input.companyName?.trim() || undefined,
        role: "customer",
        isActive: true,
        isOnline: false,
        createdAt: new Date().toISOString(),
      };

      if (!data.session) {
        return { ok: true, user: newUser, needsEmailConfirmation: true };
      }

      setCurrentUser(newUser);
      await refreshData();
      return { ok: true, user: newUser };
    },
    [refreshData]
  );

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
  }, []);

  // INQUIRIES & QUOTATIONS
  const submitInquiry = useCallback(
    async (input: CreateInquiryInput): Promise<InquiryQuotation> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Database not connected");

      const year = new Date().getFullYear();
      const ref = `${settings.quotePrefix || "QT"}-${year}-${makeRandomDigits(4)}`;

      const validProductId =
        input.productId && UUID_REGEX.test(input.productId)
          ? input.productId
          : null;

      const { data, error } = await supabase
        .from("inquiries_quotations")
        .insert({
          reference_number: ref,
          customer_id: currentUser ? currentUser.id : null,
          customer_name: input.customerName,
          customer_email: input.customerEmail,
          customer_phone: input.customerPhone,
          company_name: input.companyName ?? null,
          subject: input.subject,
          product_id: validProductId,
          product_name: input.productName,
          selected_size: input.selectedSize,
          material: input.material,
          finish: input.finish,
          quantity: input.quantity,
          custom_dimensions: input.customDimensions ?? null,
          artwork_url: input.artworkUrl ?? null,
          notes: input.notes ?? null,
          target_date: input.targetDate || null,
          status: "pending_review",
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to save inquiry.");
      }

      await refreshData();
      return {
        id: String(data.id),
        referenceNumber: String(data.reference_number),
        customerId: data.customer_id ? String(data.customer_id) : undefined,
        customerName: String(data.customer_name),
        customerEmail: String(data.customer_email),
        customerPhone: String(data.customer_phone),
        companyName: data.company_name ? String(data.company_name) : undefined,
        subject: String(data.subject),
        productId: data.product_id ? String(data.product_id) : undefined,
        productName: String(data.product_name),
        selectedSize: String(data.selected_size),
        material: String(data.material || ""),
        finish: String(data.finish || ""),
        quantity: Number(data.quantity),
        customDimensions: data.custom_dimensions
          ? String(data.custom_dimensions)
          : undefined,
        artworkUrl: data.artwork_url ? String(data.artwork_url) : undefined,
        notes: data.notes ? String(data.notes) : undefined,
        targetDate: data.target_date ? String(data.target_date) : undefined,
        status: data.status as QuotationStatus,
        createdAt: String(data.created_at),
        updatedAt: String(data.updated_at),
      };
    },
    [currentUser, refreshData, settings.quotePrefix]
  );

  const sendQuotation = useCallback(
    async (
      inquiryId: string,
      quote: {
        quotedUnitPrice: number;
        quotedSetupFee: number;
        quotedDiscount: number;
        staffRemarks: string;
        validUntil: string;
      }
    ) => {
      const supabase = getSupabaseBrowserClient();
      const target = inquiries.find((i) => i.id === inquiryId);
      if (!supabase || !target) return;

      const gross =
        quote.quotedUnitPrice * target.quantity + quote.quotedSetupFee;
      const quotedTotal = Math.max(
        0,
        Number((gross - quote.quotedDiscount).toFixed(2))
      );

      await supabase
        .from("inquiries_quotations")
        .update({
          status: "quoted",
          quoted_unit_price: quote.quotedUnitPrice,
          quoted_setup_fee: quote.quotedSetupFee,
          quoted_discount: quote.quotedDiscount,
          quoted_total: quotedTotal,
          staff_remarks: quote.staffRemarks,
          valid_until: quote.validUntil || null,
          handled_by: currentUser?.id ?? null,
          handled_by_name: currentUser?.fullName || "Print Estimator",
          updated_at: new Date().toISOString(),
        })
        .eq("id", inquiryId);

      await refreshData();
    },
    [currentUser, inquiries, refreshData]
  );

  const updateInquiryStatus = useCallback(
    async (inquiryId: string, status: QuotationStatus) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      await supabase
        .from("inquiries_quotations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", inquiryId);
      await refreshData();
    },
    [refreshData]
  );

  // ORDERS
  const createOrder = useCallback(
    async (input: CreateOrderInput): Promise<Order> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Database not connected");

      const year = new Date().getFullYear();
      const ref = `${settings.orderPrefix || "ORD"}-${year}-${makeRandomDigits(4)}`;

      const subtotal = Number(
        input.items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
      );
      const discountAmount = Number((input.discountAmount ?? 0).toFixed(2));
      const taxable = Math.max(0, subtotal - discountAmount);
      const taxAmount = Number(
        ((taxable * (settings.taxRate || 0)) / 100).toFixed(2)
      );
      const totalAmount = Number((taxable + taxAmount).toFixed(2));
      const amountPaid = Number((input.amountPaid ?? 0).toFixed(2));

      const validQuoteId =
        input.quotationId && UUID_REGEX.test(input.quotationId)
          ? input.quotationId
          : null;

      const { data, error } = await supabase
        .from("orders")
        .insert({
          reference_number: ref,
          quotation_id: validQuoteId,
          customer_id:
            currentUser?.role === "customer" ? currentUser.id : null,
          customer_name: input.customerName,
          customer_email: input.customerEmail,
          customer_phone: input.customerPhone,
          order_source: input.orderSource,
          items: input.items,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          payment_status: input.paymentStatus,
          payment_method: input.paymentMethod,
          production_status: "received",
          delivery_method: input.deliveryMethod,
          notes: input.notes ?? null,
          taken_by_employee_id:
            currentUser && currentUser.role !== "customer"
              ? currentUser.id
              : null,
          taken_by_name:
            currentUser && currentUser.role !== "customer"
              ? currentUser.fullName
              : null,
          estimated_completion: input.estimatedCompletion || null,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to create order.");
      }

      await refreshData();
      return {
        id: String(data.id),
        referenceNumber: String(data.reference_number),
        quotationId: data.quotation_id ? String(data.quotation_id) : undefined,
        customerId: data.customer_id ? String(data.customer_id) : undefined,
        customerName: String(data.customer_name),
        customerEmail: String(data.customer_email),
        customerPhone: String(data.customer_phone),
        orderSource: data.order_source as Order["orderSource"],
        items: (data.items as OrderItem[]) || [],
        subtotal: Number(data.subtotal),
        taxAmount: Number(data.tax_amount),
        discountAmount: Number(data.discount_amount),
        totalAmount: Number(data.total_amount),
        amountPaid: Number(data.amount_paid),
        paymentStatus: data.payment_status as PaymentStatus,
        paymentMethod: String(data.payment_method),
        productionStatus: data.production_status as ProductionStatus,
        deliveryMethod: data.delivery_method as Order["deliveryMethod"],
        notes: data.notes ? String(data.notes) : undefined,
        takenByEmployeeId: data.taken_by_employee_id
          ? String(data.taken_by_employee_id)
          : undefined,
        takenByName: data.taken_by_name
          ? String(data.taken_by_name)
          : undefined,
        estimatedCompletion: data.estimated_completion
          ? String(data.estimated_completion)
          : undefined,
        createdAt: String(data.created_at),
        updatedAt: String(data.updated_at),
      };
    },
    [currentUser, refreshData, settings.orderPrefix, settings.taxRate]
  );

  const convertQuotationToOrder = useCallback(
    async (
      inquiryId: string,
      paymentInfo?: {
        paymentStatus?: PaymentStatus;
        amountPaid?: number;
        paymentMethod?: string;
        deliveryMethod?: "pickup" | "courier";
      }
    ): Promise<Order | null> => {
      const supabase = getSupabaseBrowserClient();
      const inq = inquiries.find((i) => i.id === inquiryId);
      if (!supabase || !inq) return null;

      const unitPrice = inq.quotedUnitPrice ?? 0;
      const setupFee = inq.quotedSetupFee ?? 0;
      const lineTotal = Number(
        (unitPrice * inq.quantity + setupFee).toFixed(2)
      );

      const order = await createOrder({
        customerName: inq.customerName,
        customerEmail: inq.customerEmail,
        customerPhone: inq.customerPhone,
        orderSource: "from_quotation",
        quotationId: inq.id,
        quotationRef: inq.referenceNumber,
        items: [
          {
            id: `item-${Date.now()}`,
            productId: inq.productId,
            productName: inq.productName,
            sizeLabel: inq.customDimensions
              ? `${inq.selectedSize} (${inq.customDimensions})`
              : inq.selectedSize,
            material: inq.material,
            finish: inq.finish,
            quantity: inq.quantity,
            unitPrice,
            setupFee,
            lineTotal,
          },
        ],
        discountAmount: inq.quotedDiscount ?? 0,
        paymentStatus: paymentInfo?.paymentStatus ?? "unpaid",
        amountPaid: paymentInfo?.amountPaid ?? 0,
        paymentMethod: paymentInfo?.paymentMethod ?? "bank_transfer",
        deliveryMethod: paymentInfo?.deliveryMethod ?? "pickup",
        notes: `Converted from Quotation ${inq.referenceNumber}. ${inq.notes ?? ""}`.trim(),
        estimatedCompletion: inq.targetDate,
      });

      await supabase
        .from("inquiries_quotations")
        .update({
          status: "converted_to_order",
          converted_order_ref: order.referenceNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inquiryId);

      await refreshData();
      return order;
    },
    [createOrder, inquiries, refreshData]
  );

  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      updates: {
        productionStatus?: ProductionStatus;
        paymentStatus?: PaymentStatus;
        amountPaid?: number;
        estimatedCompletion?: string;
        notes?: string;
      }
    ) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const dbPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.productionStatus)
        dbPatch.production_status = updates.productionStatus;
      if (updates.paymentStatus) dbPatch.payment_status = updates.paymentStatus;
      if (updates.amountPaid !== undefined)
        dbPatch.amount_paid = updates.amountPaid;
      if (updates.estimatedCompletion !== undefined)
        dbPatch.estimated_completion = updates.estimatedCompletion || null;
      if (updates.notes !== undefined) dbPatch.notes = updates.notes;

      await supabase.from("orders").update(dbPatch).eq("id", orderId);
      await refreshData();
    },
    [refreshData]
  );

  // REFERENCE FINDER
  const findByReference = useCallback(
    (ref: string) => {
      const clean = ref.trim().toUpperCase();
      if (!clean) return {};
      return {
        order: orders.find((o) => o.referenceNumber.toUpperCase() === clean),
        inquiry: inquiries.find(
          (i) => i.referenceNumber.toUpperCase() === clean
        ),
        ticket: tickets.find((t) => t.ticketNumber.toUpperCase() === clean),
      };
    },
    [inquiries, orders, tickets]
  );

  // LIVE CHAT & TICKETING QUEUE
  const openChatTicket = useCallback(
    async (input: OpenTicketInput): Promise<ChatTicket> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Database not connected");

      const ticketNumber = `${settings.ticketPrefix || "TKT"}-${makeRandomDigits(4)}`;
      const now = new Date().toISOString();

      let status: TicketStatus = "queued";
      let assignedEmployeeId: string | undefined;
      let assignedEmployeeName: string | undefined;
      let claimedAt: string | undefined;

      if (settings.autoAssignTickets) {
        const onlineStaff = users.filter(
          (u) =>
            (u.role === "employee" || u.role === "super_admin") &&
            u.isActive &&
            u.isOnline
        );
        for (const emp of onlineStaff) {
          const activeCount = tickets.filter(
            (t) => t.status === "active" && t.assignedEmployeeId === emp.id
          ).length;
          if (activeCount < settings.maxActiveChatsPerEmployee) {
            status = "active";
            assignedEmployeeId = emp.id;
            assignedEmployeeName = emp.fullName;
            claimedAt = now;
            break;
          }
        }
      }

      const { data: ticketRow, error } = await supabase
        .from("chat_tickets")
        .insert({
          ticket_number: ticketNumber,
          customer_id: currentUser ? currentUser.id : null,
          customer_name: input.customerName,
          customer_email: input.customerEmail,
          topic: input.topic,
          linked_reference: input.linkedReference?.trim() || null,
          priority: input.priority ?? "normal",
          status,
          assigned_employee_id: assignedEmployeeId ?? null,
          assigned_employee_name: assignedEmployeeName ?? null,
          claimed_at: claimedAt ?? null,
        })
        .select()
        .single();

      if (error || !ticketRow) {
        throw new Error(error?.message || "Failed to open chat ticket.");
      }

      const sysMessageText =
        status === "active"
          ? `Ticket ${ticketNumber} created and assigned to ${assignedEmployeeName}.`
          : `Ticket ${ticketNumber} joined the Live Support Queue.${
              input.linkedReference
                ? ` Linked Reference: ${input.linkedReference}.`
                : ""
            }`;

      await supabase.from("chat_messages").insert([
        {
          ticket_id: ticketRow.id,
          sender_role: "system",
          sender_name: "Queue Bot",
          message: sysMessageText,
        },
        {
          ticket_id: ticketRow.id,
          sender_role: "customer",
          sender_name: input.customerName,
          message: input.initialMessage,
        },
      ]);

      await refreshData();
      return {
        id: String(ticketRow.id),
        ticketNumber,
        customerId: ticketRow.customer_id
          ? String(ticketRow.customer_id)
          : undefined,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        topic: input.topic,
        linkedReference: input.linkedReference?.trim() || undefined,
        priority: input.priority ?? "normal",
        status,
        assignedEmployeeId,
        assignedEmployeeName,
        queuedAt: String(ticketRow.queued_at),
        claimedAt,
        messages: [],
      };
    },
    [
      currentUser,
      refreshData,
      settings.autoAssignTickets,
      settings.maxActiveChatsPerEmployee,
      settings.ticketPrefix,
      tickets,
      users,
    ]
  );

  const sortedQueuedTickets = useMemo(() => {
    const rank: Record<TicketPriority, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
    };
    return tickets
      .filter((t) => t.status === "queued")
      .sort((a, b) => {
        if (rank[a.priority] !== rank[b.priority]) {
          return rank[a.priority] - rank[b.priority];
        }
        return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
      });
  }, [tickets]);

  const getQueuePosition = useCallback(
    (ticketId: string) => {
      const idx = sortedQueuedTickets.findIndex((t) => t.id === ticketId);
      return idx === -1 ? 0 : idx + 1;
    },
    [sortedQueuedTickets]
  );

  const claimTicket = useCallback(
    async (ticketId: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const staffName = currentUser?.fullName || "Print Specialist";
      const now = new Date().toISOString();

      await supabase
        .from("chat_tickets")
        .update({
          status: "active",
          assigned_employee_id: currentUser?.id ?? null,
          assigned_employee_name: staffName,
          claimed_at: now,
        })
        .eq("id", ticketId);

      await supabase.from("chat_messages").insert({
        ticket_id: ticketId,
        sender_role: "system",
        sender_name: "Queue Bot",
        message: `${staffName} accepted your ticket and joined the chat.`,
      });

      await refreshData();
    },
    [currentUser, refreshData]
  );

  const claimNextQueuedTicket =
    useCallback(async (): Promise<ChatTicket | null> => {
      const next = sortedQueuedTickets[0];
      if (!next) return null;
      await claimTicket(next.id);
      return next;
    }, [claimTicket, sortedQueuedTickets]);

  const sendChatMessage = useCallback(
    async (
      ticketId: string,
      message: string,
      senderRole?: "customer" | "employee" | "system",
      senderNameOverride?: string
    ) => {
      const supabase = getSupabaseBrowserClient();
      const clean = message.trim();
      if (!supabase || !clean) return;

      const role: ChatMessage["senderRole"] =
        senderRole ??
        (currentUser && currentUser.role !== "customer"
          ? "employee"
          : "customer");
      const targetTicket = tickets.find((t) => t.id === ticketId);
      const senderName =
        senderNameOverride ||
        (role === "employee"
          ? currentUser?.fullName || "Print Specialist"
          : currentUser?.fullName || targetTicket?.customerName || "Customer");

      await supabase.from("chat_messages").insert({
        ticket_id: ticketId,
        sender_role: role,
        sender_name: senderName,
        message: clean,
      });

      await refreshData();
    },
    [currentUser, refreshData, tickets]
  );

  const updateTicketStatus = useCallback(
    async (
      ticketId: string,
      updates: {
        status?: TicketStatus;
        priority?: TicketPriority;
        internalNotes?: string;
        assignedEmployeeId?: string;
        assignedEmployeeName?: string;
      }
    ) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const now = new Date().toISOString();
      const dbPatch: Record<string, unknown> = {};
      if (updates.status) dbPatch.status = updates.status;
      if (updates.priority) dbPatch.priority = updates.priority;
      if (updates.internalNotes !== undefined)
        dbPatch.internal_notes = updates.internalNotes;
      if (updates.assignedEmployeeName !== undefined)
        dbPatch.assigned_employee_name = updates.assignedEmployeeName;
      if (updates.status === "resolved" || updates.status === "closed") {
        dbPatch.resolved_at = now;
      }

      await supabase.from("chat_tickets").update(dbPatch).eq("id", ticketId);

      if (updates.status === "resolved") {
        await supabase.from("chat_messages").insert({
          ticket_id: ticketId,
          sender_role: "system",
          sender_name: "Queue Bot",
          message: `Ticket marked as Resolved by ${currentUser?.fullName || "Staff"}.`,
        });
      }

      await refreshData();
    },
    [currentUser, refreshData]
  );

  // SUPER ADMIN DATABASE CONTROLS
  const updateSettings = useCallback(
    async (next: AppSettings) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { ok: false, error: "Database not connected." };

      const { error } = await supabase
        .from("app_settings")
        .update({
          shop_name: next.shopName,
          tagline: next.tagline,
          currency_code: next.currencyCode,
          currency_symbol: next.currencySymbol,
          tax_rate: next.taxRate,
          quotation_validity_days: next.quotationValidityDays,
          order_prefix: next.orderPrefix,
          quote_prefix: next.quotePrefix,
          ticket_prefix: next.ticketPrefix,
          contact_email: next.contactEmail,
          contact_phone: next.contactPhone,
          shop_address: next.shopAddress,
          business_hours: next.businessHours,
          payment_instructions: next.paymentInstructions,
          auto_assign_tickets: next.autoAssignTickets,
          max_active_chats_per_employee: next.maxActiveChatsPerEmployee,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) return { ok: false, error: error.message };
      setSettings(next);
      await refreshData();
      return { ok: true };
    },
    [refreshData]
  );

  const upsertProduct = useCallback(
    async (product: Product) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { ok: false, error: "Database not connected." };

      const isExistingUuid = UUID_REGEX.test(product.id);
      let safeSlug =
        product.slug.trim() ||
        product.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") ||
        `product-${makeRandomDigits(4)}`;

      const slugCollision = products.some(
        (p) =>
          p.id !== product.id &&
          p.slug.toLowerCase() === safeSlug.toLowerCase()
      );
      if (slugCollision) {
        safeSlug = `${safeSlug}-${makeRandomDigits(4)}`;
      }

      const payload = {
        slug: safeSlug,
        name: product.name,
        category: product.category,
        short_description: product.shortDescription,
        description: product.description,
        base_unit: product.baseUnit,
        min_order_qty: product.minOrderQty,
        lead_time_days: product.leadTimeDays,
        badge: product.badge ?? null,
        featured: product.featured,
        is_active: product.isActive,
        accent_color: product.accentColor,
        materials: product.materials,
        finishes: product.finishes,
        updated_at: new Date().toISOString(),
      };

      const { data: savedRow, error: prodError } = isExistingUuid
        ? await supabase
            .from("products")
            .update(payload)
            .eq("id", product.id)
            .select()
            .single()
        : await supabase.from("products").insert(payload).select().single();

      if (prodError || !savedRow) {
        return {
          ok: false,
          error: prodError?.message || "Failed to save product.",
        };
      }

      const prodId = String(savedRow.id);
      await supabase.from("product_sizes").delete().eq("product_id", prodId);

      let savedSizes = product.sizes;
      if (product.sizes.length > 0) {
        const { data: insertedSizes, error: sizesError } = await supabase
          .from("product_sizes")
          .insert(
            product.sizes.map((sz, idx) => ({
              product_id: prodId,
              size_label: sz.sizeLabel,
              dimensions: sz.dimensions,
              unit_price: sz.unitPrice,
              bulk_100_price: sz.bulk100Price ?? null,
              bulk_500_price: sz.bulk500Price ?? null,
              setup_fee: sz.setupFee || 0,
              sort_order: idx + 1,
            }))
          )
          .select();
        if (sizesError) {
          return { ok: false, error: sizesError.message };
        }
        if (insertedSizes) {
          savedSizes = insertedSizes.map((sz: Record<string, unknown>) => ({
            id: String(sz.id),
            sizeLabel: String(sz.size_label),
            dimensions: String(sz.dimensions),
            unitPrice: Number(sz.unit_price),
            bulk100Price:
              sz.bulk_100_price != null ? Number(sz.bulk_100_price) : undefined,
            bulk500Price:
              sz.bulk_500_price != null ? Number(sz.bulk_500_price) : undefined,
            setupFee: Number(sz.setup_fee || 0),
          }));
        }
      }

      await refreshData();
      const updated: Product = {
        ...product,
        id: prodId,
        slug: safeSlug,
        sizes: savedSizes,
      };
      return { ok: true, product: updated };
    },
    [products, refreshData]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { ok: false, error: "Database not connected." };

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      if (error) return { ok: false, error: error.message };

      await refreshData();
      return { ok: true };
    },
    [refreshData]
  );

  const provisionStaffAccount = useCallback(
    async (input: {
      fullName: string;
      email: string;
      phone: string;
      department: string;
      role: UserRole;
      password: string;
    }) => {
      const supabase = getSupabaseBrowserClient();
      const pubKey = getSupabasePublicKey();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabase || !pubKey || !url) {
        return { ok: false, error: "Database not connected." };
      }

      // Ephemeral client so signing up a new staff member doesn't replace Super Admin's session
      const tempClient = createClient(url, pubKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data, error: signUpErr } = await tempClient.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            phone: input.phone.trim(),
          },
        },
      });

      if (signUpErr || !data.user) {
        return {
          ok: false,
          error: signUpErr?.message || "Failed to create auth user.",
        };
      }

      const { error: rpcErr } = await supabase.rpc("admin_assign_staff_role", {
        target_user_id: data.user.id,
        target_full_name: input.fullName.trim(),
        target_phone: input.phone.trim(),
        target_department: input.department.trim(),
        target_role: input.role,
      });

      if (rpcErr) {
        return { ok: false, error: rpcErr.message };
      }

      await refreshData();
      return { ok: true };
    },
    [refreshData]
  );

  const upsertUser = useCallback(
    async (user: UserProfile) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      await supabase
        .from("profiles")
        .update({
          full_name: user.fullName,
          phone: user.phone,
          company_name: user.companyName ?? null,
          role: user.role,
          department: user.department ?? null,
          is_active: user.isActive,
          is_online: user.isOnline,
        })
        .eq("id", user.id);

      await refreshData();
    },
    [refreshData]
  );

  const toggleEmployeeOnline = useCallback(
    async (userId: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const target = users.find((u) => u.id === userId);
      const nextOnline = !(target?.isOnline ?? false);

      await supabase
        .from("profiles")
        .update({ is_online: nextOnline })
        .eq("id", userId);

      if (currentUser?.id === userId) {
        setCurrentUser((prev) =>
          prev ? { ...prev, isOnline: nextOnline } : null
        );
      }
      await refreshData();
    },
    [currentUser?.id, refreshData, users]
  );

  const value = useMemo<PrintShopContextValue>(
    () => ({
      loading,
      supabaseConnected,
      settings,
      users,
      currentUser,
      products,
      inquiries,
      orders,
      tickets,
      refreshData,
      formatCurrency,
      calculateProductPrice,
      login,
      registerCustomer,
      logout,
      submitInquiry,
      sendQuotation,
      updateInquiryStatus,
      convertQuotationToOrder,
      createOrder,
      updateOrderStatus,
      findByReference,
      openChatTicket,
      claimTicket,
      claimNextQueuedTicket,
      sendChatMessage,
      updateTicketStatus,
      getQueuePosition,
      updateSettings,
      upsertProduct,
      deleteProduct,
      provisionStaffAccount,
      upsertUser,
      toggleEmployeeOnline,
    }),
    [
      loading,
      supabaseConnected,
      settings,
      users,
      currentUser,
      products,
      inquiries,
      orders,
      tickets,
      refreshData,
      formatCurrency,
      calculateProductPrice,
      login,
      registerCustomer,
      logout,
      submitInquiry,
      sendQuotation,
      updateInquiryStatus,
      convertQuotationToOrder,
      createOrder,
      updateOrderStatus,
      findByReference,
      openChatTicket,
      claimTicket,
      claimNextQueuedTicket,
      sendChatMessage,
      updateTicketStatus,
      getQueuePosition,
      updateSettings,
      upsertProduct,
      deleteProduct,
      provisionStaffAccount,
      upsertUser,
      toggleEmployeeOnline,
    ]
  );

  return (
    <PrintShopContext.Provider value={value}>
      {children}
    </PrintShopContext.Provider>
  );
}

export function usePrintShop() {
  const ctx = useContext(PrintShopContext);
  if (!ctx) {
    throw new Error("usePrintShop must be used within PrintShopProvider");
  }
  return ctx;
}
