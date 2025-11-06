// ========================
// TEST FASE 2: Sistema de Prefetch (Buffer)
// ========================

const db = require('./database');

console.log('\n🧪 TEST FASE 2: SISTEMA DE PREFETCH\n');
console.log('='.repeat(70));

db.initDatabase();

const TEST_USER_ID = 8888;
const TEST_TOPIC = 'tema-5-medicamentos';

// Asegurar que usuario de prueba existe
try {
  const userExists = db.db.prepare('SELECT id FROM users WHERE id = ?').get(TEST_USER_ID);
  if (!userExists) {
    db.db.prepare(`
      INSERT INTO users (id, username, password_hash, estado)
      VALUES (?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test-prefetch-user', 'hash-dummy', 'activo');
  }
  console.log(`✓ Usuario de prueba: ${TEST_USER_ID}\n`);
} catch (error) {
  // Usuario ya existe
}

// Limpiar datos previos
db.db.prepare('DELETE FROM user_question_buffer WHERE user_id = ?').run(TEST_USER_ID);
db.db.prepare('DELETE FROM user_seen_questions WHERE user_id = ?').run(TEST_USER_ID);
console.log('✓ Datos de prueba anteriores limpiados\n');

// ========================
// TEST 1: Verificar tabla buffer existe
// ========================
console.log('📋 TEST 1: Verificar tabla user_question_buffer');
console.log('-'.repeat(70));

try {
  const tableInfo = db.db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='user_question_buffer'
  `).get();

  if (!tableInfo) {
    console.log('❌ FALLO: Tabla user_question_buffer no existe');
    process.exit(1);
  }

  console.log('✅ TEST 1 PASADO: Tabla user_question_buffer existe\n');
} catch (error) {
  console.log('❌ ERROR en TEST 1:', error.message);
  process.exit(1);
}

// ========================
// TEST 2: Añadir pregunta al buffer
// ========================
console.log('📋 TEST 2: Añadir pregunta al buffer');
console.log('-'.repeat(70));

try {
  const mockQuestion = {
    question: '¿Qué es un principio activo?',
    options: ['A) Sustancia terapéutica', 'B) Excipiente', 'C) Envase', 'D) Prospecto'],
    correct: 0,
    explanation: 'El principio activo es la sustancia terapéutica del medicamento',
    difficulty: 'simple'
  };

  const bufferId = db.addToBuffer(TEST_USER_ID, TEST_TOPIC, mockQuestion, 'simple', null);

  if (!bufferId) {
    console.log('❌ FALLO: No se pudo añadir pregunta al buffer');
    process.exit(1);
  }

  console.log(`✓ Pregunta añadida al buffer (ID: ${bufferId})`);

  // Verificar que se guardó
  const bufferSize = db.getBufferSize(TEST_USER_ID, TEST_TOPIC);
  console.log(`✓ Tamaño del buffer: ${bufferSize}`);

  if (bufferSize !== 1) {
    console.log('❌ FALLO: Buffer debería tener 1 pregunta');
    process.exit(1);
  }

  console.log('✅ TEST 2 PASADO: Pregunta añadida correctamente\n');
} catch (error) {
  console.log('❌ ERROR en TEST 2:', error.message);
  process.exit(1);
}

// ========================
// TEST 3: Obtener pregunta del buffer
// ========================
console.log('📋 TEST 3: Obtener pregunta del buffer');
console.log('-'.repeat(70));

try {
  const retrieved = db.getFromBuffer(TEST_USER_ID, TEST_TOPIC);

  if (!retrieved) {
    console.log('❌ FALLO: No se pudo obtener pregunta del buffer');
    process.exit(1);
  }

  console.log(`✓ Pregunta obtenida: "${retrieved.question.question.substring(0, 50)}..."`);

  // Verificar que buffer ahora está vacío
  const bufferSize = db.getBufferSize(TEST_USER_ID, TEST_TOPIC);
  console.log(`✓ Tamaño del buffer después de obtener: ${bufferSize}`);

  if (bufferSize !== 0) {
    console.log('❌ FALLO: Buffer debería estar vacío después de obtener');
    process.exit(1);
  }

  console.log('✅ TEST 3 PASADO: Pregunta obtenida y removida del buffer\n');
} catch (error) {
  console.log('❌ ERROR en TEST 3:', error.message);
  process.exit(1);
}

// ========================
// TEST 4: Añadir múltiples preguntas al buffer
// ========================
console.log('📋 TEST 4: Añadir múltiples preguntas al buffer');
console.log('-'.repeat(70));

try {
  const questions = [
    { question: 'Pregunta 1', options: ['A', 'B', 'C', 'D'], correct: 0, difficulty: 'simple' },
    { question: 'Pregunta 2', options: ['A', 'B', 'C', 'D'], correct: 1, difficulty: 'media' },
    { question: 'Pregunta 3', options: ['A', 'B', 'C', 'D'], correct: 2, difficulty: 'elaborada' },
    { question: 'Pregunta 4', options: ['A', 'B', 'C', 'D'], correct: 3, difficulty: 'simple' }
  ];

  for (const q of questions) {
    db.addToBuffer(TEST_USER_ID, TEST_TOPIC, q, q.difficulty, null);
  }

  const bufferSize = db.getBufferSize(TEST_USER_ID, TEST_TOPIC);
  console.log(`✓ Preguntas añadidas: ${questions.length}`);
  console.log(`✓ Tamaño del buffer: ${bufferSize}`);

  if (bufferSize !== questions.length) {
    console.log(`❌ FALLO: Buffer debería tener ${questions.length} preguntas`);
    process.exit(1);
  }

  console.log('✅ TEST 4 PASADO: Múltiples preguntas añadidas correctamente\n');
} catch (error) {
  console.log('❌ ERROR en TEST 4:', error.message);
  process.exit(1);
}

// ========================
// TEST 5: Obtener preguntas en orden FIFO
// ========================
console.log('📋 TEST 5: Obtener preguntas en orden FIFO');
console.log('-'.repeat(70));

try {
  const first = db.getFromBuffer(TEST_USER_ID, TEST_TOPIC);
  console.log(`✓ Primera pregunta: "${first.question.question}"`);

  if (first.question.question !== 'Pregunta 1') {
    console.log('❌ FALLO: Primera pregunta debería ser "Pregunta 1" (FIFO)');
    process.exit(1);
  }

  const second = db.getFromBuffer(TEST_USER_ID, TEST_TOPIC);
  console.log(`✓ Segunda pregunta: "${second.question.question}"`);

  if (second.question.question !== 'Pregunta 2') {
    console.log('❌ FALLO: Segunda pregunta debería ser "Pregunta 2" (FIFO)');
    process.exit(1);
  }

  const bufferSize = db.getBufferSize(TEST_USER_ID, TEST_TOPIC);
  console.log(`✓ Tamaño del buffer después de obtener 2: ${bufferSize}`);

  if (bufferSize !== 2) {
    console.log('❌ FALLO: Buffer debería tener 2 preguntas restantes');
    process.exit(1);
  }

  console.log('✅ TEST 5 PASADO: FIFO funciona correctamente\n');
} catch (error) {
  console.log('❌ ERROR en TEST 5:', error.message);
  process.exit(1);
}

// ========================
// TEST 6: Limpiar buffers expirados
// ========================
console.log('📋 TEST 6: Limpiar buffers expirados');
console.log('-'.repeat(70));

try {
  // Limpiar buffer actual
  db.db.prepare('DELETE FROM user_question_buffer WHERE user_id = ?').run(TEST_USER_ID);

  // Insertar pregunta expirada
  const expiredTimestamp = Date.now() - (2 * 3600 * 1000); // 2 horas atrás

  db.db.prepare(`
    INSERT INTO user_question_buffer (user_id, topic_id, question_data, difficulty, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    TEST_USER_ID,
    TEST_TOPIC,
    JSON.stringify({ question: 'Pregunta expirada', options: [], correct: 0 }),
    'simple',
    expiredTimestamp,
    expiredTimestamp // Ya expirada
  );

  console.log('✓ Pregunta expirada insertada');

  // Contar antes de limpiar
  const beforeCount = db.db.prepare('SELECT COUNT(*) as c FROM user_question_buffer WHERE user_id = ?').get(TEST_USER_ID).c;
  console.log(`✓ Preguntas en buffer antes de limpiar: ${beforeCount}`);

  // Limpiar
  const deleted = db.cleanExpiredBuffers();
  console.log(`✓ Preguntas expiradas eliminadas: ${deleted}`);

  // Contar después
  const afterCount = db.db.prepare('SELECT COUNT(*) as c FROM user_question_buffer WHERE user_id = ?').get(TEST_USER_ID).c;

  if (afterCount > 0) {
    console.log('❌ FALLO: No debería haber preguntas en buffer después de limpiar');
    process.exit(1);
  }

  console.log('✅ TEST 6 PASADO: Limpieza de buffers funciona\n');
} catch (error) {
  console.log('❌ ERROR en TEST 6:', error.message);
  process.exit(1);
}

// ========================
// TEST 7: Buffer por tema (aislamiento)
// ========================
console.log('📋 TEST 7: Buffer por tema (aislamiento)');
console.log('-'.repeat(70));

try {
  const TOPIC_A = 'tema-4-organizaciones-farmaceuticas';
  const TOPIC_B = 'tema-5-medicamentos';

  // Añadir preguntas a dos temas diferentes
  db.addToBuffer(TEST_USER_ID, TOPIC_A, { question: 'Tema A', options: [], correct: 0 }, 'simple', null);
  db.addToBuffer(TEST_USER_ID, TOPIC_A, { question: 'Tema A 2', options: [], correct: 0 }, 'simple', null);
  db.addToBuffer(TEST_USER_ID, TOPIC_B, { question: 'Tema B', options: [], correct: 0 }, 'simple', null);

  const sizeA = db.getBufferSize(TEST_USER_ID, TOPIC_A);
  const sizeB = db.getBufferSize(TEST_USER_ID, TOPIC_B);

  console.log(`✓ Buffer tema A: ${sizeA} preguntas`);
  console.log(`✓ Buffer tema B: ${sizeB} preguntas`);

  if (sizeA !== 2 || sizeB !== 1) {
    console.log('❌ FALLO: Buffers por tema no están aislados correctamente');
    process.exit(1);
  }

  // Obtener de tema A no debe afectar tema B
  db.getFromBuffer(TEST_USER_ID, TOPIC_A);

  const newSizeA = db.getBufferSize(TEST_USER_ID, TOPIC_A);
  const newSizeB = db.getBufferSize(TEST_USER_ID, TOPIC_B);

  console.log(`✓ Después de obtener de A: ${newSizeA} (A) / ${newSizeB} (B)`);

  if (newSizeA !== 1 || newSizeB !== 1) {
    console.log('❌ FALLO: Obtener de un tema afectó al otro');
    process.exit(1);
  }

  console.log('✅ TEST 7 PASADO: Aislamiento por tema funciona\n');
} catch (error) {
  console.log('❌ ERROR en TEST 7:', error.message);
  process.exit(1);
}

// ========================
// TEST 8: Integración con caché
// ========================
console.log('📋 TEST 8: Integración buffer + caché');
console.log('-'.repeat(70));

try {
  // Limpiar
  db.db.prepare('DELETE FROM user_question_buffer WHERE user_id = ?').run(TEST_USER_ID);

  // Guardar pregunta en caché
  const questionForCache = {
    question: 'Pregunta desde caché',
    options: ['A', 'B', 'C', 'D'],
    correct: 0,
    explanation: 'Explicación',
    difficulty: 'media'
  };

  const cacheId = db.saveToCacheAndTrack(TEST_USER_ID, TEST_TOPIC, 'media', questionForCache, 'study');
  console.log(`✓ Pregunta guardada en caché (ID: ${cacheId})`);

  // Añadir referencia en buffer
  db.addToBuffer(TEST_USER_ID, TEST_TOPIC, questionForCache, 'media', cacheId);

  // Obtener del buffer
  const retrieved = db.getFromBuffer(TEST_USER_ID, TEST_TOPIC);

  if (retrieved.cacheId !== cacheId) {
    console.log('❌ FALLO: cacheId no se preservó');
    process.exit(1);
  }

  console.log(`✓ Pregunta obtenida con cacheId: ${retrieved.cacheId}`);
  console.log('✅ TEST 8 PASADO: Integración con caché funciona\n');
} catch (error) {
  console.log('❌ ERROR en TEST 8:', error.message);
  process.exit(1);
}

// ========================
// RESUMEN FINAL
// ========================
console.log('='.repeat(70));
console.log('📊 RESUMEN FINAL - FASE 2');
console.log('='.repeat(70));

console.log('\n✅ TODOS LOS TESTS PASARON:');
console.log('  ✓ Tabla user_question_buffer creada');
console.log('  ✓ Añadir pregunta al buffer funciona');
console.log('  ✓ Obtener pregunta del buffer funciona');
console.log('  ✓ Múltiples preguntas funcionan');
console.log('  ✓ FIFO (First In First Out) funciona');
console.log('  ✓ Limpieza de buffers expirados funciona');
console.log('  ✓ Aislamiento por tema funciona');
console.log('  ✓ Integración con caché funciona');

console.log('\n🎉 FASE 2 - SISTEMA DE PREFETCH COMPLETAMENTE FUNCIONAL\n');
console.log('📝 Beneficios:');
console.log('  • Primera pregunta: ~25 segundos (batch de 5)');
console.log('  • Siguientes preguntas: INSTANTÁNEAS (desde buffer)');
console.log('  • Buffer auto-rellenado en background');
console.log('  • Mantiene siempre 3 preguntas listas\n');

// Limpiar datos de prueba
db.db.prepare('DELETE FROM user_question_buffer WHERE user_id = ?').run(TEST_USER_ID);
db.db.prepare('DELETE FROM user_seen_questions WHERE user_id = ?').run(TEST_USER_ID);
db.db.prepare('DELETE FROM question_cache WHERE id > 100000').run();
console.log('🧹 Datos de prueba limpiados\n');

process.exit(0);
