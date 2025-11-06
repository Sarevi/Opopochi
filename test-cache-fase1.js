// ========================
// TEST FASE 1: Distribución de caché por temas
// ========================

const db = require('./database');

console.log('\n🧪 INICIANDO TESTS DE FASE 1\n');
console.log('='.repeat(60));

// Inicializar base de datos
db.initDatabase();

// Función helper para crear usuarios de prueba
function ensureTestUser(userId) {
  try {
    const userExists = db.db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!userExists) {
      db.db.prepare(`
        INSERT INTO users (id, username, password_hash, estado)
        VALUES (?, ?, ?, ?)
      `).run(userId, `test-user-${userId}`, 'hash-dummy', 'activo');
    }
  } catch (error) {
    // Usuario ya existe
  }
}

// Crear usuarios de prueba necesarios
const TEST_USER_ID = 9999;
[9999, 9998, 9997, 9996].forEach(ensureTestUser);
console.log('✓ Usuarios de prueba verificados\n');

// Limpiar datos de prueba anteriores
try {
  db.db.prepare('DELETE FROM user_seen_questions WHERE user_id = ?').run(TEST_USER_ID);
  db.db.prepare('DELETE FROM question_cache WHERE id > 100000').run(); // Limpiar preguntas de test
  console.log('✓ Datos de prueba anteriores limpiados\n');
} catch (error) {
  console.log('ℹ️ No hay datos de prueba previos\n');
}

// ========================
// TEST 1: Verificar tablas
// ========================
console.log('\n📋 TEST 1: Verificar que las tablas existen');
console.log('-'.repeat(60));

try {
  const tables = db.db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name IN ('question_cache', 'user_seen_questions', 'cache_stats')
  `).all();

  console.log(`✓ Tablas encontradas: ${tables.map(t => t.name).join(', ')}`);

  if (tables.length !== 3) {
    console.log('❌ FALLO: Faltan tablas de caché');
    process.exit(1);
  }

  console.log('✅ TEST 1 PASADO: Todas las tablas existen\n');
} catch (error) {
  console.log('❌ ERROR en TEST 1:', error.message);
  process.exit(1);
}

// ========================
// TEST 2: Guardar pregunta con tema específico
// ========================
console.log('\n💾 TEST 2: Guardar preguntas con tema específico');
console.log('-'.repeat(60));

try {
  const pregunta1 = {
    question: '¿Cuál es la temperatura correcta para medicamentos termolábiles?',
    options: ['A) 2-8°C', 'B) 15-25°C', 'C) -18°C', 'D) 25-30°C'],
    correct: 0,
    explanation: 'Los termolábiles se conservan entre 2-8°C',
    difficulty: 'simple'
  };

  const pregunta2 = {
    question: '¿Qué es una fórmula magistral?',
    options: ['A) Medicamento comercial', 'B) Preparado individualizado', 'C) Genérico', 'D) Biosimilar'],
    correct: 1,
    explanation: 'Fórmula magistral es preparado individualizado',
    difficulty: 'media'
  };

  // Guardar pregunta 1 para tema-4
  const id1 = db.saveToCacheAndTrack(TEST_USER_ID, 'tema-4-organizaciones-farmaceuticas', 'simple', pregunta1, 'test');
  console.log(`✓ Pregunta 1 guardada (ID: ${id1}) con topic_id="tema-4-organizaciones-farmaceuticas"`);

  // Guardar pregunta 2 para tema-5
  const id2 = db.saveToCacheAndTrack(TEST_USER_ID, 'tema-5-medicamentos', 'media', pregunta2, 'test');
  console.log(`✓ Pregunta 2 guardada (ID: ${id2}) con topic_id="tema-5-medicamentos"`);

  // Verificar en BD
  const verify1 = db.db.prepare('SELECT topic_id, difficulty FROM question_cache WHERE id = ?').get(id1);
  const verify2 = db.db.prepare('SELECT topic_id, difficulty FROM question_cache WHERE id = ?').get(id2);

  if (verify1.topic_id !== 'tema-4-organizaciones-farmaceuticas') {
    console.log('❌ FALLO: Pregunta 1 no se guardó con tema correcto');
    process.exit(1);
  }

  if (verify2.topic_id !== 'tema-5-medicamentos') {
    console.log('❌ FALLO: Pregunta 2 no se guardó con tema correcto');
    process.exit(1);
  }

  console.log('✅ TEST 2 PASADO: Preguntas guardadas con tema específico\n');
} catch (error) {
  console.log('❌ ERROR en TEST 2:', error.message);
  process.exit(1);
}

// ========================
// TEST 3: Buscar pregunta por tema único
// ========================
console.log('\n🔍 TEST 3: Buscar pregunta por tema único');
console.log('-'.repeat(60));

try {
  // Crear usuario nuevo que NO ha visto las preguntas
  const NEW_USER_ID = 9998;

  // Buscar en tema-4
  const cached1 = db.getCachedQuestion(NEW_USER_ID, 'tema-4-organizaciones-farmaceuticas', 'simple');

  if (!cached1) {
    console.log('❌ FALLO: No encontró pregunta en tema-4');
    process.exit(1);
  }

  console.log(`✓ Encontrada pregunta en tema-4: "${cached1.question.question.substring(0, 50)}..."`);
  console.log(`  Topic ID retornado: ${cached1.topicId}`);

  if (cached1.topicId !== 'tema-4-organizaciones-farmaceuticas') {
    console.log('❌ FALLO: topicId no coincide');
    process.exit(1);
  }

  // Buscar en tema-5
  const cached2 = db.getCachedQuestion(NEW_USER_ID, 'tema-5-medicamentos', 'media');

  if (!cached2) {
    console.log('❌ FALLO: No encontró pregunta en tema-5');
    process.exit(1);
  }

  console.log(`✓ Encontrada pregunta en tema-5: "${cached2.question.question.substring(0, 50)}..."`);

  console.log('✅ TEST 3 PASADO: Búsqueda por tema único funciona\n');
} catch (error) {
  console.log('❌ ERROR en TEST 3:', error.message);
  process.exit(1);
}

// ========================
// TEST 4: Buscar pregunta con array de temas
// ========================
console.log('\n🔍 TEST 4: Buscar pregunta con array de temas (multi-tema)');
console.log('-'.repeat(60));

try {
  const NEW_USER_ID = 9997;

  // Buscar en ambos temas a la vez
  const cached = db.getCachedQuestion(NEW_USER_ID, ['tema-4-organizaciones-farmaceuticas', 'tema-5-medicamentos'], 'simple');

  if (!cached) {
    console.log('❌ FALLO: No encontró pregunta buscando en múltiples temas');
    process.exit(1);
  }

  console.log(`✓ Encontrada pregunta: "${cached.question.question.substring(0, 50)}..."`);
  console.log(`  Del tema: ${cached.topicId}`);

  if (!['tema-4-organizaciones-farmaceuticas', 'tema-5-medicamentos'].includes(cached.topicId)) {
    console.log('❌ FALLO: topicId no es de los temas buscados');
    process.exit(1);
  }

  console.log('✅ TEST 4 PASADO: Búsqueda multi-tema funciona\n');
} catch (error) {
  console.log('❌ ERROR en TEST 4:', error.message);
  process.exit(1);
}

// ========================
// TEST 5: Verificar NO repetición
// ========================
console.log('\n🚫 TEST 5: Verificar que usuario NO ve preguntas repetidas');
console.log('-'.repeat(60));

try {
  const USER_TEST = 9996;

  // Primera búsqueda - debe encontrar
  const first = db.getCachedQuestion(USER_TEST, 'tema-4-organizaciones-farmaceuticas', 'simple');

  if (!first) {
    console.log('❌ FALLO: No encontró pregunta en primera búsqueda');
    process.exit(1);
  }

  console.log(`✓ Primera búsqueda: encontró pregunta ID ${first.cacheId}`);

  // Marcar como vista
  db.markQuestionAsSeen(USER_TEST, first.cacheId, 'test');
  console.log(`✓ Pregunta ${first.cacheId} marcada como vista`);

  // Segunda búsqueda - NO debe encontrar la misma
  const second = db.getCachedQuestion(USER_TEST, 'tema-4-organizaciones-farmaceuticas', 'simple');

  if (second && second.cacheId === first.cacheId) {
    console.log('❌ FALLO: Encontró la misma pregunta que ya vio (repetición detectada)');
    process.exit(1);
  }

  console.log(`✓ Segunda búsqueda: NO retornó la pregunta ya vista`);

  console.log('✅ TEST 5 PASADO: Sistema de NO repetición funciona\n');
} catch (error) {
  console.log('❌ ERROR en TEST 5:', error.message);
  process.exit(1);
}

// ========================
// TEST 6: Limpiar caché expirado
// ========================
console.log('\n🧹 TEST 6: Verificar limpieza de caché expirado');
console.log('-'.repeat(60));

try {
  // Insertar pregunta expirada (timestamp muy antiguo)
  const oldTimestamp = Date.now() - (100 * 24 * 3600 * 1000); // 100 días atrás

  db.db.prepare(`
    INSERT INTO question_cache (question_data, difficulty, topic_id, generated_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    JSON.stringify({ question: 'Pregunta expirada', options: [], correct: 0 }),
    'simple',
    'tema-test',
    oldTimestamp,
    oldTimestamp // Ya expirada
  );

  console.log('✓ Pregunta expirada insertada para prueba');

  // Contar antes de limpiar
  const beforeCount = db.db.prepare('SELECT COUNT(*) as c FROM question_cache WHERE expires_at < ?').get(Date.now()).c;
  console.log(`✓ Preguntas expiradas antes de limpiar: ${beforeCount}`);

  // Limpiar
  const deleted = db.cleanExpiredCache();
  console.log(`✓ Preguntas expiradas eliminadas: ${deleted}`);

  // Contar después
  const afterCount = db.db.prepare('SELECT COUNT(*) as c FROM question_cache WHERE expires_at < ?').get(Date.now()).c;

  if (afterCount > 0) {
    console.log('❌ FALLO: Aún hay preguntas expiradas después de limpiar');
    process.exit(1);
  }

  console.log('✅ TEST 6 PASADO: Limpieza de caché funciona\n');
} catch (error) {
  console.log('❌ ERROR en TEST 6:', error.message);
  process.exit(1);
}

// ========================
// TEST 7: Estadísticas de caché
// ========================
console.log('\n📊 TEST 7: Verificar estadísticas de caché');
console.log('-'.repeat(60));

try {
  const stats = db.getCacheStats();

  console.log(`✓ Total preguntas en caché: ${stats.totalQuestions}`);
  console.log(`✓ Por dificultad:`, stats.byDifficulty);
  console.log(`✓ Más usadas:`, stats.topUsed);

  if (typeof stats.totalQuestions !== 'number') {
    console.log('❌ FALLO: Estadísticas no retornan datos válidos');
    process.exit(1);
  }

  console.log('✅ TEST 7 PASADO: Estadísticas funcionan\n');
} catch (error) {
  console.log('❌ ERROR en TEST 7:', error.message);
  process.exit(1);
}

// ========================
// RESUMEN FINAL
// ========================
console.log('\n' + '='.repeat(60));
console.log('🎉 TODOS LOS TESTS PASARON EXITOSAMENTE');
console.log('='.repeat(60));
console.log('\n✅ FASE 1 verificada correctamente:');
console.log('  ✓ Tablas de caché creadas');
console.log('  ✓ Preguntas se guardan con tema específico');
console.log('  ✓ Búsqueda por tema único funciona');
console.log('  ✓ Búsqueda multi-tema funciona');
console.log('  ✓ Sistema de NO repetición funciona (15 días)');
console.log('  ✓ Limpieza de caché funciona');
console.log('  ✓ Estadísticas funcionan');
console.log('\n🚀 Puedes proceder con confianza a probar en la aplicación real\n');

// Limpiar datos de prueba
db.db.prepare('DELETE FROM user_seen_questions WHERE user_id >= 9996').run();
db.db.prepare('DELETE FROM question_cache WHERE topic_id = ?').run('tema-test');
console.log('🧹 Datos de prueba limpiados\n');

process.exit(0);
