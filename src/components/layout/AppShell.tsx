'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Modal } from '@/components/ui/Modal';
import { QuickActions } from '@/components/dashboard/QuickActions';

interface AppShellProps {
  children: React.ReactNode;
  ownerName?: string;
  activeTripsCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  // Quick Action Modal triggers
  onOpenStartTrip: () => void;
  onOpenAddOrder: () => void;
  onOpenAddCustomer: () => void;
  onOpenRecordLoss: () => void;
  onOpenAddExpense: () => void;
  onOpenRecordPayment: () => void;
  onOpenOwnerProfile?: () => void;
  onSignOut?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  ownerName,
  activeTripsCount,
  activeTab,
  setActiveTab,
  onOpenStartTrip,
  onOpenAddOrder,
  onOpenAddCustomer,
  onOpenRecordLoss,
  onOpenAddExpense,
  onOpenRecordPayment,
  onOpenOwnerProfile,
  onSignOut,
}) => {
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState(false);

  const handleAction = (actionFn: () => void) => {
    setIsQuickActionModalOpen(false);
    setTimeout(() => {
      actionFn();
    }, 120);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        ownerName={ownerName}
        activeTripsCount={activeTripsCount}
        onQuickActionClick={() => setIsQuickActionModalOpen(true)}
        onOpenOwnerProfile={onOpenOwnerProfile}
        onSignOut={onSignOut}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onQuickActionClick={() => setIsQuickActionModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-36 lg:pb-12 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Bar Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickActionClick={() => setIsQuickActionModalOpen(true)}
      />

      {/* Quick Action Modal Menu */}
      <Modal
        isOpen={isQuickActionModalOpen}
        onClose={() => setIsQuickActionModalOpen(false)}
        title="⚡ Quick Business Actions"
        subtitle="Select an action to perform instantly"
      >
        <QuickActions
          onOpenStartTrip={() => handleAction(onOpenStartTrip)}
          onOpenAddOrder={() => handleAction(onOpenAddOrder)}
          onOpenAddCustomer={() => handleAction(onOpenAddCustomer)}
          onOpenRecordLoss={() => handleAction(onOpenRecordLoss)}
          onOpenAddExpense={() => handleAction(onOpenAddExpense)}
          onOpenRecordPayment={() => handleAction(onOpenRecordPayment)}
        />
      </Modal>
    </div>
  );
};
