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
        /* SISTEMA PREMIUM - MÁXIMA CALIDAD (20% Simple / 60% Media / 20% Elaborada):
         *
         * PREGUNTAS SIMPLES (20% - 3 por llamada) - TIPO OPOSICIÓN:
         * - Chunk: 1200 caracteres (~480 tokens)
         * - Prompt detallado: ~200 tokens (instrucciones completas + ejemplos)
         * - Input total: ~680 tokens × $0.80/1M = $0.000544
         * - Output (800 max): ~93 tokens × 3 = 280 tokens × $4.00/1M = $0.001120
         * - Total: $0.001664 ÷ 3 = $0.000555 USD/pregunta
         *
         * PREGUNTAS MEDIAS (60% - 3 por llamada) - APLICACIÓN PRÁCTICA:
         * - Chunk: 1200 caracteres (~480 tokens)
         * - Prompt detallado: ~250 tokens (metodología + casos realistas)
         * - Input total: ~730 tokens × $0.80/1M = $0.000584
         * - Output (1100 max): ~122 tokens × 3 = 366 tokens × $4.00/1M = $0.001464
         * - Total: $0.002048 ÷ 3 = $0.000683 USD/pregunta
         *
         * PREGUNTAS ELABORADAS (20% - 2 por llamada) - CASOS COMPLEJOS:
         * - Chunk: 1200 caracteres (~480 tokens)
         * - Prompt detallado: ~350 tokens (casos multifactoriales detallados)
         * - Input total: ~830 tokens × $0.80/1M = $0.000664
         * - Output (1400 max): ~233 tokens × 2 = 466 tokens × $4.00/1M = $0.001864
         * - Total: $0.002528 ÷ 2 = $0.001264 USD/pregunta
         *
         * COSTO PROMEDIO PONDERADO (20/60/20):
         * (0.20 × $0.000555) + (0.60 × $0.000683) + (0.20 × $0.001264)
         * = $0.000111 + $0.000410 + $0.000253
         * = $0.000774 USD (~0.00072 EUR) por pregunta
         *
         * 🎯 SISTEMA PREMIUM - MÁXIMA CALIDAD:
         * • Con 1€ generas ~1,290 preguntas de CALIDAD OPOSICIÓN
         * • Incremento coste: +24% vs sistema anterior (+$0.15/100 preguntas)
         * • Mejora calidad: SIGNIFICATIVA (nivel examen oficial)
         * • Examen 100 preguntas: $0.077 USD (~7 céntimos)
         * • Balance: EXCELENTE relación calidad/precio para uso educativo
         *
         * CARACTERÍSTICAS PREMIUM:
         * • Prompts extensos con metodología detallada
         * • Ejemplos de preguntas tipo oposición real
         * • Instrucciones para distractores inteligentes
         * • Casos prácticos multifactoriales realistas
         * • Verificación estricta contra invención de datos
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

// PROMPT SIMPLE (20% - Genera 3 preguntas por llamada) - PREGUNTAS DIRECTAS
const CLAUDE_PROMPT_SIMPLE = `Eres evaluador experto para OPOSICIONES de Técnico en Farmacia.

GENERA 3 preguntas tipo TEST de conocimientos fundamentales basadas en la documentación.

ESTILO PROFESIONAL:
✓ "Según el RD 1345/2007, ¿qué plazo máximo tiene la Administración para resolver solicitudes de autorización?"
✓ "¿Cuál es el rango de temperatura establecido para la conservación de medicamentos termolábiles?"
✓ "¿Qué tiempo máximo de validez tienen las fórmulas magistrales acuosas sin conservantes?"

METODOLOGÍA:
1. Identifica 3 conceptos clave DIFERENTES (plazos normativos, temperaturas, rangos, procedimientos, definiciones)
2. Formula pregunta profesional directa
3. Extrae respuesta literal de la documentación
4. Genera 3 distractores plausibles:
   - Cifras próximas alteradas (2-8°C → opciones: 0-4°C, 4-10°C, 15-25°C)
   - Plazos similares incorrectos (3 meses → opciones: 1 mes, 6 meses, 1 año)
   - Conceptos relacionados pero no aplicables

DIFICULTAD:
- Pregunta 1: Difícil (normativa específica o dato técnico preciso)
- Pregunta 2: Media (procedimiento estándar o concepto técnico)
- Pregunta 3: Media-Fácil (fundamento esencial)

EXPLICACIÓN (máximo 15 palabras):
✓ Cita directa: "Art. 12.2 establece plazo de 3 meses"
✓ Referencia normativa: "RD 824/2010 fija temperatura 2-8°C"
✗ NUNCA: "El texto dice", "Según los apuntes", "La documentación indica"

PROHIBIDO:
- Inventar datos no documentados
- Códigos ATC completos (usar familias: IECAs, ARA-II)
- Listados >3 medicamentos
- Precios, marcas comerciales

JSON: {"questions":[{"question":"","options":["A) ","B) ","C) ","D) "],"correct":0,"explanation":"","difficulty":"","page_reference":""}]}

DOCUMENTACIÓN:
{{CONTENT}}`;

// PROMPT MEDIA (60% - Genera 3 preguntas por llamada) - APLICACIÓN PRÁCTICA
const CLAUDE_PROMPT_MEDIA = `Eres evaluador experto para OPOSICIONES de Técnico en Farmacia.

GENERA 3 preguntas de CASOS PRÁCTICOS BREVES que evalúen aplicación de conocimientos.

ESTILO PROFESIONAL (situación + decisión):
✓ "Recibes vacunas que han viajado a 12°C durante 3 horas. ¿Cuál es tu actuación según protocolo de cadena de frío?"
✓ "Una embarazada solicita un medicamento categoría D en embarazo. ¿Qué debes hacer?"
✓ "El Datamatrix de un lote no incluye número de serie. ¿Es conforme con la normativa de trazabilidad?"

METODOLOGÍA:
1. Identifica PROCEDIMIENTO, PROTOCOLO o CRITERIO normativo
2. Crea situación profesional realista (1-2 líneas, máx 30 palabras)
3. Pregunta: ¿Cuál es la actuación/decisión correcta?
4. Respuesta correcta: Acción que establece la normativa
5. Distractores profesionales:
   - Acción parcial (omite paso crítico del protocolo)
   - Acción excesiva (añade requisitos no exigidos)
   - Práctica común pero técnicamente incorrecta

CONTEXTO SITUACIONES:
- Trabajo diario del técnico (recepción, dispensación, elaboración, control)
- Datos reales documentados (temperaturas, plazos, categorías)
- Requieren conocer procedimiento específico

DIFICULTAD:
- Pregunta 1: Difícil (múltiples factores, protocolo complejo)
- Pregunta 2: Media (procedimiento estándar)
- Pregunta 3: Media-Fácil (criterio básico)

EXPLICACIÓN (máximo 18 palabras):
✓ Directa: "Protocolo cadena frío requiere rechazo si >8°C más de 2 horas"
✓ Normativa: "Art. 85 obliga dispensación solo con autorización médica explícita"
✗ NUNCA: "El texto dice que", "Según documentación"

PROHIBIDO:
- Inventar datos no documentados
- Situaciones con cifras irreales
- Normativa obsoleta

JSON: {"questions":[{"question":"","options":["A) ","B) ","C) ","D) "],"correct":0,"explanation":"","difficulty":"","page_reference":""}]}

DOCUMENTACIÓN:
{{CONTENT}}`;

// PROMPT ELABORADA (20% - Genera 2 preguntas por llamada) - CASOS COMPLEJOS
const CLAUDE_PROMPT_ELABORADA = `Eres evaluador experto para OPOSICIONES de Técnico en Farmacia.

GENERA 2 CASOS PRÁCTICOS COMPLEJOS con múltiples factores que requieran razonamiento profesional.

ESTILO PROFESIONAL (situación multifactorial 50-70 palabras):
✓ "Durante la recepción de insulinas NPH observas: albarán indica salida hace 36 horas, temperatura registrada 14°C, embalaje con golpes, documentación incluye certificado de cadena de frío válido. El transportista informa de avería en ruta. ¿Cuál es tu actuación prioritaria?"

✓ "Al elaborar fórmula dermatológica con hidroquinona al 4%, el envase original muestra: apertura hace 8 meses, ligera decoloración amarillenta, certificado de análisis con pureza 99.5%, receta médica para melasma. ¿Qué decisión tomas?"

TIPOS DE CASOS (selecciona 2 DIFERENTES):
A) Recepción/Control entrada: Verificación documentación, control temperatura, inspección visual, conformidad
B) Elaboración magistral: Estabilidad principios activos, incompatibilidades, caducidad materias primas
C) Dispensación especializada: Verificación recetas, categorías embarazo, sustancias controladas, sustituciones
D) Almacenamiento/Conservación: Condiciones ambientales, segregación por tipo, control temperatura continuo
E) Control calidad/Trazabilidad: Verificación lotes, Datamatrix, alertas sanitarias, retiradas
F) Gestión residuos sanitarios: Clasificación (grupos I-IV), segregación, procedimientos eliminación
G) Preparación nutriciones parenterales: Cálculo osmolaridad, compatibilidades, estabilidad
H) Reenvasado/Reacondicionamiento: Mantenimiento información, etiquetado, trazabilidad
I) Dispensación hospitalaria: Dosis unitarias, sistemas personalizados, armarios automatizados
J) Administración medicamentos: Vías administración, tiempos perfusión, incompatibilidades IV

METODOLOGÍA:
1. Identifica PROTOCOLO o PROCEDIMIENTO normativo documentado
2. Construye caso con 3-4 FACTORES documentados:
   - Factor favorecedor (elemento correcto o positivo)
   - Factor crítico (problema o desviación significativa)
   - Factores contextuales (información adicional relevante)
3. Pregunta directa: "¿Cuál es tu actuación?" o "¿Qué decisión tomas?"
4. Opciones: 4 acciones profesionales graduadas en corrección
5. Respuesta: Acción completa que establece el protocolo

DISTRACTORES PROFESIONALES:
- Acción parcial (omite paso crítico obligatorio)
- Práctica habitual pero normativamente incorrecta
- Acción extrema (demasiado permisiva o excesivamente restrictiva)

EXPLICACIÓN (máximo 20 palabras):
✓ Directa: "Protocolo exige rechazo si temperatura >8°C independientemente de certificación"
✓ Normativa: "RD 824/2010 Art. 5 prohíbe uso materias primas con signos alteración"
✗ NUNCA: "El texto indica", "Según documentación", "Los apuntes especifican"

CRÍTICO - SOLO DATOS DOCUMENTADOS:
- Todas las cifras (temperaturas, plazos, porcentajes, concentraciones) DEBEN estar documentadas
- No inventar medicamentos, normativa específica o situaciones sin base
- Dificultad: muy difícil (ambas)

JSON: {"questions":[{"question":"","options":["A) ","B) ","C) ","D) "],"correct":0,"explanation":"","difficulty":"muy difícil","page_reference":""}]}

DOCUMENTACIÓN:
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

    let allGeneratedQuestions = [];

    // CONFIGURACIÓN DE CACHÉ
    const CACHE_PROBABILITY = 0.60; // 60% intentar caché, 40% generar nueva
    let cacheHits = 0;
    let cacheMisses = 0;

    // SISTEMA 3 NIVELES: 20% simples / 60% medias / 20% elaboradas
    const totalNeeded = questionCount;
    const simpleNeeded = Math.round(totalNeeded * 0.20); // 20% simples
    const mediaNeeded = Math.round(totalNeeded * 0.60); // 60% medias
    const elaboratedNeeded = totalNeeded - simpleNeeded - mediaNeeded; // 20% elaboradas (resto)

    // Distribuir preguntas equitativamente entre temas
    const questionsPerTopic = {
      simple: Math.ceil(simpleNeeded / topics.length),
      media: Math.ceil(mediaNeeded / topics.length),
      elaborada: Math.ceil(elaboratedNeeded / topics.length)
    };

    console.log(`🎯 Plan (20/60/20): ${simpleNeeded} simples + ${mediaNeeded} medias + ${elaboratedNeeded} elaboradas`);
    console.log(`📊 Distribución por tema (${topics.length} temas): ${questionsPerTopic.simple} simples + ${questionsPerTopic.media} medias + ${questionsPerTopic.elaborada} elaboradas por tema`);

    // ====================================================================
    // GENERAR PREGUNTAS POR TEMA ESPECÍFICO (distribución equitativa)
    // ====================================================================

    for (const currentTopic of topics) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📘 Procesando tema: ${currentTopic}`);
      console.log(`${'='.repeat(60)}`);

      // Obtener contenido específico de este tema
      const topicContent = await getDocumentsByTopics([currentTopic]);
      const topicChunks = splitIntoChunks(topicContent, 1200);

      console.log(`📄 Tema ${currentTopic}: ${topicChunks.length} chunks disponibles`);

      // --- PREGUNTAS SIMPLES para este tema ---
      let simpleCount = 0;
      while (simpleCount < questionsPerTopic.simple && allGeneratedQuestions.filter(q => q._sourceTopic === currentTopic && q.difficulty === 'simple').length < questionsPerTopic.simple) {
        const questionsToGet = Math.min(3, questionsPerTopic.simple - simpleCount);
        const tryCache = Math.random() < CACHE_PROBABILITY;
        let questions = [];

        if (tryCache) {
          console.log(`\n💾 SIMPLE [${currentTopic}] - Intentando caché (${questionsToGet} preguntas)...`);
          for (let j = 0; j < questionsToGet; j++) {
            const cached = db.getCachedQuestion(userId, [currentTopic], 'simple');
            if (cached) {
              cached.question._sourceTopic = currentTopic;
              questions.push(cached.question);
              db.markQuestionAsSeen(userId, cached.cacheId, 'exam');
              cacheHits++;
              console.log(`✓ Pregunta de caché (ID: ${cached.cacheId})`);
            } else {
              break;
            }
          }
        }

        if (questions.length < questionsToGet) {
          const toGenerate = questionsToGet - questions.length;
          console.log(`\n⚪ SIMPLE [${currentTopic}] - Generando ${toGenerate} preguntas nuevas`);

          const chunkIndex = db.getUnusedChunkIndex(userId, currentTopic, topicChunks.length);
          const selectedChunk = topicChunks[chunkIndex];
          const fullPrompt = CLAUDE_PROMPT_SIMPLE.replace('{{CONTENT}}', selectedChunk);

          try {
            const response = await callClaudeWithImprovedRetry(fullPrompt, 800, 'simples', 3);
            const responseText = response.content[0].text;
            const questionsData = parseClaudeResponse(responseText);

            if (questionsData?.questions?.length) {
              questionsData.questions.slice(0, toGenerate).forEach(q => {
                q._sourceTopic = currentTopic;
                db.saveToCacheAndTrack(userId, currentTopic, 'simple', q, 'exam');
                questions.push(q);
                cacheMisses++;
              });
              db.markChunkAsUsed(userId, currentTopic, chunkIndex);
            }
          } catch (error) {
            console.error(`❌ Error generando simples [${currentTopic}]:`, error.message);
          }
        }

        allGeneratedQuestions.push(...questions);
        simpleCount += questions.length;
      }

      // --- PREGUNTAS MEDIAS para este tema ---
      let mediaCount = 0;
      while (mediaCount < questionsPerTopic.media && allGeneratedQuestions.filter(q => q._sourceTopic === currentTopic && q.difficulty === 'media').length < questionsPerTopic.media) {
        const questionsToGet = Math.min(3, questionsPerTopic.media - mediaCount);
        const tryCache = Math.random() < CACHE_PROBABILITY;
        let questions = [];

        if (tryCache) {
          console.log(`\n💾 MEDIA [${currentTopic}] - Intentando caché (${questionsToGet} preguntas)...`);
          for (let j = 0; j < questionsToGet; j++) {
            const cached = db.getCachedQuestion(userId, [currentTopic], 'media');
            if (cached) {
              cached.question._sourceTopic = currentTopic;
              questions.push(cached.question);
              db.markQuestionAsSeen(userId, cached.cacheId, 'exam');
              cacheHits++;
              console.log(`✓ Pregunta de caché (ID: ${cached.cacheId})`);
            } else {
              break;
            }
          }
        }

        if (questions.length < questionsToGet) {
          const toGenerate = questionsToGet - questions.length;
          console.log(`\n🔵 MEDIA [${currentTopic}] - Generando ${toGenerate} preguntas nuevas`);

          const chunkIndex = db.getUnusedChunkIndex(userId, currentTopic, topicChunks.length);
          const selectedChunk = topicChunks[chunkIndex];
          const fullPrompt = CLAUDE_PROMPT_MEDIA.replace('{{CONTENT}}', selectedChunk);

          try {
            const response = await callClaudeWithImprovedRetry(fullPrompt, 1100, 'medias', 3);
            const responseText = response.content[0].text;
            const questionsData = parseClaudeResponse(responseText);

            if (questionsData?.questions?.length) {
              questionsData.questions.slice(0, toGenerate).forEach(q => {
                q._sourceTopic = currentTopic;
                db.saveToCacheAndTrack(userId, currentTopic, 'media', q, 'exam');
                questions.push(q);
                cacheMisses++;
              });
              db.markChunkAsUsed(userId, currentTopic, chunkIndex);
            }
          } catch (error) {
            console.error(`❌ Error generando medias [${currentTopic}]:`, error.message);
          }
        }

        allGeneratedQuestions.push(...questions);
        mediaCount += questions.length;
      }

      // --- PREGUNTAS ELABORADAS para este tema ---
      let elaboratedCount = 0;
      while (elaboratedCount < questionsPerTopic.elaborada && allGeneratedQuestions.filter(q => q._sourceTopic === currentTopic && q.difficulty === 'elaborada').length < questionsPerTopic.elaborada) {
        const questionsToGet = Math.min(2, questionsPerTopic.elaborada - elaboratedCount);
        const tryCache = Math.random() < CACHE_PROBABILITY;
        let questions = [];

        if (tryCache) {
          console.log(`\n💾 ELABORADA [${currentTopic}] - Intentando caché (${questionsToGet} preguntas)...`);
          for (let j = 0; j < questionsToGet; j++) {
            const cached = db.getCachedQuestion(userId, [currentTopic], 'elaborada');
            if (cached) {
              cached.question._sourceTopic = currentTopic;
              questions.push(cached.question);
              db.markQuestionAsSeen(userId, cached.cacheId, 'exam');
              cacheHits++;
              console.log(`✓ Pregunta de caché (ID: ${cached.cacheId})`);
            } else {
              break;
            }
          }
        }

        if (questions.length < questionsToGet) {
          const toGenerate = questionsToGet - questions.length;
          console.log(`\n🔴 ELABORADA [${currentTopic}] - Generando ${toGenerate} preguntas nuevas`);

          const chunkIndex = db.getUnusedChunkIndex(userId, currentTopic, topicChunks.length);
          const selectedChunk = topicChunks[chunkIndex];
          const fullPrompt = CLAUDE_PROMPT_ELABORADA.replace('{{CONTENT}}', selectedChunk);

          try {
            const response = await callClaudeWithImprovedRetry(fullPrompt, 1400, 'elaboradas', 2);
            const responseText = response.content[0].text;
            const questionsData = parseClaudeResponse(responseText);

            if (questionsData?.questions?.length) {
              questionsData.questions.slice(0, toGenerate).forEach(q => {
                q._sourceTopic = currentTopic;
                db.saveToCacheAndTrack(userId, currentTopic, 'elaborada', q, 'exam');
                questions.push(q);
                cacheMisses++;
              });
              db.markChunkAsUsed(userId, currentTopic, chunkIndex);
            }
          } catch (error) {
            console.error(`❌ Error generando elaboradas [${currentTopic}]:`, error.message);
          }
        }

        allGeneratedQuestions.push(...questions);
        elaboratedCount += questions.length;
      }
    } // FIN del loop por temas

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

      // Eliminar propiedad temporal _sourceTopic antes de enviar al cliente
      delete randomizedQuestion._sourceTopic;

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

    // Mostrar cobertura de chunks por tema
    console.log(`\n📊 COBERTURA DE CHUNKS POR TEMA:`);
    const coverageByTopic = await Promise.all(
      topics.map(async (topic) => {
        const topicContent = await getDocumentsByTopics([topic]);
        const topicChunks = splitIntoChunks(topicContent, 1200);
        const coverage = db.getChunkCoverage(userId, topic);
        const percentage = topicChunks.length > 0 ? Math.round(coverage / topicChunks.length * 100) : 0;
        console.log(`  ${topic}: ${coverage}/${topicChunks.length} chunks (${percentage}%)`);
        return { topic, used: coverage, total: topicChunks.length, percentage };
      })
    );

    // Estadísticas de caché
    const total = cacheHits + cacheMisses;
    const cacheHitRate = total > 0 ? Math.round((cacheHits / total) * 100) : 0;
    console.log(`\n💾 CACHÉ: ${cacheHits} hits / ${cacheMisses} misses (${cacheHitRate}% hit rate)`);

    // Actualizar estadísticas diarias de caché
    const costPerQuestion = 0.00076;
    const totalCost = cacheMisses * costPerQuestion;
    db.updateCacheStats(cacheMisses, cacheHits, totalCost);

    // Limpiar preguntas expiradas (cada vez que se genera un examen)
    db.cleanExpiredCache();

    res.json({
      examId: Date.now(),
      questions: finalQuestions,
      topics,
      questionCount: finalQuestions.length,
      coverageByTopic,
      cacheStats: {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: cacheHitRate,
        totalQuestions: total,
        cost: totalCost.toFixed(5)
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

// ====================================================================
// FASE 2: ENDPOINT CON PREFETCH PARA ESTUDIO (RESPUESTA INSTANTÁNEA)
// ====================================================================
app.post('/api/study/question', requireAuth, async (req, res) => {
  try {
    const { topicId } = req.body;
    const userId = req.user.id;

    if (!topicId) {
      return res.status(400).json({ error: 'topicId es requerido' });
    }

    console.log(`📚 Usuario ${userId} solicita pregunta de estudio: ${topicId}`);

    // PASO 1: Verificar si hay pregunta en buffer
    const bufferSize = db.getBufferSize(userId, topicId);
    console.log(`💾 Buffer actual: ${bufferSize} preguntas`);

    let questionToReturn = null;

    if (bufferSize > 0) {
      // Obtener pregunta del buffer (INSTANT!)
      const buffered = db.getFromBuffer(userId, topicId);

      if (buffered) {
        questionToReturn = buffered.question;

        // Marcar como vista si viene de caché
        if (buffered.cacheId) {
          db.markQuestionAsSeen(userId, buffered.cacheId, 'study');
        }

        console.log(`⚡ Pregunta entregada desde buffer (INSTANT!)`);

        // Check buffer size after retrieval
        const newBufferSize = db.getBufferSize(userId, topicId);
        console.log(`💾 Buffer después de entrega: ${newBufferSize} preguntas`);

        // Si buffer bajó de 3, rellenar en background
        if (newBufferSize < 3) {
          console.log(`🔄 Buffer bajo (${newBufferSize}), iniciando refill en background...`);

          // Generar 2-3 preguntas más en background (sin esperar)
          setImmediate(async () => {
            try {
              await refillBuffer(userId, topicId, 3 - newBufferSize);
            } catch (error) {
              console.error('Error en background refill:', error);
            }
          });
        }

        // Retornar inmediatamente
        return res.json({
          questions: [questionToReturn],
          source: 'buffer',
          bufferSize: newBufferSize
        });
      }
    }

    // PASO 2: Buffer vacío - generar batch de 5 preguntas
    console.log(`🔨 Buffer vacío - generando batch inicial de 5 preguntas...`);

    const batchQuestions = await generateQuestionBatch(userId, topicId, 5);

    if (batchQuestions.length === 0) {
      return res.status(500).json({ error: 'No se pudieron generar preguntas' });
    }

    // Primera pregunta para retornar
    questionToReturn = batchQuestions[0];

    // Resto al buffer (4 preguntas)
    for (let i = 1; i < batchQuestions.length; i++) {
      const q = batchQuestions[i];
      db.addToBuffer(userId, topicId, q, q.difficulty, q._cacheId || null);
    }

    const finalBufferSize = db.getBufferSize(userId, topicId);
    console.log(`✅ Batch generado: 1 entregada + ${finalBufferSize} en buffer`);

    res.json({
      questions: [questionToReturn],
      source: 'generated',
      bufferSize: finalBufferSize
    });

  } catch (error) {
    console.error('❌ Error en /api/study/question:', error);

    const errorCode = error.status || 500;
    const errorMessage = errorCode === 529 ? 'Claude temporalmente ocupado' :
                        errorCode === 429 ? 'Límite de solicitudes alcanzado' :
                        'Error generando pregunta';

    res.status(errorCode).json({
      error: errorMessage,
      retryable: [429, 503, 529].includes(errorCode),
      waitTime: errorCode === 529 ? 5000 : 3000
    });
  }
});

/**
 * Generar batch de preguntas (mix de caché + nuevas)
 */
async function generateQuestionBatch(userId, topicId, count = 5) {
  const CACHE_PROBABILITY = 0.60;
  const questions = [];

  // Obtener contenido del tema
  const topicContent = await getDocumentsByTopics([topicId]);
  const topicChunks = splitIntoChunks(topicContent, 1200);

  if (topicChunks.length === 0) {
    throw new Error('No hay contenido disponible para este tema');
  }

  console.log(`📄 Tema ${topicId}: ${topicChunks.length} chunks disponibles`);

  // Generar preguntas mezclando dificultades
  for (let i = 0; i < count; i++) {
    // Distribuir dificultades: 20% simple, 60% media, 20% elaborada
    let difficulty = 'media';
    const rand = Math.random();
    if (rand < 0.20) difficulty = 'simple';
    else if (rand > 0.80) difficulty = 'elaborada';

    const tryCache = Math.random() < CACHE_PROBABILITY;
    let question = null;

    // Intentar caché primero
    if (tryCache) {
      const cached = db.getCachedQuestion(userId, [topicId], difficulty);
      if (cached) {
        question = cached.question;
        question._cacheId = cached.cacheId;
        question._sourceTopic = topicId;
        db.markQuestionAsSeen(userId, cached.cacheId, 'study');
        console.log(`💾 Pregunta ${i + 1}/${count} desde caché (${difficulty})`);
      }
    }

    // Si no hay en caché, generar nueva
    if (!question) {
      const chunkIndex = db.getUnusedChunkIndex(userId, topicId, topicChunks.length);
      const selectedChunk = topicChunks[chunkIndex];

      let prompt, maxTokens, calls;
      if (difficulty === 'simple') {
        prompt = CLAUDE_PROMPT_SIMPLE;
        maxTokens = 800;
        calls = 1;
      } else if (difficulty === 'media') {
        prompt = CLAUDE_PROMPT_MEDIA;
        maxTokens = 1100;
        calls = 1;
      } else {
        prompt = CLAUDE_PROMPT_ELABORATED;
        maxTokens = 1500;
        calls = 1;
      }

      const fullPrompt = prompt.replace('{{CONTENT}}', selectedChunk);

      try {
        const response = await callClaudeWithImprovedRetry(fullPrompt, maxTokens, difficulty, calls);
        const responseText = response.content[0].text;
        const questionsData = parseClaudeResponse(responseText);

        if (questionsData?.questions?.length > 0) {
          question = questionsData.questions[0];
          question._sourceTopic = topicId;

          // Guardar en caché
          db.saveToCacheAndTrack(userId, topicId, difficulty, question, 'study');

          db.markChunkAsUsed(userId, topicId, chunkIndex);
          console.log(`🆕 Pregunta ${i + 1}/${count} generada (${difficulty})`);
        }
      } catch (error) {
        console.error(`❌ Error generando pregunta ${i + 1}:`, error.message);
      }
    }

    if (question) {
      questions.push(question);
    }
  }

  return questions;
}

/**
 * Rellenar buffer en background
 */
async function refillBuffer(userId, topicId, count = 3) {
  console.log(`🔄 [Background] Rellenando buffer con ${count} preguntas...`);

  try {
    const newQuestions = await generateQuestionBatch(userId, topicId, count);

    for (const q of newQuestions) {
      db.addToBuffer(userId, topicId, q, q.difficulty, q._cacheId || null);
    }

    const bufferSize = db.getBufferSize(userId, topicId);
    console.log(`✅ [Background] Buffer rellenado: ${bufferSize} preguntas`);
  } catch (error) {
    console.error(`❌ [Background] Error rellenando buffer:`, error);
  }
}

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

// ========================
// EXAMEN OFICIAL (SIMULACRO)
// ========================

app.post('/api/exam/official', requireAuth, async (req, res) => {
  try {
    const { questionCount } = req.body; // 25, 50, 75, 100
    const userId = req.user.id;

    // Validar questionCount
    if (![25, 50, 75, 100].includes(questionCount)) {
      return res.status(400).json({ error: 'Número de preguntas inválido. Use 25, 50, 75 o 100.' });
    }

    console.log(`🎓 Usuario ${userId} solicita EXAMEN OFICIAL de ${questionCount} preguntas`);

    // Obtener todos los temas disponibles
    const allTopics = Object.keys(TOPIC_CONFIG);

    // Calcular cuántas preguntas por tema (distribución equitativa)
    const questionsPerTopic = Math.ceil(questionCount / allTopics.length);

    console.log(`📚 Generando ${questionsPerTopic} preguntas por tema de ${allTopics.length} temas`);

    // Obtener todo el contenido mezclado de todos los temas
    const allContent = await getDocumentsByTopics(allTopics);

    if (!allContent || !allContent.trim()) {
      return res.status(404).json({
        error: 'No se encontró contenido para los temas'
      });
    }

    // Dividir en chunks de 1200 caracteres
    const chunks = splitIntoChunks(allContent, 1200);
    console.log(`📄 Documento dividido en ${chunks.length} chunks de todos los temas`);

    if (chunks.length === 0) {
      return res.status(404).json({ error: 'No hay contenido suficiente' });
    }

    const topicId = 'examen-oficial'; // ID especial para examen oficial
    let allGeneratedQuestions = [];

    // SISTEMA 3 NIVELES: 20% simples / 60% medias / 20% elaboradas
    const totalNeeded = questionCount;
    const simpleNeeded = Math.round(totalNeeded * 0.20);
    const mediaNeeded = Math.round(totalNeeded * 0.60);
    const elaboratedNeeded = totalNeeded - simpleNeeded - mediaNeeded;

    const simpleCalls = Math.ceil(simpleNeeded / 3);
    const mediaCalls = Math.ceil(mediaNeeded / 3);
    const elaboratedCalls = Math.ceil(elaboratedNeeded / 2);

    console.log(`🎯 Plan (20/60/20): ${simpleNeeded} simples + ${mediaNeeded} medias + ${elaboratedNeeded} elaboradas`);

    // Generar preguntas SIMPLES (20%)
    for (let i = 0; i < simpleCalls; i++) {
      const chunkIndex = Math.floor(Math.random() * chunks.length);
      const selectedChunk = chunks[chunkIndex];

      console.log(`⚪ SIMPLE ${i + 1}/${simpleCalls}`);

      const fullPrompt = CLAUDE_PROMPT_SIMPLE.replace('{{CONTENT}}', selectedChunk);

      try {
        const response = await callClaudeWithImprovedRetry(fullPrompt, 800, 'simples', 3);
        const responseText = response.content[0].text;
        const questionsData = parseClaudeResponse(responseText);

        if (questionsData?.questions?.length) {
          allGeneratedQuestions.push(...questionsData.questions);
        }
      } catch (error) {
        console.error(`❌ Error en simple ${i + 1}:`, error.message);
      }
    }

    // Generar preguntas MEDIAS (60%)
    for (let i = 0; i < mediaCalls; i++) {
      const chunkIndex = Math.floor(Math.random() * chunks.length);
      const selectedChunk = chunks[chunkIndex];

      console.log(`🔵 MEDIA ${i + 1}/${mediaCalls}`);

      const fullPrompt = CLAUDE_PROMPT_MEDIA.replace('{{CONTENT}}', selectedChunk);

      try {
        const response = await callClaudeWithImprovedRetry(fullPrompt, 1100, 'medias', 3);
        const responseText = response.content[0].text;
        const questionsData = parseClaudeResponse(responseText);

        if (questionsData?.questions?.length) {
          allGeneratedQuestions.push(...questionsData.questions);
        }
      } catch (error) {
        console.error(`❌ Error en media ${i + 1}:`, error.message);
      }
    }

    // Generar preguntas ELABORADAS (20%)
    for (let i = 0; i < elaboratedCalls; i++) {
      const chunkIndex = Math.floor(Math.random() * chunks.length);
      const selectedChunk = chunks[chunkIndex];

      console.log(`🔴 ELABORADA ${i + 1}/${elaboratedCalls}`);

      const fullPrompt = CLAUDE_PROMPT_ELABORADA.replace('{{CONTENT}}', selectedChunk);

      try {
        const response = await callClaudeWithImprovedRetry(fullPrompt, 1400, 'elaboradas', 2);
        const responseText = response.content[0].text;
        const questionsData = parseClaudeResponse(responseText);

        if (questionsData?.questions?.length) {
          allGeneratedQuestions.push(...questionsData.questions);
        }
      } catch (error) {
        console.error(`❌ Error en elaborada ${i + 1}:`, error.message);
      }
    }

    // Validar y aleatorizar todas las preguntas generadas
    const finalQuestions = allGeneratedQuestions.slice(0, questionCount).map((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        q.options = q.options || ["A) Opción 1", "B) Opción 2", "C) Opción 3", "D) Opción 4"];
      }
      q.correct = q.correct ?? 0;
      q.explanation = q.explanation || "Explicación no disponible.";
      q.difficulty = q.difficulty || "media";
      q.page_reference = q.page_reference || "Examen Oficial";

      // Aleatorizar orden de las opciones
      return randomizeQuestionOptions(q);
    });

    // Mezclar aleatoriamente las preguntas (shuffle Fisher-Yates)
    for (let i = finalQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
    }

    console.log(`✅ Examen oficial generado: ${finalQuestions.length} preguntas mezcladas`);

    res.json({
      examId: Date.now(),
      questions: finalQuestions,
      questionCount: finalQuestions.length,
      isOfficial: true,
      topics: allTopics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generando examen oficial:', error);
    res.status(500).json({ error: 'Error al generar examen oficial' });
  }
});

// Guardar preguntas falladas del examen oficial
app.post('/api/exam/save-failed', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const { examId, examName, failedQuestions } = req.body;

    console.log(`💾 Usuario ${userId} guardando ${failedQuestions.length} preguntas falladas del "${examName}"`);

    // Guardar cada pregunta fallada con el examId como topic_id
    let savedCount = 0;
    for (const answer of failedQuestions) {
      const questionData = {
        question: answer.question,
        options: answer.options,
        correct: answer.correctAnswer,
        explanation: answer.explanation,
        difficulty: answer.difficulty || 'media',
        page_reference: answer.page_reference || ''
      };

      const result = db.addFailedQuestion(
        userId,
        examId,  // Usar examId como topic_id (ej: "examen-25-1234567890")
        questionData,
        answer.userAnswer
      );

      if (result.success && !result.duplicate) {
        savedCount++;
      }
    }

    console.log(`✅ Guardadas ${savedCount} preguntas nuevas del examen (${failedQuestions.length - savedCount} duplicadas omitidas)`);

    res.json({
      success: true,
      savedCount,
      examId,
      examName
    });

  } catch (error) {
    console.error('❌ Error guardando preguntas falladas del examen:', error);
    res.status(500).json({ error: 'Error al guardar preguntas falladas' });
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

      // FASE 2: Limpiar buffers y caché expirados cada 30 minutos
      setInterval(() => {
        console.log('🧹 Ejecutando limpieza periódica...');
        const buffersDeleted = db.cleanExpiredBuffers();
        const cacheDeleted = db.cleanExpiredCache();
        console.log(`✅ Limpieza completada: ${buffersDeleted} buffers + ${cacheDeleted} caché eliminados`);
      }, 30 * 60 * 1000); // 30 minutos

      console.log('⏰ Limpieza automática programada cada 30 minutos\n');
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