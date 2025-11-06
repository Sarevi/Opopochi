// ========================
// TEST FINAL FASE 1 - Base de datos limpia
// ========================

const db = require('./database');

console.log('\n🧪 TEST FINAL FASE 1 (Base de datos limpia)\n');
console.log('='.repeat(70));

db.initDatabase();

const USER_ID = 7777;
const TOPIC_4 = 'tema-4-organizaciones-farmaceuticas';
const TOPIC_5 = 'tema-5-medicamentos';

function createMockQuestion(topicId, difficulty, index) {
  return {
    question: `${difficulty.toUpperCase()}: Pregunta ${index} de ${topicId}`,
    options: [`A) Correcta ${index}`, `B) Incorrecta 1`, `C) Incorrecta 2`, `D) Incorrecta 3`],
    correct: 0,
    explanation: `Explicación ${index}`,
    difficulty,
    page_reference: `Pág ${index}`
  };
}

console.log('✅ Usuario de prueba: 7777\n');

// ========================
// PRUEBA 1: Primer examen (0% cache esperado)
// ========================
console.log('📝 PRUEBA 1: Primer examen (tema-4 + tema-5, 10 preguntas)');
console.log('-'.repeat(70));

let p1_hits = 0, p1_misses = 0;

// Tema 4: 5 preguntas (1S, 3M, 1E)
for (let i = 1; i <= 5; i++) {
  const diff = i === 1 ? 'simple' : i === 5 ? 'elaborada' : 'media';
  if (Math.random() < 0.6 && db.getCachedQuestion(USER_ID, [TOPIC_4], diff)) {
    p1_hits++;
  } else {
    db.saveToCacheAndTrack(USER_ID, TOPIC_4, diff, createMockQuestion(TOPIC_4, diff, i), 'exam');
    p1_misses++;
  }
}

// Tema 5: 5 preguntas
for (let i = 6; i <= 10; i++) {
  const diff = i === 6 ? 'simple' : i === 10 ? 'elaborada' : 'media';
  if (Math.random() < 0.6 && db.getCachedQuestion(USER_ID, [TOPIC_5], diff)) {
    p1_hits++;
  } else {
    db.saveToCacheAndTrack(USER_ID, TOPIC_5, diff, createMockQuestion(TOPIC_5, diff, i), 'exam');
    p1_misses++;
  }
}

const p1_rate = Math.round((p1_hits / (p1_hits + p1_misses)) * 100);
console.log(`💾 CACHÉ: ${p1_hits} hits / ${p1_misses} misses (${p1_rate}% hit rate)`);
console.log(p1_rate === 0 ? '✅ PASÓ: 0% como esperado\n' : `⚠️ ${p1_rate}% (esperaba 0%)\n`);

// ========================
// PRUEBA 2: Segundo examen (60% cache esperado)
// ========================
console.log('📝 PRUEBA 2: Segundo examen IGUAL (60% cache esperado)');
console.log('-'.repeat(70));

let p2_hits = 0, p2_misses = 0;

for (let i = 1; i <= 5; i++) {
  const diff = i === 1 ? 'simple' : i === 5 ? 'elaborada' : 'media';
  const cached = Math.random() < 0.6 ? db.getCachedQuestion(USER_ID, [TOPIC_4], diff) : null;
  if (cached) {
    db.markQuestionAsSeen(USER_ID, cached.cacheId, 'exam');
    p2_hits++;
  } else {
    db.saveToCacheAndTrack(USER_ID, TOPIC_4, diff, createMockQuestion(TOPIC_4, diff, i+10), 'exam');
    p2_misses++;
  }
}

for (let i = 6; i <= 10; i++) {
  const diff = i === 6 ? 'simple' : i === 10 ? 'elaborada' : 'media';
  const cached = Math.random() < 0.6 ? db.getCachedQuestion(USER_ID, [TOPIC_5], diff) : null;
  if (cached) {
    db.markQuestionAsSeen(USER_ID, cached.cacheId, 'exam');
    p2_hits++;
  } else {
    db.saveToCacheAndTrack(USER_ID, TOPIC_5, diff, createMockQuestion(TOPIC_5, diff, i+10), 'exam');
    p2_misses++;
  }
}

const p2_rate = Math.round((p2_hits / (p2_hits + p2_misses)) * 100);
console.log(`💾 CACHÉ: ${p2_hits} hits / ${p2_misses} misses (${p2_rate}% hit rate)`);
console.log(p2_rate >= 30 ? `✅ PASÓ: ${p2_rate}% (esperado 40-70%)\n` : `❌ FALLÓ: ${p2_rate}% (esperaba >30%)\n`);

// ========================
// PRUEBA 3: Estudio individual (cross-mode)
// ========================
console.log('📝 PRUEBA 3: Estudio individual SOLO tema-4 (cross-mode)');
console.log('-'.repeat(70));

let p3_hits = 0, p3_misses = 0;

for (let i = 1; i <= 5; i++) {
  const diff = i === 1 ? 'simple' : i === 5 ? 'elaborada' : 'media';
  const cached = Math.random() < 0.6 ? db.getCachedQuestion(USER_ID, TOPIC_4, diff) : null;
  if (cached) {
    db.markQuestionAsSeen(USER_ID, cached.cacheId, 'study');
    p3_hits++;
  } else {
    db.saveToCacheAndTrack(USER_ID, TOPIC_4, diff, createMockQuestion(TOPIC_4, diff, i+20), 'study');
    p3_misses++;
  }
}

const p3_rate = Math.round((p3_hits / (p3_hits + p3_misses)) * 100);
console.log(`💾 CACHÉ: ${p3_hits} hits / ${p3_misses} misses (${p3_rate}% hit rate)`);
console.log(p3_hits > 0 ? `✅ PASÓ: ${p3_rate}% > 0 (reutilizó de exámenes) ✓ CROSS-MODE!\n` : `❌ FALLÓ: 0% (debería reutilizar)\n`);

// ========================
// PRUEBA 4: NO repetición
// ========================
console.log('📝 PRUEBA 4: NO repetición');
console.log('-'.repeat(70));

const repetidas = db.db.prepare(`
  SELECT question_cache_id, COUNT(*) as veces
  FROM user_seen_questions
  WHERE user_id = ?
  GROUP BY question_cache_id
  HAVING veces > 1
`).all(USER_ID);

console.log(repetidas.length === 0 ? `✅ PASÓ: NO hay repeticiones\n` : `❌ FALLÓ: ${repetidas.length} preguntas repetidas\n`);

// ========================
// PRUEBA 5: Distribución por tema
// ========================
console.log('📝 PRUEBA 5: Distribución por tema');
console.log('-'.repeat(70));

const t4 = db.db.prepare('SELECT COUNT(*) as c FROM question_cache WHERE topic_id = ?').get(TOPIC_4).c;
const t5 = db.db.prepare('SELECT COUNT(*) as c FROM question_cache WHERE topic_id = ?').get(TOPIC_5).c;

console.log(`   ${TOPIC_4}: ${t4} preguntas`);
console.log(`   ${TOPIC_5}: ${t5} preguntas`);
console.log(t4 > 0 && t5 > 0 ? `✅ PASÓ: Ambos temas con preguntas\n` : `❌ FALLÓ: Algún tema sin preguntas\n`);

// ========================
// RESUMEN
// ========================
console.log('='.repeat(70));
console.log('📊 RESUMEN FINAL');
console.log('='.repeat(70));

const todoPaso = p1_rate === 0 && p2_rate >= 30 && p3_hits > 0 && repetidas.length === 0 && t4 > 0 && t5 > 0;

console.log(`\nPRUEBA 1 (Primer examen):      ${p1_rate === 0 ? '✅' : '⚠️'} ${p1_rate}%`);
console.log(`PRUEBA 2 (Segundo examen):     ${p2_rate >= 30 ? '✅' : '❌'} ${p2_rate}%`);
console.log(`PRUEBA 3 (Estudio individual): ${p3_hits > 0 ? '✅' : '❌'} ${p3_rate}% (${p3_hits} hits)`);
console.log(`PRUEBA 4 (NO repetición):      ${repetidas.length === 0 ? '✅' : '❌'} ${repetidas.length} repeticiones`);
console.log(`PRUEBA 5 (Distribución):       ${t4 > 0 && t5 > 0 ? '✅' : '❌'} ${t4} + ${t5} preguntas\n`);

if (todoPaso) {
  console.log('🎉 TODAS LAS PRUEBAS PASARON - FASE 1 COMPLETAMENTE FUNCIONAL\n');
  process.exit(0);
} else {
  console.log('⚠️ Algunas pruebas no pasaron completamente\n');
  process.exit(1);
}
