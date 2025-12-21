# Configuración de GitHub Pages para PizarraRugby

## Pasos para activar GitHub Pages:

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Pages**
4. En **Source**, selecciona **GitHub Actions**
5. Guarda los cambios

## Despliegue automático:

Cada vez que hagas `git push` a la rama `main`, GitHub Actions automáticamente:
- Instalará las dependencias
- Ejecutará `npm run build`
- Desplegará la carpeta `dist/` a GitHub Pages

Tu aplicación estará disponible en:
`https://[tu-usuario].github.io/PizarraRugby/`

## Despliegue manual:

Si quieres desplegar manualmente sin hacer push:
1. Ve a la pestaña **Actions** en GitHub
2. Selecciona el workflow "Deploy to GitHub Pages"
3. Click en **Run workflow**
