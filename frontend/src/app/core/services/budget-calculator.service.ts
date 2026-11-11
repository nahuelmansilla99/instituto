import { Injectable } from '@angular/core';
import {
  BudgetCalculationResult,
  BudgetCurrency,
  BudgetFormValues,
  BudgetGroupInfo,
  BudgetGroupKey,
  BudgetItemRow,
  BudgetSavedFile,
  BudgetSummaryLine,
  CommercialMode,
  DEFAULT_BUDGET_VALUES,
} from '../models/budget-calculator.model';

export const BUDGET_GROUPS: BudgetGroupInfo[] = [
  {
    key: 'materiales',
    label: 'Materiales y equipos',
    shortLabel: 'Materiales',
    description: 'Módulos fotovoltaicos, inversor, estructura de montaje, conductores y protecciones eléctricas.',
    defaultUnit: 'global',
    badgeColor: '#30a3d8',
  },
  {
    key: 'mano',
    label: 'Mano de obra propia',
    shortLabel: 'Mano de obra',
    description: 'Horas de instalador, montaje mecánico, conexionado eléctrico, puesta en marcha y ayudante.',
    defaultUnit: 'h',
    badgeColor: '#10b981',
  },
  {
    key: 'adicionales',
    label: 'Adicionales, logística y otros costos',
    shortLabel: 'Adicionales y logística',
    description: 'Fletes, traslados, medios de elevación, costos indirectos, posventa y aranceles.',
    defaultUnit: 'global',
    badgeColor: '#f59e0b',
  },
  {
    key: 'externos',
    label: 'Servicios profesionales y trabajos externos',
    shortLabel: 'Servicios externos',
    description: 'Medición de puesta a tierra con protocolo, obra civil, aval estructural e ingeniería externa.',
    defaultUnit: 'global',
    badgeColor: '#8b5cf6',
  },
];

export const BUDGET_GROUP_DEFAULT_NAMES: Record<BudgetGroupKey, string[]> = {
  materiales: [
    'Módulos fotovoltaicos',
    'Inversor',
    'Estructura y anclajes',
    'Conductores y canalizaciones',
    'Protecciones y seccionamiento',
    'Conectores, fijaciones y rótulos',
  ],
  mano: ['Montaje y conexionado', 'Ayudante'],
  adicionales: [
    'Traslado y flete',
    'Herramientas y medios de acceso',
    'Costos indirectos',
    'Previsión de posventa',
    'Aportes y aranceles',
  ],
  externos: [
    'Medición de puesta a tierra e informe',
    'Obra civil complementaria',
    'Estudio y aval estructural',
    'Proyecto / dirección profesional externa',
  ],
};

export const SIMULATED_EXAMPLE_TUPLES: Array<[number, number, BudgetCurrency]> = [
  [10, 100, 'USD'],
  [1, 650, 'USD'],
  [1, 300000, 'ARS'],
  [1, 180000, 'ARS'],
  [1, 220000, 'ARS'],
  [1, 80000, 'ARS'],
  [24, 18000, 'ARS'],
  [24, 10000, 'ARS'],
  [1, 120000, 'ARS'],
  [1, 100000, 'ARS'],
  [1, 150000, 'ARS'],
  [1, 58000, 'ARS'],
  [1, 0, 'ARS'],
  [1, 120000, 'ARS'],
  [1, 250000, 'ARS'],
  [1, 180000, 'ARS'],
  [1, 200000, 'ARS'],
];

@Injectable({
  providedIn: 'root',
})
export class BudgetCalculatorService {
  private nextId = 1;

  /**
   * Obtiene los metadatos de los 4 rubros del presupuesto.
   */
  getGroups(): BudgetGroupInfo[] {
    return BUDGET_GROUPS;
  }

  /**
   * Genera la lista inicial limpia de 17 conceptos agrupados por rubro.
   */
  createFreshRows(): BudgetItemRow[] {
    return BUDGET_GROUPS.flatMap((group) =>
      BUDGET_GROUP_DEFAULT_NAMES[group.key].map((name) => ({
        id: this.nextId++,
        g: group.key,
        name,
        q: 1,
        unit: group.key === 'mano' ? 'h' : 'global',
        v: 0,
        cur: 'ARS' as BudgetCurrency,
        on: true,
      })),
    );
  }

  /**
   * Crea una nueva fila para un rubro determinado.
   */
  createNewRow(groupKey: BudgetGroupKey): BudgetItemRow {
    return {
      id: this.nextId++,
      g: groupKey,
      name: 'Nuevo concepto',
      q: 1,
      unit: 'global',
      v: 0,
      cur: 'ARS',
      on: true,
    };
  }

  /**
   * Construye el ejercicio de ejemplo simulado completo.
   */
  createSimulatedExample(): {
    values: BudgetFormValues;
    rows: BudgetItemRow[];
    simulation: boolean;
  } {
    const rows = this.createFreshRows();
    rows.forEach((r, idx) => {
      const tuple = SIMULATED_EXAMPLE_TUPLES[idx];
      if (tuple) {
        r.q = tuple[0];
        r.v = tuple[1];
        r.cur = tuple[2];
      }
      if (r.g === 'materiales' && idx < 2) {
        r.unit = 'unidad';
      }
    });

    const values: BudgetFormValues = {
      obra: DEFAULT_BUDGET_VALUES.obra,
      tc: 1500,
      referencia: 'Cotización ficticia de ejercicio, sin referencia de mercado',
      cont: 5,
      benef: 20,
      tax: 0,
      modo: 'margen',
      alcance: '',
    };

    return {
      values,
      rows,
      simulation: true,
    };
  }

  /**
   * Calcula el subtotal en ARS de un ítem puntual dada una cotización USD.
   */
  computeRowSubtotalArs(row: BudgetItemRow, rate: number): number {
    if (!row.on) return 0;
    const q = row.q ?? NaN;
    const v = row.v ?? NaN;
    if (!Number.isFinite(q) || !Number.isFinite(v) || q < 0 || v < 0) return NaN;
    if (!Number.isFinite(rate) || rate <= 0) return NaN;
    return q * v * (row.cur === 'USD' ? rate : 1);
  }

  /**
   * Ejecuta el cálculo integral del presupuesto fotovoltaico con todas sus validaciones.
   * Lanza un Error con mensaje didáctico en caso de parámetros inválidos o incompletos.
   */
  calculate(
    data: BudgetItemRow[],
    rateInput: number | null | undefined,
    contInput: number | null | undefined,
    benefInput: number | null | undefined,
    taxInput: number | null | undefined,
    mode: CommercialMode,
  ): BudgetCalculationResult {
    const rate = rateInput === null || rateInput === undefined ? NaN : Number(rateInput);
    const cont = contInput === null || contInput === undefined ? NaN : Number(contInput);
    const benef = benefInput === null || benefInput === undefined ? NaN : Number(benefInput);
    const tax = taxInput === null || taxInput === undefined ? NaN : Number(taxInput);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('Ingresá una cotización válida, mayor que cero.');
    }

    const pctChecks: Array<[string, number]> = [
      ['Contingencia', cont],
      ['Margen o recargo', benef],
      ['Impuesto', tax],
    ];

    for (const [label, val] of pctChecks) {
      if (!Number.isFinite(val) || val < 0 || val > 100) {
        throw new Error(`${label}: ingresá un porcentaje entre 0 y 100.`);
      }
    }

    if (mode === 'margen' && benef >= 100) {
      throw new Error('El margen sobre venta debe ser menor al 100%.');
    }

    const sums: Record<BudgetGroupKey, number> = {
      materiales: 0,
      mano: 0,
      adicionales: 0,
      externos: 0,
    };

    let includedCount = 0;
    let excludedCount = 0;
    let zeroCostIncludedCount = 0;

    for (const r of data) {
      if (!r.on) {
        excludedCount++;
        continue;
      }
      includedCount++;

      const q = r.q === null || r.q === undefined ? NaN : Number(r.q);
      const v = r.v === null || r.v === undefined ? NaN : Number(r.v);

      if (!Number.isFinite(q) || !Number.isFinite(v) || q < 0 || v < 0) {
        throw new Error('Completá cantidades y costos con números mayores o iguales a cero.');
      }

      if (!['ARS', 'USD'].includes(r.cur) || !(r.g in sums)) {
        throw new Error('Moneda o rubro inválido.');
      }

      if (v === 0) {
        zeroCostIncludedCount++;
      }

      sums[r.g] += q * v * (r.cur === 'USD' ? rate : 1);
    }

    const sub = Object.values(sums).reduce((a, b) => a + b, 0);
    const reserve = (sub * cont) / 100;
    const cost = sub + reserve;
    const price = mode === 'margen' ? cost / (1 - benef / 100) : cost * (1 + benef / 100);
    const imp = (price * tax) / 100;
    const total = price + imp;

    if (![sub, cost, price, total].every(Number.isFinite)) {
      throw new Error('Los valores ingresados exceden el rango de cálculo.');
    }

    const result = price - cost;
    const usd = total / rate;

    const lines: BudgetSummaryLine[] = [
      ...BUDGET_GROUPS.map((g) => ({
        key: g.key,
        label: g.label,
        amount: sums[g.key],
      })),
      { key: 'sub', label: 'Subtotal de costos', amount: sub, isSubtotal: true },
      { key: 'reserve', label: 'Contingencia', amount: reserve },
      { key: 'cost', label: 'Costo previsto con contingencia', amount: cost, isSubtotal: true },
      { key: 'result', label: 'Resultado comercial previsto', amount: result, isHighlight: true },
      { key: 'price', label: 'Precio antes del impuesto agregado', amount: price, isSubtotal: true },
      { key: 'imp', label: 'Impuesto agregado', amount: imp },
    ];

    return {
      sums,
      sub,
      reserve,
      cost,
      price,
      imp,
      total,
      usd,
      result,
      lines,
      zeroCostIncludedCount,
      includedCount,
      excludedCount,
    };
  }

  /**
   * Serializa los datos actuales del ejercicio al formato JSON oficial (version: 1).
   */
  serializeToJson(
    values: BudgetFormValues,
    rows: BudgetItemRow[],
    simulation: boolean,
  ): string {
    const payload = {
      version: 1,
      values: {
        obra: values.obra ?? '',
        tc: values.tc === null || values.tc === undefined ? '' : String(values.tc),
        referencia: values.referencia ?? '',
        cont: values.cont === null || values.cont === undefined ? '' : String(values.cont),
        benef: values.benef === null || values.benef === undefined ? '' : String(values.benef),
        tax: values.tax === null || values.tax === undefined ? '' : String(values.tax),
        modo: values.modo ?? 'margen',
        alcance: values.alcance ?? '',
      },
      rows: rows.map((r) => ({
        id: r.id,
        g: r.g,
        name: r.name,
        q: r.q ?? 0,
        unit: r.unit,
        v: r.v ?? 0,
        cur: r.cur,
        on: r.on,
      })),
      simulation,
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Valida y parsea un archivo JSON guardado previamente.
   */
  validateAndParseJson(rawText: string): {
    values: BudgetFormValues;
    rows: BudgetItemRow[];
    simulation: boolean;
  } {
    let parsed: BudgetSavedFile;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('Archivo de presupuesto no válido.');
    }

    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.rows) ||
      parsed.rows.length > 500 ||
      !parsed.values
    ) {
      throw new Error('Archivo de presupuesto no válido.');
    }

    const validGroupKeys = BUDGET_GROUPS.map((g) => g.key);

    const loadedRows: BudgetItemRow[] = parsed.rows.map((r) => {
      if (
        !r ||
        !validGroupKeys.includes(r.g) ||
        !['ARS', 'USD'].includes(r.cur) ||
        typeof r.name !== 'string' ||
        typeof r.unit !== 'string' ||
        typeof r.on !== 'boolean' ||
        !Number.isFinite(r.q) ||
        !Number.isFinite(r.v) ||
        r.q < 0 ||
        r.v < 0
      ) {
        throw new Error('El archivo contiene ítems inválidos.');
      }

      return {
        id: this.nextId++,
        g: r.g,
        name: r.name,
        q: Number(r.q),
        unit: r.unit,
        v: Number(r.v),
        cur: r.cur,
        on: r.on,
      };
    });

    if (!['margen', 'recargo'].includes(parsed.values.modo as string)) {
      throw new Error('Criterio comercial no válido.');
    }

    const parseNumOrNull = (val: unknown, fallback: number | null): number | null => {
      if (val === '' || val === null || val === undefined) return fallback;
      const n = Number(val);
      return Number.isFinite(n) ? n : fallback;
    };

    const values: BudgetFormValues = {
      obra: String(parsed.values.obra ?? ''),
      tc: parseNumOrNull(parsed.values.tc, null),
      referencia: String(parsed.values.referencia ?? ''),
      cont: parseNumOrNull(parsed.values.cont, 0),
      benef: parseNumOrNull(parsed.values.benef, 0),
      tax: parseNumOrNull(parsed.values.tax, 0),
      modo: parsed.values.modo as CommercialMode,
      alcance: String(parsed.values.alcance ?? ''),
    };

    return {
      values,
      rows: loadedRows,
      simulation: parsed.simulation === true,
    };
  }

  /**
   * Formatea un importe en ARS o USD con formato es-AR y 2 decimales.
   */
  formatCurrency(n: number, cur: BudgetCurrency = 'ARS'): string {
    if (n === undefined || n === null || !Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  /**
   * Genera un resumen estructurado apto para portapapeles o compartir.
   */
  generateShareSummary(
    values: BudgetFormValues,
    calc: BudgetCalculationResult,
    simulation: boolean,
  ): string {
    const modoLabel =
      values.modo === 'margen'
        ? `Margen sobre venta (${values.benef ?? 0}%)`
        : `Recargo sobre costo (${values.benef ?? 0}%)`;

    const lines = [
      `📋 PRESUPUESTO DE INSTALACIÓN FOTOVOLTAICA`,
      `-------------------------------------------------`,
      `🏗️ Obra: ${values.obra || 'Sin nombre especificado'}`,
      `💱 Cotización tomada: ${this.formatCurrency(values.tc ?? 0, 'ARS')} / USD${values.referencia ? ` (${values.referencia})` : ''}`,
      simulation ? `⚠️ Nota: Ejercicio con valores de ejemplo simulado.` : ``,
      ``,
      `📊 Costos por Rubro:`,
      `- Materiales y equipos: ${this.formatCurrency(calc.sums.materiales, 'ARS')}`,
      `- Mano de obra propia: ${this.formatCurrency(calc.sums.mano, 'ARS')}`,
      `- Adicionales y logística: ${this.formatCurrency(calc.sums.adicionales, 'ARS')}`,
      `- Servicios profesionales externos: ${this.formatCurrency(calc.sums.externos, 'ARS')}`,
      ``,
      `📈 Resumen Económico:`,
      `- Subtotal de costos: ${this.formatCurrency(calc.sub, 'ARS')}`,
      `- Contingencia (${values.cont ?? 0}%): ${this.formatCurrency(calc.reserve, 'ARS')}`,
      `- Costo previsto con contingencia: ${this.formatCurrency(calc.cost, 'ARS')}`,
      `- Criterio comercial: ${modoLabel}`,
      `- Resultado comercial previsto: ${this.formatCurrency(calc.result, 'ARS')}`,
      `- Precio antes de impuesto: ${this.formatCurrency(calc.price, 'ARS')}`,
      `- Impuesto agregado (${values.tax ?? 0}%): ${this.formatCurrency(calc.imp, 'ARS')}`,
      ``,
      `💰 TOTALES DEL PRESUPUESTO:`,
      `- PRECIO FINAL EN PESOS: ${this.formatCurrency(calc.total, 'ARS')}`,
      `- EQUIVALENTE EN DÓLARES: ${this.formatCurrency(calc.usd, 'USD')}`,
      values.alcance ? `\n📝 Alcance y condiciones:\n${values.alcance}` : ``,
      `-------------------------------------------------`,
      `Generado con la Calculadora de Presupuesto Fotovoltaico.`,
    ].filter(Boolean);

    return lines.join('\n');
  }
}
