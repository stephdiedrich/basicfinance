'use client';

import { useEffect, useState, useRef } from 'react';
import { getFinancialData, addTransaction, updateTransaction, deleteTransaction, reorderTransactions, getCashFlowCategories } from '@/lib/storage';
import { Transaction, TransactionType, CashFlowCategory } from '@/types';
import { validateAmount, validateDate, validateRequired } from '@/lib/validation';

type TimeFrame = 'last-30-days' | 'this-month' | 'last-month' | 'this-quarter' | 'custom';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CashFlowCategory[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('last-30-days');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
  const [filters, setFilters] = useState({
    merchant: '',
    minAmount: '',
    maxAmount: '',
    category: '',
    tag: '',
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showDateRangeMenu, setShowDateRangeMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const dateRangeMenuRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    category: '',
    amount: '',
    description: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    reviewed: false,
  });
  const [formErrors, setFormErrors] = useState({
    amount: '',
    date: '',
    description: '',
    category: '',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, timeFrame, customDateRange, filters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
        setEditingCategoryId(null);
        setCategorySearch('');
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
      if (dateRangeMenuRef.current && !dateRangeMenuRef.current.contains(event.target as Node)) {
        setShowDateRangeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = () => {
    const data = getFinancialData();
    
    // Migrate existing transactions
    const migrated = (data.transactions || []).map(t => {
      // Extract merchant from description if not set
      if (!t.merchant && t.description) {
        // Simple extraction - take first part of description
        const parts = t.description.split(' ');
        t.merchant = parts[0] || t.description;
      }
      // Set reviewed to false if not set
      if (t.reviewed === undefined) {
        t.reviewed = false;
      }
      // Ensure category is a string
      if (typeof t.category !== 'string') {
        // Map old enum values to strings
        const categoryMap: { [key: string]: string } = {
          'salary': 'Salary',
          'investment': 'Investment',
          'rent': 'Rent',
          'utilities': 'Utilities',
          'food': 'Food & Dining',
          'transportation': 'Transportation',
          'entertainment': 'Entertainment',
          'healthcare': 'Healthcare',
          'other': 'Other',
        };
        t.category = categoryMap[t.category as string] || 'Other';
      }
      return t;
    });

    // Sort by order if available, then by date
    const sorted = [...migrated].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    setTransactions(sorted);
    setCategories(getCashFlowCategories());
  };

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    switch (timeFrame) {
      case 'last-30-days':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'this-quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
        break;
      case 'custom':
        if (customDateRange) {
          start = new Date(customDateRange.start);
          end = new Date(customDateRange.end);
          end.setHours(23, 59, 59);
        } else {
          start = new Date(now);
          start.setDate(start.getDate() - 30);
        }
        break;
      default:
        start = new Date(now);
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  };

  const applyFilters = () => {
    const { start, end } = getDateRange();
    
    let filtered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      if (transactionDate < start || transactionDate > end) return false;

      // Merchant filter
      if (filters.merchant) {
        const merchant = (t.merchant || t.description || '').toLowerCase();
        if (!merchant.includes(filters.merchant.toLowerCase())) return false;
      }

      // Amount range filter
      if (filters.minAmount) {
        const min = parseFloat(filters.minAmount);
        if (t.amount < min) return false;
      }
      if (filters.maxAmount) {
        const max = parseFloat(filters.maxAmount);
        if (t.amount > max) return false;
      }

      // Category filter
      if (filters.category) {
        if (t.category !== filters.category) return false;
      }

      // Tag filter (placeholder for future)
      if (filters.tag) {
        // Future implementation
      }

      return true;
    });

    setFilteredTransactions(filtered);
  };

  const validateForm = (): boolean => {
    const errors = {
      amount: '',
      date: '',
      description: '',
      category: '',
    };
    
    const amountValidation = validateAmount(formData.amount);
    if (!amountValidation.isValid) {
      errors.amount = amountValidation.error || '';
    }
    
    const dateValidation = validateDate(formData.date, false);
    if (!dateValidation.isValid) {
      errors.date = dateValidation.error || '';
    }
    
    const descriptionValidation = validateRequired(formData.description);
    if (!descriptionValidation.isValid) {
      errors.description = descriptionValidation.error || '';
    }
    
    const categoryValidation = validateRequired(formData.category);
    if (!categoryValidation.isValid) {
      errors.category = categoryValidation.error || '';
    }
    
    setFormErrors(errors);
    return !errors.amount && !errors.date && !errors.description && !errors.category;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const transactionData = {
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount) || 0,
        description: formData.description,
      merchant: formData.merchant || formData.description,
        date: formData.date,
      reviewed: formData.reviewed,
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionData);
    } else {
      addTransaction(transactionData);
    }
    resetForm();
    loadData();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description,
      merchant: transaction.merchant || transaction.description,
      date: transaction.date.split('T')[0],
      reviewed: transaction.reviewed || false,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
      loadData();
    }
  };

  const handleToggleReviewed = (id: string, reviewed: boolean) => {
    updateTransaction(id, { reviewed });
    loadData();
  };

  const handleCategoryEdit = (transactionId: string, currentCategory: string) => {
    setEditingCategoryId(transactionId);
    setCategorySearch(currentCategory);
    setShowCategoryDropdown(true);
  };

  const handleCategorySelect = (categoryName: string) => {
    if (editingCategoryId) {
      updateTransaction(editingCategoryId, { category: categoryName });
      setEditingCategoryId(null);
      setCategorySearch('');
      setShowCategoryDropdown(false);
      loadData();
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  ).sort((a, b) => {
    // Prioritize exact matches
    const aExact = a.name.toLowerCase() === categorySearch.toLowerCase();
    const bExact = b.name.toLowerCase() === categorySearch.toLowerCase();
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    // Then prioritize starts with
    const aStarts = a.name.toLowerCase().startsWith(categorySearch.toLowerCase());
    const bStarts = b.name.toLowerCase().startsWith(categorySearch.toLowerCase());
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.order - b.order;
  });

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const items = [...filteredTransactions];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(dropIndex, 0, draggedItem);

    const allTransactionIds = transactions.map(t => t.id);
    const reorderedIds = items.map(item => item.id);
    const remainingIds = allTransactionIds.filter(id => !reorderedIds.includes(id));
    const finalOrder = [...reorderedIds, ...remainingIds];

    reorderTransactions(finalOrder);
    setDraggedIndex(null);
    loadData();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      category: '',
      amount: '',
      description: '',
      merchant: '',
      date: new Date().toISOString().split('T')[0],
      reviewed: false,
    });
    setFormErrors({ amount: '', date: '', description: '', category: '' });
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const clearFilters = () => {
    setFilters({
      merchant: '',
      minAmount: '',
      maxAmount: '',
      category: '',
      tag: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateRangeDisplay = (): string => {
    const { start, end } = getDateRange();
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const handleTimeFrameSelect = (selectedTimeFrame: TimeFrame) => {
    setTimeFrame(selectedTimeFrame);
    if (selectedTimeFrame === 'custom' && !customDateRange) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      setCustomDateRange({
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      });
    }
    setShowDateRangeMenu(false);
  };

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-10" style={{ paddingLeft: 'calc(280px + 1.5rem)' }}>
      <div className="mb-6">
        <h1 className="text-4xl font-medium mb-2 text-black tracking-tight">Transactions</h1>
        <p className="text-gray-500 text-[15px] font-light">Review and categorize your transactions</p>
      </div>

      {/* Date Range and Filter Controls */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        {/* Date Range Button */}
        <div ref={dateRangeMenuRef} className="relative">
          <button
            onClick={() => setShowDateRangeMenu(!showDateRangeMenu)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
              <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z"/>
            </svg>
            <span>{formatDateRangeDisplay()}</span>
            <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" className={`transition-transform ${showDateRangeMenu ? 'rotate-180' : ''}`}>
              <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80a8,8,0,0,1,11.32-11.32L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
            </svg>
          </button>
          {showDateRangeMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
              <div className="p-2">
                <button
                  onClick={() => handleTimeFrameSelect('last-30-days')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    timeFrame === 'last-30-days' ? 'bg-[#3f3b39] text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  Last 30 days
                </button>
                <button
                  onClick={() => handleTimeFrameSelect('this-month')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    timeFrame === 'this-month' ? 'bg-[#3f3b39] text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  This month
                </button>
                <button
                  onClick={() => handleTimeFrameSelect('last-month')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    timeFrame === 'last-month' ? 'bg-[#3f3b39] text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  Last month
                </button>
                <button
                  onClick={() => handleTimeFrameSelect('this-quarter')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    timeFrame === 'this-quarter' ? 'bg-[#3f3b39] text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  This quarter
                </button>
                <button
                  onClick={() => handleTimeFrameSelect('custom')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    timeFrame === 'custom' ? 'bg-[#3f3b39] text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  Custom range
                </button>
                {timeFrame === 'custom' && customDateRange && (
                  <div className="mt-2 p-3 border-t border-gray-200">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start date</label>
                        <input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => {
                            setCustomDateRange({ ...customDateRange!, start: e.target.value });
                            setTimeFrame('custom');
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End date</label>
                        <input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => {
                            setCustomDateRange({ ...customDateRange!, end: e.target.value });
                            setTimeFrame('custom');
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter Button */}
        <div ref={filterMenuRef} className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
              activeFiltersCount > 0 ? 'border-[#3f3b39] text-[#3f3b39]' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
              <path d="M230.6,49.53A15.81,15.81,0,0,0,216,40H40A16,16,0,0,0,28.19,66.76l.08.09L96,139.17V216a16,16,0,0,0,24.87,13.32l32-21.34A16,16,0,0,0,160,194.66V139.17l67.74-72.32.08-.09A15.8,15.8,0,0,0,230.6,49.53ZM40,56h0Zm106.18,74.58A8,8,0,0,0,144,136v58.66L112,216V136a8,8,0,0,0-2.16-5.47L40,56H216Z"/>
            </svg>
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 bg-[#3f3b39] text-white text-xs rounded-full min-w-[20px] text-center">
                {activeFiltersCount}
              </span>
            )}
            <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" className={`transition-transform ${showFilterMenu ? 'rotate-180' : ''}`}>
              <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80a8,8,0,0,1,11.32-11.32L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
            </svg>
          </button>
          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[400px]">
              <div className="p-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Merchant</label>
                    <input
                      type="text"
                      placeholder="Search merchant..."
                      value={filters.merchant}
                      onChange={(e) => setFilters({ ...filters, merchant: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Price Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minAmount}
                        onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxAmount}
                        onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent cursor-pointer"
                    >
                      <option value="">All categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
        <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Tag</label>
                    <select
                      value={filters.tag}
                      onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent cursor-pointer"
                      disabled
                    >
                      <option value="">Coming soon</option>
                    </select>
                  </div>
                </div>
                {activeFiltersCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {filters.merchant && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Merchant: {filters.merchant}
                        </span>
                      )}
                      {(filters.minAmount || filters.maxAmount) && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Range: {filters.minAmount ? formatCurrency(parseFloat(filters.minAmount)) : '$0'} - {filters.maxAmount ? formatCurrency(parseFloat(filters.maxAmount)) : '∞'}
                        </span>
                      )}
                      {filters.category && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          Category: {filters.category}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        clearFilters();
                        setShowFilterMenu(false);
                      }}
                      className="text-xs text-[#3f3b39] hover:text-[#4d4845] font-medium cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <p className="mb-2 font-light">No transactions found.</p>
            {transactions.length === 0 && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="text-sm font-medium text-black hover:text-gray-700 transition-colors cursor-pointer"
              >
                Add your first transaction →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide w-12"></th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">Merchant</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-right py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-center py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide w-24">Reviewed</th>
                  <th className="text-center py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wide w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => (
                  <tr
                    key={transaction.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      draggedIndex === index ? 'opacity-50' : ''
                    } cursor-move`}
                  >
                    <td className="py-4 px-6">
                      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="4" cy="4" r="1.5"/>
                          <circle cx="12" cy="4" r="1.5"/>
                          <circle cx="4" cy="8" r="1.5"/>
                          <circle cx="12" cy="8" r="1.5"/>
                          <circle cx="4" cy="12" r="1.5"/>
                          <circle cx="12" cy="12" r="1.5"/>
                        </svg>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm font-light text-gray-700">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="py-4 px-6 text-sm font-light text-black">
                      {transaction.merchant || transaction.description}
                    </td>
                    <td className="py-4 px-6 relative">
                      {editingCategoryId === transaction.id ? (
                        <div ref={categoryDropdownRef} className="relative">
                          <input
                            type="text"
                            value={categorySearch}
                            onChange={(e) => {
                              setCategorySearch(e.target.value);
                              setShowCategoryDropdown(true);
                            }}
                            onFocus={() => setShowCategoryDropdown(true)}
                            className="px-2.5 py-1 border border-[#3f3b39] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#3f3b39]"
                            autoFocus
                          />
                          {showCategoryDropdown && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-[200px]">
                              {filteredCategories.length > 0 ? (
                                filteredCategories.map(cat => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleCategorySelect(cat.name)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                                  >
                                    {cat.name}
                                  </button>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">No categories found</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          onClick={() => handleCategoryEdit(transaction.id, transaction.category)}
                          className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-light cursor-pointer hover:bg-gray-200 transition-colors inline-block"
                        >
                          {transaction.category || 'Uncategorized'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right text-sm font-light text-black">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <input
                        type="checkbox"
                        checked={transaction.reviewed || false}
                        onChange={(e) => handleToggleReviewed(transaction.id, e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="text-gray-400 hover:text-[#3f3b39] transition-colors cursor-pointer"
                        title="Edit transaction"
                      >
                        <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
                          <path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td colSpan={4} className="py-4 px-6 text-sm font-medium text-black">Total</td>
                  <td className="py-4 px-6 text-right text-sm font-medium text-black">{formatCurrency(totalAmount)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Link */}
      <div className="mt-6">
        <button
          onClick={() => setIsFormOpen(true)}
          className="text-sm font-light text-gray-600 hover:text-black transition-colors cursor-pointer"
        >
          + Add
        </button>
      </div>

      {/* Edit/Add Transaction Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-medium mb-6 text-black">
            {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
          </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all cursor-pointer"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Merchant</label>
                <input
                  type="text"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className={formErrors.category ? 'border border-red-300 rounded-xl' : ''}>
                  <CategorySearchDropdown
                  value={formData.category}
                    onChange={(category) => {
                      setFormData({ ...formData, category });
                      if (formErrors.category) {
                        const validation = validateRequired(category);
                        setFormErrors({ ...formErrors, category: validation.error || '' });
                      }
                    }}
                    categories={categories}
                  />
                </div>
                {formErrors.category && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.category}</p>
                )}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (formErrors.description) {
                    const validation = validateRequired(e.target.value);
                    setFormErrors({ ...formErrors, description: validation.error || '' });
                  }
                }}
                  className={`w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all ${
                    formErrors.description ? 'border-red-300' : 'border-gray-200'
                  }`}
                  rows={2}
              />
              {formErrors.description && (
                <p className="text-sm text-red-600 mt-1">{formErrors.description}</p>
              )}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value });
                  if (formErrors.amount) {
                    const validation = validateAmount(e.target.value);
                    setFormErrors({ ...formErrors, amount: validation.error || '' });
                  }
                }}
                  className={`w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    formErrors.amount ? 'border-red-300' : 'border-gray-200'
                  }`}
              />
              {formErrors.amount && (
                <p className="text-sm text-red-600 mt-1">{formErrors.amount}</p>
              )}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  if (formErrors.date) {
                    const validation = validateDate(e.target.value, false);
                    setFormErrors({ ...formErrors, date: validation.error || '' });
                  }
                }}
                  className={`w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all ${
                    formErrors.date ? 'border-red-300' : 'border-gray-200'
                  }`}
              />
              {formErrors.date && (
                <p className="text-sm text-red-600 mt-1">{formErrors.date}</p>
              )}
            </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="reviewed"
                  checked={formData.reviewed}
                  onChange={(e) => setFormData({ ...formData, reviewed: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="reviewed" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                  Reviewed
                </label>
              </div>
              <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
              >
                {editingTransaction ? 'Update' : 'Add'} Transaction
              </button>
              <button
                type="button"
                onClick={resetForm}
                  className="px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
              >
                Cancel
              </button>
                {editingTransaction && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this transaction?')) {
                        handleDelete(editingTransaction.id);
                        resetForm();
                      }
                    }}
                    className="px-5 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all font-medium cursor-pointer"
                  >
                    Delete
                  </button>
                )}
            </div>
          </form>
          </div>
        </div>
      )}
          </div>
  );
}

// Category Search Dropdown Component
function CategorySearchDropdown({ value, onChange, categories }: { value: string; onChange: (category: string) => void; categories: CashFlowCategory[] }) {
  const [search, setSearch] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const aExact = a.name.toLowerCase() === search.toLowerCase();
    const bExact = b.name.toLowerCase() === search.toLowerCase();
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    const aStarts = a.name.toLowerCase().startsWith(search.toLowerCase());
    const bStarts = b.name.toLowerCase().startsWith(search.toLowerCase());
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.order - b.order;
  });

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search or select category..."
        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
      />
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map(cat => (
                      <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(cat.name);
                  setSearch(cat.name);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {cat.name}
                      </button>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">No categories found. Create one in Settings.</div>
          )}
          </div>
        )}
    </div>
  );
}
