'use client';

import React, { useEffect, useState } from 'react';
import { getFinancialData, getBudgets, getCashFlowLineItems, getCashFlowGroups, getCashFlowCategories, addBudget, updateBudget } from '@/lib/storage';
import { Transaction, BudgetItem, CashFlowLineItem, CashFlowGroup, CashFlowCategory } from '@/types';

type ViewMode = 'month' | 'year';

interface ExpenseItem {
  name: string;
  category: string;
  subCategory?: string;
  budgeted: number;
  spent: number;
  percent: number;
  lineItemId: string;
  categoryName?: string;
}

interface ExpenseGroup {
  name: string;
  items: ExpenseItem[];
  totalBudgeted: number;
  totalSpent: number;
  totalPercent: number;
}

export default function CashFlowPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [lineItems, setLineItems] = useState<CashFlowLineItem[]>([]);
  const [groups, setGroups] = useState<CashFlowGroup[]>([]);
  const [categories, setCategories] = useState<CashFlowCategory[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingBudget, setEditingBudget] = useState<{ lineItemId: string; categoryName: string } | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState<string>('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, [selectedYear, selectedMonth, viewMode]);

  const loadData = () => {
    const data = getFinancialData();
    setTransactions(data.transactions || []);
    setLineItems(getCashFlowLineItems());
    setGroups(getCashFlowGroups());
    setCategories(getCashFlowCategories());
    if (viewMode === 'month') {
      setBudgets(getBudgets(selectedYear, selectedMonth));
    } else {
      // For annual view, get all budgets for the year
      const allBudgets: BudgetItem[] = [];
      for (let m = 1; m <= 12; m++) {
        allBudgets.push(...getBudgets(selectedYear, m));
      }
      setBudgets(allBudgets);
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

  // Get transactions for the selected period
  const getPeriodTransactions = (): Transaction[] => {
    if (viewMode === 'year') {
      return transactions.filter(t => {
        const date = new Date(t.date);
        return date.getFullYear() === selectedYear;
      });
    } else {
      return transactions.filter(t => {
        const date = new Date(t.date);
        return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
      });
    }
  };

  const periodTransactions = getPeriodTransactions();

  // Get income line items organized by groups (matching settings structure)
  const incomeLineItems = lineItems
    .filter(item => item.type === 'income')
    .sort((a, b) => {
      if (a.groupId !== b.groupId) {
        if (!a.groupId) return 1;
        if (!b.groupId) return -1;
        const groupA = groups.find(g => g.id === a.groupId);
        const groupB = groups.find(g => g.id === b.groupId);
        if (!groupA || !groupB) return 0;
        return groupA.order - groupB.order;
      }
      return a.order - b.order;
    });

  // Calculate income amounts for each item
  const incomeItemsMap = new Map<string, number>();
  incomeLineItems.forEach(item => {
    const category = item.categoryId ? categories.find(c => c.id === item.categoryId) : null;
    const matched = periodTransactions.filter(t => {
      if (t.type !== 'income') return false;
      // Match by category name if set
      if (category && t.description.toLowerCase().includes(category.name.toLowerCase())) return true;
      // Match by line item name
      if (t.description.toLowerCase().includes(item.name.toLowerCase())) return true;
      return false;
    });
    const total = matched.reduce((sum, t) => sum + t.amount, 0);
    incomeItemsMap.set(item.id, total);
  });

  const totalIncome = Array.from(incomeItemsMap.values()).reduce((sum, amount) => sum + amount, 0);

  // Get expense line items and organize by groups
  const expenseLineItems = lineItems
    .filter(item => item.type === 'expense')
    .sort((a, b) => {
      if (a.groupId !== b.groupId) {
        if (!a.groupId) return 1;
        if (!b.groupId) return -1;
        const groupA = groups.find(g => g.id === a.groupId);
        const groupB = groups.find(g => g.id === b.groupId);
        if (!groupA || !groupB) return 0;
        return groupA.order - groupB.order;
      }
      return a.order - b.order;
    });

  // Build expense groups from line items
  const expenseGroupsMap = new Map<string, ExpenseGroup>();
  
  expenseLineItems.forEach(lineItem => {
    const group = lineItem.groupId ? groups.find(g => g.id === lineItem.groupId) : null;
    const groupName = group?.name || 'Ungrouped';
    
    if (!expenseGroupsMap.has(groupName)) {
      expenseGroupsMap.set(groupName, {
        name: groupName,
        items: [],
        totalBudgeted: 0,
        totalSpent: 0,
        totalPercent: 0,
      });
    }
    
    const expenseGroup = expenseGroupsMap.get(groupName)!;
    const category = lineItem.categoryId ? categories.find(c => c.id === lineItem.categoryId) : null;
    
    // Get spent amount from transactions - match by category name or line item name
    const spent = periodTransactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        // Match by category name if set
        if (category && t.description.toLowerCase().includes(category.name.toLowerCase())) return true;
        // Match by line item name
        if (t.description.toLowerCase().includes(lineItem.name.toLowerCase())) return true;
        return false;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Get budgeted amount - match by category name
    let budgeted = 0;
    if (category) {
      if (viewMode === 'month') {
        const budget = budgets.find(b => 
          b.category === category.name || b.subCategory === category.name
        );
        budgeted = budget?.budgeted || 0;
      } else {
        // For annual view, sum all months
        const yearBudgets = budgets.filter(b => 
          b.category === category.name || b.subCategory === category.name
        );
        budgeted = yearBudgets.reduce((sum, b) => sum + b.budgeted, 0);
      }
    }

    const percent = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

    expenseGroup.items.push({
      name: lineItem.name,
      category: category?.name || 'other',
      subCategory: category?.name,
      budgeted,
      spent,
      percent,
      lineItemId: lineItem.id,
      categoryName: category?.name,
    });

    expenseGroup.totalBudgeted += budgeted;
    expenseGroup.totalSpent += spent;
  });

  // Calculate group percentages and convert to array
  const expenseGroups = Array.from(expenseGroupsMap.values()).map(group => {
    group.totalPercent = group.totalBudgeted > 0 
      ? Math.round((group.totalSpent / group.totalBudgeted) * 100) 
      : 0;
    return group;
  });

  const totalExpensesBudgeted = expenseGroups.reduce((sum, g) => sum + g.totalBudgeted, 0);
  const totalExpensesSpent = expenseGroups.reduce((sum, g) => sum + g.totalSpent, 0);
  const netIncome = totalIncome - totalExpensesSpent;

  // Handle budget editing
  const handleBudgetEdit = (item: ExpenseItem) => {
    setEditingBudget({ lineItemId: item.lineItemId, categoryName: item.categoryName || '' });
    setEditingBudgetValue(item.budgeted.toString());
  };

  const handleBudgetSave = (item: ExpenseItem) => {
    const value = parseFloat(editingBudgetValue.replace(/[^0-9.-]/g, '')) || 0;
    const categoryName = item.categoryName || item.category;
    
    if (viewMode === 'month') {
      // Find existing budget for this month
      const existingBudget = budgets.find(b => 
        (b.category === categoryName || b.subCategory === categoryName) &&
        b.year === selectedYear &&
        b.month === selectedMonth
      );
      
      if (existingBudget) {
        updateBudget(existingBudget.id, { budgeted: value });
      } else {
        addBudget({
          category: categoryName,
          budgeted: value,
          year: selectedYear,
          month: selectedMonth,
        });
      }
    } else {
      // For annual view, update all months (or create if doesn't exist)
      for (let m = 1; m <= 12; m++) {
        const existingBudget = budgets.find(b => 
          (b.category === categoryName || b.subCategory === categoryName) &&
          b.year === selectedYear &&
          b.month === m
        );
        
        if (existingBudget) {
          updateBudget(existingBudget.id, { budgeted: value / 12 });
        } else {
          addBudget({
            category: categoryName,
            budgeted: value / 12,
            year: selectedYear,
            month: m,
          });
        }
      }
    }
    
    setEditingBudget(null);
    setEditingBudgetValue('');
    loadData();
  };

  const handleBudgetCancel = () => {
    setEditingBudget(null);
    setEditingBudgetValue('');
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i);
  }

  const handlePreviousPeriod = () => {
    if (viewMode === 'month') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'month') {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full pr-8 lg:pr-16 py-10" style={{ paddingLeft: 'calc(280px + 2rem)' }}>
      <div className="mb-10">
        <h1 className="text-4xl font-medium mb-2 text-black tracking-tight">Cash Flow</h1>
        <p className="text-gray-500 text-[15px] font-light">Monthly income, expenses, and net income overview</p>
        </div>

      {/* Period Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousPeriod}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {viewMode === 'month' ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all font-medium text-sm cursor-pointer"
              >
                {months.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all font-medium text-sm cursor-pointer"
        >
          {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all font-medium text-sm cursor-pointer"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleNextPeriod}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              viewMode === 'month'
                ? 'bg-white text-black shadow-soft'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              viewMode === 'year'
                ? 'bg-white text-black shadow-soft'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Cash Flow Statement */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="p-8">
          {/* Income Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-medium mb-6 text-black">Income</h2>
            <div className="space-y-1">
              {/* Income items grouped by groups */}
              {(groups || []).filter(group => incomeLineItems.some(item => item.groupId === group.id)).map((group, groupIndex, filteredGroups) => {
                const groupItems = incomeLineItems.filter(item => item.groupId === group.id);
                const groupTotal = groupItems.reduce((sum, item) => sum + (incomeItemsMap.get(item.id) || 0), 0);
                const isCollapsed = collapsedGroups.has(group.id);
                const isLastGroup = groupIndex === filteredGroups.length - 1 && incomeLineItems.filter(item => !item.groupId).length === 0;
                
                return (
                  <div key={group.id} className={isLastGroup ? '' : 'border-b border-gray-200'}>
                    {/* Group header with subtotal */}
                    <div 
                      className="flex justify-between items-center py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-2">
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        >
                          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="font-medium text-black">{group.name}</span>
                      </div>
                      <span className="font-medium text-black">{formatCurrency(groupTotal)}</span>
                    </div>
                    {/* Line items (indented) */}
                    {!isCollapsed && (
                      <div className="space-y-1 pb-2">
                        {groupItems.map((item) => {
                          const amount = incomeItemsMap.get(item.id) || 0;
                          return (
                            <div key={item.id} className="flex justify-between items-center py-2 pl-8">
                              <span className="text-gray-700 font-light">{item.name}</span>
                              <span className="font-medium text-black">{formatCurrency(amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Ungrouped income items */}
              {incomeLineItems.filter(item => !item.groupId).length > 0 && (
                <div className="space-y-1 pb-2">
                  {incomeLineItems.filter(item => !item.groupId).map((item) => {
                    const amount = incomeItemsMap.get(item.id) || 0;
                    return (
                      <div key={item.id} className="flex justify-between items-center py-2">
                        <span className="text-gray-700 font-light">{item.name}</span>
                        <span className="font-medium text-black">{formatCurrency(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {incomeLineItems.length === 0 && (
                <div className="py-2 text-gray-500 text-sm">No income line items configured. Add them in Settings.</div>
              )}
              <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 mt-2">
                <span className="font-medium text-black">Total Income</span>
                <span className="font-medium text-black">{formatCurrency(totalIncome)}</span>
              </div>
            </div>
        </div>

          {/* Expenses Section */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <h2 className="text-2xl font-medium text-black flex-1">Expenses</h2>
              <div className="flex text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '280px', justifyContent: 'flex-end', gap: '24px' }}>
                <span className="text-right" style={{ width: '96px', display: 'block', whiteSpace: 'nowrap' }}>Budgeted</span>
                <span className="text-right" style={{ width: '96px', display: 'block', whiteSpace: 'nowrap' }}>Spent</span>
                <span className="text-right" style={{ width: '64px', display: 'block', whiteSpace: 'nowrap' }}>% Budget</span>
              </div>
            </div>
            <div className="space-y-1">
              {/* Expense groups matching settings structure */}
              {(() => {
                const groupsWithExpenses = (groups || []).filter(group => {
                  const groupExpenseData = expenseGroups.find(g => g.name === group.name);
                  return groupExpenseData && groupExpenseData.items.length > 0;
                });
                const hasUngrouped = expenseGroups.find(g => g.name === 'Ungrouped') && expenseGroups.find(g => g.name === 'Ungrouped')!.items.length > 0;
                
                return groupsWithExpenses.map((group, groupIndex) => {
                  const groupExpenseData = expenseGroups.find(g => g.name === group.name)!;
                  const isCollapsed = collapsedGroups.has(group.id);
                  const isLastGroup = groupIndex === groupsWithExpenses.length - 1 && !hasUngrouped;
                  
                  return (
                    <div key={group.id} className={isLastGroup ? '' : 'border-b border-gray-200'}>
                    {/* Group header with subtotal */}
                    <div 
                      className="flex items-center py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        >
                          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="font-medium text-black">{group.name}</span>
                      </div>
                      <div className="flex" style={{ width: '280px', justifyContent: 'flex-end', gap: '24px' }}>
                        <span className="text-right font-medium text-black" style={{ width: '96px', display: 'block' }}>
                          {formatCurrency(groupExpenseData.totalBudgeted)}
                        </span>
                        <span className="text-right font-medium text-black" style={{ width: '96px', display: 'block' }}>
                          {formatCurrency(groupExpenseData.totalSpent)}
                        </span>
                        <span className={`text-right font-medium ${
                          groupExpenseData.totalPercent > 100 ? 'text-orange-600' : 'text-black'
                        }`} style={{ width: '64px', display: 'block' }}>
                          {groupExpenseData.totalPercent}%
                        </span>
                      </div>
                    </div>
                    {/* Line items (indented) */}
                    {!isCollapsed && (
                      <div className="space-y-1 pb-2">
                        {groupExpenseData.items.map((item, itemIndex) => (
                          <div
                            key={itemIndex}
                            className={`flex items-center py-2 pl-8 ${
                              item.percent > 100 ? 'bg-orange-50 rounded-lg px-3' : ''
                            }`}
                          >
                            <span className="text-gray-700 font-light flex-1">{item.name}</span>
                            <div className="flex" style={{ width: '280px', justifyContent: 'flex-end', gap: '24px' }}>
                              {editingBudget?.lineItemId === item.lineItemId ? (
                                <input
                                  type="text"
                                  value={editingBudgetValue}
                                  onChange={(e) => setEditingBudgetValue(e.target.value)}
                                  onBlur={() => handleBudgetSave(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleBudgetSave(item);
                                    } else if (e.key === 'Escape') {
                                      handleBudgetCancel();
                                    }
                                  }}
                                  className="text-right font-light text-gray-700 border-b-2 border-[#3f3b39] focus:outline-none bg-transparent px-1"
                                  style={{ width: '96px', display: 'block' }}
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className="text-right font-light text-gray-700 cursor-pointer hover:text-black transition-colors" 
                                  style={{ width: '96px', display: 'block' }}
                                  onClick={() => handleBudgetEdit(item)}
                                  title="Click to edit budget"
                                >
                                  {formatCurrency(item.budgeted)}
                                </span>
                              )}
                              <span className="text-right font-light text-gray-700" style={{ width: '96px', display: 'block' }}>
                                {formatCurrency(item.spent)}
                              </span>
                              <span className={`text-right font-medium ${
                                item.percent > 100 ? 'text-orange-600' : 'text-gray-700'
                              }`} style={{ width: '64px', display: 'block' }}>
                                {item.percent}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  );
                });
              })()}
              {/* Ungrouped expenses */}
              {expenseGroups.find(g => g.name === 'Ungrouped') && (() => {
                const ungrouped = expenseGroups.find(g => g.name === 'Ungrouped')!;
                if (ungrouped.items.length === 0) return null;
                return (
                  <div>
                    <div className="flex items-center py-3">
                      <span className="font-medium text-black flex-1">Ungrouped</span>
                      <div className="flex" style={{ width: '280px', justifyContent: 'flex-end', gap: '24px' }}>
                        <span className="text-right font-medium text-black" style={{ width: '96px', display: 'block' }}>
                          {formatCurrency(ungrouped.totalBudgeted)}
                        </span>
                        <span className="text-right font-medium text-black" style={{ width: '96px', display: 'block' }}>
                          {formatCurrency(ungrouped.totalSpent)}
                        </span>
                        <span className={`text-right font-medium ${
                          ungrouped.totalPercent > 100 ? 'text-orange-600' : 'text-black'
                        }`} style={{ width: '64px', display: 'block' }}>
                          {ungrouped.totalPercent}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 pb-2">
                      {ungrouped.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className={`flex items-center py-2 pl-8 ${
                            item.percent > 100 ? 'bg-orange-50 rounded-lg px-3' : ''
                          }`}
                        >
                          <span className="text-gray-700 font-light flex-1">{item.name}</span>
                          <div className="flex" style={{ width: '280px', justifyContent: 'flex-end', gap: '24px' }}>
                            {editingBudget?.lineItemId === item.lineItemId ? (
                                <input
                                  type="text"
                                  value={editingBudgetValue}
                                  onChange={(e) => setEditingBudgetValue(e.target.value)}
                                  onBlur={() => handleBudgetSave(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleBudgetSave(item);
                                    } else if (e.key === 'Escape') {
                                      handleBudgetCancel();
                                    }
                                  }}
                                  className="text-right font-light text-gray-700 border-b-2 border-[#3f3b39] focus:outline-none bg-transparent px-1"
                                  style={{ width: '96px', display: 'block' }}
                                  autoFocus
                                />
                            ) : (
                              <span 
                                className="text-right font-light text-gray-700 cursor-pointer hover:text-black transition-colors" 
                                style={{ width: '96px', display: 'block' }}
                                onClick={() => handleBudgetEdit(item)}
                                title="Click to edit budget"
                              >
                                {formatCurrency(item.budgeted)}
                              </span>
                            )}
                            <span className="text-right font-light text-gray-700" style={{ width: '96px', display: 'block' }}>
                              {formatCurrency(item.spent)}
                            </span>
                            <span className={`text-right font-medium ${
                              item.percent > 100 ? 'text-orange-600' : 'text-gray-700'
                            }`} style={{ width: '64px', display: 'block' }}>
                              {item.percent}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {expenseLineItems.length === 0 && (
                <div className="py-2 text-gray-500 text-sm">No expense line items configured. Add them in Settings.</div>
              )}
              <div className="flex items-center py-3 border-t-2 border-gray-300 mt-2">
                <span className="font-medium text-black flex-1">Total Expenses</span>
                <div className="flex" style={{ width: '280px', justifyContent: 'flex-end', gap: '24px' }}>
                  <span className="text-right font-medium text-black" style={{ width: '96px', display: 'block' }}>
                    {formatCurrency(totalExpensesBudgeted)}
                  </span>
                  <span className="text-right font-medium text-black" style={{ width: '96px', display: 'block' }}>
                    {formatCurrency(totalExpensesSpent)}
                  </span>
                  <span style={{ width: '64px', display: 'block' }}></span>
                </div>
              </div>
        </div>
      </div>

          {/* Net Income */}
          <div className="border-t-2 border-gray-300 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-black">Net Income</span>
              <span className={`text-lg font-medium ${
                netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {formatCurrency(netIncome)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
