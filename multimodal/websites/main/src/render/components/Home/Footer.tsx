import React from 'react';
import { SectionDivider } from './SectionDivider';

export const Footer: React.FC = () => {
  return (
    <footer className="py-12 relative">
      <SectionDivider />
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="text-center text-gray-500">
          <p className="text-sm">Licensed under Apache License 2.0</p>
          <p className="text-xs mt-2 text-gray-600">&copy; {new Date().getFullYear()} Agent TARS</p>
        </div>
      </div>
    </footer>
  );
};
