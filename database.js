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
      user_answer INTEGER NOT NULL,
      explanation TEXT,
      difficulty TEXT,
      page_reference TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

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
  db
};
