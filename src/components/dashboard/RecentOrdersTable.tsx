'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge';
import { Order } from '@/types';
import { Button } from '@/components/ui/Button';
import { ShoppingBag, Share2, CheckCircle2, Truck, Plus } from 'lucide-react';

interface RecentOrdersTableProps {
  orders: Order[];
  onOpenAddOrder: () => void;
  onOpenBillModal: (order: Order) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  orders,
  onOpenAddOrder,
  onOpenBillModal,
  onUpdateOrderStatus,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered'>('all');

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return o.status !== 'delivered' && o.status !== 'cancelled';
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  return (
    <Card className="border-slate-200">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            🛍️ Live Orders & Deliveries ({orders.length})
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Orders arriving on route & truck delivery status
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Filters */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2.5 min-h-[40px] rounded-lg transition-all touch-manipulation ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : ''}`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-2.5 min-h-[40px] rounded-lg transition-all touch-manipulation ${filter === 'active' ? 'bg-white text-slate-900 shadow-xs' : ''}`}
            >
              On Route
            </button>
            <button
              onClick={() => setFilter('delivered')}
              className={`px-3 py-2.5 min-h-[40px] rounded-lg transition-all touch-manipulation ${filter === 'delivered' ? 'bg-white text-slate-900 shadow-xs' : ''}`}
            >
              Delivered
            </button>
          </div>

          <Button size="sm" variant="primary" onClick={onOpenAddOrder} icon={<Plus className="w-4 h-4" />}>
            New Order
          </Button>
        </div>
      </div>

      {/* Responsive View: Cards on Mobile, Table on Desktop */}
      {filteredOrders.length === 0 ? (
        <div className="py-8 text-center text-slate-400">
          <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-40" />
          <p className="font-bold text-slate-600 text-sm">No orders matching this filter</p>
          <p className="text-xs">Click "New Order" to record a customer purchase</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3">Order No / Time</th>
                  <th className="py-3 px-3">Customer / Shop</th>
                  <th className="py-3 px-3">Quantity & Price</th>
                  <th className="py-3 px-3">Truck</th>
                  <th className="py-3 px-3">Total Value</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">{order.orderNumber}</div>
                      <div className="text-xs text-slate-400">{order.createdAt}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">{order.shopName}</div>
                      <div className="text-xs text-slate-500">{order.customerName}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-emerald-700">{order.quantityKg} kg</div>
                      <div className="text-xs text-slate-500">₹{order.pricePerKg} / kg</div>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-slate-400" />
                        <span>{order.assignedTruckName || 'Truck 1'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-extrabold text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</div>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="py-3.5 px-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status !== 'delivered' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Delivered
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenBillModal(order)}
                          icon={<Share2 className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          Bill
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400">{order.orderNumber} • {order.createdAt}</span>
                    <h3 className="font-bold text-slate-900 text-base">{order.shopName}</h3>
                    <p className="text-xs text-slate-500">{order.customerName}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block font-semibold">Quantity</span>
                    <span className="font-bold text-emerald-700 text-sm">{order.quantityKg} kg</span>
                    <span className="text-slate-500 block">@ ₹{order.pricePerKg}/kg</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block font-semibold">Total Bill</span>
                    <span className="font-bold text-slate-900 text-sm">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                    <div className="mt-0.5"><PaymentStatusBadge status={order.paymentStatus} /></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" /> {order.assignedTruckName}
                  </div>
                  <div className="flex gap-2">
                    {order.status !== 'delivered' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Delivered
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenBillModal(order)}
                      icon={<Share2 className="w-3.5 h-3.5 text-emerald-600" />}
                    >
                      Bill
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};
