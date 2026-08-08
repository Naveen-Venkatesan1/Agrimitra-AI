import React from 'react';
import Card from '../components/ui/Card';

export const PlaceholderPage = ({ title, subtitle, category = 'Module' }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-agri-light uppercase tracking-wider">{category}</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-agri-dark mt-0.5">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>

      <Card hover={false} className="p-8 text-center py-16 bg-white border border-gray-100">
        <div className="w-16 h-16 bg-emerald-50 text-agri-primary rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          🌱
        </div>
        <h3 className="text-lg font-bold text-agri-dark">{title}</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto mt-2">
          This module is part of the Agrimitra AI Platform. Detailed functionality and interactive components will be rendered here.
        </p>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
