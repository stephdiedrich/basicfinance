'use client';

import { useEffect, useState } from 'react';
import { getFinancialData, addTransaction, updateTransaction, deleteTransaction } from '@/lib/storage';
import { Transaction, TransactionType, TransactionCategory } from '@/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    category: 'other' as TransactionCategory,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadTransactions();
    const interval = setInterval(loadTransactions, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadTransactions = () => {
    const data = getFinancialData();
    const sorted = [...data.transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setTransactions(sorted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount) || 0,
        description: formData.description,
        date: formData.date,
      });
    } else {
      addTransaction({
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount) || 0,
        description: formData.description,
        date: formData.date,
      });
    }
    resetForm();
    loadTransactions();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.date.split('T')[0],
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
      loadTransactions();
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      category: 'other',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsFormOpen(false);
    setEditingTransaction(null);
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-10" style={{ paddingLeft: 'calc(280px + 1.5rem)' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium mb-2 text-[#3f3b39] tracking-tight">Transactions</h1>
          <p className="text-gray-500 text-[15px] font-light">Track your income and expenses</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-5 py-2.5 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium text-sm shadow-soft"
        >
          + Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-7 shadow-card">
          <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Total Income</p>
          <p className="text-4xl font-medium tracking-tight text-emerald-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-2xl p-7 shadow-card">
          <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Total Expenses</p>
          <p className="text-4xl font-medium tracking-tight text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {isFormOpen && (
        <div className="mb-8 bg-white rounded-2xl p-8 shadow-card">
          <h2 className="text-2xl font-medium mb-6 text-[#3f3b39]">
            {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TransactionCategory })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
              >
                <option value="salary">Salary</option>
                <option value="investment">Investment</option>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="food">Food</option>
                <option value="transportation">Transportation</option>
                <option value="entertainment">Entertainment</option>
                <option value="healthcare">Healthcare</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
              />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
              />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft"
              >
                {editingTransaction ? 'Update' : 'Add'} Transaction
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <p className="mb-2">No transactions yet.</p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="text-sm font-medium text-[#3f3b39] hover:text-gray-700 transition-colors"
            >
              Add your first transaction →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-medium text-[#3f3b39]">{transaction.description}</h3>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                        transaction.type === 'income' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {transaction.type}
                      </span>
                      <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg">
                        {transaction.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-light">{formatDate(transaction.date)}</p>
                  </div>
                  <div className="flex items-center gap-4 ml-6">
                    <p className={`text-xl font-medium ${
                      transaction.type === 'income' 
                        ? 'text-emerald-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

