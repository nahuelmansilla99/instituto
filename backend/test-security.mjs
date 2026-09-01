/**
 * Test automatizado de Seguridad (Rate Limiting y Payload Protection)
 * Ejecución: node test-security.mjs [baseUrl]
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function logPass(msg) {
  console.log(`  ${colors.green}✔ PASS:${colors.reset} ${msg}`);
}

function logFail(msg, details = '') {
  console.log(`  ${colors.red}✖ FAIL:${colors.reset} ${msg}`);
  if (details) console.log(`         ${colors.yellow}${details}${colors.reset}`);
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} 🛡️  SUITE DE PRUEBAS DE SEGURIDAD: RATE LIMITING & PAYLOAD  ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}    Destino: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}\n`);

  let totalTests = 0;
  let passedTests = 0;

  // IP simulada única para esta ejecución (permite reejecutar el test sin esperar los 5 min de bloqueo de IP)
  const simulatedIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;

  // -------------------------------------------------------------
  // TEST 1: Protección de Payload Gigante (> 1MB)
  // -------------------------------------------------------------
  console.log(`${colors.bold}[1/2] Probando Protección de Tamaño de Payload (Anti-DoS de memoria)...${colors.reset}`);
  totalTests++;
  try {
    const hugeData = 'A'.repeat(1.5 * 1024 * 1024); // 1.5 MB de datos
    const payloadRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': simulatedIp,
      },
      body: JSON.stringify({ email: 'test@example.com', password: 'test', extra: hugeData }),
    });

    if (payloadRes.status === 413) {
      logPass(`Payload de 1.5MB rechazado correctamente con HTTP 413 Payload Too Large.`);
      passedTests++;
    } else {
      logFail(`Se esperaba HTTP 413, pero se recibió HTTP ${payloadRes.status}.`);
    }
  } catch (err) {
    logFail(`Error de conexión al probar payload: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Rate Limiting en Login (Máx 5 intentos permitidos)
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[2/2] Probando Rate Limiting en /auth/login (Máx 5 intentos para IP ${simulatedIp})...${colors.reset}`);
  
  const loginAttempts = 6;
  const results = [];

  for (let i = 1; i <= loginAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': simulatedIp,
        },
        body: JSON.stringify({ email: `rate-test-${Date.now()}@example.com`, password: 'wrongpassword' }),
      });
      const data = await res.json().catch(() => ({}));
      results.push({ attempt: i, status: res.status, data });
      console.log(`     Intento #${i}: HTTP ${res.status} ${res.status === 429 ? colors.yellow + '(Bloqueado por Throttler)' + colors.reset : ''}`);
    } catch (err) {
      results.push({ attempt: i, status: 0, error: err.message });
      console.log(`     Intento #${i}: Error de conexión (${err.message})`);
    }
  }

  // Verificar intentos 1 al 5
  totalTests++;
  const first5Allowed = results.slice(0, 5).every(r => r.status === 401);
  if (first5Allowed) {
    logPass('Los primeros 5 intentos fueron procesados por el backend (HTTP 401 Credenciales Inválidas).');
    passedTests++;
  } else {
    logFail('Alguno de los primeros 5 intentos no devolvió HTTP 401.', JSON.stringify(results.slice(0, 5).map(r => r.status)));
  }

  // Verificar intento 6
  totalTests++;
  const sixthBlocked = results[5]?.status === 429;
  if (sixthBlocked) {
    logPass('El intento #6 fue interceptado y bloqueado con HTTP 429 Too Many Requests.');
    passedTests++;
  } else {
    logFail(`El intento #6 no fue bloqueado. Se recibió HTTP ${results[5]?.status}.`);
  }

  // Verificar mensaje de respuesta en 429
  totalTests++;
  const msg = results[5]?.data?.message;
  if (results[5]?.status === 429 && msg) {
    logPass(`Mensaje de error 429 recibido: "${msg}"`);
    passedTests++;
  } else if (results[5]?.status === 429) {
    logPass('Respuesta 429 recibida correctamente.');
    passedTests++;
  } else {
    logFail('No se pudo verificar el mensaje de respuesta 429.');
  }

  // -------------------------------------------------------------
  // RESUMEN FINAL
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.cyan}──────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.bold}RESULTADOS: ${passedTests}/${totalTests} pruebas exitosas.${colors.reset}`);
  if (passedTests === totalTests) {
    console.log(`${colors.green}${colors.bold}🎉 ¡TODAS LAS MEDIDAS DE SEGURIDAD ESTÁN ACTIVAS Y FUNCIONANDO!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️ Algunas pruebas no pasaron. Revisa los detalles arriba.${colors.reset}\n`);
    process.exit(1);
  }
}

runTests();
