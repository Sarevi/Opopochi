// ========================
// SISTEMA DE BASE DE DATOS - SQLite
// ========================

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// Crear base de datos
const dbPath = path.join(__dirname, 'oposiciones.db');
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// ========================
// CREAR TABLAS
// ========================

function initDatabase() {
  // Tabla de usuarios
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      estado TEXT DEFAULT 'bloqueado',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_access DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de estadísticas por usuario y tema
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      topic_id TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      total_questions INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      accuracy INTEGER DEFAULT 0,
      last_studied DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, topic_id)
    )
  `);

  // Tabla de preguntas falladas
  db.exec(`
    CREATE TABLE IF NOT EXISTS failed_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      topic_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correct INTEGER NOT NULL,
      user_answer INTEGER,
      explanation TEXT,
      difficulty TEXT,
      page_reference TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabla de actividad (para tracking de uso)
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      topic_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabla de chunks usados (para evitar repeticiones - Opción B)
  db.exec(`
    CREATE TABLE IF NOT EXISTS chunk_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      topic_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, topic_id, chunk_index)
    )
  `);

  // MIGRACIÓN: Arreglar tabla failed_questions si existe con user_answer NOT NULL
  try {
    // Intentar verificar si la tabla necesita migración
    const tableInfo = db.prepare("PRAGMA table_info(failed_questions)").all();
    const userAnswerColumn = tableInfo.find(col => col.name === 'user_answer');

    if (userAnswerColumn && userAnswerColumn.notnull === 1) {
      console.log('🔄 Migrando tabla failed_questions para permitir user_answer NULL...');

      // Crear tabla temporal con schema correcto
      db.exec(`
        CREATE TABLE failed_questions_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          topic_id TEXT NOT NULL,
          question TEXT NOT NULL,
          options TEXT NOT NULL,
          correct INTEGER NOT NULL,
          user_answer INTEGER,
          explanation TEXT,
          difficulty TEXT,
          page_reference TEXT,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Copiar datos
      db.exec(`
        INSERT INTO failed_questions_new
        SELECT * FROM failed_questions
      `);

      // Eliminar tabla vieja y renombrar
      db.exec(`DROP TABLE failed_questions`);
      db.exec(`ALTER TABLE failed_questions_new RENAME TO failed_questions`);

      console.log('✅ Migración completada: user_answer ahora permite NULL');
    }
  } catch (error) {
    console.log('ℹ️ No se requiere migración de failed_questions');
  }

  console.log('✅ Base de datos inicializada');
}

// ========================
// FUNCIONES DE USUARIOS
// ========================

// Crear usuario
function createUser(username, password) {
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, estado)
      VALUES (?, ?, 'bloqueado')
    `);

    const result = stmt.run(username, passwordHash);
    return { success: true, userId: result.lastInsertRowid };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'Usuario ya existe' };
    }
    return { success: false, error: error.message };
  }
}

// Autenticar usuario
function authenticateUser(username, password) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);

  if (!user) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);

  if (!validPassword) {
    return { success: false, error: 'Contraseña incorrecta' };
  }

  if (user.estado === 'bloqueado') {
    return { success: false, error: 'Cuenta bloqueada. Contacta al administrador.' };
  }

  // Actualizar último acceso
  const updateStmt = db.prepare('UPDATE users SET last_access = CURRENT_TIMESTAMP WHERE id = ?');
  updateStmt.run(user.id);

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      estado: user.estado
    }
  };
}

// Obtener todos los usuarios (para admin)
function getAllUsers() {
  const stmt = db.prepare(`
    SELECT id, username, estado, created_at, last_access
    FROM users
    ORDER BY created_at DESC
  `);

  return stmt.all();
}

// Activar usuario
function activateUser(userId) {
  const stmt = db.prepare('UPDATE users SET estado = ? WHERE id = ?');
  stmt.run('activo', userId);
  return { success: true };
}

// Bloquear usuario
function blockUser(userId) {
  const stmt = db.prepare('UPDATE users SET estado = ? WHERE id = ?');
  stmt.run('bloqueado', userId);
  return { success: true };
}

// Bloquear todos los usuarios
function blockAllUsers() {
  const stmt = db.prepare("UPDATE users SET estado = 'bloqueado'");
  const result = stmt.run();
  return { success: true, count: result.changes };
}

// Obtener usuario por ID
function getUserById(userId) {
  const stmt = db.prepare('SELECT id, username, estado FROM users WHERE id = ?');
  return stmt.get(userId);
}

// ========================
// FUNCIONES DE ESTADÍSTICAS
// ========================

// Obtener estadísticas de un usuario
function getUserStats(userId) {
  const stmt = db.prepare(`
    SELECT topic_id, topic_title, total_questions, correct_answers, accuracy, last_studied
    FROM user_stats
    WHERE user_id = ?
    ORDER BY last_studied DESC
  `);

  return stmt.all(userId);
}

// Actualizar estadísticas
function updateUserStats(userId, topicId, topicTitle, isCorrect) {
  // Verificar si ya existe
  const checkStmt = db.prepare('SELECT * FROM user_stats WHERE user_id = ? AND topic_id = ?');
  const existing = checkStmt.get(userId, topicId);

  if (existing) {
    // Actualizar
    const totalQuestions = existing.total_questions + 1;
    const correctAnswers = existing.correct_answers + (isCorrect ? 1 : 0);
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

    const updateStmt = db.prepare(`
      UPDATE user_stats
      SET total_questions = ?,
          correct_answers = ?,
          accuracy = ?,
          last_studied = CURRENT_TIMESTAMP
      WHERE user_id = ? AND topic_id = ?
    `);

    updateStmt.run(totalQuestions, correctAnswers, accuracy, userId, topicId);
  } else {
    // Insertar nuevo
    const accuracy = isCorrect ? 100 : 0;

    const insertStmt = db.prepare(`
      INSERT INTO user_stats (user_id, topic_id, topic_title, total_questions, correct_answers, accuracy)
      VALUES (?, ?, ?, 1, ?, ?)
    `);

    insertStmt.run(userId, topicId, topicTitle, isCorrect ? 1 : 0, accuracy);
  }

  return { success: true };
}

// ========================
// FUNCIONES DE PREGUNTAS FALLADAS
// ========================

// Obtener preguntas falladas de un usuario
function getUserFailedQuestions(userId) {
  const stmt = db.prepare(`
    SELECT id, topic_id, question, options, correct, user_answer, explanation, difficulty, page_reference, date
    FROM failed_questions
    WHERE user_id = ?
    ORDER BY date DESC
  `);

  const questions = stmt.all(userId);

  // Agrupar por topic_id
  const grouped = {};
  questions.forEach(q => {
    if (!grouped[q.topic_id]) {
      grouped[q.topic_id] = {
        questions: []
      };
    }

    grouped[q.topic_id].questions.push({
      id: q.id,
      question: q.question,
      options: JSON.parse(q.options),
      correct: q.correct,
      userAnswer: q.user_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      page_reference: q.page_reference,
      date: q.date
    });
  });

  return grouped;
}

// Agregar pregunta fallada
function addFailedQuestion(userId, topicId, questionData, userAnswer) {
  const stmt = db.prepare(`
    INSERT INTO failed_questions (user_id, topic_id, question, options, correct, user_answer, explanation, difficulty, page_reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    userId,
    topicId,
    questionData.question,
    JSON.stringify(questionData.options),
    questionData.correct,
    userAnswer,
    questionData.explanation,
    questionData.difficulty,
    questionData.page_reference
  );

  return { success: true };
}

// Eliminar pregunta fallada
function removeFailedQuestion(userId, questionId) {
  const stmt = db.prepare('DELETE FROM failed_questions WHERE id = ? AND user_id = ?');
  stmt.run(questionId, userId);
  return { success: true };
}

// ========================
// FUNCIONES DE ACTIVIDAD Y ESTADÍSTICAS DE ADMIN
// ========================

// Registrar actividad
function logActivity(userId, activityType, topicId = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO activity_log (user_id, activity_type, topic_id)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, activityType, topicId);
  } catch (error) {
    console.error('Error registrando actividad:', error);
  }
}

// Obtener estadísticas completas de todos los usuarios (para admin)
function getAdminStats() {
  const stmt = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.estado,
      u.created_at,
      u.last_access,
      COALESCE(SUM(s.total_questions), 0) as total_questions,
      COALESCE(SUM(s.correct_answers), 0) as correct_answers,
      COALESCE(AVG(s.accuracy), 0) as avg_accuracy
    FROM users u
    LEFT JOIN user_stats s ON u.id = s.user_id
    GROUP BY u.id
    ORDER BY u.last_access DESC
  `);

  return stmt.all();
}

// Obtener preguntas por día de un usuario
function getUserQuestionsPerDay(userId, days = 30) {
  const stmt = db.prepare(`
    SELECT
      DATE(timestamp) as date,
      COUNT(*) as count
    FROM activity_log
    WHERE user_id = ?
      AND activity_type = 'question_generated'
      AND timestamp >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `);

  return stmt.all(userId, days);
}

// Obtener preguntas por mes de un usuario
function getUserQuestionsPerMonth(userId, months = 6) {
  const stmt = db.prepare(`
    SELECT
      strftime('%Y-%m', timestamp) as month,
      COUNT(*) as count
    FROM activity_log
    WHERE user_id = ?
      AND activity_type = 'question_generated'
      AND timestamp >= datetime('now', '-' || ? || ' months')
    GROUP BY strftime('%Y-%m', timestamp)
    ORDER BY month DESC
  `);

  return stmt.all(userId, months);
}

// Obtener actividad reciente de un usuario
function getUserActivity(userId, limit = 50) {
  const stmt = db.prepare(`
    SELECT activity_type, topic_id, timestamp
    FROM activity_log
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  return stmt.all(userId, limit);
}

// Calcular tiempo promedio en la app por usuario
function getUserAverageSessionTime(userId) {
  // Calcular sesiones basadas en gaps de más de 30 minutos
  const stmt = db.prepare(`
    SELECT
      timestamp,
      LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp
    FROM activity_log
    WHERE user_id = ?
    ORDER BY timestamp
  `);

  const activities = stmt.all(userId);

  if (activities.length < 2) {
    return { avgSessionMinutes: 0, totalSessions: 0 };
  }

  let sessions = [];
  let currentSessionStart = activities[0].timestamp;
  let currentSessionEnd = activities[0].timestamp;

  for (let i = 1; i < activities.length; i++) {
    const current = new Date(activities[i].timestamp);
    const previous = new Date(activities[i - 1].timestamp);
    const diffMinutes = (current - previous) / (1000 * 60);

    if (diffMinutes > 30) {
      // Nueva sesión
      sessions.push({
        start: currentSessionStart,
        end: currentSessionEnd,
        duration: (new Date(currentSessionEnd) - new Date(currentSessionStart)) / (1000 * 60)
      });
      currentSessionStart = activities[i].timestamp;
    }
    currentSessionEnd = activities[i].timestamp;
  }

  // Agregar última sesión
  sessions.push({
    start: currentSessionStart,
    end: currentSessionEnd,
    duration: (new Date(currentSessionEnd) - new Date(currentSessionStart)) / (1000 * 60)
  });

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const avgMinutes = sessions.length > 0 ? totalMinutes / sessions.length : 0;

  return {
    avgSessionMinutes: Math.round(avgMinutes),
    totalSessions: sessions.length,
    totalMinutes: Math.round(totalMinutes)
  };
}

// Obtener resumen de actividad de hoy
function getTodayActivity() {
  const stmt = db.prepare(`
    SELECT
      u.username,
      COUNT(a.id) as questions_today
    FROM users u
    LEFT JOIN activity_log a ON u.id = a.user_id
      AND DATE(a.timestamp) = DATE('now')
      AND a.activity_type = 'question_generated'
    WHERE u.estado = 'activo'
    GROUP BY u.id
    HAVING questions_today > 0
    ORDER BY questions_today DESC
  `);

  return stmt.all();
}

// ========================
// FUNCIONES DE TRACKEO DE CHUNKS (Sin repetición - Opción B)
// ========================

// Obtener chunk no usado para un usuario y tema
function getUnusedChunkIndex(userId, topicId, totalChunks) {
  // Obtener chunks ya usados
  const usedStmt = db.prepare(`
    SELECT chunk_index
    FROM chunk_usage
    WHERE user_id = ? AND topic_id = ?
  `);

  const usedChunks = usedStmt.all(userId, topicId).map(r => r.chunk_index);

  // Si ya usó todos los chunks, resetear (empezar de nuevo)
  if (usedChunks.length >= totalChunks) {
    console.log(`♻️ Usuario ${userId} completó todos los chunks del tema ${topicId}. Reseteando...`);
    resetChunkUsage(userId, topicId);
    return Math.floor(Math.random() * totalChunks);
  }

  // Crear array de chunks disponibles
  const availableChunks = [];
  for (let i = 0; i < totalChunks; i++) {
    if (!usedChunks.includes(i)) {
      availableChunks.push(i);
    }
  }

  // Seleccionar uno aleatorio de los disponibles
  const randomIndex = Math.floor(Math.random() * availableChunks.length);
  const selectedChunk = availableChunks[randomIndex];

  console.log(`🎲 Chunks disponibles: ${availableChunks.length}/${totalChunks}, seleccionado: ${selectedChunk}`);

  return selectedChunk;
}

// Marcar chunk como usado
function markChunkAsUsed(userId, topicId, chunkIndex) {
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO chunk_usage (user_id, topic_id, chunk_index)
      VALUES (?, ?, ?)
    `);

    stmt.run(userId, topicId, chunkIndex);
    console.log(`✅ Chunk ${chunkIndex} marcado como usado para usuario ${userId}, tema ${topicId}`);
  } catch (error) {
    console.error('Error marcando chunk como usado:', error);
  }
}

// Resetear chunks usados (cuando se completan todos)
function resetChunkUsage(userId, topicId) {
  const stmt = db.prepare(`
    DELETE FROM chunk_usage
    WHERE user_id = ? AND topic_id = ?
  `);

  stmt.run(userId, topicId);
  console.log(`🔄 Chunks reseteados para usuario ${userId}, tema ${topicId}`);
}

// Obtener estadísticas de cobertura de chunks por usuario
function getChunkCoverage(userId, topicId) {
  const stmt = db.prepare(`
    SELECT COUNT(*) as used_chunks
    FROM chunk_usage
    WHERE user_id = ? AND topic_id = ?
  `);

  const result = stmt.get(userId, topicId);
  return result.used_chunks || 0;
}

// ========================
// EXPORTAR FUNCIONES
// ========================

module.exports = {
  initDatabase,
  createUser,
  authenticateUser,
  getAllUsers,
  activateUser,
  blockUser,
  blockAllUsers,
  getUserById,
  getUserStats,
  updateUserStats,
  getUserFailedQuestions,
  addFailedQuestion,
  removeFailedQuestion,
  logActivity,
  getAdminStats,
  getUserQuestionsPerDay,
  getUserQuestionsPerMonth,
  getUserActivity,
  getUserAverageSessionTime,
  getTodayActivity,
  getUnusedChunkIndex,
  markChunkAsUsed,
  resetChunkUsage,
  getChunkCoverage,
  db
};
