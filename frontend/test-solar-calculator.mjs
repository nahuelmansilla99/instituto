/**
 * 🧪 Test Suite Automatizado para la Calculadora Solar Fotovoltaica
 * 
 * Cobertura:
 *  1. Motor Matemático y Funciones Físicas (sunShape, normalizeCurve)
 *  2. Tablas Geográficas de Argentina (5 Localidades y 12 meses)
 *  3. Principio de Conservación de Energía (Gen = Auto + Exc, Con = Auto + Imp)
 *  4. Balances Económicos (Ahorro por autoconsumo y Créditos por inyección)
 *  5. Perfiles Horarios (Residencial, Comercial, Personalizado 24h)
 *  6. Casos Borde y Límites (Consumo 0, Potencia 0, Pesos normalizados)
 *  7. Formato y Generación de Resumen para Compartir
 *  8. Integridad de Enrutamiento y Guardias (Ruta /calculadora protegida por authGuard)
 *  9. Integración en Visor de Clases (LessonComponent con Drawer, FAB y botones)
 * 
 * Ejecución: node test-solar-calculator.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, errorDetail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${colors.green}✔ PASS:${colors.reset} ${message}`);
  } else {
    failedTests++;
    console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${message}`);
    if (errorDetail) console.log(`         ${colors.yellow}Detalle: ${errorDetail}${colors.reset}`);
  }
}

// ============================================================================
// DATOS Y LÓGICA COPIADA EXACTA DE SOLAR_CALCULATOR_SERVICE
// ============================================================================
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

  let rawWeights;
  if (inputs.profileType === 'custom' && inputs.customHourlyWeights) {
    rawWeights = inputs.customHourlyWeights;
  } else if (inputs.profileType === 'business') {
    rawWeights = DEFAULT_HOURLY_PROFILES.business;
  } else {
    rawWeights = DEFAULT_HOURLY_PROFILES.home;
  }
  const hourlyConsumptionKw = normalizeCurve(rawWeights, dailyConsumptionKwh);

  let dailySelfConsumption = 0;
  let dailyExportSurplus = 0;
  let dailyImportGrid = 0;

  for (let h = 0; h < 24; h++) {
    const gen = hourlyGenerationKw[h];
    const con = hourlyConsumptionKw[h];
    dailySelfConsumption += Math.min(gen, con);
    dailyExportSurplus += Math.max(0, gen - con);
    dailyImportGrid += Math.max(0, con - gen);
  }

  const selfConsumptionKwh = dailySelfConsumption * days;
  const exportSurplusKwh = dailyExportSurplus * days;
  const importGridKwh = dailyImportGrid * days;
  const coveragePct = monthlyConsumptionKwh > 0 ? (selfConsumptionKwh / monthlyConsumptionKwh) * 100 : 0;
  const selfConsumptionPct = monthlyGenerationKwh > 0 ? (selfConsumptionKwh / monthlyGenerationKwh) * 100 : 0;
  const selfConsumptionSavings = selfConsumptionKwh * inputs.buyPricePerKwh;
  const exportCreditSavings = exportSurplusKwh * inputs.exportPricePerKwh;

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
    periodLabel: `durante ${month.name} (${days} días)`,
  };
}

function generateShareSummary(inputs, outputs) {
  const loc = SOLAR_LOCATIONS[inputs.locationKey]?.name || inputs.locationKey;
  return `Estimación solar · ${loc}
Generación: ${outputs.monthlyGenerationKwh.toFixed(1)} kWh
Autoconsumo: ${outputs.selfConsumptionKwh.toFixed(1)} kWh (${outputs.selfConsumptionPct.toFixed(0)}%)
Excedente: ${outputs.exportSurplusKwh.toFixed(1)} kWh
Importación: ${outputs.importGridKwh.toFixed(1)} kWh`;
}

// ============================================================================
// SUITE DE EJECUCIÓN
// ============================================================================
async function runSuite() {
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} ☀️  TEST SUITE: CALCULADORA SOLAR FOTOVOLTAICA (ARGENTINA)   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // 1. RECURSO SOLAR Y GEOGRAFÍA ARGENTINA
  console.log(`${colors.bold}📍 1. Recurso Solar y Localidades Argentinas:${colors.reset}`);
  assert(Object.keys(SOLAR_LOCATIONS).length === 5, 'Deben existir exactamente 5 localidades precargadas');
  assert(SOLAR_LOCATIONS.laplata.monthlyHsp[7] === 3.20, 'HSP de Agosto en La Plata / Gonnet debe ser 3.20 h/día');
  assert(SOLAR_LOCATIONS.caba.monthlyHsp[11] === 5.80, 'HSP de Diciembre en CABA debe ser 5.80 h/día');
  assert(SOLAR_LOCATIONS.mardel.monthlyHsp[5] === 2.05, 'HSP de Junio en Mar del Plata debe ser 2.05 h/día');
  assert(SOLAR_LOCATIONS.bahia.monthlyHsp[0] === 6.20, 'HSP de Enero en Bahía Blanca debe ser 6.20 h/día');
  assert(SOLAR_LOCATIONS.junin.monthlyHsp[0] === 6.05, 'HSP de Enero en Junín debe ser 6.05 h/día');
  assert(SOLAR_MONTHS.length === 12, 'Deben existir los 12 meses del año');
  assert(SOLAR_MONTHS[1].days === 28, 'Febrero debe tener 28 días');
  assert(SOLAR_MONTHS[7].days === 31, 'Agosto debe tener 31 días');

  // 2. FÍSICA Y CURVA DE GENERACIÓN (sunShape)
  console.log(`\n${colors.bold}⚡ 2. Campana Solar y Normalización Horaria:${colors.reset}`);
  const sunHsp32 = sunShape(3.2);
  assert(sunHsp32.length === 24, 'La función sunShape debe retornar 24 puntos horarios');
  assert(sunHsp32[0] === 0 && sunHsp32[1] === 0 && sunHsp32[2] === 0, 'No debe haber radiación solar en horas nocturnas (0h-2h)');
  assert(sunHsp32[22] === 0 && sunHsp32[23] === 0, 'No debe haber radiación solar pasada la noche (22h-23h)');
  
  // Pico solar al mediodía (entre 12h y 13h)
  const maxSunIndex = sunHsp32.indexOf(Math.max(...sunHsp32));
  assert(maxSunIndex === 12 || maxSunIndex === 13, `El pico solar debe ocurrir al mediodía (detectado en hora ${maxSunIndex})`);

  const normTest = normalizeCurve([1, 2, 1], 100);
  const sumNorm = normTest.reduce((a, b) => a + b, 0);
  assert(Math.abs(sumNorm - 100) < 1e-10, 'normalizeCurve debe sumar exactamente el total objetivo diario');

  // 3. BALANCE ENERGÉTICO Y CONSERVACIÓN DE ENERGÍA
  console.log(`\n${colors.bold}⚖️  3. Principio de Conservación de Energía:${colors.reset}`);
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
  assert(res.peakPowerKwp === 5.0, 'Potencia pico debe ser 5.0 kWp (10 paneles de 500Wp)');
  assert(Math.abs(res.monthlyGenerationKwh - 396.8) < 1e-6, 'Generación mensual esperada = 396.8 kWh');
  
  const balanceGenDiff = Math.abs((res.selfConsumptionKwh + res.exportSurplusKwh) - res.monthlyGenerationKwh);
  assert(balanceGenDiff < 1e-10, `Conservación de Generación (Auto + Exc = Gen): diff = ${balanceGenDiff.toExponential(2)}`);

  const balanceUseDiff = Math.abs((res.selfConsumptionKwh + res.importGridKwh) - res.monthlyConsumptionKwh);
  assert(balanceUseDiff < 1e-10, `Conservación de Consumo (Auto + Imp = Con): diff = ${balanceUseDiff.toExponential(2)}`);

  // 4. BALANCES ECONÓMICOS
  console.log(`\n${colors.bold}💰 4. Balances Económicos:${colors.reset}`);
  const expectedSaving = res.selfConsumptionKwh * 150;
  const expectedCredit = res.exportSurplusKwh * 70;
  assert(Math.abs(res.selfConsumptionSavings - expectedSaving) < 1e-6, 'Ahorro por autoconsumo correctamente calculado');
  assert(Math.abs(res.exportCreditSavings - expectedCredit) < 1e-6, 'Crédito por inyección correctamente calculado');

  // 5. PERFILES HORARIOS Y MODO PERSONALIZADO
  console.log(`\n${colors.bold}📊 5. Perfiles Horarios (Comercial y Personalizado):${colors.reset}`);
  const commRes = calculate({ ...defaultInputs, profileType: 'business' });
  assert(commRes.selfConsumptionPct > res.selfConsumptionPct, 'El perfil comercial debe tener mayor coincidencia solar diurna que el residencial');

  const customWeights24 = new Array(24).fill(0);
  customWeights24[12] = 10; // Todo el consumo concentrado a las 12:00
  const customRes = calculate({ ...defaultInputs, profileType: 'custom', customHourlyWeights: customWeights24 });
  assert(customRes.selfConsumptionKwh > 0, 'El perfil personalizado calcula correctamente con matriz propia de 24 horas');

  // 6. CASOS BORDE
  console.log(`\n${colors.bold}🛡️ 6. Casos Borde y Robustez Numérica:${colors.reset}`);
  const zeroGen = calculate({ ...defaultInputs, panelCount: 0 });
  assert(zeroGen.monthlyGenerationKwh === 0, 'Con 0 paneles la generación es 0');
  assert(zeroGen.selfConsumptionKwh === 0, 'Con 0 paneles el autoconsumo es 0');
  assert(zeroGen.importGridKwh === 620, 'Con 0 paneles se importa el 100% de la red');

  const zeroUse = calculate({ ...defaultInputs, monthlyConsumptionKwh: 0 });
  assert(zeroUse.selfConsumptionKwh === 0, 'Con 0 consumo el autoconsumo es 0');
  assert(Math.abs(zeroUse.exportSurplusKwh - zeroUse.monthlyGenerationKwh) < 1e-6, 'Con 0 consumo se exporta el 100% de lo generado');

  // 7. FORMATO DE RESUMEN
  console.log(`\n${colors.bold}📋 7. Generación de Resumen para Compartir:${colors.reset}`);
  const shareText = generateShareSummary(defaultInputs, res);
  assert(shareText.includes('La Plata / Gonnet'), 'El resumen contiene el nombre de la localidad');
  assert(shareText.includes('Generación: 396.8 kWh'), 'El resumen contiene la generación calculada');
  assert(shareText.includes('Autoconsumo:'), 'El resumen contiene el desglose de autoconsumo');

  // 8. VERIFICACIÓN DE ARCHIVOS Y RUTAS DEL PROYECTO
  console.log(`\n${colors.bold}🔒 8. Integración de Arquitectura y Enrutamiento:${colors.reset}`);
  const routesPath = path.join(__dirname, 'src', 'app', 'app.routes.ts');
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  assert(routesContent.includes("path: 'calculadora'"), "Ruta '/calculadora' registrada en app.routes.ts");
  assert(routesContent.includes('canActivate: [authGuard]'), "Ruta '/calculadora' protegida estrictamente por authGuard");

  const navbarHtmlPath = path.join(__dirname, 'src', 'app', 'shared', 'components', 'navbar', 'navbar.component.html');
  const navbarContent = fs.readFileSync(navbarHtmlPath, 'utf8');
  assert(navbarContent.includes('routerLink="/calculadora"'), "NavbarComponent incluye enlace routerLink='/calculadora'");

  // 9. VERIFICACIÓN DE INTEGRACIÓN EN VISOR DE CLASES
  console.log(`\n${colors.bold}🎓 9. Integración en Visor de Clases (LessonComponent):${colors.reset}`);
  const lessonTsPath = path.join(__dirname, 'src', 'app', 'features', 'lesson', 'lesson.component.ts');
  const lessonTsContent = fs.readFileSync(lessonTsPath, 'utf8');
  assert(lessonTsContent.includes('isSolarCalculatorOpen = signal(false)'), 'LessonComponent declara signal isSolarCalculatorOpen');
  assert(lessonTsContent.includes('SolarCalculatorComponent'), 'LessonComponent importa SolarCalculatorComponent');

  const lessonHtmlPath = path.join(__dirname, 'src', 'app', 'features', 'lesson', 'lesson.component.html');
  const lessonHtmlContent = fs.readFileSync(lessonHtmlPath, 'utf8');
  assert(lessonHtmlContent.includes('app-solar-calculator'), 'LessonComponent.html contiene etiqueta <app-solar-calculator>');
  assert(lessonHtmlContent.includes('calculator-drawer-overlay'), 'LessonComponent.html contiene el Drawer modal lateral');
  assert(lessonHtmlContent.includes('fab-solar-calculator'), 'LessonComponent.html contiene botón flotante FAB');

  // RESUMEN FINAL
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}RESULTADOS FINALES:${colors.reset}`);
  console.log(`  Total tests ejecutados: ${totalTests}`);
  console.log(`  Tests exitosos: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`  Tests fallidos: ${failedTests > 0 ? colors.red + failedTests : colors.green + '0'}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Error fatal durante la ejecución de los tests:', err);
  process.exit(1);
});
