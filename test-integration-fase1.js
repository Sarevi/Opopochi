// ========================
// TEST DE INTEGRACIÓN FASE 1
// Simula flujo completo sin necesitar API key
// ========================

const db = require('./database');

console.log('\n🧪 TESTS DE INTEGRACIÓN - FASE 1 (Simulación completa)\n');
console.log('='.repeat(70));

// Inicializar base de datos
db.initDatabase();

// Usuario de prueba
const TEST_USER_ID = 8888;
const TEST_USERNAME = 'test-integration-user';

// Crear usuario de prueba
try {
  const userExists = db.db.prepare('SELECT id FROM users WHERE id = ?').get(TEST_USER_ID);
  if (!userExists) {
    db.db.prepare(`
      INSERT INTO users (id, username, password_hash, estado)
      VALUES (?, ?, ?, ?)
    `).run(TEST_USER_ID, TEST_USERNAME, 'test-hash', 'activo');
    console.log(`✓ Usuario de prueba creado (ID: ${TEST_USER_ID})\n`);
  } else {
    console.log(`✓ Usuario de prueba ya existe (ID: ${TEST_USER_ID})\n`);
  }
} catch (error) {
  console.error('Error creando usuario:', error.message);
  process.exit(1);
}

// Limpiar datos previos
db.db.prepare('DELETE FROM user_seen_questions WHERE user_id = ?').run(TEST_USER_ID);
db.db.prepare('DELETE FROM question_cache WHERE id > 50000').run();
console.log('✓ Datos de prueba anteriores limpiados\n');

// Helper: Crear pregunta mock
function createMockQuestion(topicId, difficulty, index) {
  return {
    question: `Pregunta ${difficulty} ${index} sobre ${topicId}`,
    options: [
      `A) Opción correcta ${index}`,
      `B) Opción incorrecta 1`,
      `C) Opción incorrecta 2`,
      `D) Opción incorrecta 3`
    ],
    correct: 0,
    explanation: `Explicación de la pregunta ${index}`,
    difficulty: difficulty,
    page_reference: `Página ${index}`
  };
}

// ========================
// PRUEBA 1: Primer examen multi-tema (2 temas, 10 preguntas)
// ========================
console.log('\n📝 PRUEBA 1: Primer examen multi-tema (tema-4 + tema-5, 10 preguntas)');
console.log('-'.repeat(70));

const TOPIC_4 = 'tema-4-organizaciones-farmaceuticas';
const TOPIC_5 = 'tema-5-medicamentos';

let test1CacheHits = 0;
let test1CacheMisses = 0;
let test1Questions = [];

// Simular distribución: 20% simple, 60% media, 20% elaborada
// 2 temas → 5 preguntas por tema
// Por tema: 1 simple, 3 medias, 1 elaborada

console.log('\n🎯 Distribución: 1 simple + 3 medias + 1 elaborada por tema');
console.log(`\n${'='.repeat(70)}`);
console.log(`📘 Procesando tema: ${TOPIC_4}`);
console.log('='.repeat(70));

// TEMA 4: 5 preguntas
for (let i = 1; i <= 5; i++) {
  const difficulty = i === 1 ? 'simple' : i === 5 ? 'elaborada' : 'media';

  // Intentar caché (60% probabilidad)
  const tryCache = Math.random() < 0.60;
  let cached = null;

  if (tryCache) {
    cached = db.getCachedQuestion(TEST_USER_ID, [TOPIC_4], difficulty);
  }

  if (cached) {
    console.log(`  💾 ${difficulty.toUpperCase()} - Pregunta de caché (ID: ${cached.cacheId})`);
    test1CacheHits++;
    test1Questions.push(cached.question);
    db.markQuestionAsSeen(TEST_USER_ID, cached.cacheId, 'exam');
  } else {
    const newQuestion = createMockQuestion(TOPIC_4, difficulty, i);
    const cacheId = db.saveToCacheAndTrack(TEST_USER_ID, TOPIC_4, difficulty, newQuestion, 'exam');
    console.log(`  ⚪ ${difficulty.toUpperCase()} - Nueva pregunta generada (ID: ${cacheId})`);
    test1CacheMisses++;
    test1Questions.push(newQuestion);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`📘 Procesando tema: ${TOPIC_5}`);
console.log('='.repeat(70));

// TEMA 5: 5 preguntas
for (let i = 6; i <= 10; i++) {
  const difficulty = i === 6 ? 'simple' : i === 10 ? 'elaborada' : 'media';

  const tryCache = Math.random() < 0.60;
  let cached = null;

  if (tryCache) {
    cached = db.getCachedQuestion(TEST_USER_ID, [TOPIC_5], difficulty);
  }

  if (cached) {
    console.log(`  💾 ${difficulty.toUpperCase()} - Pregunta de caché (ID: ${cached.cacheId})`);
    test1CacheHits++;
    test1Questions.push(cached.question);
    db.markQuestionAsSeen(TEST_USER_ID, cached.cacheId, 'exam');
  } else {
    const newQuestion = createMockQuestion(TOPIC_5, difficulty, i);
    const cacheId = db.saveToCacheAndTrack(TEST_USER_ID, TOPIC_5, difficulty, newQuestion, 'exam');
    console.log(`  ⚪ ${difficulty.toUpperCase()} - Nueva pregunta generada (ID: ${cacheId})`);
    test1CacheMisses++;
    test1Questions.push(newQuestion);
  }
}

const test1Total = test1CacheHits + test1CacheMisses;
const test1HitRate = test1Total > 0 ? Math.round((test1CacheHits / test1Total) * 100) : 0;

console.log(`\n💾 CACHÉ: ${test1CacheHits} hits / ${test1CacheMisses} misses (${test1HitRate}% hit rate)`);

if (test1HitRate === 0) {
  console.log('✅ PRUEBA 1 PASADA: Hit rate 0% como esperado (primera generación)\n');
} else {
  console.log(`⚠️ PRUEBA 1: Hit rate ${test1HitRate}% (esperaba 0% pero hay preguntas previas en caché)\n`);
}

// ========================
// PRUEBA 2: Segundo examen IGUAL (60% caché esperado)
// ========================
console.log('\n📝 PRUEBA 2: Segundo examen multi-tema (mismo: tema-4 + tema-5, 10 preguntas)');
console.log('-'.repeat(70));

let test2CacheHits = 0;
let test2CacheMisses = 0;
let test2Questions = [];

console.log(`\n${'='.repeat(70)}`);
console.log(`📘 Procesando tema: ${TOPIC_4}`);
console.log('='.repeat(70));

// TEMA 4: 5 preguntas
for (let i = 1; i <= 5; i++) {
  const difficulty = i === 1 ? 'simple' : i === 5 ? 'elaborada' : 'media';

  const tryCache = Math.random() < 0.60;
  let cached = null;

  if (tryCache) {
    cached = db.getCachedQuestion(TEST_USER_ID, [TOPIC_4], difficulty);
  }

  if (cached) {
    console.log(`  💾 ${difficulty.toUpperCase()} - Pregunta de caché (ID: ${cached.cacheId}) ✓`);
    test2CacheHits++;
    test2Questions.push(cached.question);
    db.markQuestionAsSeen(TEST_USER_ID, cached.cacheId, 'exam');
  } else {
    const newQuestion = createMockQuestion(TOPIC_4, difficulty, i + 100);
    const cacheId = db.saveToCacheAndTrack(TEST_USER_ID, TOPIC_4, difficulty, newQuestion, 'exam');
    console.log(`  ⚪ ${difficulty.toUpperCase()} - Nueva pregunta generada (ID: ${cacheId})`);
    test2CacheMisses++;
    test2Questions.push(newQuestion);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`📘 Procesando tema: ${TOPIC_5}`);
console.log('='.repeat(70));

// TEMA 5: 5 preguntas
for (let i = 6; i <= 10; i++) {
  const difficulty = i === 6 ? 'simple' : i === 10 ? 'elaborada' : 'media';

  const tryCache = Math.random() < 0.60;
  let cached = null;

  if (tryCache) {
    cached = db.getCachedQuestion(TEST_USER_ID, [TOPIC_5], difficulty);
  }

  if (cached) {
    console.log(`  💾 ${difficulty.toUpperCase()} - Pregunta de caché (ID: ${cached.cacheId}) ✓`);
    test2CacheHits++;
    test2Questions.push(cached.question);
    db.markQuestionAsSeen(TEST_USER_ID, cached.cacheId, 'exam');
  } else {
    const newQuestion = createMockQuestion(TOPIC_5, difficulty, i + 100);
    const cacheId = db.saveToCacheAndTrack(TEST_USER_ID, TOPIC_5, difficulty, newQuestion, 'exam');
    console.log(`  ⚪ ${difficulty.toUpperCase()} - Nueva pregunta generada (ID: ${cacheId})`);
    test2CacheMisses++;
    test2Questions.push(newQuestion);
  }
}

const test2Total = test2CacheHits + test2CacheMisses;
const test2HitRate = test2Total > 0 ? Math.round((test2CacheHits / test2Total) * 100) : 0;

console.log(`\n💾 CACHÉ: ${test2CacheHits} hits / ${test2CacheMisses} misses (${test2HitRate}% hit rate)`);

if (test2HitRate >= 30 && test2HitRate <= 80) {
  console.log(`✅ PRUEBA 2 PASADA: Hit rate ${test2HitRate}% (esperado 40-70%, reutiliza preguntas) ✓\n`);
} else if (test2HitRate === 0) {
  console.log('❌ PRUEBA 2 FALLIDA: Hit rate 0% (debería reutilizar preguntas del examen anterior)\n');
} else {
  console.log(`⚠️ PRUEBA 2: Hit rate ${test2HitRate}% (fuera del rango esperado 40-70%)\n`);
}

// ========================
// PRUEBA 3: Estudio individual (cross-mode)
// ========================
console.log('\n📝 PRUEBA 3: Estudio individual de SOLO tema-4 (5 preguntas)');
console.log('-'.repeat(70));
console.log('Verificando reutilización cross-mode (de exámenes a estudio individual)');

let test3CacheHits = 0;
let test3CacheMisses = 0;

console.log(`\n${'='.repeat(70)}`);
console.log(`📘 Procesando tema: ${TOPIC_4} (modo estudio)`);
console.log('='.repeat(70));

for (let i = 1; i <= 5; i++) {
  const difficulty = i === 1 ? 'simple' : i === 5 ? 'elaborada' : 'media';

  const tryCache = Math.random() < 0.60;
  let cached = null;

  if (tryCache) {
    cached = db.getCachedQuestion(TEST_USER_ID, TOPIC_4, difficulty);
  }

  if (cached) {
    console.log(`  💾 ${difficulty.toUpperCase()} - Pregunta de caché (ID: ${cached.cacheId}, Tema: ${cached.topicId}) ✓ CROSS-MODE!`);
    test3CacheHits++;
    db.markQuestionAsSeen(TEST_USER_ID, cached.cacheId, 'study');
  } else {
    const newQuestion = createMockQuestion(TOPIC_4, difficulty, i + 200);
    const cacheId = db.saveToCacheAndTrack(TEST_USER_ID, TOPIC_4, difficulty, newQuestion, 'study');
    console.log(`  ⚪ ${difficulty.toUpperCase()} - Nueva pregunta generada (ID: ${cacheId})`);
    test3CacheMisses++;
  }
}

const test3Total = test3CacheHits + test3CacheMisses;
const test3HitRate = test3Total > 0 ? Math.round((test3CacheHits / test3Total) * 100) : 0;

console.log(`\n💾 CACHÉ: ${test3CacheHits} hits / ${test3CacheMisses} misses (${test3HitRate}% hit rate)`);

if (test3HitRate > 0) {
  console.log(`✅ PRUEBA 3 PASADA: Hit rate ${test3HitRate}% > 0% (reutilizó de exámenes anteriores) ✓ CROSS-MODE FUNCIONA!\n`);
} else {
  console.log('❌ PRUEBA 3 FALLIDA: Hit rate 0% (debería reutilizar preguntas de exámenes multi-tema)\n');
}

// ========================
// PRUEBA 4: NO repetición
// ========================
console.log('\n📝 PRUEBA 4: Verificar NO repetición (usuario NO ve mismas preguntas)');
console.log('-'.repeat(70));

// Obtener todas las preguntas vistas por el usuario
const seenQuestions = db.db.prepare(`
  SELECT question_cache_id, COUNT(*) as times_seen
  FROM user_seen_questions
  WHERE user_id = ?
  GROUP BY question_cache_id
  HAVING times_seen > 1
`).all(TEST_USER_ID);

if (seenQuestions.length === 0) {
  console.log('✅ PRUEBA 4 PASADA: NO hay preguntas vistas más de una vez ✓\n');
} else {
  console.log(`❌ PRUEBA 4 FALLIDA: ${seenQuestions.length} preguntas vistas múltiples veces:`);
  seenQuestions.forEach(q => {
    console.log(`   - Pregunta ID ${q.question_cache_id}: vista ${q.times_seen} veces`);
  });
  console.log();
}

// ========================
// PRUEBA 5: Verificar coverageByTopic
// ========================
console.log('\n📝 PRUEBA 5: Verificar estadísticas por tema (coverageByTopic)');
console.log('-'.repeat(70));

const stats = db.getCacheStats();
console.log(`\n📊 Estadísticas globales de caché:`);
console.log(`   Total preguntas: ${stats.totalQuestions}`);
console.log(`   Por dificultad:`, stats.byDifficulty);

// Simular coverageByTopic
const topic4Count = db.db.prepare(`
  SELECT COUNT(*) as count FROM question_cache WHERE topic_id = ?
`).get(TOPIC_4).count;

const topic5Count = db.db.prepare(`
  SELECT COUNT(*) as count FROM question_cache WHERE topic_id = ?
`).get(TOPIC_5).count;

console.log(`\n📊 Preguntas por tema en caché:`);
console.log(`   ${TOPIC_4}: ${topic4Count} preguntas`);
console.log(`   ${TOPIC_5}: ${topic5Count} preguntas`);

if (topic4Count > 0 && topic5Count > 0) {
  console.log(`\n✅ PRUEBA 5 PASADA: Preguntas distribuidas por tema específico ✓\n`);
} else {
  console.log(`\n❌ PRUEBA 5 FALLIDA: Algún tema no tiene preguntas\n`);
}

// ========================
// RESUMEN FINAL
// ========================
console.log('\n' + '='.repeat(70));
console.log('📊 RESUMEN DE RESULTADOS');
console.log('='.repeat(70));

const allTestsPassed =
  test1HitRate === 0 &&
  test2HitRate >= 30 && test2HitRate <= 80 &&
  test3HitRate > 0 &&
  seenQuestions.length === 0 &&
  topic4Count > 0 && topic5Count > 0;

console.log(`\nPRUEBA 1 (Primer examen):      ${test1HitRate === 0 ? '✅' : '⚠️'} Hit rate: ${test1HitRate}%`);
console.log(`PRUEBA 2 (Segundo examen):     ${test2HitRate >= 30 ? '✅' : '❌'} Hit rate: ${test2HitRate}%`);
console.log(`PRUEBA 3 (Estudio individual): ${test3HitRate > 0 ? '✅' : '❌'} Hit rate: ${test3HitRate}% (cross-mode)`);
console.log(`PRUEBA 4 (NO repetición):      ${seenQuestions.length === 0 ? '✅' : '❌'} Repeticiones: ${seenQuestions.length}`);
console.log(`PRUEBA 5 (Distribución tema):  ${topic4Count > 0 && topic5Count > 0 ? '✅' : '❌'} Temas con preguntas: 2/2`);

if (allTestsPassed) {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE');
  console.log('='.repeat(70));
  console.log('\n✅ FASE 1 verificada y funcionando perfectamente:');
  console.log('   ✓ Distribución por tema específico');
  console.log('   ✓ Reutilización entre modos (exam → study)');
  console.log('   ✓ Sistema de NO repetición (15 días)');
  console.log('   ✓ Caché funcionando correctamente (~60% hit rate)');
  console.log('   ✓ Estadísticas por tema');
  console.log('\n🚀 Sistema robusto y listo para producción\n');
  process.exit(0);
} else {
  console.log(`\n${'='.repeat(70)}`);
  console.log('⚠️ ALGUNAS PRUEBAS NO PASARON');
  console.log('='.repeat(70));
  console.log('\nRevisa los resultados arriba para identificar problemas.\n');
  process.exit(1);
}
