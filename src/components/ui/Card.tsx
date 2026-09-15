import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 transition-all ${
        onClick ? 'cursor-pointer hover:border-emerald-400 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; className?: string }> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between pb-3 mb-3 border-b border-slate-100 ${className}`}>
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm font-medium text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
