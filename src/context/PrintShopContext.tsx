"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import {
  getStoredTicketTokens,
  sanitizeExternalUrl,
  saveStoredTicketToken,
} from "@/lib/security";

const DEFAULT_SETTINGS: AppSettings = {
  shopName: "Clayjar Print Studio",
  tagline: "Commercial Printing, Custom Packaging & Large Format Production",
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
  businessHours: "Mon – Sat, 8:30 AM – 6:30 PM",
  paymentInstructions:
    "50% downpayment required to initiate production. Include your Order Reference Number in the payment note.",
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

export interface PublicQueueSummary {
  onlineSpecialists: number;
  queuedTickets: number;
}

export interface ReferenceLookupResult {
  found: boolean;
  order?: Order;
  inquiry?: InquiryQuotation;
  ticket?: ChatTicket;
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
  queueSummary: PublicQueueSummary;
  users: UserProfile[];
  currentUser: UserProfile | null;
  products: Product[];
  inquiries: InquiryQuotation[];
  orders: Order[];
  tickets: ChatTicket[];
  refreshData: () => Promise<void>;
  refreshTicketSession: (ticketId: string) => Promise<void>;
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
    inquiryIdOrRef: string,
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
  lookupReference: (ref: string) => Promise<ReferenceLookupResult>;
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
  updateSettings: (
    next: AppSettings
  ) => Promise<{ ok: boolean; error?: string }>;
  upsertProduct: (
    product: Product
  ) => Promise<{ ok: boolean; error?: string; product?: Product }>;
  deleteProduct: (
    productId: string
  ) => Promise<{ ok: boolean; error?: string }>;
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

function makeSecureToken(len = 8): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  }
  return Array.from(
    { length: len },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

function mapInquiryRow(q: Record<string, unknown>): InquiryQuotation {
  return {
    id: String(q.id),
    referenceNumber: String(q.reference_number),
    customerId: q.customer_id ? String(q.customer_id) : undefined,
    customerName: String(q.customer_name),
    customerEmail: String(q.customer_email || ""),
    customerPhone: String(q.customer_phone || ""),
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
    artworkUrl: sanitizeExternalUrl(
      q.artwork_url ? String(q.artwork_url) : null
    ) ?? undefined,
    notes: q.notes ? String(q.notes) : undefined,
    targetDate: q.target_date ? String(q.target_date) : undefined,
    status: q.status as QuotationStatus,
    quotedUnitPrice:
      q.quoted_unit_price != null ? Number(q.quoted_unit_price) : undefined,
    quotedSetupFee:
      q.quoted_setup_fee != null ? Number(q.quoted_setup_fee) : undefined,
    quotedDiscount:
      q.quoted_discount != null ? Number(q.quoted_discount) : undefined,
    quotedTotal: q.quoted_total != null ? Number(q.quoted_total) : undefined,
    staffRemarks: q.staff_remarks ? String(q.staff_remarks) : undefined,
    validUntil: q.valid_until ? String(q.valid_until) : undefined,
    handledBy: q.handled_by ? String(q.handled_by) : undefined,
    handledByName: q.handled_by_name ? String(q.handled_by_name) : undefined,
    convertedOrderRef: q.converted_order_ref
      ? String(q.converted_order_ref)
      : undefined,
    createdAt: String(q.created_at),
    updatedAt: String(q.updated_at),
  };
}

function mapOrderRow(o: Record<string, unknown>): Order {
  return {
    id: String(o.id),
    referenceNumber: String(o.reference_number),
    quotationId: o.quotation_id ? String(o.quotation_id) : undefined,
    customerId: o.customer_id ? String(o.customer_id) : undefined,
    customerName: String(o.customer_name),
    customerEmail: String(o.customer_email || ""),
    customerPhone: String(o.customer_phone || ""),
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
  };
}

function mapTicketRow(
  t: Record<string, unknown>,
  queuePosOverride?: number
): ChatTicket {
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
    customerEmail: t.customer_email ? String(t.customer_email) : "",
    topic: String(t.topic),
    linkedReference: t.linked_reference
      ? String(t.linked_reference)
      : undefined,
    priority: (t.priority as TicketPriority) || "normal",
    status: (t.status as TicketStatus) || "queued",
    assignedEmployeeId: t.assigned_employee_id
      ? String(t.assigned_employee_id)
      : undefined,
    assignedEmployeeName: t.assigned_employee_name
      ? String(t.assigned_employee_name)
      : undefined,
    internalNotes: t.internal_notes ? String(t.internal_notes) : undefined,
    queuePosition:
      queuePosOverride ??
      (t.queue_position != null ? Number(t.queue_position) : undefined),
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
}

export function PrintShopProvider({ children }: { children: React.ReactNode }) {
  const supabaseConnected = isSupabaseConfigured();
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [queueSummary, setQueueSummary] = useState<PublicQueueSummary>({
    onlineSpecialists: 0,
    queuedTickets: 0,
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const currentUserRef = useRef<UserProfile | null>(null);
  currentUserRef.current = currentUser;

  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<InquiryQuotation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<ChatTicket[]>([]);

  const loadStoredGuestTickets = useCallback(async (): Promise<ChatTicket[]> => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return [];
    const tokenMap = getStoredTicketTokens();
    const entries = Object.entries(tokenMap).filter(([id]) =>
      UUID_REGEX.test(id)
    );
    if (entries.length === 0) return [];

    const results = await Promise.all(
      entries.map(async ([ticketId, token]) => {
        const { data } = await supabase.rpc("get_chat_ticket_session", {
          p_ticket_id: ticketId,
          p_access_token: token,
        });
        if (data && typeof data === "object" && "ticket" in data && data.ticket) {
          return mapTicketRow(
            data.ticket as Record<string, unknown>,
            Number((data as Record<string, unknown>).queuePosition ?? 0)
          );
        }
        return null;
      })
    );
    return results.filter((t): t is ChatTicket => t !== null);
  }, []);

  const refreshData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Public Catalog, Settings & Non-PII Queue Summary
    const [settingsRes, productsRes, queueRes, sessionRes] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("products")
        .select("*, product_sizes(*)")
        .order("created_at", { ascending: true }),
      supabase.rpc("get_public_queue_summary"),
      supabase.auth.getSession(),
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

    if (queueRes.data && typeof queueRes.data === "object") {
      const qd = queueRes.data as Record<string, unknown>;
      setQueueSummary({
        onlineSpecialists: Number(qd.onlineSpecialists ?? 0),
        queuedTickets: Number(qd.queuedTickets ?? 0),
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

    const activeSessionUser = sessionRes.data.session?.user ?? null;

    if (!activeSessionUser) {
      // Guest session: never query protected PII tables directly; load only token-scoped guest chat tickets
      setInquiries([]);
      setOrders([]);
      setUsers([]);
      const guestTickets = await loadStoredGuestTickets();
      setTickets(guestTickets);
      setLoading(false);
      return;
    }

    // Authenticated user: determine role from profiles
    const { data: ownProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", activeSessionUser.id)
      .maybeSingle();

    const isStaff =
      ownProfile?.is_active &&
      (ownProfile.role === "employee" || ownProfile.role === "super_admin");

    if (isStaff) {
      const [inquiriesRes, ordersRes, ticketsRes, profilesRes] =
        await Promise.all([
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

      if (inquiriesRes.data) {
        setInquiries(inquiriesRes.data.map(mapInquiryRow));
      }
      if (ordersRes.data) {
        setOrders(ordersRes.data.map(mapOrderRow));
      }
      if (ticketsRes.data) {
        setTickets(ticketsRes.data.map((t) => mapTicketRow(t)));
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
    } else {
      // Authenticated Customer: read own inquiries/orders via ownership RLS + own tickets via sanitized RPC
      const [inquiriesRes, ordersRes, myTicketsRes, guestTickets] =
        await Promise.all([
          supabase
            .from("inquiries_quotations")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase.rpc("get_my_chat_tickets"),
          loadStoredGuestTickets(),
        ]);

      if (inquiriesRes.data) {
        setInquiries(inquiriesRes.data.map(mapInquiryRow));
      }
      if (ordersRes.data) {
        setOrders(ordersRes.data.map(mapOrderRow));
      }
      const accountTickets = Array.isArray(myTicketsRes.data)
        ? (myTicketsRes.data as Record<string, unknown>[]).map((t) =>
            mapTicketRow(t)
          )
        : [];
      const mergedMap = new Map<string, ChatTicket>();
      accountTickets.forEach((t) => mergedMap.set(t.id, t));
      guestTickets.forEach((t) => mergedMap.set(t.id, t));
      setTickets(Array.from(mergedMap.values()));
      setUsers([]);
    }

    setLoading(false);
  }, [loadStoredGuestTickets]);

  const refreshTicketSession = useCallback(async (ticketId: string) => {
    if (!UUID_REGEX.test(ticketId)) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const tokenMap = getStoredTicketTokens();
    const token = tokenMap[ticketId] ?? null;

    const [{ data }, queueRes] = await Promise.all([
      supabase.rpc("get_chat_ticket_session", {
        p_ticket_id: ticketId,
        p_access_token: token,
      }),
      supabase.rpc("get_public_queue_summary"),
    ]);

    if (queueRes.data && typeof queueRes.data === "object") {
      const qd = queueRes.data as Record<string, unknown>;
      setQueueSummary({
        onlineSpecialists: Number(qd.onlineSpecialists ?? 0),
        queuedTickets: Number(qd.queuedTickets ?? 0),
      });
    }

    if (data && typeof data === "object" && "ticket" in data && data.ticket) {
      const updated = mapTicketRow(
        data.ticket as Record<string, unknown>,
        Number((data as Record<string, unknown>).queuePosition ?? 0)
      );
      setTickets((prev) => {
        const exists = prev.some((t) => t.id === updated.id);
        if (!exists) return [updated, ...prev];
        return prev.map((t) => (t.id === updated.id ? updated : t));
      });
    }
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
        return { ok: false, error: "Database connection is not configured." };
      }

      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        return {
          ok: false,
          error: "Invalid email address or password.",
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
        isActive: profile?.is_active ?? false,
        isOnline: profile?.is_online ?? true,
        createdAt: profile?.created_at || new Date().toISOString(),
      };

      if (!mapped.isActive) {
        await supabase.auth.signOut();
        return {
          ok: false,
          error: "This account is currently inactive. Contact an administrator.",
        };
      }

      if (staffOnly && mapped.role === "customer") {
        await supabase.auth.signOut();
        return {
          ok: false,
          error: "Access restricted to authorized staff accounts.",
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
        return { ok: false, error: "Database connection is not configured." };
      }

      if (input.password.length < 8) {
        return {
          ok: false,
          error: "Password must be at least 8 characters long.",
        };
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
    setInquiries([]);
    setOrders([]);
    setUsers([]);
  }, []);

  // INQUIRIES & QUOTATIONS (Server-validated RPC)
  const submitInquiry = useCallback(
    async (input: CreateInquiryInput): Promise<InquiryQuotation> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Database not connected");

      const validProductId =
        input.productId && UUID_REGEX.test(input.productId)
          ? input.productId
          : null;

      let safeArtwork: string | null = null;
      if (input.artworkUrl && input.artworkUrl.trim()) {
        safeArtwork = sanitizeExternalUrl(input.artworkUrl);
        if (!safeArtwork) {
          throw new Error(
            "Artwork link must start with https:// (e.g., Google Drive, Dropbox, or Canva)."
          );
        }
      }

      const { data, error } = await supabase.rpc("create_public_inquiry", {
        p_customer_name: input.customerName.trim(),
        p_customer_email: input.customerEmail.trim().toLowerCase(),
        p_customer_phone: input.customerPhone.trim(),
        p_company_name: input.companyName?.trim() || null,
        p_subject: input.subject.trim(),
        p_product_id: validProductId,
        p_product_name: input.productName.trim(),
        p_selected_size: input.selectedSize.trim(),
        p_material: input.material.trim(),
        p_finish: input.finish.trim(),
        p_quantity: Math.max(1, Math.floor(input.quantity)),
        p_custom_dimensions: input.customDimensions?.trim() || null,
        p_artwork_url: safeArtwork,
        p_notes: input.notes?.trim() || null,
        p_target_date: input.targetDate || null,
      });

      if (error || !data) {
        throw new Error(error?.message || "Failed to submit quotation inquiry.");
      }

      await refreshData();
      return mapInquiryRow(data as Record<string, unknown>);
    },
    [refreshData]
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
          handled_by: currentUserRef.current?.id ?? null,
          handled_by_name: currentUserRef.current?.fullName || "Estimator",
          updated_at: new Date().toISOString(),
        })
        .eq("id", inquiryId);

      await refreshData();
    },
    [inquiries, refreshData]
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

      // Online customer/guest orders ALWAYS compute pricing server-side via RPC
      const firstItem = input.items[0];
      const isStaffUser =
        currentUserRef.current &&
        (currentUserRef.current.role === "employee" ||
          currentUserRef.current.role === "super_admin");

      if (
        input.orderSource === "online" &&
        firstItem?.productId &&
        UUID_REGEX.test(firstItem.productId)
      ) {
        const matchedProd = products.find((p) => p.id === firstItem.productId);
        const resolvedSizeId =
          firstItem.sizeId ||
          matchedProd?.sizes.find((s) => s.sizeLabel === firstItem.sizeLabel)
            ?.id;

        if (!resolvedSizeId || !UUID_REGEX.test(resolvedSizeId)) {
          throw new Error("Please select a valid product size tier.");
        }

        const { data, error } = await supabase.rpc("create_online_order", {
          p_customer_name: input.customerName.trim(),
          p_customer_email: input.customerEmail.trim().toLowerCase(),
          p_customer_phone: input.customerPhone.trim(),
          p_product_id: firstItem.productId,
          p_size_id: resolvedSizeId,
          p_material: firstItem.material,
          p_finish: firstItem.finish,
          p_quantity: Math.max(1, Math.floor(firstItem.quantity)),
          p_payment_method: input.paymentMethod,
          p_delivery_method: input.deliveryMethod,
          p_notes: input.notes?.trim() || null,
        });

        if (error || !data) {
          throw new Error(error?.message || "Failed to place online order.");
        }

        await refreshData();
        return mapOrderRow(data as Record<string, unknown>);
      }

      if (!isStaffUser) {
        throw new Error("Counter orders require staff authentication.");
      }

      // Staff Walk-In / Multi-Item Counter Order
      const year = new Date().getFullYear();
      const ref = `${settings.orderPrefix || "ORD"}-${year}-${makeSecureToken(8)}`;

      const subtotal = Number(
        input.items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
      );
      const discountAmount = Math.max(
        0,
        Number((input.discountAmount ?? 0).toFixed(2))
      );
      const taxable = Math.max(0, subtotal - discountAmount);
      const taxAmount = Number(
        ((taxable * (settings.taxRate || 0)) / 100).toFixed(2)
      );
      const totalAmount = Number((taxable + taxAmount).toFixed(2));
      const amountPaid = Math.max(
        0,
        Number((input.amountPaid ?? 0).toFixed(2))
      );

      const validQuoteId =
        input.quotationId && UUID_REGEX.test(input.quotationId)
          ? input.quotationId
          : null;

      const { data, error } = await supabase
        .from("orders")
        .insert({
          reference_number: ref,
          quotation_id: validQuoteId,
          customer_id: null,
          customer_name: input.customerName.trim(),
          customer_email: input.customerEmail.trim().toLowerCase(),
          customer_phone: input.customerPhone.trim(),
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
          notes: input.notes?.trim() || null,
          taken_by_employee_id: currentUserRef.current?.id ?? null,
          taken_by_name: currentUserRef.current?.fullName ?? null,
          estimated_completion: input.estimatedCompletion || null,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to create counter order.");
      }

      await refreshData();
      return mapOrderRow(data as Record<string, unknown>);
    },
    [products, refreshData, settings.orderPrefix, settings.taxRate]
  );

  const convertQuotationToOrder = useCallback(
    async (
      inquiryIdOrRef: string,
      paymentInfo?: {
        paymentStatus?: PaymentStatus;
        amountPaid?: number;
        paymentMethod?: string;
        deliveryMethod?: "pickup" | "courier";
      }
    ): Promise<Order | null> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return null;

      const localMatch = inquiries.find(
        (i) =>
          i.id === inquiryIdOrRef ||
          i.referenceNumber.toUpperCase() ===
            inquiryIdOrRef.trim().toUpperCase()
      );
      const refToAccept = localMatch?.referenceNumber || inquiryIdOrRef.trim();

      const { data, error } = await supabase.rpc(
        "accept_quotation_by_reference",
        {
          p_reference: refToAccept,
          p_payment_method: paymentInfo?.paymentMethod ?? "bank_transfer",
          p_delivery_method: paymentInfo?.deliveryMethod ?? "pickup",
        }
      );

      if (error || !data) {
        throw new Error(
          error?.message || "Could not convert quotation to order."
        );
      }

      await refreshData();
      return mapOrderRow(data as Record<string, unknown>);
    },
    [inquiries, refreshData]
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

  // REFERENCE FINDER (Local + Authoritative Server Lookup RPC)
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

  const lookupReference = useCallback(
    async (ref: string): Promise<ReferenceLookupResult> => {
      const clean = ref.trim();
      if (clean.length < 5) return { found: false };

      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { found: false };

      const { data, error } = await supabase.rpc("lookup_reference_details", {
        p_reference: clean,
      });

      if (error || !data || typeof data !== "object") {
        return { found: false };
      }

      const payload = data as Record<string, unknown>;
      return {
        found: Boolean(payload.found),
        order: payload.order
          ? mapOrderRow(payload.order as Record<string, unknown>)
          : undefined,
        inquiry: payload.inquiry
          ? mapInquiryRow(payload.inquiry as Record<string, unknown>)
          : undefined,
        ticket: payload.ticket
          ? mapTicketRow(payload.ticket as Record<string, unknown>)
          : undefined,
      };
    },
    []
  );

  // LIVE CHAT & TICKETING QUEUE
  const openChatTicket = useCallback(
    async (input: OpenTicketInput): Promise<ChatTicket> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Database not connected");

      const { data, error } = await supabase.rpc("open_public_chat_ticket", {
        p_customer_name: input.customerName.trim(),
        p_customer_email: input.customerEmail.trim().toLowerCase(),
        p_topic: input.topic.trim(),
        p_linked_reference: input.linkedReference?.trim() || null,
        p_priority: input.priority ?? "normal",
        p_initial_message: input.initialMessage.trim(),
      });

      if (error || !data || typeof data !== "object") {
        throw new Error(error?.message || "Failed to open support ticket.");
      }

      const resObj = data as Record<string, unknown>;
      const mapped = mapTicketRow(
        resObj.ticket as Record<string, unknown>,
        Number(resObj.queuePosition ?? 0)
      );
      if (typeof resObj.accessToken === "string" && resObj.accessToken) {
        saveStoredTicketToken(mapped.id, resObj.accessToken);
      }

      setTickets((prev) => [mapped, ...prev.filter((t) => t.id !== mapped.id)]);
      await refreshData();
      return mapped;
    },
    [refreshData]
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
      const target = tickets.find((t) => t.id === ticketId);
      if (target?.queuePosition && target.queuePosition > 0) {
        return target.queuePosition;
      }
      const idx = sortedQueuedTickets.findIndex((t) => t.id === ticketId);
      return idx === -1 ? 0 : idx + 1;
    },
    [sortedQueuedTickets, tickets]
  );

  const claimTicket = useCallback(
    async (ticketId: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const staffName = currentUserRef.current?.fullName || "Support Specialist";
      const now = new Date().toISOString();

      await supabase
        .from("chat_tickets")
        .update({
          status: "active",
          assigned_employee_id: currentUserRef.current?.id ?? null,
          assigned_employee_name: staffName,
          claimed_at: now,
        })
        .eq("id", ticketId);

      await supabase.from("chat_messages").insert({
        ticket_id: ticketId,
        sender_role: "system",
        sender_name: "System",
        message: `${staffName} accepted your ticket and joined the conversation.`,
      });

      await refreshData();
    },
    [refreshData]
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

      const user = currentUserRef.current;
      const isStaff =
        user && (user.role === "employee" || user.role === "super_admin");
      const effectiveRole: ChatMessage["senderRole"] =
        senderRole ?? (isStaff ? "employee" : "customer");

      if (isStaff && effectiveRole !== "customer") {
        const senderName =
          senderNameOverride || user?.fullName || "Support Specialist";
        await supabase.from("chat_messages").insert({
          ticket_id: ticketId,
          sender_role: effectiveRole,
          sender_name: senderName,
          message: clean,
        });
        await refreshData();
        return;
      }

      // Customer / Guest ticket message via authorized RPC
      const tokenMap = getStoredTicketTokens();
      const token = tokenMap[ticketId] ?? "";
      const { error } = await supabase.rpc("send_customer_chat_message", {
        p_ticket_id: ticketId,
        p_access_token: token,
        p_message: clean,
      });
      if (error) {
        throw new Error(error.message || "Could not send message.");
      }
      await refreshTicketSession(ticketId);
    },
    [refreshData, refreshTicketSession]
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
          sender_name: "System",
          message: `Ticket marked as resolved by ${
            currentUserRef.current?.fullName || "Staff"
          }.`,
        });
      }

      await refreshData();
    },
    [refreshData]
  );

  // SUPER ADMIN DATABASE CONTROLS
  const updateSettings = useCallback(
    async (next: AppSettings) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return { ok: false, error: "Database not connected." };

      const { error } = await supabase
        .from("app_settings")
        .update({
          shop_name: next.shopName.trim(),
          tagline: next.tagline.trim(),
          currency_code: next.currencyCode,
          currency_symbol: next.currencySymbol,
          tax_rate: Math.min(100, Math.max(0, next.taxRate)),
          quotation_validity_days: Math.min(
            365,
            Math.max(1, next.quotationValidityDays)
          ),
          order_prefix: next.orderPrefix.trim().toUpperCase(),
          quote_prefix: next.quotePrefix.trim().toUpperCase(),
          ticket_prefix: next.ticketPrefix.trim().toUpperCase(),
          contact_email: next.contactEmail.trim(),
          contact_phone: next.contactPhone.trim(),
          shop_address: next.shopAddress.trim(),
          business_hours: next.businessHours.trim(),
          payment_instructions: next.paymentInstructions.trim(),
          auto_assign_tickets: next.autoAssignTickets,
          max_active_chats_per_employee: Math.min(
            50,
            Math.max(1, next.maxActiveChatsPerEmployee)
          ),
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
        `product-${makeSecureToken(4).toLowerCase()}`;

      const slugCollision = products.some(
        (p) =>
          p.id !== product.id &&
          p.slug.toLowerCase() === safeSlug.toLowerCase()
      );
      if (slugCollision) {
        safeSlug = `${safeSlug}-${makeSecureToken(4).toLowerCase()}`;
      }

      const payload = {
        slug: safeSlug,
        name: product.name.trim(),
        category: product.category.trim(),
        short_description: product.shortDescription.trim(),
        description: product.description.trim(),
        base_unit: product.baseUnit.trim(),
        min_order_qty: Math.max(1, product.minOrderQty),
        lead_time_days: product.leadTimeDays.trim(),
        badge: product.badge?.trim() || null,
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
              size_label: sz.sizeLabel.trim(),
              dimensions: sz.dimensions.trim(),
              unit_price: Math.max(0, sz.unitPrice),
              bulk_100_price:
                sz.bulk100Price != null ? Math.max(0, sz.bulk100Price) : null,
              bulk_500_price:
                sz.bulk500Price != null ? Math.max(0, sz.bulk500Price) : null,
              setup_fee: Math.max(0, sz.setupFee || 0),
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

      if (input.password.length < 8) {
        return {
          ok: false,
          error: "Staff password must be at least 8 characters long.",
        };
      }

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

      if (currentUserRef.current?.id === userId) {
        setCurrentUser((prev) =>
          prev ? { ...prev, isOnline: nextOnline } : null
        );
      }
      await refreshData();
    },
    [refreshData, users]
  );

  const value = useMemo<PrintShopContextValue>(
    () => ({
      loading,
      supabaseConnected,
      settings,
      queueSummary,
      users,
      currentUser,
      products,
      inquiries,
      orders,
      tickets,
      refreshData,
      refreshTicketSession,
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
      lookupReference,
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
      queueSummary,
      users,
      currentUser,
      products,
      inquiries,
      orders,
      tickets,
      refreshData,
      refreshTicketSession,
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
      lookupReference,
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
    throw new Error("usePrintShop must be used inside <PrintShopProvider>");
  }
  return ctx;
}
