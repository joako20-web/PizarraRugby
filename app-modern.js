/**
 * ================================================================
 * PIZARRA RUGBY - Aplicación Principal
 * v2.2.0 - Modernizado y Optimizado
 * ================================================================
 * 
 * Herramienta táctica profesional para diseñar y animar jugadas de rugby
 * 
 * @author PizarraRugby Team
 * @license MIT
 */

'use strict';

// ================================================================
// CONFIGURACIÓN
// ================================================================
const CONFIG = {
    // Jugadores
    NUM_PLAYERS: 15,
    PLAYER_RADIUS: 20,
    PLAYER_SPACING: 50,

    // Animación
    INTERP_DURATION: 1600,
    INTERP_STEPS: 24,

    // Campo
    MARGIN_X: 60,
    MARGIN_Y: 50,
    VERTICAL_MARGIN_Y: 10,
    MIN_MARGIN: 20,

    // Balón
    BALL_RX: 24,
    BALL_RY: 16,

    // Escudos
    SHIELD_WIDTH: 16,
    SHIELD_HEIGHT: 24,
    SHIELD_DISTANCE: 8,

    // Flechas
    ARROW_HEAD_SIZE: 14,
    KICK_ARC_HEIGHT: 60,

    // Líneas del campo (proporciones 0-1)
    FIELD_LINES: {
        TRY: 0,
        GOAL: 0.07,
        FIVE_METER: 0.05,
        TWENTY_TWO: 0.22,
        MIDFIELD: 0.50,
        TEN_METER_LEFT: 0.40,
        TEN_METER_RIGHT: 0.60,
        TWENTY_TWO_RIGHT: 0.78,
        FIVE_METER_RIGHT: 0.95
    },

    // Melé
    SCRUM: {
        SPACING: 50,
        ROW_OFFSET: 42,
        PACK_OFFSET: 45,
        SPACING_HALF: 25,
        ROW_OFFSET_HALF: 28,
        PACK_OFFSET_HALF: 30
    },

    // UI
    UI_TIMING: {
        NOTIFICATION_SHOW_DELAY: 10,
        NOTIFICATION_HIDE_DELAY: 300,
        RESIZE_DEBOUNCE: 100,
        EXPORT_PAUSE_DURATION: 1500
    },

    BREAKPOINT: {
        MOBILE: 1024
    },

    // Canvas
    SELECTION_BOX_DASH: [6, 4],
    HIT_THRESHOLD: 15,
    ARROW_SAMPLE_STEP: 0.1,

    // Texto
    FONT_TEXT: "36px Oswald",
    FONT_ZONE_LABEL: "14px Oswald",

    // Posicionamiento
    PANEL_Y_TOP: 45,
    TEAM_A_POSITION: 0.15,
    TEAM_B_POSITION: 0.85,

    // Selección
    SELECTION_COLOR: "#00ff88"
};

const COLORS = {
    TEAM_A: "#1e88ff",
    TEAM_A_LIGHT: "#7fb9ff",
    TEAM_B: "#ff3333",
    TEAM_B_LIGHT: "#ff7a7a",
    FIELD_GREEN: "#2d5016",
    FIELD_LINES: "#ffffff",
    SHIELD_GOLD: "#FFD700",
    ZONE_COLORS: {
        BLUE: "#00aaff",
        RED: "#ff3333",
        YELLOW: "#ffd000",
        GREEN: "#00cc66",
        ORANGE: "#ff9100ff"
    }
};

// ================================================================
// ELEMENTOS DOM
// ================================================================
const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

// ================================================================
// ESTADO GLOBAL
// ================================================================
const state = {
    frames: [],
    currentFrameIndex: 0,

    // Campo
    fieldConfig: {
        type: "full",
        orientation: "horizontal",
        halfSide: "top"
    },

    // Interacción
    mode: "move",
    selectedPlayers: new Set(),
    selectedZone: null,
    selectedText: null,
    selectedArrow: null,
    selectedShield: null,
    dragTarget: null,
    dragOffsetX: 0,
    dragOffsetY: 0,

    // Zona
    zones: [],
    selectedZoneColor: null,
    zoneStart: null,
    zoneEnd: null,
    pendingZone: null,
    draggingZone: false,
    zoneDragOffset: { x: 0, y: 0 },

    // Flecha
    arrowStart: null,
    previewArrow: null,
    kickArcHeight: CONFIG.KICK_ARC_HEIGHT,

    // Escudos
    draggingShield: null,

    // Selección
    selectingBox: false,
    selectBoxStart: null,
    selectBoxEnd: null,

    // Animación
    animation: {
        playing: false,
        intervalId: null,
        frameIndex: 0
    }
};

console.log('✅ PizarraRugby v2.2.0 - Configuración cargada');
console.log('📦 app.js: Código moderno y optimizado');
if (window.errorHandler) {
    console.log('🛡️ Sistema de error handling activo');
}
