import { ObjectId } from 'mongodb';

export interface UserDoc {
  _id?: ObjectId;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role: 'buyer' | 'seller' | 'admin';
  status?: string;
  phone?: string;
  companyName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NumberDoc {
  _id?: ObjectId;
  number: string; // E.164 format e.g. "12125551234"
  formattedNumber: string; // "(212) 555-1234"
  countryCode: string;
  areaCode: string;
  numberType: 'local' | 'toll_free' | 'vanity';
  vanityText?: string;
  price: number; // cents
  monthlyPrice: number; // cents
  setupFee: number; // cents
  licensePrice?: number; // cents
  source: 'inventory' | 'numberbarn';
  status: 'available' | 'reserved' | 'sold' | 'inactive';
  isVanity: boolean;
  isPremium: boolean;
  allowOffers?: boolean;
  minimumOffer?: number; // cents
  offerOnly?: boolean;
  features: string[];
  description?: string;
  city?: string;
  state?: string;
  transferInfo?: {
    accountNumber?: string;
    pin?: string;
  };
  ownerId?: ObjectId;
  orderId?: ObjectId;
  soldAt?: Date;
  reservedBy?: ObjectId;
  reservedAt?: Date;
  reservationExpiresAt?: Date;
  createdBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  numberId?: ObjectId;
  number: string; // formatted, e.g. "(212) 555-1234"
  rawNumber?: string; // digits only
  numberType: string;
  source: 'inventory' | 'numberbarn';
  price: number; // cents
  setupFee: number; // cents
  monthlyPrice: number; // cents
  planType: string;
  numberbarnTn?: string;
  /**
   * Inventory numbers are provisioned to the buyer the moment payment clears.
   * NumberBarn numbers cannot be bought through their public API, so they land
   * in the admin fulfilment queue instead.
   */
  fulfillmentStatus?: 'pending' | 'provisioned' | 'awaiting_fulfillment' | 'failed' | 'refunded';
}

/** A single charge line shown at checkout — mirrors the admin `fees` setting. */
export interface OrderFeeLine {
  id: string;
  label: string;
  unitAmount: number; // cents — per item, or per order
  perItem: boolean;
  quantity: number;
  total: number; // cents
}

export interface BillingAddress {
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phoneNumber?: string;
}

export interface OrderDoc {
  _id?: ObjectId;
  orderNumber: string; // "ND-YYYYMMDD-NNN"
  userId: ObjectId;
  userEmail?: string;
  items: OrderItem[];
  feeLines: OrderFeeLine[];
  subtotal: number; // cents — sum of item prices
  feesTotal: number; // cents — sum of feeLines
  setupFees: number; // cents — retained for older orders
  monthlyTotal: number; // cents — recurring, not charged today
  totalAmount: number; // cents — the amount actually charged
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentId?: string; // gateway transaction id
  paymentRef?: ObjectId; // _id in the payments collection
  paymentStatus?: 'unpaid' | 'paid' | 'declined' | 'held' | 'refunded' | 'voided';
  offerId?: ObjectId;
  paymentAttempts?: number;
  lastPaymentError?: string;
  billTo?: BillingAddress;
  numberbarnOrderIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/** One row per gateway transaction attempt — approved or not. */
export interface PaymentDoc {
  _id?: ObjectId;
  orderId: ObjectId;
  orderNumber: string;
  userId: ObjectId;
  // Denormalised so the admin table never needs a join to render.
  userEmail: string;
  userName: string;
  gateway: 'authorizenet';
  environment: 'sandbox' | 'production';
  amount: number; // cents
  currency: 'USD';
  status: 'approved' | 'declined' | 'error' | 'held' | 'voided' | 'refunded';
  transactionId?: string | null;
  authCode?: string | null;
  responseCode?: string | null;
  reasonCode?: string | null;
  message: string;
  avsResultCode?: string | null;
  cvvResultCode?: string | null;
  cardLast4?: string | null;
  cardType?: string | null;
  billTo?: BillingAddress;
  /** Snapshot of what was bought, so the record stays readable forever. */
  items: {
    number: string;
    numberType: string;
    source: 'inventory' | 'numberbarn';
    price: number; // cents
    planType: string;
  }[];
  refundedAmount?: number; // cents
  refundedAt?: Date;
  voidedAt?: Date;
  raw?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNumberDoc {
  _id?: ObjectId;
  userId: ObjectId;
  numberId?: ObjectId;
  number: string;
  formattedNumber: string;
  numberType: string;
  areaCode: string;
  source: 'inventory' | 'numberbarn';
  plan: 'park' | 'forward' | 'unlimited' | 'business';
  monthlyPrice: number; // cents
  status: 'active' | 'cancelled' | 'suspended' | 'porting';
  forwardingNumber?: string;
  forwardingEnabled: boolean;
  voicemailEnabled: boolean;
  portingStatus?: 'not_started' | 'pending' | 'in_progress' | 'completed';
  portingNotes?: string;
  orderId: ObjectId;
  purchasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferDoc {
  _id?: ObjectId;
  buyerId: ObjectId;
  sellerId?: ObjectId | null; // null for admin-owned inventory numbers
  numberId: ObjectId;
  number: string;
  formattedNumber: string;
  listingPrice: number; // cents — the number's listed price
  offerAmount: number; // cents — buyer's offer
  counterAmount?: number; // cents — seller/admin counter
  buyerMessage?: string;
  sellerResponse?: string;
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'cancelled' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
}

export interface NotificationDoc {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  message: string;
  type: 'order' | 'offer' | 'system' | 'billing';
  read: boolean;
  readAt?: Date;
  actionUrl?: string;
  entityType?: string; // 'offer', 'order', 'number'
  entityId?: string;
  createdAt: Date;
}

export interface FaqDoc {
  _id?: ObjectId;
  question: string;
  answer: string;
  category: string;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentPageDoc {
  _id?: ObjectId;
  slug: string; // 'about', 'terms', 'privacy'
  title: string;
  content: string; // HTML or markdown
  updatedAt: Date;
}

export interface BlogPostDoc {
  _id?: ObjectId;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  published: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsDoc {
  _id?: ObjectId;
  key: string;
  value: unknown;
  updatedAt: Date;
}
