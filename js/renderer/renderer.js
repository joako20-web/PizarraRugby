import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';
import { canvas, ctx } from '../core/dom.js';
import { Utils } from '../core/utils.js';
import { SETTINGS } from '../core/settings.js';

// ==============================
// RENDERIZADO - Sistema de renderizado del canvas
// ==============================
export const Renderer = {
    // ... (rest of the file until drawFrame)

    // NOTE: Instead of replacing the whole file, I will target specific blocks to be safer.
    // But the user tool requires me to be precise.
    // I will replace the top imports first.

    /**
     * Dibuja el campo de rugby según la configuración actual
     * Delega a drawFullField, drawFullFieldVertical o drawHalfField
     */
    drawPitch() {
        ctx.save();
        ctx.setLineDash([]);

        const cfg = state.fieldConfig;
        const w = canvas.width;
        const h = canvas.height;

        // Draw grass background
        const grass = ctx.createLinearGradient(0, 0, 0, h);
        grass.addColorStop(0, "#0b7c39");
        grass.addColorStop(1, "#0a6d33");
        ctx.fillStyle = grass;
        ctx.fillRect(0, 0, w, h);

        // Draw field based on configuration
        if (cfg.type === "half") {
            this.drawHalfField();
        } else if (cfg.orientation === "vertical") {
            this.drawFullFieldVertical();
        } else {
            this.drawFullField();
        }

        ctx.restore();
    },

    drawFullField() {
        // Mantener relación de aspecto 3:2 para campo horizontal
        const minMargin = 20;
        const aspectRatio = 3 / 2; // ancho / alto

        let fieldWidth = canvas.width - minMargin * 2;
        let fieldHeight = fieldWidth / aspectRatio;

        // Si la altura excede el canvas, ajustar por altura
        if (fieldHeight > canvas.height - minMargin * 2) {
            fieldHeight = canvas.height - minMargin * 2;
            fieldWidth = fieldHeight * aspectRatio;
        }

        // Centrar el campo en el canvas
        const marginX = (canvas.width - fieldWidth) / 2;
        const marginY = (canvas.height - fieldHeight) / 2;

        const inGoal = fieldWidth * 0.07;
        const xTryLeft = marginX + inGoal;
        const xTryRight = marginX + fieldWidth - inGoal;

        // Try zones
        ctx.fillStyle = "#064d24";
        ctx.fillRect(marginX, marginY, inGoal, fieldHeight);
        ctx.fillRect(xTryRight, marginY, inGoal, fieldHeight);

        // Field border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

        // Vertical lines
        const mainField = fieldWidth - inGoal * 2;
        const lines = {
            xTryLeft,
            xTryRight,
            x5L: xTryLeft + mainField * 0.05,
            x22L: xTryLeft + mainField * 0.22,
            xMid: xTryLeft + mainField * 0.50,
            x10L: xTryLeft + mainField * 0.40,
            x10R: xTryLeft + mainField * 0.60,
            x22R: xTryLeft + mainField * 0.78,
            x5R: xTryLeft + mainField * 0.95
        };

        const drawVertical = (x, dash = [], width = 2) => {
            ctx.setLineDash(dash);
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x, marginY);
            ctx.lineTo(x, marginY + fieldHeight);
            ctx.stroke();
        };

        drawVertical(lines.xTryLeft, [], 3);
        drawVertical(lines.xTryRight, [], 3);
        drawVertical(lines.x5L, [20, 14]);
        drawVertical(lines.x5R, [20, 14]);
        drawVertical(lines.x22L);
        drawVertical(lines.x22R);
        drawVertical(lines.x10L, [14, 10]);
        drawVertical(lines.x10R, [14, 10]);
        drawVertical(lines.xMid, [], 3);

        // Horizontal lines
        const yLines = [
            marginY + fieldHeight * 0.05,
            marginY + fieldHeight * 0.25,
            marginY + fieldHeight * 0.75,
            marginY + fieldHeight * 0.95
        ];

        ctx.setLineDash([20, 14]);
        ctx.lineWidth = 2;

        yLines.forEach(y => {
            ctx.beginPath();
            ctx.moveTo(xTryLeft, y);
            ctx.lineTo(xTryRight, y);
            ctx.stroke();
        });

        ctx.setLineDash([]);
    },

    drawFullFieldVertical() {
        // For vertical field: try zones at top/bottom, scaled to fit canvas
        const w = canvas.width;
        const h = canvas.height;

        // Use minimal margins for vertical field to maximize height usage
        const verticalMarginY = 10;  // Margen mínimo arriba/abajo
        const verticalMarginX = 20;  // Margen mínimo a los lados

        // Original field dimensions (horizontal reference)
        const originalWidth = 1200 - CONFIG.MARGIN_X * 2;
        const originalHeight = 800 - CONFIG.MARGIN_Y * 2;

        // For vertical: use almost full height
        const fieldHeight = h - verticalMarginY * 2;
        const fieldWidth = fieldHeight * (originalHeight / originalWidth);

        // Center horizontally
        const marginX = (w - fieldWidth) / 2;
        const marginY = verticalMarginY;

        const inGoal = fieldHeight * 0.07;
        const yTryTop = marginY + inGoal;
        const yTryBottom = marginY + fieldHeight - inGoal;

        // Try zones (top and bottom)
        ctx.fillStyle = "#064d24";
        ctx.fillRect(marginX, marginY, fieldWidth, inGoal);
        ctx.fillRect(marginX, yTryBottom, fieldWidth, inGoal);

        // Field border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

        // Horizontal lines (now they run across the field)
        const mainField = fieldHeight - inGoal * 2;
        const lines = {
            yTryTop,
            yTryBottom,
            y5T: yTryTop + mainField * 0.05,
            y22T: yTryTop + mainField * 0.22,
            yMid: yTryTop + mainField * 0.50,
            y10T: yTryTop + mainField * 0.40,
            y10B: yTryTop + mainField * 0.60,
            y22B: yTryTop + mainField * 0.78,
            y5B: yTryTop + mainField * 0.95
        };

        const drawHorizontal = (y, dash = [], width = 2) => {
            ctx.setLineDash(dash);
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(marginX, y);
            ctx.lineTo(marginX + fieldWidth, y);
            ctx.stroke();
        };

        drawHorizontal(lines.yTryTop, [], 3);
        drawHorizontal(lines.yTryBottom, [], 3);
        drawHorizontal(lines.y5T, [20, 14]);
        drawHorizontal(lines.y5B, [20, 14]);
        drawHorizontal(lines.y22T);
        drawHorizontal(lines.y22B);
        drawHorizontal(lines.y10T, [14, 10]);
        drawHorizontal(lines.y10B, [14, 10]);
        drawHorizontal(lines.yMid, [], 3);

        // Vertical lines (now perpendicular to play direction)
        const xLines = [
            marginX + fieldWidth * 0.05,
            marginX + fieldWidth * 0.25,
            marginX + fieldWidth * 0.75,
            marginX + fieldWidth * 0.95
        ];

        ctx.setLineDash([20, 14]);
        ctx.lineWidth = 2;

        xLines.forEach(x => {
            ctx.beginPath();
            ctx.moveTo(x, yTryTop);
            ctx.lineTo(x, yTryBottom);
            ctx.stroke();
        });

        ctx.setLineDash([]);
    },

    drawHalfField() {
        const w = canvas.width;
        const h = canvas.height;
        const cfg = state.fieldConfig;

        const marginX = CONFIG.MARGIN_X;
        const marginY = CONFIG.MARGIN_Y;

        const fieldWidth = w - CONFIG.MARGIN_X * 2;
        const fieldHeight = h - CONFIG.MARGIN_Y * 2;

        // Proporciones reales sobre 50 metros
        const P_5 = 5 / 50;   // 0.10
        const P_22 = 22 / 50;   // 0.44
        const P_40 = 40 / 50;   // 0.80
        const P_MID = 1.0;       // 50 / 50

        // Dibujo de borde completo
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

        // Zona de ensayo
        const inGoalHeight = fieldHeight * 0.12; // visual, no reglamentaria
        ctx.fillStyle = "#064d24";

        if (cfg.halfSide === "top") {
            ctx.fillRect(marginX, marginY, fieldWidth, inGoalHeight);
        } else {
            ctx.fillRect(
                marginX,
                marginY + fieldHeight - inGoalHeight,
                fieldWidth,
                inGoalHeight
            );
        }

        const drawLine = (y, dash = [], width = 2) => {
            ctx.setLineDash(dash);
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(marginX, y);
            ctx.lineTo(marginX + fieldWidth, y);
            ctx.stroke();
        };

        // Cálculo de líneas según mitad visible
        const base = cfg.halfSide === "top"
            ? marginY + inGoalHeight
            : marginY + fieldHeight - inGoalHeight;

        const dir = cfg.halfSide === "top" ? 1 : -1;

        // Línea de ensayo
        drawLine(base, [], 3);

        // 5 m
        drawLine(base + dir * fieldHeight * P_5, [20, 14]);

        // 22 m
        drawLine(base + dir * fieldHeight * P_22);

        // 40 m
        drawLine(base + dir * fieldHeight * P_40, [14, 10]);

        // Medio campo
        drawLine(
            cfg.halfSide === "top"
                ? marginY + fieldHeight
                : marginY,
            [],
            3
        );

        // Líneas verticales (5 m y touch) - solo en zona jugable, no en ensayo
        ctx.setLineDash([20, 14]);
        ctx.lineWidth = 2;

        const xLines = [0.05, 0.25, 0.75, 0.95];
        xLines.forEach(p => {
            const x = marginX + fieldWidth * p;
            ctx.beginPath();
            // Dibujar solo desde la línea de ensayo hasta el medio campo
            if (cfg.halfSide === "top") {
                ctx.moveTo(x, marginY + inGoalHeight);
                ctx.lineTo(x, marginY + fieldHeight);
            } else {
                ctx.moveTo(x, marginY);
                ctx.lineTo(x, marginY + fieldHeight - inGoalHeight);
            }
            ctx.stroke();
        });

        ctx.setLineDash([]);
    }
    ,

    // === Game Elements ===
    drawRugbyBall(b) {
        if (!b.visible) return;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(-0.4);
        ctx.beginPath();
        ctx.ellipse(0, 0, b.rx, b.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#f5e1c0";
        ctx.fill();
        ctx.strokeStyle = "#b37a42";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    },

    // === Arrow Drawing ===
    drawArrowHead(x, y, angle, isSelected) {
        const headSize = CONFIG.ARROW_HEAD_SIZE;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x - headSize * Math.cos(angle - Math.PI / 6),
            y - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x - headSize * Math.cos(angle + Math.PI / 6),
            y - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = isSelected ? CONFIG.SELECTION_COLOR : "white";
        ctx.fill();
    },

    drawNormalArrow(a) {
        const isSelected = a === state.selectedArrow;
        ctx.strokeStyle = isSelected ? CONFIG.SELECTION_COLOR : "white";
        ctx.lineWidth = isSelected ? 4 : 3;
        ctx.beginPath();
        ctx.moveTo(a.x1, a.y1);
        ctx.lineTo(a.x2, a.y2);
        ctx.stroke();

        const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
        this.drawArrowHead(a.x2, a.y2, angle, isSelected);
    },

    drawKickArrow(a) {
        const isSelected = a === state.selectedArrow;
        const mx = (a.x1 + a.x2) / 2;
        const my = (a.y1 + a.y2) / 2 - state.kickArcHeight;

        ctx.strokeStyle = isSelected ? CONFIG.SELECTION_COLOR : "yellow";
        ctx.lineWidth = isSelected ? 4 : 3;

        ctx.beginPath();
        ctx.moveTo(a.x1, a.y1);
        ctx.quadraticCurveTo(mx, my, a.x2, a.y2);
        ctx.stroke();

        const t = 0.9;
        const qx = (1 - t) * (1 - t) * a.x1 + 2 * (1 - t) * t * mx + t * t * a.x2;
        const qy = (1 - t) * (1 - t) * a.y1 + 2 * (1 - t) * t * my + t * t * a.y2;

        const angle = Math.atan2(a.y2 - qy, a.x2 - qx);

        // Draw head with yellow fill for kick arrows
        const headSize = CONFIG.ARROW_HEAD_SIZE;
        ctx.beginPath();
        ctx.moveTo(a.x2, a.y2);
        ctx.lineTo(
            a.x2 - headSize * Math.cos(angle - Math.PI / 6),
            a.y2 - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            a.x2 - headSize * Math.cos(angle + Math.PI / 6),
            a.y2 - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = isSelected ? CONFIG.SELECTION_COLOR : "yellow";
        ctx.fill();
    },

    // === Zones and Text ===
    drawZones() {
        const list = state.pendingZone ? [...state.zones, state.pendingZone] : state.zones;

        list.forEach(z => {
            const { left, top, width: w, height: h } = Utils.getZoneBounds(z);

            ctx.save();
            ctx.fillStyle = z.color || "#ffffff";
            ctx.globalAlpha = 0.25;
            ctx.fillRect(left, top, w, h);

            ctx.globalAlpha = 1;
            ctx.strokeStyle = (z === state.selectedZone ? "white" : z.color);
            ctx.lineWidth = (z === state.selectedZone ? 4 : 3);
            ctx.strokeRect(left, top, w, h);
            ctx.restore();

            if (z.labelOffsetX !== undefined && z.labelOffsetY !== undefined) {
                const labelX = left + z.labelOffsetX * w;
                const labelY = top + z.labelOffsetY * h;

                ctx.font = CONFIG.FONT_TEXT;
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(z.name, labelX, labelY);

                z.labelX = labelX;
                z.labelY = labelY;
            }

            if (z === state.selectedZone && z !== state.pendingZone) {
                const lockSize = 26;
                const lockX = left + w / 2;
                const lockY = top + h / 2;

                z.lockIcon = {
                    x: lockX - lockSize / 2,
                    y: lockY - lockSize / 2,
                    size: lockSize
                };

                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(lockX - lockSize / 2, lockY - lockSize / 2, lockSize, lockSize);

                ctx.fillStyle = "white";
                ctx.font = "22px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(z.locked ? "🔒" : "🔓", lockX, lockY);
            }
        });
    },

    drawTexts(f) {
        f.texts.forEach(t => {
            const isSelected = t === state.selectedText;
            ctx.font = CONFIG.FONT_TEXT;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            // Si está seleccionado, dibujar fondo resaltado
            if (isSelected) {
                const metrics = ctx.measureText(t.text);
                const textWidth = metrics.width;
                const textHeight = 40;

                ctx.fillStyle = "rgba(0, 255, 136, 0.3)";
                ctx.fillRect(t.x - textWidth / 2 - 5, t.y - 5, textWidth + 10, textHeight + 10);

                ctx.strokeStyle = CONFIG.SELECTION_COLOR;
                ctx.lineWidth = 2;
                ctx.strokeRect(t.x - textWidth / 2 - 5, t.y - 5, textWidth + 10, textHeight + 10);
            }

            ctx.fillStyle = isSelected ? CONFIG.SELECTION_COLOR : "white";
            ctx.fillText(t.text, t.x, t.y);
        });
    },

    // === Main Render ===
    drawFrame() {
        this.drawPitch();
        this.drawZones();

        const f = Utils.getCurrentFrame();

        // Trails
        f.trailLines.forEach(tl => {
            ctx.strokeStyle = tl.team === "A" ? SETTINGS.TEAM_A_COLOR : SETTINGS.TEAM_B_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tl.x1, tl.y1);
            ctx.lineTo(tl.x2, tl.y2);
            ctx.stroke();
        });

        // Flechas
        f.arrows.forEach(a => {
            if (a.type === "kick") this.drawKickArrow(a);
            else this.drawNormalArrow(a);
        });

        if (state.previewArrow) {
            if (state.previewArrow.type === "kick") this.drawKickArrow(state.previewArrow);
            else this.drawNormalArrow(state.previewArrow);
        }

        this.drawTexts(f);

        // Rastro activo
        if (state.dragTarget && state.dragTarget.type === "players") {
            ctx.lineWidth = 2;
            state.dragTarget.players.forEach((pl, i) => {
                const st = state.dragTarget.startPositions[i];
                ctx.strokeStyle = pl.team === "A" ? "#7fb9ff" : "#ff7a7a";
                ctx.beginPath();
                ctx.moveTo(st.x, st.y);
                ctx.lineTo(pl.x, pl.y);
                ctx.stroke();
            });
        }

        // Jugadores
        f.players.forEach(p => {
            if (!p.visible) return;

            // Usar fichas más grandes en campo completo horizontal y aplicar escala de configuración
            let radius = (state.fieldConfig.type === "full" && state.fieldConfig.orientation === "horizontal")
                ? p.radius * 1.2
                : p.radius;

            radius *= SETTINGS.PLAYER_SCALE;

            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = p.team === "A" ? SETTINGS.TEAM_A_COLOR : SETTINGS.TEAM_B_COLOR;
            ctx.fill();

            if (state.selectedPlayers.has(p)) {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            if (SETTINGS.SHOW_NUMBERS) {
                ctx.fillStyle = "white";
                ctx.font = "bold 14px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(p.number, p.x, p.y);
            }
        });

        // Escudos de entrenamiento
        f.trainingShields.forEach(shield => {
            // Encontrar el jugador asociado
            const player = Utils.findPlayerByTeamNumber(shield.team, shield.number, f);

            if (!player) return;

            // Calcular la posición del escudo basado en el ángulo
            const shieldPos = Utils.getShieldPosition(player, shield);
            const shieldX = shieldPos.x;
            const shieldY = shieldPos.y;
            const shieldWidth = CONFIG.SHIELD_WIDTH;
            const shieldHeight = CONFIG.SHIELD_HEIGHT;

            // Dibujar el rectángulo amarillo (rotado 90 grados para que el lado largo esté pegado a la ficha)
            ctx.save();
            ctx.translate(shieldX, shieldY);
            ctx.rotate(shield.angle);
            ctx.fillStyle = "#FFD700"; // Color amarillo dorado
            ctx.strokeStyle = shield === state.selectedShield ? "#FFFFFF" : "#000000";
            ctx.lineWidth = shield === state.selectedShield ? 3 : 2;
            ctx.fillRect(-shieldWidth / 2, -shieldHeight / 2, shieldWidth, shieldHeight);
            ctx.strokeRect(-shieldWidth / 2, -shieldHeight / 2, shieldWidth, shieldHeight);
            ctx.restore();
        });

        this.drawRugbyBall(f.ball);

        // Caja de selección
        if (state.selectingBox && state.selectBoxStart && state.selectBoxEnd) {
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.5;
            const x = Math.min(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y = Math.min(state.selectBoxStart.y, state.selectBoxEnd.y);
            const w = Math.abs(state.selectBoxEnd.x - state.selectBoxStart.x);
            const h = Math.abs(state.selectBoxEnd.y - state.selectBoxStart.y);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }
    },

    // === Animation Interpolation ===
    drawInterpolatedFrame(a, b, t) {
        this.drawPitch();
        this.drawZones();

        for (let i = 0; i < a.players.length; i++) {
            const p1 = a.players[i];
            const p2 = b.players[i];
            if (!(p1.visible || p2.visible)) continue;

            let x, y;
            if (p1.visible && p2.visible) {
                x = p1.x + (p2.x - p1.x) * t;
                y = p1.y + (p2.y - p1.y) * t;
            } else if (p1.visible) {
                x = p1.x;
                y = p1.y;
            } else {
                x = p2.x;
                y = p2.y;
            }

            ctx.beginPath();
            ctx.arc(x, y, p1.radius, 0, Math.PI * 2);
            ctx.fillStyle = p1.team === "A" ? SETTINGS.TEAM_A_COLOR : SETTINGS.TEAM_B_COLOR;
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p1.number, x, y);
        }

        b.arrows.forEach(a => {
            if (a.type === "kick") this.drawKickArrow(a);
            else this.drawNormalArrow(a);
        });
        this.drawTexts(b);

        const bl1 = a.ball;
        const bl2 = b.ball;
        let bx, by;
        if (bl1.visible && bl2.visible) {
            bx = bl1.x + (bl2.x - bl1.x) * t;
            by = bl1.y + (bl2.y - bl1.y) * t;
        } else if (bl1.visible) {
            bx = bl1.x;
            by = bl1.y;
        } else {
            bx = bl2.x;
            by = bl2.y;
        }

        this.drawRugbyBall({ x: bx, y: by, rx: bl1.rx, ry: bl1.ry, visible: true });
    }
};
