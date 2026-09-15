import { Customer, Truck, Order, Expense, ChickenLoss, DashboardSummary, Trip, TruckStatus, VoiceTextResponse, TestVoiceResponse, VoiceLocalesResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private static token: string | null = null;

  static getStoredToken(): string | null {
    if (typeof window === 'undefined') return this.token;
    return this.token || localStorage.getItem('icc_access_token');
  }

  static setToken(token: string | null, remember: boolean = true) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token && remember) {
        localStorage.setItem('icc_access_token', token);
      } else {
        localStorage.removeItem('icc_access_token');
      }
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      const currentToken = this.getStoredToken();
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'HTTP Request Error' }));
        throw new ApiError(
          errorData.detail || `API Request Failed with status ${response.status}`,
          response.status,
        );
      }

      return response.json();
    } catch (err: any) {
      if (err.message && err.message.includes('Failed to fetch')) {
        throw new Error('Backend API unreachable. Please ensure the server is running.');
      }
      throw err;
    }
  }

  // Auth
  static async login(emailOrPhone: string, password: string, remember: boolean = true) {
    const res = await this.request<{ access_token: string; role: string; business_id: string; user_id: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email_or_phone: emailOrPhone, password }),
    });

    if (res.access_token) {
      this.setToken(res.access_token, remember);
    }
    return res;
  }

  static async activateAccount(activationData: {
    ownerName: string;
    businessName: string;
    emailOrPhone: string;
    password: string;
    confirmPassword: string;
  }, remember: boolean = true) {
    const res = await this.request<{ access_token: string; role: string; business_id: string; user_id: string }>('/auth/activate', {
      method: 'POST',
      body: JSON.stringify({
        owner_name: activationData.ownerName,
        business_name: activationData.businessName,
        mobile_number: activationData.emailOrPhone,
        password: activationData.password,
        confirm_password: activationData.confirmPassword,
      }),
    });

    if (res.access_token) {
      this.setToken(res.access_token, remember);
    }
    return res;
  }

  static async getMe() {
    return this.request<{
      user_id: string;
      email_or_phone: string;
      role: string;
      preferred_language: 'en' | 'kn' | 'hi' | 'te' | 'ta' | 'ml' | 'ur' | 'mr' | 'bn';
      business: {
        id: string;
        business_name: string;
        owner_name: string;
        contact_details: string;
      };
    }>('/auth/me');
  }

  static async updateLanguagePreference(preferredLanguage: string) {
    return this.request<{ preferred_language: string }>('/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ preferred_language: preferredLanguage }),
    });
  }

  // Dashboard Summary
  static async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/dashboard/summary');
  }

  // Reports
  static async getProfitReport(): Promise<any> {
    const raw = await this.request<any>('/reports/profit');
    return {
      salesRevenue: parseFloat(raw.sales_revenue),
      purchaseCost: parseFloat(raw.purchase_cost),
      fuelExpense: parseFloat(raw.fuel_expense),
      labourExpense: parseFloat(raw.labour_expense),
      maintenanceExpense: parseFloat(raw.maintenance_expense),
      foodExpense: parseFloat(raw.food_expense),
      otherExpenses: parseFloat(raw.other_expenses),
      totalExpenses: parseFloat(raw.total_expenses),
      totalWastageKg: parseFloat(raw.total_wastage_kg),
      wastageCost: parseFloat(raw.wastage_cost),
      netProfit: parseFloat(raw.net_profit),
      formulaAudit: raw.formula_audit,
    };
  }

  static async getTripProfitSummary(tripId: string): Promise<any> {
    const raw = await this.request<any>(`/trips/${tripId}/summary`);
    return {
      salesRevenue: parseFloat(raw.sales_revenue),
      purchaseCost: parseFloat(raw.purchase_cost),
      fuelExpense: parseFloat(raw.fuel_expense),
      labourExpense: parseFloat(raw.labour_expense),
      maintenanceExpense: parseFloat(raw.maintenance_expense),
      foodExpense: parseFloat(raw.food_expense),
      otherExpenses: parseFloat(raw.other_expenses),
      totalExpenses: parseFloat(raw.total_expenses),
      totalWastageKg: parseFloat(raw.total_wastage_kg),
      wastageCost: parseFloat(raw.wastage_cost),
      netProfit: parseFloat(raw.net_profit),
      formulaAudit: raw.formula_audit,
    };
  }

  // Customers & Ledger
  static async getCustomers(): Promise<Customer[]> {
    const raw = await this.request<any[]>('/customers');
    return raw.map((c) => ({
      id: c.id,
      shopName: c.shop_name,
      customerName: c.customer_name,
      contactNumber: c.contact_number,
      address: c.address || '',
      currentBalance: typeof c.current_balance === 'string' ? parseFloat(c.current_balance) : Number(c.current_balance || 0),
      totalPurchases: typeof c.total_purchases === 'string' ? parseFloat(c.total_purchases) : Number(c.total_purchases || 0),
      lastPurchaseDate: c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : 'Recently',
      latitude: c.latitude ? parseFloat(c.latitude) : undefined,
      longitude: c.longitude ? parseFloat(c.longitude) : undefined,
    }));
  }

  static async createCustomer(customerData: Partial<Customer> & { openingBalance?: number }): Promise<Customer> {
    const c = await this.request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        shop_name: customerData.shopName,
        customer_name: customerData.customerName,
        contact_number: customerData.contactNumber,
        address: customerData.address,
        opening_balance: customerData.openingBalance || 0,
        latitude: customerData.latitude,
        longitude: customerData.longitude,
      }),
    });

    return {
      id: c.id,
      shopName: c.shop_name,
      customerName: c.customer_name,
      contactNumber: c.contact_number,
      address: c.address || '',
      currentBalance: typeof c.current_balance === 'string' ? parseFloat(c.current_balance) : Number(c.current_balance || 0),
      totalPurchases: typeof c.total_purchases === 'string' ? parseFloat(c.total_purchases) : Number(c.total_purchases || 0),
      lastPurchaseDate: 'Just Now',
      latitude: c.latitude ? parseFloat(c.latitude) : undefined,
      longitude: c.longitude ? parseFloat(c.longitude) : undefined,
    };
  }

  static async getCustomerLedger(customerId: string) {
    const data = await this.request<any>(`/customers/${customerId}/ledger`);
    return {
      customer: {
        id: data.customer.id,
        shopName: data.customer.shop_name,
        customerName: data.customer.customer_name,
        contactNumber: data.customer.contact_number,
        address: data.customer.address || '',
        currentBalance: parseFloat(data.current_balance),
        totalPurchases: parseFloat(data.total_purchases),
        lastPurchaseDate: 'Active',
      },
      openingBalance: parseFloat(data.opening_balance),
      totalPurchases: parseFloat(data.total_purchases),
      totalPayments: parseFloat(data.total_payments),
      currentBalance: parseFloat(data.current_balance),
      entries: (data.entries || []).map((e: any) => ({
        id: e.id,
        customerId: customerId,
        customerName: data.customer.shop_name,
        date: new Date(e.date).toLocaleDateString('en-IN'),
        type: e.type === 'payment' ? 'payment' : 'purchase',
        quantityKg: e.quantity_kg ? parseFloat(e.quantity_kg) : undefined,
        pricePerKg: e.price_per_kg ? parseFloat(e.price_per_kg) : undefined,
        amount: parseFloat(e.amount),
        previousBalance: parseFloat(e.running_balance) - (e.type === 'payment' ? -parseFloat(e.amount) : parseFloat(e.amount)),
        newBalance: parseFloat(e.running_balance),
        paymentMethod: e.notes?.includes('via') ? e.notes.split('via')[1]?.trim() : 'UPI',
        notes: e.notes,
      })),
    };
  }

  // Trucks & Trips
  static async getTrucks(): Promise<Truck[]> {
    const raw = await this.request<any[]>('/trucks');
    return raw.map((t) => ({
      id: t.id,
      name: t.notes || `Truck (${t.registration_number})`,
      regNumber: t.registration_number,
      status: t.status as TruckStatus,
      driverName: '',
      loadedKg: 0,
    }));
  }

  static async createTruck(truckData: { registrationNumber: string; notes?: string }): Promise<Truck> {
    const t = await this.request<any>('/trucks', {
      method: 'POST',
      body: JSON.stringify({
        registration_number: truckData.registrationNumber,
        notes: truckData.notes || `Truck (${truckData.registrationNumber})`,
      }),
    });
    return {
      id: t.id,
      name: t.notes || `Truck (${t.registration_number})`,
      regNumber: t.registration_number,
      status: t.status as TruckStatus,
      driverName: '',
      loadedKg: 0,
    };
  }

  static async getTrips(): Promise<Trip[]> {
    const raw = await this.request<any[]>('/trips');
    return raw.map((tr) => {
      const stock = tr.stock_load;
      const loadedKg = stock ? parseFloat(stock.loaded_quantity_kg) : 0;
      const ratePerKg = stock ? parseFloat(stock.purchase_price_per_kg) : 0;
      const purchaseTotal = stock ? parseFloat(stock.purchase_total) : 0;

      const deliveredKg = tr.delivered_quantity_kg ? parseFloat(tr.delivered_quantity_kg) : 0;
      const wastageKg = tr.wastage_quantity_kg ? parseFloat(tr.wastage_quantity_kg) : 0;
      const remainingKg = tr.remaining_quantity_kg !== undefined ? parseFloat(tr.remaining_quantity_kg) : Math.max(0, loadedKg - deliveredKg - wastageKg);

      return {
        id: tr.id,
        truckId: tr.truck_id,
        truckName: tr.notes || `Truck`,
        driverName: '',
        startLocation: tr.starting_location,
        destination: tr.destination,
        startTime: tr.started_at ? new Date(tr.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Active',
        loadedQuantityKg: loadedKg,
        purchasePricePerKg: ratePerKg,
        loadedTotalCost: purchaseTotal,
        deliveredQuantityKg: deliveredKg,
        wastageQuantityKg: wastageKg,
        remainingQuantityKg: remainingKg,
        fuelExpense: 0,
        labourExpense: 0,
        otherExpense: 0,
        totalSales: 0,
        netProfit: 0,
        status: tr.status,
      };
    });
  }

  static async startTrip(tripData: {
    truckId: string;
    startingLocation: string;
    destination: string;
    loadedKg: number;
    pricePerKg: number;
    loadingLocation?: string;
    initialFuelLitres?: number;
    initialFuelRate?: number;
  }): Promise<Trip> {
    const tr = await this.request<any>('/trips', {
      method: 'POST',
      body: JSON.stringify({
        truck_id: tripData.truckId,
        starting_location: tripData.startingLocation,
        destination: tripData.destination,
        stock_load: {
          loaded_quantity_kg: tripData.loadedKg,
          purchase_price_per_kg: tripData.pricePerKg,
          loading_location: tripData.loadingLocation || tripData.startingLocation,
        },
        initial_fuel_litres: tripData.initialFuelLitres,
        initial_fuel_price_per_litre: tripData.initialFuelRate,
      }),
    });

    const stock = tr.stock_load;
    const loadedKg = stock ? parseFloat(stock.loaded_quantity_kg) : tripData.loadedKg;
    const ratePerKg = stock ? parseFloat(stock.purchase_price_per_kg) : tripData.pricePerKg;
    const purchaseTotal = stock ? parseFloat(stock.purchase_total) : loadedKg * ratePerKg;

    return {
      id: tr.id,
      truckId: tr.truck_id,
      truckName: `Truck`,
      driverName: '',
      startLocation: tr.starting_location,
      destination: tr.destination,
      startTime: 'Just Started',
      loadedQuantityKg: loadedKg,
      purchasePricePerKg: ratePerKg,
      loadedTotalCost: purchaseTotal,
      deliveredQuantityKg: 0,
      wastageQuantityKg: 0,
      remainingQuantityKg: loadedKg,
      fuelExpense: 0,
      labourExpense: 0,
      otherExpense: 0,
      totalSales: 0,
      netProfit: 0,
      status: tr.status,
    };
  }

  // Trip Location & Nearby Orders Foundation
  static async recordTripLocation(tripId: string, locationData: { latitude: number; longitude: number; locationName?: string; status?: string }) {
    return this.request<any>(`/trips/${tripId}/location`, {
      method: 'POST',
      body: JSON.stringify({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        location_name: locationData.locationName,
        status: locationData.status,
      }),
    });
  }

  static async getLatestTripLocation(tripId: string) {
    return this.request<any>(`/trips/${tripId}/location`);
  }

  static async getNearbyPendingOrders(tripId: string, radiusKm: number = 100) {
    return this.request<any[]>(`/trips/${tripId}/nearby-orders?radius_km=${radiusKm}`);
  }

  // Potential Nearby Businesses / Buyers
  static async createNearbyBusiness(bizData: {
    shopName: string;
    businessType: string;
    contactNumber: string;
    address?: string;
    latitude: number;
    longitude: number;
    notes?: string;
  }) {
    return this.request<any>('/nearby-businesses', {
      method: 'POST',
      body: JSON.stringify({
        shop_name: bizData.shopName,
        business_type: bizData.businessType,
        contact_number: bizData.contactNumber,
        address: bizData.address,
        latitude: bizData.latitude,
        longitude: bizData.longitude,
        notes: bizData.notes,
      }),
    });
  }

  static async getNearbyBusinesses() {
    return this.request<any[]>('/nearby-businesses');
  }

  static async getNearbyBusinessesNearTrip(tripId: string, radiusKm: number = 50) {
    return this.request<any[]>(`/nearby-businesses/near-trip/${tripId}?radius_km=${radiusKm}`);
  }

  // Orders
  static async getOrders(): Promise<Order[]> {
    const raw = await this.request<any[]>('/orders');
    return raw.map((o) => {
      const qty = parseFloat(o.quantity_kg);
      const price = parseFloat(o.selling_price_per_kg);
      const total = parseFloat(o.total_amount);

      return {
        id: o.id,
        orderNumber: `ORD-${o.id.substring(0, 8).toUpperCase()}`,
        customerId: o.customer_id,
        customerName: o.customer_name || 'Customer',
        shopName: o.shop_name || 'Store',
        tripId: o.trip_id,
        quantityKg: qty,
        pricePerKg: price,
        totalAmount: total,
        status: o.status,
        paymentStatus: 'pending',
        paidAmount: 0,
        remainingAmount: total,
        createdAt: o.ordered_at ? new Date(o.ordered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently',
      };
    });
  }

  static async createOrder(orderData: {
    tripId: string;
    customerId: string;
    quantityKg: number;
    sellingPricePerKg: number;
    notes?: string;
  }): Promise<Order> {
    const o = await this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        trip_id: orderData.tripId,
        customer_id: orderData.customerId,
        quantity_kg: orderData.quantityKg,
        selling_price_per_kg: orderData.sellingPricePerKg,
        notes: orderData.notes,
      }),
    });

    const qty = parseFloat(o.quantity_kg);
    const price = parseFloat(o.selling_price_per_kg);
    const total = parseFloat(o.total_amount);

    return {
      id: o.id,
      orderNumber: `ORD-${o.id.substring(0, 8).toUpperCase()}`,
      customerId: o.customer_id,
      customerName: o.customer_name || 'Customer',
      shopName: o.shop_name || 'Store',
      tripId: o.trip_id,
      quantityKg: qty,
      pricePerKg: price,
      totalAmount: total,
      status: o.status,
      paymentStatus: 'pending',
      paidAmount: 0,
      remainingAmount: total,
      createdAt: 'Just Now',
    };
  }

  static async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const endpoint = status === 'delivered' ? `/orders/${orderId}/deliver` : `/orders/${orderId}`;
    const options = status === 'delivered' ? { method: 'POST' } : { method: 'PUT', body: JSON.stringify({ status }) };

    const o = await this.request<any>(endpoint, options);
    const qty = parseFloat(o.quantity_kg);
    const price = parseFloat(o.selling_price_per_kg);
    const total = parseFloat(o.total_amount);

    return {
      id: o.id,
      orderNumber: `ORD-${o.id.substring(0, 8).toUpperCase()}`,
      customerId: o.customer_id,
      customerName: o.customer_name || 'Customer',
      shopName: o.shop_name || 'Store',
      tripId: o.trip_id,
      quantityKg: qty,
      pricePerKg: price,
      totalAmount: total,
      status: o.status,
      paymentStatus: 'pending',
      paidAmount: 0,
      remainingAmount: total,
      createdAt: 'Recently',
    };
  }

  // Expenses & Wastage
  static async getExpenses(): Promise<Expense[]> {
    const raw = await this.request<any[]>('/expenses');
    return raw.map((e) => ({
      id: e.id,
      category: e.category,
      amount: parseFloat(e.amount),
      date: e.expense_date ? new Date(e.expense_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently',
      notes: e.description || '',
      fuelDetails: e.category === 'fuel' && e.quantity && e.unit_price ? {
        litres: parseFloat(e.quantity),
        pricePerLitre: parseFloat(e.unit_price),
        fuelType: 'Diesel',
      } : undefined,
    }));
  }

  static async recordExpense(tripId: string, expenseData: { category: string; amount?: number; quantity?: number; unitPrice?: number; description?: string }): Promise<Expense> {
    const e = await this.request<any>(`/trips/${tripId}/expenses`, {
      method: 'POST',
      body: JSON.stringify({
        category: expenseData.category,
        amount: expenseData.amount,
        quantity: expenseData.quantity,
        unit_price: expenseData.unitPrice,
        description: expenseData.description,
      }),
    });

    return {
      id: e.id,
      category: e.category,
      amount: parseFloat(e.amount),
      date: 'Just Now',
      notes: e.description || '',
      fuelDetails: e.category === 'fuel' && e.quantity && e.unit_price ? {
        litres: parseFloat(e.quantity),
        pricePerLitre: parseFloat(e.unit_price),
        fuelType: 'Diesel',
      } : undefined,
    };
  }

  static async recordWastage(tripId: string, wastageData: { quantityKg: number; reason: string; notes?: string }): Promise<ChickenLoss> {
    const w = await this.request<any>(`/trips/${tripId}/wastage`, {
      method: 'POST',
      body: JSON.stringify({
        quantity_kg: wastageData.quantityKg,
        reason: wastageData.reason,
        notes: wastageData.notes,
      }),
    });

    const qty = parseFloat(w.quantity_kg);
    return {
      id: w.id,
      truckId: '',
      truckName: 'Truck',
      tripId: w.trip_id,
      quantityKg: qty,
      costPerKg: 0,
      totalLossValue: 0,
      date: w.recorded_at ? new Date(w.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just Now',
      reason: w.reason,
    };
  }

  static async getWastage(tripId: string): Promise<ChickenLoss[]> {
    const raw = await this.request<any[]>(`/trips/${tripId}/wastage`);
    return raw.map((w) => ({
      id: w.id,
      truckId: '',
      truckName: 'Truck',
      tripId: w.trip_id,
      quantityKg: parseFloat(w.quantity_kg),
      costPerKg: 0,
      totalLossValue: 0,
      date: w.recorded_at ? new Date(w.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently',
      reason: w.reason,
    }));
  }

  static async aiChat(message: string, language?: string): Promise<{ answer: string; tool_used: string; data_source: string; language?: string; provider?: string }> {
    return this.request<{ answer: string; tool_used: string; data_source: string; language?: string; provider?: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ...(language ? { language } : {}) }),
    });
  }

  // Voice Pipeline
  static async sendVoiceTextQuery(text: string, language?: string): Promise<VoiceTextResponse> {
    return this.request<VoiceTextResponse>('/ai/voice/text', {
      method: 'POST',
      body: JSON.stringify({ text, ...(language ? { language } : {}) }),
    });
  }

  static async testVoice(language?: string): Promise<TestVoiceResponse> {
    return this.request<TestVoiceResponse>('/ai/voice/test', {
      method: 'POST',
      body: JSON.stringify({ ...(language ? { language } : {}) }),
    });
  }

  static async getVoiceLocales(): Promise<VoiceLocalesResponse> {
    return this.request<VoiceLocalesResponse>('/ai/voice/locales');
  }

  // Payments
  static async recordPayment(customerId: string, paymentData: { amount: number; paymentMethod: string; reference?: string; comments?: string }) {
    return this.request(`/customers/${customerId}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        reference: paymentData.reference,
        comments: paymentData.comments,
      }),
    });
  }
}
