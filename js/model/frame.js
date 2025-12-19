import { CONFIG } from '../core/config.js';
import { canvas } from '../core/dom.js';

// ==============================
// FRAMES Y JUGADORES
// ==============================
export const Frame = {
    createEmptyPlayers() {
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
    },

    create() {
        return {
            players: this.createEmptyPlayers(),
            ball: {
                x: canvas.width / 2,
                y: canvas.height / 2,
                rx: CONFIG.BALL_RX,
                ry: CONFIG.BALL_RY,
                visible: true
            },
            arrows: [],
            texts: [],
            drawings: [],
            trailLines: [],
            trainingShields: []
        };
    },

    clone(f) {
        return {
            players: f.players.map(p => ({ ...p })),
            ball: { ...f.ball },
            arrows: f.arrows.map(a => ({ ...a })),
            texts: f.texts.map(t => ({ ...t })),
            drawings: (f.drawings || []).map(d => ({ ...d, points: [...d.points] })),
            trailLines: f.trailLines.map(t => ({ ...t })),
            trainingShields: (f.trainingShields || []).map(s => ({ ...s }))
        };
    }
};
