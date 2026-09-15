'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { User, LogOut, Building, Phone, ShieldCheck, RefreshCw } from 'lucide-react';
import { ApiClient } from '@/services/apiClient';

interface OwnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export const OwnerProfileModal: React.FC<OwnerProfileModalProps> = ({
  isOpen,
  onClose,
  onSignOut,
}) => {
  const [profileData, setProfileData] = useState<{
    ownerName: string;
    businessName: string;
    contactDetails: string;
    role: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const me = await ApiClient.getMe();
        if (isMounted) {
          setProfileData({
            ownerName: me.business?.owner_name || 'Umarabba',
            businessName: me.business?.business_name || 'Indian Chicken Center',
            contactDetails: me.email_or_phone || me.business?.contact_details || 'Not provided',
            role: me.role === 'owner' ? 'Business Owner & Manager' : me.role,
          });
        }
      } catch (err) {
        if (isMounted) {
          setProfileData({
            ownerName: 'Umarabba',
            businessName: 'Indian Chicken Center',
            contactDetails: 'Not provided',
            role: 'Business Owner & Manager',
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleSignOutClick = () => {
    onClose();
    setTimeout(() => {
      onSignOut();
    }, 100);
  };

  const ownerName = profileData?.ownerName || 'Umarabba';
  const businessName = profileData?.businessName || 'Indian Chicken Center';
  const contactDetails = profileData?.contactDetails || 'Not provided';
  const roleDisplay = profileData?.role || 'Business Owner & Manager';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="👤 Business Owner Profile" subtitle="Account & Profile Management">
      <div className="space-y-4 text-xs">
        {/* Profile Card Header */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold shrink-0 text-xl">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">{ownerName}</h3>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Owner
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">{roleDisplay}</p>
          </div>
        </div>

        {/* Business Details Grid */}
        <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" /> Business Name
            </span>
            <span className="font-bold text-slate-900">{businessName}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" /> Proprietor
            </span>
            <span className="font-bold text-slate-900">{ownerName}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> Registered Contact
            </span>
            <span className="font-semibold text-slate-700">
              {contactDetails || 'Not provided'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-slate-500 font-semibold">Account Status</span>
            <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
              Active Database Account
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <Button
            type="button"
            variant="danger"
            fullWidth
            icon={<LogOut className="w-4 h-4" />}
            onClick={handleSignOutClick}
            className="touch-manipulation min-h-[44px]"
          >
            Sign Out of Account
          </Button>

          <Button type="button" variant="outline" fullWidth onClick={onClose} className="touch-manipulation min-h-[44px]">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
