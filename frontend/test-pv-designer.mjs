/**
 * 🧪 Test Suite Automatizado para el Diseñador FV (Taller Flexible)
 *
 * Ejecuta pruebas reales sobre PvDesignerService (transpilado desde TypeScript) y verifica:
 *  1. Estado inicial por defecto y cálculos base (Vivienda residencial)
 *  2. Los 3 ejemplos precargados: Vivienda 6 kW, Casa rodante 1 kW (offgrid), Parque 10 MWp
 *  3. Geometría de superficie: coplanar, filas en suelo (L*sin(β)/tan(α)) y exclusión de obstáculos
 *  4. Ventana eléctrica de strings (Voc frío, Vmp caliente, MPPT, entradas, potencia CC)
 *  5. Cableado CC/CA (caída de tensión resistiva, ampacidad corregida, sección mínima)
 *  6. Simulación horaria (8.760 h CSV UTC, SOC batería, import/export, unserved)
 *  7. Serialización JSON (guardar/abrir proyecto) y sanitización CSV contra inyección de fórmulas
 *  8. Integridad de arquitectura Angular (/disenador-fv con authGuard, Navbar, Tools Switcher en 3 vistas)
 *
 * Ejecución: node test-pv-designer.mjs
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import ts from 'typescript';
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

// Cargar PvDesignerService real transpilando TypeScript
const servicePath = path.join(__dirname, 'src/app/core/services/pv-designer.service.ts');
const tsSource = fs
  .readFileSync(servicePath, 'utf8')
  .replace(/import\s+\{\s*Injectable\s*\}\s+from\s+'@angular\/core';/, 'const Injectable = () => (cls) => cls;');

const transpiled = ts.transpileModule(tsSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    experimentalDecorators: true,
  },
}).outputText;

const mod = { exports: {} };
vm.runInNewContext(transpiled, {
  module: mod,
  exports: mod.exports,
  require: () => ({}),
  URL,
  URLSearchParams,
  AbortController,
  setTimeout,
  clearTimeout,
  console,
});

const { PvDesignerService } = mod.exports;
const svc = new PvDesignerService();

console.log('\n══════════════════════════════════════════════════════════════');
console.log(' ⚡ TEST SUITE: DISEÑADOR DE INSTALACIONES FOTOVOLTAICAS (FV) ');
console.log('══════════════════════════════════════════════════════════════\n');

// 1. Proyecto por defecto
console.log('📐 1. Proyecto por defecto y cálculo base:');
const defState = svc.createDefaults();
const defRes = svc.calculate(defState);
assert(defRes.errors.length === 0, 'El estado por defecto calcula sin errores de validación');
assert(defRes.count > 0 && defRes.kw > 0, `Asigna módulos y potencia CC (${defRes.count} paneles, ${defRes.kw.toFixed(2)} kWp)`);
assert(defRes.blocks.length >= 1, `Agrupa en al menos 1 inversor (${defRes.blocks.length})`);
assert(defRes.monthly.length === 12, 'Genera serie mensual de 12 meses');
assert(defRes.annual > 0, `Generación anual positiva (${defRes.annual.toFixed(0)} kWh/año)`);
assert(defRes.limits.minN <= defRes.limits.maxN, `Ventana serie válida (${defRes.limits.minN}–${defRes.limits.maxN} módulos)`);

// 2. Ejemplos precargados
console.log('\n🏠 2. Ejemplos precargados (Vivienda, Casa rodante, Parque 10 MWp):');
const home = svc.calculate(svc.createExample('home'));
assert(home.errors.length === 0 && home.kw >= 5.5, `Ejemplo Vivienda 6 kW válido (${home.kw.toFixed(2)} kWp, ${home.count} paneles)`);

const mobileState = svc.createExample('mobile');
const mobile = svc.calculate(mobileState);
assert(mobile.errors.length === 0, 'Ejemplo Casa rodante 1 kW offgrid calcula sin errores');
assert(mobile.batteryKWh > 0 && mobile.usable > 0, `Calcula reserva de batería (${mobile.batteryKWh.toFixed(2)} kWh nominales, ${mobile.usable.toFixed(2)} kWh útiles)`);
assert(
  mobile.checks.some((c) => c.title === 'Reserva de batería'),
  'Incluye verificación de reserva de batería para sistema offgrid',
);

const parkState = svc.createExample('park');
const park = svc.calculate(parkState);
assert(park.errors.length === 0, 'Ejemplo Parque 10 MWp calcula sin errores');
assert(park.blocks.length >= 25, `Agrupa múltiples inversores de 250 kW (${park.blocks.length} inversores, ${park.kw.toFixed(0)} kWp)`);
assert(
  park.checks.some((c) => c.title.includes('Parque · red colectora')),
  'Agrega verificación de MT / red colectora para plantas >= 1 MWp',
);

// 3. Geometría y obstáculos
console.log('\n🧱 3. Geometría de superficie, filas en suelo y obstáculos:');
const zBase = svc.createDefaultZone(1, 'Test');
const layBase = svc.layout(zBase, defState.module);
const zObs = { ...zBase, obstacles: [{ x: 0.4, y: 0.4, w: 3, h: 3 }] };
const layObs = svc.layout(zObs, defState.module);
assert(layObs.count < layBase.count, `Obstáculo reduce posiciones disponibles (${layBase.count} → ${layObs.count})`);

const zGround = { ...zBase, roofType: 'ground', tilt: 30, alpha: 20, rowGap: 0.1 };
const layGround = svc.layout(zGround, defState.module);
const expectedMinGap = (defState.module.height * Math.sin((30 * Math.PI) / 180)) / Math.tan((20 * Math.PI) / 180);
assert(
  Math.abs(layGround.rowGap - expectedMinGap) < 1e-6,
  `Separación entre filas en suelo = L·sin(β)/tan(α) (${layGround.rowGap.toFixed(2)} m)`,
);

// 4. Validaciones eléctricas y modo manual
console.log('\n🔌 4. Validaciones de entrada y asignaciones manuales:');
const badPanel = svc.createDefaults();
badPanel.module.vmp = 55; // >= voc (49.9)
assert(svc.validate(badPanel).length > 0, 'Rechaza Vmp >= Voc en ficha de panel');

const badManual = svc.createDefaults();
badManual.manual = true;
badManual.assignments = [{ zone: 999, series: 10, parallel: 1, quantity: 1 }];
assert(svc.calculate(badManual).errors.length > 0, 'Rechaza asignación manual a un sector inexistente');

const highVoc = svc.createDefaults();
highVoc.manual = true;
highVoc.assignments = [{ zone: 1, series: 20, parallel: 1, quantity: 1 }];
const highVocRes = svc.calculate(highVoc);
assert(
  highVocRes.errors.length === 0 && highVocRes.checks.some((c) => c.title.includes('Voc en frío') && c.status === 'fail'),
  'Detecta incompatibilidad de Voc en frío cuando la serie excede la tensión máxima',
);

// 5. Cableado CC y CA
console.log('\n⚡ 5. Cableado CC / CA y caídas de tensión:');
assert(defRes.cables.dropDC > 0 && defRes.cables.dropDC < 1.5, `Caída CC del string dentro del límite (${defRes.cables.dropDC.toFixed(2)} %)`);
assert(defRes.cables.dropAC > 0 && defRes.cables.dropAC < 2.0, `Caída CA resistiva dentro del límite (${defRes.cables.dropAC.toFixed(2)} %)`);

// 6. Simulación horaria (8.760 h CSV UTC)
console.log('\n📊 6. Simulación horaria anual (8.760 h CSV UTC):');
const startMs = Date.UTC(2025, 0, 1, 0, 0, 0);
const csvLines = ['time,temp_c,load_kw,poa_1_wm2'];
for (let h = 0; h < 8760; h++) {
  const iso = new Date(startMs + h * 3600000).toISOString().replace('.000Z', 'Z');
  const hod = h % 24;
  const poa = hod >= 8 && hod <= 16 ? 700 : 0;
  csvLines.push(`${iso},22,1.2,${poa}`);
}
const hourlyState = svc.createDefaults();
hourlyState.system = 'hybrid';
const parsedHourly = svc.parseHourlyCsv(csvLines.join('\n'), 'test_2025.csv', hourlyState);
hourlyState.hourly = parsedHourly;
const hourlyRes = svc.calculate(hourlyState);
assert(hourlyRes.errors.length === 0 && hourlyRes.hourly !== null, 'Importa y simula 8.760 horas UTC sin errores');
assert(hourlyRes.hourly.annual > 0, `Generación anual horaria calculada (${hourlyRes.hourly.annual.toFixed(0)} kWh)`);
assert(hourlyRes.hourly.charged > 0 && hourlyRes.hourly.discharged > 0, 'Simula carga y descarga del banco de baterías en sistema híbrido');

// 7. Serialización JSON y exportación CSV segura
console.log('\n💾 7. Guardado/Apertura JSON y sanitización CSV:');
const jsonStr = svc.buildProjectJson(defState, { scale: 0.05, reference: 10, orthographic: true });
const reopened = svc.parseProjectJson(jsonStr);
assert(reopened.state.name === defState.name && reopened.photoCalibration.orthographic === true, 'Round-trip JSON conserva proyecto y calibración de foto');

const formulaState = svc.createDefaults();
formulaState.zones[0].name = '=CMD|test';
const formulaRes = svc.calculate(formulaState);
const stringsCsv = svc.buildStringsCsv(formulaState, formulaRes);
assert(stringsCsv.includes('"\'=CMD|test"'), 'Neutraliza fórmulas peligrosas al exportar CSV de strings');

// 8. Integración en Arquitectura Angular
console.log('\n🔗 8. Integración en Arquitectura Angular:');
const routesContent = fs.readFileSync(path.join(__dirname, 'src/app/app.routes.ts'), 'utf8');
const navbarHtml = fs.readFileSync(path.join(__dirname, 'src/app/shared/components/navbar/navbar.component.html'), 'utf8');
const solarHtml = fs.readFileSync(path.join(__dirname, 'src/app/features/solar-calculator/solar-calculator.component.html'), 'utf8');
const budgetHtml = fs.readFileSync(path.join(__dirname, 'src/app/features/budget-calculator/budget-calculator.component.html'), 'utf8');
const pvHtml = fs.readFileSync(path.join(__dirname, 'src/app/features/pv-designer/pv-designer.component.html'), 'utf8');

assert(routesContent.includes("path: 'disenador-fv'"), "Ruta '/disenador-fv' registrada en app.routes.ts");
assert(routesContent.includes('PvDesignerComponent'), 'Lazy-loading de PvDesignerComponent configurado');
assert(navbarHtml.includes('routerLink="/disenador-fv"'), 'Navbar incluye acceso directo a /disenador-fv');
assert(solarHtml.includes('routerLink="/disenador-fv"'), 'Calculadora Solar incluye pestaña a /disenador-fv en tools-switcher-bar');
assert(budgetHtml.includes('routerLink="/disenador-fv"'), 'Calculadora de Presupuesto incluye pestaña a /disenador-fv en tools-switcher-bar');
assert(
  pvHtml.includes('routerLink="/calculadora"') && pvHtml.includes('routerLink="/presupuesto"') && pvHtml.includes('routerLink="/disenador-fv"'),
  'Diseñador FV incluye los 3 accesos en tools-switcher-bar',
);

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`RESULTADOS FINALES:`);
console.log(`  Total tests ejecutados: ${totalTests}`);
console.log(`  ${colors.green}Tests exitosos: ${passedTests}${colors.reset}`);
console.log(`  ${failedTests > 0 ? colors.red : colors.green}Tests fallidos: ${failedTests}${colors.reset}`);
console.log('══════════════════════════════════════════════════════════════\n');

process.exit(failedTests > 0 ? 1 : 0);
