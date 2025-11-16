'use client';

import { useEffect, useState } from 'react';
import { getFinancialData, addAsset, updateAsset, deleteAsset, reorderAssets, getAssetClasses, addAssetClass, updateAssetClass, getAssetViews, addAssetView, deleteAssetView, reorderAssetViews, reorderAssetClasses } from '@/lib/storage';
import { Asset, AssetType, AssetClass, AssetView } from '@/types';

type CategoryFilter = 'all' | string;

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [assetViews, setAssetViews] = useState<AssetView[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewFormOpen, setIsViewFormOpen] = useState(false);
  const [isNewClassFormOpen, setIsNewClassFormOpen] = useState(false);
  const [isEditClassFormOpen, setIsEditClassFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingAssetClass, setEditingAssetClass] = useState<AssetClass | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedViewIndex, setDraggedViewIndex] = useState<number | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    value: '',
    institution: '',
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
    const sorted = [...data.assets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setAssets(sorted);
    const classes = getAssetClasses();
    const sortedClasses = [...classes].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setAssetClasses(sortedClasses);
    setAssetViews(getAssetViews());
  };

  // Filter views to only show those with assets
  const getFilteredViews = (): AssetView[] => {
    return assetViews.filter(view => {
      if (!view.filterCategories || view.filterCategories.length === 0) {
        // If no filter, check if there are any assets at all
        return assets.length > 0;
      }
      // Check if any assets match the view's filter
      return assets.some(asset => view.filterCategories?.includes(asset.type));
    });
  };

  const filteredViews = getFilteredViews();

  const filteredAssets = selectedCategory === 'all' 
    ? assets 
    : filteredViews.some(v => v.id === selectedCategory)
    ? (() => {
        const view = filteredViews.find(v => v.id === selectedCategory);
        if (!view) return assets;
        if (!view.filterCategories || view.filterCategories.length === 0) {
          return assets;
        }
        return assets.filter(a => view.filterCategories?.includes(a.type));
      })()
    : assets.filter(a => a.type === selectedCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAsset) {
      updateAsset(editingAsset.id, {
        name: formData.name,
        type: formData.type,
        value: parseFloat(formData.value) || 0,
        institution: formData.institution || undefined,
        notes: formData.notes || undefined,
      });
    } else {
      addAsset({
        name: formData.name,
        type: formData.type,
        value: parseFloat(formData.value) || 0,
        institution: formData.institution || undefined,
        notes: formData.notes || undefined,
        order: assets.length,
      });
    }
    resetForm();
    loadData();
  };

  const handleViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAssetView({
      name: viewFormData.name,
      filterCategories: viewFormData.filterCategories.length > 0 ? viewFormData.filterCategories : undefined,
    });
    setViewFormData({ name: '', filterCategories: [] });
    setIsViewFormOpen(false);
    loadData();
  };

  const handleNewClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newClass = addAssetClass(newClassFormData.name);
    setFormData({ ...formData, type: newClass.id });
    setNewClassFormData({ name: '' });
    setIsNewClassFormOpen(false);
    loadData();
  };

  const handleEditClass = (assetClass: AssetClass) => {
    setEditingAssetClass(assetClass);
    setEditClassFormData({ name: assetClass.name });
    setIsEditClassFormOpen(true);
  };

  const handleEditClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAssetClass) {
      updateAssetClass(editingAssetClass.id, { name: editClassFormData.name });
      setEditClassFormData({ name: '' });
      setEditingAssetClass(null);
      setIsEditClassFormOpen(false);
      loadData();
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      type: asset.type,
      value: asset.value.toString(),
      institution: asset.institution || '',
      notes: asset.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      deleteAsset(id);
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', type: assetClasses[0]?.id || '', value: '', institution: '', notes: '' });
    setIsFormOpen(false);
    setEditingAsset(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryTotal = (category: CategoryFilter) => {
    if (category === 'all') {
      return assets.reduce((sum, asset) => sum + asset.value, 0);
    }
    const view = filteredViews.find(v => v.id === category);
    if (view) {
      if (!view.filterCategories || view.filterCategories.length === 0) {
        return assets.reduce((sum, asset) => sum + asset.value, 0);
      }
      return assets
        .filter(a => view.filterCategories?.includes(a.type))
        .reduce((sum, asset) => sum + asset.value, 0);
    }
    return assets.filter(a => a.type === category).reduce((sum, asset) => sum + asset.value, 0);
  };

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

    const items = [...filteredAssets];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(dropIndex, 0, draggedItem);
    
    const allAssetIds = assets.map(a => a.id);
    const reorderedIds = items.map(item => item.id);
    const remainingIds = allAssetIds.filter(id => !reorderedIds.includes(id));
    const finalOrder = [...reorderedIds, ...remainingIds];
    
    reorderAssets(finalOrder);
    setDraggedIndex(null);
    loadData();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleViewDragStart = (index: number) => {
    setDraggedViewIndex(index);
  };

  const handleViewDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleViewDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedViewIndex === null || draggedViewIndex === dropIndex) {
      setDraggedViewIndex(null);
      return;
    }

    const currentFilteredViews = getFilteredViews();
    const items = [...currentFilteredViews];
    const draggedItem = items[draggedViewIndex];
    items.splice(draggedViewIndex, 1);
    items.splice(dropIndex, 0, draggedItem);
    
    // Get all views (not just filtered) to maintain order
    const allViewIds = assetViews.map(v => v.id);
    const filteredViewIds = currentFilteredViews.map(v => v.id);
    const reorderedFilteredIds = items.map(item => item.id);
    
    // Reorder: put reordered filtered views first, then other views
    const otherViewIds = allViewIds.filter(id => !filteredViewIds.includes(id));
    const finalOrder = [...reorderedFilteredIds, ...otherViewIds];
    
    reorderAssetViews(finalOrder);
    setDraggedViewIndex(null);
    loadData();
  };

  const handleViewDragEnd = () => {
    setDraggedViewIndex(null);
  };

  const handleCategoryDragStart = (index: number) => {
    setDraggedCategoryIndex(index);
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCategoryDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === dropIndex) {
      setDraggedCategoryIndex(null);
      return;
    }

    const items = [...assetClasses];
    const draggedItem = items[draggedCategoryIndex];
    items.splice(draggedCategoryIndex, 1);
    items.splice(dropIndex, 0, draggedItem);
    
    const reorderedIds = items.map(item => item.id);
    reorderAssetClasses(reorderedIds);
    setDraggedCategoryIndex(null);
    loadData();
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryIndex(null);
  };

  const handleTabDragStart = (category: CategoryFilter, index: number) => {
    if (category === 'all') return;
    const isView = filteredViews.some(v => v.id === category);
    if (isView) {
      const viewIndex = filteredViews.findIndex(v => v.id === category);
      setDraggedViewIndex(viewIndex);
    } else {
      const classIndex = assetClasses.findIndex(ac => ac.id === category);
      if (classIndex !== -1) {
        setDraggedCategoryIndex(classIndex);
      }
    }
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTabDrop = (e: React.DragEvent, dropCategory: CategoryFilter, dropIndex: number) => {
    e.preventDefault();
    if (dropCategory === 'all') return;

    // Get current order of categories (excluding 'all')
    const currentOrder = categories.slice(1); // Remove 'all'
    
    // Find what we're dragging
    let draggedId: string | null = null;
    let draggedIndex: number | null = null;
    
    if (draggedViewIndex !== null) {
      draggedId = filteredViews[draggedViewIndex]?.id || null;
      draggedIndex = currentOrder.findIndex(id => id === draggedId);
    } else if (draggedCategoryIndex !== null) {
      draggedId = assetClasses[draggedCategoryIndex]?.id || null;
      draggedIndex = currentOrder.findIndex(id => id === draggedId);
    }
    
    if (draggedId === null || draggedIndex === null) {
      setDraggedViewIndex(null);
      setDraggedCategoryIndex(null);
      return;
    }
    
    const dropIndexInOrder = currentOrder.findIndex(id => id === dropCategory);
    if (dropIndexInOrder === -1 || draggedIndex === dropIndexInOrder) {
      setDraggedViewIndex(null);
      setDraggedCategoryIndex(null);
      return;
    }
    
    // Reorder the combined list
    const reordered = [...currentOrder];
    reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndexInOrder, 0, draggedId);
    
    // Separate into categories and views
    const reorderedClassIds = reordered.filter(id => assetClasses.some(ac => ac.id === id));
    const reorderedViewIds = reordered.filter(id => filteredViews.some(v => v.id === id));
    
    // Update both
    if (reorderedClassIds.length > 0) {
      reorderAssetClasses(reorderedClassIds);
    }
    if (reorderedViewIds.length > 0) {
      const allViewIds = assetViews.map(v => v.id);
      const otherViewIds = allViewIds.filter(id => !filteredViews.some(v => v.id === id));
      reorderAssetViews([...reorderedViewIds, ...otherViewIds]);
    }
    
    setDraggedViewIndex(null);
    setDraggedCategoryIndex(null);
    loadData();
  };

  const handleTabDragEnd = () => {
    setDraggedViewIndex(null);
    setDraggedCategoryIndex(null);
  };

  const categories: CategoryFilter[] = ['all', ...assetClasses.map(ac => ac.id), ...filteredViews.map(v => v.id)];

  return (
    <div className="w-full pr-8 lg:pr-16 py-10" style={{ paddingLeft: 'calc(280px + 2rem)' }}>
      <div className="mb-10">
        <h1 className="text-4xl font-medium mb-2 text-black tracking-tight">Assets</h1>
        <p className="text-gray-500 text-[15px] font-light">Track and manage your assets with custom categories</p>
      </div>

      {/* Category Tabs */}
      <div className="mb-8 flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        {categories.map((category, index) => {
          const isView = filteredViews.some(v => v.id === category);
          const isAssetClass = assetClasses.some(ac => ac.id === category);
          const isAll = category === 'all';
          const isDraggable = !isAll;
          
          let label: string;
          if (isAll) {
            label = 'All';
          } else if (isView) {
            label = filteredViews.find(v => v.id === category)?.name || category;
          } else {
            label = assetClasses.find(ac => ac.id === category)?.name || category;
          }
          
          const total = getCategoryTotal(category);
          const isDragging = (draggedViewIndex !== null && isView) || (draggedCategoryIndex !== null && isAssetClass);
          const assetClass = isAssetClass ? assetClasses.find(ac => ac.id === category) : null;
          
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
              {isAssetClass && assetClass && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClass(assetClass);
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
              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
              <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              <th className="px-8 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-16 text-center text-gray-500">
                  <p className="mb-2">No assets yet.</p>
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="text-sm font-medium text-black hover:text-gray-700 transition-colors"
                  >
                    Add your first asset →
                  </button>
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset, index) => (
                <tr
                  key={asset.id}
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
                      {asset.name}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-gray-600 font-light">
                    {assetClasses.find(ac => ac.id === asset.type)?.name || asset.type}
                  </td>
                  <td className="px-8 py-4 font-medium text-black">
                    {formatCurrency(asset.value)}
                  </td>
                  <td className="px-8 py-4 text-gray-500">
                    {asset.institution || '—'}
                  </td>
                  <td className="px-8 py-4">
                    <button
                      onClick={() => handleEdit(asset)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                      title="Edit asset"
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
            {filteredAssets.length > 0 && (
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

      {/* Asset Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">
              {editingAsset ? 'Edit Asset' : 'Add New Asset'}
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
                    {assetClasses.map(ac => (
                      <option key={ac.id} value={ac.id}>{ac.name}</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., Bank of America, Vanguard"
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
                  {editingAsset ? 'Update' : 'Add'} Asset
                </button>
                {editingAsset && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
                        deleteAsset(editingAsset.id);
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
                  placeholder="e.g., Investment Portfolio, Real Estate Only"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Categories (optional)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
                  {assetClasses.map(ac => (
                    <label key={ac.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={viewFormData.filterCategories.includes(ac.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setViewFormData({
                              ...viewFormData,
                              filterCategories: [...viewFormData.filterCategories, ac.id],
                            });
                          } else {
                            setViewFormData({
                              ...viewFormData,
                              filterCategories: viewFormData.filterCategories.filter(id => id !== ac.id),
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{ac.name}</span>
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
                  onClick={() => {
                    setIsViewFormOpen(false);
                    setViewFormData({ name: '', filterCategories: [] });
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
                  placeholder="e.g., Crypto, Bonds, Art"
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
      {isEditClassFormOpen && editingAssetClass && (
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
                  placeholder="e.g., Stocks, Bonds, Art"
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
                    setEditingAssetClass(null);
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
