const fs = require('fs');
const path = require('path');

const DOCUMENTS_DIR = path.join(__dirname, 'documents');

// Leer todos los archivos de la carpeta documents
const files = fs.readdirSync(DOCUMENTS_DIR);

console.log('Archivos encontrados:');
files.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`);
});

// Generar configuración automática
const config = {};
files.forEach((file, index) => {
  const baseName = path.parse(file).name;
  const id = baseName.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  
  config[id] = {
    title: baseName,
    description: baseName,
    files: [file]
  };
});

console.log('\n=== CONFIGURACIÓN GENERADA ===\n');
console.log(JSON.stringify(config, null, 2));