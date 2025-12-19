import { CONFIG } from './config.js';
import { state } from './state.js';
import { canvas } from './dom.js';

// ==============================
// UTILIDADES BÁSICAS
// ==============================
export const Utils = {
    getCurrentFrame() {
        return state.frames[state.currentFrameIndex];
    },

    fieldDims() {
        return {
            fieldWidth: canvas.width - CONFIG.MARGIN_X * 2,
            fieldHeight: canvas.height - CONFIG.MARGIN_Y * 2
        };
    },

    canvasPos(e) {
        const r = canvas.getBoundingClientRect();
        // Soporte para eventos touch
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        // Calcular escala entre tamaño visual (CSS) y tamaño interno del canvas
        const scaleX = canvas.width / r.width;
        const scaleY = canvas.height / r.height;

        const canvasX = (clientX - r.left) * scaleX;
        const canvasY = (clientY - r.top) * scaleY;

        return { x: canvasX, y: canvasY };
    },

    getZoneBounds(zone) {
        return {
            left: Math.min(zone.x1, zone.x2),
            top: Math.min(zone.y1, zone.y2),
            width: Math.abs(zone.x2 - zone.x1),
            height: Math.abs(zone.y2 - zone.y1)
        };
    },

    findPlayerByTeamNumber(team, number, frame = null) {
        const f = frame || this.getCurrentFrame();
        return f.players.find(p =>
            p.team === team &&
            p.number === number &&
            p.visible
        );
    },

    /**
     * Calcula la posición de un escudo de entrenamiento
     * @param {Object} player - Objeto del jugador
     * @param {Object} shield - Objeto del escudo
     * @returns {{x: number, y: number}} Posición del escudo
     */
    getShieldPosition(player, shield) {
        const distance = player.radius + CONFIG.SHIELD_DISTANCE;
        return {
            x: player.x + Math.cos(shield.angle) * distance,
            y: player.y + Math.sin(shield.angle) * distance
        };
    }
};

// ==============================
// HELPER FUNCTIONS EXPORTABLES
// ==============================

// Función para limitar coordenadas Y en modo mitad de campo
export function clampYToPlayableArea(y) {
    if (state.fieldConfig.type !== "half") {
        return y; // No limitar en campo completo
    }

    const marginY = CONFIG.MARGIN_Y;
    const fieldHeight = canvas.height - CONFIG.MARGIN_Y * 2;
    const inGoalHeight = fieldHeight * 0.12;

    // Calcular límites de la zona jugable (sin incluir zona de ensayo)
    if (state.fieldConfig.halfSide === "top") {
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

export function getPlayerInitialPosition(team, playerNumber) {
    const w = canvas.width;
    const h = canvas.height;
    const cfg = state.fieldConfig;

    // ============================
    // CAMPO COMPLETO – HORIZONTAL
    // ============================
    if (cfg.type === "full" && cfg.orientation === "horizontal") {
        // Usar los mismos cálculos que drawFullField() (se simplifican aquí para no depender del renderer)
        const minMargin = 20;
        const aspectRatio = 3 / 2;

        let fieldWidth = w - minMargin * 2;
        let fieldHeight = fieldWidth / aspectRatio;

        if (fieldHeight > h - minMargin * 2) {
            fieldHeight = h - minMargin * 2;
            fieldWidth = fieldHeight * aspectRatio;
        }

        const marginX = (w - fieldWidth) / 2;
        const marginY = (h - fieldHeight) / 2;

        const xSide = team === "A"
            ? marginX + fieldWidth * CONFIG.TEAM_A_POSITION
            : marginX + fieldWidth * CONFIG.TEAM_B_POSITION;

        const y = marginY + CONFIG.PANEL_Y_TOP +
            (playerNumber - 1) * CONFIG.PLAYER_SPACING;

        return { x: xSide, y };
    }

    // ============================
    // CAMPO COMPLETO – VERTICAL
    // ============================
    if (cfg.type === "full" && cfg.orientation === "vertical") {
        const verticalMarginY = 10;
        const originalWidth = 1200 - CONFIG.MARGIN_X * 2;
        const originalHeight = 800 - CONFIG.MARGIN_Y * 2;

        const fieldHeight = h - verticalMarginY * 2;
        const fieldWidth = fieldHeight * (originalHeight / originalWidth);
        const marginX = (w - fieldWidth) / 2;
        const marginY = verticalMarginY;

        const spacing = fieldWidth / (CONFIG.NUM_PLAYERS + 1);
        const x = marginX + spacing * playerNumber;

        const y = team === "A"
            ? marginY + 40
            : marginY + fieldHeight - 40;

        return { x, y };
    }

    // ============================
    // MITAD DE CAMPO (VERTICAL)
    // ============================
    if (cfg.type === "half") {
        const marginX = CONFIG.MARGIN_X;
        const marginY = CONFIG.MARGIN_Y;
        const fieldWidth = w - CONFIG.MARGIN_X * 2;
        const fieldHeight = h - CONFIG.MARGIN_Y * 2;

        // Distribución horizontal
        const spacing = fieldWidth / (CONFIG.NUM_PLAYERS + 1);
        const x = marginX + spacing * playerNumber;

        // Proporciones reales
        const P5 = 5 / 50;
        const P40 = 40 / 50;

        // Misma zona de ensayo que drawHalfField
        const inGoalHeight = fieldHeight * 0.12;

        // Línea de ensayo REAL (origen 0 m)
        const tryLineY = cfg.halfSide === "bottom"
            ? marginY + fieldHeight - inGoalHeight
            : marginY + inGoalHeight;

        // Dirección hacia el centro del campo
        const dir = cfg.halfSide === "bottom" ? -1 : 1;

        let y;

        if (cfg.halfSide === "bottom") {
            // Ensayo abajo
            y = team === "A"
                // AZUL sobre 40 m
                ? tryLineY + dir * fieldHeight * P40
                // ROJO sobre 5 m
                : tryLineY + dir * fieldHeight * P5;
        } else {
            // Ensayo arriba (simétrico)
            y = team === "A"
                ? tryLineY + dir * fieldHeight * P40
                : tryLineY + dir * fieldHeight * P5;
        }

        return { x, y };
    }

    // Fallback
    return {
        x: w / 2,
        y: h / 2
    };
}

export function calculateFieldDimensions(w, h, config) {
    const marginX = CONFIG.MARGIN_X || 20;
    const marginY = CONFIG.MARGIN_Y || 20;

    let fieldWidth, fieldHeight, x, y;

    if (config.type === 'half') {
        fieldWidth = w - marginX * 2;
        fieldHeight = h - marginY * 2;
        x = marginX;
        y = marginY;
    } else if (config.orientation === 'vertical') {
        // Vertical Logic
        const verticalMarginY = 10;
        const originalWidth = 1200 - marginX * 2;
        const originalHeight = 800 - marginY * 2;

        fieldHeight = h - verticalMarginY * 2;
        fieldWidth = fieldHeight * (originalHeight / originalWidth);
        x = (w - fieldWidth) / 2;
        y = verticalMarginY;
    } else {
        // Horizontal Logic (Default)
        const aspectRatio = 3 / 2;
        fieldWidth = w - marginX * 2;
        fieldHeight = fieldWidth / aspectRatio;

        if (fieldHeight > h - marginY * 2) {
            fieldHeight = h - marginY * 2;
            fieldWidth = fieldHeight * aspectRatio;
        }
        x = (w - fieldWidth) / 2;
        y = (h - fieldHeight) / 2;
    }

    return { x, y, width: fieldWidth, height: fieldHeight };
}
