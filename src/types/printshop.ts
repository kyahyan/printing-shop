export type UserRole = "customer" | "employee" | "super_admin";

export interface AppSettings {
  shopName: string;
  tagline: string;
  currencyCode: string;
  currencySymbol: string;
  taxRate: number;
  quotationValidityDays: number;
  orderPrefix: string;
  quotePrefix: string;
  ticketPrefix: string;
  contactEmail: string;
  contactPhone: string;
  shopAddress: string;
  businessHours: string;
  paymentInstructions: string;
  autoAssignTickets: boolean;
  maxActiveChatsPerEmployee: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  isOnline: boolean;
  passwordHint?: string; // Used only for local preview mode before Supabase credentials are connected
  createdAt: string;
}

export interface ProductSizeTier {
  id: string;
  sizeLabel: string;
  dimensions: string;
  unitPrice: number;
  bulk100Price?: number;
  bulk500Price?: number;
  setupFee: number;
}

export interface MaterialOption {
  name: string;
  priceMultiplier: number; // e.g., 1.0 = standard, 1.25 = +25%
}

export interface FinishOption {
  name: string;
  addPerUnit: number; // flat surcharge per piece/unit
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  baseUnit: string;
  minOrderQty: number;
  leadTimeDays: string;
  badge?: string;
  featured: boolean;
  isActive: boolean;
  accentColor: "cyan" | "magenta" | "amber" | "indigo" | "emerald" | "rose";
  sizes: ProductSizeTier[];
  materials: MaterialOption[];
  finishes: FinishOption[];
}

export type QuotationStatus =
  | "pending_review"
  | "quoted"
  | "negotiating"
  | "approved"
  | "converted_to_order"
  | "declined";

export interface InquiryQuotation {
  id: string;
  referenceNumber: string;
  customerId?: string;
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
  status: QuotationStatus;
  quotedUnitPrice?: number;
  quotedSetupFee?: number;
  quotedDiscount?: number;
  quotedTotal?: number;
  staffRemarks?: string;
  validUntil?: string;
  handledBy?: string;
  handledByName?: string;
  convertedOrderRef?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderSource = "online" | "walk_in" | "from_quotation";
export type PaymentStatus = "unpaid" | "downpayment_paid" | "paid";
export type ProductionStatus =
  | "received"
  | "prepress_check"
  | "printing"
  | "finishing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  sizeLabel: string;
  material: string;
  finish: string;
  quantity: number;
  unitPrice: number;
  setupFee: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  referenceNumber: string;
  quotationId?: string;
  quotationRef?: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderSource: OrderSource;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  productionStatus: ProductionStatus;
  deliveryMethod: "pickup" | "courier";
  notes?: string;
  takenByEmployeeId?: string;
  takenByName?: string;
  estimatedCompletion?: string;
  createdAt: string;
  updatedAt: string;
}

export type TicketPriority = "normal" | "high" | "urgent";
export type TicketStatus = "queued" | "active" | "resolved" | "closed";

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderRole: "customer" | "employee" | "system";
  senderName: string;
  message: string;
  createdAt: string;
}

export interface ChatTicket {
  id: string;
  ticketNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  topic: string;
  linkedReference?: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  internalNotes?: string;
  queuedAt: string;
  claimedAt?: string;
  resolvedAt?: string;
  messages: ChatMessage[];
}

