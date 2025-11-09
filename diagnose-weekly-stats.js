// Script de diagnóstico para estadísticas semanales
const db = require('./database.js');

console.log('🔍 DIAGNÓSTICO DE ESTADÍSTICAS SEMANALES\n');

// 1. Verificar si la tabla answer_history existe
console.log('1️⃣ Verificando tabla answer_history...');
try {
    const tableCheck = db.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='answer_history'").get();
    if (tableCheck) {
        console.log('   ✅ La tabla answer_history existe\n');
    } else {
        console.log('   ❌ La tabla answer_history NO existe');
        console.log('   💡 Solución: Reinicia el servidor (el código ya crea la tabla automáticamente)\n');
        process.exit(1);
    }
} catch (error) {
    console.error('   ❌ Error verificando tabla:', error.message);
    process.exit(1);
}

// 2. Contar registros en answer_history
console.log('2️⃣ Contando registros en answer_history...');
try {
    const count = db.db.prepare("SELECT COUNT(*) as total FROM answer_history").get();
    console.log(`   📊 Total de registros: ${count.total}`);

    if (count.total === 0) {
        console.log('   ⚠️  No hay datos registrados');
        console.log('   💡 Solución: Responde algunas preguntas en modo estudio para generar datos\n');
    } else {
        console.log('   ✅ Hay datos registrados\n');

        // Mostrar últimos 5 registros
        console.log('3️⃣ Últimos 5 registros:');
        const recent = db.db.prepare(`
            SELECT topic_title, is_correct, answered_at
            FROM answer_history
            ORDER BY answered_at DESC
            LIMIT 5
        `).all();

        recent.forEach((r, i) => {
            const status = r.is_correct ? '✅' : '❌';
            const date = new Date(r.answered_at).toLocaleString('es-ES');
            console.log(`   ${i+1}. ${status} ${r.topic_title} - ${date}`);
        });
        console.log('');
    }
} catch (error) {
    console.error('   ❌ Error contando registros:', error.message);
    process.exit(1);
}

// 3. Probar las funciones de estadísticas
console.log('4️⃣ Probando función getWeeklySummary()...');
try {
    const users = db.db.prepare("SELECT id, username FROM users LIMIT 1").get();
    if (!users) {
        console.log('   ⚠️  No hay usuarios en la base de datos');
    } else {
        console.log(`   👤 Usuario de prueba: ${users.username} (ID: ${users.id})`);
        const summary = db.getWeeklySummary(users.id, 4);
        console.log(`   📈 Semanas con datos: ${summary.length}`);

        if (summary.length > 0) {
            console.log('   ✅ La función funciona correctamente\n');
            console.log('   Resumen:');
            summary.forEach((week, i) => {
                const weekDate = new Date(week.week_start).toLocaleDateString('es-ES');
                console.log(`   ${i+1}. Semana ${weekDate}: ${week.total_questions} preguntas, ${Math.round(week.accuracy)}% acierto`);
            });
        } else {
            console.log('   ⚠️  No hay datos de las últimas 4 semanas');
            console.log('   💡 Los datos existen pero son de hace más de 4 semanas, o no hay suficientes datos\n');
        }
    }
} catch (error) {
    console.error('   ❌ Error ejecutando función:', error.message);
    console.error(error);
}

console.log('\n✅ Diagnóstico completado\n');
console.log('RESUMEN:');
console.log('- Si la tabla NO existe → Reinicia el servidor');
console.log('- Si NO hay datos → Responde preguntas en modo estudio');
console.log('- Si hay datos pero no aparecen → Verifica la consola del navegador (F12) para errores\n');
