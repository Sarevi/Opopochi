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

// Configuración completa de temas - TÉCNICO DE FARMACIA
const TOPIC_CONFIG = {
  "tema-4-organizaciones-farmaceuticas": {
    "title": "TEMA 4 - ORGANIZACIONES FARMACEUTICAS",
    "description": "Organizaciones Farmacéuticas",
    "files": ["TEMA 4- ORGANIZACIONES FARMACEUTICAS.txt"]
  },
  "tema-5-medicamentos": {
    "title": "TEMA 5 - MEDICAMENTOS",
    "description": "Medicamentos",
    "files": ["TEMA 5- MEDICAMENTOS.txt"]
  },
  "tema-6-formulas-magistrales": {
    "title": "TEMA 6 - FORMULAS MAGISTRALES Y PREPARADOS OFICINALES",
    "description": "Fórmulas Magistrales y Preparados Oficinales",
    "files": ["TEMA 6- FORMULAS MAGISTRALES Y PREPARADOS OFICINALES.txt"]
  },
  "tema-7-acondicionamiento": {
    "title": "TEMA 7 - ACONDICIONAMIENTO DE LOS MEDICAMENTOS",
    "description": "Acondicionamiento de los Medicamentos",
    "files": ["TEMA 7- ACONDICIONAMIENTO DE LOS MEDICAMENTOS.txt"]
  },
  "tema-8-farmacocinetica": {
    "title": "TEMA 8 - FARMACOCINETICA Y FARMACODINAMIA",
    "description": "Farmacocinética y Farmacodinamia",
    "files": ["TEMA 8- FARMACOCINETICA Y FARMACODINAMIA.txt"]
  },
  "tema-9-administracion": {
    "title": "TEMA 9 - ADMINISTRACION DE MEDICAMENTOS",
    "description": "Administración de Medicamentos",
    "files": ["TEMA 9- ADMINISTRACION DE MEDICAMENTOS.txt"]
  },
  "tema-10-formas-farmaceuticas": {
    "title": "TEMA 10 - FORMAS FARMACEUTICAS Y VIAS DE ADMINISTRACION",
    "description": "Formas Farmacéuticas y Vías de Administración",
    "files": ["TEMA 10- FORMAS FARMACEUTICAS Y VIAS DE ADMINISTRACION.txt"]
  },
  "tema-11-farmacia-hospitalaria": {
    "title": "TEMA 11 - FARMACIA HOSPITALARIA",
    "description": "Farmacia Hospitalaria",
    "files": ["TEMA 11- FARMACIA HOSPITALARIA.txt"]
  },
  "tema-12-almacenamiento": {
    "title": "TEMA 12 - ALMACENAMIENTO Y CONSERVACION",
    "description": "Almacenamiento y Conservación",
    "files": ["TEMA-12-ALMACENAMIENTO-Y-CONSERVACION.txt"]
  },
  "tema-13-laboratorio": {
    "title": "TEMA 13 - LABORATORIO FARMACEUTICO",
    "description": "Laboratorio Farmacéutico",
    "files": ["TEMA-13-LABORATORIO-FARMACEUTICO.txt"]
  },
  "tema-13-parte-2": {
    "title": "TEMA 13 (2ª parte) - LABORATORIO FARMACEUTICO",
    "description": "Laboratorio Farmacéutico - Parte 2",
    "files": ["TEMA-13-2ª-parte-LABORATORIO-FARMACEUTICO.txt"]
  },
  "tema-14-operaciones": {
    "title": "TEMA 14 - OPERACIONES FARMACEUTICAS BASICAS",
    "description": "Operaciones Farmacéuticas Básicas",
    "files": ["TEMA-14-OPERACIONES-FARMACEUTICAS-BASICAS.txt"]
  },
  "tema-14-parte-2": {
    "title": "TEMA 14 (2ª parte) - LABORATORIO FARMACEUTICO",
    "description": "Laboratorio Farmacéutico - Parte 2",
    "files": ["TEMA-14-2ª-parte-LABORATORIO-FARMACEUTICO.txt"]
  },
  "tema-15-analisis-clinicos": {
    "title": "TEMA 15 - ANALISIS CLINICOS",
    "description": "Análisis Clínicos",
    "files": ["TEMA-15-ANALISIS-CLINICOS.txt"]
  },
  "tema-17-espectrofotometria": {
    "title": "TEMA 17 - ESPECTROFOTOMETRIA Y MICROSCOPIA",
    "description": "Espectrofotometría y Microscopía",
    "files": ["TEMA-17-ESPECTROFOTOMETRIA-Y-MICROSCOPIA.txt"]
  },
  "tema-18-parafarmacia": {
    "title": "TEMA 18 - PARAFARMACIA",
    "description": "Parafarmacia",
    "files": ["TEMA-18-PARAFARMACIA.txt"]
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

async function callClaudeWithImprovedRetry(fullPrompt, maxTokens = 700, questionType = 'media', questionsPerCall = 3, config = IMPROVED_CLAUDE_CONFIG) {
  let lastError = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`🤖 Intento ${attempt}/${config.maxRetries} - Generando ${questionsPerCall} preguntas ${questionType}...`);

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001", // Claude Haiku 4.5 - Rápido, económico y capaz
        max_tokens: maxTokens, // Variable según tipo de pregunta
        temperature: 0.2,  // Temperatura baja para eficiencia máxima
        /* COSTO OPTIMIZADO - SISTEMA 3 NIVELES (30% Simple / 60% Media / 10% Elaborada):
         *
         * PREGUNTAS SIMPLES (30% - 3 por llamada) - DIRECTAS:
         * - Chunk: 1200 caracteres (~480 tokens)
         * - Prompt: ~110 tokens
         * - Input total: ~590 tokens × $0.80/1M = $0.000472
         * - Output: ~70 tokens × 3 = 210 tokens × $4.00/1M = $0.000840
         * - Total: $0.001312 ÷ 3 = $0.000437 USD/pregunta
         *
         * PREGUNTAS MEDIAS (60% - 3 por llamada) - CONTEXTO CORTO:
         * - Chunk: 1200 caracteres (~480 tokens)
         * - Prompt: ~120 tokens
         * - Input total: ~600 tokens × $0.80/1M = $0.000480
         * - Output: ~110 tokens × 3 = 330 tokens × $4.00/1M = $0.001320
         * - Total: $0.001800 ÷ 3 = $0.000600 USD/pregunta
         *
         * PREGUNTAS ELABORADAS (10% - 2 por llamada) - CASOS LARGOS:
         * - Chunk: 1200 caracteres (~480 tokens)
         * - Prompt: ~140 tokens
         * - Input total: ~620 tokens × $0.80/1M = $0.000496
         * - Output: ~160 tokens × 2 = 320 tokens × $4.00/1M = $0.001280
         * - Total: $0.001776 ÷ 2 = $0.000888 USD/pregunta
         *
         * COSTO PROMEDIO PONDERADO (30/60/10):
         * (0.30 × $0.000437) + (0.60 × $0.000600) + (0.10 × $0.000888)
         * = $0.000131 + $0.000360 + $0.000089
         * = $0.000580 USD (~0.00054 EUR) por pregunta
         *
         * 🎉 RESULTADOS FINALES:
         * • Con 1€ generas ~1,840 preguntas (era 518 originalmente)
         * • Mejor balance: 60% contexto corto (sweet spot calidad/costo)
         * • 30% directas + 10% casos complejos (lo justo)
         * • REDUCCIÓN TOTAL: 70% vs sistema original
         * • Ahorro mensual (10k): $5.80 vs $19.30 = $13.50/mes ahorrado
         */
        messages: [{
          role: "user",
          content: fullPrompt
        }]
      });

      console.log(`✅ ${questionsPerCall} preguntas ${questionType} generadas en intento ${attempt}`);
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
// FUNCIÓN PARA ALEATORIZAR OPCIONES
// ========================

function randomizeQuestionOptions(question) {
  // Guardar la opción correcta original
  const correctOption = question.options[question.correct];

  // Crear array de índices [0, 1, 2, 3]
  const indices = [0, 1, 2, 3];

  // Algoritmo Fisher-Yates para barajar aleatoriamente
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Reordenar las opciones según los índices barajados
  const shuffledOptions = indices.map(i => question.options[i]);

  // Encontrar la nueva posición de la opción correcta
  const newCorrectIndex = shuffledOptions.indexOf(correctOption);

  // Actualizar las letras de las opciones (A, B, C, D)
  const letters = ['A', 'B', 'C', 'D'];
  const reorderedOptions = shuffledOptions.map((option, index) => {
    // Remover la letra anterior y agregar la nueva
    const optionText = option.substring(3); // Quitar "A) ", "B) ", etc.
    return `${letters[index]}) ${optionText}`;
  });

  return {
    ...question,
    options: reorderedOptions,
    correct: newCorrectIndex
  };
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

// PROMPTS OPTIMIZADOS - 3 NIVELES: Simple (30%), Media (60%), Elaborada (10%)

// PROMPT SIMPLE (30% - Genera 3 preguntas por llamada) - PREGUNTAS DIRECTAS
const CLAUDE_PROMPT_SIMPLE = `Genera 3 preguntas test DIRECTAS de Técnico Farmacia. Solo JSON.

ESTILO: Pregunta directa sin contexto ni enunciado largo.

EJEMPLOS:
- "¿Cuál es la temperatura de conservación de medicamentos termolábiles?"
- "¿Qué ratio habitantes/farmacia rige en zonas semiurbanas?"
- "¿Cuánto tiempo puede conservarse una fórmula magistral acuosa?"

VARIEDAD:
- Pregunta 1: Muy difícil
- Pregunta 2: Difícil
- Pregunta 3: Media

REGLAS:
- Pregunta: 1 línea, máximo 15 palabras
- 4 opciones (A,B,C,D), 1 correcta
- Distractores: altera números/plazos del texto
- Explicación: 1 línea (máximo 12 palabras)
- Conceptos DIFERENTES entre sí

JSON: {"questions":[{"question":"","options":["A) ","B) ","C) ","D) "],"correct":0,"explanation":"","difficulty":"","page_reference":""}]}

TEXTO:
{{CONTENT}}`;

// PROMPT MEDIA (50% - Genera 3 preguntas por llamada) - CONTEXTO CORTO
const CLAUDE_PROMPT_MEDIA = `Genera 3 preguntas test con CONTEXTO CORTO de Técnico Farmacia. Solo JSON.

ESTILO: Contexto breve (1-2 líneas) + pregunta concreta.

EJEMPLOS:
- "Un medicamento llega a 15°C. ¿Es aceptable para termolábiles?"
- "Una zona tiene 5.600 habitantes. ¿Cuántas farmacias pueden abrirse?"
- "Preparas una fórmula acuosa hoy. ¿Hasta cuándo es válida?"

VARIEDAD:
- Pregunta 1: Muy difícil
- Pregunta 2: Difícil
- Pregunta 3: Media

REGLAS:
- Contexto + pregunta: máximo 25 palabras total
- 4 opciones, distorsiona números en incorrectas
- Explicación: 1 línea (máximo 15 palabras)
- Situaciones DIFERENTES entre sí

JSON: {"questions":[{"question":"","options":["A) ","B) ","C) ","D) "],"correct":0,"explanation":"","difficulty":"","page_reference":""}]}

TEXTO:
{{CONTENT}}`;

// PROMPT ELABORADA (20% - Genera 2 preguntas por llamada) - CASOS PRÁCTICOS LARGOS
const CLAUDE_PROMPT_ELABORADA = `Genera 2 preguntas test con CASOS PRÁCTICOS completos. Solo JSON.

ESTILO: Situación realista detallada (3-4 líneas) + pregunta específica.

CASOS PRÁCTICOS (elegir 2 tipos DIFERENTES):
A) Recepción: "Durante la recepción de un pedido observas que..."
B) Elaboración: "Al preparar una fórmula magistral en el laboratorio detectas..."
C) Dispensación: "Un paciente solicita un medicamento y al revisar..."
D) Control: "Durante el inventario del almacén compruebas que..."
E) Conservación: "Al verificar las condiciones de almacenamiento encuentras..."
F) Análisis: "En el laboratorio de análisis clínicos observas que..."

REGLAS:
- Caso completo con detalles relevantes
- 4 opciones, distorsiona datos numéricos
- Explicación: 2 líneas (máximo 25 palabras)
- Dificultad: muy difícil (ambas)
- NO repetir tipo de caso

JSON: {"questions":[{"question":"","options":["A) ","B) ","C) ","D) "],"correct":0,"explanation":"","difficulty":"muy difícil","page_reference":""}]}

TEXTO:
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

// Función para dividir contenido en chunks ULTRA-OPTIMIZADO (1200 caracteres = máxima eficiencia)
function splitIntoChunks(content, chunkSize = 1200) {
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

  // Dividir en chunks de ~1200 caracteres (optimizado para costos)
  const chunks = splitIntoChunks(allContent, 1200);

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
    const userId = req.user.id;

    if (!topics?.length) {
      return res.status(400).json({ error: 'Selecciona al menos un tema' });
    }

    console.log(`📚 Usuario ${userId} solicita ${questionCount} preguntas de:`, topics);

    // Obtener todo el contenido para dividir en chunks
    const allContent = await getDocumentsByTopics(topics);

    if (!allContent || !allContent.trim()) {
      return res.status(404).json({
        error: 'No se encontró contenido para los temas seleccionados'
      });
    }

    // Dividir en chunks de 1200 caracteres
    const chunks = splitIntoChunks(allContent, 1200);
    console.log(`📄 Documento dividido en ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return res.status(404).json({ error: 'No hay contenido suficiente' });
    }

    const topicId = topics.join(','); // Combinar topics si son múltiples
    let allGeneratedQuestions = [];

    // SISTEMA 3 NIVELES: 30% simples / 60% medias / 10% elaboradas
    const totalNeeded = questionCount;
    const simpleNeeded = Math.round(totalNeeded * 0.30); // 30% simples
    const mediaNeeded = Math.round(totalNeeded * 0.60); // 60% medias
    const elaboratedNeeded = totalNeeded - simpleNeeded - mediaNeeded; // 10% elaboradas (resto)

    const simpleCalls = Math.ceil(simpleNeeded / 3); // 3 preguntas simples por llamada
    const mediaCalls = Math.ceil(mediaNeeded / 3); // 3 preguntas medias por llamada
    const elaboratedCalls = Math.ceil(elaboratedNeeded / 2); // 2 preguntas elaboradas por llamada

    console.log(`🎯 Plan (30/60/10): ${simpleNeeded} simples (${simpleCalls} llamadas) + ${mediaNeeded} medias (${mediaCalls} llamadas) + ${elaboratedNeeded} elaboradas (${elaboratedCalls} llamadas)`);

    // Generar preguntas SIMPLES (30%)
    for (let i = 0; i < simpleCalls; i++) {
      const chunkIndex = db.getUnusedChunkIndex(userId, topicId, chunks.length);
      const selectedChunk = chunks[chunkIndex];

      console.log(`\n⚪ SIMPLE ${i + 1}/${simpleCalls} - Chunk ${chunkIndex}/${chunks.length}`);
      console.log(`📝 "${selectedChunk.substring(0, 100)}..."`);

      const fullPrompt = CLAUDE_PROMPT_SIMPLE.replace('{{CONTENT}}', selectedChunk);

      try {
        const response = await callClaudeWithImprovedRetry(fullPrompt, 600, 'simples', 3);
        const responseText = response.content[0].text;
        const questionsData = parseClaudeResponse(responseText);

        if (questionsData?.questions?.length) {
          allGeneratedQuestions.push(...questionsData.questions);
          db.markChunkAsUsed(userId, topicId, chunkIndex);
        }
      } catch (error) {
        console.error(`❌ Error en simple ${i + 1}:`, error.message);
      }
    }

    // Generar preguntas MEDIAS (50%)
    for (let i = 0; i < mediaCalls; i++) {
      const chunkIndex = db.getUnusedChunkIndex(userId, topicId, chunks.length);
      const selectedChunk = chunks[chunkIndex];

      console.log(`\n🔵 MEDIA ${i + 1}/${mediaCalls} - Chunk ${chunkIndex}/${chunks.length}`);
      console.log(`📝 "${selectedChunk.substring(0, 100)}..."`);

      const fullPrompt = CLAUDE_PROMPT_MEDIA.replace('{{CONTENT}}', selectedChunk);

      try {
        const response = await callClaudeWithImprovedRetry(fullPrompt, 900, 'medias', 3);
        const responseText = response.content[0].text;
        const questionsData = parseClaudeResponse(responseText);

        if (questionsData?.questions?.length) {
          allGeneratedQuestions.push(...questionsData.questions);
          db.markChunkAsUsed(userId, topicId, chunkIndex);
        }
      } catch (error) {
        console.error(`❌ Error en media ${i + 1}:`, error.message);
      }
    }

    // Generar preguntas ELABORADAS (20%)
    for (let i = 0; i < elaboratedCalls; i++) {
      const chunkIndex = db.getUnusedChunkIndex(userId, topicId, chunks.length);
      const selectedChunk = chunks[chunkIndex];

      console.log(`\n🔴 ELABORADA ${i + 1}/${elaboratedCalls} - Chunk ${chunkIndex}/${chunks.length}`);
      console.log(`📝 "${selectedChunk.substring(0, 100)}..."`);

      const fullPrompt = CLAUDE_PROMPT_ELABORADA.replace('{{CONTENT}}', selectedChunk);

      try {
        const response = await callClaudeWithImprovedRetry(fullPrompt, 1000, 'elaboradas', 2);
        const responseText = response.content[0].text;
        const questionsData = parseClaudeResponse(responseText);

        if (questionsData?.questions?.length) {
          allGeneratedQuestions.push(...questionsData.questions);
          db.markChunkAsUsed(userId, topicId, chunkIndex);
        }
      } catch (error) {
        console.error(`❌ Error en elaborada ${i + 1}:`, error.message);
      }
    }

    // Validar y aleatorizar todas las preguntas generadas
    const finalQuestions = allGeneratedQuestions.slice(0, questionCount).map((q, index) => {
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

      // ALEATORIZAR ORDEN DE LAS OPCIONES
      const randomizedQuestion = randomizeQuestionOptions(q);
      console.log(`🎲 Pregunta ${index + 1}: "${q.question.substring(0, 50)}..." - Correcta: ${['A', 'B', 'C', 'D'][randomizedQuestion.correct]} - Dificultad: ${q.difficulty}`);

      return randomizedQuestion;
    });

    // Si no se generaron suficientes preguntas, agregar fallback
    if (finalQuestions.length === 0) {
      console.log('⚠️ No se generaron preguntas, usando fallback');
      const fallbackQuestion = {
        question: "¿Cuál es la temperatura de conservación de los medicamentos termolábiles?",
        options: [
          "A) Entre 2°C y 8°C en frigorífico",
          "B) Entre 15°C y 25°C a temperatura ambiente",
          "C) Entre -18°C y -25°C en congelador",
          "D) Entre 8°C y 15°C en cámara fría"
        ],
        correct: 0,
        explanation: "Los medicamentos termolábiles deben conservarse entre 2°C y 8°C.",
        difficulty: "media",
        page_reference: "Tema de Farmacia"
      };
      finalQuestions.push(randomizeQuestionOptions(fallbackQuestion));
    }

    // Registrar actividad por cada pregunta generada
    finalQuestions.forEach(() => {
      db.logActivity(userId, 'question_generated', topics[0]);
    });

    // Mostrar cobertura de chunks
    const coverage = db.getChunkCoverage(userId, topicId);
    console.log(`📊 Cobertura del tema: ${coverage}/${chunks.length} chunks usados (${Math.round(coverage/chunks.length*100)}%)`);

    res.json({
      examId: Date.now(),
      questions: finalQuestions,
      topics,
      questionCount: finalQuestions.length,
      coverage: {
        used: coverage,
        total: chunks.length,
        percentage: Math.round(coverage/chunks.length*100)
      }
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
    const { topicId, questionData, userAnswer, isCorrect, isReview, questionId } = req.body;
    const userId = req.user.id;

    // LOG DETALLADO PARA DEBUG
    console.log(`📝 RECORD-ANSWER - Usuario: ${userId}, Tema: ${topicId}, isReview: ${isReview}, questionId: ${questionId}, isCorrect: ${isCorrect}`);

    // Obtener título del tema
    const topicConfig = TOPIC_CONFIG[topicId];
    const topicTitle = topicConfig?.title || 'Tema desconocido';

    // SISTEMA DE REPASO: Si es una pregunta de repaso
    if (isReview && questionId) {
      console.log(`🔍 MODO REPASO DETECTADO - questionId: ${questionId}, isCorrect: ${isCorrect}`);
      if (isCorrect) {
        // Si acierta la pregunta de repaso, ELIMINARLA de preguntas falladas
        const result = db.removeFailedQuestion(userId, questionId);
        console.log(`✅ ELIMINANDO pregunta ${questionId} de usuario ${userId} - Resultado:`, result);
      } else {
        // Si falla de nuevo, se mantiene en preguntas falladas
        console.log(`❌ Pregunta de repaso ${questionId} fallada nuevamente - Se mantiene`);
      }
    } else {
      // SISTEMA NORMAL: Preguntas nuevas generadas
      // Actualizar estadísticas en la base de datos
      db.updateUserStats(userId, topicId, topicTitle, isCorrect);

      // Si es incorrecta, guardar en preguntas falladas
      if (!isCorrect) {
        db.addFailedQuestion(userId, topicId, questionData, userAnswer);
      }
    }

    // Obtener estadísticas actualizadas del usuario para este tema
    const allStats = db.getUserStats(userId);
    const topicStats = allStats.find(s => s.topic_id === topicId);

    res.json({
      success: true,
      stats: topicStats || { total_questions: 0, correct_answers: 0, accuracy: 0 },
      removedFromReview: isReview && isCorrect // Indicar si se eliminó del repaso
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

// Nuevo endpoint: Obtener preguntas falladas de un tema como test de repaso
app.get('/api/review-exam/:topicId', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const topicId = req.params.topicId;

    console.log(`📚 Usuario ${userId} solicita test de repaso del tema: ${topicId}`);

    // Obtener todas las preguntas falladas del usuario
    const allFailedQuestions = db.getUserFailedQuestions(userId);

    // Verificar si hay preguntas para ese tema
    if (!allFailedQuestions[topicId] || !allFailedQuestions[topicId].questions.length) {
      return res.status(404).json({
        error: 'No hay preguntas falladas para repasar en este tema'
      });
    }

    const topicQuestions = allFailedQuestions[topicId].questions;

    // Formatear preguntas al formato de test (sin mostrar respuestas del usuario)
    const reviewQuestions = topicQuestions.map((q, index) => {
      // Aleatorizar opciones para que no estén siempre en el mismo orden
      const randomizedQuestion = randomizeQuestionOptions({
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        difficulty: q.difficulty,
        page_reference: q.page_reference
      });

      return {
        ...randomizedQuestion,
        id: q.id, // Mantener el ID para tracking
        isReview: true // Flag para indicar que es una pregunta de repaso
      };
    });

    console.log(`✅ Test de repaso generado: ${reviewQuestions.length} preguntas del tema ${topicId}`);

    res.json({
      examId: Date.now(),
      questions: reviewQuestions,
      topics: [topicId],
      questionCount: reviewQuestions.length,
      isReview: true // Indicar que es un test de repaso
    });

  } catch (error) {
    console.error('❌ Error generando test de repaso:', error);
    res.status(500).json({ error: 'Error al generar test de repaso' });
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