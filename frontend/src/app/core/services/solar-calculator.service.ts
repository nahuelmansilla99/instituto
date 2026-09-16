import { Injectable } from '@angular/core';
import {
  HourlyDataPoint,
  HourlyProfileType,
  MonthData,
  SolarCalculatorInputs,
  SolarCalculatorOutputs,
  SolarLocation,
  SolarLocationKey,
} from '../models/solar-calculator.model';

export const SOLAR_LOCATIONS: Record<SolarLocationKey, SolarLocation> = {
  laplata: {
    key: 'laplata',
    name: 'La Plata / Gonnet',
    monthlyHsp: [5.55, 5.05, 4.45, 3.55, 2.75, 2.35, 2.60, 3.20, 4.05, 4.85, 5.45, 5.70],
  },
  caba: {
    key: 'caba',
    name: 'CABA',
    monthlyHsp: [5.65, 5.15, 4.50, 3.60, 2.80, 2.40, 2.65, 3.25, 4.10, 4.95, 5.55, 5.80],
  },
  mardel: {
    key: 'mardel',
    name: 'Mar del Plata',
    monthlyHsp: [5.55, 4.95, 4.20, 3.25, 2.45, 2.05, 2.30, 2.90, 3.75, 4.65, 5.35, 5.65],
  },
  bahia: {
    key: 'bahia',
    name: 'Bahía Blanca',
    monthlyHsp: [6.20, 5.65, 4.85, 3.90, 3.05, 2.65, 2.90, 3.60, 4.55, 5.45, 6.00, 6.35],
  },
  junin: {
    key: 'junin',
    name: 'Junín',
    monthlyHsp: [6.05, 5.55, 4.80, 3.90, 3.05, 2.65, 2.90, 3.55, 4.45, 5.35, 5.90, 6.20],
  },
};

export const SOLAR_MONTHS: MonthData[] = [
  { name: 'Enero', days: 31 },
  { name: 'Febrero', days: 28 },
  { name: 'Marzo', days: 31 },
  { name: 'Abril', days: 30 },
  { name: 'Mayo', days: 31 },
  { name: 'Junio', days: 30 },
  { name: 'Julio', days: 31 },
  { name: 'Agosto', days: 31 },
  { name: 'Septiembre', days: 30 },
  { name: 'Octubre', days: 31 },
  { name: 'Noviembre', days: 30 },
  { name: 'Diciembre', days: 31 },
];

export const DEFAULT_HOURLY_PROFILES: Record<'home' | 'business', number[]> = {
  home: [
    0.32, 0.25, 0.21, 0.19, 0.18, 0.25, 0.75, 1.25, 1.05, 0.58, 0.46, 0.42,
    0.48, 0.44, 0.42, 0.48, 0.62, 1.05, 1.55, 1.88, 2.05, 1.72, 1.10, 0.58,
  ],
  business: [
    0.15, 0.12, 0.11, 0.10, 0.10, 0.12, 0.22, 0.55, 1.35, 1.85, 2.05, 2.15,
    2.25, 2.20, 2.18, 2.10, 1.92, 1.65, 0.88, 0.40, 0.24, 0.19, 0.17, 0.16,
  ],
};

@Injectable({
  providedIn: 'root',
})
export class SolarCalculatorService {
  /**
   * Obtiene la lista completa de localidades soportadas.
   */
  getLocations(): SolarLocation[] {
    return Object.values(SOLAR_LOCATIONS);
  }

  /**
   * Obtiene una localidad por su clave identificadora.
   */
  getLocation(key: SolarLocationKey): SolarLocation {
    return SOLAR_LOCATIONS[key] || SOLAR_LOCATIONS.laplata;
  }

  /**
   * Obtiene la lista de los 12 meses con sus nombres y cantidad de días.
   */
  getMonths(): MonthData[] {
    return SOLAR_MONTHS;
  }

  /**
   * Retorna las HSP históricas de referencia según localidad y mes (0-11).
   */
  getDefaultHsp(locationKey: SolarLocationKey, monthIndex: number): number {
    const loc = this.getLocation(locationKey);
    const validMonth = Math.max(0, Math.min(11, monthIndex));
    return loc.monthlyHsp[validMonth] ?? 3.2;
  }

  /**
   * Obtiene los pesos horarios por defecto de 24 horas según el perfil elegido.
   */
  getDefaultProfileWeights(type: HourlyProfileType): number[] {
    if (type === 'business') {
      return [...DEFAULT_HOURLY_PROFILES.business];
    }
    return [...DEFAULT_HOURLY_PROFILES.home];
  }

  /**
   * Genera la distribución de radiación solar en 24 horas según las HSP del día.
   * Modela la campana solar fotovoltaica estándar.
   */
  sunShape(hsp: number): number[] {
    const center = 12.5;
    const len = Math.max(8, Math.min(15, 9.2 + hsp * 0.75));
    return Array.from({ length: 24 }, (_, h) => {
      const x = (h - (center - len / 2)) / len;
      return x > 0 && x < 1 ? Math.pow(Math.sin(Math.PI * x), 1.55) : 0;
    });
  }

  /**
   * Normaliza una curva de pesos horarios para que su suma diaria sea exactamente totalDaily.
   */
  normalizeCurve(weights: number[], totalDaily: number): number[] {
    const sum = weights.reduce((acc, v) => acc + (v > 0 ? v : 0), 0);
    if (sum <= 0) {
      return new Array(weights.length).fill(0);
    }
    return weights.map((w) => (Math.max(0, w) / sum) * totalDaily);
  }

  /**
   * Ejecuta el cálculo completo del balance de generación y consumo solar.
   */
  calculate(inputs: SolarCalculatorInputs): SolarCalculatorOutputs {
    const months = this.getMonths();
    const monthIndex = Math.max(0, Math.min(11, inputs.monthIndex ?? 7));
    const month = months[monthIndex] || months[7];
    const days = month.days;

    // 1. Potencia Pico (kWp)
    const peakPowerKwp = ((inputs.panelPowerWp || 0) * (inputs.panelCount || 0)) / 1000;

    // 2. Rendimiento Global (PR) y Generación Diaria / Mensual
    const prFactor = Math.max(0, (inputs.performanceRatio ?? 80) / 100);
    const hsp = Math.max(0, inputs.hsp ?? 0);
    const dailyGenerationKwh = peakPowerKwp * hsp * prFactor;
    const monthlyGenerationKwh = dailyGenerationKwh * days;

    // 3. Consumo Diario y Mensual
    const monthlyConsumptionKwh = Math.max(0, inputs.monthlyConsumptionKwh || 0);
    const dailyConsumptionKwh = days > 0 ? monthlyConsumptionKwh / days : 0;

    // 4. Curvas Horarias (Generación y Demanda en kW / kWh por hora)
    const sunWeights = this.sunShape(hsp);
    const hourlyGenerationKw = this.normalizeCurve(sunWeights, dailyGenerationKwh);

    let consumptionWeights: number[];
    if (
      inputs.profileType === 'custom' &&
      Array.isArray(inputs.customHourlyWeights) &&
      inputs.customHourlyWeights.length === 24
    ) {
      consumptionWeights = inputs.customHourlyWeights;
    } else {
      consumptionWeights = this.getDefaultProfileWeights(inputs.profileType);
    }
    const hourlyConsumptionKw = this.normalizeCurve(consumptionWeights, dailyConsumptionKwh);

    // 5. Integración horaria: Autoconsumo, Excedentes e Importación
    let dailySelfConsumption = 0;
    let dailyExportSurplus = 0;
    let dailyImportGrid = 0;

    for (let h = 0; h < 24; h++) {
      const gen = hourlyGenerationKw[h];
      const con = hourlyConsumptionKw[h];
      const self = Math.min(gen, con);
      const surplus = Math.max(0, gen - con);
      const imp = Math.max(0, con - gen);

      dailySelfConsumption += self;
      dailyExportSurplus += surplus;
      dailyImportGrid += imp;
    }

    const selfConsumptionKwh = dailySelfConsumption * days;
    const exportSurplusKwh = dailyExportSurplus * days;
    const importGridKwh = dailyImportGrid * days;

    // 6. Porcentajes de cobertura y autoconsumo
    const coveragePct =
      monthlyConsumptionKwh > 0 ? (selfConsumptionKwh / monthlyConsumptionKwh) * 100 : 0;
    const selfConsumptionPct =
      monthlyGenerationKwh > 0 ? (selfConsumptionKwh / monthlyGenerationKwh) * 100 : 0;

    // 7. Estimación económica
    const buyPrice = Math.max(0, inputs.buyPricePerKwh || 0);
    const exportPrice = Math.max(0, inputs.exportPricePerKwh || 0);
    const selfConsumptionSavings = selfConsumptionKwh * buyPrice;
    const exportCreditSavings = exportSurplusKwh * exportPrice;

    // 8. Etiquetas y descripciones legibles
    const periodLabel = `durante ${month.name} (${days} días)`;

    let profileLabel = 'Residencial';
    let profileDescription = 'Consumo típico con picos por la mañana y noche';
    if (inputs.profileType === 'business') {
      profileLabel = 'Comercial';
      profileDescription = 'Consumo diurno coincidente con horas comerciales y de radiación solar';
    } else if (inputs.profileType === 'custom') {
      profileLabel = 'Personalizado';
      profileDescription = 'Curva horaria de consumo personalizada (24 horas)';
    }

    let differenceLabel = '';
    if (exportSurplusKwh > 0.05 && importGridKwh > 0.05) {
      differenceLabel = `Excedente inyectado; se importan ${this.formatNumber(importGridKwh, 1)} kWh`;
    } else if (exportSurplusKwh > 0.05) {
      differenceLabel = `Excedente inyectado de ${this.formatNumber(exportSurplusKwh, 1)} kWh`;
    } else {
      differenceLabel = `Sin excedente; se importan ${this.formatNumber(importGridKwh, 1)} kWh de la red`;
    }

    return {
      peakPowerKwp,
      monthlyGenerationKwh,
      monthlyConsumptionKwh,
      coveragePct,
      selfConsumptionKwh,
      selfConsumptionPct,
      exportSurplusKwh,
      importGridKwh,
      selfConsumptionSavings,
      exportCreditSavings,
      hourlyGenerationKw,
      hourlyConsumptionKw,
      periodLabel,
      profileLabel,
      profileDescription,
      differenceLabel,
    };
  }

  /**
   * Genera el detalle hora a hora con labels formateados para gráficos o tablas.
   */
  getHourlyBreakdown(outputs: SolarCalculatorOutputs): HourlyDataPoint[] {
    return Array.from({ length: 24 }, (_, h) => {
      const gen = outputs.hourlyGenerationKw[h] ?? 0;
      const con = outputs.hourlyConsumptionKw[h] ?? 0;
      const hourStr = h.toString().padStart(2, '0') + ':00';
      return {
        hour: h,
        label: hourStr,
        generationKw: gen,
        consumptionKw: con,
        selfConsumptionKw: Math.min(gen, con),
        surplusKw: Math.max(0, gen - con),
        importKw: Math.max(0, con - gen),
      };
    });
  }

  /**
   * Genera un texto resumen amigable para copiar al portapapeles o compartir.
   */
  generateShareSummary(
    inputs: SolarCalculatorInputs,
    outputs: SolarCalculatorOutputs
  ): string {
    const loc = this.getLocation(inputs.locationKey);
    const totalSavings = outputs.selfConsumptionSavings + outputs.exportCreditSavings;

    return [
      `☀️ BALANCE SOLAR - CALCULADORA FOTOVOLTAICA`,
      `-------------------------------------------------`,
      `📍 Ubicación: ${loc.name}`,
      `📅 Período: ${outputs.periodLabel}`,
      `⚡ Perfil: ${outputs.profileLabel} (${outputs.profileDescription})`,
      ``,
      `🔧 Instalación Fotovoltaica:`,
      `- Potencia FV: ${this.formatNumber(outputs.peakPowerKwp, 2)} kWp (${inputs.panelCount} módulos de ${inputs.panelPowerWp} Wp)`,
      `- Rendimiento Global (PR): ${inputs.performanceRatio}%`,
      `- Recurso Solar (HSP): ${this.formatNumber(inputs.hsp, 2)} h/día`,
      ``,
      `📊 Balance Energético Mensual:`,
      `- Generación Solar Estimada: ${this.formatNumber(outputs.monthlyGenerationKwh, 1)} kWh`,
      `- Consumo Demandado: ${this.formatNumber(outputs.monthlyConsumptionKwh, 1)} kWh`,
      `- Autoconsumo Directo: ${this.formatNumber(outputs.selfConsumptionKwh, 1)} kWh (${this.formatNumber(outputs.selfConsumptionPct, 1)}% de la generación)`,
      `- Cobertura de Demanda: ${this.formatNumber(outputs.coveragePct, 1)}% del consumo cubierto`,
      `- Excedente Inyectado: ${this.formatNumber(outputs.exportSurplusKwh, 1)} kWh`,
      `- Importación de Red: ${this.formatNumber(outputs.importGridKwh, 1)} kWh`,
      ``,
      `💰 Estimación Económica Mensual:`,
      `- Ahorro por Autoconsumo: ${this.formatCurrency(outputs.selfConsumptionSavings)}`,
      `- Crédito por Inyección: ${this.formatCurrency(outputs.exportCreditSavings)}`,
      `- Beneficio Económico Total: ${this.formatCurrency(totalSavings)}/mes`,
      `-------------------------------------------------`,
      `Simulación generada en la Calculadora Solar Interactiva.`
    ].join('\n');
  }

  /**
   * Formatea un número según las convenciones locales (ej: 1.234,5).
   */
  formatNumber(value: number, digits: number = 1): string {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return Number(value).toLocaleString('es-AR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  /**
   * Formatea un valor monetario en Pesos Argentinos (ARS) sin decimales innecesarios.
   */
  formatCurrency(value: number): string {
    if (value === undefined || value === null || isNaN(value)) return '$ 0';
    return '$ ' + Math.round(value).toLocaleString('es-AR');
  }
}
