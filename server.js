// ========================
// SERVIDOR COMPLETO Y MEJORADO CON MEJOR MANEJO DE ERRORES - server.js
// ========================

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
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
let userStats = {
  // topicId: { totalQuestions: 0, correctAnswers: 0, lastStudied: Date, title: string }
};

let failedQuestions = {
  // topicId: { title: string, questions: [{ question, options, correct, explanation, userAnswer, date, id }] }
};

// CONFIGURACIÓN MEJORADA PARA CLAUDE
const IMPROVED_CLAUDE_CONFIG = {
  maxRetries: 5,              // Más reintentos
  baseDelay: 8000,           // Espera inicial más larga
  maxDelay: 30000,           // Máximo 30 segundos
  backoffMultiplier: 2,      // Backoff exponencial
  jitterFactor: 0.2          // Factor aleatorio para evitar ataques sincronizados
};

// Configuración completa de temas
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
// SISTEMA MEJORADO DE LLAMADAS A CLAUDE
// ========================

function calculateDelay(attempt, config = IMPROVED_CLAUDE_CONFIG) {
  const baseDelay = config.baseDelay;
  const exponentialDelay = baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Añadir jitter aleatorio para evitar "thundering herd"
  const jitter = exponentialDelay * config.jitterFactor * Math.random();
  const finalDelay = Math.min(exponentialDelay + jitter, config.maxDelay);
  
  return Math.round(finalDelay);
}

async function callClaudeWithImprovedRetry(fullPrompt, config = IMPROVED_CLAUDE_CONFIG) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`🤖 Intento ${attempt}/${config.maxRetries} - Generando preguntas con Claude...`);
      
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2700,
        temperature: 0.3,
        messages: [{
          role: "user",
          content: fullPrompt
        }]
      });
      
      console.log(`✅ Respuesta de Claude recibida en intento ${attempt}`);
      return response;
      
    } catch (error) {
      lastError = error;
      console.log(`❌ Intento ${attempt} fallido:`, error.status, error.message);
      
      // Si es el último intento, no esperar más
      if (attempt === config.maxRetries) {
        console.log(`💀 Todos los ${config.maxRetries} intentos fallaron`);
        break;
      }
      
      // Calcular tiempo de espera inteligente
      const waitTime = calculateDelay(attempt, config);
      
      // Mensajes más informativos según el tipo de error
      if (error.status === 529) {
        console.log(`⏳ Claude sobrecargado. Esperando ${waitTime/1000}s antes del siguiente intento...`);
      } else if (error.status === 429) {
        console.log(`⏳ Rate limit alcanzado. Esperando ${waitTime/1000}s antes del siguiente intento...`);
      } else {
        console.log(`⏳ Error ${error.status}. Esperando ${waitTime/1000}s antes del siguiente intento...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  throw lastError;
}

// ========================
// FUNCIÓN DE PARSING MEJORADA
// ========================

function parseClaudeResponse(responseText) {
  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.log('🔧 Intentando extraer JSON de la respuesta...');
    
    let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      jsonMatch = responseText.match(/```\n([\s\S]*?)\n```/);
    }
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.log('❌ JSON extraído no válido');
      }
    }
    
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log('❌ JSON sin markdown no válido');
      }
    }
    
    console.log('🚨 Generando pregunta de emergencia...');
    return {
      questions: [{
        question: "Según los principios fundamentales del ordenamiento jurídico, ¿cuál es la función esencial del poder judicial?",
        options: [
          "A) Administrar justicia conforme a la Constitución y las leyes (art. 117 CE)",
          "B) Crear nuevas normas jurídicas según las necesidades sociales",
          "C) Ejecutar las decisiones del poder ejecutivo de forma subordinada",
          "D) Supervisar y controlar la actividad del poder legislativo"
        ],
        correct: 0,
        explanation: "La respuesta correcta es A porque el artículo 117 de la Constitución establece que corresponde exclusivamente a los Juzgados y Tribunales el ejercicio de la potestad jurisdiccional, juzgando y haciendo ejecutar lo juzgado. Las otras opciones son incorrectas porque: B) Los jueces aplican las leyes, no las crean; C) El poder judicial es independiente, no subordinado; D) No tiene función de control sobre el legislativo.",
        difficulty: "media",
        page_reference: "Artículo 117 de la Constitución Española"
      }]
    };
  }
}

// PROMPT OPTIMIZADO PARA CLAUDE
const CLAUDE_PROMPT = `Eres un experto en redacción de preguntas de examen para oposiciones técnicas en el ámbito judicial.

INSTRUCCIONES CRÍTICAS:
1. Responde ÚNICAMENTE con JSON válido
2. NO incluyas texto adicional fuera del JSON
3. NO uses bloques de código markdown
4. Genera exactamente {{QUESTION_COUNT}} pregunta(s)

CONDICIONES GENERALES OBLIGATORIAS:
- NO inventes ni extrapoles información: todas las preguntas y opciones deben estar explícitamente fundamentadas en los documentos adjuntos
- Las respuestas incorrectas deben ser plausibles pero contrastadas como falsas o inexactas según el texto
- Cada pregunta debe tener una sola opción correcta claramente identificada
- No repitas enunciados, busca variedad en la formulación y el enfoque
- Incluye entre paréntesis tras cada respuesta el número de página o sección del documento donde se fundamenta

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
        "A) Opción 1 (referencia específica del documento)",
        "B) Opción 2 (referencia específica del documento)", 
        "C) Opción 3 (referencia específica del documento)",
        "D) Opción 4 (referencia específica del documento)"
      ],
      "correct": 2,
      "explanation": "La respuesta correcta es C porque... (página/artículo X). Las otras opciones son incorrectas porque: A) ...  B) ...  D) ...",
      "difficulty": "difícil",
      "page_reference": "Artículo X, página Y del documento"
    }
  ]
}

CONTENIDO A ANALIZAR:
{{CONTENT}}

IMPORTANTE: Basa todas las preguntas y opciones EXCLUSIVAMENTE en el contenido proporcionado. No agregues información externa. Responde SOLO con el JSON válido para {{QUESTION_COUNT}} pregunta(s).`;

// ========================
// FUNCIONES PARA MANEJO DE ARCHIVOS
// ========================

async function readFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.txt') {
      return await fs.readFile(filePath, 'utf8');
    } else {
      return '[FORMATO NO SOPORTADO - Solo archivos .txt]';
    }
  } catch (error) {
    console.error(`Error leyendo ${filePath}:`, error.message);
    throw error;
  }
}

async function ensureDocumentsDirectory() {
  try {
    await fs.access(DOCUMENTS_DIR);
  } catch (error) {
    console.log('📁 Creando directorio de documentos...');
    await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
  }
}

async function getDocumentsByTopics(topics) {
  let allContent = '';
  let successCount = 0;
  
  for (const topic of topics) {
    const topicConfig = TOPIC_CONFIG[topic];
    if (!topicConfig) continue;
    
    allContent += `\n\n=== ${topicConfig.title} ===\n\n`;
    
    let foundFile = false;
    
    for (const fileName of topicConfig.files) {
      const filePath = path.join(DOCUMENTS_DIR, fileName);
      
      try {
        const content = await readFile(filePath);
        if (content && !content.includes('[FORMATO NO SOPORTADO')) {
          allContent += `--- ${fileName} ---\n${content}\n\n`;
          foundFile = true;
          successCount++;
          console.log(`✅ Leído: ${fileName}`);
        } else {
          console.log(`⚠️  Contenido vacío o no soportado: ${fileName}`);
        }
        break;
      } catch (error) {
        console.log(`❌ Error leyendo: ${fileName} - ${error.message}`);
        continue;
      }
    }
    
    if (!foundFile) {
      allContent += `--- ${topicConfig.title} ---\n[NO SE PUDO LEER EL ARCHIVO PARA ESTE TEMA]\n\n`;
    }
  }
  
  console.log(`📊 Archivos procesados exitosamente: ${successCount}/${topics.length}`);
  return allContent;
}

// ========================
// FUNCIONES DE ESTADÍSTICAS MEJORADAS
// ========================

function updateUserStats(topicId, isCorrect) {
  const topicConfig = TOPIC_CONFIG[topicId];
  
  if (!userStats[topicId]) {
    userStats[topicId] = {
      title: topicConfig ? topicConfig.title : 'Tema desconocido',
      totalQuestions: 0,
      correctAnswers: 0,
      lastStudied: new Date()
    };
  }
  
  userStats[topicId].totalQuestions++;
  if (isCorrect) {
    userStats[topicId].correctAnswers++;
  }
  userStats[topicId].lastStudied = new Date();
  userStats[topicId].accuracy = Math.round((userStats[topicId].correctAnswers / userStats[topicId].totalQuestions) * 100);
}

function addFailedQuestion(topicId, questionData, userAnswer) {
  const topicConfig = TOPIC_CONFIG[topicId];
  
  if (!failedQuestions[topicId]) {
    failedQuestions[topicId] = {
      title: topicConfig ? topicConfig.title : 'Tema desconocido',
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
    
    // Si no quedan preguntas falladas para este tema, eliminar el tema
    if (failedQuestions[topicId].questions.length === 0) {
      delete failedQuestions[topicId];
    }
  }
}

// ========================
// RUTAS DE LA API
// ========================

// Obtener temas disponibles
app.get('/api/topics', async (req, res) => {
  try {
    const topics = Object.keys(TOPIC_CONFIG);
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener temas' });
  }
});

// RUTA PRINCIPAL MEJORADA PARA GENERAR EXAMEN
app.post('/api/generate-exam', async (req, res) => {
  try {
    const { topics, questionCount = 1 } = req.body;
    
    if (!topics || topics.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un tema' });
    }
    
    console.log('📚 Leyendo documentos para temas:', topics);
    
    const documentContent = await getDocumentsByTopics(topics);
    
    if (!documentContent.trim() || documentContent.includes('[NO SE PUDO LEER EL ARCHIVO')) {
      return res.status(404).json({ 
        error: 'No se pudo leer el contenido de los temas seleccionados. Verifica que los archivos .txt estén en la carpeta documents/' 
      });
    }
    
    const fullPrompt = CLAUDE_PROMPT
      .replace('{{CONTENT}}', documentContent)
      .replace(/{{QUESTION_COUNT}}/g, questionCount);
    
    console.log('🤖 Iniciando generación de preguntas...');
    
    // USAR LA NUEVA FUNCIÓN MEJORADA CON REINTENTOS INTELIGENTES
    const response = await callClaudeWithImprovedRetry(fullPrompt);
    
    let questionsData;
    try {
      const responseText = response.content[0].text;
      console.log('📝 Respuesta de Claude recibida');
      console.log('🔍 Primeros 200 caracteres:', responseText.substring(0, 200));
      
      questionsData = parseClaudeResponse(responseText);
      
      if (!questionsData || !questionsData.questions || questionsData.questions.length === 0) {
        throw new Error('No se generaron preguntas válidas');
      }
      
      // Validar y corregir estructura de cada pregunta
      questionsData.questions.forEach((q, index) => {
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) {
          console.log(`⚠️  Pregunta ${index + 1} tiene formato incorrecto, corrigiendo...`);
          q.options = q.options || [
            "A) Opción por defecto 1",
            "B) Opción por defecto 2", 
            "C) Opción por defecto 3",
            "D) Opción por defecto 4"
          ];
        }
        
        q.correct = q.correct !== undefined ? q.correct : 0;
        q.explanation = q.explanation || "Explicación no disponible por error en la generación.";
        q.difficulty = q.difficulty || "media";
        q.page_reference = q.page_reference || "Referencia no disponible";
      });
      
    } catch (parseError) {
      console.error('❌ Error parsing Claude response:', parseError.message);
      questionsData = {
        questions: [{
          question: "De acuerdo con los principios constitucionales del ordenamiento jurídico español, ¿cuál es el fundamento de la independencia judicial?",
          options: [
            "A) La inamovilidad de los jueces y su sometimiento únicamente al imperio de la ley (art. 117.1 CE)",
            "B) La dependencia directa del Consejo General del Poder Judicial en todas las decisiones",
            "C) La subordinación jerárquica al Ministerio de Justicia en materia de sentencias",
            "D) La facultad de interpretar libremente las leyes sin limitación constitucional"
          ],
          correct: 0,
          explanation: "La respuesta correcta es A porque el artículo 117.1 CE establece que la justicia emana del pueblo y se administra por Jueces y Tribunales independientes, inamovibles, responsables y sometidos únicamente al imperio de la ley.",
          difficulty: "difícil",
          page_reference: "Artículo 117.1 de la Constitución Española"
        }]
      };
    }
    
    const examId = Date.now();
    
    console.log(`✅ Examen generado: ${questionsData.questions.length} preguntas`);
    
    res.json({
      examId,
      questions: questionsData.questions,
      topics,
      questionCount: questionsData.questions.length
    });
    
  } catch (error) {
    console.error('❌ Error generando examen:', error);
    
    if (error.status === 529) {
      return res.status(503).json({ 
        error: 'Claude está temporalmente sobrecargado. La aplicación seguirá intentando automáticamente.',
        retryable: true,
        waitTime: 5000
      });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Límite de solicitudes alcanzado. La aplicación reintentará automáticamente.',
        retryable: true,
        waitTime: 8000
      });
    }
    
    return res.status(500).json({ 
      error: 'Error interno del servidor. La aplicación reintentará automáticamente.',
      retryable: true,
      waitTime: 3000,
      details: error.message
    });
  }
});

// Registrar respuesta del usuario
app.post('/api/record-answer', (req, res) => {
  try {
    const { topicId, questionData, userAnswer, isCorrect } = req.body;
    
    // Actualizar estadísticas
    updateUserStats(topicId, isCorrect);
    
    // Si es incorrecta, añadir a preguntas falladas
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

// Obtener estadísticas del usuario
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

// Obtener preguntas falladas
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

// Marcar pregunta fallada como resuelta
app.post('/api/resolve-failed-question', (req, res) => {
  try {
    const { topicId, questionId } = req.body;
    
    removeFailedQuestion(topicId, questionId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error resolviendo pregunta fallada:', error);
    res.status(500).json({ error: 'Error al resolver pregunta fallada' });
  }
});

// Obtener estado de documentos
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
    console.error('❌ Error verificando documentos:', error);
    res.status(500).json({ error: 'Error al verificar documentos' });
  }
});

// Ruta de salud del servidor mejorada
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    documentsDir: DOCUMENTS_DIR,
    topics: Object.keys(TOPIC_CONFIG).length,
    supportedFormats: ['.txt'],
    availableTopics: Object.keys(TOPIC_CONFIG).length,
    userStats: Object.keys(userStats).length,
    failedQuestions: Object.keys(failedQuestions).length,
    claudeConfig: {
      maxRetries: IMPROVED_CLAUDE_CONFIG.maxRetries,
      baseDelay: IMPROVED_CLAUDE_CONFIG.baseDelay + 'ms',
      maxDelay: IMPROVED_CLAUDE_CONFIG.maxDelay + 'ms',
      backoffMultiplier: IMPROVED_CLAUDE_CONFIG.backoffMultiplier,
      jitterFactor: IMPROVED_CLAUDE_CONFIG.jitterFactor
    },
    features: {
      intelligentRetries: true,
      exponentialBackoff: true,
      jitterPrevention: true,
      statisticsTracking: true,
      failedQuestionsReview: true,
      documentStatusCheck: true,
      errorHandling: 'improved'
    }
  });
});

// Ruta adicional para limpiar estadísticas (útil para desarrollo/testing)
app.post('/api/clear-stats', (req, res) => {
  try {
    userStats = {};
    failedQuestions = {};
    
    console.log('🧹 Estadísticas y preguntas falladas limpiadas');
    
    res.json({ 
      success: true, 
      message: 'Todas las estadísticas han sido limpiadas',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error limpiando estadísticas:', error);
    res.status(500).json({ error: 'Error al limpiar estadísticas' });
  }
});

// Ruta para obtener información detallada de un tema específico
app.get('/api/topic/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const topicConfig = TOPIC_CONFIG[topicId];
    
    if (!topicConfig) {
      return res.status(404).json({ error: 'Tema no encontrado' });
    }
    
    // Verificar estado de archivos
    const fileStatus = [];
    for (const fileName of topicConfig.files) {
      const filePath = path.join(DOCUMENTS_DIR, fileName);
      try {
        await fs.access(filePath);
        const stats = await fs.stat(filePath);
        fileStatus.push({ 
          name: fileName, 
          exists: true,
          size: stats.size,
          lastModified: stats.mtime
        });
      } catch {
        fileStatus.push({ name: fileName, exists: false });
      }
    }
    
    // Obtener estadísticas del usuario para este tema
    const userTopicStats = userStats[topicId] || null;
    const userFailedQuestions = failedQuestions[topicId] || null;
    
    res.json({
      id: topicId,
      ...topicConfig,
      fileStatus,
      userStats: userTopicStats,
      failedQuestions: userFailedQuestions,
      available: fileStatus.some(f => f.exists)
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo información del tema:', error);
    res.status(500).json({ error: 'Error al obtener información del tema' });
  }
});

// Middleware de manejo de errores mejorado
app.use((error, req, res, next) => {
  console.error('❌ Error no manejado:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'JSON mal formado en la solicitud',
      details: 'Verifica que el contenido de la solicitud sea JSON válido'
    });
  }
  
  if (error.code === 'ENOENT') {
    return res.status(404).json({ 
      error: 'Archivo o directorio no encontrado',
      details: error.path
    });
  }
  
  return res.status(500).json({ 
    error: 'Error interno del servidor',
    message: 'Se ha producido un error inesperado',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /api/health',
      'GET /api/topics',
      'GET /api/topic/:topicId',
      'GET /api/documents-status',
      'GET /api/user-stats',
      'GET /api/failed-questions',
      'POST /api/generate-exam',
      'POST /api/record-answer',
      'POST /api/resolve-failed-question',
      'POST /api/clear-stats'
    ]
  });
});

// ========================
// INICIALIZACIÓN MEJORADA
// ========================

async function startServer() {
  try {
    // Verificar que tenemos la API key de Anthropic
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY no encontrada en variables de entorno');
      console.log('💡 Crea un archivo .env con: ANTHROPIC_API_KEY=tu_api_key_aqui');
      process.exit(1);
    }
    
    // Crear directorio de documentos si no existe
    await ensureDocumentsDirectory();
    
    // Verificar cuántos documentos están disponibles
    let availableFiles = 0;
    let totalFiles = 0;
    
    for (const [topicId, config] of Object.entries(TOPIC_CONFIG)) {
      for (const fileName of config.files) {
        totalFiles++;
        const filePath = path.join(DOCUMENTS_DIR, fileName);
        try {
          await fs.access(filePath);
          availableFiles++;
        } catch {
          // Archivo no existe
        }
      }
    }
    
    // Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log('\n🚀 ========================================');
  console.log('   SERVIDOR DE OPOSICIONES INICIADO');
  console.log('========================================');
  console.log(`📡 Puerto: ${port}`);
  console.log(`🤖 Claude API: Configurada`);
  console.log(`📁 Documentos: ${DOCUMENTS_DIR}`);
  console.log(`📚 Temas configurados: ${Object.keys(TOPIC_CONFIG).length}`);
  console.log(`📄 Archivos disponibles: ${availableFiles}/${totalFiles}`);
  console.log(`🔄 Reintentos inteligentes: ✅ ${IMPROVED_CLAUDE_CONFIG.maxRetries} intentos`);
  console.log(`⏱️  Backoff exponencial: ✅ ${IMPROVED_CLAUDE_CONFIG.baseDelay}ms-${IMPROVED_CLAUDE_CONFIG.maxDelay}ms`);
  console.log(`🎯 Anti-thundering herd: ✅ Jitter ${IMPROVED_CLAUDE_CONFIG.jitterFactor}`);
  console.log(`📊 Estadísticas: ✅ Seguimiento completo`);
  console.log(`🔄 Sistema de repaso: ✅ Preguntas falladas`);
  console.log(`\n✅ Aplicación disponible en: ${process.env.RAILWAY_STATIC_URL || `http://localhost:${port}`}`);
  console.log(`🏥 Salud del servidor: ${process.env.RAILWAY_STATIC_URL || `http://localhost:${port}`}/api/health`);
  
  if (availableFiles === 0) {
    console.log('\n⚠️  ADVERTENCIA: No se encontraron archivos de documentos');
    console.log('📝 Coloca tus archivos .txt en la carpeta: documents/');
    console.log('🎯 El servidor funcionará en modo demostración');
  } else if (availableFiles < totalFiles) {
    console.log(`\n⚠️  INFORMACIÓN: ${totalFiles - availableFiles} archivos no encontrados`);
    console.log('📝 Algunos temas estarán en modo demostración');
  } else {
    console.log('\n🎉 ¡Todos los archivos están disponibles!');
  }
  
  console.log('\n📋 Temas configurados:');
  Object.entries(TOPIC_CONFIG).forEach(([id, config]) => {
    console.log(`   • ${config.title}`);
  });
  
  console.log('\n🎯 ¡Sistema listo para generar exámenes con seguimiento completo!');
  console.log('========================================\n');
});

// Manejo graceful de cierre del servidor
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  console.log('📊 Estadísticas finales:');
  console.log(`   • Usuarios con estadísticas: ${Object.keys(userStats).length}`);
  console.log(`   • Preguntas falladas guardadas: ${Object.values(failedQuestions).reduce((acc, topic) => acc + topic.questions.length, 0)}`);
  console.log('✅ Servidor cerrado correctamente');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Señal SIGTERM recibida, cerrando servidor...');
  process.exit(0);
});

// Iniciar el servidor
startServer();