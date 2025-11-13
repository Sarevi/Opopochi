// ========================
// PM2 ECOSYSTEM CONFIG - CLUSTERING
// ========================
// Configuración para ejecutar la aplicación en modo cluster
// optimizado para KVM 2 de Hostinger (2 cores)

module.exports = {
  apps: [{
    name: 'oposicion-app',
    script: './server.js',

    // ========================
    // CLUSTERING CONFIG
    // ========================
    instances: 2,           // 2 workers (1 por core) - óptimo para 2 vCPU
    exec_mode: 'cluster',   // Modo cluster (vs fork)

    // ========================
    // CONFIGURACIÓN DE AMBIENTE
    // ========================
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // ========================
    // GESTIÓN DE MEMORIA
    // ========================
    max_memory_restart: '500M',  // Reiniciar si supera 500MB (previene leaks)

    // ========================
    // LOGS
    // ========================
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,  // Combinar logs de todos los workers

    // ========================
    // REINICIO AUTOMÁTICO
    // ========================
    watch: false,  // No reiniciar en cambios de archivos (producción)
    autorestart: true,  // Reiniciar si crashea
    max_restarts: 10,  // Máximo 10 reinicios en...
    min_uptime: '10s',  // ...10 segundos (previene crash loops)

    // ========================
    // GRACEFUL SHUTDOWN
    // ========================
    kill_timeout: 5000,  // 5 segundos para cerrar conexiones antes de kill
    wait_ready: true,  // Esperar a que el servidor esté listo
    listen_timeout: 10000,  // 10 segundos timeout para escuchar puerto

    // ========================
    // HEALTH CHECK
    // ========================
    // PM2 reinicia automáticamente si el worker no responde
    instance_var: 'INSTANCE_ID'  // Variable de entorno con ID del worker
  }]
};

// ========================
// NOTAS DE USO
// ========================
//
// Iniciar con clustering:
//   pm2 start ecosystem.config.js
//
// Ver estado:
//   pm2 list
//   pm2 monit
//
// Ver logs:
//   pm2 logs oposicion-app
//   pm2 logs oposicion-app --lines 100
//
// Recargar sin downtime:
//   pm2 reload oposicion-app
//
// Reiniciar todos:
//   pm2 restart oposicion-app
//
// Detener:
//   pm2 stop oposicion-app
//
// REVERTIR A 1 WORKER (si hay problemas):
//   pm2 delete oposicion-app
//   pm2 start server.js --name oposicion-app
//
// ========================
// VENTAJAS CON 2 WORKERS
// ========================
// - Capacidad: 100 → 200 usuarios concurrentes
// - Si un worker crashea, el otro sigue funcionando
// - Mejor distribución de carga
// - Uso completo de ambos cores (100% vs 50%)
// - 0 downtime en reloads (reload un worker a la vez)
