'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { KPISummary } from '@/components/dashboard/KPISummary';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ActiveTrucksCard } from '@/components/dashboard/ActiveTrucksCard';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';
import { CustomerLedgerView } from '@/components/dashboard/CustomerLedgerView';
import { ProfitFormulaBreakdown } from '@/components/dashboard/ProfitFormulaBreakdown';
import { AIAssistantDrawer } from '@/components/dashboard/AIAssistantDrawer';
import { LocationSharingControl } from '@/components/maps/LocationSharingControl';
const TruckTrackingMap = dynamic(() => import('@/components/maps/TruckTrackingMap'), { ssr: false });

// Authentication Screen
import { LoginPage } from '@/components/auth/LoginPage';

// Form & Information Modals
import { StartTripModal } from '@/components/modals/StartTripModal';
import { AddOrderModal } from '@/components/modals/AddOrderModal';
import { AddCustomerModal } from '@/components/modals/AddCustomerModal';
import { RecordLossModal } from '@/components/modals/RecordLossModal';
import { AddExpenseModal } from '@/components/modals/AddExpenseModal';
import { RecordPaymentModal } from '@/components/modals/RecordPaymentModal';
import { WhatsAppBillModal } from '@/components/modals/WhatsAppBillModal';
import { AddTruckModal } from '@/components/modals/AddTruckModal';
import { DailyExpensesModal } from '@/components/modals/DailyExpensesModal';
import { OwnerProfileModal } from '@/components/modals/OwnerProfileModal';

// Persistence Service & API Client
import { DataService } from '@/services/dataService';
import { ApiClient } from '@/services/apiClient';

import { Truck, Trip, Order, Customer, Expense, ChickenLoss, LedgerTransaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Calendar, RotateCcw } from 'lucide-react';

export default function SaaSPlatformPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ name: string; role: string } | null>(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isClient, setIsClient] = useState(false);
  const [isDataHydrated, setIsDataHydrated] = useState(false);

  // Core Application State
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [losses, setLosses] = useState<ChickenLoss[]>([]);
  const [ledger, setLedger] = useState<LedgerTransaction[]>([]);
  const [profitReport, setProfitReport] = useState<any>(undefined);
  const [trackedLocation, setTrackedLocation] = useState<{ latitude: number; longitude: number; locationName?: string; recordedAt?: string; truckName: string; status: string } | null>(null);

  // Modal Visibility State
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isRecordLossOpen, setIsRecordLossOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isAddTruckOpen, setIsAddTruckOpen] = useState(false);
  const [isDailyExpensesOpen, setIsDailyExpensesOpen] = useState(false);
  const [isOwnerProfileOpen, setIsOwnerProfileOpen] = useState(false);
  const [selectedCustomerIdForPayment, setSelectedCustomerIdForPayment] = useState<string | undefined>(undefined);
  const [startTripPrefill, setStartTripPrefill] = useState<Partial<{
    truckId: string;
    startLocation: string;
    destination: string;
    loadedKg: number;
    pricePerKg: number;
    loadingLocation: string;
  }> | undefined>(undefined);

  // WhatsApp Bill Modal State
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);

  // Toast Notification
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Sync Customers from FastAPI Backend
  const refreshCustomers = useCallback(async () => {
    try {
      const apiCustomers = await ApiClient.getCustomers();
      if (Array.isArray(apiCustomers)) {
        setCustomers(apiCustomers);
      }
    } catch (err) {
      console.warn('Unable to load customers:', err);
    }
  }, []);

  // Sync Trucks and Trips from FastAPI Backend
  const refreshTrucksAndTrips = useCallback(async () => {
    try {
      const [apiTrucks, apiTrips] = await Promise.all([
        ApiClient.getTrucks(),
        ApiClient.getTrips(),
      ]);

      if (Array.isArray(apiTrucks)) {
        setTrucks(apiTrucks);
      }
      if (Array.isArray(apiTrips)) {
        setTrips(apiTrips);
      }
    } catch (err) {
      console.warn('Unable to load trucks/trips:', err);
    }
  }, []);

  // Sync Orders from FastAPI Backend
  const refreshOrders = useCallback(async () => {
    try {
      const apiOrders = await ApiClient.getOrders();
      if (Array.isArray(apiOrders)) {
        setOrders(apiOrders);
      }
    } catch (err) {
      console.warn('Unable to load orders:', err);
    }
  }, []);

  // Sync Expenses from FastAPI Backend
  const refreshExpenses = useCallback(async () => {
    try {
      const apiExpenses = await ApiClient.getExpenses();
      if (Array.isArray(apiExpenses)) {
        setExpenses(apiExpenses);
      }
    } catch (err) {
      console.warn('Unable to load expenses:', err);
    }
  }, []);

  // Sync Profit Report from FastAPI Backend
  const refreshProfitReport = useCallback(async () => {
    try {
      const rep = await ApiClient.getProfitReport();
      if (rep) {
        setProfitReport(rep);
      }
    } catch (err) {
      console.warn('Unable to load profit report:', err);
    }
  }, []);

  // Validate a persisted JWT before rendering or loading any protected dashboard data.
  useEffect(() => {
    setIsClient(true);

    const checkAuth = async () => {
      const storedToken = ApiClient.getStoredToken();
      if (!storedToken) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      try {
        const me = await ApiClient.getMe();
        setUserProfile({
          name: me.business?.owner_name || 'Owner',
          role: me.role === 'owner' ? 'Business Owner & Manager' : me.role,
        });
        setIsAuthenticated(true);
      } catch (err) {
        console.warn('Stored token invalid or expired:', err);
        ApiClient.setToken(null);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Dashboard requests are only allowed after /api/auth/me has validated the JWT.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const loadAuthenticatedData = () => {
      const initial = DataService.loadInitialData();
      setTrucks(initial.trucks);
      setTrips(initial.trips);
      setCustomers(initial.customers);
      setOrders(initial.orders);
      setExpenses(initial.expenses);
      setLosses(initial.losses);
      setLedger(initial.ledger);
      setIsDataHydrated(true);

      refreshCustomers();
      refreshTrucksAndTrips();
      refreshOrders();
      refreshExpenses();
      refreshProfitReport();
    };

    loadAuthenticatedData();
  }, [authLoading, isAuthenticated, refreshCustomers, refreshTrucksAndTrips, refreshOrders, refreshExpenses, refreshProfitReport]);

  // Sync state changes with StorageService
  useEffect(() => { if (isClient && isDataHydrated) DataService.saveTrucks(trucks); }, [trucks, isClient, isDataHydrated]);
  useEffect(() => { if (isClient && isDataHydrated) DataService.saveTrips(trips); }, [trips, isClient, isDataHydrated]);
  useEffect(() => { if (isClient && isDataHydrated) DataService.saveCustomers(customers); }, [customers, isClient, isDataHydrated]);
  useEffect(() => { if (isClient && isDataHydrated) DataService.saveOrders(orders); }, [orders, isClient, isDataHydrated]);
  useEffect(() => { if (isClient && isDataHydrated) DataService.saveExpenses(expenses); }, [expenses, isClient, isDataHydrated]);
  useEffect(() => { if (isClient && isDataHydrated) DataService.saveLosses(losses); }, [losses, isClient, isDataHydrated]);
  useEffect(() => { if (isClient && isDataHydrated) DataService.saveLedger(ledger); }, [ledger, isClient, isDataHydrated]);

  const handleResetData = () => {
    if (confirm('Reset application data back to default testing baseline?')) {
      DataService.resetData();
      const initial = DataService.loadInitialData();
      setTrucks(initial.trucks);
      setTrips(initial.trips);
      setCustomers(initial.customers);
      setOrders(initial.orders);
      setExpenses(initial.expenses);
      setLosses(initial.losses);
      setLedger(initial.ledger);
      refreshCustomers();
      refreshTrucksAndTrips();
      refreshOrders();
      refreshExpenses();
      refreshProfitReport();
      showToast('🔄 Application data reset');
    }
  };

  const handleSignOut = () => {
    ApiClient.setToken(null);
    setIsAuthenticated(false);
    showToast('Signed out of SaaS account');
  };

  // Business Metric Calculations
  const todaySales = profitReport ? profitReport.salesRevenue : orders.reduce((acc, o) => acc + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const todayExpenses = profitReport ? profitReport.totalExpenses : expenses.reduce((acc, e) => acc + e.amount, 0);
  const todayProfit = profitReport ? profitReport.netProfit : (todaySales - todayExpenses);
  const availableStockKg = trucks.reduce((acc, t) => acc + t.loadedKg, 0);
  const todayLossKg = profitReport ? profitReport.totalWastageKg : losses.reduce((acc, l) => acc + l.quantityKg, 0);
  const outstandingBalanceTotal = customers.reduce((acc, c) => acc + c.currentBalance, 0);
  const activeTripsCount = trucks.filter((t) => t.status === 'on_trip').length;
  const activeTrip = trips.find((trip) => ['active', 'distributing', 'returning', 'stopped_delayed'].includes(trip.status));

  const summary = {
    todaySales,
    todayExpenses,
    todayProfit,
    availableStockKg,
    todayLossKg,
    outstandingBalanceTotal,
    activeTripsCount,
    activeTrucksCount: trucks.length,
    todayOrdersCount: orders.length,
  };

  // Connected to POST /api/trips
  const handleStartTrip = async (tripData: any) => {
    try {
      await ApiClient.startTrip({
        truckId: tripData.truckId,
        startingLocation: tripData.startLocation,
        destination: tripData.destination,
        loadingLocation: tripData.loadingLocation,
        loadedKg: tripData.loadedQuantityKg,
        pricePerKg: tripData.purchasePricePerKg,
      });

      await Promise.all([refreshTrucksAndTrips(), refreshProfitReport()]);
      setStartTripPrefill(undefined);
      showToast(`🚚 Trip started for ${tripData.truckName} (${tripData.loadedQuantityKg} kg chicken loaded)`);
    } catch (err: any) {
      showToast(`⚠️ API Error: ${err.message || 'Could not start trip'}`);
      throw err;
    }
  };

  const handlePrepareStartTrip = (prefill: NonNullable<typeof startTripPrefill>) => {
    setStartTripPrefill(prefill);
    setIsStartTripOpen(true);
  };

  const handleShowTruckLocation = async (truckId?: string) => {
    const trip = trips.find((item) => item.truckId === truckId && ['active', 'distributing', 'returning', 'stopped_delayed'].includes(item.status))
      || trips.find((item) => ['active', 'distributing', 'returning', 'stopped_delayed'].includes(item.status));
    if (!trip) {
      setTrackedLocation(null);
      showToast('No active trip is available for that truck.');
      return;
    }
    try {
      const location = await ApiClient.getLatestTripLocation(trip.id);
      setTrackedLocation({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        locationName: location.location_name,
        recordedAt: location.recorded_at,
        truckName: trip.truckName,
        status: trip.status,
      });
      setActiveTab('dashboard');
    } catch (err: any) {
      setTrackedLocation(null);
      showToast(err.message || 'No recent truck location is available.');
    }
  };

  // Connected to POST /api/trucks
  const handleAddTruck = async (truckData: any) => {
    try {
      await ApiClient.createTruck({
        registrationNumber: truckData.regNumber,
        notes: truckData.name,
      });

      await refreshTrucksAndTrips();
      showToast(`🚚 ${truckData.name} registered into distribution fleet!`);
    } catch (err: any) {
      showToast(`⚠️ API Error: ${err.message || 'Could not register truck'}`);
      throw err;
    }
  };

  // Connected to POST /api/orders
  const handleAddOrder = async (orderData: any) => {
    try {
      await ApiClient.createOrder({
        tripId: orderData.tripId,
        customerId: orderData.customerId,
        quantityKg: orderData.quantityKg,
        sellingPricePerKg: orderData.pricePerKg,
        notes: orderData.notes,
      });

      await Promise.all([
        refreshOrders(),
        refreshCustomers(),
        refreshTrucksAndTrips(),
        refreshProfitReport(),
      ]);

      showToast(`🛍️ Order of ${orderData.quantityKg} kg recorded for ${orderData.shopName}`);
    } catch (err: any) {
      showToast(`⚠️ API Error: ${err.message || 'Could not save order'}`);
      throw err;
    }
  };

  // Connected to POST /api/customers
  const handleAddCustomer = async (customerData: any) => {
    try {
      await ApiClient.createCustomer({
        shopName: customerData.shopName,
        customerName: customerData.customerName,
        contactNumber: customerData.contactNumber,
        address: customerData.address,
        openingBalance: customerData.openingBalance,
      });

      await refreshCustomers();
      showToast(`👥 Customer account registered for ${customerData.shopName}`);
    } catch (err: any) {
      showToast(`⚠️ API Error: ${err.message || 'Could not register customer'}`);
      throw err;
    }
  };

  // Connected to POST /api/trips/{trip_id}/wastage
  const handleRecordLoss = async (lossData: any) => {
    try {
      const activeTrip = trips.find((t) => t.id === lossData.tripId || t.status === 'active') || trips[0];
      if (!activeTrip) {
        throw new Error('No active trip found for recording chicken loss');
      }

      await ApiClient.recordWastage(activeTrip.id, {
        quantityKg: lossData.quantityKg,
        reason: lossData.reason,
        notes: lossData.notes,
      });

      await Promise.all([refreshTrucksAndTrips(), refreshProfitReport()]);
      showToast(`⚠️ Recorded ${lossData.quantityKg} kg chicken loss on ${activeTrip.startLocation} → ${activeTrip.destination}`);
    } catch (err: any) {
      showToast(`⚠️ API Error: ${err.message || 'Could not record wastage'}`);
      throw err;
    }
  };

  // Connected to POST /api/trips/{trip_id}/expenses
  const handleAddExpense = async (expenseData: any) => {
    try {
      const activeTrip = trips.find((t) => t.id === expenseData.tripId || t.status === 'active') || trips[0];
      if (!activeTrip) {
        throw new Error('No active trip found for recording expense');
      }

      await ApiClient.recordExpense(activeTrip.id, {
        category: expenseData.category,
        amount: expenseData.amount,
        quantity: expenseData.quantity,
        unitPrice: expenseData.unitPrice,
        description: expenseData.description,
      });

      await Promise.all([
        refreshExpenses(),
        refreshTrucksAndTrips(),
        refreshProfitReport(),
      ]);

      showToast(`💸 Recorded ${expenseData.category.toUpperCase()} expense for active trip`);
    } catch (err: any) {
      showToast(`⚠️ API Error: ${err.message || 'Could not record expense'}`);
      throw err;
    }
  };

  // Connected to POST /api/customers/{customer_id}/payments
  const handleRecordPayment = async (paymentData: any) => {
    try {
      await ApiClient.recordPayment(paymentData.customerId, {
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        comments: paymentData.notes,
      });

      await Promise.all([refreshCustomers(), refreshProfitReport()]);
      showToast(`💰 Payment of ₹${paymentData.amount.toLocaleString('en-IN')} recorded for ${paymentData.shopName}`);
    } catch (err: any) {
      showToast(`⚠️ API Error: ${err.message || 'Could not record payment'}`);
      throw err;
    }
  };

  // Connected to POST /api/orders/{order_id}/deliver
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await ApiClient.updateOrderStatus(orderId, status);
      await Promise.all([
        refreshOrders(),
        refreshCustomers(),
        refreshTrucksAndTrips(),
        refreshProfitReport(),
      ]);
      showToast(`✅ Order status updated to ${status.toUpperCase()}`);
    } catch (err: any) {
      showToast(`⚠️ API Error: ${err.message || 'Could not update order status'}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center gap-4" aria-busy="true">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-3xl shadow-lg shadow-emerald-950/50">
          🐔
        </div>
        <div className="text-center">
          <p className="text-white font-black text-lg tracking-tight">Indian Chicken Center</p>
          <p className="text-emerald-400 text-xs font-semibold tracking-wider uppercase mt-0.5">Verifying session…</p>
        </div>
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    );
  }

  // Render SaaS Login / Activation Screen if Not Authenticated
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setUserProfile(user);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <AppShell
      ownerName={userProfile?.name}
      activeTripsCount={activeTripsCount}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenStartTrip={() => setIsStartTripOpen(true)}
      onOpenAddOrder={() => setIsAddOrderOpen(true)}
      onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
      onOpenRecordLoss={() => setIsRecordLossOpen(true)}
      onOpenAddExpense={() => setIsAddExpenseOpen(true)}
      onOpenRecordPayment={() => {
        setSelectedCustomerIdForPayment(undefined);
        setIsRecordPaymentOpen(true);
      }}
      onOpenOwnerProfile={() => setIsOwnerProfileOpen(true)}
      onSignOut={handleSignOut}
    >
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white font-bold text-sm px-4 py-3 rounded-xl shadow-2xl border border-emerald-500 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{notification}</span>
        </div>
      )}

      {/* Main Dashboard View */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Business Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Welcome back{userProfile?.name ? `, ${userProfile.name}` : ''}! 👋
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
                Indian Chicken Center • Live SaaS Business & Fleet Operations
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleResetData}
                className="px-3 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                title="Reset testing data back to baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Test Data</span>
              </button>
              <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Today (Live)</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <QuickActions
            onOpenStartTrip={() => setIsStartTripOpen(true)}
            onOpenAddOrder={() => setIsAddOrderOpen(true)}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            onOpenRecordLoss={() => setIsRecordLossOpen(true)}
            onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            onOpenRecordPayment={() => {
              setSelectedCustomerIdForPayment(undefined);
              setIsRecordPaymentOpen(true);
            }}
            onOpenDailyExpenses={() => setIsDailyExpensesOpen(true)}
          />

          {/* KPI Financial Overview */}
          <KPISummary summary={summary} />

          {/* Operations Assistant & Profit Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfitFormulaBreakdown summary={summary} expenses={expenses} losses={losses} profitReport={profitReport} />
            <AIAssistantDrawer
              ownerName={userProfile?.name || ''}
              trucks={trucks}
              onPrepareStartTrip={handlePrepareStartTrip}
              onShowTruckLocation={handleShowTruckLocation}
            />
          </div>

          {activeTrip && <LocationSharingControl tripId={activeTrip.id} onLocationSent={(location) => {
            setTrackedLocation({
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
              recordedAt: location.recorded_at,
              truckName: activeTrip.truckName,
              status: activeTrip.status,
            });
          }} />}

          {trackedLocation && (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900">{trackedLocation.truckName} latest location</h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {trackedLocation.locationName || 'Last known GPS position'} · {trackedLocation.status}
                    {trackedLocation.recordedAt ? ` · ${new Date(trackedLocation.recordedAt).toLocaleString('en-IN')}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => setTrackedLocation(null)} className="text-xs font-bold text-slate-500 hover:text-slate-900">Close map</button>
              </div>
              <TruckTrackingMap
                latitude={trackedLocation.latitude}
                longitude={trackedLocation.longitude}
                truckName={trackedLocation.truckName}
                status={trackedLocation.status}
              />
            </section>
          )}

          {/* Active Fleet Operations - Connected to Backend */}
          <ActiveTrucksCard
            trucks={trucks}
            trips={trips}
            onStartTripForTruck={() => setIsStartTripOpen(true)}
            onOpenRecordLoss={() => setIsRecordLossOpen(true)}
            onOpenAddTruck={() => setIsAddTruckOpen(true)}
          />

          {/* Customer Ledger View - Connected to Backend */}
          <CustomerLedgerView
            customers={customers}
            ledgerTransactions={ledger}
            onOpenRecordPayment={(custMemoId) => {
              setSelectedCustomerIdForPayment(custMemoId);
              setIsRecordPaymentOpen(true);
            }}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            onRefreshCustomers={refreshCustomers}
          />

          {/* Live Orders Table - Connected to Backend */}
          <RecentOrdersTable
            orders={orders}
            onOpenAddOrder={() => setIsAddOrderOpen(true)}
            onOpenBillModal={(order) => setSelectedOrderForBill(order)}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        </div>
      )}

      {/* Module tab views */}
      {activeTab === 'trucks' && (
        <div className="space-y-4">
          <ActiveTrucksCard
            trucks={trucks}
            trips={trips}
            onStartTripForTruck={() => setIsStartTripOpen(true)}
            onOpenRecordLoss={() => setIsRecordLossOpen(true)}
            onOpenAddTruck={() => setIsAddTruckOpen(true)}
          />
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <RecentOrdersTable
            orders={orders}
            onOpenAddOrder={() => setIsAddOrderOpen(true)}
            onOpenBillModal={(order) => setSelectedOrderForBill(order)}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-4">
          <CustomerLedgerView
            customers={customers}
            ledgerTransactions={ledger}
            onOpenRecordPayment={(custMemoId) => {
              setSelectedCustomerIdForPayment(custMemoId);
              setIsRecordPaymentOpen(true);
            }}
            onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            onRefreshCustomers={refreshCustomers}
          />
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <ProfitFormulaBreakdown summary={summary} expenses={expenses} losses={losses} profitReport={profitReport} />
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <h2 className="text-xl font-bold">🐔 Chicken Stock & Yard Operations</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Available loaded stock in distribution fleet: <strong>{availableStockKg} kg</strong>.
          </p>
          <Button variant="primary" onClick={() => setIsStartTripOpen(true)}>
            Load Truck Stock
          </Button>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <ProfitFormulaBreakdown summary={summary} expenses={expenses} losses={losses} profitReport={profitReport} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-4">
          <h2 className="text-xl font-bold text-slate-900">⚙️ Business Account Settings</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <div><strong>Business Platform:</strong> Indian Chicken Center</div>
            <div><strong>Proprietor / Owner:</strong> {userProfile?.name || 'Authenticated owner'}</div>
            <div><strong>Registered Fleet:</strong> {trucks.length} Trucks</div>
            <div><strong>Backend Status:</strong> Connected to FastAPI + PostgreSQL</div>
          </div>
          <Button
            variant="outline"
            fullWidth
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      )}

      {/* Form & View Modals */}
      <StartTripModal
        isOpen={isStartTripOpen}
        onClose={() => { setIsStartTripOpen(false); setStartTripPrefill(undefined); }}
        trucks={trucks}
        onStartTrip={handleStartTrip}
        initialData={startTripPrefill}
      />

      <AddTruckModal
        isOpen={isAddTruckOpen}
        onClose={() => setIsAddTruckOpen(false)}
        onAddTruck={handleAddTruck}
      />

      <AddOrderModal
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
        customers={customers}
        trucks={trucks}
        trips={trips}
        onAddOrder={handleAddOrder}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onAddCustomer={handleAddCustomer}
      />

      <RecordLossModal
        isOpen={isRecordLossOpen}
        onClose={() => setIsRecordLossOpen(false)}
        trucks={trucks}
        trips={trips}
        onRecordLoss={handleRecordLoss}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        trucks={trucks}
        trips={trips}
        onAddExpense={handleAddExpense}
      />

      <DailyExpensesModal
        isOpen={isDailyExpensesOpen}
        onClose={() => setIsDailyExpensesOpen(false)}
        expenses={expenses}
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
      />

      <OwnerProfileModal
        isOpen={isOwnerProfileOpen}
        onClose={() => setIsOwnerProfileOpen(false)}
        onSignOut={handleSignOut}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        customers={customers}
        selectedCustomerId={selectedCustomerIdForPayment}
        onRecordPayment={handleRecordPayment}
      />

      <WhatsAppBillModal
        isOpen={selectedOrderForBill !== null}
        onClose={() => setSelectedOrderForBill(null)}
        order={selectedOrderForBill}
        customer={customers.find((c) => c.id === selectedOrderForBill?.customerId)}
      />
    </AppShell>
  );
}
