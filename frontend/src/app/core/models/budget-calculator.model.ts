export type BudgetGroupKey = 'materiales' | 'mano' | 'adicionales' | 'externos';

export type BudgetCurrency = 'ARS' | 'USD';

export type CommercialMode = 'margen' | 'recargo';

export interface BudgetGroupInfo {
  key: BudgetGroupKey;
  label: string;
  shortLabel: string;
  description: string;
  defaultUnit: string;
  badgeColor: string;
}

export interface BudgetItemRow {
  id: number;
  g: BudgetGroupKey;
  name: string;
  q: number | null;
  unit: string;
  v: number | null;
  cur: BudgetCurrency;
  on: boolean;
}

export interface BudgetFormValues {
  obra: string;
  tc: number | null;
  referencia: string;
  cont: number | null;
  benef: number | null;
  tax: number | null;
  modo: CommercialMode;
  alcance: string;
}

export interface BudgetSummaryLine {
  key: string;
  label: string;
  amount: number;
  isSubtotal?: boolean;
  isHighlight?: boolean;
}

export interface BudgetCalculationResult {
  sums: Record<BudgetGroupKey, number>;
  sub: number;
  reserve: number;
  cost: number;
  price: number;
  imp: number;
  total: number;
  usd: number;
  result: number;
  lines: BudgetSummaryLine[];
  zeroCostIncludedCount: number;
  includedCount: number;
  excludedCount: number;
}

export interface BudgetSavedFile {
  version: number;
  values: {
    obra?: string;
    tc?: string | number;
    referencia?: string;
    cont?: string | number;
    benef?: string | number;
    tax?: string | number;
    modo?: CommercialMode;
    alcance?: string;
  };
  rows: Array<{
    id?: number;
    g: BudgetGroupKey;
    name: string;
    q: number;
    unit: string;
    v: number;
    cur: BudgetCurrency;
    on: boolean;
  }>;
  simulation?: boolean;
}

export const DEFAULT_BUDGET_VALUES: BudgetFormValues = {
  obra: 'Instalación en zona urbana',
  tc: null,
  referencia: '',
  cont: 0,
  benef: 0,
  tax: 0,
  modo: 'margen',
  alcance: '',
};
