export type TruckStatus = 'available' | 'on_trip' | 'returning' | 'maintenance';

export interface Truck {
  id: string;
  name: string;
  regNumber: string;
  status: TruckStatus;
  driverName: string;
  loadedKg: number;
  currentTripId?: string;
  currentRoute?: string;
}

export interface Trip {
  id: string;
  truckId: string;
  truckName: string;
  driverName: string;
  startLocation: string;
  destination: string;
  startTime: string;
  loadedQuantityKg: number;
  purchasePricePerKg: number;
  loadedTotalCost: number;
  deliveredQuantityKg: number;
  wastageQuantityKg: number;
  remainingQuantityKg: number;
  fuelExpense: number;
  labourExpense: number;
  otherExpense: number;
  totalSales: number;
  netProfit: number;
  status: 'active' | 'distributing' | 'returning' | 'completed' | 'stopped_delayed';
}

export type OrderStatus = 'new' | 'confirmed' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'paid' | 'partial' | 'pending';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  shopName: string;
  quantityKg: number;
  pricePerKg: number;
  totalAmount: number;
  assignedTruckId?: string;
  assignedTruckName?: string;
  tripId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  shopName: string;
  customerName: string;
  contactNumber: string;
  address: string;
  currentBalance: number;
  totalPurchases: number;
  lastPurchaseDate: string;
  latitude?: number;
  longitude?: number;
}

export interface LedgerTransaction {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  type: 'purchase' | 'payment';
  quantityKg?: number;
  pricePerKg?: number;
  amount: number;
  previousBalance: number;
  newBalance: number;
  paymentMethod?: string;
  notes?: string;
}

export type ExpenseCategory = 'fuel' | 'labour' | 'maintenance' | 'food' | 'other';

export interface FuelDetails {
  litres: number;
  pricePerLitre: number;
  fuelType: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes: string;
  truckId?: string;
  truckName?: string;
  tripId?: string;
  fuelDetails?: FuelDetails;
}

export interface ChickenLoss {
  id: string;
  truckId: string;
  truckName: string;
  tripId?: string;
  quantityKg: number;
  costPerKg: number;
  totalLossValue: number;
  date: string;
  reason: string;
}

export interface DashboardSummary {
  todaySales: number;
  todayExpenses: number;
  todayProfit: number;
  availableStockKg: number;
  todayLossKg: number;
  outstandingBalanceTotal: number;
  activeTripsCount: number;
  activeTrucksCount: number;
  todayOrdersCount: number;
}

export interface AIChatResponse {
  answer: string;
  tool_used: string;
  data_source: string;
  language?: string;
  provider?: string;
}

// Voice Pipeline Types
export type SupportedLanguage = 'en' | 'kn' | 'hi' | 'te' | 'ta' | 'ml' | 'ur' | 'mr' | 'bn';

export interface VoiceLocale {
  code: string;
  label: string;
}

export interface VoiceTextRequest {
  text: string;
  language?: SupportedLanguage | null;
}

export interface VoiceTextResponse {
  answer: string;
  tool_used: string;
  data_source: string;
  language: string;
  intent: string;
  requires_confirmation: boolean;
  tts_provider: string;
  voice_locale: string;
}

export interface TestVoiceRequest {
  language?: SupportedLanguage | null;
}

export interface TestVoiceResponse {
  language: string;
  text: string;
  tts_provider: string;
  voice_locale: string;
}

export interface VoiceLocalesResponse {
  default_provider: string;
  locales: Record<string, string>;
  test_samples: Record<string, string>;
}

export interface VoiceStatus {
  status: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  error: string | null;
  isSupported: boolean;
}
