'use client';

import { useEffect, useState } from 'react';
import { getFinancialData, addAsset, updateAsset, deleteAsset, reorderAssets, getAssetClasses, addAssetClass, updateAssetClass, deleteAssetClass, getAssetViews, addAssetView, updateAssetView, deleteAssetView, reorderAssetViews, reorderAssetClasses } from '@/lib/storage';
import { Asset, AssetType, AssetClass, AssetView } from '@/types';
import { validateName, validateAmount } from '@/lib/validation';

type CategoryFilter = 'all' | string;

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [assetViews, setAssetViews] = useState<AssetView[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [editingViewName, setEditingViewName] = useState<{ viewId: string; value: string } | null>(null);
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
  const [openViewMenu, setOpenViewMenu] = useState<string | null>(null);
  const [openCategoryMenu, setOpenCategoryMenu] = useState<string | null>(null);
  const [viewToDelete, setViewToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewFormOpen, setIsViewFormOpen] = useState(false);
  const [isNewClassFormOpen, setIsNewClassFormOpen] = useState(false);
  const [isEditClassFormOpen, setIsEditClassFormOpen] = useState(false);
  const [isEditViewFormOpen, setIsEditViewFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingAssetClass, setEditingAssetClass] = useState<AssetClass | null>(null);
  const [editingView, setEditingView] = useState<AssetView | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedViewIndex, setDraggedViewIndex] = useState<number | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [inlineEditingAssetId, setInlineEditingAssetId] = useState<string | null>(null);
  const [inlineEditingField, setInlineEditingField] = useState<'name' | 'value' | null>(null);
  const [inlineEditData, setInlineEditData] = useState<{ name: string; value: string }>({ name: '', value: '' });
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    value: '',
    institution: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    type: '',
    value: '',
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
  const [editViewFormData, setEditViewFormData] = useState({
    name: '',
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openViewMenu && !(event.target as Element).closest('.view-menu-container')) {
        setOpenViewMenu(null);
      }
      if (openCategoryMenu && !(event.target as Element).closest('.category-menu-container')) {
        setOpenCategoryMenu(null);
      }
    };

    if (openViewMenu || openCategoryMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openViewMenu, openCategoryMenu]);

  const loadData = () => {
    const data = getFinancialData();
    const sorted = [...data.assets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setAssets(sorted);
    const classes = getAssetClasses();
    const sortedClasses = [...classes].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    setAssetClasses(sortedClasses);
    setAssetViews(getAssetViews());
  };

  // Get all views (not filtered - show all custom views)
  const filteredViews = assetViews;

  // Only views are shown as tabs, so only filter by views
  const filteredAssets = selectedCategory === 'all' 
    ? assets 
    : (() => {
        const view = filteredViews.find(v => v.id === selectedCategory);
        if (!view) return assets;
        // Use assetIds if available, otherwise fall back to filterCategories for backward compatibility
        if (view.assetIds && view.assetIds.length > 0) {
          return assets.filter(a => view.assetIds?.includes(a.id));
        }
        // Backward compatibility: use filterCategories if assetIds not set
        if (view.filterCategories && view.filterCategories.length > 0) {
          return assets.filter(a => view.filterCategories?.includes(a.type));
        }
        return [];
      })();

  const validateForm = (): boolean => {
    const errors = {
      name: '',
      type: '',
      value: '',
    };
    
    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error || '';
    }
    
    if (!formData.type || formData.type.trim() === '') {
      errors.type = 'Category is required';
    }
    
    const valueValidation = validateAmount(formData.value);
    if (!valueValidation.isValid) {
      errors.value = valueValidation.error || '';
    }
    
    setFormErrors(errors);
    return !errors.name && !errors.type && !errors.value;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
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
      assetIds: [], // Start with empty view
    });
    setViewFormData({ name: '', filterCategories: [] });
    setIsViewFormOpen(false);
    loadData();
  };

  const handleViewNameEdit = (view: AssetView) => {
    setEditingView(view);
    setEditViewFormData({ name: view.name });
    setIsEditViewFormOpen(true);
    setIsEditClassFormOpen(false); // Ensure category modal is closed
    setEditingAssetClass(null); // Clear any category editing state
  };

  const handleEditViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingView && editViewFormData.name.trim()) {
      updateAssetView(editingView.id, { name: editViewFormData.name.trim() });
      setEditingView(null);
      setEditViewFormData({ name: '' });
      setIsEditViewFormOpen(false);
      loadData();
    }
  };

  const handleViewNameSave = (viewId: string) => {
    if (editingViewName && editingViewName.value.trim()) {
      updateAssetView(viewId, { name: editingViewName.value.trim() });
      setEditingViewName(null);
      loadData();
    }
  };

  const handleViewNameCancel = () => {
    setEditingViewName(null);
  };

  const handleAssetDropOnView = (viewId: string, assetId: string) => {
    const view = assetViews.find(v => v.id === viewId);
    if (view) {
      const currentAssetIds = view.assetIds || [];
      if (!currentAssetIds.includes(assetId)) {
        updateAssetView(viewId, { assetIds: [...currentAssetIds, assetId] });
        loadData();
      }
    }
    setDraggedAssetId(null);
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
    setIsEditViewFormOpen(false); // Ensure view modal is closed
    setEditingView(null); // Clear any view editing state
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

  const handleInlineEditStart = (asset: Asset, field: 'name' | 'value') => {
    setInlineEditingAssetId(asset.id);
    setInlineEditingField(field);
    setInlineEditData({ name: asset.name, value: asset.value.toString() });
  };

  const handleInlineEditSave = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset && inlineEditData.name.trim() && inlineEditData.value) {
      updateAsset(assetId, {
        name: inlineEditData.name.trim(),
        value: parseFloat(inlineEditData.value) || 0,
      });
      setInlineEditingAssetId(null);
      setInlineEditingField(null);
      setInlineEditData({ name: '', value: '' });
      loadData();
    }
  };

  const handleInlineEditCancel = () => {
    setInlineEditingAssetId(null);
    setInlineEditingField(null);
    setInlineEditData({ name: '', value: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      deleteAsset(id);
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', type: assetClasses[0]?.id || '', value: '', institution: '', notes: '' });
    setFormErrors({ name: '', type: '', value: '' });
    setIsFormOpen(false);
    setEditingAsset(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryTotal = (category: CategoryFilter) => {
    if (category === 'all') {
      return assets.reduce((sum, asset) => sum + asset.value, 0);
    }
    // Only views are shown as tabs, so only calculate totals for views
    const view = filteredViews.find(v => v.id === category);
    if (view) {
      // Use assetIds if available, otherwise fall back to filterCategories for backward compatibility
      if (view.assetIds && view.assetIds.length > 0) {
        return assets
          .filter(a => view.assetIds?.includes(a.id))
          .reduce((sum, asset) => sum + asset.value, 0);
      }
      // Backward compatibility: use filterCategories if assetIds not set
      if (view.filterCategories && view.filterCategories.length > 0) {
        return assets
          .filter(a => view.filterCategories?.includes(a.type))
          .reduce((sum, asset) => sum + asset.value, 0);
      }
      return 0;
    }
    return 0;
  };

  const handleDragStart = (index: number, assetId?: string) => {
    setDraggedIndex(index);
    if (assetId) {
      setDraggedAssetId(assetId);
    }
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
    setDraggedAssetId(null);
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

    const items = [...filteredViews];
    const draggedItem = items[draggedViewIndex];
    items.splice(draggedViewIndex, 1);
    items.splice(dropIndex, 0, draggedItem);
    
    const reorderedViewIds = items.map((v: AssetView) => v.id);
    
    reorderAssetViews(reorderedViewIds);
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
    // Only views can be dragged (categories are not shown as tabs)
    const viewIndex = filteredViews.findIndex(v => v.id === category);
    if (viewIndex !== -1) {
      setDraggedViewIndex(viewIndex);
    }
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTabDrop = (e: React.DragEvent, dropCategory: CategoryFilter, dropIndex: number) => {
    e.preventDefault();
    if (dropCategory === 'all' || draggedViewIndex === null) return;

    // Get current order of views (excluding 'all')
    const currentOrder = categories.slice(1); // Remove 'all'
    
    // Find what we're dragging
    const draggedId = filteredViews[draggedViewIndex]?.id || null;
    if (!draggedId) {
      setDraggedViewIndex(null);
      return;
    }
    
    const draggedIndex = currentOrder.findIndex(id => id === draggedId);
    const dropIndexInOrder = currentOrder.findIndex(id => id === dropCategory);
    
    if (dropIndexInOrder === -1 || draggedIndex === dropIndexInOrder) {
      setDraggedViewIndex(null);
      return;
    }
    
    // Reorder the views list
    const reordered = [...currentOrder];
    reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndexInOrder, 0, draggedId);
    
    // Update views order
    if (reordered.length > 0) {
      const allViewIds = assetViews.map(v => v.id);
      const otherViewIds = allViewIds.filter(id => !filteredViews.some(v => v.id === id));
      reorderAssetViews([...reordered, ...otherViewIds]);
    }
    
    setDraggedViewIndex(null);
    loadData();
  };

  const handleTabDragEnd = () => {
    setDraggedViewIndex(null);
    setDraggedCategoryIndex(null);
  };

  // Only show 'all' and custom views - categories are metadata only, not displayed as tabs
  const categories: CategoryFilter[] = ['all', ...filteredViews.map(v => v.id)];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-10">
      <div className="mb-6 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-medium mb-2 text-black tracking-tight">Assets</h1>
        <p className="text-gray-500 text-sm md:text-[15px] font-light">Track and manage your assets with custom categories</p>
      </div>

      {/* Category Tabs */}
      <div className="mb-8 flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        {categories.map((category, index) => {
          const isView = filteredViews.some(v => v.id === category);
          const isAll = category === 'all';
          const isDraggable = !isAll;
          
          const view = isView ? filteredViews.find(v => v.id === category) : null;
          const total = getCategoryTotal(category);
          const isDragging = draggedViewIndex !== null && isView;
          const isEditingViewName = editingViewName?.viewId === category;
          
          return (
            <div
              key={category}
              className="flex items-center gap-1 group"
              onDragOver={isView && draggedAssetId ? (e) => { e.preventDefault(); } : undefined}
              onDrop={isView && draggedAssetId ? (e) => { 
                e.preventDefault(); 
                handleAssetDropOnView(category, draggedAssetId); 
              } : undefined}
            >
              {isView && isEditingViewName ? (
                <input
                  type="text"
                  value={editingViewName.value}
                  onChange={(e) => setEditingViewName({ ...editingViewName, value: e.target.value })}
                  onBlur={() => handleViewNameSave(category)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleViewNameSave(category);
                    } else if (e.key === 'Escape') {
                      handleViewNameCancel();
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border-b-2 border-[#3f3b39] focus:outline-none bg-white"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="relative view-menu-container">
                  <button
                    draggable={isDraggable}
                    onDragStart={isDraggable ? () => handleTabDragStart(category, index) : undefined}
                    onDragOver={isDraggable ? handleTabDragOver : undefined}
                    onDrop={isDraggable ? (e) => handleTabDrop(e, category, index) : undefined}
                    onDragEnd={isDraggable ? handleTabDragEnd : undefined}
                    onClick={(e) => {
                      // Only views are shown as tabs, so just select the view
                      setSelectedCategory(category);
                      setOpenViewMenu(null); // Close any open menus
                    }}
                    className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap text-sm font-medium cursor-pointer ${
                      selectedCategory === category
                        ? 'bg-white text-black shadow-soft'
                        : 'text-gray-600 hover:text-black'
                    } ${isDragging ? 'opacity-50' : ''} ${isView && draggedAssetId ? 'border-2 border-dashed border-[#3f3b39]' : ''}`}
                  >
                    {isAll ? 'All' : (view?.name || category)} <span className="text-gray-500 font-light">({formatCurrency(total)})</span>
                  </button>
                </div>
              )}
              {isView && view && !isEditingViewName && (
                <div className="relative view-menu-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenViewMenu(openViewMenu === category ? null : category);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-black cursor-pointer"
                    title="Edit or delete view"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                    </svg>
                  </button>
                  {openViewMenu === category && view && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-modal border border-gray-200 py-1 z-50 min-w-[160px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (view) {
                            handleViewNameEdit(view);
                          }
                          setOpenViewMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Edit View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setViewToDelete(category);
                          setOpenViewMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Delete View
            </button>
                    </div>
                  )}
                </div>
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
              filteredAssets.map((asset, index) => {
                const isInlineEditing = inlineEditingAssetId === asset.id;
                return (
                <tr
                  key={asset.id}
                    draggable={!isInlineEditing}
                    onDragStart={!isInlineEditing ? () => handleDragStart(index, asset.id) : undefined}
                    onDragOver={!isInlineEditing ? handleDragOver : undefined}
                    onDrop={!isInlineEditing ? (e) => handleDrop(e, index) : undefined}
                    onDragEnd={!isInlineEditing ? handleDragEnd : undefined}
                    className={`group border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                    draggedIndex === index ? 'opacity-50' : ''
                    } ${isInlineEditing ? 'bg-blue-50/30' : ''}`}
                  >
                    <td className="px-8 py-4">
                      {isInlineEditing ? (
                        <input
                          type="text"
                          value={inlineEditData.name}
                          onChange={(e) => setInlineEditData({ ...inlineEditData, name: e.target.value })}
                          onBlur={() => handleInlineEditSave(asset.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleInlineEditSave(asset.id);
                            } else if (e.key === 'Escape') {
                              handleInlineEditCancel();
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3f3b39] bg-white font-medium text-black"
                          autoFocus={inlineEditingField === 'name'}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span 
                          className="font-medium text-black cursor-text hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInlineEditStart(asset, 'name');
                          }}
                          title="Click to edit name"
                        >
                          {asset.name}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-gray-600 font-light">
                    {assetClasses.find(ac => ac.id === asset.type)?.name || asset.type}
                  </td>
                    <td className="px-8 py-4">
                      {isInlineEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={inlineEditData.value}
                            onChange={(e) => setInlineEditData({ ...inlineEditData, value: e.target.value })}
                            onBlur={() => handleInlineEditSave(asset.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInlineEditSave(asset.id);
                              } else if (e.key === 'Escape') {
                                handleInlineEditCancel();
                              }
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3f3b39] bg-white font-medium text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.target.select()}
                            autoFocus={inlineEditingField === 'value'}
                          />
                        </div>
                      ) : (
                        <span 
                          className="font-medium text-black cursor-text hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInlineEditStart(asset, 'value');
                          }}
                          title="Click to edit value"
                        >
                          {formatCurrency(asset.value)}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-gray-500">
                    {asset.institution || '—'}
                  </td>
                    <td className="px-8 py-4">
                    <button
                        onClick={() => handleEdit(asset)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                        title="Edit asset (full form)"
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
                );
              })
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
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
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
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      const validation = validateName(e.target.value);
                      setFormErrors({ ...formErrors, name: validation.error || '' });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all ${
                    formErrors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="flex gap-2">
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      setFormData({ ...formData, type: e.target.value });
                      if (formErrors.type) {
                        setFormErrors({ ...formErrors, type: e.target.value ? '' : 'Category is required' });
                      }
                    }}
                    className={`flex-1 px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all ${
                      formErrors.type ? 'border-red-300' : 'border-gray-200'
                    }`}
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
                {formErrors.type && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.type}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.value}
                  onChange={(e) => {
                    setFormData({ ...formData, value: e.target.value });
                    if (formErrors.value) {
                      const validation = validateAmount(e.target.value);
                      setFormErrors({ ...formErrors, value: validation.error || '' });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    formErrors.value ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {formErrors.value && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.value}</p>
                )}
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

      {/* Delete View Confirmation Modal */}
      {viewToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-4 text-black">Delete View</h2>
            <p className="text-gray-600 mb-6 font-light">
              Are you sure you want to delete this view? This will not affect your assets - they will remain in the &quot;All&quot; view.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  deleteAssetView(viewToDelete);
                  setViewToDelete(null);
                  if (selectedCategory === viewToDelete) {
                    setSelectedCategory('all');
                  }
                  loadData();
                }}
                className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium shadow-soft cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => setViewToDelete(null)}
                className="px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete View Confirmation Modal (for asset classes) */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-4 text-black">Delete View</h2>
            <p className="text-gray-600 mb-6 font-light">
              Are you sure you want to delete this view? This will not affect your assets - they will remain in the &quot;All&quot; view.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  deleteAssetClass(categoryToDelete);
                  setCategoryToDelete(null);
                  if (selectedCategory === categoryToDelete) {
                    setSelectedCategory('all');
                  }
                  loadData();
                }}
                className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium shadow-soft cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Creator Modal */}
      {isViewFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
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
              <p className="text-sm text-gray-500">After creating the view, drag assets from &quot;All&quot; into this view to add them.</p>
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
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
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

      {/* Edit View Form Modal */}
      {isEditViewFormOpen && editingView && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">Edit View</h2>
            <form onSubmit={handleEditViewSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">View Name</label>
                <input
                  type="text"
                  required
                  value={editViewFormData.name}
                  onChange={(e) => setEditViewFormData({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., Investment Portfolio, Real Estate Only"
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
                    if (confirm('Are you sure you want to delete this view? This will not affect your assets - they will remain in the "All" view.')) {
                      deleteAssetView(editingView.id);
                      setEditingView(null);
                      setEditViewFormData({ name: '' });
                      setIsEditViewFormOpen(false);
                      if (selectedCategory === editingView.id) {
                        setSelectedCategory('all');
                      }
                      loadData();
                    }
                  }}
                  className="px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium shadow-soft cursor-pointer flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3V1a1 1 0 011-1h2a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5H4a1 1 0 110-2h4zM7 5v12h6V5H7zm2 2a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1z" fill="currentColor"/>
                  </svg>
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditViewFormOpen(false);
                    setEditingView(null);
                    setEditViewFormData({ name: '' });
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

      {/* Edit View Form Modal (for asset classes) */}
      {isEditClassFormOpen && editingAssetClass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">Edit View</h2>
            <form onSubmit={handleEditClassSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">View Name</label>
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
                    if (confirm('Are you sure you want to delete this view? This will not affect your assets - they will remain in the "All" view.')) {
                      deleteAssetClass(editingAssetClass.id);
                      setEditingAssetClass(null);
                      setEditClassFormData({ name: '' });
                      setIsEditClassFormOpen(false);
                      if (selectedCategory === editingAssetClass.id) {
                        setSelectedCategory('all');
                      }
                      loadData();
                    }
                  }}
                  className="px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium shadow-soft cursor-pointer flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3V1a1 1 0 011-1h2a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5H4a1 1 0 110-2h4zM7 5v12h6V5H7zm2 2a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1z" fill="currentColor"/>
                  </svg>
                  Delete
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
