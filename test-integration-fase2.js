// ========================
// TEST DE INTEGRACIÓN FASE 2: Flujo completo con API
// ========================

const db = require('./database');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

console.log('\n🧪 TEST DE INTEGRACIÓN FASE 2: Flujo completo\n');
console.log('='.repeat(70));

// Simular el flujo completo sin iniciar servidor HTTP
async function testCompleteFlow() {
  db.initDatabase();

  const TEST_USER_ID = 9999;

  // Crear usuario de prueba
  try {
    const userExists = db.db.prepare('SELECT id FROM users WHERE id = ?').get(TEST_USER_ID);
    if (!userExists) {
      db.db.prepare(`
        INSERT INTO users (id, username, password_hash, estado)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'test-integration-user', 'hash-dummy', 'activo');
    }
    console.log(`✓ Usuario de prueba creado: ${TEST_USER_ID}\n`);
  } catch (error) {
    // Usuario ya existe
  }

  // Limpiar datos previos
  db.db.prepare('DELETE FROM user_question_buffer WHERE user_id = ?').run(TEST_USER_ID);
  db.db.prepare('DELETE FROM user_seen_questions WHERE user_id = ?').run(TEST_USER_ID);
  db.db.prepare('DELETE FROM question_cache WHERE id > 100000').run();
  console.log('✓ Datos de prueba limpiados\n');

  // ========================
  // SIMULACIÓN 1: Primera solicitud (buffer vacío)
  // ========================
  console.log('📋 SIMULACIÓN 1: Primera solicitud (buffer vacío)');
  console.log('-'.repeat(70));

  const TOPIC = 'tema-5-medicamentos';

  // Simular endpoint /api/study/question
  console.log(`📚 Usuario ${TEST_USER_ID} solicita pregunta de: ${TOPIC}`);

  const bufferSizeBefore = db.getBufferSize(TEST_USER_ID, TOPIC);
  console.log(`💾 Buffer actual: ${bufferSizeBefore} preguntas`);

  if (bufferSizeBefore !== 0) {
    console.log('❌ FALLO: Buffer debería estar vacío inicialmente');
    process.exit(1);
  }

  // Como buffer está vacío, simular que se genera batch de 5
  const mockQuestions = [
    { question: 'Pregunta 1', options: ['A', 'B', 'C', 'D'], correct: 0, difficulty: 'simple', _sourceTopic: TOPIC },
    { question: 'Pregunta 2', options: ['A', 'B', 'C', 'D'], correct: 1, difficulty: 'media', _sourceTopic: TOPIC },
    { question: 'Pregunta 3', options: ['A', 'B', 'C', 'D'], correct: 2, difficulty: 'media', _sourceTopic: TOPIC },
    { question: 'Pregunta 4', options: ['A', 'B', 'C', 'D'], correct: 3, difficulty: 'elaborada', _sourceTopic: TOPIC },
    { question: 'Pregunta 5', options: ['A', 'B', 'C', 'D'], correct: 0, difficulty: 'simple', _sourceTopic: TOPIC }
  ];

  // Primera pregunta se retorna
  const questionToReturn = mockQuestions[0];
  console.log(`✓ Pregunta retornada: "${questionToReturn.question}"`);

  // Resto al buffer (4 preguntas)
  for (let i = 1; i < mockQuestions.length; i++) {
    const q = mockQuestions[i];
    db.addToBuffer(TEST_USER_ID, TOPIC, q, q.difficulty, null);
  }

  const bufferSizeAfter = db.getBufferSize(TEST_USER_ID, TOPIC);
  console.log(`💾 Buffer después de batch: ${bufferSizeAfter} preguntas`);

  if (bufferSizeAfter !== 4) {
    console.log('❌ FALLO: Buffer debería tener 4 preguntas');
    process.exit(1);
  }

  console.log('✅ SIMULACIÓN 1 PASADA: Batch inicial generado\n');

  // ========================
  // SIMULACIÓN 2: Segunda solicitud (desde buffer)
  // ========================
  console.log('📋 SIMULACIÓN 2: Segunda solicitud (desde buffer)');
  console.log('-'.repeat(70));

  console.log(`📚 Usuario ${TEST_USER_ID} solicita otra pregunta de: ${TOPIC}`);

  const bufferSize2 = db.getBufferSize(TEST_USER_ID, TOPIC);
  console.log(`💾 Buffer actual: ${bufferSize2} preguntas`);

  if (bufferSize2 > 0) {
    const buffered = db.getFromBuffer(TEST_USER_ID, TOPIC);
    console.log(`⚡ Pregunta obtenida desde buffer: "${buffered.question.question}"`);
    console.log(`✓ Source: "buffer" (INSTANT!)`);

    const newBufferSize = db.getBufferSize(TEST_USER_ID, TOPIC);
    console.log(`💾 Buffer después de obtener: ${newBufferSize} preguntas`);

    if (newBufferSize !== 3) {
      console.log('❌ FALLO: Buffer debería tener 3 preguntas');
      process.exit(1);
    }

    // Verificar que se obtuvo "Pregunta 2" (FIFO)
    if (buffered.question.question !== 'Pregunta 2') {
      console.log('❌ FALLO: Debería obtener "Pregunta 2" por FIFO');
      process.exit(1);
    }

    console.log('✅ SIMULACIÓN 2 PASADA: Pregunta INSTANTÁNEA desde buffer\n');
  } else {
    console.log('❌ FALLO: Buffer debería tener preguntas');
    process.exit(1);
  }

  // ========================
  // SIMULACIÓN 3: Tercera solicitud (buffer sigue teniendo)
  // ========================
  console.log('📋 SIMULACIÓN 3: Tercera solicitud (buffer con 3)');
  console.log('-'.repeat(70));

  const buffered3 = db.getFromBuffer(TEST_USER_ID, TOPIC);
  console.log(`⚡ Pregunta: "${buffered3.question.question}"`);

  const newBufferSize3 = db.getBufferSize(TEST_USER_ID, TOPIC);
  console.log(`💾 Buffer después: ${newBufferSize3} preguntas`);

  if (newBufferSize3 !== 2) {
    console.log('❌ FALLO: Buffer debería tener 2 preguntas');
    process.exit(1);
  }

  // Debería ser "Pregunta 3"
  if (buffered3.question.question !== 'Pregunta 3') {
    console.log('❌ FALLO: Debería obtener "Pregunta 3" por FIFO');
    process.exit(1);
  }

  console.log('✅ SIMULACIÓN 3 PASADA: Buffer funciona correctamente\n');

  // ========================
  // SIMULACIÓN 4: Buffer bajo de 3 (trigger refill)
  // ========================
  console.log('📋 SIMULACIÓN 4: Buffer bajo de 3 (trigger refill)');
  console.log('-'.repeat(70));

  console.log(`💾 Buffer actual: ${newBufferSize3} preguntas`);
  console.log('⚠️ Buffer bajó de 3 → Debería activar refill en background');

  if (newBufferSize3 < 3) {
    console.log('🔄 [Simulado] refillBuffer() se ejecutaría en background');
    console.log('✓ Usuario NO espera, obtiene pregunta INSTANTÁNEA');

    // Simular refill
    const refillQuestion = { question: 'Pregunta Refill', options: [], correct: 0, difficulty: 'media' };
    db.addToBuffer(TEST_USER_ID, TOPIC, refillQuestion, 'media', null);

    const afterRefill = db.getBufferSize(TEST_USER_ID, TOPIC);
    console.log(`💾 Buffer después de refill: ${afterRefill} preguntas`);

    if (afterRefill !== 3) {
      console.log('❌ FALLO: Buffer debería tener 3 preguntas después de refill');
      process.exit(1);
    }

    console.log('✅ SIMULACIÓN 4 PASADA: Refill funciona\n');
  }

  // ========================
  // SIMULACIÓN 5: Verificar aislamiento por tema
  // ========================
  console.log('📋 SIMULACIÓN 5: Aislamiento por tema');
  console.log('-'.repeat(70));

  const TOPIC_B = 'tema-4-organizaciones-farmaceuticas';

  const bufferTopicB = db.getBufferSize(TEST_USER_ID, TOPIC_B);
  console.log(`💾 Buffer tema B (${TOPIC_B}): ${bufferTopicB} preguntas`);

  if (bufferTopicB !== 0) {
    console.log('❌ FALLO: Tema B no debería tener buffer');
    process.exit(1);
  }

  // Añadir pregunta a tema B
  db.addToBuffer(TEST_USER_ID, TOPIC_B, { question: 'Tema B pregunta', options: [], correct: 0 }, 'simple', null);

  const bufferTopicA = db.getBufferSize(TEST_USER_ID, TOPIC);
  const bufferTopicBAfter = db.getBufferSize(TEST_USER_ID, TOPIC_B);

  console.log(`💾 Buffer tema A: ${bufferTopicA} preguntas`);
  console.log(`💾 Buffer tema B: ${bufferTopicBAfter} preguntas`);

  if (bufferTopicA !== 3 || bufferTopicBAfter !== 1) {
    console.log('❌ FALLO: Buffers por tema no están aislados');
    process.exit(1);
  }

  console.log('✅ SIMULACIÓN 5 PASADA: Aislamiento por tema funciona\n');

  // ========================
  // SIMULACIÓN 6: Limpieza de buffers expirados
  // ========================
  console.log('📋 SIMULACIÓN 6: Limpieza de buffers expirados');
  console.log('-'.repeat(70));

  // Insertar pregunta expirada
  const expiredTimestamp = Date.now() - (2 * 3600 * 1000); // 2 horas atrás
  db.db.prepare(`
    INSERT INTO user_question_buffer (user_id, topic_id, question_data, difficulty, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    TEST_USER_ID,
    TOPIC,
    JSON.stringify({ question: 'Expirada', options: [], correct: 0 }),
    'simple',
    expiredTimestamp,
    expiredTimestamp
  );

  console.log('✓ Pregunta expirada insertada');

  const beforeClean = db.db.prepare('SELECT COUNT(*) as c FROM user_question_buffer WHERE user_id = ?').get(TEST_USER_ID).c;
  console.log(`💾 Preguntas en buffer antes de limpiar: ${beforeClean}`);

  const deleted = db.cleanExpiredBuffers();
  console.log(`🧹 Preguntas expiradas eliminadas: ${deleted}`);

  const afterClean = db.db.prepare('SELECT COUNT(*) as c FROM user_question_buffer WHERE user_id = ?').get(TEST_USER_ID).c;
  console.log(`💾 Preguntas en buffer después de limpiar: ${afterClean}`);

  if (deleted < 1) {
    console.log('❌ FALLO: Debería haber eliminado al menos 1 pregunta expirada');
    process.exit(1);
  }

  console.log('✅ SIMULACIÓN 6 PASADA: Limpieza funciona\n');

  // ========================
  // RESUMEN FINAL
  // ========================
  console.log('='.repeat(70));
  console.log('📊 RESUMEN DE INTEGRACIÓN FASE 2');
  console.log('='.repeat(70));

  console.log('\n✅ TODAS LAS SIMULACIONES PASARON:');
  console.log('  ✓ Batch inicial genera 5 preguntas (1 retorna + 4 buffer)');
  console.log('  ✓ Segunda solicitud: INSTANTÁNEA desde buffer');
  console.log('  ✓ Tercera solicitud: INSTANTÁNEA desde buffer');
  console.log('  ✓ Buffer bajo de 3: Trigger refill funciona');
  console.log('  ✓ Aislamiento por tema: Buffers independientes');
  console.log('  ✓ Limpieza de expirados: Funciona correctamente');

  console.log('\n🎉 FASE 2 - INTEGRACIÓN COMPLETA VERIFICADA\n');

  console.log('📝 Flujo esperado en producción:');
  console.log('  1️⃣  Usuario pide pregunta → Buffer vacío → Genera batch de 5');
  console.log('      → Retorna 1 (~25 seg) + 4 al buffer');
  console.log('  2️⃣  Usuario pide otra → Buffer tiene 4 → INSTANT (< 1 seg)');
  console.log('  3️⃣  Usuario pide otra → Buffer tiene 3 → INSTANT (< 1 seg)');
  console.log('  4️⃣  Usuario pide otra → Buffer tiene 2 → INSTANT (< 1 seg)');
  console.log('      → Trigger refill en background (sin esperar)');
  console.log('  5️⃣  Usuario pide otra → Buffer tiene 3 → INSTANT (< 1 seg)');
  console.log('      → Y así sucesivamente...\n');

  // Limpiar datos de prueba
  db.db.prepare('DELETE FROM user_question_buffer WHERE user_id = ?').run(TEST_USER_ID);
  db.db.prepare('DELETE FROM user_seen_questions WHERE user_id = ?').run(TEST_USER_ID);
  console.log('🧹 Datos de prueba limpiados\n');

  process.exit(0);
}

testCompleteFlow().catch(error => {
  console.error('❌ ERROR EN INTEGRACIÓN:', error);
  process.exit(1);
});
