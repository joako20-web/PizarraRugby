
// ==============================
// CONFIGURACIÓN GENERAL
// ==============================
export const CONFIG = {
    // ============================================
    // JUGADORES
    // ============================================
    NUM_PLAYERS: 15,
    PLAYER_RADIUS: 20,
    PLAYER_SPACING: 50,

    // ============================================
    // ANIMACIÓN
    // ============================================
    INTERP_DURATION: 1600,      // Duración de transición entre frames (ms)
    INTERP_STEPS: 24,            // Pasos de interpolación
    PLAYBACK_SPEED: 1.0,         // Multiplicador de velocidad por defecto
    MAX_DELTA_TIME: 100,         // Tiempo máximo por frame (ms) para evitar saltos
    BALL_SPEED_MULTIPLIER: 2.5,  // Multiplicador de velocidad cuando solo se mueve el balón

    // ============================================
    // CAMPO Y MÁRGENES
    // ============================================
    MARGIN_X: 60,                // Margen horizontal
    MARGIN_Y: 50,                // Margen vertical
    VERTICAL_MARGIN_Y: 10,       // Margen adicional para campo vertical
    MIN_MARGIN: 20,              // Margen mínimo

    // ============================================
    // BALÓN
    // ============================================
    BALL_RX: 16,                 // Radio X del balón (elipse)
    BALL_RY: 16 / 1.5,                 // Radio Y del balón (elipse)

    // ============================================
    // ESCUDOS DE ENTRENAMIENTO
    // ============================================
    SHIELD_WIDTH: 16,
    SHIELD_HEIGHT: 24,
    SHIELD_DISTANCE: 8,          // Distancia del escudo al jugador

    // ============================================
    // FLECHAS
    // ============================================
    ARROW_HEAD_SIZE: 14,
    KICK_ARC_HEIGHT: 60,

    // ============================================
    // MELÉ (Scrum)
    // ============================================
    SCRUM: {
        SPACING: 50,             // Espaciado entre filas (campo completo)
        ROW_OFFSET: 42,          // Offset horizontal de filas
        PACK_OFFSET: 45,         // Offset del pack
        SPACING_HALF: 40,        // Espaciado para medio campo
        ROW_OFFSET_HALF: 35,     // Offset de filas (medio campo)
        PACK_OFFSET_HALF: 30     // Offset del pack (medio campo)
    },

    // ============================================
    // LÍNEAS DEL CAMPO (Proporciones 0-1)
    // ============================================
    FIELD_LINES: {
        FIVE_METER: 0.05,
        TWENTY_TWO: 0.22,
        MIDFIELD: 0.50,
        TEN_METER_LEFT: 0.40,
        TEN_METER_RIGHT: 0.60,
        TWENTY_TWO_RIGHT: 0.78,
        FIVE_METER_RIGHT: 0.95
    },

    // ============================================
    // TEXTO Y FUENTES
    // ============================================
    FONT_TEXT: "36px Arial",
    FONT_ZONE_LABEL: "14px Arial",

    // ============================================
    // UI Y TIEMPOS (ms)
    // ============================================
    UI_TIMING: {
        NOTIFICATION_SHOW_DELAY: 10,
        NOTIFICATION_HIDE_DELAY: 300,
        RESIZE_DEBOUNCE: 100,
        EXPORT_PAUSE_DURATION: 1500
    },

    // ============================================
    // RESPONSIVE
    // ============================================
    BREAKPOINT: {
        MOBILE: 1024
    },

    // ============================================
    // CANVAS Y DIBUJO
    // ============================================
    SELECTION_BOX_DASH: [6, 4],
    HIT_THRESHOLD: 15,
    ARROW_SAMPLE_STEP: 0.1,

    // ============================================
    // POSICIONAMIENTO DE EQUIPOS
    // ============================================
    PANEL_Y_TOP: 45,
    TEAM_A_POSITION: 0.15,
    TEAM_B_POSITION: 0.85,

    // Selection color
    SELECTION_COLOR: "#00ff88"
};
