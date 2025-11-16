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
  filterCategories?: string[];
  filterInstitutions?: string[];
  customOrder?: string[];
}

export interface AssetClass {
  id: string;
  name: string;
  color?: string;
  order?: number;
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
  filterCategories?: string[];
  customOrder?: string[];
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

export interface FinancialData {
  assets: Asset[];
  liabilities: Liability[];
  transactions: Transaction[];
  assetClasses: AssetClass[];
  assetViews: AssetView[];
  liabilityClasses: LiabilityClass[];
  liabilityViews: LiabilityView[];
}

