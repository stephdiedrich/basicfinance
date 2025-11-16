import { FinancialData, Asset, Liability, Transaction, AssetClass, AssetView } from '@/types';

const STORAGE_KEY = 'financial-data';

const defaultAssetClasses: AssetClass[] = [
  { id: 'cash', name: 'Cash' },
  { id: 'equities', name: 'Equities' },
  { id: 'personal-property', name: 'Personal Property' },
  { id: 'real-estate', name: 'Real Estate' },
  { id: 'retirement', name: 'Retirement' },
];

const defaultData: FinancialData = {
  assets: [],
  liabilities: [],
  transactions: [],
  assetClasses: defaultAssetClasses,
  assetViews: [],
};

export function getFinancialData(): FinancialData {
  if (typeof window === 'undefined') {
    return defaultData;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
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

