export type SolarLocationKey = 'laplata' | 'caba' | 'mardel' | 'bahia' | 'junin';

export interface SolarLocation {
  key: SolarLocationKey;
  name: string;
  monthlyHsp: number[];
}

export interface MonthData {
  name: string;
  days: number;
}

export type HourlyProfileType = 'home' | 'business' | 'custom';

export interface SolarCalculatorInputs {
  panelPowerWp: number; // default 500 Wp
  panelCount: number; // default 10
  performanceRatio: number; // default 80 (80%)
  locationKey: SolarLocationKey; // default 'laplata'
  monthIndex: number; // default 7 (Agosto)
  hsp: number; // default autocompleted from location and month
  monthlyConsumptionKwh: number; // default 620 kWh
  profileType: HourlyProfileType; // default 'home'
  customHourlyWeights?: number[]; // 24 numbers
  buyPricePerKwh: number; // default 150 $/kWh
  exportPricePerKwh: number; // default 70 $/kWh
}

export interface SolarCalculatorOutputs {
  peakPowerKwp: number; // kWp
  monthlyGenerationKwh: number; // kWh
  monthlyConsumptionKwh: number; // kWh
  coveragePct: number; // % (self / useM * 100)
  selfConsumptionKwh: number; // kWh
  selfConsumptionPct: number; // % (self / genM * 100)
  exportSurplusKwh: number; // kWh
  importGridKwh: number; // kWh
  selfConsumptionSavings: number; // $
  exportCreditSavings: number; // $
  hourlyGenerationKw: number[]; // 24 items in kW
  hourlyConsumptionKw: number[]; // 24 items in kW
  periodLabel: string; // ej: "durante Agosto (31 días)"
  profileLabel: string; // 'Residencial', 'Comercial', 'Personalizado'
  profileDescription: string;
  differenceLabel: string; // "Excedente; se importan X kWh"
}

export interface HourlyDataPoint {
  hour: number;
  label: string; // "00:00", "01:00", etc.
  generationKw: number;
  consumptionKw: number;
  selfConsumptionKw: number;
  surplusKw: number;
  importKw: number;
}

export const DEFAULT_SOLAR_INPUTS: SolarCalculatorInputs = {
  panelPowerWp: 500,
  panelCount: 10,
  performanceRatio: 80,
  locationKey: 'laplata',
  monthIndex: 7, // Agosto
  hsp: 3.20,
  monthlyConsumptionKwh: 620,
  profileType: 'home',
  buyPricePerKwh: 150,
  exportPricePerKwh: 70,
};
