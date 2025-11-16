export type AssetType = string; // Dynamic - can be any string

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  institution?: string;
  dateAdded: string;
  notes?: string;
  order?: number;
}

export interface AssetView {
  id: string;
  name: string;
  assetIds?: string[]; // Array of asset IDs in this view
  filterCategories?: string[]; // Deprecated - kept for backward compatibility
  filterInstitutions?: string[]; // Deprecated - kept for backward compatibility
  customOrder?: string[]; // Deprecated - kept for backward compatibility
}

export interface AssetClass {
  id: string;
  name: string;
  color?: string;
  order?: number;
  isLiquid?: boolean;
}

export type LiabilityType = string; // Dynamic - can be any string

export interface Liability {
  id: string;
  name: string;
  type: LiabilityType;
  amount: number;
  interestRate?: number;
  dateAdded: string;
  notes?: string;
  order?: number;
}

export interface LiabilityView {
  id: string;
  name: string;
  liabilityIds?: string[]; // Store liability IDs directly
  filterCategories?: string[]; // Deprecated - kept for backward compatibility
  customOrder?: string[]; // Deprecated - kept for backward compatibility
}

export interface LiabilityClass {
  id: string;
  name: string;
  color?: string;
  order?: number;
}

export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 
  | 'salary'
  | 'investment'
  | 'rent'
  | 'utilities'
  | 'food'
  | 'transportation'
  | 'entertainment'
  | 'healthcare'
  | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  date: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  subCategory?: string;
  budgeted: number;
  month: number; // 1-12
  year: number;
}

export interface CashFlowGroup {
  id: string;
  name: string;
  order: number;
}

export interface CashFlowCategory {
  id: string;
  name: string;
  order: number;
}

export interface CashFlowLineItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  groupId?: string; // Reference to CashFlowGroup id
  categoryId?: string; // Reference to CashFlowCategory id
  order: number; // Order within the group or overall
}

export interface FinancialData {
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  assetClasses: AssetClass[];
  assetViews: AssetView[];
  liabilityClasses: LiabilityClass[];
  liabilityViews: LiabilityView[];
  budgets: BudgetItem[];
  cashFlowLineItems: CashFlowLineItem[];
  cashFlowGroups: CashFlowGroup[];
  cashFlowCategories: CashFlowCategory[];
}

