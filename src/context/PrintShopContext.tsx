"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
} from "@/types/printshop";
import {
  INITIAL_INQUIRIES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_TICKETS,
  INITIAL_USERS,
} from "@/lib/seed-data";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

const STORAGE_KEY = "clayjar_printshop_state_v1";
const AUTH_STORAGE_KEY = "clayjar_current_user_id_v1";
const CHANNEL_NAME = "clayjar_realtime_sync";

interface PersistedState {
  settings: AppSettings;
  users: UserProfile[];
  products: Product[];
  inquiries: InquiryQuotation[];
  orders: Order[];
  tickets: ChatTicket[];
}

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
  hydrated: boolean;
  supabaseConnected: boolean;
  settings: AppSettings;
  users: UserProfile[];
  currentUser: UserProfile | null;
  products: Product[];
  inquiries: InquiryQuotation[];
  orders: Order[];
  tickets: ChatTicket[];
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
  quickSwitchUser: (userId: string | null) => void;
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
  // Admin & Staff Controls
  updateSettings: (next: AppSettings) => Promise<void>;
  upsertProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  upsertUser: (user: UserProfile) => Promise<void>;
  toggleEmployeeOnline: (userId: string) => Promise<void>;
  resetDemoData: () => void;
}

const PrintShopContext = createContext<PrintShopContextValue | null>(null);

function makeRandomDigits(len = 4): string {
  const min = Math.pow(10, len - 1);
  const max = Math.pow(10, len) - 1;
  return String(Math.floor(min + Math.random() * (max - min)));
}

export function PrintShopProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const supabaseConnected = isSupabaseConfigured();

  const [state, setState] = useState<PersistedState>({
    settings: INITIAL_SETTINGS,
    users: INITIAL_USERS,
    products: INITIAL_PRODUCTS,
    inquiries: INITIAL_INQUIRIES,
    orders: INITIAL_ORDERS,
    tickets: INITIAL_TICKETS,
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Hydrate from localStorage + BroadcastChannel listener
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setState((prev) => ({
          settings: parsed.settings ?? prev.settings,
          users: parsed.users ?? prev.users,
          products: parsed.products ?? prev.products,
          inquiries: parsed.inquiries ?? prev.inquiries,
          orders: parsed.orders ?? prev.orders,
          tickets: parsed.tickets ?? prev.tickets,
        }));
      }
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        setCurrentUserId(savedUser);
      }
    } catch {
      // Ignore malformed storage
    }
    setHydrated(true);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (ev) => {
        if (ev.data?.type === "STATE_SYNC" && ev.data.payload) {
          setState(ev.data.payload);
        }
      };
    }
    return () => {
      bc?.close();
    };
  }, []);

  // Optional live Supabase fetch + Realtime subscription when credentials exist
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;

    async function loadFromSupabase() {
      if (!supabase) return;
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

      if (!active) return;

      setState((prev) => {
        const next = { ...prev };
        if (profilesRes.data && profilesRes.data.length > 0) {
          next.users = profilesRes.data.map((u: Record<string, unknown>) => ({
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
          }));
        }
        if (settingsRes.data) {
          const s = settingsRes.data;
          next.settings = {
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
          };
        }
        if (productsRes.data && productsRes.data.length > 0) {
          next.products = productsRes.data.map((p: Record<string, unknown>) => ({
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
            sizes: Array.isArray(p.product_sizes)
              ? p.product_sizes.map((sz: Record<string, unknown>) => ({
                  id: String(sz.id),
                  sizeLabel: String(sz.size_label),
                  dimensions: String(sz.dimensions),
                  unitPrice: Number(sz.unit_price),
                  bulk100Price: sz.bulk_100_price
                    ? Number(sz.bulk_100_price)
                    : undefined,
                  bulk500Price: sz.bulk_500_price
                    ? Number(sz.bulk_500_price)
                    : undefined,
                  setupFee: Number(sz.setup_fee || 0),
                }))
              : [],
          }));
        }
        if (inquiriesRes.data && inquiriesRes.data.length > 0) {
          next.inquiries = inquiriesRes.data.map((q: Record<string, unknown>) => ({
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
            quotedUnitPrice: q.quoted_unit_price
              ? Number(q.quoted_unit_price)
              : undefined,
            quotedSetupFee: q.quoted_setup_fee
              ? Number(q.quoted_setup_fee)
              : undefined,
            quotedDiscount: q.quoted_discount
              ? Number(q.quoted_discount)
              : undefined,
            quotedTotal: q.quoted_total ? Number(q.quoted_total) : undefined,
            staffRemarks: q.staff_remarks ? String(q.staff_remarks) : undefined,
            validUntil: q.valid_until ? String(q.valid_until) : undefined,
            handledBy: q.handled_by ? String(q.handled_by) : undefined,
            handledByName: q.handled_by_name
              ? String(q.handled_by_name)
              : undefined,
            createdAt: String(q.created_at),
            updatedAt: String(q.updated_at),
          }));
        }
        if (ordersRes.data && ordersRes.data.length > 0) {
          next.orders = ordersRes.data.map((o: Record<string, unknown>) => ({
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
          }));
        }
        if (ticketsRes.data && ticketsRes.data.length > 0) {
          next.tickets = ticketsRes.data.map((t: Record<string, unknown>) => ({
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
            messages: Array.isArray(t.chat_messages)
              ? t.chat_messages.map((m: Record<string, unknown>) => ({
                  id: String(m.id),
                  ticketId: String(m.ticket_id),
                  senderRole: m.sender_role as ChatMessage["senderRole"],
                  senderName: String(m.sender_name),
                  message: String(m.message),
                  createdAt: String(m.created_at),
                }))
              : [],
          }));
        }
        return next;
      });
    }

    loadFromSupabase();

    // Sync Supabase Auth session & profile across page reloads and auth events
    async function syncAuthUser() {
      if (!supabase || !active) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setCurrentUserId(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
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

      setState((prev) => ({
        ...prev,
        users: [mapped, ...prev.users.filter((u) => u.id !== mapped.id)],
      }));
      setCurrentUserId(mapped.id);
      localStorage.setItem(AUTH_STORAGE_KEY, mapped.id);
    }

    syncAuthUser();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCurrentUserId(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        syncAuthUser();
        loadFromSupabase();
      }
    });

    const channel = supabase
      .channel("clayjar-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_tickets" },
        () => loadFromSupabase()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => loadFromSupabase()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inquiries_quotations" },
        () => loadFromSupabase()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => loadFromSupabase()
      )
      .subscribe();

    return () => {
      active = false;
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const commitState = useCallback(
    (updater: (prev: PersistedState) => PersistedState) => {
      setState((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel(CHANNEL_NAME);
            bc.postMessage({ type: "STATE_SYNC", payload: next });
            bc.close();
          }
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    []
  );

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === currentUserId) ?? null,
    [state.users, currentUserId]
  );

  const formatCurrency = useCallback(
    (amount: number) => {
      const sym = state.settings.currencySymbol || "₱";
      return `${sym}${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [state.settings.currencySymbol]
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
      const cleanEmail = email.trim().toLowerCase();
      const supabase = getSupabaseBrowserClient();

      if (supabase) {
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

        if (staffOnly && mapped.role === "customer") {
          await supabase.auth.signOut();
          return {
            ok: false,
            error: "This portal is restricted to authorized Print Shop Staff.",
          };
        }

        commitState((prev) => ({
          ...prev,
          users: [mapped, ...prev.users.filter((u) => u.id !== mapped.id)],
        }));
        setCurrentUserId(mapped.id);
        localStorage.setItem(AUTH_STORAGE_KEY, mapped.id);
        return { ok: true, user: mapped };
      }

      // Local preview auth before Supabase credentials are connected
      const found = state.users.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );
      if (!found) {
        return {
          ok: false,
          error: "No account found with that email address.",
        };
      }
      if (!found.isActive) {
        return {
          ok: false,
          error: "This account has been deactivated by an administrator.",
        };
      }
      if (found.passwordHint && password !== found.passwordHint) {
        return {
          ok: false,
          error: "Incorrect password. Check the demo credentials card or reset.",
        };
      }
      if (staffOnly && found.role === "customer") {
        return {
          ok: false,
          error:
            "Customer accounts cannot sign in to the Staff Portal. Use /account instead.",
        };
      }

      setCurrentUserId(found.id);
      localStorage.setItem(AUTH_STORAGE_KEY, found.id);
      return { ok: true, user: found };
    },
    [commitState, state.users]
  );

  const registerCustomer = useCallback(
    async (input: {
      fullName: string;
      email: string;
      phone: string;
      companyName?: string;
      password: string;
    }) => {
      const cleanEmail = input.email.trim().toLowerCase();
      const supabase = getSupabaseBrowserClient();

      if (supabase) {
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
              full_name: input.fullName,
              phone: input.phone,
              company_name: input.companyName,
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
          fullName: input.fullName,
          email: cleanEmail,
          phone: input.phone,
          companyName: input.companyName,
          role: "customer",
          isActive: true,
          isOnline: false,
          createdAt: new Date().toISOString(),
        };
        if (!data.session) {
          return {
            ok: true,
            user: newUser,
            needsEmailConfirmation: true,
          };
        }
        commitState((prev) => ({ ...prev, users: [...prev.users, newUser] }));
        setCurrentUserId(newUser.id);
        localStorage.setItem(AUTH_STORAGE_KEY, newUser.id);
        return { ok: true, user: newUser };
      }

      const exists = state.users.some(
        (u) => u.email.toLowerCase() === cleanEmail
      );
      if (exists) {
        return {
          ok: false,
          error: "An account with this email already exists.",
        };
      }

      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        fullName: input.fullName.trim(),
        email: cleanEmail,
        phone: input.phone.trim(),
        companyName: input.companyName?.trim() || undefined,
        role: "customer",
        isActive: true,
        isOnline: false,
        passwordHint: input.password,
        createdAt: new Date().toISOString(),
      };

      commitState((prev) => ({
        ...prev,
        users: [...prev.users, newUser],
      }));
      setCurrentUserId(newUser.id);
      localStorage.setItem(AUTH_STORAGE_KEY, newUser.id);
      return { ok: true, user: newUser };
    },
    [commitState, state.users]
  );

  const quickSwitchUser = useCallback((userId: string | null) => {
    setCurrentUserId(userId);
    if (userId) {
      localStorage.setItem(AUTH_STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUserId(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  // INQUIRIES & QUOTATIONS
  const submitInquiry = useCallback(
    async (input: CreateInquiryInput): Promise<InquiryQuotation> => {
      const year = new Date().getFullYear();
      const ref = `${state.settings.quotePrefix || "QT"}-${year}-${makeRandomDigits(4)}`;
      const now = new Date().toISOString();

      const newInquiry: InquiryQuotation = {
        id: `inq-${Date.now()}`,
        referenceNumber: ref,
        customerId:
          currentUser?.role === "customer" ? currentUser.id : undefined,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        companyName: input.companyName,
        subject: input.subject,
        productId: input.productId,
        productName: input.productName,
        selectedSize: input.selectedSize,
        material: input.material,
        finish: input.finish,
        quantity: input.quantity,
        customDimensions: input.customDimensions,
        artworkUrl: input.artworkUrl,
        notes: input.notes,
        targetDate: input.targetDate,
        status: "pending_review",
        createdAt: now,
        updatedAt: now,
      };

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { data } = await supabase
          .from("inquiries_quotations")
          .insert({
            reference_number: ref,
            customer_id: newInquiry.customerId ?? null,
            customer_name: newInquiry.customerName,
            customer_email: newInquiry.customerEmail,
            customer_phone: newInquiry.customerPhone,
            company_name: newInquiry.companyName ?? null,
            subject: newInquiry.subject,
            product_id: null,
            product_name: newInquiry.productName,
            selected_size: newInquiry.selectedSize,
            material: newInquiry.material,
            finish: newInquiry.finish,
            quantity: newInquiry.quantity,
            custom_dimensions: newInquiry.customDimensions ?? null,
            artwork_url: newInquiry.artworkUrl ?? null,
            notes: newInquiry.notes ?? null,
            target_date: newInquiry.targetDate || null,
            status: "pending_review",
          })
          .select()
          .maybeSingle();
        if (data?.id) newInquiry.id = String(data.id);
      }

      commitState((prev) => ({
        ...prev,
        inquiries: [newInquiry, ...prev.inquiries],
      }));
      return newInquiry;
    },
    [commitState, currentUser, state.settings.quotePrefix]
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
      const target = state.inquiries.find((i) => i.id === inquiryId);
      if (!target) return;

      const gross =
        quote.quotedUnitPrice * target.quantity + quote.quotedSetupFee;
      const quotedTotal = Math.max(
        0,
        Number((gross - quote.quotedDiscount).toFixed(2))
      );
      const now = new Date().toISOString();

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
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
            handled_by_name: currentUser?.fullName || "Print Estimator",
            updated_at: now,
          })
          .eq("id", inquiryId);
      }

      commitState((prev) => ({
        ...prev,
        inquiries: prev.inquiries.map((inq) =>
          inq.id === inquiryId
            ? {
                ...inq,
                status: "quoted",
                quotedUnitPrice: quote.quotedUnitPrice,
                quotedSetupFee: quote.quotedSetupFee,
                quotedDiscount: quote.quotedDiscount,
                quotedTotal,
                staffRemarks: quote.staffRemarks,
                validUntil: quote.validUntil,
                handledBy: currentUser?.id,
                handledByName: currentUser?.fullName || "Print Estimator",
                updatedAt: now,
              }
            : inq
        ),
      }));
    },
    [commitState, currentUser, state.inquiries]
  );

  const updateInquiryStatus = useCallback(
    async (inquiryId: string, status: QuotationStatus) => {
      const now = new Date().toISOString();
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase
          .from("inquiries_quotations")
          .update({ status, updated_at: now })
          .eq("id", inquiryId);
      }
      commitState((prev) => ({
        ...prev,
        inquiries: prev.inquiries.map((inq) =>
          inq.id === inquiryId ? { ...inq, status, updatedAt: now } : inq
        ),
      }));
    },
    [commitState]
  );

  // ORDERS
  const createOrder = useCallback(
    async (input: CreateOrderInput): Promise<Order> => {
      const year = new Date().getFullYear();
      const ref = `${state.settings.orderPrefix || "ORD"}-${year}-${makeRandomDigits(4)}`;
      const now = new Date().toISOString();

      const subtotal = Number(
        input.items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
      );
      const discountAmount = Number((input.discountAmount ?? 0).toFixed(2));
      const taxable = Math.max(0, subtotal - discountAmount);
      const taxAmount = Number(
        ((taxable * (state.settings.taxRate || 0)) / 100).toFixed(2)
      );
      const totalAmount = Number((taxable + taxAmount).toFixed(2));
      const amountPaid = Number((input.amountPaid ?? 0).toFixed(2));

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        referenceNumber: ref,
        quotationId: input.quotationId,
        quotationRef: input.quotationRef,
        customerId:
          currentUser?.role === "customer" ? currentUser.id : undefined,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        orderSource: input.orderSource,
        items: input.items,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        amountPaid,
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod,
        productionStatus: "received",
        deliveryMethod: input.deliveryMethod,
        notes: input.notes,
        takenByEmployeeId:
          currentUser && currentUser.role !== "customer"
            ? currentUser.id
            : undefined,
        takenByName:
          currentUser && currentUser.role !== "customer"
            ? currentUser.fullName
            : undefined,
        estimatedCompletion: input.estimatedCompletion,
        createdAt: now,
        updatedAt: now,
      };

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { data } = await supabase
          .from("orders")
          .insert({
            reference_number: ref,
            quotation_id: null,
            customer_id: newOrder.customerId ?? null,
            customer_name: newOrder.customerName,
            customer_email: newOrder.customerEmail,
            customer_phone: newOrder.customerPhone,
            order_source: newOrder.orderSource,
            items: newOrder.items,
            subtotal,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            amount_paid: amountPaid,
            payment_status: newOrder.paymentStatus,
            payment_method: newOrder.paymentMethod,
            production_status: "received",
            delivery_method: newOrder.deliveryMethod,
            notes: newOrder.notes ?? null,
            taken_by_name: newOrder.takenByName ?? null,
            estimated_completion: newOrder.estimatedCompletion || null,
          })
          .select()
          .maybeSingle();
        if (data?.id) newOrder.id = String(data.id);
      }

      commitState((prev) => ({
        ...prev,
        orders: [newOrder, ...prev.orders],
      }));

      return newOrder;
    },
    [
      commitState,
      currentUser,
      state.settings.orderPrefix,
      state.settings.taxRate,
    ]
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
      const inq = state.inquiries.find((i) => i.id === inquiryId);
      if (!inq) return null;

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

      commitState((prev) => ({
        ...prev,
        inquiries: prev.inquiries.map((item) =>
          item.id === inquiryId
            ? {
                ...item,
                status: "converted_to_order",
                convertedOrderRef: order.referenceNumber,
                updatedAt: new Date().toISOString(),
              }
            : item
        ),
      }));

      return order;
    },
    [commitState, createOrder, state.inquiries]
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
      const now = new Date().toISOString();
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const dbPatch: Record<string, unknown> = { updated_at: now };
        if (updates.productionStatus)
          dbPatch.production_status = updates.productionStatus;
        if (updates.paymentStatus)
          dbPatch.payment_status = updates.paymentStatus;
        if (updates.amountPaid !== undefined)
          dbPatch.amount_paid = updates.amountPaid;
        if (updates.estimatedCompletion !== undefined)
          dbPatch.estimated_completion = updates.estimatedCompletion || null;
        if (updates.notes !== undefined) dbPatch.notes = updates.notes;
        await supabase.from("orders").update(dbPatch).eq("id", orderId);
      }

      commitState((prev) => ({
        ...prev,
        orders: prev.orders.map((ord) =>
          ord.id === orderId ? { ...ord, ...updates, updatedAt: now } : ord
        ),
      }));
    },
    [commitState]
  );

  // REFERENCE FINDER
  const findByReference = useCallback(
    (ref: string) => {
      const clean = ref.trim().toUpperCase();
      if (!clean) return {};
      return {
        order: state.orders.find(
          (o) => o.referenceNumber.toUpperCase() === clean
        ),
        inquiry: state.inquiries.find(
          (i) => i.referenceNumber.toUpperCase() === clean
        ),
        ticket: state.tickets.find(
          (t) => t.ticketNumber.toUpperCase() === clean
        ),
      };
    },
    [state.inquiries, state.orders, state.tickets]
  );

  // LIVE CHAT & TICKETING QUEUE
  const openChatTicket = useCallback(
    async (input: OpenTicketInput): Promise<ChatTicket> => {
      const ticketNumber = `${state.settings.ticketPrefix || "TKT"}-${makeRandomDigits(4)}`;
      const now = new Date().toISOString();

      // Auto-assign check if enabled in Super Admin Settings
      let status: TicketStatus = "queued";
      let assignedEmployeeId: string | undefined;
      let assignedEmployeeName: string | undefined;
      let claimedAt: string | undefined;

      if (state.settings.autoAssignTickets) {
        const onlineStaff = state.users.filter(
          (u) =>
            (u.role === "employee" || u.role === "super_admin") &&
            u.isActive &&
            u.isOnline
        );
        for (const emp of onlineStaff) {
          const activeCount = state.tickets.filter(
            (t) => t.status === "active" && t.assignedEmployeeId === emp.id
          ).length;
          if (activeCount < state.settings.maxActiveChatsPerEmployee) {
            status = "active";
            assignedEmployeeId = emp.id;
            assignedEmployeeName = emp.fullName;
            claimedAt = now;
            break;
          }
        }
      }

      const ticketId = `tkt-${Date.now()}`;
      const sysMsg: ChatMessage = {
        id: `msg-${Date.now()}-sys`,
        ticketId,
        senderRole: "system",
        senderName: "Queue Bot",
        message:
          status === "active"
            ? `Ticket ${ticketNumber} created and auto-assigned to ${assignedEmployeeName}.`
            : `Ticket ${ticketNumber} joined the Live Support Queue.${
                input.linkedReference
                  ? ` Linked Reference: ${input.linkedReference}.`
                  : ""
              }`,
        createdAt: now,
      };

      const custMsg: ChatMessage = {
        id: `msg-${Date.now()}-cust`,
        ticketId,
        senderRole: "customer",
        senderName: input.customerName,
        message: input.initialMessage,
        createdAt: now,
      };

      const newTicket: ChatTicket = {
        id: ticketId,
        ticketNumber,
        customerId:
          currentUser?.role === "customer" ? currentUser.id : undefined,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        topic: input.topic,
        linkedReference: input.linkedReference?.trim() || undefined,
        priority: input.priority ?? "normal",
        status,
        assignedEmployeeId,
        assignedEmployeeName,
        queuedAt: now,
        claimedAt,
        messages: [sysMsg, custMsg],
      };

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { data } = await supabase
          .from("chat_tickets")
          .insert({
            ticket_number: ticketNumber,
            customer_id: newTicket.customerId ?? null,
            customer_name: newTicket.customerName,
            customer_email: newTicket.customerEmail,
            topic: newTicket.topic,
            linked_reference: newTicket.linkedReference ?? null,
            priority: newTicket.priority,
            status: newTicket.status,
            assigned_employee_name: newTicket.assignedEmployeeName ?? null,
          })
          .select()
          .maybeSingle();
        if (data?.id) {
          newTicket.id = String(data.id);
          await supabase.from("chat_messages").insert([
            {
              ticket_id: data.id,
              sender_role: "system",
              sender_name: "Queue Bot",
              message: sysMsg.message,
            },
            {
              ticket_id: data.id,
              sender_role: "customer",
              sender_name: custMsg.senderName,
              message: custMsg.message,
            },
          ]);
        }
      }

      commitState((prev) => ({
        ...prev,
        tickets: [...prev.tickets, newTicket],
      }));
      return newTicket;
    },
    [
      commitState,
      currentUser,
      state.settings.autoAssignTickets,
      state.settings.maxActiveChatsPerEmployee,
      state.settings.ticketPrefix,
      state.tickets,
      state.users,
    ]
  );

  // Priority-aware FIFO queue ordering
  const sortedQueuedTickets = useMemo(() => {
    const rank: Record<TicketPriority, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
    };
    return state.tickets
      .filter((t) => t.status === "queued")
      .sort((a, b) => {
        if (rank[a.priority] !== rank[b.priority]) {
          return rank[a.priority] - rank[b.priority];
        }
        return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
      });
  }, [state.tickets]);

  const getQueuePosition = useCallback(
    (ticketId: string) => {
      const idx = sortedQueuedTickets.findIndex((t) => t.id === ticketId);
      return idx === -1 ? 0 : idx + 1;
    },
    [sortedQueuedTickets]
  );

  const claimTicket = useCallback(
    async (ticketId: string) => {
      const staffName = currentUser?.fullName || "Print Specialist";
      const staffId = currentUser?.id || "usr-emp-1";
      const now = new Date().toISOString();

      const claimSysMsg: ChatMessage = {
        id: `msg-${Date.now()}-claim`,
        ticketId,
        senderRole: "system",
        senderName: "Queue Bot",
        message: `${staffName} accepted your ticket and joined the chat.`,
        createdAt: now,
      };

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase
          .from("chat_tickets")
          .update({
            status: "active",
            assigned_employee_name: staffName,
            claimed_at: now,
          })
          .eq("id", ticketId);
        await supabase.from("chat_messages").insert({
          ticket_id: ticketId,
          sender_role: "system",
          sender_name: "Queue Bot",
          message: claimSysMsg.message,
        });
      }

      commitState((prev) => ({
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: "active",
                assignedEmployeeId: staffId,
                assignedEmployeeName: staffName,
                claimedAt: now,
                messages: [...t.messages, claimSysMsg],
              }
            : t
        ),
      }));
    },
    [commitState, currentUser]
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
      const clean = message.trim();
      if (!clean) return;

      const role: ChatMessage["senderRole"] =
        senderRole ??
        (currentUser && currentUser.role !== "customer"
          ? "employee"
          : "customer");
      const targetTicket = state.tickets.find((t) => t.id === ticketId);
      const senderName =
        senderNameOverride ||
        (role === "employee"
          ? currentUser?.fullName || "Print Specialist"
          : currentUser?.fullName || targetTicket?.customerName || "Customer");

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ticketId,
        senderRole: role,
        senderName,
        message: clean,
        createdAt: new Date().toISOString(),
      };

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("chat_messages").insert({
          ticket_id: ticketId,
          sender_role: role,
          sender_name: senderName,
          message: clean,
        });
      }

      commitState((prev) => ({
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === ticketId ? { ...t, messages: [...t.messages, newMsg] } : t
        ),
      }));
    },
    [commitState, currentUser, state.tickets]
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
      const now = new Date().toISOString();
      const resolvedPatch =
        updates.status === "resolved" || updates.status === "closed"
          ? { resolvedAt: now }
          : {};

      const statusMsg: ChatMessage | null =
        updates.status === "resolved"
          ? {
              id: `msg-${Date.now()}-res`,
              ticketId,
              senderRole: "system",
              senderName: "Queue Bot",
              message: `Ticket marked as Resolved by ${currentUser?.fullName || "Staff"}.`,
              createdAt: now,
            }
          : null;

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const dbPatch: Record<string, unknown> = {};
        if (updates.status) dbPatch.status = updates.status;
        if (updates.priority) dbPatch.priority = updates.priority;
        if (updates.internalNotes !== undefined)
          dbPatch.internal_notes = updates.internalNotes;
        if (updates.assignedEmployeeName !== undefined)
          dbPatch.assigned_employee_name = updates.assignedEmployeeName;
        if (resolvedPatch.resolvedAt)
          dbPatch.resolved_at = resolvedPatch.resolvedAt;
        await supabase.from("chat_tickets").update(dbPatch).eq("id", ticketId);
      }

      commitState((prev) => ({
        ...prev,
        tickets: prev.tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                ...updates,
                ...resolvedPatch,
                messages: statusMsg ? [...t.messages, statusMsg] : t.messages,
              }
            : t
        ),
      }));
    },
    [commitState, currentUser]
  );

  // SUPER ADMIN CONTROLS
  const updateSettings = useCallback(
    async (next: AppSettings) => {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase
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
      }

      commitState((prev) => ({
        ...prev,
        settings: next,
      }));
    },
    [commitState]
  );

  const upsertProduct = useCallback(
    async (product: Product) => {
      const supabase = getSupabaseBrowserClient();
      let savedProduct = product;

      if (supabase) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            product.id
          );
        const payload: Record<string, unknown> = {
          slug: product.slug,
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
        if (isUuid) payload.id = product.id;

        const { data: upserted } = await supabase
          .from("products")
          .upsert(payload, { onConflict: "slug" })
          .select()
          .maybeSingle();

        if (upserted?.id) {
          const prodId = String(upserted.id);
          savedProduct = { ...product, id: prodId };
          await supabase
            .from("product_sizes")
            .delete()
            .eq("product_id", prodId);
          if (product.sizes.length > 0) {
            await supabase.from("product_sizes").insert(
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
            );
          }
        }
      }

      commitState((prev) => {
        const exists = prev.products.some(
          (p) => p.id === product.id || p.id === savedProduct.id
        );
        return {
          ...prev,
          products: exists
            ? prev.products.map((p) =>
                p.id === product.id || p.id === savedProduct.id
                  ? savedProduct
                  : p
              )
            : [savedProduct, ...prev.products],
        };
      });
    },
    [commitState]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("products").delete().eq("id", productId);
      }
      commitState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
    },
    [commitState]
  );

  const upsertUser = useCallback(
    async (user: UserProfile) => {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
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
      }
      commitState((prev) => {
        const exists = prev.users.some((u) => u.id === user.id);
        return {
          ...prev,
          users: exists
            ? prev.users.map((u) => (u.id === user.id ? user : u))
            : [...prev.users, user],
        };
      });
    },
    [commitState]
  );

  const toggleEmployeeOnline = useCallback(
    async (userId: string) => {
      const target = state.users.find((u) => u.id === userId);
      const nextOnline = !(target?.isOnline ?? false);
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase
          .from("profiles")
          .update({ is_online: nextOnline })
          .eq("id", userId);
      }
      commitState((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === userId ? { ...u, isOnline: nextOnline } : u
        ),
      }));
    },
    [commitState, state.users]
  );

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      settings: INITIAL_SETTINGS,
      users: INITIAL_USERS,
      products: INITIAL_PRODUCTS,
      inquiries: INITIAL_INQUIRIES,
      orders: INITIAL_ORDERS,
      tickets: INITIAL_TICKETS,
    });
  }, []);

  const value = useMemo<PrintShopContextValue>(
    () => ({
      hydrated,
      supabaseConnected,
      settings: state.settings,
      users: state.users,
      currentUser,
      products: state.products,
      inquiries: state.inquiries,
      orders: state.orders,
      tickets: state.tickets,
      formatCurrency,
      calculateProductPrice,
      login,
      registerCustomer,
      quickSwitchUser,
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
      upsertUser,
      toggleEmployeeOnline,
      resetDemoData,
    }),
    [
      hydrated,
      supabaseConnected,
      state,
      currentUser,
      formatCurrency,
      calculateProductPrice,
      login,
      registerCustomer,
      quickSwitchUser,
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
      upsertUser,
      toggleEmployeeOnline,
      resetDemoData,
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

