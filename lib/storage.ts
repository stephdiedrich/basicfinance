import { FinancialData, Asset, Liability, Transaction, AssetClass, AssetView, LiabilityClass, LiabilityView, BudgetItem, CashFlowLineItem, CashFlowGroup, CashFlowCategory } from '@/types';

const STORAGE_KEY = 'financial-data';

const defaultAssetClasses: AssetClass[] = [
  { id: 'cash', name: 'Cash', isLiquid: true },
  { id: 'equities', name: 'Equities', isLiquid: false },
  { id: 'personal-property', name: 'Personal Property', isLiquid: false },
  { id: 'real-estate', name: 'Real Estate', isLiquid: false },
  { id: 'retirement', name: 'Retirement', isLiquid: false },
];

const defaultLiabilityClasses: LiabilityClass[] = [
  { id: 'credit-card', name: 'Credit Card' },
  { id: 'mortgage', name: 'Mortgage' },
  { id: 'student-loan', name: 'Student Loan' },
  { id: 'auto-loan', name: 'Auto Loan' },
  { id: 'personal-loan', name: 'Personal Loan' },
];

const defaultCashFlowGroups: CashFlowGroup[] = [
  { id: 'group-home', name: 'Home', order: 0 },
  { id: 'group-health', name: 'Health', order: 1 },
  { id: 'group-transportation', name: 'Transportation', order: 2 },
  { id: 'group-personal', name: 'Personal', order: 3 },
];

const defaultCashFlowCategories: CashFlowCategory[] = [
  { id: 'cat-mortgage', name: 'Mortgage', order: 0 },
  { id: 'cat-utilities', name: 'Utilities', order: 1 },
  { id: 'cat-housekeeping', name: 'Housekeeping', order: 2 },
  { id: 'cat-healthcare', name: 'Healthcare', order: 3 },
  { id: 'cat-groceries', name: 'Groceries', order: 4 },
  { id: 'cat-gym', name: 'Gym Membership', order: 5 },
  { id: 'cat-car-payment', name: 'Car Payment', order: 6 },
  { id: 'cat-insurance', name: 'Insurance', order: 7 },
  { id: 'cat-gas', name: 'Gas', order: 8 },
  { id: 'cat-dining', name: 'Food & Dining', order: 9 },
  { id: 'cat-entertainment', name: 'Entertainment', order: 10 },
  { id: 'cat-shopping', name: 'Shopping', order: 11 },
];

const defaultCashFlowLineItems: CashFlowLineItem[] = [
  // Income items
  { id: 'income-salary', name: 'Salary', type: 'income', order: 0 },
  { id: 'income-freelance', name: 'Freelance', type: 'income', order: 1 },
  // Expense groups and items
  { id: 'exp-home-mortgage', name: 'Mortgage', type: 'expense', groupId: 'group-home', categoryId: 'cat-mortgage', order: 0 },
  { id: 'exp-home-utilities', name: 'Utilities', type: 'expense', groupId: 'group-home', categoryId: 'cat-utilities', order: 1 },
  { id: 'exp-home-housekeeping', name: 'Housekeeping', type: 'expense', groupId: 'group-home', categoryId: 'cat-housekeeping', order: 2 },
  { id: 'exp-health-healthcare', name: 'Healthcare', type: 'expense', groupId: 'group-health', categoryId: 'cat-healthcare', order: 0 },
  { id: 'exp-health-groceries', name: 'Groceries', type: 'expense', groupId: 'group-health', categoryId: 'cat-groceries', order: 1 },
  { id: 'exp-health-gym', name: 'Gym Membership', type: 'expense', groupId: 'group-health', categoryId: 'cat-gym', order: 2 },
  { id: 'exp-transport-car', name: 'Car Payment', type: 'expense', groupId: 'group-transportation', categoryId: 'cat-car-payment', order: 0 },
  { id: 'exp-transport-insurance', name: 'Insurance', type: 'expense', groupId: 'group-transportation', categoryId: 'cat-insurance', order: 1 },
  { id: 'exp-transport-gas', name: 'Gas', type: 'expense', groupId: 'group-transportation', categoryId: 'cat-gas', order: 2 },
  { id: 'exp-personal-dining', name: 'Food & Dining', type: 'expense', groupId: 'group-personal', categoryId: 'cat-dining', order: 0 },
  { id: 'exp-personal-entertainment', name: 'Entertainment', type: 'expense', groupId: 'group-personal', categoryId: 'cat-entertainment', order: 1 },
  { id: 'exp-personal-shopping', name: 'Shopping', type: 'expense', groupId: 'group-personal', categoryId: 'cat-shopping', order: 2 },
];

const defaultData: FinancialData = {
  assets: [],
  liabilities: [],
  transactions: [],
  assetClasses: defaultAssetClasses,
  assetViews: [],
  liabilityClasses: defaultLiabilityClasses,
  liabilityViews: [],
  budgets: [],
  cashFlowLineItems: defaultCashFlowLineItems,
  cashFlowGroups: defaultCashFlowGroups,
  cashFlowCategories: defaultCashFlowCategories,
};

export function getFinancialData(): FinancialData {
  if (typeof window === 'undefined') {
    return defaultData;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Ensure all new properties exist for backward compatibility
      return {
        ...defaultData,
        ...data,
        assetViews: data.assetViews || [], // Keep existing views
        cashFlowGroups: data.cashFlowGroups || defaultCashFlowGroups,
        cashFlowCategories: data.cashFlowCategories || defaultCashFlowCategories,
        cashFlowLineItems: data.cashFlowLineItems || defaultCashFlowLineItems,
        budgets: data.budgets || [],
      };
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }

  return defaultData;
}

export function saveFinancialData(data: FinancialData): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function addAsset(asset: Omit<Asset, 'id' | 'dateAdded'>): void {
  const data = getFinancialData();
  const newAsset: Asset = {
    ...asset,
    id: crypto.randomUUID(),
    dateAdded: new Date().toISOString(),
  };
  data.assets.push(newAsset);
  saveFinancialData(data);
}

export function updateAsset(id: string, updates: Partial<Asset>): void {
  const data = getFinancialData();
  const index = data.assets.findIndex(a => a.id === id);
  if (index !== -1) {
    data.assets[index] = { ...data.assets[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteAsset(id: string): void {
  const data = getFinancialData();
  data.assets = data.assets.filter(a => a.id !== id);
  saveFinancialData(data);
}

export function reorderAssets(assetIds: string[]): void {
  const data = getFinancialData();
  const assetMap = new Map(data.assets.map(a => [a.id, a]));
  const reordered: Asset[] = [];
  assetIds.forEach((id, index) => {
    const asset = assetMap.get(id);
    if (asset) {
      reordered.push({ ...asset, order: index });
    }
  });
  // Add any assets not in the reordered list
  data.assets.forEach(asset => {
    if (!assetIds.includes(asset.id)) {
      reordered.push(asset);
    }
  });
  data.assets = reordered;
  saveFinancialData(data);
}

export function addLiability(liability: Omit<Liability, 'id' | 'dateAdded'>): void {
  const data = getFinancialData();
  const newLiability: Liability = {
    ...liability,
    id: crypto.randomUUID(),
    dateAdded: new Date().toISOString(),
  };
  data.liabilities.push(newLiability);
  saveFinancialData(data);
}

export function reorderLiabilities(liabilityIds: string[]): void {
  const data = getFinancialData();
  const liabilityMap = new Map(data.liabilities.map(l => [l.id, l]));
  const reordered: Liability[] = [];
  liabilityIds.forEach((id, index) => {
    const liability = liabilityMap.get(id);
    if (liability) {
      reordered.push({ ...liability, order: index });
    }
  });
  // Add any liabilities not in the reordered list
  data.liabilities.forEach(liability => {
    if (!liabilityIds.includes(liability.id)) {
      reordered.push(liability);
    }
  });
  data.liabilities = reordered;
  saveFinancialData(data);
}

export function updateLiability(id: string, updates: Partial<Liability>): void {
  const data = getFinancialData();
  const index = data.liabilities.findIndex(l => l.id === id);
  if (index !== -1) {
    data.liabilities[index] = { ...data.liabilities[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteLiability(id: string): void {
  const data = getFinancialData();
  data.liabilities = data.liabilities.filter(l => l.id !== id);
  saveFinancialData(data);
}

export function addTransaction(transaction: Omit<Transaction, 'id'>): void {
  const data = getFinancialData();
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
  };
  data.transactions.push(newTransaction);
  saveFinancialData(data);
}

export function updateTransaction(id: string, updates: Partial<Transaction>): void {
  const data = getFinancialData();
  const index = data.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    data.transactions[index] = { ...data.transactions[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteTransaction(id: string): void {
  const data = getFinancialData();
  data.transactions = data.transactions.filter(t => t.id !== id);
  saveFinancialData(data);
}

export function calculateNetWorth(): number {
  const data = getFinancialData();
  const totalAssets = data.assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalLiabilities = data.liabilities.reduce((sum, liability) => sum + liability.amount, 0);
  return totalAssets - totalLiabilities;
}

export function getMonthlyCashFlow(year: number, month: number): { income: number; expenses: number } {
  const data = getFinancialData();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const monthlyTransactions = data.transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  const income = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return { income, expenses };
}

// Asset Classes
export function getAssetClasses(): AssetClass[] {
  const data = getFinancialData();
  return data.assetClasses || defaultAssetClasses;
}

export function addAssetClass(name: string): AssetClass {
  const data = getFinancialData();
  const newClass: AssetClass = {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name: name,
  };
  if (!data.assetClasses) {
    data.assetClasses = [];
  }
  data.assetClasses.push(newClass);
  saveFinancialData(data);
  return newClass;
}

export function updateAssetClass(id: string, updates: Partial<AssetClass>): void {
  const data = getFinancialData();
  if (!data.assetClasses) return;
  const index = data.assetClasses.findIndex(ac => ac.id === id);
  if (index !== -1) {
    data.assetClasses[index] = { ...data.assetClasses[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteAssetClass(id: string): void {
  const data = getFinancialData();
  if (data.assetClasses) {
    data.assetClasses = data.assetClasses.filter(ac => ac.id !== id);
    saveFinancialData(data);
  }
}

export function reorderAssetClasses(classIds: string[]): void {
  const data = getFinancialData();
  if (!data.assetClasses) return;
  const classMap = new Map(data.assetClasses.map(ac => [ac.id, ac]));
  const reordered: AssetClass[] = [];
  classIds.forEach((id, index) => {
    const assetClass = classMap.get(id);
    if (assetClass) {
      reordered.push({ ...assetClass, order: index });
    }
  });
  // Add any classes not in the reordered list
  data.assetClasses.forEach(assetClass => {
    if (!classIds.includes(assetClass.id)) {
      reordered.push(assetClass);
    }
  });
  data.assetClasses = reordered;
  saveFinancialData(data);
}

// Asset Views
export function getAssetViews(): AssetView[] {
  const data = getFinancialData();
  return data.assetViews || [];
}

export function addAssetView(view: Omit<AssetView, 'id'>): AssetView {
  const data = getFinancialData();
  const newView: AssetView = {
    ...view,
    id: crypto.randomUUID(),
  };
  if (!data.assetViews) {
    data.assetViews = [];
  }
  data.assetViews.push(newView);
  saveFinancialData(data);
  return newView;
}

export function updateAssetView(id: string, updates: Partial<AssetView>): void {
  const data = getFinancialData();
  if (!data.assetViews) return;
  const index = data.assetViews.findIndex(v => v.id === id);
  if (index !== -1) {
    data.assetViews[index] = { ...data.assetViews[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteAssetView(id: string): void {
  const data = getFinancialData();
  if (data.assetViews) {
    data.assetViews = data.assetViews.filter(v => v.id !== id);
    saveFinancialData(data);
  }
}

export function reorderAssetViews(viewIds: string[]): void {
  const data = getFinancialData();
  if (!data.assetViews) return;
  const viewMap = new Map(data.assetViews.map(v => [v.id, v]));
  const reordered: AssetView[] = [];
  viewIds.forEach(id => {
    const view = viewMap.get(id);
    if (view) {
      reordered.push(view);
    }
  });
  // Add any views not in the reordered list
  data.assetViews.forEach(view => {
    if (!viewIds.includes(view.id)) {
      reordered.push(view);
    }
  });
  data.assetViews = reordered;
  saveFinancialData(data);
}

// Liability Classes
export function getLiabilityClasses(): LiabilityClass[] {
  const data = getFinancialData();
  return data.liabilityClasses || defaultLiabilityClasses;
}

export function addLiabilityClass(name: string): LiabilityClass {
  const data = getFinancialData();
  const newClass: LiabilityClass = {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name: name,
  };
  if (!data.liabilityClasses) {
    data.liabilityClasses = [];
  }
  data.liabilityClasses.push(newClass);
  saveFinancialData(data);
  return newClass;
}

export function updateLiabilityClass(id: string, updates: Partial<LiabilityClass>): void {
  const data = getFinancialData();
  if (!data.liabilityClasses) return;
  const index = data.liabilityClasses.findIndex(lc => lc.id === id);
  if (index !== -1) {
    data.liabilityClasses[index] = { ...data.liabilityClasses[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteLiabilityClass(id: string): void {
  const data = getFinancialData();
  if (data.liabilityClasses) {
    data.liabilityClasses = data.liabilityClasses.filter(lc => lc.id !== id);
    saveFinancialData(data);
  }
}

export function reorderLiabilityClasses(classIds: string[]): void {
  const data = getFinancialData();
  if (!data.liabilityClasses) return;
  const classMap = new Map(data.liabilityClasses.map(lc => [lc.id, lc]));
  const reordered: LiabilityClass[] = [];
  classIds.forEach((id, index) => {
    const liabilityClass = classMap.get(id);
    if (liabilityClass) {
      reordered.push({ ...liabilityClass, order: index });
    }
  });
  // Add any classes not in the reordered list
  data.liabilityClasses.forEach(liabilityClass => {
    if (!classIds.includes(liabilityClass.id)) {
      reordered.push(liabilityClass);
    }
  });
  data.liabilityClasses = reordered;
  saveFinancialData(data);
}

// Liability Views
export function getLiabilityViews(): LiabilityView[] {
  const data = getFinancialData();
  return data.liabilityViews || [];
}

export function addLiabilityView(view: Omit<LiabilityView, 'id'>): LiabilityView {
  const data = getFinancialData();
  const newView: LiabilityView = {
    ...view,
    id: crypto.randomUUID(),
  };
  if (!data.liabilityViews) {
    data.liabilityViews = [];
  }
  data.liabilityViews.push(newView);
  saveFinancialData(data);
  return newView;
}

export function updateLiabilityView(id: string, updates: Partial<LiabilityView>): void {
  const data = getFinancialData();
  if (!data.liabilityViews) return;
  const index = data.liabilityViews.findIndex(v => v.id === id);
  if (index !== -1) {
    data.liabilityViews[index] = { ...data.liabilityViews[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteLiabilityView(id: string): void {
  const data = getFinancialData();
  if (data.liabilityViews) {
    data.liabilityViews = data.liabilityViews.filter(v => v.id !== id);
    saveFinancialData(data);
  }
}

export function reorderLiabilityViews(viewIds: string[]): void {
  const data = getFinancialData();
  if (!data.liabilityViews) return;
  const viewMap = new Map(data.liabilityViews.map(v => [v.id, v]));
  const reordered: LiabilityView[] = [];
  viewIds.forEach(id => {
    const view = viewMap.get(id);
    if (view) {
      reordered.push(view);
    }
  });
  // Add any views not in the reordered list
  data.liabilityViews.forEach(view => {
    if (!viewIds.includes(view.id)) {
      reordered.push(view);
    }
  });
  data.liabilityViews = reordered;
  saveFinancialData(data);
}

// Budget Functions
export function getBudgets(year: number, month: number): BudgetItem[] {
  const data = getFinancialData();
  return (data.budgets || []).filter(b => b.year === year && b.month === month);
}

export function addBudget(budget: Omit<BudgetItem, 'id'>): BudgetItem {
  const data = getFinancialData();
  const newBudget: BudgetItem = {
    ...budget,
    id: crypto.randomUUID(),
  };
  if (!data.budgets) {
    data.budgets = [];
  }
  data.budgets.push(newBudget);
  saveFinancialData(data);
  return newBudget;
}

export function updateBudget(id: string, updates: Partial<BudgetItem>): void {
  const data = getFinancialData();
  if (!data.budgets) return;
  const index = data.budgets.findIndex(b => b.id === id);
  if (index !== -1) {
    data.budgets[index] = { ...data.budgets[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteBudget(id: string): void {
  const data = getFinancialData();
  if (data.budgets) {
    data.budgets = data.budgets.filter(b => b.id !== id);
    saveFinancialData(data);
  }
}

// Cash Flow Line Items
export function getCashFlowLineItems(): CashFlowLineItem[] {
  const data = getFinancialData();
  return data.cashFlowLineItems || defaultCashFlowLineItems;
}

export function addCashFlowLineItem(item: Omit<CashFlowLineItem, 'id'>): CashFlowLineItem {
  const data = getFinancialData();
  const newItem: CashFlowLineItem = {
    ...item,
    id: crypto.randomUUID(),
  };
  if (!data.cashFlowLineItems) {
    data.cashFlowLineItems = [];
  }
  data.cashFlowLineItems.push(newItem);
  saveFinancialData(data);
  return newItem;
}

export function updateCashFlowLineItem(id: string, updates: Partial<CashFlowLineItem>): void {
  const data = getFinancialData();
  if (!data.cashFlowLineItems) return;
  const index = data.cashFlowLineItems.findIndex(item => item.id === id);
  if (index !== -1) {
    data.cashFlowLineItems[index] = { ...data.cashFlowLineItems[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteCashFlowLineItem(id: string): void {
  const data = getFinancialData();
  if (data.cashFlowLineItems) {
    data.cashFlowLineItems = data.cashFlowLineItems.filter(item => item.id !== id);
    saveFinancialData(data);
  }
}

export function reorderCashFlowLineItems(itemIds: string[]): void {
  const data = getFinancialData();
  if (!data.cashFlowLineItems) return;
  const itemMap = new Map(data.cashFlowLineItems.map(item => [item.id, item]));
  const reordered: CashFlowLineItem[] = [];
  itemIds.forEach((id, index) => {
    const item = itemMap.get(id);
    if (item) {
      reordered.push({ ...item, order: index });
    }
  });
  // Add any items not in the reordered list
  data.cashFlowLineItems.forEach(item => {
    if (!itemIds.includes(item.id)) {
      reordered.push(item);
    }
  });
  data.cashFlowLineItems = reordered;
  saveFinancialData(data);
}

// Cash Flow Groups
export function getCashFlowGroups(): CashFlowGroup[] {
  const data = getFinancialData();
  return data.cashFlowGroups || defaultCashFlowGroups;
}

export function addCashFlowGroup(name: string): CashFlowGroup {
  const data = getFinancialData();
  const newGroup: CashFlowGroup = {
    id: crypto.randomUUID(),
    name: name,
    order: (data.cashFlowGroups || defaultCashFlowGroups).length,
  };
  if (!data.cashFlowGroups) {
    data.cashFlowGroups = [];
  }
  data.cashFlowGroups.push(newGroup);
  saveFinancialData(data);
  return newGroup;
}

export function updateCashFlowGroup(id: string, updates: Partial<CashFlowGroup>): void {
  const data = getFinancialData();
  if (!data.cashFlowGroups) return;
  const index = data.cashFlowGroups.findIndex(g => g.id === id);
  if (index !== -1) {
    data.cashFlowGroups[index] = { ...data.cashFlowGroups[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteCashFlowGroup(id: string): void {
  const data = getFinancialData();
  if (data.cashFlowGroups) {
    data.cashFlowGroups = data.cashFlowGroups.filter(g => g.id !== id);
    // Also remove groupId from line items that use this group
    if (data.cashFlowLineItems) {
      data.cashFlowLineItems = data.cashFlowLineItems.map(item => 
        item.groupId === id ? { ...item, groupId: undefined } : item
      );
    }
    saveFinancialData(data);
  }
}

export function reorderCashFlowGroups(groupIds: string[]): void {
  const data = getFinancialData();
  if (!data.cashFlowGroups) return;
  const groupMap = new Map(data.cashFlowGroups.map(g => [g.id, g]));
  const reordered: CashFlowGroup[] = [];
  groupIds.forEach((id, index) => {
    const group = groupMap.get(id);
    if (group) {
      reordered.push({ ...group, order: index });
    }
  });
  // Add any groups not in the reordered list
  data.cashFlowGroups.forEach(group => {
    if (!groupIds.includes(group.id)) {
      reordered.push(group);
    }
  });
  data.cashFlowGroups = reordered;
  saveFinancialData(data);
}

// Cash Flow Categories
export function getCashFlowCategories(): CashFlowCategory[] {
  const data = getFinancialData();
  return data.cashFlowCategories || defaultCashFlowCategories;
}

export function addCashFlowCategory(name: string): CashFlowCategory {
  const data = getFinancialData();
  const newCategory: CashFlowCategory = {
    id: crypto.randomUUID(),
    name: name,
    order: (data.cashFlowCategories || defaultCashFlowCategories).length,
  };
  if (!data.cashFlowCategories) {
    data.cashFlowCategories = [];
  }
  data.cashFlowCategories.push(newCategory);
  saveFinancialData(data);
  return newCategory;
}

export function updateCashFlowCategory(id: string, updates: Partial<CashFlowCategory>): void {
  const data = getFinancialData();
  if (!data.cashFlowCategories) return;
  const index = data.cashFlowCategories.findIndex(c => c.id === id);
  if (index !== -1) {
    data.cashFlowCategories[index] = { ...data.cashFlowCategories[index], ...updates };
    saveFinancialData(data);
  }
}

export function deleteCashFlowCategory(id: string): void {
  const data = getFinancialData();
  if (data.cashFlowCategories) {
    data.cashFlowCategories = data.cashFlowCategories.filter(c => c.id !== id);
    // Also remove categoryId from line items that use this category
    if (data.cashFlowLineItems) {
      data.cashFlowLineItems = data.cashFlowLineItems.map(item => 
        item.categoryId === id ? { ...item, categoryId: undefined } : item
      );
    }
    saveFinancialData(data);
  }
}

export function reorderCashFlowCategories(categoryIds: string[]): void {
  const data = getFinancialData();
  if (!data.cashFlowCategories) return;
  const categoryMap = new Map(data.cashFlowCategories.map(c => [c.id, c]));
  const reordered: CashFlowCategory[] = [];
  categoryIds.forEach((id, index) => {
    const category = categoryMap.get(id);
    if (category) {
      reordered.push({ ...category, order: index });
    }
  });
  // Add any categories not in the reordered list
  data.cashFlowCategories.forEach(category => {
    if (!categoryIds.includes(category.id)) {
      reordered.push(category);
    }
  });
  data.cashFlowCategories = reordered;
  saveFinancialData(data);
}

