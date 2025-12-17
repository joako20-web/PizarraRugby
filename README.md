# 🏉 PizarraRugby

**Aplicación web profesional para diseño y animación de jugadas de rugby**

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/yourusername/PizarraRugby)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Herramienta táctica interactiva para entrenadores y jugadores de rugby. Crea, anima y exporta jugadas de forma visual e intuitiva.

---

## ✨ Características Principales

- 🎨 **Canvas Interactivo**: Campo de rugby completo o medio campo con líneas reglamentarias
- 👥 **Gestión de Jugadores**: 15 jugadores por equipo con posicionamiento libre
- 🎬 **Sistema de Frames**: Crea secuencias animadas paso a paso
- ▶️ **Reproducción Animada**: Visualiza jugadas con transiciones suaves
- 💾 **Formaciones Guardadas**: Guarda y carga configuraciones tácticas
- 📱 **Responsive**: Funciona en desktop, tablet y móvil
- 🎓 **Tutorial Interactivo**: Guía paso a paso para nuevos usuarios
- 🔄 **Rotación de Campo**: Cambia orientación horizontal/vertical
- ⚙️ **Herramientas Tácticas**:
  - Flechas (normales y de patada)
  - Zonas de color personalizables
  - Textos y anotaciones
  - Melés (scrums)
  - Escudos de entrenamiento
  - Líneas de trayectoria automáticas

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Servidor HTTP local (para ES6 modules)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/yourusername/PizarraRugby.git
cd PizarraRugby

# Opción 1: Usar Live Server (VS Code)
# Instalar extensión "Live Server" y hacer clic derecho en index.html > "Open with Live Server"

# Opción 2: Usar Python
python -m http.server 8000

# Opción 3: Usar Node.js
npx http-server

# Abrir en navegador
# http://localhost:8000
```

---

## 📖 Guía de Uso

### 1. **Configurar el Campo**
- Selecciona **Campo Completo** o **Mitad Campo**
- Usa **Rotar Campo** para cambiar orientación

### 2. **Colocar Jugadores**
- Panel izquierdo: Haz clic en números para mostrar/ocultar
- Botones de equipo completo para colocar formaciones básicas

### 3. **Diseñar la Jugada**
- **Modo Mover**: Arrastra jugadores a posición
- **Flechas**: Dibuja trayectorias y patadas
- **Zonas**: Marca áreas importantes con colores
- **Texto**: Añade anotaciones

### 4. **Crear Animación**
- Haz clic **+ Añadir** para nuevo frame
- Modifica posiciones de jugadores
- Usa ◀ ▶ para navegar entre frames
- **▶ Reproducir** para ver animación

### 5. **Guardar y Compartir**
- **Guardar Formación**: Guarda setup actual
- **Exportar**: Genera video WebM de la jugada

---

## 🏗️ Arquitectura

### Estructura del Proyecto

```
PizarraRugby/
├── index.html          # Entrada principal
├── app.js             # Orquestador (187 líneas)
├── style.css          # Estilos globales
├── js/                # Módulos ES6
│   ├── config.js      # Configuración
│   ├── state.js       # Estado de aplicación
│   ├── utils.js       # Utilidades
│   ├── renderer.js    # Renderizado Canvas
│   ├── field.js       # Lógica del campo
│   ├── players.js     # Gestión de jugadores
│   ├── animation.js   # Sistema de animación
│   ├── ui.js          # Interfaz de usuario
│   ├── events.js      # Manejo de eventos
│   ├── formations.js  # Formaciones guardadas
│   └── tutorial.js    # Sistema tutorial
└── README.md
```

### Tecnologías

- **JavaScript ES6+**: Módulos nativos
- **HTML5 Canvas**: Renderizado de alta performance
- **CSS3**: Flexbox, Grid, Animaciones
- **LocalStorage API**: Persistencia de formaciones
- **MediaRecorder API**: Exportación de video

---

## 🎯 Roadmap

### v2.3.0 (Próximo)
- [ ] PWA support (instalable, offline)
- [ ] Exportar PNG/SVG de frames
- [ ] Plantillas de formaciones predefinidas
- [ ] Deshacer/Rehacer (Ctrl+Z/Y)

### v3.0.0 (Futuro)
- [ ] Compartir jugadas vía URL
- [ ] Modo colaborativo en tiempo real
- [ ] Biblioteca de jugadas comunes
- [ ] Estadísticas y análisis

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Changelog

### [2.2.0] - 2025-12-17
- ✨ Refactorización completa a módulos ES6
- 🎨 Iconos SVG profesionales
- 🔒 Candados con indicadores de color
- 📐 Mejora de chevron icons para frames
- 🧹 Reducción de app.js: 3212→187 líneas

### [2.1.0] - 2025-12-17
- ✨ Sistema de tutorial interactivo
- 🎨 Mejoras visuales
- 📱 Optimizaciones móviles

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 👤 Autor

**Tu Nombre**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

## 🙏 Agradecimientos

- Iconos: [Heroicons](https://heroicons.com/)
- Inspiración: Comunidad de rugby y entrenadores

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Delete` / `Supr` | Borrar elemento seleccionado |
| `Esc` | Limpiar selección |
| `Ctrl + Click` | Selección múltiple |
| `?` | Mostrar tutorial |

---

<div align="center">
  
**¿Preguntas o sugerencias?** [Abrir un issue](https://github.com/yourusername/PizarraRugby/issues)

Made with 🏉 for the rugby community

</div>