# Instrucciones para crear el repositorio en GitHub

## Paso 1: Crear el repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en el botón "+" en la esquina superior derecha y selecciona "New repository"
3. Configura el repositorio:
   - **Repository name**: `pharmagraph`
   - **Description**: "Plataforma de infografías de medicamentos biológicos"
   - **Visibility**: Elige "Private" o "Public" según tus necesidades
   - **NO marques** "Initialize this repository with a README" (ya tenemos uno)
   - **NO agregues** .gitignore ni licencia (ya los tenemos)
4. Haz clic en "Create repository"

## Paso 2: Conectar tu repositorio local con GitHub

GitHub te mostrará instrucciones. Usa el segundo bloque (push an existing repository):

```bash
cd /home/user/pharmagraph
git remote add origin https://github.com/TU_USUARIO/pharmagraph.git
git branch -M main
git push -u origin main
```

Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.

## Paso 3: Verificar

Recarga la página de tu repositorio en GitHub y deberías ver todos los archivos.

## Alternativa: Usar SSH en lugar de HTTPS

Si prefieres usar SSH:

```bash
cd /home/user/pharmagraph
git remote add origin git@github.com:TU_USUARIO/pharmagraph.git
git branch -M main
git push -u origin main
```

## Configurar GitHub Actions (Opcional)

Para CI/CD, puedes crear un archivo `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Lint
      run: npm run lint
    - name: Build
      run: npm run build
```

## Próximos pasos

Después de subir el código a GitHub:

1. **Configura Vercel** para deployment automático
2. **Configura variables de entorno** en tu plataforma de hosting
3. **Configura la base de datos** PostgreSQL
4. **Configura Stripe** y los webhooks
5. **Ejecuta las migraciones**: `npx prisma db push`
6. **Pobla la base de datos**: `npm run seed`

## Notas importantes

- El archivo `.env` está en `.gitignore` y NO se subirá a GitHub (por seguridad)
- Usa `.env.example` como plantilla para configurar las variables en producción
- Asegúrate de configurar las variables de entorno en tu plataforma de hosting
