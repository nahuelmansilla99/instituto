/**
 * Test automatizado para la lógica de autenticación y expiración de tokens en Frontend
 * Ejecución: node test-auth-logic.mjs
 */

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

// Implementación idéntica a AuthService.isTokenExpired
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < nowInSeconds;
  } catch {
    return true;
  }
}

// Generador de JWTs simulados para pruebas
function createMockJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'mock_signature_for_testing';
  return `${header}.${body}.${signature}`;
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} 🧪  TEST SUITE: FRONTEND AUTH & TOKEN EXPIRATION LOGIC      ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════${colors.reset}\n`);

  let totalTests = 0;
  let passedTests = 0;
  const now = Math.floor(Date.now() / 1000);

  // -------------------------------------------------------------
  // TEST 1: Token nulo o vacío
  // -------------------------------------------------------------
  console.log(`${colors.bold}[1/6] Probando validación de tokens nulos o vacíos...${colors.reset}`);
  totalTests++;
  if (isTokenExpired(null) === true && isTokenExpired('') === true && isTokenExpired(undefined) === true) {
    logPass('Tokens nulos, vacíos o indefinidos son detectados como expirados/inválidos.');
    passedTests++;
  } else {
    logFail('Fallo al validar tokens nulos/vacíos.');
  }

  // -------------------------------------------------------------
  // TEST 2: Token con formato corrupto / malformado
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[2/6] Probando tokens con formato malformado...${colors.reset}`);
  totalTests++;
  if (isTokenExpired('not.a.valid.jwt.token') === true && isTokenExpired('invalid-token') === true) {
    logPass('Tokens corruptos son detectados de forma segura como inválidos sin arrojar excepciones.');
    passedTests++;
  } else {
    logFail('Fallo al validar tokens con formato malformado.');
  }

  // -------------------------------------------------------------
  // TEST 3: Token expirado hace 5 días (escenario reportado)
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[3/6] Probando Token vencido hace 5 días...${colors.reset}`);
  totalTests++;
  const fiveDaysAgo = now - 5 * 24 * 60 * 60;
  const expiredToken = createMockJwt({ sub: 'user-123', email: 'user@test.com', role: 'STUDENT', exp: fiveDaysAgo });
  if (isTokenExpired(expiredToken) === true) {
    logPass(`Token vencido hace 5 días fue detectado correctamente como expirado (exp: ${new Date(fiveDaysAgo * 1000).toISOString()}).`);
    passedTests++;
  } else {
    logFail('El token vencido hace 5 días fue marcado como válido erróneamente.');
  }

  // -------------------------------------------------------------
  // TEST 4: Token válido con duración de 24 horas
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[4/6] Probando Token recién emitido válido por 24 horas...${colors.reset}`);
  totalTests++;
  const in24Hours = now + 24 * 60 * 60;
  const validToken = createMockJwt({ sub: 'user-123', email: 'user@test.com', role: 'STUDENT', exp: in24Hours });
  if (isTokenExpired(validToken) === false) {
    logPass(`Token válido por 24hs fue detectado correctamente como activo (exp: ${new Date(in24Hours * 1000).toISOString()}).`);
    passedTests++;
  } else {
    logFail('El token válido fue marcado erróneamente como expirado.');
  }

  // -------------------------------------------------------------
  // TEST 5: Simulación de interceptor HTTP ante error 401 en peticiones de cursos
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[5/6] Probando lógica de intercepción de error 401 en llamadas a la API...${colors.reset}`);
  totalTests++;
  let logoutCalled = false;
  const fakeAuthService = {
    logout: () => { logoutCalled = true; }
  };

  function simulateInterceptor(reqUrl, errorStatus) {
    if (
      errorStatus === 401 &&
      !reqUrl.includes('/auth/login') &&
      !reqUrl.includes('/auth/register') &&
      !reqUrl.includes('/auth/google')
    ) {
      fakeAuthService.logout();
    }
  }

  simulateInterceptor('http://localhost:3000/courses', 401);
  if (logoutCalled) {
    logPass('Error 401 en endpoint protegido (/courses) disparó logout() automáticamente.');
    passedTests++;
  } else {
    logFail('El interceptor no disparó logout() ante un error 401.');
  }

  // -------------------------------------------------------------
  // TEST 6: El interceptor no debe disparar logout() en endpoints de login/register
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}[6/6] Verificando que 401 en /auth/login no provoque bucle de logout...${colors.reset}`);
  totalTests++;
  logoutCalled = false;
  simulateInterceptor('http://localhost:3000/auth/login', 401);
  if (!logoutCalled) {
    logPass('Error 401 en /auth/login fue ignorado por el interceptor para permitir mostrar mensaje de credenciales incorrectas.');
    passedTests++;
  } else {
    logFail('El interceptor disparó logout() en /auth/login provocando bucle.');
  }

  // -------------------------------------------------------------
  // RESUMEN
  // -------------------------------------------------------------
  console.log(`\n${colors.bold}${colors.cyan}──────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`${colors.bold}RESULTADOS: ${passedTests}/${totalTests} pruebas exitosas.${colors.reset}`);
  if (passedTests === totalTests) {
    console.log(`${colors.green}${colors.bold}🎉 ¡TODAS LAS PRUEBAS DE AUTENTICACIÓN PASARON CON ÉXITO!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️ Algunas pruebas fallaron.${colors.reset}\n`);
    process.exit(1);
  }
}

runTests();
