'use client';

import { useEffect, useState } from 'react';
import { 
  getCashFlowLineItems, addCashFlowLineItem, updateCashFlowLineItem, deleteCashFlowLineItem, reorderCashFlowLineItems,
  getCashFlowGroups, addCashFlowGroup, updateCashFlowGroup, deleteCashFlowGroup, reorderCashFlowGroups,
  getCashFlowCategories, addCashFlowCategory, updateCashFlowCategory, deleteCashFlowCategory, reorderCashFlowCategories,
  getPreferences, updatePreferences,
  getAssetClasses, addAssetClass, updateAssetClass, deleteAssetClass, reorderAssetClasses, getFinancialData, saveFinancialData
} from '@/lib/storage';
import { CashFlowLineItem, CashFlowGroup, CashFlowCategory, AssetClass, Asset, FinancialData } from '@/types';

type SettingsTab = 'institutions' | 'categories' | 'preferences' | 'asset-classes' | 'data';

export default function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState<SettingsTab>('categories');
  const [lineItems, setLineItems] = useState<CashFlowLineItem[]>([]);
  const [groups, setGroups] = useState<CashFlowGroup[]>([]);
  const [categories, setCategories] = useState<CashFlowCategory[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CashFlowLineItem | null>(null);
  const [editingGroup, setEditingGroup] = useState<CashFlowGroup | null>(null);
  const [editingCategory, setEditingCategory] = useState<CashFlowCategory | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [editingGroupNameId, setEditingGroupNameId] = useState<string | null>(null);
  const [editingGroupNameValue, setEditingGroupNameValue] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'income' as 'income' | 'expense',
    groupId: '',
    newGroupName: '',
    categoryId: '',
    notes: '',
  });
  const [showCategoryNotesInCashFlow, setShowCategoryNotesInCashFlow] = useState(false);
  const [groupFormData, setGroupFormData] = useState({ name: '' });
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });
  
  // Asset Classes state
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAssetClassFormOpen, setIsAssetClassFormOpen] = useState(false);
  const [editingAssetClass, setEditingAssetClass] = useState<AssetClass | null>(null);
  const [assetClassFormData, setAssetClassFormData] = useState({ name: '', isLiquid: false, color: '' });
  const [draggedAssetClassIndex, setDraggedAssetClassIndex] = useState<number | null>(null);
  const [expandedAssetClassId, setExpandedAssetClassId] = useState<string | null>(null);
  const [editingAssetClassNameId, setEditingAssetClassNameId] = useState<string | null>(null);
  const [editingAssetClassNameValue, setEditingAssetClassNameValue] = useState('');
  const [assetClassToDelete, setAssetClassToDelete] = useState<string | null>(null);
  
  // Data export/import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importPreview, setImportPreview] = useState<FinancialData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const loadPreferences = () => {
    const prefs = getPreferences();
    setShowCategoryNotesInCashFlow(prefs.showCategoryNotesInCashFlow || false);
  };

  const loadData = () => {
    try {
      const groupsData = getCashFlowGroups();
      const sortedGroups = Array.isArray(groupsData) ? [...groupsData].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
      setGroups(sortedGroups);
      
      const categoriesData = getCashFlowCategories();
      const sortedCategories = Array.isArray(categoriesData) ? [...categoriesData].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
      setCategories(sortedCategories);
      
      const items = getCashFlowLineItems();
      const sorted = Array.isArray(items) ? [...items].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
        if (a.groupId !== b.groupId) {
          if (!a.groupId) return 1;
          if (!b.groupId) return -1;
          const groupA = sortedGroups.find(g => g.id === a.groupId);
          const groupB = sortedGroups.find(g => g.id === b.groupId);
          if (!groupA || !groupB) return 0;
          return (groupA.order || 0) - (groupB.order || 0);
        }
        return (a.order || 0) - (b.order || 0);
      }) : [];
      setLineItems(sorted);
      
      // Load asset classes and assets
      const classesData = getAssetClasses();
      const sortedClasses = Array.isArray(classesData) ? [...classesData].sort((a, b) => (a.order || 999) - (b.order || 999)) : [];
      setAssetClasses(sortedClasses);
      
      const financialData = getFinancialData();
      setAssets(financialData.assets || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setGroups([]);
      setCategories([]);
      setLineItems([]);
      setAssetClasses([]);
      setAssets([]);
    }
  };

  useEffect(() => {
    loadData();
    loadPreferences();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If creating a new group, create it first
    let finalGroupId = formData.groupId || undefined;
    if (formData.newGroupName.trim()) {
      const newGroup = addCashFlowGroup(formData.newGroupName.trim());
      finalGroupId = newGroup.id;
    }
    
    if (editingItem) {
      updateCashFlowLineItem(editingItem.id, {
        name: formData.name,
        type: formData.type,
        groupId: finalGroupId,
        categoryId: formData.categoryId || undefined,
        notes: formData.notes || undefined,
      });
    } else {
      const maxOrder = lineItems
        .filter(item => item.type === formData.type && (!finalGroupId || item.groupId === finalGroupId))
        .reduce((max, item) => Math.max(max, item.order || 0), -1);
      addCashFlowLineItem({
        name: formData.name,
        type: formData.type,
        groupId: finalGroupId,
        categoryId: formData.categoryId || undefined,
        notes: formData.notes || undefined,
        order: maxOrder + 1,
      });
    }
    resetForm();
    loadData();
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      updateCashFlowGroup(editingGroup.id, { name: groupFormData.name });
    } else {
      addCashFlowGroup(groupFormData.name);
    }
    setGroupFormData({ name: '' });
    setIsGroupFormOpen(false);
    setEditingGroup(null);
    loadData();
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCashFlowCategory(editingCategory.id, { name: categoryFormData.name });
    } else {
      addCashFlowCategory(categoryFormData.name);
    }
    setCategoryFormData({ name: '' });
    setIsCategoryFormOpen(false);
    setEditingCategory(null);
    loadData();
  };

  const handleEdit = (item: CashFlowLineItem) => {
    setEditingItem(item);
    setIsCreatingNewGroup(false);
    setFormData({
      name: item.name,
      type: item.type,
      groupId: item.groupId || '',
      newGroupName: '',
      categoryId: item.categoryId || '',
      notes: item.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleEditGroup = (group: CashFlowGroup) => {
    setEditingGroup(group);
    setGroupFormData({ name: group.name });
    setIsGroupFormOpen(true);
  };

  const handleEditCategory = (category: CashFlowCategory) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name });
    setIsCategoryFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this line item?')) {
      deleteCashFlowLineItem(id);
      loadData();
    }
  };

  const handleDeleteGroup = (id: string) => {
    const itemsInGroup = lineItems.filter(item => item.groupId === id);
    if (itemsInGroup.length > 0) {
      alert(`Cannot delete group. Please remove all ${itemsInGroup.length} line item(s) from this group first.`);
      return;
    }
    if (confirm('Are you sure you want to delete this group?')) {
      deleteCashFlowGroup(id);
      loadData();
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category? Line items using this category will have their category removed.')) {
      deleteCashFlowCategory(id);
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'income', groupId: '', newGroupName: '', categoryId: '', notes: '' });
    setIsCreatingNewGroup(false);
    setIsFormOpen(false);
    setEditingItem(null);
  };

  // Drag and drop for line items
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    const reordered = [...lineItems];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    reorderCashFlowLineItems(reordered.map(item => item.id));
    
    setDraggedIndex(null);
    loadData();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Drag and drop for groups
  const handleGroupDragStart = (index: number) => {
    setDraggedGroupIndex(index);
  };

  const handleGroupDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleGroupDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedGroupIndex === null) return;
    
    const reordered = [...groups];
    const [removed] = reordered.splice(draggedGroupIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    reorderCashFlowGroups(reordered.map(g => g.id));
    
    setDraggedGroupIndex(null);
    loadData();
  };

  const handleGroupDragEnd = () => {
    setDraggedGroupIndex(null);
  };

  // Drag and drop for categories
  const handleCategoryDragStart = (index: number) => {
    setDraggedCategoryIndex(index);
  };

  const handleCategoryDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedCategoryIndex === null) return;
    
    const reordered = [...categories];
    const [removed] = reordered.splice(draggedCategoryIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    reorderCashFlowCategories(reordered.map(c => c.id));
    
    setDraggedCategoryIndex(null);
    loadData();
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryIndex(null);
  };

  // Group items by type and group
  const incomeItems = lineItems.filter(item => item.type === 'income');
  const expenseItems = lineItems.filter(item => item.type === 'expense');

  // Asset Classes helper functions
  const getAssetsForClass = (classId: string): Asset[] => {
    return assets.filter(asset => {
      const assetClass = assetClasses.find(ac => 
        ac.id === classId || ac.name.toLowerCase() === classId.toLowerCase()
      );
      if (!assetClass) return false;
      return asset.type.toLowerCase() === assetClass.name.toLowerCase() || 
             asset.type.toLowerCase() === assetClass.id.toLowerCase();
    });
  };

  const getTotalValueForClass = (classId: string): number => {
    return getAssetsForClass(classId).reduce((sum, asset) => sum + (asset.value || 0), 0);
  };

  const handleAssetClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAssetClass) {
      updateAssetClass(editingAssetClass.id, {
        name: assetClassFormData.name,
        isLiquid: assetClassFormData.isLiquid,
        color: assetClassFormData.color || undefined,
      });
    } else {
      addAssetClass(assetClassFormData.name);
      const newClass = getAssetClasses().find(ac => ac.name === assetClassFormData.name);
      if (newClass) {
        updateAssetClass(newClass.id, {
          isLiquid: assetClassFormData.isLiquid,
          color: assetClassFormData.color || undefined,
        });
      }
    }
    setAssetClassFormData({ name: '', isLiquid: false, color: '' });
    setIsAssetClassFormOpen(false);
    setEditingAssetClass(null);
    loadData();
  };

  const handleEditAssetClass = (assetClass: AssetClass) => {
    setEditingAssetClass(assetClass);
    setAssetClassFormData({
      name: assetClass.name,
      isLiquid: assetClass.isLiquid || false,
      color: assetClass.color || '',
    });
    setIsAssetClassFormOpen(true);
  };

  const handleDeleteAssetClass = (id: string) => {
    const assetsUsingClass = getAssetsForClass(id);
    if (assetsUsingClass.length > 0) {
      setAssetClassToDelete(id);
    } else {
      if (confirm('Are you sure you want to delete this asset class?')) {
        deleteAssetClass(id);
        loadData();
      }
    }
  };

  const handleAssetClassDragStart = (index: number) => {
    setDraggedAssetClassIndex(index);
  };

  const handleAssetClassDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAssetClassDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedAssetClassIndex === null) return;
    
    const reordered = [...assetClasses];
    const [removed] = reordered.splice(draggedAssetClassIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    reorderAssetClasses(reordered.map(ac => ac.id));
    
    setDraggedAssetClassIndex(null);
    loadData();
  };

  const handleAssetClassDragEnd = () => {
    setDraggedAssetClassIndex(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Data export/import functions
  const handleExportData = () => {
    const data = getFinancialData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `basic-finance-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    setImportError(null);
    setImportPreview(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Basic validation - check if it has the structure of FinancialData
        if (typeof parsed !== 'object' || parsed === null) {
          setImportError('Invalid file format. Expected JSON object.');
          return;
        }
        
        // Check for required top-level properties
        const requiredProps = ['assets', 'liabilities', 'transactions'];
        const hasRequiredProps = requiredProps.every(prop => Array.isArray(parsed[prop]));
        
        if (!hasRequiredProps) {
          setImportError('Invalid file format. Missing required data structure.');
          return;
        }
        
        setImportPreview(parsed as FinancialData);
      } catch (error) {
        setImportError('Failed to parse JSON file. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleImportData = () => {
    if (!importPreview) return;
    
    if (importMode === 'replace') {
      if (!confirm('This will replace all your current data. Are you sure? This action cannot be undone.')) {
        return;
      }
      // Create backup before replacing
      const currentData = getFinancialData();
      const backupJson = JSON.stringify(currentData, null, 2);
      const backupBlob = new Blob([backupJson], { type: 'application/json' });
      const backupUrl = URL.createObjectURL(backupBlob);
      const backupLink = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      backupLink.href = backupUrl;
      backupLink.download = `basic-finance-backup-before-import-${date}.json`;
      document.body.appendChild(backupLink);
      backupLink.click();
      document.body.removeChild(backupLink);
      URL.revokeObjectURL(backupUrl);
      
      saveFinancialData(importPreview);
    } else {
      // Merge mode
      const currentData = getFinancialData();
      const merged: FinancialData = {
        ...currentData,
        assets: [...currentData.assets, ...importPreview.assets],
        liabilities: [...currentData.liabilities, ...importPreview.liabilities],
        transactions: [...currentData.transactions, ...importPreview.transactions],
        assetClasses: importPreview.assetClasses || currentData.assetClasses,
        liabilityClasses: importPreview.liabilityClasses || currentData.liabilityClasses,
        budgets: [...currentData.budgets, ...(importPreview.budgets || [])],
        preferences: { ...currentData.preferences, ...importPreview.preferences },
      };
      saveFinancialData(merged);
    }
    
    // Reset import state
    setImportFile(null);
    setImportPreview(null);
    setImportError(null);
    setImportMode('replace');
    
    // Reload data
    loadData();
    
    alert('Data imported successfully!');
  };

  const getDataStats = () => {
    const data = getFinancialData();
    return {
      assets: data.assets?.length || 0,
      liabilities: data.liabilities?.length || 0,
      transactions: data.transactions?.length || 0,
      assetClasses: data.assetClasses?.length || 0,
      liabilityClasses: data.liabilityClasses?.length || 0,
      budgets: data.budgets?.length || 0,
    };
  };

  return (
    <div className="w-full px-4 md:px-0 md:pr-8 lg:pr-16 py-6 md:py-10">
      <div className="mb-6 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-medium mb-2 text-black tracking-tight">Settings</h1>
        <p className="text-gray-500 text-sm md:text-[15px] font-light">Manage your app preferences and configurations</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setSelectedTab('institutions')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              selectedTab === 'institutions'
                ? 'bg-white text-black shadow-soft'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Institutions
          </button>
          <button
            onClick={() => setSelectedTab('categories')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              selectedTab === 'categories'
                ? 'bg-white text-black shadow-soft'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setSelectedTab('asset-classes')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              selectedTab === 'asset-classes'
                ? 'bg-white text-black shadow-soft'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Asset Classes
          </button>
          <button
            onClick={() => setSelectedTab('preferences')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              selectedTab === 'preferences'
                ? 'bg-white text-black shadow-soft'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setSelectedTab('data')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              selectedTab === 'data'
                ? 'bg-white text-black shadow-soft'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Data
          </button>
        </div>
      </div>

      {/* Institutions Tab */}
      {selectedTab === 'institutions' && (
        <div className="bg-white rounded-2xl shadow-card p-8">
          <h2 className="text-2xl font-medium mb-2 text-black">Institutions</h2>
          <p className="text-gray-500 text-[15px] font-light mb-8">Connect your bank accounts and financial institutions</p>
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-gray-500 font-light">Institution linking coming soon</p>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {selectedTab === 'categories' && (
        <>
          {/* Income Section */}
      <div className="bg-white rounded-2xl shadow-card p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-black">Income</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setGroupFormData({ name: '' });
                setEditingGroup(null);
                setIsGroupFormOpen(true);
              }}
              className="text-gray-500 hover:text-black transition-colors font-light text-sm cursor-pointer"
            >
              +New Group
            </button>
            <button
              onClick={() => {
                setFormData({ name: '', type: 'income', groupId: '', newGroupName: '', categoryId: '', notes: '' });
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className="text-gray-500 hover:text-black transition-colors font-light text-sm cursor-pointer"
            >
              +New Line Item
            </button>
          </div>
        </div>
        <div className="space-y-6">
          {(groups || []).filter(group => incomeItems.some(item => item.groupId === group.id)).map((group) => {
            const groupItems = incomeItems.filter(item => item.groupId === group.id);
            const actualGroupIndex = groups.findIndex(g => g.id === group.id);
            return (
              <div key={group.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <div
                  draggable
                  onDragStart={() => handleGroupDragStart(actualGroupIndex)}
                  onDragOver={handleGroupDragOver}
                  onDrop={(e) => handleGroupDrop(e, actualGroupIndex)}
                  onDragEnd={handleGroupDragEnd}
                  className={`flex items-center gap-2 mb-4 ${draggedGroupIndex === actualGroupIndex ? 'opacity-50' : ''}`}
                >
                  {editingGroupNameId === group.id ? (
                    <input
                      type="text"
                      value={editingGroupNameValue}
                      onChange={(e) => setEditingGroupNameValue(e.target.value)}
                      onBlur={() => {
                        if (editingGroupNameValue.trim() && editingGroupNameValue !== group.name) {
                          updateCashFlowGroup(group.id, { name: editingGroupNameValue.trim() });
                          loadData();
                        }
                        setEditingGroupNameId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          setEditingGroupNameId(null);
                        }
                      }}
                      className="text-lg font-medium text-black bg-transparent border-b-2 border-[#3f3b39] focus:outline-none px-1 flex-1"
                      autoFocus
                    />
                  ) : (
                    <h3 
                      className="text-lg font-medium text-black cursor-pointer hover:text-gray-700 transition-colors flex-1"
                      onClick={() => {
                        setEditingGroupNameId(group.id);
                        setEditingGroupNameValue(group.name);
                      }}
                    >
                      {group.name}
                    </h3>
                  )}
                </div>
                <div className="space-y-2">
                  {groupItems.map((item) => {
                    const actualIndex = lineItems.findIndex(i => i.id === item.id);
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(actualIndex)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, actualIndex)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer ${
                          draggedIndex === actualIndex ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-black">{item.name}</span>
                          {item.notes && (
                            <span className="text-sm font-light text-gray-500">| {item.notes}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex items-center gap-0.5 text-gray-400 cursor-move hover:text-gray-600"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                          </div>
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {incomeItems.filter(item => !item.groupId).length > 0 && (
            <div className="space-y-2">
              {incomeItems.filter(item => !item.groupId).map((item) => {
                const actualIndex = lineItems.findIndex(i => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(actualIndex)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, actualIndex)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer ${
                      draggedIndex === actualIndex ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium text-black">{item.name}</span>
                      {item.notes && (
                        <span className="text-sm font-light text-gray-500">| {item.notes}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex items-center gap-0.5 text-gray-400 cursor-move hover:text-gray-600"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                      </div>
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {incomeItems.length === 0 && (
            <div className="text-center text-gray-500 py-8">No income items yet</div>
          )}
        </div>
      </div>

      {/* Expense Section */}
      <div className="bg-white rounded-2xl shadow-card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-black">Expenses</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setGroupFormData({ name: '' });
                setEditingGroup(null);
                setIsGroupFormOpen(true);
              }}
              className="text-gray-500 hover:text-black transition-colors font-light text-sm cursor-pointer"
            >
              +New Group
            </button>
            <button
              onClick={() => {
                setFormData({ name: '', type: 'expense', groupId: '', newGroupName: '', categoryId: '', notes: '' });
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className="text-gray-500 hover:text-black transition-colors font-light text-sm cursor-pointer"
            >
              +New Line Item
            </button>
          </div>
        </div>
        <div className="space-y-6">
          {(groups || []).map((group) => {
            const groupItems = expenseItems.filter(item => item.groupId === group.id);
            if (groupItems.length === 0) return null;
            const actualGroupIndex = groups.findIndex(g => g.id === group.id);
            return (
              <div key={group.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <div
                  draggable
                  onDragStart={() => handleGroupDragStart(actualGroupIndex)}
                  onDragOver={handleGroupDragOver}
                  onDrop={(e) => handleGroupDrop(e, actualGroupIndex)}
                  onDragEnd={handleGroupDragEnd}
                  className={`flex items-center gap-2 mb-4 ${draggedGroupIndex === actualGroupIndex ? 'opacity-50' : ''}`}
                >
                  {editingGroupNameId === group.id ? (
                    <input
                      type="text"
                      value={editingGroupNameValue}
                      onChange={(e) => setEditingGroupNameValue(e.target.value)}
                      onBlur={() => {
                        if (editingGroupNameValue.trim() && editingGroupNameValue !== group.name) {
                          updateCashFlowGroup(group.id, { name: editingGroupNameValue.trim() });
                          loadData();
                        }
                        setEditingGroupNameId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          setEditingGroupNameId(null);
                        }
                      }}
                      className="text-lg font-medium text-black bg-transparent border-b-2 border-[#3f3b39] focus:outline-none px-1 flex-1"
                      autoFocus
                    />
                  ) : (
                    <h3 
                      className="text-lg font-medium text-black cursor-pointer hover:text-gray-700 transition-colors flex-1"
                      onClick={() => {
                        setEditingGroupNameId(group.id);
                        setEditingGroupNameValue(group.name);
                      }}
                    >
                      {group.name}
                    </h3>
                  )}
                </div>
                <div className="space-y-2">
                  {groupItems.map((item, index) => {
                    const actualIndex = lineItems.findIndex(i => i.id === item.id);
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(actualIndex)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, actualIndex)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer ${
                          draggedIndex === actualIndex ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium text-black">{item.name}</span>
                          {item.notes && (
                            <span className="text-sm font-light text-gray-500">| {item.notes}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div 
                            className="flex items-center gap-0.5 text-gray-400 cursor-move hover:text-gray-600"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                            <div className="w-1 h-1 bg-current rounded-full"></div>
                          </div>
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {expenseItems.filter(item => !item.groupId).length > 0 && (
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-black mb-4">Ungrouped</h3>
              <div className="space-y-2">
                {expenseItems.filter(item => !item.groupId).map((item, index) => {
                  const actualIndex = lineItems.findIndex(i => i.id === item.id);
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(actualIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, actualIndex)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer ${
                        draggedIndex === actualIndex ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium text-black">{item.name}</span>
                        {item.notes && (
                          <span className="text-sm font-light text-gray-500">| {item.notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex items-center gap-0.5 text-gray-400 cursor-move hover:text-gray-600"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                        </div>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {expenseItems.length === 0 && (
            <div className="text-center text-gray-500 py-8">No expense items yet</div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Line Item Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">
              {editingItem ? 'Edit Line Item' : 'Add Line Item'}
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
                  placeholder="e.g., Salary, Mortgage, Groceries"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value as 'income' | 'expense', groupId: '', newGroupName: '', notes: formData.notes });
                    setIsCreatingNewGroup(false);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all cursor-pointer"
                  required
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group (optional)</label>
                <select
                  value={isCreatingNewGroup ? '__new__' : formData.groupId}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setIsCreatingNewGroup(true);
                      setFormData({ ...formData, groupId: '', newGroupName: '' });
                    } else {
                      setIsCreatingNewGroup(false);
                      setFormData({ ...formData, groupId: e.target.value, newGroupName: '' });
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all cursor-pointer mb-2"
                >
                  <option value="">No group</option>
                  {(groups || []).filter(g => {
                    // Show groups that match the type or have no type-specific items
                    const groupItems = lineItems.filter(item => item.groupId === g.id);
                    return groupItems.length === 0 || groupItems.some(item => item.type === formData.type);
                  }).map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                  <option value="__new__">+ Create new group</option>
                </select>
                {isCreatingNewGroup && (
                  <input
                    type="text"
                    value={formData.newGroupName}
                    onChange={(e) => setFormData({ ...formData, newGroupName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                    placeholder="Enter new group name"
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all resize-none"
                  placeholder="Add notes about this line item..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-3 pt-2">
                {editingItem && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this line item?')) {
                        handleDelete(editingItem.id);
                        resetForm();
                      }
                    }}
                    className="px-5 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all font-medium cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
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

      {/* Group Form Modal */}
      {isGroupFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">
              {editingGroup ? 'Edit Group' : 'Add Group'}
            </h2>
            <form onSubmit={handleGroupSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                <input
                  type="text"
                  required
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., Home, Health, Transportation"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  {editingGroup ? 'Update' : 'Add'} Group
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsGroupFormOpen(false);
                    setEditingGroup(null);
                    setGroupFormData({ name: '' });
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

      {/* Category Form Modal */}
      {isCategoryFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <form onSubmit={handleCategorySubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., Mortgage, Groceries, Gas"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  {editingCategory ? 'Update' : 'Add'} Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryFormOpen(false);
                    setEditingCategory(null);
                    setCategoryFormData({ name: '' });
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

      {/* Asset Classes Tab */}
      {selectedTab === 'asset-classes' && (
        <div className="bg-white rounded-2xl shadow-card p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-medium mb-2 text-black">Asset Classes</h2>
              <p className="text-gray-500 text-[15px] font-light">Manage asset categories and their properties. Liquid assets are included in liquidity calculations.</p>
            </div>
            <button
              onClick={() => {
                setAssetClassFormData({ name: '', isLiquid: false, color: '' });
                setEditingAssetClass(null);
                setIsAssetClassFormOpen(true);
              }}
              className="text-gray-500 hover:text-black transition-colors font-light text-sm cursor-pointer"
            >
              + New Asset Class
            </button>
          </div>

          <div className="space-y-4">
            {assetClasses.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <p className="mb-2">No asset classes yet.</p>
                <button
                  onClick={() => {
                    setAssetClassFormData({ name: '', isLiquid: false, color: '' });
                    setEditingAssetClass(null);
                    setIsAssetClassFormOpen(true);
                  }}
                  className="text-sm font-medium text-black hover:text-gray-700 transition-colors cursor-pointer"
                >
                  Create your first asset class →
                </button>
              </div>
            ) : (
              assetClasses.map((assetClass, index) => {
                const assetsForClass = getAssetsForClass(assetClass.id);
                const totalValue = getTotalValueForClass(assetClass.id);
                const isExpanded = expandedAssetClassId === assetClass.id;
                const isEditingName = editingAssetClassNameId === assetClass.id;

                return (
                  <div
                    key={assetClass.id}
                    draggable
                    onDragStart={() => handleAssetClassDragStart(index)}
                    onDragOver={handleAssetClassDragOver}
                    onDrop={(e) => handleAssetClassDrop(e, index)}
                    onDragEnd={handleAssetClassDragEnd}
                    className={`border border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-colors ${
                      draggedAssetClassIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Drag handle */}
                        <div 
                          className="flex items-center gap-0.5 text-gray-400 cursor-move hover:text-gray-600 flex-shrink-0"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                        </div>

                        {/* Color swatch */}
                        {assetClass.color && (
                          <div
                            className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: assetClass.color }}
                            title={`Color: ${assetClass.color}`}
                          />
                        )}

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          {isEditingName ? (
                            <input
                              type="text"
                              value={editingAssetClassNameValue}
                              onChange={(e) => setEditingAssetClassNameValue(e.target.value)}
                              onBlur={() => {
                                if (editingAssetClassNameValue.trim() && editingAssetClassNameValue !== assetClass.name) {
                                  updateAssetClass(assetClass.id, { name: editingAssetClassNameValue.trim() });
                                  loadData();
                                }
                                setEditingAssetClassNameId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setEditingAssetClassNameId(null);
                                }
                              }}
                              className="text-lg font-medium text-black bg-transparent border-b-2 border-[#3f3b39] focus:outline-none px-1 w-full"
                              autoFocus
                            />
                          ) : (
                            <h3 
                              className="text-lg font-medium text-black cursor-pointer hover:text-gray-700 transition-colors"
                              onClick={() => {
                                setEditingAssetClassNameId(assetClass.id);
                                setEditingAssetClassNameValue(assetClass.name);
                              }}
                            >
                              {assetClass.name}
                            </h3>
                          )}
                        </div>

                        {/* Liquid badge */}
                        {assetClass.isLiquid ? (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-md flex-shrink-0">
                            Liquid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md flex-shrink-0">
                            Non-Liquid
                          </span>
                        )}

                        {/* Asset count and value */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-black">
                            {assetsForClass.length} {assetsForClass.length === 1 ? 'asset' : 'assets'}
                          </div>
                          <div className="text-xs text-gray-500 font-light">
                            {formatCurrency(totalValue)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {/* Expand/collapse button */}
                        {assetsForClass.length > 0 && (
                          <button
                            onClick={() => setExpandedAssetClassId(isExpanded ? null : assetClass.id)}
                            className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-black transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <path d="M5 7L10 12L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}

                        {/* Edit button */}
                        <button
                          onClick={() => handleEditAssetClass(assetClass)}
                          className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-black transition-colors cursor-pointer"
                          title="Edit asset class"
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                          </svg>
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteAssetClass(assetClass.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete asset class"
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 3V1a1 1 0 011-1h2a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5H4a1 1 0 110-2h4zM7 5v12h6V5H7zm2 2a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1z" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded assets list */}
                    {isExpanded && assetsForClass.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="space-y-2">
                          {assetsForClass.map((asset) => (
                            <div
                              key={asset.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <span className="font-medium text-black">{asset.name}</span>
                              <span className="text-sm text-gray-600">{formatCurrency(asset.value || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state for class with no assets */}
                    {assetsForClass.length === 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-400 font-light">No assets assigned to this class</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {selectedTab === 'preferences' && (
        <div className="bg-white rounded-2xl shadow-card p-8">
          <h2 className="text-2xl font-medium mb-2 text-black">Preferences</h2>
          <p className="text-gray-500 text-[15px] font-light mb-8">Customize your app settings</p>
          
          <div className="space-y-8">
            {/* Currency Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all cursor-pointer"
                disabled
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2 font-light">Currency preference coming soon</p>
            </div>

            {/* Date Format Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
              <select
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all cursor-pointer"
                disabled
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
              <p className="text-xs text-gray-500 mt-2 font-light">Date format preference coming soon</p>
            </div>

            {/* Theme Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="auto"
                    className="w-4 h-4 text-[#3f3b39] border-gray-300 focus:ring-[#3f3b39] cursor-pointer"
                    disabled
                  />
                  <span className="text-gray-700 font-light">Auto</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    className="w-4 h-4 text-[#3f3b39] border-gray-300 focus:ring-[#3f3b39] cursor-pointer"
                    disabled
                  />
                  <span className="text-gray-700 font-light">Light</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    className="w-4 h-4 text-[#3f3b39] border-gray-300 focus:ring-[#3f3b39] cursor-pointer"
                    disabled
                  />
                  <span className="text-gray-700 font-light">Dark</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-light">Theme preference coming soon</p>
            </div>

            {/* Show Category Notes in Cash Flow Tab */}
            <div>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCategoryNotesInCashFlow}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setShowCategoryNotesInCashFlow(newValue);
                    updatePreferences({ showCategoryNotesInCashFlow: newValue });
                  }}
                  className="w-4 h-4 text-[#3f3b39] border-gray-300 focus:ring-[#3f3b39] cursor-pointer rounded"
                />
                <div className="flex-1">
                  <span className="text-gray-700 font-medium block">Show category notes in cash flow tab</span>
                  <span className="text-xs text-gray-500 font-light">Display notes from line items in the cash flow statement</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {selectedTab === 'data' && (
        <div className="bg-white rounded-2xl shadow-card p-8">
          <h2 className="text-2xl font-medium mb-2 text-black">Data Management</h2>
          <p className="text-gray-500 text-[15px] font-light mb-8">Export your data for backup or import data from a previous backup</p>

          {/* Export Section */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-medium mb-4 text-black">Export Data</h3>
            <p className="text-sm text-gray-600 font-light mb-4">
              Download all your financial data as a JSON file. This includes assets, liabilities, transactions, budgets, and all settings.
            </p>
            
            {/* Data Stats */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Current Data Summary:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
                <div>{getDataStats().assets} assets</div>
                <div>{getDataStats().liabilities} liabilities</div>
                <div>{getDataStats().transactions} transactions</div>
                <div>{getDataStats().assetClasses} asset classes</div>
                <div>{getDataStats().liabilityClasses} liability classes</div>
                <div>{getDataStats().budgets} budgets</div>
              </div>
            </div>

            <button
              onClick={handleExportData}
              className="px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
            >
              Export Data
            </button>
          </div>

          {/* Import Section */}
          <div>
            <h3 className="text-lg font-medium mb-4 text-black">Import Data</h3>
            <p className="text-sm text-gray-600 font-light mb-4">
              Import data from a previously exported JSON backup file.
            </p>

            <div className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Backup File</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all cursor-pointer"
                />
                {importFile && (
                  <p className="text-sm text-gray-500 mt-2 font-light">Selected: {importFile.name}</p>
                )}
              </div>

              {/* Error Message */}
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700 font-medium">{importError}</p>
                </div>
              )}

              {/* Import Preview */}
              {importPreview && !importError && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-green-700 mb-2">File validated successfully!</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Assets: {importPreview.assets?.length || 0}</div>
                    <div>Liabilities: {importPreview.liabilities?.length || 0}</div>
                    <div>Transactions: {importPreview.transactions?.length || 0}</div>
                  </div>
                </div>
              )}

              {/* Import Mode Selection */}
              {importPreview && !importError && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Import Mode</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="w-4 h-4 text-[#3f3b39] border-gray-300 focus:ring-[#3f3b39] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-gray-700 font-medium block">Replace All Data</span>
                        <span className="text-xs text-gray-500 font-light">Replace your current data with the imported data. A backup will be created automatically.</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="w-4 h-4 text-[#3f3b39] border-gray-300 focus:ring-[#3f3b39] cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-gray-700 font-medium block">Merge Data</span>
                        <span className="text-xs text-gray-500 font-light">Add imported items to your existing data. Existing items will be preserved.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Import Button */}
              {importPreview && !importError && (
                <button
                  onClick={handleImportData}
                  className="w-full px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  {importMode === 'replace' ? 'Replace All Data' : 'Merge Data'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset Class Form Modal */}
      {isAssetClassFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-6 text-black">
              {editingAssetClass ? 'Edit Asset Class' : 'Add Asset Class'}
            </h2>
            <form onSubmit={handleAssetClassSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={assetClassFormData.name}
                  onChange={(e) => setAssetClassFormData({ ...assetClassFormData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., Cash, Equities, Real Estate"
                  autoFocus
                />
              </div>
              <div>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assetClassFormData.isLiquid}
                    onChange={(e) => setAssetClassFormData({ ...assetClassFormData, isLiquid: e.target.checked })}
                    className="w-4 h-4 text-[#3f3b39] border-gray-300 focus:ring-[#3f3b39] cursor-pointer rounded"
                  />
                  <div className="flex-1">
                    <span className="text-gray-700 font-medium block">Liquid Asset</span>
                    <span className="text-xs text-gray-500 font-light">Include in liquidity calculations</span>
                  </div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color (optional)</label>
                <input
                  type="text"
                  value={assetClassFormData.color}
                  onChange={(e) => setAssetClassFormData({ ...assetClassFormData, color: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all"
                  placeholder="e.g., #3f3b39 or rgb(63, 59, 57)"
                />
                <p className="text-xs text-gray-500 mt-2 font-light">Used for chart visualization</p>
                {assetClassFormData.color && (
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: assetClassFormData.color }}
                    />
                    <span className="text-xs text-gray-500">{assetClassFormData.color}</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-[#3f3b39] text-white rounded-xl hover:bg-[#4d4845] transition-all font-medium shadow-soft cursor-pointer"
                >
                  {editingAssetClass ? 'Update' : 'Add'} Asset Class
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAssetClassFormOpen(false);
                    setEditingAssetClass(null);
                    setAssetClassFormData({ name: '', isLiquid: false, color: '' });
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

      {/* Delete Asset Class Confirmation Modal */}
      {assetClassToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 md:p-8 w-full max-w-md mx-4 md:mx-auto shadow-modal">
            <h2 className="text-2xl font-medium mb-4 text-black">Cannot Delete Asset Class</h2>
            <p className="text-gray-600 mb-6 font-light">
              This asset class is being used by {getAssetsForClass(assetClassToDelete).length} asset(s). 
              Please reassign or delete these assets before deleting the class.
            </p>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {getAssetsForClass(assetClassToDelete).map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-black">{asset.name}</span>
                  <span className="text-xs text-gray-500">{formatCurrency(asset.value || 0)}</span>
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setAssetClassToDelete(null)}
                className="flex-1 px-5 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
