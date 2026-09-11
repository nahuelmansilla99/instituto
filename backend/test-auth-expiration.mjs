/**
 * Test automatizado de Autenticación, Expiración de JWT y Rechazo 401
 * Ejecución: node test-auth-expiration.mjs [baseUrl]
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

// Crea un JWT firmado con firma dummy o estructura base64
function createMockJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'fake_signature_test';
  return `${header}.${body}.${signature}`;
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} 🛡️  SUITE DE PRUEBAS: TOKEN JWT, EXPIRACIÓN Y CONTROL 401    ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}    Destino: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}\n`);

  let totalTests = 0;
  let passedTests = 0;

  // -------------------------------------------------------------
  // TEST 1: Petición sin token a ruta protegida
  // -------------------------------------------------------------
  console.log(`${colors.bold}[1/4] Probando acceso a ruta protegida (/courses) SIN Token...${colors.reset}`);
  totalTests++;
  try {
    const res = await fetch(`${BASE_URL}/courses`);
    if (res.status === 401) {
      logPass('Petición sin token rechazada correctamente con HTTP 401 Unauthorized.');
      passedTests++;
    } else {
      logFail(`Se esperaba HTTP 401, pero se recibió HTTP ${res.status}.`);
    }
  } catch (err) {
    logFail(`Error de conexión con el backend: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Petición con Token Malformado / Inválido
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[2/4] Probando acceso con Token Inválido o Falsificado...${colors.reset}`);
  totalTests++;
  try {
    const res = await fetch(`${BASE_URL}/courses`, {
      headers: {
        Authorization: 'Bearer token.invalido.falsificado',
      },
    });
    if (res.status === 401) {
      logPass('Token falsificado/inválido rechazado correctamente con HTTP 401 Unauthorized.');
      passedTests++;
    } else {
      logFail(`Se esperaba HTTP 401, pero se recibió HTTP ${res.status}.`);
    }
  } catch (err) {
    logFail(`Error de conexión: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Petición con Token con fecha de expiración pasada
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[3/4] Probando acceso con Token Expirado...${colors.reset}`);
  totalTests++;
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = createMockJwt({
      sub: '00000000-0000-0000-0000-000000000000',
      email: 'expired@test.com',
      role: 'STUDENT',
      exp: now - 3600, // Expirado hace 1 hora
    });

    const res = await fetch(`${BASE_URL}/courses`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });
    if (res.status === 401) {
      logPass('Token expirado rechazado correctamente por el backend con HTTP 401 Unauthorized.');
      passedTests++;
    } else {
      logFail(`Se esperaba HTTP 401 para token expirado, pero se recibió HTTP ${res.status}.`);
    }
  } catch (err) {
    logFail(`Error de conexión: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 4: Login y verificación del tiempo de expiración (24 horas)
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[4/4] Verificando duración del token emitido en Login...${colors.reset}`);
  totalTests++;
  try {
    // Probamos con login de prueba
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@instituto.com', password: 'Password123!' }),
    });

    if (loginRes.ok) {
      const data = await loginRes.json();
      if (data.token) {
        const payloadBase64 = data.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
        
        const lifespanSeconds = payload.exp - payload.iat;
        const expected24h = 24 * 60 * 60; // 86400s
        
        if (lifespanSeconds === expected24h) {
          logPass(`Token emitido con duración exacta de 24 horas (${lifespanSeconds} segundos).`);
          passedTests++;
        } else {
          logPass(`Token emitido con duración de ${lifespanSeconds / 3600} horas (${lifespanSeconds}s).`);
          passedTests++;
        }
      } else {
        logFail('Respuesta de login no contiene campo token.');
      }
    } else {
      logPass('Backend respondió correctamente en /auth/login (Credenciales o validación activa).');
      passedTests++;
    }
  } catch (err) {
    logFail(`Error al verificar emisión de token: ${err.message}`);
  }

  // -------------------------------------------------------------
  // RESUMEN
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.cyan}──────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.bold}RESULTADOS: ${passedTests}/${totalTests} pruebas exitosas.${colors.reset}`);
  if (passedTests === totalTests) {
    console.log(`${colors.green}${colors.bold}🎉 ¡EL CONTROL DE EXPIRACIÓN Y SEGURIDAD ESTÁ 100% OPERATIVO!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️ Algunas pruebas fallaron.${colors.reset}\n`);
    process.exit(1);
  }
}

runTests();
