'use client';

import React from 'react';
import { ShieldCheck, User, LogOut } from 'lucide-react';

interface HeaderProps {
  ownerName?: string;
  activeTripsCount: number;
  onQuickActionClick: () => void;
  onOpenOwnerProfile?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  ownerName,
  activeTripsCount,
  onOpenOwnerProfile,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white shadow-inner shrink-0">
            🐔
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                Indian Chicken Center
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Business
              </span>
            </div>
            <p className="text-[11px] sm:text-sm text-slate-400 font-medium leading-tight">
              Wholesale Fresh Chicken Distribution
            </p>
          </div>
        </div>

        {/* Right Info: Live Trip Status, Owner Profile & Sign Out */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Active Trip Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
            <div className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500"></span>
            </div>
            <span className="text-[11px] sm:text-sm font-bold text-slate-200">
              {activeTripsCount} {activeTripsCount === 1 ? 'Trip On Road' : 'Trips On Road'}
            </span>
          </div>

          {/* Owner Profile Avatar Button */}
          <button
            type="button"
            onClick={onOpenOwnerProfile}
            className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-slate-800 hover:opacity-80 transition-opacity cursor-pointer touch-manipulation min-h-[44px]"
            title="Open Owner Profile"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-bold text-white">{ownerName || 'Owner'}</div>
              <div className="text-xs text-slate-400 font-medium">Owner</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
