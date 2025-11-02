// ========================
// SERVIDOR OPTIMIZADO PARA RENDER - server.js
// ========================

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { Anthropic } = require('@anthropic-ai/sdk');
const pdfParse = require('pdf-parse');
require('dotenv').config();

// Importar sistema de base de datos
const db = require('./database');

const app = express();
const port = process.env.PORT || 3000;

// Inicializar base de datos
db.initDatabase();

// Confiar en proxies (necesario para Render)
app.set('trust proxy', 1);

// Middleware de sesiones
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: __dirname
  }),
  secret: process.env.SESSION_SECRET || 'oposiciones-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: true,  // CRÍTICO: Confiar en el proxy de Render
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'  // 'none' necesario para HTTPS con proxy
  }
}));

// Middleware optimizado para producción
app.use(cors({
    origin: true,  // Permitir todos los orígenes (más permisivo para debugging)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Password'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(express.json({ limit: '10mb' }));

// Middleware de logging para debugging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'} - Cookies: ${req.headers.cookie ? 'presente' : 'ausente'}`);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Cliente de Anthropic (Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Directorio de documentos
const DOCUMENTS_DIR = path.join(__dirname, 'documents');

// CONFIGURACIÓN OPTIMIZADA (balance velocidad-confiabilidad)
const IMPROVED_CLAUDE_CONFIG = {
  maxRetries: 3,              // 3 intentos para mayor confiabilidad
  baseDelay: 1500,           // 1.5 segundos de delay inicial
  maxDelay: 8000,            // Máximo 8 segundos
  backoffMultiplier: 2,
  jitterFactor: 0.1          // Jitter moderado
};

// Configuración completa de temas (optimizada)
const TOPIC_CONFIG = {
  "articulos-lec-del-desahucio-1": {
    "title": "ARTICULOS LEC DEL DESAHUCIO (1)",
    "description": "Artículos LEC del Desahucio",
    "files": ["ARTICULOS LEC DEL DESAHUCIO (1).txt"]
  },
  "arts-129-240-lec-1": {
    "title": "Arts 129-240 LEC (1)",
    "description": "Artículos 129-240 LEC",
    "files": ["Arts 129-240 LEC (1).txt"]
  },
  "arts-141-215-lecr-1": {
    "title": "Arts 141-215 Lecr (1)",
    "description": "Artículos 141-215 Lecr",
    "files": ["Arts 141-215 Lecr (1).txt"]
  },
  "arts-179-300-lopj-1": {
    "title": "Arts 179-300 LOPJ (1)",
    "description": "Artículos 179-300 LOPJ",
    "files": ["Arts 179-300 LOPJ (1).txt"]
  },
  "artculos-42-62-ljs-1": {
    "title": "Artículos 42-62 LJS (1)",
    "description": "Artículos 42-62 LJS",
    "files": ["Artículos 42-62 LJS (1).txt"]
  },
  "carta-dos-ciudadanos": {
    "title": "Carta Dos. Ciudadanos",
    "description": "Carta de Derechos de los Ciudadanos",
    "files": ["Carta Dos. Ciudadanos.txt"]
  },
  "ley-coop-jca-intern-2": {
    "title": "Ley Coop Jca. Intern. (2)",
    "description": "Ley de Cooperación Jurídica Internacional",
    "files": ["Ley Coop Jca. Intern. (2).txt"]
  },
  "rglto-1-05-cxpx-rglto-1-18-2": {
    "title": "Rglto. 1-05 CXPX (Rglto 1-18) (2)",
    "description": "Reglamento 1-05",
    "files": ["Rglto. 1-05 CXPX (Rglto 1-18) (2).txt"]
  },
  "tema-1": {
    "title": "TEMA 1",
    "description": "Tema 1",
    "files": ["TEMA 1.txt"]
  },
  "tema-10-11-gestin-1": {
    "title": "Tema 10 (11 Gestión) (1)",
    "description": "Tema 10 Gestión",
    "files": ["Tema 10 (11 Gestión) (1).txt"]
  },
  "tema-14-15": {
    "title": "TEMA 14 (15)",
    "description": "Tema 14",
    "files": ["TEMA 14 (15).txt"]
  },
  "tema-14-alt": {
    "title": "TEMA 14 (15) - Alternativo",
    "description": "Tema 14 - Versión alternativa",
    "files": ["TEMA-14-_15_.txt"]
  },
  "tema-15-16-xestin": {
    "title": "TEMA 15 (ó 16 Xestión)",
    "description": "Tema 15 Gestión",
    "files": ["TEMA-15-_ó-16-Xestión_.txt"]
  },
  "tema-16-aux16-18-19-tra": {
    "title": "Tema 16 (Aux),16-18-19 (Tra)",
    "description": "Tema 16 Auxilio y Tramitación",
    "files": ["Tema-16-_Aux__16-18-19-_Tra_.txt"]
  },
  "tema-2-bis-1": {
    "title": "Tema 2 bis (1)",
    "description": "Tema 2 bis",
    "files": ["Tema 2 bis (1).txt"]
  },
  "tema-20-21-tram_-18-auxilio": {
    "title": "Tema 20-21 (Tram)_ 18 (auxilio)",
    "description": "Tema 20-21 Tramitación",
    "files": ["Tema-20-21-_Tram__-18-_auxilio_.txt"]
  },
  "tema-22-tram-19-aux-1": {
    "title": "TEMA 22 (Tram)-19 (Aux). (1)",
    "description": "Tema 22 Tramitación y Auxilio",
    "files": ["TEMA-22-_Tram_-19-_Aux_.-_1_.txt"]
  },
  "tema-24": {
    "title": "TEMA 24",
    "description": "Tema 24",
    "files": ["TEMA-24.txt"]
  },
  "tema-3-1": {
    "title": "TEMA 3 (1)",
    "description": "Tema 3",
    "files": ["TEMA 3 (1).txt"]
  },
  "tema-4": {
    "title": "TEMA 4",
    "description": "Tema 4",
    "files": ["TEMA 4.txt"]
  },
  "tema-5-2": {
    "title": "TEMA 5 (2)",
    "description": "Tema 5",
    "files": ["TEMA 5 (2).txt"]
  },
  "tema-6": {
    "title": "TEMA 6",
    "description": "Tema 6",
    "files": ["TEMA 6.txt"]
  },
  "tema-7-polo-que-estudiamos": {
    "title": "TEMA 7 (polo que, estudiamos)",
    "description": "Tema 7",
    "files": ["TEMA 7 (polo que, estudiamos).txt"]
  },
  "tema-8-polo-que-estudiamos": {
    "title": "TEMA 8 (polo que, estudiamos)",
    "description": "Tema 8",
    "files": ["TEMA 8 (polo que, estudiamos).txt"]
  },
  "tema-9-auxilio": {
    "title": "TEMA 9 (Auxilio)",
    "description": "Tema 9 Auxilio",
    "files": ["TEMA 9 (Auxilio).txt"]
  },
  "tema-laboral-23-tram-20-auxili": {
    "title": "Tema Laboral 23 (Tram) 20 (Auxilio)",
    "description": "Tema Laboral y Auxilio",
    "files": ["Tema-Laboral-23-_Tram_-20-_Auxilio_.txt"]
  },
  "temas-rexistro-civil-2": {
    "title": "Temas Rexistro Civil (2)",
    "description": "Registro Civil",
    "files": ["Temas Rexistro Civil (2).txt"]
  },
  "temas-rexistro-civil-2-1": {
    "title": "Temas Rexistro Civil (2) (1)",
    "description": "Registro Civil - Parte 2",
    "files": ["Temas-Rexistro-Civil-_2_-_1_.txt"]
  }
};

// ========================
// SISTEMA OPTIMIZADO DE LLAMADAS A CLAUDE
// ========================

function calculateDelay(attempt, config = IMPROVED_CLAUDE_CONFIG) {
  const baseDelay = config.baseDelay;
  const exponentialDelay = baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const jitter = exponentialDelay * config.jitterFactor * Math.random();
  const finalDelay = Math.min(exponentialDelay + jitter, config.maxDelay);
  return Math.round(finalDelay);
}

async function callClaudeWithImprovedRetry(fullPrompt, config = IMPROVED_CLAUDE_CONFIG) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`🤖 Intento ${attempt}/${config.maxRetries} - Generando preguntas...`);
      
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001", // Claude Haiku 4.5 - Rápido, económico y capaz
        max_tokens: 1000, // Suficiente para pregunta completa
        temperature: 0.3,  // Balance calidad/variedad
        messages: [{
          role: "user",
          content: fullPrompt
        }]
      });
      
      console.log(`✅ Pregunta generada en intento ${attempt}`);
      return response;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Intento ${attempt} fallido:`, {
        status: error.status,
        message: error.message,
        type: error.type,
        error: error.error
      });

      if (attempt === config.maxRetries) {
        console.log(`💀 Todos los ${config.maxRetries} intentos fallaron`);
        break;
      }

      const waitTime = calculateDelay(attempt, config);
      console.log(`⏳ Esperando ${waitTime/1000}s antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

// ========================
// PARSING OPTIMIZADO
// ========================

function parseClaudeResponse(responseText) {
  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.log('🔧 Extrayendo JSON...');
    
    // Buscar JSON en bloques de código
    let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                   responseText.match(/```\n([\s\S]*?)\n```/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.log('❌ JSON extraído no válido');
      }
    }
    
    // Buscar JSON sin markdown
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        return JSON.parse(responseText.substring(jsonStart, jsonEnd + 1));
      } catch (e) {
        console.log('❌ JSON sin markdown no válido');
      }
    }
    
    // Pregunta de emergencia optimizada
    console.log('🚨 Usando pregunta de emergencia...');
    return {
      questions: [{
        question: "¿Cuál es el principio fundamental que rige la administración de justicia según la Constitución Española?",
        options: [
          "A) La justicia emana del pueblo y se administra por Jueces y Tribunales independientes (art. 117 CE)",
          "B) La justicia es administrada directamente por el Gobierno central",
          "C) Los jueces dependen jerárquicamente del Ministerio de Justicia",
          "D) La administración de justicia corresponde a las Comunidades Autónomas"
        ],
        correct: 0,
        explanation: "La respuesta correcta es A. El artículo 117 de la Constitución establece que la justicia emana del pueblo y se administra en nombre del Rey por Jueces y Tribunales independientes, inamovibles, responsables y sometidos únicamente al imperio de la ley.",
        difficulty: "media",
        page_reference: "Artículo 117 CE"
      }]
    };
  }
}

// PROMPT OPTIMIZADO (balance velocidad-claridad)
const CLAUDE_PROMPT = `Genera 1 pregunta tipo test de oposición judicial basada en el texto. Responde SOLO con JSON, sin markdown.

INSTRUCCIONES:
- Usa únicamente información del texto proporcionado
- Dificultad: 10% muy difícil, 60% difícil, 20% media, 10% fácil
- Crea 4 opciones (A, B, C, D) donde solo 1 es correcta
- Las opciones incorrectas deben distorsionar números, plazos o conceptos del texto real
- Incluye referencia al artículo/página

Responde con este formato JSON exacto:
{
  "questions": [{
    "question": "texto de la pregunta aquí",
    "options": [
      "A) primera opción con referencia",
      "B) segunda opción con referencia",
      "C) tercera opción con referencia",
      "D) cuarta opción con referencia"
    ],
    "correct": 0,
    "explanation": "La correcta es A porque...",
    "difficulty": "difícil",
    "page_reference": "Art. X"
  }]
}

TEXTO DEL DOCUMENTO:
{{CONTENT}}`;

// ========================
// FUNCIONES DE ARCHIVOS OPTIMIZADAS
// ========================

async function readFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt') {
      return await fs.readFile(filePath, 'utf8');
    }

    if (ext === '.pdf') {
      console.log(`📄 Extrayendo texto de PDF: ${path.basename(filePath)}`);
      const dataBuffer = fsSync.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      console.log(`✅ PDF extraído: ${data.numpages} páginas, ${data.text.length} caracteres`);
      return data.text;
    }

    return '[FORMATO NO SOPORTADO]';
  } catch (error) {
    console.error(`❌ Error leyendo ${filePath}:`, error.message);
    throw error;
  }
}

async function ensureDocumentsDirectory() {
  try {
    await fs.access(DOCUMENTS_DIR);
  } catch (error) {
    console.log('📁 Creando directorio documents...');
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
  }
}

// Función para dividir contenido en chunks (1 página ≈ 2500 caracteres)
function splitIntoChunks(content, chunkSize = 2500) {
  const chunks = [];
  const lines = content.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    // Si agregar esta línea excede el tamaño del chunk, guardar el chunk actual
    if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += line + '\n';
  }

  // Agregar el último chunk si tiene contenido
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function getDocumentsByTopics(topics) {
  let allContent = '';
  let successCount = 0;

  for (const topic of topics) {
    const topicConfig = TOPIC_CONFIG[topic];
    if (!topicConfig) continue;

    allContent += `\n\n=== ${topicConfig.title} ===\n\n`;

    for (const fileName of topicConfig.files) {
      const filePath = path.join(DOCUMENTS_DIR, fileName);

      try {
        const content = await readFile(filePath);
        if (content && !content.includes('[FORMATO NO SOPORTADO')) {
          allContent += `${content}\n\n`;
          successCount++;
          console.log(`✅ Leído: ${fileName}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Error: ${fileName}`);
        continue;
      }
    }
  }

  console.log(`📊 Archivos procesados: ${successCount}/${topics.length}`);
  return allContent;
}

// Nueva función para obtener chunks aleatorios de documentos
async function getRandomChunkFromTopics(topics) {
  const allContent = await getDocumentsByTopics(topics);

  if (!allContent.trim()) {
    return null;
  }

  // Dividir en chunks de ~2500 caracteres (1 página completa)
  const chunks = splitIntoChunks(allContent, 2500);

  console.log(`📄 Documento dividido en ${chunks.length} chunks`);

  if (chunks.length === 0) {
    return allContent.substring(0, 3000);
  }

  // Seleccionar un chunk aleatorio
  const randomIndex = Math.floor(Math.random() * chunks.length);
  const selectedChunk = chunks[randomIndex];

  console.log(`🎲 Chunk aleatorio seleccionado: ${randomIndex + 1}/${chunks.length} (${selectedChunk.length} caracteres)`);

  return selectedChunk;
}

// ========================
// FUNCIONES DE ESTADÍSTICAS - AHORA EN DATABASE.JS
// ========================
// Las funciones de estadísticas y preguntas falladas ahora están en database.js
// usando SQLite para persistencia de datos por usuario

// ========================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================

// Middleware para verificar si el usuario está autenticado
function requireAuth(req, res, next) {
  console.log('🔒 requireAuth - Session ID:', req.sessionID, '- User ID en sesión:', req.session.userId);
  console.log('🔒 requireAuth - Cookie header:', req.headers.cookie);

  if (!req.session.userId) {
    console.log('❌ No hay userId en la sesión - Rechazando petición');
    return res.status(401).json({ error: 'No autenticado', requiresLogin: true });
  }

  // Verificar que el usuario existe y está activo
  const user = db.getUserById(req.session.userId);
  if (!user) {
    console.log('❌ Usuario no encontrado en DB');
    req.session.destroy();
    return res.status(401).json({ error: 'Usuario no encontrado', requiresLogin: true });
  }

  if (user.estado === 'bloqueado') {
    console.log('❌ Usuario bloqueado:', user.username);
    return res.status(403).json({ error: 'Cuenta bloqueada. Contacta al administrador.' });
  }

  console.log('✅ requireAuth OK - Usuario:', user.username);
  req.user = user;
  next();
}

// Middleware para verificar si es admin
function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'];

  if (providedPassword !== adminPassword) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  next();
}

// ========================
// RUTAS DE AUTENTICACIÓN
// ========================

// Ruta principal - redirige a login si no está autenticado
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Registro de usuario
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username debe tener al menos 3 caracteres' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password debe tener al menos 6 caracteres' });
    }

    const result = db.createUser(username, password);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Auto-login después de registro (pero cuenta queda bloqueada)
    req.session.userId = result.userId;
    res.json({
      success: true,
      message: 'Usuario creado. Cuenta bloqueada hasta activación del administrador.',
      requiresActivation: true
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔑 Intento de login - Usuario:', username);

    if (!username || !password) {
      console.log('❌ Faltan credenciales');
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    const result = db.authenticateUser(username, password);

    if (!result.success) {
      console.log('❌ Login fallido:', result.error);
      return res.status(401).json({ error: result.error });
    }

    // Guardar en sesión
    req.session.userId = result.user.id;

    // Forzar guardado de sesión
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
        return res.status(500).json({ error: 'Error guardando sesión' });
      }

      console.log('✅ Login exitoso - Usuario ID:', result.user.id, '- Session ID:', req.sessionID);
      console.log('📦 Sesión guardada:', { userId: req.session.userId, sessionID: req.sessionID });
      console.log('🍪 Cookie que se enviará:', req.session.cookie);

      res.json({
        success: true,
        user: {
          id: result.user.id,
          username: result.user.username
        }
      });
    });

  } catch (error) {
    console.error('❌ Error en login (excepción):', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ success: true });
  });
});

// Verificar sesión
app.get('/api/auth/check', (req, res) => {
  console.log('🔐 Verificando sesión - Session ID:', req.sessionID, '- User ID:', req.session.userId);

  if (!req.session.userId) {
    console.log('❌ No hay userId en la sesión');
    return res.json({ authenticated: false });
  }

  const user = db.getUserById(req.session.userId);

  if (!user) {
    console.log('❌ Usuario no encontrado en DB');
    req.session.destroy();
    return res.json({ authenticated: false });
  }

  if (user.estado === 'bloqueado') {
    console.log('⚠️ Usuario bloqueado:', user.username);
    return res.json({
      authenticated: true,
      blocked: true,
      message: 'Cuenta bloqueada. Contacta al administrador.'
    });
  }

  console.log('✅ Sesión válida para usuario:', user.username);
  res.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username
    }
  });
});

// ========================
// RUTAS DE ADMINISTRACIÓN
// ========================

// Obtener todos los usuarios (requiere admin)
app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Crear usuario (admin)
app.post('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    const result = db.createUser(username, password);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, userId: result.userId });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Activar usuario
app.post('/api/admin/users/:id/activate', requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    db.activateUser(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error activando usuario:', error);
    res.status(500).json({ error: 'Error al activar usuario' });
  }
});

// Bloquear usuario
app.post('/api/admin/users/:id/block', requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    db.blockUser(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error bloqueando usuario:', error);
    res.status(500).json({ error: 'Error al bloquear usuario' });
  }
});

// Bloquear todos los usuarios
app.post('/api/admin/users/block-all', requireAdmin, (req, res) => {
  try {
    const result = db.blockAllUsers();
    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error bloqueando usuarios:', error);
    res.status(500).json({ error: 'Error al bloquear usuarios' });
  }
});

// Obtener estadísticas completas (admin)
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const stats = db.getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Obtener actividad detallada de un usuario (admin)
app.get('/api/admin/users/:id/activity', requireAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const questionsPerDay = db.getUserQuestionsPerDay(userId, 30);
    const questionsPerMonth = db.getUserQuestionsPerMonth(userId, 6);
    const sessionTime = db.getUserAverageSessionTime(userId);
    const recentActivity = db.getUserActivity(userId, 50);

    res.json({
      questionsPerDay,
      questionsPerMonth,
      sessionTime,
      recentActivity
    });
  } catch (error) {
    console.error('Error obteniendo actividad:', error);
    res.status(500).json({ error: 'Error al obtener actividad' });
  }
});

// Obtener actividad de hoy (admin)
app.get('/api/admin/today', requireAdmin, (req, res) => {
  try {
    const today = db.getTodayActivity();
    res.json(today);
  } catch (error) {
    console.error('Error obteniendo actividad de hoy:', error);
    res.status(500).json({ error: 'Error al obtener actividad de hoy' });
  }
});

// ========================
// RUTAS DE LA API OPTIMIZADAS
// ========================

app.get('/api/topics', (req, res) => {
  try {
    res.json(Object.keys(TOPIC_CONFIG));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener temas' });
  }
});

app.post('/api/generate-exam', requireAuth, async (req, res) => {
  try {
    const { topics, questionCount = 1 } = req.body;

    if (!topics?.length) {
      return res.status(400).json({ error: 'Selecciona al menos un tema' });
    }

    console.log('📚 Procesando temas:', topics);

    // NUEVO: Obtener un chunk aleatorio en lugar del documento completo
    const documentChunk = await getRandomChunkFromTopics(topics);

    if (!documentChunk || !documentChunk.trim()) {
      return res.status(404).json({
        error: 'No se encontró contenido para los temas seleccionados'
      });
    }

    console.log(`✅ Generando pregunta de ${documentChunk.length} caracteres (chunk aleatorio)`);
    console.log(`📝 Primeros 200 chars del chunk: ${documentChunk.substring(0, 200)}...`);

    const fullPrompt = CLAUDE_PROMPT.replace('{{CONTENT}}', documentChunk);

    console.log(`🔍 Prompt length: ${fullPrompt.length} caracteres`);

    const response = await callClaudeWithImprovedRetry(fullPrompt);
    
    let questionsData;
    try {
      const responseText = response.content[0].text;
      console.log(`📥 Response recibida (primeros 500 chars): ${responseText.substring(0, 500)}...`);

      questionsData = parseClaudeResponse(responseText);
      
      if (!questionsData?.questions?.length) {
        throw new Error('No se generaron preguntas válidas');
      }
      
      // Validar cada pregunta
      questionsData.questions.forEach((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
          console.log(`⚠️ Corrigiendo pregunta ${index + 1}`);
          q.options = q.options || [
            "A) Opción 1", "B) Opción 2", "C) Opción 3", "D) Opción 4"
          ];
        }
        q.correct = q.correct ?? 0;
        q.explanation = q.explanation || "Explicación no disponible.";
        q.difficulty = q.difficulty || "media";
        q.page_reference = q.page_reference || "Referencia no disponible";
      });
      
    } catch (parseError) {
      console.error('❌ Error parsing:', parseError.message);
      questionsData = {
        questions: [{
          question: "¿Cuál es el órgano de gobierno del Poder Judicial según la Constitución?",
          options: [
            "A) El Consejo General del Poder Judicial (art. 122 CE)",
            "B) El Ministerio de Justicia",
            "C) El Tribunal Supremo",
            "D) Las Audiencias Provinciales"
          ],
          correct: 0,
          explanation: "Correcto: A. El artículo 122 CE establece que el CGPJ es el órgano de gobierno del Poder Judicial.",
          difficulty: "media",
          page_reference: "Artículo 122 CE"
        }]
      };
    }

    // Registrar actividad de generación de pregunta
    db.logActivity(req.user.id, 'question_generated', topics[0]);

    res.json({
      examId: Date.now(),
      questions: questionsData.questions,
      topics,
      questionCount: questionsData.questions.length
    });
    
  } catch (error) {
    console.error('❌ Error generando examen:', error);
    
    const errorCode = error.status || 500;
    const errorMessage = errorCode === 529 ? 'Claude temporalmente ocupado' :
                        errorCode === 429 ? 'Límite de solicitudes alcanzado' :
                        'Error interno del servidor';
    
    res.status(errorCode).json({ 
      error: errorMessage,
      retryable: [429, 503, 529].includes(errorCode),
      waitTime: errorCode === 529 ? 5000 : 3000
    });
  }
});

app.post('/api/record-answer', requireAuth, (req, res) => {
  try {
    const { topicId, questionData, userAnswer, isCorrect } = req.body;
    const userId = req.user.id;

    // Obtener título del tema
    const topicConfig = TOPIC_CONFIG[topicId];
    const topicTitle = topicConfig?.title || 'Tema desconocido';

    // Actualizar estadísticas en la base de datos
    db.updateUserStats(userId, topicId, topicTitle, isCorrect);

    // Si es incorrecta, guardar en preguntas falladas
    if (!isCorrect) {
      db.addFailedQuestion(userId, topicId, questionData, userAnswer);
    }

    // Obtener estadísticas actualizadas del usuario para este tema
    const allStats = db.getUserStats(userId);
    const topicStats = allStats.find(s => s.topic_id === topicId);

    res.json({
      success: true,
      stats: topicStats || { total_questions: 0, correct_answers: 0, accuracy: 0 }
    });

  } catch (error) {
    console.error('❌ Error registrando respuesta:', error);
    res.status(500).json({ error: 'Error al registrar respuesta' });
  }
});

app.get('/api/user-stats', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const stats = db.getUserStats(userId);

    // Transformar formato de base de datos a formato esperado por frontend
    const statsWithTitles = {};

    stats.forEach(stat => {
      statsWithTitles[stat.topic_id] = {
        title: stat.topic_title,
        totalQuestions: stat.total_questions,
        correctAnswers: stat.correct_answers,
        accuracy: stat.accuracy,
        lastStudied: stat.last_studied
      };
    });

    res.json(statsWithTitles);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

app.get('/api/failed-questions', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const failedQuestions = db.getUserFailedQuestions(userId);

    // El formato ya viene agrupado por topic_id desde database.js
    // Solo necesitamos asegurarnos que se mantiene el formato esperado
    res.json(failedQuestions);
  } catch (error) {
    console.error('❌ Error obteniendo preguntas falladas:', error);
    res.status(500).json({ error: 'Error al obtener preguntas falladas' });
  }
});

app.post('/api/resolve-failed-question', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.body;

    // Eliminar pregunta fallada de la base de datos
    db.removeFailedQuestion(userId, questionId);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error resolviendo pregunta:', error);
    res.status(500).json({ error: 'Error al resolver pregunta' });
  }
});

app.get('/api/documents-status', async (req, res) => {
  try {
    const status = {};
    
    for (const [topicId, config] of Object.entries(TOPIC_CONFIG)) {
      status[topicId] = {
        title: config.title,
        description: config.description,
        files: []
      };
      
      for (const fileName of config.files) {
        const filePath = path.join(DOCUMENTS_DIR, fileName);
        try {
          await fs.access(filePath);
          status[topicId].files.push({ name: fileName, exists: true });
        } catch {
          status[topicId].files.push({ name: fileName, exists: false });
        }
      }
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Error verificando documentos' });
  }
});

app.get('/api/health', (req, res) => {
  try {
    // Contar usuarios activos en la base de datos
    const users = db.db.prepare('SELECT COUNT(*) as count FROM users WHERE estado = ?').get('activo');
    const totalUsers = db.db.prepare('SELECT COUNT(*) as count FROM users').get();

    res.json({
      status: 'OK',
      message: 'Servidor funcionando',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      topics: Object.keys(TOPIC_CONFIG).length,
      totalUsers: totalUsers.count,
      activeUsers: users.count,
      database: 'SQLite - Conectado'
    });
  } catch (error) {
    res.json({
      status: 'OK',
      message: 'Servidor funcionando',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      topics: Object.keys(TOPIC_CONFIG).length,
      database: 'Error al conectar'
    });
  }
});

// Middleware de errores
app.use((error, req, res, next) => {
  console.error('❌ Error:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// 404 para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// ========================
// INICIALIZACIÓN OPTIMIZADA
// ========================

async function startServer() {
  try {
    // Verificar API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY no encontrada');
      process.exit(1);
    }
    
    // Crear directorio de documentos
    await ensureDocumentsDirectory();
    
    // Contar archivos disponibles
    let availableFiles = 0;
    let totalFiles = Object.keys(TOPIC_CONFIG).length;
    
    for (const [topicId, config] of Object.entries(TOPIC_CONFIG)) {
      for (const fileName of config.files) {
        try {
          await fs.access(path.join(DOCUMENTS_DIR, fileName));
          availableFiles++;
          break;
        } catch {}
      }
    }
    
    // Iniciar servidor
    app.listen(port, '0.0.0.0', () => {
      console.log('\n🚀 ========================================');
      console.log('   SERVIDOR DE OPOSICIONES ONLINE');
      console.log('========================================');
      console.log(`📡 Puerto: ${port}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🤖 Claude API: ✅ Configurada`);
      console.log(`📚 Temas: ${Object.keys(TOPIC_CONFIG).length}`);
      console.log(`📄 Archivos: ${availableFiles}/${totalFiles}`);
      console.log(`\n✅ Aplicación disponible en:`);
      console.log(`   Local: http://localhost:${port}`);
      console.log(`   Render: Tu URL de Render`);
      console.log('\n🎯 ¡Sistema listo para generar exámenes!');
      console.log('========================================\n');
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido...');
  process.exit(0);
});

// Iniciar servidor
startServer();