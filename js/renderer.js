/**
 * Sistema de Renderizado
 * PizarraRugby v2.0.0
 *
 * Maneja todo el renderizado del canvas
 */

import { CONFIG, COLORS } from './config.js';
import { state, getCurrentFrame } from './state.js';
import { drawPitch } from './field.js';
import { getShieldPosition, getZoneBounds } from './utils.js';

// Referencias al canvas y contexto
let canvas = null;
let ctx = null;

/**
 * Inicializa el renderer con un canvas
 * @param {HTMLCanvasElement} canvasElement
 */
export function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvasElement.getContext("2d");
}

/**
 * Objeto Renderer principal
 */
export const Renderer = {
    /**
     * Dibuja el frame actual completo
     */
    drawFrame() {
        if (!canvas || !ctx) {
            console.error('Renderer not initialized');
            return;
        }

        const frame = getCurrentFrame();

        // Dibujar campo
        drawPitch(ctx, canvas);

        // Dibujar zonas
        this.drawZones();

        // Dibujar elementos del frame
        this.drawTrailLines(frame);
        this.drawArrows(frame);
        this.drawTexts(frame);
        this.drawActiveDragTrail();
        this.drawPlayers(frame);
        this.drawTrainingShields(frame);
        this.drawBall(frame.ball);
        this.drawSelectionBox();
    },

    /**
     * Dibuja un frame interpolado para animación
     * @param {Object} frameA - Frame inicial
     * @param {Object} frameB - Frame final
     * @param {number} t - Factor de interpolación (0-1)
     */
    drawInterpolatedFrame(frameA, frameB, t) {
        if (!canvas || !ctx) return;

        drawPitch(ctx, canvas);
        this.drawZones();
        this.drawInterpolatedPlayers(frameA, frameB, t);
        this.drawArrows(frameB);
        this.drawTexts(frameB);
        this.drawInterpolatedBall(frameA.ball, frameB.ball, t);
    },

    /**
     * Dibuja las zonas
     */
    drawZones() {
        state.canvas.zones.forEach(zone => {
            const bounds = getZoneBounds(zone);

            // Dibujo del rectángulo de la zona
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = zone.color;
            ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

            // Borde
            ctx.globalAlpha = 1;
            ctx.strokeStyle = zone.color;
            ctx.lineWidth = zone === state.selection.zone ? 4 : 2;
            ctx.setLineDash(zone.locked ? [10, 5] : []);
            ctx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);

            // Etiqueta de la zona
            ctx.fillStyle = zone.color;
            ctx.font = CONFIG.FONT_ZONE_LABEL;
            ctx.fillText(zone.label, bounds.left + 5, bounds.top + 15);

            ctx.setLineDash([]);
        });
    },

    /**
     * Dibuja las líneas de trayectoria
     * @param {Object} frame - Frame actual
     */
    drawTrailLines(frame) {
        if (!frame.trailLines) return;

        frame.trailLines.forEach(trail => {
            ctx.strokeStyle = trail.team === "A" ? COLORS.TEAM_A_LIGHT : COLORS.TEAM_B_LIGHT;
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(trail.x1, trail.y1);
            ctx.lineTo(trail.x2, trail.y2);
            ctx.stroke();
        });
    },

    /**
     * Dibuja las flechas
     * @param {Object} frame - Frame actual
     */
    drawArrows(frame) {
        if (!frame.arrows) return;

        frame.arrows.forEach(arrow => {
            const isSelected = arrow === state.selection.arrow;
            ctx.strokeStyle = isSelected ? CONFIG.SELECTION_COLOR : "#000000";
            ctx.fillStyle = isSelected ? CONFIG.SELECTION_COLOR : "#000000";
            ctx.lineWidth = isSelected ? 4 : 3;

            if (arrow.type === "kick") {
                this.drawKickArrow(arrow);
            } else {
                this.drawNormalArrow(arrow);
            }
        });
    },

    /**
     * Dibuja una flecha normal
     * @param {Object} arrow
     */
    drawNormalArrow(arrow) {
        ctx.beginPath();
        ctx.moveTo(arrow.x1, arrow.y1);
        ctx.lineTo(arrow.x2, arrow.y2);
        ctx.stroke();

        // Punta de flecha
        const angle = Math.atan2(arrow.y2 - arrow.y1, arrow.x2 - arrow.x1);
        const headSize = CONFIG.ARROW_HEAD_SIZE;

        ctx.beginPath();
        ctx.moveTo(arrow.x2, arrow.y2);
        ctx.lineTo(
            arrow.x2 - headSize * Math.cos(angle - Math.PI / 6),
            arrow.y2 - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(arrow.x2, arrow.y2);
        ctx.lineTo(
            arrow.x2 - headSize * Math.cos(angle + Math.PI / 6),
            arrow.y2 - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    },

    /**
     * Dibuja una flecha de kick (con arco)
     * @param {Object} arrow
     */
    drawKickArrow(arrow) {
        const dx = arrow.x2 - arrow.x1;
        const dy = arrow.y2 - arrow.y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const arcHeight = arrow.arcHeight || CONFIG.KICK_ARC_HEIGHT;

        // Control point para la curva cuadrática
        const midX = (arrow.x1 + arrow.x2) / 2;
        const midY = (arrow.y1 + arrow.y2) / 2;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const cpX = midX + perpX * arcHeight;
        const cpY = midY + perpY * arcHeight;

        ctx.beginPath();
        ctx.moveTo(arrow.x1, arrow.y1);
        ctx.quadraticCurveTo(cpX, cpY, arrow.x2, arrow.y2);
        ctx.stroke();

        // Punta de flecha en el destino
        const t = 0.99;
        const x = (1 - t) * (1 - t) * arrow.x1 + 2 * (1 - t) * t * cpX + t * t * arrow.x2;
        const y = (1 - t) * (1 - t) * arrow.y1 + 2 * (1 - t) * t * cpY + t * t * arrow.y2;
        const angle = Math.atan2(arrow.y2 - y, arrow.x2 - x);
        const headSize = CONFIG.ARROW_HEAD_SIZE;

        ctx.beginPath();
        ctx.moveTo(arrow.x2, arrow.y2);
        ctx.lineTo(
            arrow.x2 - headSize * Math.cos(angle - Math.PI / 6),
            arrow.y2 - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(arrow.x2, arrow.y2);
        ctx.lineTo(
            arrow.x2 - headSize * Math.cos(angle + Math.PI / 6),
            arrow.y2 - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    },

    /**
     * Dibuja los textos
     * @param {Object} frame - Frame actual
     */
    drawTexts(frame) {
        if (!frame.texts) return;

        frame.texts.forEach(txt => {
            const isSelected = txt === state.selection.text;
            ctx.fillStyle = isSelected ? CONFIG.SELECTION_COLOR : "#000000";
            ctx.font = CONFIG.FONT_TEXT;
            ctx.fillText(txt.text, txt.x, txt.y);
        });
    },

    /**
     * Dibuja la línea de trail activa durante el drag
     */
    drawActiveDragTrail() {
        // Implementar si es necesario
    },

    /**
     * Dibuja los jugadores
     * @param {Object} frame - Frame actual
     */
    drawPlayers(frame) {
        frame.players.forEach(p => {
            if (!p.visible) return;

            const isSelected = state.selection.players.has(p);
            const color = p.team === "A" ? COLORS.TEAM_A : COLORS.TEAM_B;

            // Círculo del jugador
            ctx.fillStyle = color;
            ctx.strokeStyle = isSelected ? CONFIG.SELECTION_COLOR : "#ffffff";
            ctx.lineWidth = isSelected ? 4 : 2;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Número del jugador
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.number.toString(), p.x, p.y);
        });
    },

    /**
     * Dibuja los escudos de entrenamiento
     * @param {Object} frame - Frame actual
     */
    drawTrainingShields(frame) {
        if (!frame.trainingShields) return;

        frame.trainingShields.forEach(shield => {
            const player = frame.players.find(p => p.team === shield.team && p.number === shield.number);
            if (!player || !player.visible) return;

            const pos = getShieldPosition(player, shield);
            const isSelected = shield === state.selection.shield;

            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(shield.angle);

            // Dibujar escudo
            ctx.fillStyle = COLORS.SHIELD_GOLD;
            ctx.strokeStyle = isSelected ? CONFIG.SELECTION_COLOR : "#000000";
            ctx.lineWidth = isSelected ? 3 : 2;

            ctx.fillRect(-CONFIG.SHIELD_WIDTH / 2, -CONFIG.SHIELD_HEIGHT / 2, CONFIG.SHIELD_WIDTH, CONFIG.SHIELD_HEIGHT);
            ctx.strokeRect(-CONFIG.SHIELD_WIDTH / 2, -CONFIG.SHIELD_HEIGHT / 2, CONFIG.SHIELD_WIDTH, CONFIG.SHIELD_HEIGHT);

            ctx.restore();
        });
    },

    /**
     * Dibuja el balón
     * @param {Object} ball - Objeto del balón
     */
    drawBall(ball) {
        if (!ball || !ball.visible) return;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.ellipse(ball.x, ball.y, ball.rx, ball.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    },

    /**
     * Dibuja la caja de selección
     */
    drawSelectionBox() {
        if (!state.interaction.selectingBox || !state.interaction.selectBoxStart || !state.interaction.selectBoxEnd) return;

        const start = state.interaction.selectBoxStart;
        const end = state.interaction.selectBoxEnd;

        ctx.strokeStyle = CONFIG.SELECTION_COLOR;
        ctx.lineWidth = 2;
        ctx.setLineDash(CONFIG.SELECTION_BOX_DASH);

        ctx.strokeRect(
            Math.min(start.x, end.x),
            Math.min(start.y, end.y),
            Math.abs(end.x - start.x),
            Math.abs(end.y - start.y)
        );

        ctx.setLineDash([]);
    },

    /**
     * Dibuja jugadores interpolados para animación
     * @param {Object} frameA - Frame inicial
     * @param {Object} frameB - Frame final
     * @param {number} t - Factor de interpolación (0-1)
     */
    drawInterpolatedPlayers(frameA, frameB, t) {
        frameB.players.forEach((pB, i) => {
            if (!pB.visible) return;

            const pA = frameA.players[i];
            const x = pA.x !== null && pA.visible ? pA.x + (pB.x - pA.x) * t : pB.x;
            const y = pA.y !== null && pA.visible ? pA.y + (pB.y - pA.y) * t : pB.y;

            const color = pB.team === "A" ? COLORS.TEAM_A : COLORS.TEAM_B;

            ctx.fillStyle = color;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(x, y, pB.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(pB.number.toString(), x, y);
        });
    },

    /**
     * Dibuja balón interpolado para animación
     * @param {Object} ballA - Balón en frame A
     * @param {Object} ballB - Balón en frame B
     * @param {number} t - Factor de interpolación (0-1)
     */
    drawInterpolatedBall(ballA, ballB, t) {
        if (!ballB.visible) return;

        const x = ballA.visible ? ballA.x + (ballB.x - ballA.x) * t : ballB.x;
        const y = ballA.visible ? ballA.y + (ballB.y - ballA.y) * t : ballB.y;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.ellipse(x, y, ballB.rx, ballB.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
};
