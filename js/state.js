/**
 * Estado de la aplicación
 * PizarraRugby v2.0.0
 *
 * Centraliza todo el estado mutable de la aplicación
 * organizado en secciones lógicas
 */

import { createFrame } from './utils.js';
import { CONFIG } from './config.js';

/**
 * Estado global de la aplicación
 */
export const state = {
    // ============================================
    // UI y Control
    // ============================================
    ui: {
        mode: "move",           // Modo actual: move, text, arrow, zone, shield, scrum
        isPlaying: false,       // ¿Está reproduciendo animación?
        cancelPlay: false       // Bandera para cancelar reproducción
    },

    // ============================================
    // Selección
    // ============================================
    selection: {
        players: new Set(),     // Set de jugadores seleccionados
        shield: null,           // Escudo seleccionado
        zone: null,             // Zona seleccionada
        text: null,             // Texto seleccionado
        arrow: null             // Flecha seleccionada
    },

    // ============================================
    // Interacción Drag & Drop
    // ============================================
    interaction: {
        dragTarget: null,       // Elemento siendo arrastrado
        draggingShield: null,   // Escudo siendo arrastrado
        draggingZone: false,    // ¿Arrastrando zona?
        zoneDragOffset: { x: 0, y: 0 },  // Offset del drag de zona
        selectingBox: false,    // ¿Seleccionando con caja?
        selectBoxStart: null,   // Inicio de la caja de selección
        selectBoxEnd: null      // Fin de la caja de selección
    },

    // ============================================
    // Canvas y Elementos
    // ============================================
    canvas: {
        // Flechas
        arrowStart: null,       // Punto de inicio de flecha
        previewArrow: null,     // Flecha en preview
        arrowType: "normal",    // Tipo de flecha: "normal" o "kick"
        kickArcHeight: CONFIG.KICK_ARC_HEIGHT,  // Altura del arco para kicks

        // Zonas
        zones: [],              // Array de zonas dibujadas
        zoneStart: null,        // Punto de inicio de zona
        zoneEnd: null,          // Punto final de zona
        pendingZone: null,      // Zona pendiente de completar
        selectedZoneColor: null // Color seleccionado para nueva zona
    },

    // ============================================
    // Configuración de Campo
    // ============================================
    field: {
        type: "full",           // "full" o "half"
        orientation: "horizontal", // "horizontal" o "vertical" (solo para type="full")
        halfSide: "top"         // "top" o "bottom" (solo para type="half")
    },

    // ============================================
    // Animación
    // ============================================
    animation: {
        currentFrameIndex: 0,   // Índice del frame actual
        frames: []              // Array de frames
    }
};

/**
 * Inicializa el estado con un frame vacío
 * Debe llamarse después de que el canvas esté disponible
 * @param {HTMLCanvasElement} canvas
 */
export function initializeState(canvas) {
    state.animation.frames = [createFrame(canvas)];
    state.animation.currentFrameIndex = 0;
}

/**
 * Obtiene el frame actual
 * @returns {Object} Frame actual
 */
export function getCurrentFrame() {
    return state.animation.frames[state.animation.currentFrameIndex];
}

/**
 * Limpia todas las selecciones
 */
export function clearAllSelections() {
    state.selection.players.clear();
    state.selection.shield = null;
    state.selection.zone = null;
    state.selection.text = null;
    state.selection.arrow = null;
}

/**
 * Reinicia el tablero para un cambio de configuración de campo
 * @param {HTMLCanvasElement} canvas
 */
export function resetBoardForFieldChange(canvas) {
    // Vaciar frames
    state.animation.frames = [];
    state.animation.currentFrameIndex = 0;

    // Crear frame limpio
    const f = createFrame(canvas);

    // Reset balón
    f.ball.visible = true;
    f.ball.x = canvas.width / 2;

    if (state.field.type === "half") {
        // Balón en medio campo REAL
        f.ball.y = state.field.halfSide === "top"
            ? CONFIG.MARGIN_Y + (canvas.height - CONFIG.MARGIN_Y * 2)
            : CONFIG.MARGIN_Y;
    } else {
        // Campo completo
        f.ball.y = canvas.height / 2;
    }

    state.animation.frames.push(f);

    // Limpiar selecciones
    clearAllSelections();
}
