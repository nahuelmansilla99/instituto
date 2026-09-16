// Test de verificación matemática para la Calculadora Solar

const SOLAR_LOCATIONS = {
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

const SOLAR_MONTHS = [
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

const DEFAULT_HOURLY_PROFILES = {
  home: [
    0.32, 0.25, 0.21, 0.19, 0.18, 0.25, 0.75, 1.25, 1.05, 0.58, 0.46, 0.42,
    0.48, 0.44, 0.42, 0.48, 0.62, 1.05, 1.55, 1.88, 2.05, 1.72, 1.10, 0.58,
  ],
  business: [
    0.15, 0.12, 0.11, 0.10, 0.10, 0.12, 0.22, 0.55, 1.35, 1.85, 2.05, 2.15,
    2.25, 2.20, 2.18, 2.10, 1.92, 1.65, 0.88, 0.40, 0.24, 0.19, 0.17, 0.16,
  ],
};

function sunShape(hsp) {
  const center = 12.5;
  const len = Math.max(8, Math.min(15, 9.2 + hsp * 0.75));
  return Array.from({ length: 24 }, (_, h) => {
    const x = (h - (center - len / 2)) / len;
    return x > 0 && x < 1 ? Math.pow(Math.sin(Math.PI * x), 1.55) : 0;
  });
}

function normalizeCurve(weights, totalDaily) {
  const sum = weights.reduce((acc, v) => acc + (v > 0 ? v : 0), 0);
  if (sum <= 0) return new Array(weights.length).fill(0);
  return weights.map((w) => (Math.max(0, w) / sum) * totalDaily);
}

function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString('es-AR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatCurrency(value) {
  return '$ ' + Math.round(value).toLocaleString('es-AR');
}

function calculate(inputs) {
  const month = SOLAR_MONTHS[inputs.monthIndex];
  const days = month.days;

  const peakPowerKwp = (inputs.panelPowerWp * inputs.panelCount) / 1000;
  const prFactor = inputs.performanceRatio / 100;
  const dailyGenerationKwh = peakPowerKwp * inputs.hsp * prFactor;
  const monthlyGenerationKwh = dailyGenerationKwh * days;

  const monthlyConsumptionKwh = inputs.monthlyConsumptionKwh;
  const dailyConsumptionKwh = monthlyConsumptionKwh / days;

  const sunWeights = sunShape(inputs.hsp);
  const hourlyGenerationKw = normalizeCurve(sunWeights, dailyGenerationKwh);

  const rawWeights =
    inputs.profileType === 'business'
      ? DEFAULT_HOURLY_PROFILES.business
      : DEFAULT_HOURLY_PROFILES.home;
  const hourlyConsumptionKw = normalizeCurve(rawWeights, dailyConsumptionKwh);

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

  const coveragePct = (selfConsumptionKwh / monthlyConsumptionKwh) * 100;
  const selfConsumptionPct = (selfConsumptionKwh / monthlyGenerationKwh) * 100;

  const selfConsumptionSavings = selfConsumptionKwh * inputs.buyPricePerKwh;
  const exportCreditSavings = exportSurplusKwh * inputs.exportPricePerKwh;

  const periodLabel = `durante ${month.name} (${days} días)`;

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
  };
}

console.log('=== TEST DE MOTOR MATEMÁTICO DE CALCULADORA SOLAR ===\n');

const defaultInputs = {
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

const res = calculate(defaultInputs);

console.log(`Localidad: La Plata (Agosto, HSP = ${defaultInputs.hsp})`);
console.log(`Potencia Pico: ${res.peakPowerKwp} kWp (${defaultInputs.panelCount} paneles de ${defaultInputs.panelPowerWp} Wp)`);
console.log(`Generación Mensual: ${res.monthlyGenerationKwh.toFixed(2)} kWh`);
console.log(`Consumo Mensual: ${res.monthlyConsumptionKwh.toFixed(2)} kWh`);
console.log(`Autoconsumo Directo: ${res.selfConsumptionKwh.toFixed(2)} kWh (${res.selfConsumptionPct.toFixed(1)}% de la gen.)`);
console.log(`Cobertura de Demanda: ${res.coveragePct.toFixed(1)}%`);
console.log(`Excedente Inyectado: ${res.exportSurplusKwh.toFixed(2)} kWh`);
console.log(`Importación de Red: ${res.importGridKwh.toFixed(2)} kWh`);
console.log(`Ahorro Autoconsumo: ${formatCurrency(res.selfConsumptionSavings)}`);
console.log(`Crédito por Excedente: ${formatCurrency(res.exportCreditSavings)}`);
console.log(`Beneficio Total Estimado: ${formatCurrency(res.selfConsumptionSavings + res.exportCreditSavings)}/mes`);

// Verificación de conservación de la energía
const diffGen = Math.abs(res.selfConsumptionKwh + res.exportSurplusKwh - res.monthlyGenerationKwh);
const diffCon = Math.abs(res.selfConsumptionKwh + res.importGridKwh - res.monthlyConsumptionKwh);

console.log('\n--- Verificaciones de Integridad Energética ---');
console.log(`Autoconsumo + Excedente = Generación FV: error = ${diffGen.toExponential(4)} -> ${diffGen < 1e-6 ? 'PASS ✅' : 'FAIL ❌'}`);
console.log(`Autoconsumo + Importación = Consumo: error = ${diffCon.toExponential(4)} -> ${diffCon < 1e-6 ? 'PASS ✅' : 'FAIL ❌'}`);

// Verificación de la curva horaria
const genHourlySum = res.hourlyGenerationKw.reduce((a, b) => a + b, 0);
const conHourlySum = res.hourlyConsumptionKw.reduce((a, b) => a + b, 0);
const expectedDailyGen = res.monthlyGenerationKwh / 31;
const expectedDailyCon = res.monthlyConsumptionKwh / 31;

console.log(`Suma horaria Generación = ${genHourlySum.toFixed(4)} kWh/día (Esperado: ${expectedDailyGen.toFixed(4)}) -> ${Math.abs(genHourlySum - expectedDailyGen) < 1e-6 ? 'PASS ✅' : 'FAIL ❌'}`);
console.log(`Suma horaria Consumo = ${conHourlySum.toFixed(4)} kWh/día (Esperado: ${expectedDailyCon.toFixed(4)}) -> ${Math.abs(conHourlySum - expectedDailyCon) < 1e-6 ? 'PASS ✅' : 'FAIL ❌'}`);

console.log('\n--- Perfil Comercial ---');
const comRes = calculate({ ...defaultInputs, profileType: 'business' });
console.log(`Autoconsumo Comercial: ${comRes.selfConsumptionKwh.toFixed(2)} kWh (${comRes.selfConsumptionPct.toFixed(1)}% de gen.)`);
console.log(`Cobertura Comercial: ${comRes.coveragePct.toFixed(1)}%`);
console.log(`Excedente Comercial: ${comRes.exportSurplusKwh.toFixed(2)} kWh`);
console.log(`Importación Comercial: ${comRes.importGridKwh.toFixed(2)} kWh`);

console.log('\n=== FIN DE PRUEBAS ===');
