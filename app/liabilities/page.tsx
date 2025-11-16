'use client';

import { useEffect, useState } from 'react';
import { getFinancialData, addLiability, updateLiability, deleteLiability } from '@/lib/storage';
import { Liability } from '@/types';

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    interestRate: '',
    notes: '',
  });

  useEffect(() => {
    loadLiabilities();
    const interval = setInterval(loadLiabilities, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadLiabilities = () => {
    const data = getFinancialData();
    setLiabilities(data.liabilities);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLiability) {
      updateLiability(editingLiability.id, {
        name: formData.name,
        amount: parseFloat(formData.amount) || 0,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        notes: formData.notes || undefined,
      });
    } else {
      addLiability({
        name: formData.name,
        amount: parseFloat(formData.amount) || 0,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        notes: formData.notes || undefined,
      });
    }
    resetForm();
    loadLiabilities();
  };

  const handleEdit = (liability: Liability) => {
    setEditingLiability(liability);
    setFormData({
      name: liability.name,
      amount: liability.amount.toString(),
      interestRate: liability.interestRate?.toString() || '',
      notes: liability.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this liability?')) {
      deleteLiability(id);
      loadLiabilities();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', amount: '', interestRate: '', notes: '' });
    setIsFormOpen(false);
    setEditingLiability(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalAmount = liabilities.reduce((sum, liability) => sum + liability.amount, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-10" style={{ paddingLeft: 'calc(280px + 1.5rem)' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium mb-2 text-[#3f3b39] tracking-tight">Liabilities</h1>
          <p className="text-gray-500 text-[15px] font-light">Manage your debts and loans</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-5 py-2.5 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium text-sm shadow-soft"
        >
          + Add Liability
        </button>
      </div>

      <div className="mb-8 bg-white rounded-2xl p-7 shadow-card">
        <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Total Liabilities</p>
          <p className="text-4xl font-medium tracking-tight text-[#3f3b39]">{formatCurrency(totalAmount)}</p>
      </div>

      {isFormOpen && (
        <div className="mb-8 bg-white rounded-2xl p-8 shadow-card">
          <h2 className="text-2xl font-medium mb-6 text-[#3f3b39]">
            {editingLiability ? 'Edit Liability' : 'Add New Liability'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%) (optional)</label>
              <input
                type="number"
                step="0.01"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
              />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all resize-none"
              />
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft"
              >
                {editingLiability ? 'Update' : 'Add'} Liability
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
        {liabilities.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <p className="mb-2">No liabilities yet.</p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="text-sm font-medium text-[#3f3b39] hover:text-gray-700 transition-colors"
            >
              Add your first liability →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {liabilities.map((liability) => (
              <div key={liability.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-[#3f3b39] mb-2">{liability.name}</h3>
                    <p className="text-3xl font-medium text-[#3f3b39] mb-2">{formatCurrency(liability.amount)}</p>
                    {liability.interestRate !== undefined && (
                      <p className="text-sm text-gray-500 font-light">
                        Interest Rate: {liability.interestRate}%
                      </p>
                    )}
                    {liability.notes && (
                      <p className="text-sm text-gray-500 mt-2 font-light">{liability.notes}</p>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-6">
                    <button
                      onClick={() => handleEdit(liability)}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(liability.id)}
                      className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all font-medium"
                    >
                      Delete
                    </button>
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

