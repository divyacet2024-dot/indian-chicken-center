import React, { useState, useRef, useEffect } from 'react';
import { Customer } from '@/types';
import { Search, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SearchableCustomerSelectProps {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  onOpenAddCustomer?: () => void;
  label?: string;
}

export const SearchableCustomerSelect: React.FC<SearchableCustomerSelectProps> = ({
  customers,
  value,
  onChange,
  onOpenAddCustomer,
  label = "Select Customer / Shop"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.id === value);
  const normalizedSearch = search.trim().toLowerCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.shopName.toLowerCase().includes(normalizedSearch) ||
    c.customerName.toLowerCase().includes(normalizedSearch) ||
    c.contactNumber.toLowerCase().includes(normalizedSearch)
  );

  if (customers.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <p className="text-sm font-semibold text-slate-600">No customers yet. Add a customer first.</p>
        {onOpenAddCustomer && (
          <Button type="button" variant="primary" size="sm" onClick={onOpenAddCustomer}>
            Add Customer
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={wrapperRef}>
      <label className="text-sm sm:text-base font-bold text-slate-800">{label}</label>
      
      <button
        type="button"
        className="relative flex items-center w-full h-12 px-4 text-base font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate flex-1">
          {selectedCustomer ? `${selectedCustomer.shopName} (${selectedCustomer.customerName})` : 'Search customer...'}
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-[76px] left-0 w-full bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden flex flex-col max-h-72"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              autoFocus
              placeholder="Search by name, shop, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none py-2"
            />
          </div>
          
          <div className="overflow-y-auto flex-1 p-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-sm font-semibold text-slate-500">
                No matching customers found.
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onChange(c.id);
                    setIsOpen(false);
                  }}
                  className={`p-3 rounded-lg cursor-pointer flex items-center justify-between hover:bg-slate-50 ${value === c.id ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700'}`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{c.shopName}</span>
                    <span className="text-xs opacity-80">{c.customerName} • {c.contactNumber}</span>
                  </div>
                  {value === c.id && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
