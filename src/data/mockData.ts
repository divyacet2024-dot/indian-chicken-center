import { Truck, Trip, Order, Customer, LedgerTransaction, Expense, ChickenLoss, DashboardSummary } from '@/types';

export const initialTrucks: Truck[] = [];

export const initialTrips: Trip[] = [];

export const initialCustomers: Customer[] = [];

export const initialOrders: Order[] = [];

export const initialLedgerTransactions: LedgerTransaction[] = [];

export const initialExpenses: Expense[] = [];

export const initialChickenLoss: ChickenLoss[] = [];

export const initialSummary: DashboardSummary = {
  todaySales: 0,
  todayExpenses: 0,
  todayProfit: 0,
  availableStockKg: 0,
  todayLossKg: 0,
  outstandingBalanceTotal: 0,
  activeTripsCount: 0,
  activeTrucksCount: 0,
  todayOrdersCount: 0,
};
