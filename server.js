// ========================
// SERVIDOR OPTIMIZADO PARA RENDER - server.js
// ========================

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware optimizado para producción
app.use(cors({
    origin: ['http://localhost:3000', 'https://*.onrender.com'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Ruta principal para servir la aplicación
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Cliente de Anthropic (Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Directorio de documentos
const DOCUMENTS_DIR = path.join(__dirname, 'documents');

// Base de datos en memoria para estadísticas y preguntas falladas
let userStats = {};
let failedQuestions = {};

// CONFIGURACIÓN OPTIMIZADA PARA CLAUDE
const IMPROVED_CLAUDE_CONFIG = {
  maxRetries: 3,              // Reducido para Render
  baseDelay: 2000,           // Más rápido para producción
  maxDelay: 15000,           // Reducido para mejor UX
  backoffMultiplier: 2,      
  jitterFactor: 0.1          // Reducido para ser más predecible
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
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: fullPrompt
        }]
      });
      
      console.log(`✅ Pregunta generada en intento ${attempt}`);
      return response;
      
    } catch (error) {
      lastError = error;
      console.log(`❌ Intento ${attempt} fallido:`, error.status || 'Unknown', error.message);
      
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

// PROMPT OPTIMIZADO PARA CLAUDE CON SISTEMA DE CHUNKS
const CLAUDE_PROMPT = `Eres un experto en redacción de preguntas de examen para oposiciones técnicas en el ámbito judicial.

INSTRUCCIONES CRÍTICAS:
1. Responde ÚNICAMENTE con JSON válido
2. NO incluyas texto adicional fuera del JSON
3. NO uses bloques de código markdown
4. Genera exactamente {{QUESTION_COUNT}} pregunta(s)

IMPORTANTE: El contenido proporcionado es un FRAGMENTO ESPECÍFICO de un documento más amplio.
- Genera preguntas basadas ÚNICAMENTE en este fragmento concreto
- NO intentes conectar con otras partes del documento que no están aquí
- Enfócate en la información específica de este fragmento

CONDICIONES GENERALES OBLIGATORIAS:
- NO inventes ni extrapoles información: todas las preguntas y opciones deben estar explícitamente fundamentadas en el fragmento proporcionado
- Las respuestas incorrectas deben ser plausibles pero contrastadas como falsas o inexactas según el texto
- Cada pregunta debe tener una sola opción correcta claramente identificada
- Busca variedad en la formulación y el enfoque
- Incluye entre paréntesis tras cada respuesta el número de artículo o sección donde se fundamenta

DISTRIBUCIÓN DEL NIVEL DE DIFICULTAD:
- Cuando generes preguntas: 60% difíciles, 30% medias, 10% sencillas
- Si generas más de 10: mantén proporción 60% difíciles, 30% medias, 10% sencillas

DEFINICIÓN DE NIVELES:
- DIFÍCIL: Requieren análisis, comparación, integración de conceptos o atención a detalles técnicos específicos
- MEDIA: Preguntan hechos, clasificaciones, procedimientos con alguna complejidad conceptual
- SENCILLA: Pregunta directa sobre definiciones, conceptos básicos claramente establecidos

FORMATO JSON OBLIGATORIO (responde solo con esto):

{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "options": [
        "A) Opción 1 (referencia específica del fragmento)",
        "B) Opción 2 (referencia específica del fragmento)",
        "C) Opción 3 (referencia específica del fragmento)",
        "D) Opción 4 (referencia específica del fragmento)"
      ],
      "correct": 2,
      "explanation": "La respuesta correcta es C porque... (artículo/sección X). Las otras opciones son incorrectas porque: A) ...  B) ...  D) ...",
      "difficulty": "difícil",
      "page_reference": "Artículo X del fragmento proporcionado"
    }
  ]
}

FRAGMENTO DEL DOCUMENTO A ANALIZAR:
{{CONTENT}}

IMPORTANTE: Basa todas las preguntas y opciones EXCLUSIVAMENTE en este fragmento específico. No agregues información externa ni de otras partes del documento. Responde SOLO con el JSON válido para {{QUESTION_COUNT}} pregunta(s).`;

// ========================
// FUNCIONES DE ARCHIVOS OPTIMIZADAS
// ========================

async function readFile(filePath) {
  try {
    if (path.extname(filePath).toLowerCase() === '.txt') {
      return await fs.readFile(filePath, 'utf8');
    }
    return '[FORMATO NO SOPORTADO]';
  } catch (error) {
    console.error(`Error leyendo ${filePath}:`, error.message);
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

// Función para dividir contenido en chunks (páginas individuales o grupos pequeños)
function splitIntoChunks(content, chunkSize = 3000) {
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

  // Dividir en chunks de ~3000 caracteres (aprox 1-2 páginas)
  const chunks = splitIntoChunks(allContent, 3000);

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
// FUNCIONES DE ESTADÍSTICAS
// ========================

function updateUserStats(topicId, isCorrect) {
  const topicConfig = TOPIC_CONFIG[topicId];
  
  if (!userStats[topicId]) {
    userStats[topicId] = {
      title: topicConfig?.title || 'Tema desconocido',
      totalQuestions: 0,
      correctAnswers: 0,
      lastStudied: new Date()
    };
  }
  
  userStats[topicId].totalQuestions++;
  if (isCorrect) userStats[topicId].correctAnswers++;
  userStats[topicId].lastStudied = new Date();
  userStats[topicId].accuracy = Math.round((userStats[topicId].correctAnswers / userStats[topicId].totalQuestions) * 100);
}

function addFailedQuestion(topicId, questionData, userAnswer) {
  const topicConfig = TOPIC_CONFIG[topicId];
  
  if (!failedQuestions[topicId]) {
    failedQuestions[topicId] = {
      title: topicConfig?.title || 'Tema desconocido',
      questions: []
    };
  }
  
  failedQuestions[topicId].questions.push({
    ...questionData,
    userAnswer,
    date: new Date(),
    id: Date.now() + Math.random()
  });
}

function removeFailedQuestion(topicId, questionId) {
  if (failedQuestions[topicId]) {
    failedQuestions[topicId].questions = failedQuestions[topicId].questions.filter(q => q.id !== questionId);
    if (failedQuestions[topicId].questions.length === 0) {
      delete failedQuestions[topicId];
    }
  }
}

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

app.post('/api/generate-exam', async (req, res) => {
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

    const fullPrompt = CLAUDE_PROMPT
      .replace('{{CONTENT}}', documentChunk) // Usar solo el chunk aleatorio
      .replace(/{{QUESTION_COUNT}}/g, questionCount);

    const response = await callClaudeWithImprovedRetry(fullPrompt);
    
    let questionsData;
    try {
      const responseText = response.content[0].text;
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

app.post('/api/record-answer', (req, res) => {
  try {
    const { topicId, questionData, userAnswer, isCorrect } = req.body;
    
    updateUserStats(topicId, isCorrect);
    
    if (!isCorrect) {
      addFailedQuestion(topicId, questionData, userAnswer);
    }
    
    res.json({ 
      success: true, 
      stats: userStats[topicId] 
    });
    
  } catch (error) {
    console.error('❌ Error registrando respuesta:', error);
    res.status(500).json({ error: 'Error al registrar respuesta' });
  }
});

app.get('/api/user-stats', (req, res) => {
  try {
    const statsWithTitles = {};
    
    Object.entries(userStats).forEach(([topicId, stats]) => {
      if (TOPIC_CONFIG[topicId]) {
        statsWithTitles[topicId] = {
          ...stats,
          title: TOPIC_CONFIG[topicId].title,
          accuracy: stats.totalQuestions > 0 ? 
            Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0
        };
      }
    });
    
    res.json(statsWithTitles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

app.get('/api/failed-questions', (req, res) => {
  try {
    const failedWithTitles = {};
    
    Object.entries(failedQuestions).forEach(([topicId, topicData]) => {
      if (TOPIC_CONFIG[topicId] && topicData.questions.length > 0) {
        failedWithTitles[topicId] = {
          title: TOPIC_CONFIG[topicId].title,
          questions: topicData.questions
        };
      }
    });
    
    res.json(failedWithTitles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener preguntas falladas' });
  }
});

app.post('/api/resolve-failed-question', (req, res) => {
  try {
    const { topicId, questionId } = req.body;
    removeFailedQuestion(topicId, questionId);
    res.json({ success: true });
  } catch (error) {
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
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    topics: Object.keys(TOPIC_CONFIG).length,
    userStats: Object.keys(userStats).length,
    failedQuestions: Object.keys(failedQuestions).length
  });
});

// Limpiar estadísticas (útil para testing)
app.post('/api/clear-stats', (req, res) => {
  userStats = {};
  failedQuestions = {};
  res.json({ success: true, message: 'Estadísticas limpiadas' });
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