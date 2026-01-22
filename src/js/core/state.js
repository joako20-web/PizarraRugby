import { CONFIG } from './config.js';

// ==============================
// ESTADO DE LA APLICACIÓN
// ==============================
/**
 * @typedef {import('../types.js').AppState} AppState
 * @typedef {import('../types.js').Frame} Frame
 */

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
    arrowPoints: [], // Array of points for multi-point arrows in progress
    previewArrow: null,
    currentPath: null,
    kickArcHeight: CONFIG.KICK_ARC_HEIGHT,
    clickTimeout: null, // For detecting double-clicks

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

    // Guías
    guides: {
        horizontal: [],
        vertical: []
    },
    draggingGuide: null,
    snapThreshold: 15,
    showGuides: true,

    // Field configuration
    fieldConfig: {
        type: "full",        // "full" or "half"
        orientation: "horizontal",  // "horizontal" or "vertical"
        halfSide: "top"      // "top" or "bottom" (only for type="half")
    },

    // Field appearance
    showFieldLines: true  // Toggle for field lines visibility
};
