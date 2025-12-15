/**
 * Manejo de Eventos del Canvas
 * PizarraRugby v2.0.0
 *
 * Gestiona todos los eventos de mouse y touch en el canvas
 */

import { CONFIG, COLORS } from './config.js';
import { state, getCurrentFrame, clearAllSelections } from './state.js';
import { getCanvasPosition, clampYToPlayableArea, findPlayerByTeamNumber } from './utils.js';
import { Renderer } from './renderer.js';
import { Popup } from './ui.js';
import { getPlayerInitialPosition } from './field.js';

// Referencia al canvas (se establecerá externamente)
let canvas = null;

/**
 * Establece la referencia al canvas
 */
export function setCanvasReference(canvasElement) {
    canvas = canvasElement;
}

/**
 * Maneja el evento mousedown/touchstart
 */
export async function handleMouseDown(e) {
    if (!canvas) return;

    const pos = getCanvasPosition(e, canvas);

    // Delegar según el modo
    const handlers = {
        zone: handleZoneMode,
        shield: handleShieldMode,
        arrow: handleArrowMode,
        text: handleTextMode,
        scrum: handleScrumMode,
        move: handleMoveMode
    };

    const handler = handlers[state.ui.mode];
    if (handler) {
        await handler(pos, e);
    }
}

/**
 * Maneja el evento mousemove/touchmove
 */
export function handleMouseMove(e) {
    if (!canvas) return;

    const pos = getCanvasPosition(e, canvas);

    // Mover jugadores
    if (state.interaction.dragTarget) {
        state.interaction.dragTarget.x = pos.x;
        state.interaction.dragTarget.y = clampYToPlayableArea(pos.y, state.field, canvas);
        Renderer.drawFrame();
    }

    // Seleccionar con caja
    if (state.interaction.selectingBox) {
        state.interaction.selectBoxEnd = pos;
        Renderer.drawFrame();
    }

    // Preview de flecha
    if (state.canvas.arrowStart && state.ui.mode === "arrow") {
        state.canvas.previewArrow = { x1: state.canvas.arrowStart.x, y1: state.canvas.arrowStart.y, x2: pos.x, y2: pos.y };
        Renderer.drawFrame();
    }

    // Mover zona
    if (state.interaction.draggingZone && state.selection.zone) {
        const zone = state.selection.zone;
        const dx = pos.x - (zone.x1 + state.interaction.zoneDragOffset.x);
        const dy = pos.y - (zone.y1 + state.interaction.zoneDragOffset.y);

        zone.x1 += dx;
        zone.y1 += dy;
        zone.x2 += dx;
        zone.y2 += dy;

        state.interaction.zoneDragOffset = { x: pos.x - zone.x1, y: pos.y - zone.y1 };
        Renderer.drawFrame();
    }

    // Mover texto
    if (state.selection.text && state.interaction.dragTarget === state.selection.text) {
        state.selection.text.x = pos.x;
        state.selection.text.y = pos.y;
        Renderer.drawFrame();
    }
}

/**
 * Maneja el evento mouseup/touchend
 */
export function handleMouseUp(e) {
    if (!canvas) return;

    const pos = getCanvasPosition(e, canvas);

    // Finalizar drag de jugadores
    if (state.interaction.dragTarget) {
        state.interaction.dragTarget = null;
    }

    // Finalizar selección con caja
    if (state.interaction.selectingBox) {
        finishBoxSelection();
    }

    // Finalizar drag de zona
    if (state.interaction.draggingZone) {
        state.interaction.draggingZone = false;
    }
}

/**
 * Modo zona: crear zonas rectangulares
 */
async function handleZoneMode(pos) {
    if (!state.canvas.selectedZoneColor) {
        await Popup.alert("Selecciona un color", "Debes elegir un color para crear una zona");
        return;
    }

    if (!state.canvas.zoneStart) {
        state.canvas.zoneStart = pos;
        return;
    }

    // Completar zona
    const name = await Popup.prompt("Nombre de la zona:", "Mi zona");
    if (!name) {
        state.canvas.zoneStart = null;
        return;
    }

    state.canvas.zones.push({
        x1: state.canvas.zoneStart.x,
        y1: state.canvas.zoneStart.y,
        x2: pos.x,
        y2: pos.y,
        color: state.canvas.selectedZoneColor,
        label: name,
        locked: false
    });

    state.canvas.zoneStart = null;
    Renderer.drawFrame();
}

/**
 * Modo escudo: añadir escudos de entrenamiento
 */
async function handleShieldMode(pos) {
    const player = findPlayerAt(pos);
    if (!player) return;

    const frame = getCurrentFrame();

    // Calcular ángulo hacia el punto de clic
    const dx = pos.x - player.x;
    const dy = pos.y - player.y;
    const angle = Math.atan2(dy, dx);

    frame.trainingShields.push({
        team: player.team,
        number: player.number,
        angle: angle
    });

    Renderer.drawFrame();
}

/**
 * Modo flecha: crear flechas
 */
async function handleArrowMode(pos) {
    if (!state.canvas.arrowStart) {
        state.canvas.arrowStart = pos;
        return;
    }

    const frame = getCurrentFrame();
    const arrow = {
        x1: state.canvas.arrowStart.x,
        y1: state.canvas.arrowStart.y,
        x2: pos.x,
        y2: pos.y,
        type: state.canvas.arrowType
    };

    if (state.canvas.arrowType === "kick") {
        arrow.arcHeight = state.canvas.kickArcHeight;
    }

    frame.arrows.push(arrow);

    state.canvas.arrowStart = null;
    state.canvas.previewArrow = null;
    Renderer.drawFrame();
}

/**
 * Modo texto: añadir texto
 */
async function handleTextMode(pos) {
    const text = await Popup.prompt("Texto:", "");
    if (!text) return;

    const frame = getCurrentFrame();
    frame.texts.push({
        x: pos.x,
        y: pos.y,
        text: text
    });

    Renderer.drawFrame();
}

/**
 * Modo melé: posicionar jugadores en formación de melé
 */
async function handleScrumMode(pos) {
    const team = await Popup.selectScrumTeam();
    if (!team) return;

    const frame = getCurrentFrame();
    const teams = team === "AB" ? ["A", "B"] : [team];

    teams.forEach((t, teamIdx) => {
        const offsetX = teamIdx * CONFIG.SCRUM.SPACING;

        // Primera fila (1, 2, 3)
        [1, 2, 3].forEach((num, i) => {
            const player = findPlayerByTeamNumber(t, num, frame);
            if (player) {
                player.visible = true;
                player.x = pos.x + offsetX + (i - 1) * CONFIG.SCRUM.ROW_OFFSET;
                player.y = pos.y;
            }
        });

        // Segunda fila (4, 5)
        [4, 5].forEach((num, i) => {
            const player = findPlayerByTeamNumber(t, num, frame);
            if (player) {
                player.visible = true;
                player.x = pos.x + offsetX + (i - 0.5) * CONFIG.SCRUM.ROW_OFFSET;
                player.y = pos.y + CONFIG.SCRUM.PACK_OFFSET;
            }
        });

        // Tercera fila (6, 7, 8)
        [6, 7, 8].forEach((num, i) => {
            const player = findPlayerByTeamNumber(t, num, frame);
            if (player) {
                player.visible = true;
                player.x = pos.x + offsetX + (i - 1) * CONFIG.SCRUM.ROW_OFFSET;
                player.y = pos.y + CONFIG.SCRUM.PACK_OFFSET * 2;
            }
        });

        // Medio scrum (9)
        const player9 = findPlayerByTeamNumber(t, 9, frame);
        if (player9) {
            player9.visible = true;
            player9.x = pos.x + offsetX;
            player9.y = pos.y + CONFIG.SCRUM.PACK_OFFSET * 3;
        }
    });

    Renderer.drawFrame();
}

/**
 * Modo mover: mover jugadores y seleccionar
 */
function handleMoveMode(pos, e) {
    const frame = getCurrentFrame();

    // Intentar seleccionar jugador
    const player = findPlayerAt(pos);

    if (player) {
        if (e.ctrlKey || e.metaKey) {
            // Selección múltiple
            if (state.selection.players.has(player)) {
                state.selection.players.delete(player);
            } else {
                state.selection.players.add(player);
            }
        } else {
            // Selección simple
            if (!state.selection.players.has(player)) {
                state.selection.players.clear();
                state.selection.players.add(player);
            }
            state.interaction.dragTarget = player;
        }

        clearAllSelections();
        state.selection.players.forEach(p => state.selection.players.add(p));

        Renderer.drawFrame();
        return;
    }

    // Intentar seleccionar zona
    const zone = findZoneAt(pos);
    if (zone) {
        clearAllSelections();
        state.selection.zone = zone;

        if (!zone.locked) {
            state.interaction.draggingZone = true;
            state.interaction.zoneDragOffset = { x: pos.x - zone.x1, y: pos.y - zone.y1 };
        }

        Renderer.drawFrame();
        return;
    }

    // Iniciar selección con caja
    clearAllSelections();
    state.interaction.selectingBox = true;
    state.interaction.selectBoxStart = pos;
    state.interaction.selectBoxEnd = pos;
}

/**
 * Encuentra un jugador en una posición
 */
function findPlayerAt(pos) {
    const frame = getCurrentFrame();
    return frame.players.find(p => {
        if (!p.visible) return false;
        const dx = p.x - pos.x;
        const dy = p.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) <= p.radius + CONFIG.HIT_THRESHOLD;
    });
}

/**
 * Encuentra una zona en una posición
 */
function findZoneAt(pos) {
    for (let i = state.canvas.zones.length - 1; i >= 0; i--) {
        const zone = state.canvas.zones[i];
        const minX = Math.min(zone.x1, zone.x2);
        const maxX = Math.max(zone.x1, zone.x2);
        const minY = Math.min(zone.y1, zone.y2);
        const maxY = Math.max(zone.y1, zone.y2);

        if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
            return zone;
        }
    }
    return null;
}

/**
 * Finaliza la selección con caja
 */
function finishBoxSelection() {
    if (!state.interaction.selectBoxStart || !state.interaction.selectBoxEnd) {
        state.interaction.selectingBox = false;
        return;
    }

    const start = state.interaction.selectBoxStart;
    const end = state.interaction.selectBoxEnd;

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const frame = getCurrentFrame();
    frame.players.forEach(p => {
        if (p.visible && p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
            state.selection.players.add(p);
        }
    });

    state.interaction.selectingBox = false;
    state.interaction.selectBoxStart = null;
    state.interaction.selectBoxEnd = null;

    Renderer.drawFrame();
}
