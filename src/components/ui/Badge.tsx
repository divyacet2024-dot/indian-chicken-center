import React from 'react';
import { TruckStatus, OrderStatus, PaymentStatus } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'blue' | 'red' | 'purple' | 'slate' | 'indigo';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', size = 'md', className = '' }) => {
  const variantStyles = {
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    slate: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-bold rounded-md border',
    md: 'px-2.5 py-1 text-xs sm:text-sm font-bold rounded-lg border',
  };

  return <span className={`inline-flex items-center gap-1.5 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>{children}</span>;
};

export const TruckStatusBadge: React.FC<{ status: TruckStatus }> = ({ status }) => {
  switch (status) {
    case 'available':
      return <Badge variant="emerald">Available</Badge>;
    case 'on_trip':
      return <Badge variant="blue">On Trip</Badge>;
    case 'returning':
      return <Badge variant="amber">Returning</Badge>;
    case 'maintenance':
      return <Badge variant="red">In Maintenance</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
};

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  switch (status) {
    case 'new':
      return <Badge variant="purple">New Order</Badge>;
    case 'confirmed':
      return <Badge variant="indigo">Confirmed</Badge>;
    case 'assigned':
      return <Badge variant="blue">Assigned to Truck</Badge>;
    case 'out_for_delivery':
      return <Badge variant="amber">Out for Delivery</Badge>;
    case 'delivered':
      return <Badge variant="emerald">Delivered</Badge>;
    case 'cancelled':
      return <Badge variant="red">Cancelled</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  switch (status) {
    case 'paid':
      return <Badge variant="emerald">Paid Full</Badge>;
    case 'partial':
      return <Badge variant="amber">Partial Payment</Badge>;
    case 'pending':
      return <Badge variant="red">Payment Pending</Badge>;
    default:
      return <Badge variant="slate">{status}</Badge>;
  }
};
