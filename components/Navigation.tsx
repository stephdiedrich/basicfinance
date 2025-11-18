'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { config } from '@/lib/config';
import { getFinancialData } from '@/lib/storage';
import { Asset, Liability, Transaction } from '@/types';

const navItems = [
  { href: '/', label: 'Home', icon: (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z" fill="currentColor"/>
    </svg>
  )},
  { href: '/assets', label: 'Assets', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/liabilities', label: 'Liabilities', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/cash-flow', label: 'Cash Flow', icon: (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm40-68a28,28,0,0,1-28,28h-4v8a8,8,0,0,1-16,0v-8H104a8,8,0,0,1,0-16h36a12,12,0,0,0,0-24H116a28,28,0,0,1,0-56h4V72a8,8,0,0,1,16,0v8h16a8,8,0,0,1,0,16H116a12,12,0,0,0,0,24h24A28,28,0,0,1,168,148Z" fill="currentColor"/>
    </svg>
  )},
  { href: '/transactions', label: 'Transactions', icon: (
    <svg width="20" height="20" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M213.66,181.66l-32,32a8,8,0,0,1-11.32-11.32L188.69,184H48a8,8,0,0,1,0-16H188.69l-18.35-18.34a8,8,0,0,1,11.32-11.32l32,32A8,8,0,0,1,213.66,181.66Zm-139.32-64a8,8,0,0,0,11.32-11.32L67.31,88H208a8,8,0,0,0,0-16H67.31L85.66,53.66A8,8,0,0,0,74.34,42.34l-32,32a8,8,0,0,0,0,11.32Z" fill="currentColor"/>
    </svg>
  )},
];

interface NavigationProps {
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export default function Navigation({ isMobileMenuOpen = false, onMobileMenuClose }: NavigationProps = {} as NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load sidebar expansion state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-expanded');
      if (saved !== null) {
        setIsExpanded(saved === 'true');
      }
    }
  }, []);
  
  // Save sidebar expansion state to localStorage
  const handleToggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-expanded', String(newState));
    }
  };
  const [searchResults, setSearchResults] = useState<{
    assets: Asset[];
    liabilities: Liability[];
    transactions: Transaction[];
  }>({ assets: [], liabilities: [], transactions: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLNavElement>(null);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults({ assets: [], liabilities: [], transactions: [] });
      setShowSearchResults(false);
      return;
    }

    const data = getFinancialData();
    const query = searchQuery.toLowerCase().trim();
    const results = {
      assets: (data.assets || []).filter((asset: Asset) =>
        asset.name.toLowerCase().includes(query) ||
        asset.institution?.toLowerCase().includes(query) ||
        asset.notes?.toLowerCase().includes(query)
      ).slice(0, 5),
      liabilities: (data.liabilities || []).filter((liability: Liability) =>
        liability.name.toLowerCase().includes(query) ||
        liability.notes?.toLowerCase().includes(query)
      ).slice(0, 5),
      transactions: (data.transactions || []).filter((transaction: Transaction) =>
        transaction.description?.toLowerCase().includes(query) ||
        transaction.merchant?.toLowerCase().includes(query) ||
        transaction.category?.toLowerCase().includes(query)
      ).slice(0, 5),
    };

    setSearchResults(results);
    setShowSearchResults(
      results.assets.length > 0 ||
      results.liabilities.length > 0 ||
      results.transactions.length > 0
    );
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = (type: 'asset' | 'liability' | 'transaction', id: string) => {
    setSearchQuery('');
    setShowSearchResults(false);
    if (type === 'asset') {
      router.push('/assets');
    } else if (type === 'liability') {
      router.push('/liabilities');
    } else {
      router.push('/transactions');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node) && isMobileMenuOpen) {
        onMobileMenuClose?.();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when mobile menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, onMobileMenuClose]);

  // Close mobile menu when navigating
  const handleLinkClick = () => {
    if (window.innerWidth < 768) { // md breakpoint
      onMobileMenuClose?.();
    }
  };

  // Update CSS variable for sidebar width to sync with content padding
  // This runs both on initial load and when toggled
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--sidebar-width', isExpanded ? '280px' : '80px');
    }
  }, [isExpanded]);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileMenuClose}
        />
      )}
      
      <nav 
        ref={navRef}
        className={`fixed left-0 top-0 h-full bg-white shadow-card transition-all duration-300 z-50 md:z-40 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ width: isExpanded ? '280px' : '80px' }}
      >
      <div className="flex flex-col h-full">
        {/* Header with Wordmark and Toggle */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-lg text-black tracking-tight">BasicFi</span>
              {config.isBeta && (
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-md">Beta</span>
                  <span className="text-xs text-gray-400 font-light">v{config.version}</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleToggleExpanded}
            className="p-2 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center group ml-auto cursor-pointer"
            aria-label={isExpanded ? 'Collapse menu' : 'Expand menu'}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 20 20" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform duration-300 text-gray-500 group-hover:text-gray-700 ${isExpanded ? '' : 'rotate-180'}`}
            >
              <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        {isExpanded && (
          <div className="px-3 py-3 border-b border-gray-100" ref={searchRef}>
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim() !== '') {
                      setShowSearchResults(true);
                    }
                  }}
                  className="w-full px-4 py-2.5 pl-10 pr-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all text-sm"
                />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 9.293l4.146-4.147a.5.5 0 0 1 .708.708L10.707 10l4.147 4.146a.5.5 0 0 1-.708.708L10 10.707l-4.146 4.147a.5.5 0 0 1-.708-.708L9.293 10 5.146 5.854a.5.5 0 1 1 .708-.708L10 9.293z" fill="currentColor"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
                  {searchResults.assets.length === 0 &&
                   searchResults.liabilities.length === 0 &&
                   searchResults.transactions.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">No results found</div>
                  ) : (
                    <>
                      {searchResults.assets.length > 0 && (
                        <div className="p-2">
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Assets</div>
                          {searchResults.assets.map((asset) => (
                            <button
                              key={asset.id}
                              onClick={() => handleSearchResultClick('asset', asset.id)}
                              className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                              <div className="font-medium text-black">{asset.name}</div>
                              <div className="text-xs text-gray-500">{formatCurrency(asset.value || 0)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.liabilities.length > 0 && (
                        <div className="p-2">
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Liabilities</div>
                          {searchResults.liabilities.map((liability) => (
                            <button
                              key={liability.id}
                              onClick={() => handleSearchResultClick('liability', liability.id)}
                              className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                              <div className="font-medium text-black">{liability.name}</div>
                              <div className="text-xs text-gray-500">{formatCurrency(liability.amount || 0)}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchResults.transactions.length > 0 && (
                        <div className="p-2">
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase">Transactions</div>
                          {searchResults.transactions.map((transaction) => (
                            <button
                              key={transaction.id}
                              onClick={() => handleSearchResultClick('transaction', transaction.id)}
                              className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                              <div className="font-medium text-black">{transaction.description || transaction.merchant}</div>
                              <div className="text-xs text-gray-500">
                                {formatCurrency(transaction.amount || 0)} • {transaction.date ? new Date(transaction.date).toLocaleDateString() : ''}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Navigation Items */}
        <div className="flex-1 py-4 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-[#3f3b39] text-white shadow-soft'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <span className={`flex-shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  {item.icon}
                </span>
                {isExpanded && (
                  <span className={`font-medium text-sm whitespace-nowrap ${
                    isActive ? 'text-white' : 'text-gray-700'
                  }`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Settings */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-4">
          <Link
            href="/settings"
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group cursor-pointer min-h-[44px] ${
              pathname === '/settings'
                ? 'bg-[#3f3b39] text-white shadow-soft'
                : 'text-gray-600 hover:bg-gray-50 hover:text-black'
            }`}
            title={!isExpanded ? 'Settings' : undefined}
          >
            <span className={`flex-shrink-0 transition-colors ${
              pathname === '/settings' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
            }`}>
              <svg width="20" height="20" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" fill="currentColor"/>
              </svg>
            </span>
            {isExpanded && (
              <span className={`font-medium text-sm whitespace-nowrap ${
                pathname === '/settings' ? 'text-white' : 'text-gray-700'
              }`}>
                Settings
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
    </>
  );
}
