'use client';

import { useState } from 'react';
import { config } from '@/lib/config';

interface MobileHeaderProps {
  onMenuToggle: (isOpen: boolean) => void;
}

export default function MobileHeader({ onMenuToggle }: MobileHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggle = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    onMenuToggle(newState);
  };

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-30 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="font-medium text-lg text-black tracking-tight">BasicFi</span>
        {config.isBeta && (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-md">Beta</span>
            <span className="text-xs text-gray-400 font-light">v{config.version}</span>
          </div>
        )}
      </div>
      <button
        onClick={handleToggle}
        className="p-2 rounded-lg hover:bg-gray-50 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </header>
  );
}

