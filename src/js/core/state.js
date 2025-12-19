import { CONFIG } from './config.js';

// ==============================
// ESTADO DE LA APLICACIÓN
// ==============================
export const state = {
    // Modo actual
    mode: "move",

    // Frames y animación
    frames: [],
    currentFrameIndex: 0,
    isPlaying: false,
    cancelPlay: false,

    // Drag & selección
    dragTarget: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    selectedPlayers: new Set(),
    selectingBox: false,
    selectBoxStart: null,
    selectBoxEnd: null,

    // Flechas y Dibujo Libre
    arrowStart: null,
    previewArrow: null,
    currentPath: null,
    kickArcHeight: CONFIG.KICK_ARC_HEIGHT,

    // Zonas
    zones: [],
    zoneStart: null,
    zoneEnd: null,
    pendingZone: null,
    selectedZoneColor: null,
    selectedZone: null,
    draggingZone: false,
    zoneDragOffset: { x: 0, y: 0 },

    // Escudos
    draggingShield: null,
    selectedShield: null,

    // Textos y flechas
    selectedText: null,
    selectedArrow: null,

    // Field configuration
    fieldConfig: {
        type: "full",        // "full" or "half"
        orientation: "horizontal",  // "horizontal" or "vertical"
        halfSide: "top"      // "top" or "bottom" (only for type="half")
    }
};
