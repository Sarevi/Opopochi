# PharmaGraph

Plataforma web de infografías de medicamentos biológicos para profesionales sanitarios y pacientes.

## Descripción

PharmaGraph es una aplicación web que proporciona infografías claras y profesionales de medicamentos biológicos utilizados en farmacia hospitalaria. Cada medicamento tiene dos versiones de infografía:

- **Versión Paciente**: Clara, visual y amigable para entregar en consulta
- **Versión Profesional**: Técnica, compacta y práctica para consulta clínica

## Características

### 💉 Gestión de Medicamentos
- Infografías organizadas por patologías (Neurología, Neumología, Reumatología, etc.)
- **Tres modos de visualización**:
  - 👓 **Modo Consulta Rápida**: Vista compacta con información esencial para consulta
  - 🧾 **Versión Paciente**: Clara, visual y amigable para entregar en consulta
  - 📋 **Versión Profesional**: Técnica, compacta con detalles clínicos completos
- Búsqueda rápida de medicamentos por nombre o principio activo
- Diseño responsive optimizado para impresión A4 y visualización móvil

### 🏥 Personalización y Marca
- Logo del hospital personalizable
- Información de contacto del servicio
- Colores corporativos personalizables
- Nombre del paciente en infografías impresas
- Código QR único de trazabilidad en cada impresión

### 📬 Actualizaciones Mensuales
- Newsletter integrada "Actualización de 5 minutos"
- Cambios en fichas técnicas relevantes
- Nuevos biológicos aprobados
- Recordatorios de screening y vacunas
- Tips farmacéuticos de consulta
- Widget destacado en dashboard

### 🔐 Seguridad y Pago
- Sistema de registro y autenticación
- Pago único de 5€ mediante Stripe
- Trazabilidad completa de impresiones
- Disclaimers legales y fechas de actualización

## Tecnologías

- **Frontend**: Next.js 15 + React + TypeScript
- **Styling**: Tailwind CSS
- **Autenticación**: NextAuth.js
- **Base de datos**: PostgreSQL + Prisma ORM
- **Pagos**: Stripe
- **QR Codes**: qrcode library
- **Iconos**: Lucide React

## Instalación

### Requisitos previos

- Node.js 18+
- PostgreSQL
- Cuenta de Stripe

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/pharmagraph.git
   cd pharmagraph
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   Copia `.env.example` a `.env` y configura las variables:
   ```bash
   cp .env.example .env
   ```

   Edita `.env` con tus credenciales:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/pharmagraph"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="tu-secreto-seguro"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   STRIPE_PRICE_ID="price_..."
   ```

4. **Configurar la base de datos**
   ```bash
   # Generar el cliente de Prisma
   npx prisma generate

   # Ejecutar migraciones
   npx prisma db push

   # (Opcional) Poblar con datos de ejemplo
   npm run seed
   ```

5. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Configuración de Stripe

1. Crea una cuenta en [Stripe](https://stripe.com)
2. Obtén tus API keys del dashboard
3. Crea un producto con precio de 5€
4. Copia el Price ID al archivo `.env`
5. Configura el webhook endpoint:
   - URL: `https://tu-dominio.com/api/stripe/webhook`
   - Eventos: `checkout.session.completed`
   - Copia el webhook secret al `.env`

Para desarrollo local, usa el CLI de Stripe:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Estructura del proyecto

```
pharmagraph/
├── app/                      # App Router de Next.js
│   ├── api/                  # API routes
│   │   ├── auth/            # NextAuth endpoints
│   │   ├── register/        # Registro de usuarios
│   │   └── stripe/          # Integración con Stripe
│   ├── dashboard/           # Dashboard principal
│   ├── login/               # Página de login
│   ├── register/            # Página de registro
│   ├── payment/             # Página de pago
│   ├── medication/[slug]/   # Detalle de medicamento
│   └── page.tsx             # Landing page
├── components/              # Componentes React
│   ├── PatientInfographic.tsx
│   ├── ProfessionalInfographic.tsx
│   └── Providers.tsx
├── lib/                     # Utilidades
│   ├── auth.ts             # Configuración NextAuth
│   └── prisma.ts           # Cliente Prisma
├── prisma/                  # Esquema de base de datos
│   └── schema.prisma
└── public/                  # Archivos estáticos
```

## Uso

### Para Usuarios

1. Regístrate en la plataforma
2. Inicia sesión con tu cuenta
3. Realiza el pago único de 5€
4. Accede al dashboard con todas las infografías
5. Navega por patologías y medicamentos
6. Visualiza e imprime las infografías

### Para Administradores

(Pendiente: Panel de administración para gestionar medicamentos)

## Contenido de las Infografías

### Ficha Paciente
- Qué es y para qué sirve
- Cómo se administra
- Qué esperar
- Efectos secundarios comunes
- Señales de alarma
- Antes de empezar
- Consejos prácticos
- Información de contacto

### Ficha Profesional
- Indicación aprobada
- Posología y esquema
- Requisitos previos
- Monitorización
- Manejo básico
- Preparación y conservación
- Perlas prácticas
- Link a ficha técnica oficial

## Legal y Seguridad

- Toda la información incluye disclaimers legales
- Fechas de actualización visibles
- Basado en fichas técnicas oficiales
- No sustituye el juicio clínico profesional

## Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter
- `npm run seed` - Pobla la base de datos con datos de ejemplo

## Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

### Otras plataformas

Compatible con cualquier plataforma que soporte Next.js:
- Railway
- Render
- AWS
- Digital Ocean

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto es privado y de uso interno.

## Contacto

Para consultas o soporte, contacta con el equipo de desarrollo.

---

**Nota**: Esta es una herramienta de información. No sustituye el consejo médico profesional. Siempre consulta con profesionales sanitarios cualificados.
