import { Utils } from '../core/utils.js';
import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';

// ==============================
// HIT TESTS
// ==============================
export const HitTest = {
    findPlayerAt(pos) {
        const frame = Utils.getCurrentFrame();
        // Buscar de arriba a abajo (reverse) para seleccionar el que se dibuja encima
        for (let i = frame.players.length - 1; i >= 0; i--) {
            const p = frame.players[i];
            if (!p.visible) continue;
            const dist = Math.hypot(p.x - pos.x, p.y - pos.y);
            const radius = (state.fieldConfig.type === "full" && state.fieldConfig.orientation === "horizontal")
                ? p.radius * 1.2
                : p.radius;
            if (dist <= radius) {
                return p;
            }
        }
        return null;
    },

    ballHitTest(pos) {
        const f = Utils.getCurrentFrame();
        const b = f.ball;
        if (!b.visible) return false;
        const dx = pos.x - b.x;
        const dy = pos.y - b.y;
        return (dx * dx) / (b.rx * b.rx) + (dy * dy) / (b.ry * b.ry) <= 1;
    },

    zoneHitTest(x, y) {
        // Buscar en orden inverso (última dibujada primero)
        for (let i = state.zones.length - 1; i >= 0; i--) {
            const z = state.zones[i];
            // Normalizar coordenadas
            const left = Math.min(z.x1, z.x2);
            const right = Math.max(z.x1, z.x2);
            const top = Math.min(z.y1, z.y2);
            const bottom = Math.max(z.y1, z.y2);

            if (x >= left && x <= right && y >= top && y <= bottom) {
                return z;
            }
        }
        return null;
    },

    findTextAt(x, y) {
        const f = Utils.getCurrentFrame();
        // Area aproximada de texto
        const w = 100;
        const h = 30;
        return f.texts.find(t =>
            x >= t.x - w / 2 && x <= t.x + w / 2 &&
            y >= t.y - h / 2 && y <= t.y + h / 2
        );
    },

    findShieldAt(x, y) {
        const f = Utils.getCurrentFrame();
        const shieldWidth = CONFIG.SHIELD_WIDTH;
        const shieldHeight = CONFIG.SHIELD_HEIGHT;

        for (let i = f.trainingShields.length - 1; i >= 0; i--) {
            const shield = f.trainingShields[i];
            const player = Utils.findPlayerByTeamNumber(shield.team, shield.number, f);

            if (!player) continue;

            // Obtener la posición del escudo
            const shieldPos = Utils.getShieldPosition(player, shield);
            const shieldX = shieldPos.x;
            const shieldY = shieldPos.y;

            // Transformar el punto de clic al sistema de coordenadas local del escudo (rotado)
            const dx = x - shieldX;
            const dy = y - shieldY;
            const rotatedX = dx * Math.cos(-shield.angle) - dy * Math.sin(-shield.angle);
            const rotatedY = dx * Math.sin(-shield.angle) + dy * Math.cos(-shield.angle);

            // Verificar si el punto está dentro del rectángulo del escudo
            if (Math.abs(rotatedX) <= shieldWidth / 2 && Math.abs(rotatedY) <= shieldHeight / 2) {
                return shield;
            }
        }
        return null;
    },

    findArrowAt(x, y) {
        const f = Utils.getCurrentFrame();
        const threshold = 10; // Distancia máxima para considerar un clic en la flecha

        for (let i = f.arrows.length - 1; i >= 0; i--) {
            const arrow = f.arrows[i];

            if (arrow.type === "kick") {
                // Para flechas curvas, verificar proximidad a la curva
                const mx = (arrow.x1 + arrow.x2) / 2;
                const my = (arrow.y1 + arrow.y2) / 2 - state.kickArcHeight;

                // Verificar varios puntos a lo largo de la curva
                for (let t = 0; t <= 1; t += 0.1) {
                    const qx = (1 - t) * (1 - t) * arrow.x1 + 2 * (1 - t) * t * mx + t * t * arrow.x2;
                    const qy = (1 - t) * (1 - t) * arrow.y1 + 2 * (1 - t) * t * my + t * t * arrow.y2;

                    const dist = Math.hypot(x - qx, y - qy);
                    if (dist <= threshold) {
                        return arrow;
                    }
                }
            } else {
                // Para flechas rectas, verificar distancia a la línea
                const dx = arrow.x2 - arrow.x1;
                const dy = arrow.y2 - arrow.y1;
                const length = Math.hypot(dx, dy);

                if (length === 0) continue;

                // Proyección del punto en la línea
                const t = Math.max(0, Math.min(1, ((x - arrow.x1) * dx + (y - arrow.y1) * dy) / (length * length)));
                const projX = arrow.x1 + t * dx;
                const projY = arrow.y1 + t * dy;

                const dist = Math.hypot(x - projX, y - projY);
                if (dist <= threshold) {
                    return arrow;
                }
            }
        }
        return null;
    }
};
