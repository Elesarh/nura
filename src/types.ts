export interface User {
  id: string;
  email: string;
  role: 'superadmin' | 'storeadmin' | 'storeemployee' | 'deactivated';
  shopId?: string | null;
  createdAt: string;
  hasChangedCredentials?: boolean;
}

export interface LicensePlan {
  id: string;
  name: string;
  durationMonths: number;
  durationDays?: number; // Optional days duration
  features: string[]; // e.g. 'ai_assistant', 'advanced_reports'
  price: number;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface BankCard {
  number: string;
  bankName: string;
  ownerName?: string;
}

export interface Shop {
  id: string;
  name: string;
  logoUrl?: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  bankCards?: BankCard[];
  status: 'active' | 'disabled' | 'expired';
  licensePlanId?: string;
  licenseExpiresAt?: string;
  features?: string[];
  createdAt: string;
  storeAccountEmail?: string;
  storeAccountPassword?: string;
  queuedLicensePlanId?: string;
  queuedLicenseMonths?: number;
  queuedLicenseDays?: number;
  geminiApiKey?: string;
  geminiApiKeys?: GeminiKeyConfig[];
}

export interface GeminiKeyConfig {
  key: string;
  model: string;
  label?: string;
}

export interface Product {
  id: string;
  shopId: string;
  barcode: string;
  name: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  minimumStock: number;
  unit: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  shopId: string;
  fullName: string;
  phone: string;
  address: string;
  notes: string;
  totalDebt?: number;
  totalSpent?: number;
  photoUrl?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  shopId: string;
  customerId?: string | null;
  totalAmount: number;
  discount: number;
  paymentType: 'Cash' | 'Card' | 'Debt' | 'DebtAddition' | 'DebtPayment';
  items?: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  createdAt: string;
  isAdjustment?: boolean;
  note?: string;
}

export interface Category {
  id: string;
  shopId: string;
  name: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  shopId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
}

export interface Debt {
  id: string;
  shopId: string;
  customerId: string;
  debtAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'paid' | 'unpaid' | 'partial';
  saleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseTransaction {
  id: string;
  shopId: string;
  shopName: string;
  planId: string;
  planName: string;
  amount: number;
  months: number;
  days?: number; // Optional days duration
  createdAt: string;
}

export interface Log {
  id: string;
  type: 'admin' | 'shop';
  shopId?: string | null;
  userId: string;
  userEmail?: string;
  action: string;
  details: string;
  ip?: string | null;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  shopId: string;
  visitorName: string;
  visitorPhone?: string;
  companyName?: string;
  status: 'ordered' | 'delivered';
  totalAmount: number;
  items: {
    name: string;
    quantity: number;
    purchasePrice: number;
  }[];
  invoiceNumber?: string;
  notes?: string;
  orderDate: string;
  deliveryDate?: string;
  manualInvoiceUrl?: string;
}
