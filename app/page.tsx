'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFinancialData, calculateNetWorth } from '@/lib/storage';
import { Asset, Liability, Transaction } from '@/types';

export default function Home() {
  const [netWorth, setNetWorth] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const data = getFinancialData();
    const assetsTotal = data.assets.reduce((sum, asset) => sum + asset.value, 0);
    const liabilitiesTotal = data.liabilities.reduce((sum, liability) => sum + liability.amount, 0);
    
    setTotalAssets(assetsTotal);
    setTotalLiabilities(liabilitiesTotal);
    setNetWorth(calculateNetWorth());
    
    const sorted = [...data.transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setRecentTransactions(sorted.slice(0, 5));
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const data = getFinancialData();
      const assetsTotal = data.assets.reduce((sum, asset) => sum + asset.value, 0);
      const liabilitiesTotal = data.liabilities.reduce((sum, liability) => sum + liability.amount, 0);
      
      setTotalAssets(assetsTotal);
      setTotalLiabilities(liabilitiesTotal);
      setNetWorth(calculateNetWorth());
      
      const sorted = [...data.transactions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecentTransactions(sorted.slice(0, 5));
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-10" style={{ paddingLeft: 'calc(280px + 1.5rem)' }}>
      <div className="mb-10">
        <h1 className="text-4xl font-medium mb-2 text-[#3f3b39] tracking-tight">Overview</h1>
        <p className="text-gray-500 text-[15px] font-light">Your financial summary at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        <div className="bg-white rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-shadow">
          <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Net Worth</p>
          <p className={`text-4xl font-medium tracking-tight ${netWorth >= 0 ? 'text-[#3f3b39]' : 'text-red-600'}`}>
            {formatCurrency(netWorth)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-shadow">
          <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Total Assets</p>
          <p className="text-4xl font-medium tracking-tight text-[#3f3b39]">{formatCurrency(totalAssets)}</p>
        </div>
        <div className="bg-white rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-shadow">
          <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Total Liabilities</p>
          <p className="text-4xl font-medium tracking-tight text-[#3f3b39]">{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-medium text-[#3f3b39]">Recent Transactions</h2>
            <Link 
              href="/transactions" 
              className="text-sm font-medium text-gray-600 hover:text-[#3f3b39] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {recentTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 mb-3 font-light">No transactions yet</p>
                <Link 
                  href="/transactions" 
                  className="text-sm font-medium text-[#3f3b39] hover:text-gray-700 transition-colors inline-block"
                >
                  Add your first transaction →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-5 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#3f3b39] mb-1">{transaction.description}</p>
                        <p className="text-sm text-gray-500 font-light">
                          {transaction.category} • {formatDate(transaction.date)}
                        </p>
                      </div>
                      <p className={`font-medium text-lg ml-4 ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-medium text-[#3f3b39]">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link 
              href="/assets"
              className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all group"
            >
              <p className="font-medium text-[#3f3b39] mb-1.5 group-hover:text-gray-700">Add Asset</p>
              <p className="text-sm text-gray-500 font-light">Track your investments</p>
            </Link>
            <Link 
              href="/liabilities"
              className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all group"
            >
              <p className="font-medium text-[#3f3b39] mb-1.5 group-hover:text-gray-700">Add Liability</p>
              <p className="text-sm text-gray-500 font-light">Record your debts</p>
            </Link>
            <Link 
              href="/transactions"
              className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all group"
            >
              <p className="font-medium text-[#3f3b39] mb-1.5 group-hover:text-gray-700">Add Transaction</p>
              <p className="text-sm text-gray-500 font-light">Log income or expense</p>
            </Link>
            <Link 
              href="/cash-flow"
              className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all group"
            >
              <p className="font-medium text-[#3f3b39] mb-1.5 group-hover:text-gray-700">View Cash Flow</p>
              <p className="text-sm text-gray-500 font-light">Analyze trends</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

