import {
  Truck,
  Trip,
  Order,
  Customer,
  LedgerTransaction,
  Expense,
  ChickenLoss,
  DashboardSummary,
} from '@/types';

import {
  initialTrucks,
  initialTrips,
  initialCustomers,
  initialOrders,
  initialExpenses,
  initialChickenLoss,
  initialLedgerTransactions,
} from '@/data/mockData';

const STORAGE_KEYS = {
  TRUCKS: 'icc_trucks_v2',
  TRIPS: 'icc_trips_v2',
  CUSTOMERS: 'icc_customers_v2',
  ORDERS: 'icc_orders_v2',
  EXPENSES: 'icc_expenses_v2',
  LOSSES: 'icc_losses_v2',
  LEDGER: 'icc_ledger_v2',
};

// Helper for safe localStorage access in SSR Next.js environment
const getStoredData = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return fallback;
  }
};

const setStoredData = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

export const DataService = {
  // Load initial or persisted state
  loadInitialData: () => {
    return {
      trucks: getStoredData<Truck[]>(STORAGE_KEYS.TRUCKS, initialTrucks),
      trips: getStoredData<Trip[]>(STORAGE_KEYS.TRIPS, initialTrips),
      customers: getStoredData<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers),
      orders: getStoredData<Order[]>(STORAGE_KEYS.ORDERS, initialOrders),
      expenses: getStoredData<Expense[]>(STORAGE_KEYS.EXPENSES, initialExpenses),
      losses: getStoredData<ChickenLoss[]>(STORAGE_KEYS.LOSSES, initialChickenLoss),
      ledger: getStoredData<LedgerTransaction[]>(STORAGE_KEYS.LEDGER, initialLedgerTransactions),
    };
  },

  // Save state methods (Designed to be seamlessly replaced with API endpoints)
  saveTrucks: (trucks: Truck[]) => setStoredData(STORAGE_KEYS.TRUCKS, trucks),
  saveTrips: (trips: Trip[]) => setStoredData(STORAGE_KEYS.TRIPS, trips),
  saveCustomers: (customers: Customer[]) => setStoredData(STORAGE_KEYS.CUSTOMERS, customers),
  saveOrders: (orders: Order[]) => setStoredData(STORAGE_KEYS.ORDERS, orders),
  saveExpenses: (expenses: Expense[]) => setStoredData(STORAGE_KEYS.EXPENSES, expenses),
  saveLosses: (losses: ChickenLoss[]) => setStoredData(STORAGE_KEYS.LOSSES, losses),
  saveLedger: (ledger: LedgerTransaction[]) => setStoredData(STORAGE_KEYS.LEDGER, ledger),

  // Reset to clean state
  resetData: () => {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('icc_customers_v1');
    localStorage.removeItem('icc_orders_v1');
    localStorage.removeItem('icc_ledger_v1');
  },
};
