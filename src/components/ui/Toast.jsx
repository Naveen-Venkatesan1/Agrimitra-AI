import React from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

export const Toast = ({ message, type = 'info', onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />
  };

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900'
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-card max-w-md w-full ${bgStyles[type]} transition-all animate-bounce-short`}>
      {icons[type]}
      <p className="text-sm font-medium flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 text-gray-500">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const LoadingState = ({ message = 'Loading Agrimitra insights...' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-12 h-12 border-4 border-agri-light border-t-agri-primary rounded-full animate-spin mb-4" />
    <p className="text-sm font-medium text-gray-600">{message}</p>
  </div>
);

export const EmptyState = ({ title, description, icon: Icon, actionButton }) => (
  <div className="flex flex-col items-center justify-center p-10 text-center bg-white rounded-xl border border-dashed border-gray-200">
    {Icon && (
      <div className="p-4 bg-emerald-50 text-agri-primary rounded-2xl mb-4">
        <Icon className="w-8 h-8" />
      </div>
    )}
    <h4 className="text-base font-bold text-agri-dark">{title}</h4>
    {description && <p className="text-xs text-gray-500 mt-1 max-w-sm">{description}</p>}
    {actionButton && <div className="mt-4">{actionButton}</div>}
  </div>
);
