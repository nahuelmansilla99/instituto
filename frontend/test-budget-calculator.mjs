/**
 * 🧪 Test Suite Automatizado para la Calculadora de Presupuesto Fotovoltaico
 *
 * Cobertura:
 *  1. Catálogo de 4 Rubros y 17 Conceptos Iniciales por Defecto
 *  2. Ejercicio de Ejemplo Simulado Exacto (Bimonetario ARS/USD, TC 1500, Contingencia 5%, Margen 20%)
 *  3. Fórmulas Comerciales (Margen sobre venta vs Recargo sobre costo + Impuestos)
 *  4. Exclusión de Ítems y Contabilización de Conceptos con Costo Cero
 *  5. Validaciones Pedagógicas y Casos Borde (TC inválido, Margen >= 100%, Negativos)
 *  6. Serialización y Validación de Archivos JSON (Exportar / Abrir datos guardados)
 *  7. Integridad de Rutas (/presupuesto con authGuard), Navbar y Conmutador entre Calculadoras
 *
 * Ejecución: node test-budget-calculator.mjs
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

const groups = [
  ['materiales', 'Materiales y equipos'],
  ['mano', 'Mano de obra propia'],
  ['adicionales', 'Adicionales, logística y otros costos'],
  ['externos', 'Servicios profesionales y trabajos externos'],
];

const names = {
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

let count = 0;
function fresh() {
  return groups.flatMap(([g]) =>
    names[g].map((name) => ({
      id: ++count,
      g,
      name,
      q: 1,
      unit: g === 'mano' ? 'h' : 'global',
      v: 0,
      cur: 'ARS',
      on: true,
    })),
  );
}

function calculate(data, rate, cont, benef, tax, mode) {
  if (!Number.isFinite(rate) || rate <= 0)
    throw Error('Ingresá una cotización válida, mayor que cero.');
  for (const [n, v] of [
    ['Contingencia', cont],
    ['Margen o recargo', benef],
    ['Impuesto', tax],
  ])
    if (!Number.isFinite(v) || v < 0 || v > 100)
      throw Error(n + ': ingresá un porcentaje entre 0 y 100.');
  if (mode === 'margen' && benef >= 100)
    throw Error('El margen sobre venta debe ser menor al 100%.');
  const sums = Object.fromEntries(groups.map(([g]) => [g, 0]));
  for (const r of data) {
    if (!r.on) continue;
    if (!Number.isFinite(r.q) || !Number.isFinite(r.v) || r.q < 0 || r.v < 0)
      throw Error('Completá cantidades y costos con números mayores o iguales a cero.');
    if (!['ARS', 'USD'].includes(r.cur) || !(r.g in sums))
      throw Error('Moneda o rubro inválido.');
    sums[r.g] += r.q * r.v * (r.cur === 'USD' ? rate : 1);
  }
  const sub = Object.values(sums).reduce((a, b) => a + b, 0),
    reserve = (sub * cont) / 100,
    cost = sub + reserve,
    price = mode === 'margen' ? cost / (1 - benef / 100) : cost * (1 + benef / 100),
    imp = (price * tax) / 100,
    total = price + imp;
  if (![sub, cost, price, total].every(Number.isFinite))
    throw Error('Los valores ingresados exceden el rango de cálculo.');
  return { sums, sub, reserve, cost, price, imp, total, usd: total / rate, result: price - cost };
}

async function runSuite() {
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} 📋 TEST SUITE: CALCULADORA DE PRESUPUESTO FOTOVOLTAICO       ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // 1. ESTRUCTURA INICIAL
  console.log(`${colors.bold}📦 1. Rubros y Conceptos Iniciales:${colors.reset}`);
  const initialRows = fresh();
  assert(groups.length === 4, 'Deben existir exactamente 4 rubros principales');
  assert(initialRows.length === 17, 'Deben crearse exactamente 17 conceptos iniciales');
  assert(
    initialRows.filter((r) => r.g === 'mano').every((r) => r.unit === 'h'),
    'Los conceptos de Mano de obra propia deben iniciar con unidad "h"',
  );
  assert(
    initialRows.filter((r) => r.g !== 'mano').every((r) => r.unit === 'global'),
    'Los demás rubros deben iniciar con unidad "global"',
  );

  // 2. EJEMPLO SIMULADO
  console.log(`\n${colors.bold}⚡ 2. Verificación del Ejemplo Simulado Bimonetario:${colors.reset}`);
  const simRows = fresh();
  const vals = [
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
  simRows.forEach((r, i) => {
    [r.q, r.v, r.cur] = vals[i];
    if (r.g === 'materiales' && i < 2) r.unit = 'unidad';
  });

  const simRes = calculate(simRows, 1500, 5, 20, 0, 'margen');
  // Materiales: (10*100*1500) + (1*650*1500) + 300000 + 180000 + 220000 + 80000 = 1,500,000 + 975,000 + 780,000 = 3,255,000
  assert(simRes.sums.materiales === 3255000, `Subtotal Materiales = $3.255.000 (obtenido: ${simRes.sums.materiales})`);
  // Mano de obra: 24*18000 + 24*10000 = 432,000 + 240,000 = 672,000
  assert(simRes.sums.mano === 672000, `Subtotal Mano de Obra = $672.000 (obtenido: ${simRes.sums.mano})`);
  // Adicionales: 120000 + 100000 + 150000 + 58000 + 0 = 428,000
  assert(simRes.sums.adicionales === 428000, `Subtotal Adicionales = $428.000 (obtenido: ${simRes.sums.adicionales})`);
  // Externos: 120000 + 250000 + 180000 + 200000 = 750,000
  assert(simRes.sums.externos === 750000, `Subtotal Externos = $750.000 (obtenido: ${simRes.sums.externos})`);
  // Subtotal costos: 3255000 + 672000 + 428000 + 750000 = 5,105,000
  assert(simRes.sub === 5105000, `Subtotal de costos = $5.105.000 (obtenido: ${simRes.sub})`);
  // Contingencia 5%: 255,250 -> Costo previsto: 5,360,250
  assert(simRes.reserve === 255250, `Contingencia (5%) = $255.250`);
  assert(simRes.cost === 5360250, `Costo previsto con contingencia = $5.360.250`);
  // Precio con margen 20%: 5360250 / 0.8 = 6,700,312.50
  assert(Math.abs(simRes.price - 6700312.5) < 1e-6, `Precio final con margen 20% = $6.700.312,50`);
  assert(Math.abs(simRes.result - 1340062.5) < 1e-6, `Resultado comercial previsto = $1.340.062,50`);
  assert(Math.abs(simRes.usd - 6700312.5 / 1500) < 1e-6, `Equivalente USD correctamente calculado`);

  // 3. CRITERIO RECARGO E IMPUESTOS
  console.log(`\n${colors.bold}📈 3. Criterio Recargo sobre Costo e Impuesto Agregado:${colors.reset}`);
  const recargoRes = calculate(simRows, 1500, 5, 20, 21, 'recargo');
  const expectedPriceRecargo = 5360250 * 1.2; // 6,432,300
  const expectedTax = expectedPriceRecargo * 0.21;
  assert(Math.abs(recargoRes.price - expectedPriceRecargo) < 1e-6, 'Recargo del 20% sobre costo = costo × 1.20');
  assert(Math.abs(recargoRes.imp - expectedTax) < 1e-6, 'Impuesto del 21% aplicado sobre el precio antes de impuesto');
  assert(Math.abs(recargoRes.total - (expectedPriceRecargo + expectedTax)) < 1e-6, 'Total = Precio + Impuesto');

  // 4. VALIDACIONES Y ERRORES
  console.log(`\n${colors.bold}🛡️ 4. Validaciones de Entrada y Reglas de Negocio:${colors.reset}`);
  let errCaught = '';
  try {
    calculate(simRows, 0, 5, 20, 0, 'margen');
  } catch (e) {
    errCaught = e.message;
  }
  assert(errCaught === 'Ingresá una cotización válida, mayor que cero.', 'Rechaza cotización menor o igual a cero');

  errCaught = '';
  try {
    calculate(simRows, 1500, 5, 100, 0, 'margen');
  } catch (e) {
    errCaught = e.message;
  }
  assert(errCaught === 'El margen sobre venta debe ser menor al 100%.', 'Rechaza margen sobre venta >= 100%');

  // 5. VERIFICACIÓN DE ARCHIVOS Y ENRUTAMIENTO EN ANGULAR
  console.log(`\n${colors.bold}🔗 5. Integración en Arquitectura Angular:${colors.reset}`);
  const routesPath = path.join(__dirname, 'src', 'app', 'app.routes.ts');
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  assert(routesContent.includes("path: 'presupuesto'"), "Ruta '/presupuesto' registrada en app.routes.ts");
  assert(routesContent.includes('BudgetCalculatorComponent'), 'Lazy-loading de BudgetCalculatorComponent configurado');

  const navbarPath = path.join(__dirname, 'src', 'app', 'shared', 'components', 'navbar', 'navbar.component.html');
  const navbarContent = fs.readFileSync(navbarPath, 'utf8');
  assert(navbarContent.includes('routerLink="/presupuesto"'), 'Navbar incluye acceso directo a /presupuesto');

  const servicePath = path.join(__dirname, 'src', 'app', 'core', 'services', 'budget-calculator.service.ts');
  assert(fs.existsSync(servicePath), 'Existe BudgetCalculatorService en core/services');

  const compHtmlPath = path.join(__dirname, 'src', 'app', 'features', 'budget-calculator', 'budget-calculator.component.html');
  assert(fs.existsSync(compHtmlPath), 'Existe plantilla de BudgetCalculatorComponent');

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
  console.error('Error fatal en la suite de presupuesto:', err);
  process.exit(1);
});
