import React from 'react';

/**
 * DashboardLayout – a responsive CSS Grid container that mirrors the reference dashboard layout.
 * Adjust grid-template-columns / rows to match the exact design.
 */
export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="grid gap-4 p-4 md:gap-6 lg:gap-8"
         style={{
           // Example grid layout – you may need to adjust columns/rows to match the reference image.
           gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
         }}
    >
      {children}
    </div>
  );
};
