'use client';

import { useEffect, useState } from 'react';
import { 
  getCashFlowLineItems, addCashFlowLineItem, updateCashFlowLineItem, deleteCashFlowLineItem, reorderCashFlowLineItems,
  getCashFlowGroups, addCashFlowGroup, updateCashFlowGroup, deleteCashFlowGroup, reorderCashFlowGroups,
  getCashFlowCategories, addCashFlowCategory, updateCashFlowCategory, deleteCashFlowCategory, reorderCashFlowCategories
} from '@/lib/storage';
import { CashFlowLineItem, CashFlowGroup, CashFlowCategory } from '@/types';

type SettingsTab = 'institutions' | 'categories' | 'preferences';

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
  });
  const [groupFormData, setGroupFormData] = useState({ name: '' });
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

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
    } catch (error) {
      console.error('Error loading data:', error);
      setGroups([]);
      setCategories([]);
      setLineItems([]);
    }
  };

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
    if (confirm('Are you sure you want to delete this group? Line items using this group will be ungrouped.')) {
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
    setFormData({ name: '', type: 'income', groupId: '', newGroupName: '', categoryId: '' });
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

  return (
    <div className="w-full pr-8 lg:pr-16 py-10" style={{ paddingLeft: 'calc(280px + 2rem)' }}>
      <div className="mb-10">
        <h1 className="text-4xl font-medium mb-2 text-black tracking-tight">Settings</h1>
        <p className="text-gray-500 text-[15px] font-light">Manage your app preferences and configurations</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
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
            onClick={() => setSelectedTab('preferences')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              selectedTab === 'preferences'
                ? 'bg-white text-black shadow-soft'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            Preferences
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
                setFormData({ name: '', type: 'income', groupId: '', newGroupName: '', categoryId: '' });
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
            return (
              <div key={group.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
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
                    className="text-lg font-medium text-black mb-4 bg-transparent border-b-2 border-[#3f3b39] focus:outline-none px-1"
                    autoFocus
                  />
                ) : (
                  <h3 
                    className="text-lg font-medium text-black mb-4 cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => {
                      setEditingGroupNameId(group.id);
                      setEditingGroupNameValue(group.name);
                    }}
                  >
                    {group.name}
                  </h3>
                )}
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
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-400 cursor-grab active:cursor-grabbing">
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          </div>
                          <span className="font-medium text-black">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-gray-400 cursor-grab active:cursor-grabbing">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                      <span className="font-medium text-black">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
                setFormData({ name: '', type: 'expense', groupId: '', newGroupName: '', categoryId: '' });
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
            return (
              <div key={group.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
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
                    className="text-lg font-medium text-black mb-4 bg-transparent border-b-2 border-[#3f3b39] focus:outline-none px-1"
                    autoFocus
                  />
                ) : (
                  <h3 
                    className="text-lg font-medium text-black mb-4 cursor-pointer hover:text-gray-700 transition-colors"
                    onClick={() => {
                      setEditingGroupNameId(group.id);
                      setEditingGroupNameValue(group.name);
                    }}
                  >
                    {group.name}
                  </h3>
                )}
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
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-400 cursor-grab active:cursor-grabbing">
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          </div>
                          <span className="font-medium text-black">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-gray-400 cursor-grab active:cursor-grabbing">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        </div>
                        <span className="font-medium text-black">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-200 cursor-pointer"
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354L12.427 2.487zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064L11.189 6.25z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal">
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
                    setFormData({ ...formData, type: e.target.value as 'income' | 'expense', groupId: '', newGroupName: '' });
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
              <div className="flex space-x-3 pt-2">
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
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal">
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
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal">
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
          </div>
        </div>
      )}
    </div>
  );
}
