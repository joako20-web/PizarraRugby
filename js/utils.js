/**
 * Funciones de utilidad reutilizables
 * PizarraRugby v2.0.0
 */

import { CONFIG } from './config.js';

/**
 * Crea un frame vacío con la estructura inicial
 * @param {HTMLCanvasElement} canvas - El canvas (necesario para posición inicial del balón)
 * @returns {Object} Nuevo frame vacío
 */
export function createFrame(canvas) {
    return {
        players: createEmptyPlayers(),
        ball: {
            x: canvas.width / 2,
            y: canvas.height / 2,
            rx: CONFIG.BALL_RX,
            ry: CONFIG.BALL_RY,
            visible: true
        },
        arrows: [],
        texts: [],
        trailLines: [],
        trainingShields: []
    };
}

/**
 * Crea un array de jugadores vacíos
 * @returns {Array} Array de jugadores
 */
function createEmptyPlayers() {
    const arr = [];
    for (let team of ["A", "B"]) {
        for (let n = 1; n <= CONFIG.NUM_PLAYERS; n++) {
            arr.push({
                team,
                number: n,
                x: null,
                y: null,
                visible: false,
                radius: CONFIG.PLAYER_RADIUS
            });
        }
    }
    return arr;
}

/**
 * Clona un frame completo
 * @param {Object} frame - Frame a clonar
 * @returns {Object} Nuevo frame clonado
 */
export function cloneFrame(frame) {
    return {
        players: frame.players.map(p => ({ ...p })),
        ball: { ...frame.ball },
        arrows: frame.arrows.map(a => ({ ...a })),
        texts: frame.texts.map(t => ({ ...t })),
        trailLines: frame.trailLines.map(t => ({ ...t })),
        trainingShields: (frame.trainingShields || []).map(s => ({ ...s }))
    };
}

/**
 * Busca un jugador por equipo y número
 * @param {string} team - "A" o "B"
 * @param {number} number - Número del jugador (1-15)
 * @param {Object} frame - Frame donde buscar
 * @returns {Object|undefined} Jugador encontrado o undefined
 */
export function findPlayerByTeamNumber(team, number, frame) {
    return frame.players.find(p =>
        p.team === team &&
        p.number === number &&
        p.visible
    );
}

/**
 * Calcula la posición de un escudo de entrenamiento relativo a un jugador
 * @param {Object} player - Objeto del jugador
 * @param {Object} shield - Objeto del escudo con ángulo
 * @returns {{x: number, y: number}} Posición del escudo
 */
export function getShieldPosition(player, shield) {
    const distance = player.radius + CONFIG.SHIELD_DISTANCE;
    return {
        x: player.x + Math.cos(shield.angle) * distance,
        y: player.y + Math.sin(shield.angle) * distance
    };
}

/**
 * Obtiene los límites de una zona
 * @param {Object} zone - Zona con coordenadas x1, y1, x2, y2
 * @returns {{left: number, top: number, width: number, height: number}}
 */
export function getZoneBounds(zone) {
    return {
        left: Math.min(zone.x1, zone.x2),
        top: Math.min(zone.y1, zone.y2),
        width: Math.abs(zone.x2 - zone.x1),
        height: Math.abs(zone.y2 - zone.y1)
    };
}

/**
 * Función debounce para optimizar eventos
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función con debounce
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Obtiene las dimensiones del campo (sin márgenes)
 * @param {HTMLCanvasElement} canvas
 * @returns {{fieldWidth: number, fieldHeight: number}}
 */
export function getFieldDimensions(canvas) {
    return {
        fieldWidth: canvas.width - CONFIG.MARGIN_X * 2,
        fieldHeight: canvas.height - CONFIG.MARGIN_Y * 2
    };
}

/**
 * Convierte coordenadas de evento (mouse/touch) a coordenadas del canvas
 * @param {Event} e - Evento del mouse o touch
 * @param {HTMLCanvasElement} canvas
 * @returns {{x: number, y: number}} Coordenadas en el canvas
 */
export function getCanvasPosition(e, canvas) {
    const rect = canvas.getBoundingClientRect();

    // Soporte para eventos touch
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    // Calcular escala entre tamaño visual (CSS) y tamaño interno del canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    return { x: canvasX, y: canvasY };
}

/**
 * Limita coordenadas Y a la zona jugable en modo mitad de campo
 * @param {number} y - Coordenada Y a limitar
 * @param {Object} fieldConfig - Configuración del campo
 * @param {HTMLCanvasElement} canvas
 * @returns {number} Coordenada Y limitada
 */
export function clampYToPlayableArea(y, fieldConfig, canvas) {
    if (fieldConfig.type !== "half") {
        return y; // No limitar en campo completo
    }

    const marginY = CONFIG.MARGIN_Y;
    const fieldHeight = canvas.height - CONFIG.MARGIN_Y * 2;
    const inGoalHeight = fieldHeight * 0.12;

    // Calcular límites de la zona jugable (sin incluir zona de ensayo)
    if (fieldConfig.halfSide === "top") {
        // Zona de ensayo arriba: limitar desde marginY + inGoalHeight
        const minY = marginY + inGoalHeight;
        const maxY = marginY + fieldHeight;
        return Math.max(minY, Math.min(maxY, y));
    } else {
        // Zona de ensayo abajo: limitar hasta marginY + fieldHeight - inGoalHeight
        const minY = marginY;
        const maxY = marginY + fieldHeight - inGoalHeight;
        return Math.max(minY, Math.min(maxY, y));
    }
}
