export enum UserRole {
  ADMIN = 'ADMIN', // Super Admin
  OWNER = 'OWNER',
  ACCOUNTANT = 'ACCOUNTANT',
  STAFF = 'STAFF'
}

export enum TransactionType {
  SALES = 'SALES',
  EXPENSE = 'EXPENSE'
}

export enum ExpenseCategory {
  FUEL_TRANSPORT = 'Fuel & Transport',
  OFFICE_SUPPLIES = 'Office Supplies',
  FOOD_BEVERAGE = 'Food & Beverage',
  GROCERIES = 'Groceries',
  UTILITIES = 'Utilities',
  REPAIR_MAINTENANCE = 'Repair & Maintenance',
  RENT = 'Rent',
  PROFESSIONAL_SERVICES = 'Professional Services',
  HARDWARE_ELECTRONICS = 'Hardware & Electronics',
  MEDICAL_HEALTH = 'Medical & Health',
  TRAVEL_LODGING = 'Travel & Lodging',
  CLOTHING_RETAIL = 'Clothing & Retail',
  BOOKS_STATIONERY = 'Books & Stationery',
  MISC = 'Miscellaneous'
}

export type UnitType = 'pcs' | 'kg' | 'ltr' | 'meter' | 'box' | 'dozen' | 'set';

export type PaymentMethod = 'Cash' | 'QR' | 'Card' | 'Credit';

export interface InvoiceItem {
  id: string;
  description: string;
  unit: UnitType;
  quantity: number;
  rate: number | '';
  amount: number;
}

export interface InvoiceDetails {
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountPercentage?: number; // Added: Percentage used for calculation
  taxableAmount: number;
  vatAmount: number;
  grandTotal: number;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerPan?: string;
  date: string;
  paymentMethod: PaymentMethod;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  category: ExpenseCategory | 'Sales Revenue';
  amount: number;
  vatAmount?: number;
  partyName: string; // Vendor or Customer
  partyPan?: string;
  billNumber?: string;
  imageUrl?: string;
  invoiceDetails?: InvoiceDetails;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status: 'Active' | 'Inactive';
}

export interface BusinessProfile {
  id?: string;
  name: string;
  pan: string;
  address: string; // Formatted string (e.g. "Ktm, Bagmati")
  // Detailed Address Fields
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  country?: string;
  zipCode?: string;
  
  ownerName: string;
  phone: string;
  email: string;
  type: 'Sole Proprietor' | 'Partnership' | 'Pvt Ltd';
  vatNumber?: string;
  role: UserRole; // Current logged in user's role
  isVerified?: boolean; // Admin verification status for PAN/VAT
  panPhoto?: string; // Base64 encoded image string
  logo?: string; // Base64 encoded logo

  // Tax Logic
  taxSystem: 'PAN' | 'VAT'; 
  annualTurnover?: number;
  
  // App Settings
  enableBiometricLogin?: boolean;
}