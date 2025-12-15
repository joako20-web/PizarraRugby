/**
 * Configuración centralizada de la aplicación
 * PizarraRugby v2.0.0
 *
 * Este archivo contiene todas las constantes y configuraciones
 * de la aplicación en un solo lugar para facilitar su modificación
 */

export const CONFIG = {
    // ============================================
    // JUGADORES
    // ============================================
    NUM_PLAYERS: 15,
    PLAYER_RADIUS: 20,

    // ============================================
    // ANIMACIÓN
    // ============================================
    INTERP_DURATION: 1600,  // Duración de interpolación entre frames (ms)
    INTERP_STEPS: 24,       // Número de pasos de interpolación

    // ============================================
    // CAMPO
    // ============================================
    MARGIN_X: 60,           // Margen horizontal del campo
    MARGIN_Y: 50,           // Margen vertical del campo
    VERTICAL_MARGIN_Y: 10,  // Margen vertical adicional para campo vertical
    MIN_MARGIN: 20,         // Margen mínimo

    // ============================================
    // BALÓN
    // ============================================
    BALL_RX: 24,            // Radio X del balón (elipse)
    BALL_RY: 16,            // Radio Y del balón (elipse)

    // ============================================
    // ESCUDOS DE ENTRENAMIENTO
    // ============================================
    SHIELD_WIDTH: 50,       // Ancho del escudo
    SHIELD_HEIGHT: 20,      // Alto del escudo
    SHIELD_DISTANCE: 8,     // Distancia del escudo al jugador

    // ============================================
    // LÍNEAS DEL CAMPO (Proporciones 0-1)
    // ============================================
    FIELD_LINES: {
        TRY: 0,             // Línea de try (0%)
        GOAL: 0.07,         // Línea de goal (7%)
        FIVE_METER: 0.05,   // Línea de 5 metros (5%)
        TWENTY_TWO: 0.22,   // Línea de 22 metros (22%)
        MIDFIELD: 0.50,     // Línea central (50%)
        TEN_METER_LEFT: 0.40,   // Línea de 10 metros izquierda (40%)
        TEN_METER_RIGHT: 0.60,  // Línea de 10 metros derecha (60%)
        TWENTY_TWO_RIGHT: 0.78, // Línea de 22 metros derecha (78%)
        FIVE_METER_RIGHT: 0.95  // Línea de 5 metros derecha (95%)
    },

    // ============================================
    // MELÉ (Scrum)
    // ============================================
    SCRUM: {
        // Campo completo
        SPACING: 50,        // Espaciado entre filas
        ROW_OFFSET: 42,     // Offset horizontal de filas
        PACK_OFFSET: 45,    // Offset del pack

        // Medio campo
        SPACING_HALF: 25,   // Espaciado para medio campo
        ROW_OFFSET_HALF: 28, // Offset de filas para medio campo
        PACK_OFFSET_HALF: 30 // Offset del pack para medio campo
    },

    // ============================================
    // TIEMPOS DE UI (Milisegundos)
    // ============================================
    UI_TIMING: {
        NOTIFICATION_SHOW_DELAY: 10,    // Delay antes de mostrar notificación
        NOTIFICATION_HIDE_DELAY: 300,   // Delay de animación de salida
        RESIZE_DEBOUNCE: 100,            // Debounce para resize
        EXPORT_PAUSE_DURATION: 1500      // Pausa al inicio y fin de exportación
    },

    // ============================================
    // RESPONSIVE
    // ============================================
    BREAKPOINT: {
        MOBILE: 1024        // Ancho máximo para considerar móvil
    },

    // ============================================
    // CANVAS Y DIBUJO
    // ============================================
    SELECTION_BOX_DASH: [6, 4],  // Patrón de línea discontinua para caja de selección
    HIT_THRESHOLD: 15,            // Umbral de detección de clic (píxeles)
    ARROW_SAMPLE_STEP: 0.1        // Paso de muestreo para detección en flechas
};

/**
 * Paleta de colores de la aplicación
 */
export const COLORS = {
    // Equipos
    TEAM_A: "#1e88ff",          // Azul principal del equipo A
    TEAM_A_LIGHT: "#7fb9ff",    // Azul claro para trails del equipo A
    TEAM_B: "#ff3333",          // Rojo principal del equipo B
    TEAM_B_LIGHT: "#ff7a7a",    // Rojo claro para trails del equipo B

    // Campo
    FIELD_GREEN: "#2d5016",     // Verde del campo de rugby
    FIELD_LINES: "#ffffff",     // Blanco para líneas del campo

    // Elementos
    SHIELD_GOLD: "#FFD700",     // Dorado para escudos de entrenamiento

    // Zonas
    ZONE_COLORS: {
        BLUE: "#00aaff",
        RED: "#ff3333",
        YELLOW: "#ffd000",
        GREEN: "#00cc66"
    }
};
