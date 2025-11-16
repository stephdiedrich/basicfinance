'use client';

import { useEffect, useState } from 'react';
import { getFinancialData, addLiability, updateLiability, deleteLiability, reorderLiabilities, getLiabilityClasses, addLiabilityClass, updateLiabilityClass, getLiabilityViews, addLiabilityView, deleteLiabilityView, reorderLiabilityViews, reorderLiabilityClasses } from '@/lib/storage';
import { Liability, LiabilityType, LiabilityClass, LiabilityView } from '@/types';

type CategoryFilter = 'all' | string;

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [liabilityClasses, setLiabilityClasses] = useState<LiabilityClass[]>([]);
  const [liabilityViews, setLiabilityViews] = useState<LiabilityView[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewFormOpen, setIsViewFormOpen] = useState(false);
  const [isNewClassFormOpen, setIsNewClassFormOpen] = useState(false);
  const [isEditClassFormOpen, setIsEditClassFormOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [editingLiabilityClass, setEditingLiabilityClass] = useState<LiabilityClass | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedViewIndex, setDraggedViewIndex] = useState<number | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    amount: '',
    interestRate: '',
    notes: '',
  });
  const [viewFormData, setViewFormData] = useState({
    name: '',
    filterCategories: [] as string[],
  });
  const [newClassFormData, setNewClassFormData] = useState({
    name: '',
  });
  const [editClassFormData, setEditClassFormData] = useState({
    name: '',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    const data = getFinancialData();
    const sorted = [...data.liabilities].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setLiabilities(sorted);
    const classes = getLiabilityClasses();
    const sortedClasses = [...classes].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setLiabilityClasses(sortedClasses);
    setLiabilityViews(getLiabilityViews());
  };

  // Filter views to only show those with liabilities
  const getFilteredViews = (): LiabilityView[] => {
    return liabilityViews.filter(view => {
      if (!view.filterCategories || view.filterCategories.length === 0) {
        return liabilities.length > 0;
      }
      return liabilities.some(liability => view.filterCategories?.includes(liability.type));
    });
  };

  const filteredViews = getFilteredViews();

  const filteredLiabilities = selectedCategory === 'all' 
    ? liabilities 
    : filteredViews.some(v => v.id === selectedCategory)
    ? (() => {
        const view = filteredViews.find(v => v.id === selectedCategory);
        if (!view) return liabilities;
        if (!view.filterCategories || view.filterCategories.length === 0) {
          return liabilities;
        }
        return liabilities.filter(l => view.filterCategories?.includes(l.type));
      })()
    : liabilities.filter(l => l.type === selectedCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLiability) {
      updateLiability(editingLiability.id, {
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount) || 0,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        notes: formData.notes || undefined,
      });
    } else {
      addLiability({
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount) || 0,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        notes: formData.notes || undefined,
      });
    }
    resetForm();
    loadData();
  };

  const handleViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLiabilityView({
      name: viewFormData.name,
      filterCategories: viewFormData.filterCategories.length > 0 ? viewFormData.filterCategories : undefined,
    });
    setViewFormData({ name: '', filterCategories: [] });
    setIsViewFormOpen(false);
    loadData();
  };

  const handleNewClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newClass = addLiabilityClass(newClassFormData.name);
    setFormData({ ...formData, type: newClass.id });
    setNewClassFormData({ name: '' });
    setIsNewClassFormOpen(false);
    loadData();
  };

  const handleEditClass = (liabilityClass: LiabilityClass) => {
    setEditingLiabilityClass(liabilityClass);
    setEditClassFormData({ name: liabilityClass.name });
    setIsEditClassFormOpen(true);
  };

  const handleEditClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLiabilityClass) {
      updateLiabilityClass(editingLiabilityClass.id, { name: editClassFormData.name });
      setEditClassFormData({ name: '' });
      setEditingLiabilityClass(null);
      setIsEditClassFormOpen(false);
      loadData();
    }
  };

  const handleEdit = (liability: Liability) => {
    setEditingLiability(liability);
    setFormData({
      name: liability.name,
      type: liability.type,
      amount: liability.amount.toString(),
      interestRate: liability.interestRate?.toString() || '',
      notes: liability.notes || '',
    });
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', type: liabilityClasses[0]?.id || '', amount: '', interestRate: '', notes: '' });
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

  const getCategoryTotal = (category: CategoryFilter): number => {
    if (category === 'all') {
      return liabilities.reduce((sum, l) => sum + l.amount, 0);
    }
    const isView = filteredViews.some(v => v.id === category);
    if (isView) {
      const view = filteredViews.find(v => v.id === category);
      if (!view) return 0;
      if (!view.filterCategories || view.filterCategories.length === 0) {
        return liabilities.reduce((sum, l) => sum + l.amount, 0);
      }
      return liabilities
        .filter(l => view.filterCategories?.includes(l.type))
        .reduce((sum, l) => sum + l.amount, 0);
    }
    return liabilities
      .filter(l => l.type === category)
      .reduce((sum, l) => sum + l.amount, 0);
  };

  // Drag and drop for liabilities
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    const reordered = [...filteredLiabilities];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    reorderLiabilities(reordered.map(l => l.id));
    setDraggedIndex(null);
    loadData();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Drag and drop for views
  const handleViewDragStart = (index: number) => {
    setDraggedViewIndex(index);
  };

  const handleViewDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleViewDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedViewIndex === null) return;
    
    const reordered = [...filteredViews];
    const [removed] = reordered.splice(draggedViewIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    reorderLiabilityViews(reordered.map(v => v.id));
    setDraggedViewIndex(null);
    loadData();
  };

  const handleViewDragEnd = () => {
    setDraggedViewIndex(null);
  };

  // Drag and drop for categories
  const handleCategoryDragStart = (index: number) => {
    setDraggedCategoryIndex(index);
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCategoryDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedCategoryIndex === null) return;
    
    const reordered = [...liabilityClasses];
    const [removed] = reordered.splice(draggedCategoryIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    reorderLiabilityClasses(reordered.map(lc => lc.id));
    setDraggedCategoryIndex(null);
    loadData();
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryIndex(null);
  };

  // Unified drag handlers for tabs
  const handleTabDragStart = (category: CategoryFilter, index: number) => {
    if (category === 'all') return;
    const isView = filteredViews.some(v => v.id === category);
    if (isView) {
      handleViewDragStart(filteredViews.findIndex(v => v.id === category));
    } else {
      const classIndex = liabilityClasses.findIndex(lc => lc.id === category);
      if (classIndex !== -1) {
        handleCategoryDragStart(classIndex);
      }
    }
  };

  const handleTabDragOver = (e: React.DragEvent, category: CategoryFilter) => {
    if (category === 'all') return;
    e.preventDefault();
  };

  const handleTabDrop = (e: React.DragEvent, category: CategoryFilter, index: number) => {
    if (category === 'all') return;
    e.preventDefault();
    const isView = filteredViews.some(v => v.id === category);
    if (isView) {
      handleViewDrop(e, filteredViews.findIndex(v => v.id === category));
    } else {
      const classIndex = liabilityClasses.findIndex(lc => lc.id === category);
      if (classIndex !== -1) {
        handleCategoryDrop(e, classIndex);
      }
    }
  };

  const handleTabDragEnd = () => {
    handleViewDragEnd();
    handleCategoryDragEnd();
  };

  const categories: CategoryFilter[] = ['all', ...liabilityClasses.map(lc => lc.id), ...filteredViews.map(v => v.id)];

  return (
    <div className="w-full pr-8 lg:pr-16 py-10" style={{ paddingLeft: 'calc(280px + 2rem)' }}>
      <div className="mb-10">
        <h1 className="text-4xl font-medium mb-2 text-black tracking-tight">Liabilities</h1>
        <p className="text-gray-500 text-[15px] font-light">Manage your debts and loans</p>
      </div>

      {/* Category Tabs */}
      <div className="mb-8 flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        {categories.map((category, index) => {
          const isView = filteredViews.some(v => v.id === category);
          const isLiabilityClass = liabilityClasses.some(lc => lc.id === category);
          const isAll = category === 'all';
          const isDraggable = !isAll;
          
          let label: string;
          if (isAll) {
            label = 'All';
          } else if (isView) {
            label = filteredViews.find(v => v.id === category)?.name || category;
          } else {
            label = liabilityClasses.find(lc => lc.id === category)?.name || category;
          }
          
          const total = getCategoryTotal(category);
          const isDragging = (draggedViewIndex !== null && isView) || (draggedCategoryIndex !== null && isLiabilityClass);
          const liabilityClass = isLiabilityClass ? liabilityClasses.find(lc => lc.id === category) : null;
          
          return (
            <div
              key={category}
              className="flex items-center gap-1 group"
            >
              <button
                draggable={isDraggable}
                onDragStart={isDraggable ? () => handleTabDragStart(category, index) : undefined}
                onDragOver={isDraggable ? handleTabDragOver : undefined}
                onDrop={isDraggable ? (e) => handleTabDrop(e, category, index) : undefined}
                onDragEnd={isDraggable ? handleTabDragEnd : undefined}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-white text-black shadow-soft'
                    : 'text-gray-600 hover:text-black'
                } ${isDragging ? 'opacity-50' : ''}`}
              >
                {label} <span className="text-gray-500 font-normal">({formatCurrency(total)})</span>
              </button>
              {isLiabilityClass && liabilityClass && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClass(liabilityClass);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-black cursor-pointer"
                  title="Edit category name"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={() => setIsViewFormOpen(true)}
          className="px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium text-gray-600 hover:text-black hover:bg-white cursor-pointer"
        >
          + View
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest Rate</th>
              <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              <th className="px-8 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filteredLiabilities.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-16 text-center text-gray-500">
                  <p className="mb-2">No liabilities yet.</p>
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="text-sm font-medium text-black hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    Add your first liability →
                  </button>
                </td>
              </tr>
            ) : (
              filteredLiabilities.map((liability, index) => (
                <tr
                  key={liability.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-8 py-4">
                    <span className="font-medium text-black">
                      {liability.name}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-gray-600 font-light">
                    {liabilityClasses.find(lc => lc.id === liability.type)?.name || liability.type}
                  </td>
                  <td className="px-8 py-4 font-medium text-black">
                    {formatCurrency(liability.amount)}
                  </td>
                  <td className="px-8 py-4 text-gray-500">
                    {liability.interestRate !== undefined ? `${liability.interestRate}%` : '—'}
                  </td>
                  <td className="px-8 py-4">
                    <button
                      onClick={() => handleEdit(liability)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                      title="Edit liability"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                      </svg>
                    </button>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing">
                      <div className="flex flex-col gap-0.5">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {filteredLiabilities.length > 0 && (
              <tr className="bg-gray-50/50 border-t-2 border-gray-200">
                <td colSpan={2} className="px-8 py-4 font-medium text-black">Total</td>
                <td className="px-8 py-4 font-medium text-black">
                  {formatCurrency(getCategoryTotal(selectedCategory))}
                </td>
                <td className="px-8 py-4"></td>
                <td colSpan={2} className="px-8 py-4"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Button */}
      <div className="mt-6">
        <button
          onClick={() => setIsFormOpen(true)}
          className="text-gray-500 hover:text-black transition-colors font-light text-sm cursor-pointer"
        >
          + Add
        </button>
      </div>

      {/* Liability Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="flex gap-2">
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Select category...</option>
                    {liabilityClasses.map(lc => (
                      <option key={lc.id} value={lc.id}>{lc.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsNewClassFormOpen(true)}
                    className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium transition-all cursor-pointer"
                    title="Add new category"
                  >
                    +
                  </button>
                </div>
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
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  {editingLiability ? 'Update' : 'Add'} Liability
                </button>
                {editingLiability && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this liability? This action cannot be undone.')) {
                        deleteLiability(editingLiability.id);
                        resetForm();
                        loadData();
                      }
                    }}
                    className="px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium shadow-soft cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Creator Modal */}
      {isViewFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">Create Custom View</h2>
            <form onSubmit={handleViewSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">View Name</label>
                <input
                  type="text"
                  required
                  value={viewFormData.name}
                  onChange={(e) => setViewFormData({ ...viewFormData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., High Interest Debt, Credit Cards Only"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Categories (optional)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
                  {liabilityClasses.map(lc => (
                    <label key={lc.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={viewFormData.filterCategories.includes(lc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setViewFormData({
                              ...viewFormData,
                              filterCategories: [...viewFormData.filterCategories, lc.id],
                            });
                          } else {
                            setViewFormData({
                              ...viewFormData,
                              filterCategories: viewFormData.filterCategories.filter(id => id !== lc.id),
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{lc.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Leave empty to show all categories</p>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  Create View
                </button>
                <button
                  type="button"
                  onClick={() => setIsViewFormOpen(false)}
                  className="px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Category Form Modal */}
      {isNewClassFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">Add New Category</h2>
            <form onSubmit={handleNewClassSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                <input
                  type="text"
                  required
                  value={newClassFormData.name}
                  onChange={(e) => setNewClassFormData({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., Medical Debt, Tax Debt"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewClassFormOpen(false)}
                  className="px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Form Modal */}
      {isEditClassFormOpen && editingLiabilityClass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">Edit Category</h2>
            <form onSubmit={handleEditClassSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                <input
                  type="text"
                  required
                  value={editClassFormData.name}
                  onChange={(e) => setEditClassFormData({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., Credit Card, Mortgage"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditClassFormOpen(false);
                    setEditingLiabilityClass(null);
                    setEditClassFormData({ name: '' });
                  }}
                  className="px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
