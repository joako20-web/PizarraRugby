import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';
import { canvas, ctx } from '../core/dom.js';
import { Utils } from '../core/utils.js';
import { SETTINGS } from '../core/settings.js';

// ==============================
// RENDERIZADO - Sistema de renderizado del canvas
// ==============================
export const Renderer = {
    // Canvas offscreen (o en memoria) para elementos estáticos
    bgCanvas: document.createElement('canvas'),
    bgCtx: null,

    // Variables para controlar redibujado
    bgDirty: true,

    init() {
        if (!this.bgCtx) {
            this.bgCtx = this.bgCanvas.getContext('2d');
            // Inicializar tamaño
            this.updateCanvasSize();
        }
    },

    updateCanvasSize() {
        if (this.bgCanvas.width !== canvas.width || this.bgCanvas.height !== canvas.height) {
            this.bgCanvas.width = canvas.width;
            this.bgCanvas.height = canvas.height;
            this.bgDirty = true;
        }
    },

    invalidateBackground() {
        this.bgDirty = true;
    },

    /**
     * Dibuja el campo de rugby según la configuración actual
     * Delega a drawFullField, drawFullFieldVertical o drawHalfField
     */
    drawPitch(targetCtx = ctx, width, height) {
        // Asegurar inicialización
        this.init();
        this.updateCanvasSize();

        // Si el renderizado se pide al contexto principal (render normal)
        if (targetCtx === ctx && !width && !height) {
            // Solo redibujar el fondo si está sucio
            if (this.bgDirty) {
                // Dibujar en el canvas offscreen
                this._renderPitchToContext(this.bgCtx);
                this.bgDirty = false;
            }
            // Copiar el fondo al canvas principal
            ctx.drawImage(this.bgCanvas, 0, 0);
        } else {
            // Si es un contexto externo (ej. exportación), dibujar directamente
            this._renderPitchToContext(targetCtx, width, height);
        }
    },

    _renderPitchToContext(targetCtx, width, height) {
        targetCtx.save();
        targetCtx.setLineDash([]);

        const cfg = state.fieldConfig;
        const w = width || targetCtx.canvas.width;
        const h = height || targetCtx.canvas.height;

        // Draw grass background
        const grass = targetCtx.createLinearGradient(0, 0, 0, h);
        grass.addColorStop(0, "#0b7c39");
        grass.addColorStop(1, "#0a6d33");
        targetCtx.fillStyle = grass;
        targetCtx.fillRect(0, 0, w, h);

        // Draw field based on configuration
        if (cfg.type === "half") {
            this.drawHalfField(targetCtx, w, h);
        } else if (cfg.orientation === "vertical") {
            this.drawFullFieldVertical(targetCtx, w, h);
        } else {
            this.drawFullField(targetCtx, w, h);
        }

        targetCtx.restore();
    },

    drawFullField(targetCtx, w, h) {
        // Mantener relación de aspecto 3:2 para campo horizontal
        const minMargin = 20;
        const aspectRatio = 3 / 2; // ancho / alto

        // Use Defaults if not passed (though _renderPitchToContext ensures they are passed)
        const canvasW = w || targetCtx.canvas.width;
        const canvasH = h || targetCtx.canvas.height;

        let fieldWidth = canvasW - minMargin * 2;
        let fieldHeight = fieldWidth / aspectRatio;

        // Si la altura excede el canvas, ajustar por altura
        if (fieldHeight > canvasH - minMargin * 2) {
            fieldHeight = canvasH - minMargin * 2;
            fieldWidth = fieldHeight * aspectRatio;
        }

        // Centrar el campo en el canvas
        const marginX = (canvasW - fieldWidth) / 2;
        const marginY = (canvasH - fieldHeight) / 2;

        const inGoal = fieldWidth * 0.07;
        const xTryLeft = marginX + inGoal;
        const xTryRight = marginX + fieldWidth - inGoal;

        // Try zones
        targetCtx.fillStyle = "#064d24";
        targetCtx.fillRect(marginX, marginY, inGoal, fieldHeight);
        targetCtx.fillRect(xTryRight, marginY, inGoal, fieldHeight);

        // Field border
        targetCtx.strokeStyle = "#ffffff";
        targetCtx.lineWidth = 3;
        targetCtx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

        // Vertical lines
        const mainField = fieldWidth - inGoal * 2;
        const lines = {
            xTryLeft,
            xTryRight,
            x5L: xTryLeft + mainField * CONFIG.FIELD_LINES.FIVE_METER,
            x22L: xTryLeft + mainField * CONFIG.FIELD_LINES.TWENTY_TWO,
            xMid: xTryLeft + mainField * CONFIG.FIELD_LINES.MIDFIELD,
            x10L: xTryLeft + mainField * CONFIG.FIELD_LINES.TEN_METER_LEFT,
            x10R: xTryLeft + mainField * CONFIG.FIELD_LINES.TEN_METER_RIGHT,
            x22R: xTryLeft + mainField * CONFIG.FIELD_LINES.TWENTY_TWO_RIGHT,
            x5R: xTryLeft + mainField * CONFIG.FIELD_LINES.FIVE_METER_RIGHT
        };

        const drawVertical = (x, dash = [], width = 2) => {
            targetCtx.setLineDash(dash);
            targetCtx.lineWidth = width;
            targetCtx.beginPath();
            targetCtx.moveTo(x, marginY);
            targetCtx.lineTo(x, marginY + fieldHeight);
            targetCtx.stroke();
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

        targetCtx.setLineDash([20, 14]);
        targetCtx.lineWidth = 2;

        yLines.forEach(y => {
            targetCtx.beginPath();
            targetCtx.moveTo(xTryLeft, y);
            targetCtx.lineTo(xTryRight, y);
            targetCtx.stroke();
        });

        targetCtx.setLineDash([]);
    },

    drawFullFieldVertical(targetCtx, w, h) {
        // For vertical field: try zones at top/bottom, scaled to fit canvas
        const canvasW = w || targetCtx.canvas.width;
        const canvasH = h || targetCtx.canvas.height;

        // Use minimal margins for vertical field to maximize height usage
        const verticalMarginY = 10;  // Margen mínimo arriba/abajo


        // Original field dimensions (horizontal reference)
        const originalWidth = 1200 - CONFIG.MARGIN_X * 2;
        const originalHeight = 800 - CONFIG.MARGIN_Y * 2;

        // For vertical: use almost full height
        const fieldHeight = canvasH - verticalMarginY * 2;
        const fieldWidth = fieldHeight * (originalHeight / originalWidth);

        // Center horizontally
        const marginX = (canvasW - fieldWidth) / 2;
        const marginY = verticalMarginY;

        const inGoal = fieldHeight * 0.07;
        const yTryTop = marginY + inGoal;
        const yTryBottom = marginY + fieldHeight - inGoal;

        // Try zones (top and bottom)
        targetCtx.fillStyle = "#064d24";
        targetCtx.fillRect(marginX, marginY, fieldWidth, inGoal);
        targetCtx.fillRect(marginX, yTryBottom, fieldWidth, inGoal);

        // Field border
        targetCtx.strokeStyle = "#ffffff";
        targetCtx.lineWidth = 3;
        targetCtx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

        // Horizontal lines (now they run across the field)
        const mainField = fieldHeight - inGoal * 2;
        const lines = {
            yTryTop,
            yTryBottom,
            y5T: yTryTop + mainField * CONFIG.FIELD_LINES.FIVE_METER,
            y22T: yTryTop + mainField * CONFIG.FIELD_LINES.TWENTY_TWO,
            yMid: yTryTop + mainField * CONFIG.FIELD_LINES.MIDFIELD,
            y10T: yTryTop + mainField * CONFIG.FIELD_LINES.TEN_METER_LEFT,
            y10B: yTryTop + mainField * CONFIG.FIELD_LINES.TEN_METER_RIGHT,
            y22B: yTryTop + mainField * CONFIG.FIELD_LINES.TWENTY_TWO_RIGHT,
            y5B: yTryTop + mainField * CONFIG.FIELD_LINES.FIVE_METER_RIGHT
        };

        const drawHorizontal = (y, dash = [], width = 2) => {
            targetCtx.setLineDash(dash);
            targetCtx.lineWidth = width;
            targetCtx.beginPath();
            targetCtx.moveTo(marginX, y);
            targetCtx.lineTo(marginX + fieldWidth, y);
            targetCtx.stroke();
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

        targetCtx.setLineDash([20, 14]);
        targetCtx.lineWidth = 2;

        xLines.forEach(x => {
            targetCtx.beginPath();
            targetCtx.moveTo(x, yTryTop);
            targetCtx.lineTo(x, yTryBottom);
            targetCtx.stroke();
        });

        targetCtx.setLineDash([]);
    },

    drawHalfField(targetCtx, w, h) {
        const canvasW = w || targetCtx.canvas.width;
        const canvasH = h || targetCtx.canvas.height;
        const cfg = state.fieldConfig;

        const marginX = CONFIG.MARGIN_X;
        const marginY = CONFIG.MARGIN_Y;

        const fieldWidth = canvasW - CONFIG.MARGIN_X * 2;
        const fieldHeight = canvasH - CONFIG.MARGIN_Y * 2;

        // Proporciones reales sobre 50 metros
        const P_5 = 5 / 50;   // 0.10
        const P_22 = 22 / 50;   // 0.44
        const P_40 = 40 / 50;   // 0.80


        // Dibujo de borde completo
        targetCtx.strokeStyle = "#ffffff";
        targetCtx.lineWidth = 3;
        targetCtx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

        // Zona de ensayo
        const inGoalHeight = fieldHeight * 0.12; // visual, no reglamentaria
        targetCtx.fillStyle = "#064d24";

        if (cfg.halfSide === "top") {
            targetCtx.fillRect(marginX, marginY, fieldWidth, inGoalHeight);
        } else {
            targetCtx.fillRect(
                marginX,
                marginY + fieldHeight - inGoalHeight,
                fieldWidth,
                inGoalHeight
            );
        }

        const drawLine = (y, dash = [], width = 2) => {
            targetCtx.setLineDash(dash);
            targetCtx.lineWidth = width;
            targetCtx.beginPath();
            targetCtx.moveTo(marginX, y);
            targetCtx.lineTo(marginX + fieldWidth, y);
            targetCtx.stroke();
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
        targetCtx.setLineDash([20, 14]);
        targetCtx.lineWidth = 2;

        const xLines = [0.05, 0.25, 0.75, 0.95];
        xLines.forEach(p => {
            const x = marginX + fieldWidth * p;
            targetCtx.beginPath();
            // Dibujar solo desde la línea de ensayo hasta el medio campo
            if (cfg.halfSide === "top") {
                targetCtx.moveTo(x, marginY + inGoalHeight);
                targetCtx.lineTo(x, marginY + fieldHeight);
            } else {
                targetCtx.moveTo(x, marginY);
                targetCtx.lineTo(x, marginY + fieldHeight - inGoalHeight);
            }
            targetCtx.stroke();
        });

        targetCtx.setLineDash([]);
    },

    // === Game Elements ===
    drawRugbyBall(b, targetCtx = ctx) {
        if (!b.visible) return;

        const scale = SETTINGS.BALL_SCALE || 1.0;
        const rx = b.rx * scale;
        const ry = b.ry * scale;

        targetCtx.save();
        targetCtx.translate(b.x, b.y);
        targetCtx.rotate(-0.4);
        targetCtx.beginPath();
        targetCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        targetCtx.fillStyle = "#f5e1c0";
        targetCtx.fill();
        targetCtx.strokeStyle = "#b37a42";
        targetCtx.lineWidth = 2;
        targetCtx.stroke();
        targetCtx.restore();
    },

    // === Arrow Drawing ===
    drawArrowHead(x, y, angle, isSelected, targetCtx = ctx) {
        const headSize = CONFIG.ARROW_HEAD_SIZE;
        targetCtx.beginPath();
        targetCtx.moveTo(x, y);
        targetCtx.lineTo(
            x - headSize * Math.cos(angle - Math.PI / 6),
            y - headSize * Math.sin(angle - Math.PI / 6)
        );
        targetCtx.lineTo(
            x - headSize * Math.cos(angle + Math.PI / 6),
            y - headSize * Math.sin(angle + Math.PI / 6)
        );
        targetCtx.closePath();
        targetCtx.fillStyle = isSelected ? CONFIG.SELECTION_COLOR : "white";
        targetCtx.fill();
    },

    drawNormalArrow(a, targetCtx = ctx) {
        const isSelected = a === state.selectedArrow;
        targetCtx.strokeStyle = isSelected ? CONFIG.SELECTION_COLOR : "white";
        targetCtx.lineWidth = isSelected ? 4 : 3;

        // Support both legacy format (x1,y1,x2,y2) and new multi-point format
        if (a.points && a.points.length >= 2) {
            // Multi-point arrow
            targetCtx.beginPath();
            targetCtx.moveTo(a.points[0].x, a.points[0].y);
            for (let i = 1; i < a.points.length; i++) {
                targetCtx.lineTo(a.points[i].x, a.points[i].y);
            }
            targetCtx.stroke();

            // Draw arrow head at the last point
            const lastIdx = a.points.length - 1;
            const prevIdx = lastIdx - 1;
            const angle = Math.atan2(
                a.points[lastIdx].y - a.points[prevIdx].y,
                a.points[lastIdx].x - a.points[prevIdx].x
            );
            this.drawArrowHead(a.points[lastIdx].x, a.points[lastIdx].y, angle, isSelected, targetCtx);
        } else {
            // Legacy format: simple line from (x1,y1) to (x2,y2)
            targetCtx.beginPath();
            targetCtx.moveTo(a.x1, a.y1);
            targetCtx.lineTo(a.x2, a.y2);
            targetCtx.stroke();

            const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
            this.drawArrowHead(a.x2, a.y2, angle, isSelected, targetCtx);
        }
    },

    drawKickArrow(a, targetCtx = ctx) {
        const isSelected = a === state.selectedArrow;
        const mx = (a.x1 + a.x2) / 2;
        const my = (a.y1 + a.y2) / 2 - state.kickArcHeight;

        targetCtx.strokeStyle = isSelected ? CONFIG.SELECTION_COLOR : "yellow";
        targetCtx.lineWidth = isSelected ? 4 : 3;

        targetCtx.beginPath();
        targetCtx.moveTo(a.x1, a.y1);
        targetCtx.quadraticCurveTo(mx, my, a.x2, a.y2);
        targetCtx.stroke();

        const t = 0.9;
        const qx = (1 - t) * (1 - t) * a.x1 + 2 * (1 - t) * t * mx + t * t * a.x2;
        const qy = (1 - t) * (1 - t) * a.y1 + 2 * (1 - t) * t * my + t * t * a.y2;

        const angle = Math.atan2(a.y2 - qy, a.x2 - qx);

        // Draw head with yellow fill for kick arrows
        const headSize = CONFIG.ARROW_HEAD_SIZE;
        targetCtx.beginPath();
        targetCtx.moveTo(a.x2, a.y2);
        targetCtx.lineTo(
            a.x2 - headSize * Math.cos(angle - Math.PI / 6),
            a.y2 - headSize * Math.sin(angle - Math.PI / 6)
        );
        targetCtx.lineTo(
            a.x2 - headSize * Math.cos(angle + Math.PI / 6),
            a.y2 - headSize * Math.sin(angle + Math.PI / 6)
        );
        targetCtx.closePath();
        targetCtx.fillStyle = isSelected ? CONFIG.SELECTION_COLOR : "yellow";
        targetCtx.fill();
    },

    // === Zones and Text ===
    drawZones(targetCtx = ctx) {
        // En modo optimizado, las zonas se dibujan en el bgCanvas (porque suelen ser estáticas)
        // Pero como pueden ser seleccionadas y editadas, quizás es mejor mantenerlas dinámicas
        // O separar: zonas estáticas vs zona siendo editada.
        // Por simplicidad para este paso, las dibujaremos en la capa dinámica si están siendo editadas, 
        // o podríamos moverlas al background y hacer invalidate() cuando cambien.
        // Dado que el usuario las mueve mucho al crearlas, mejor dejarlas dinámicas o hacer invalidate frecuente.

        // CORRECCIÓN: Para optimizar DE VERDAD, el drawPitch debería incluir las zonas si no se están editando.
        // Pero para no complicar la lógica de selección (que dibuja bordes de selección),
        // vamos a dejarlas en el renderizado dinámico por ahora, ya que son pocas.

        // Simplemente actualizamos para aceptar targetCtx
        const list = state.pendingZone ? [...state.zones, state.pendingZone] : state.zones;

        list.forEach(z => {
            const { left, top, width: w, height: h } = Utils.getZoneBounds(z);

            targetCtx.save();
            targetCtx.fillStyle = z.color || "#ffffff";
            targetCtx.globalAlpha = 0.25;
            targetCtx.fillRect(left, top, w, h);

            targetCtx.globalAlpha = 1;
            targetCtx.strokeStyle = (z === state.selectedZone ? "white" : z.color);
            targetCtx.lineWidth = (z === state.selectedZone ? 4 : 3);
            targetCtx.strokeRect(left, top, w, h);
            targetCtx.restore();

            if (z.labelOffsetX !== undefined && z.labelOffsetY !== undefined) {
                const labelX = left + z.labelOffsetX * w;
                const labelY = top + z.labelOffsetY * h;

                targetCtx.font = CONFIG.FONT_TEXT;
                targetCtx.fillStyle = "white";
                targetCtx.textAlign = "center";
                targetCtx.textBaseline = "middle";
                targetCtx.fillText(z.name, labelX, labelY);

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

                targetCtx.fillStyle = "rgba(0,0,0,0.8)";
                targetCtx.fillRect(lockX - lockSize / 2, lockY - lockSize / 2, lockSize, lockSize);

                targetCtx.fillStyle = "white";
                targetCtx.font = "22px Arial";
                targetCtx.textAlign = "center";
                targetCtx.textBaseline = "middle";
                targetCtx.fillText(z.locked ? "🔒" : "🔓", lockX, lockY);
            }
        });
    },

    drawTexts(f, targetCtx = ctx) {
        f.texts.forEach(t => {
            const isSelected = t === state.selectedText;
            targetCtx.font = CONFIG.FONT_TEXT;
            targetCtx.textAlign = "center";
            targetCtx.textBaseline = "top";

            // Si está seleccionado, dibujar fondo resaltado
            if (isSelected) {
                const metrics = targetCtx.measureText(t.text);
                const textWidth = metrics.width;
                const textHeight = 40;

                targetCtx.fillStyle = "rgba(0, 255, 136, 0.3)";
                targetCtx.fillRect(t.x - textWidth / 2 - 5, t.y - 5, textWidth + 10, textHeight + 10);

                targetCtx.strokeStyle = CONFIG.SELECTION_COLOR;
                targetCtx.lineWidth = 2;
                targetCtx.strokeRect(t.x - textWidth / 2 - 5, t.y - 5, textWidth + 10, textHeight + 10);
            }

            targetCtx.fillStyle = isSelected ? CONFIG.SELECTION_COLOR : "white";
            targetCtx.fillText(t.text, t.x, t.y);
        });
    },

    // === Main Render ===
    drawFrame(targetCtx = ctx, width, height) {
        // 1. Dibujar fondo (campo)
        // Si targetCtx es el principal, usamos el sistema de capas.
        // Si es exportación, pasamos el targetCtx directo.

        // Limpiar canvas primero
        const w = width || targetCtx.canvas.width;
        const h = height || targetCtx.canvas.height;
        targetCtx.clearRect(0, 0, w, h);

        this.drawPitch(targetCtx, width, height); // Esto ahora maneja capas automáticamente si es ctx principal

        // 2. Elementos dinámicos
        this.drawZones(targetCtx);

        const f = Utils.getCurrentFrame();

        // Trails
        f.trailLines.forEach(tl => {
            targetCtx.strokeStyle = tl.team === "A" ? SETTINGS.TEAM_A_COLOR : SETTINGS.TEAM_B_COLOR;
            targetCtx.lineWidth = 2;
            targetCtx.beginPath();
            targetCtx.moveTo(tl.x1, tl.y1);
            targetCtx.lineTo(tl.x2, tl.y2);
            targetCtx.stroke();
        });

        // Flechas
        f.arrows.forEach(a => {
            if (a.type === "kick") this.drawKickArrow(a, targetCtx);
            else this.drawNormalArrow(a, targetCtx);
        });

        if (state.previewArrow) {
            if (state.previewArrow.type === "kick") this.drawKickArrow(state.previewArrow, targetCtx);
            else this.drawNormalArrow(state.previewArrow, targetCtx);
        }

        this.drawTexts(f, targetCtx);

        // Rastro activo
        if (state.dragTarget && state.dragTarget.type === "players") {
            targetCtx.lineWidth = 2;
            state.dragTarget.players.forEach((pl, i) => {
                const st = state.dragTarget.startPositions[i];
                targetCtx.strokeStyle = pl.team === "A" ? "#7fb9ff" : "#ff7a7a";
                targetCtx.beginPath();
                targetCtx.moveTo(st.x, st.y);
                targetCtx.lineTo(pl.x, pl.y);
                targetCtx.stroke();
            });
        }

        // Jugadores
        f.players.forEach(p => {
            if (!p.visible) return;

            // Responsive Radius Calculation
            const isMobile = targetCtx.canvas.width <= 1024;
            const baseScale = isMobile ? 0.6 : 1.0; // 60% size on mobile

            // Usar fichas más grandes en campo completo horizontal (solo desktop)
            let radius = (state.fieldConfig.type === "full" && state.fieldConfig.orientation === "horizontal" && !isMobile)
                ? p.radius * 1.2
                : p.radius;

            radius *= SETTINGS.PLAYER_SCALE * baseScale;

            targetCtx.beginPath();
            targetCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            targetCtx.fillStyle = p.team === "A" ? SETTINGS.TEAM_A_COLOR : SETTINGS.TEAM_B_COLOR;
            targetCtx.fill();

            if (state.selectedPlayers.has(p)) {
                targetCtx.strokeStyle = "white";
                targetCtx.lineWidth = 3;
                targetCtx.stroke();
            }

            if (SETTINGS.SHOW_NUMBERS) {
                targetCtx.fillStyle = "white";
                targetCtx.font = "bold 14px Arial";
                targetCtx.textAlign = "center";
                targetCtx.textBaseline = "middle";
                targetCtx.fillText(p.number, p.x, p.y);
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
            targetCtx.save();
            targetCtx.translate(shieldX, shieldY);
            targetCtx.rotate(shield.angle);
            targetCtx.fillStyle = "#FFD700"; // Color amarillo dorado
            targetCtx.strokeStyle = shield === state.selectedShield ? "#FFFFFF" : "#000000";
            targetCtx.lineWidth = shield === state.selectedShield ? 3 : 2;
            targetCtx.fillRect(-shieldWidth / 2, -shieldHeight / 2, shieldWidth, shieldHeight);
            targetCtx.strokeRect(-shieldWidth / 2, -shieldHeight / 2, shieldWidth, shieldHeight);
            targetCtx.restore();
        });

        this.drawRugbyBall(f.ball, targetCtx);

        // Caja de selección
        if (state.selectingBox && state.selectBoxStart && state.selectBoxEnd) {
            targetCtx.setLineDash([6, 4]);
            targetCtx.strokeStyle = "white";
            targetCtx.lineWidth = 1.5;
            const x = Math.min(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y = Math.min(state.selectBoxStart.y, state.selectBoxEnd.y);
            const w = Math.abs(state.selectBoxEnd.x - state.selectBoxStart.x);
            const h = Math.abs(state.selectBoxEnd.y - state.selectBoxStart.y);
            targetCtx.strokeRect(x, y, w, h);
            targetCtx.setLineDash([]);
        }

        // Dibujos libres (guardados)
        if (f.drawings) {
            f.drawings.forEach(d => {
                if (d.points.length < 2) return;
                targetCtx.strokeStyle = d.color || "white";
                targetCtx.lineWidth = 3;
                targetCtx.lineCap = "round";
                targetCtx.lineJoin = "round";
                targetCtx.beginPath();
                targetCtx.moveTo(d.points[0].x, d.points[0].y);
                for (let i = 1; i < d.points.length; i++) {
                    targetCtx.lineTo(d.points[i].x, d.points[i].y);
                }
                targetCtx.stroke();
            });
        }

        // Dibujo libre (en progreso)
        if (state.currentPath && state.currentPath.length > 0) {
            targetCtx.strokeStyle = "white"; // Preview color
            targetCtx.lineWidth = 3;
            targetCtx.lineCap = "round";
            targetCtx.lineJoin = "round";
            targetCtx.beginPath();
            targetCtx.moveTo(state.currentPath[0].x, state.currentPath[0].y);
            for (let i = 1; i < state.currentPath.length; i++) {
                targetCtx.lineTo(state.currentPath[i].x, state.currentPath[i].y);
            }
            targetCtx.stroke();
        }
    },

    // === Animation Interpolation ===
    drawInterpolatedFrame(a, b, t, targetCtx = ctx, width, height, pitchImage = null) {
        // En frames interpolados también usamos la optimización del drawPitch
        // 1. Fondo
        const w = width || targetCtx.canvas.width;
        const h = height || targetCtx.canvas.height;
        if (pitchImage) {
            // "pitchImage" is a pre-rendered opaque background (usually 4K/scaled).
            // It includes the field, static elements, and potential black bars.
            // We must draw it in SCREEN SPACE (Identity transform) to avoid applying the context's scale twice.
            targetCtx.save();
            targetCtx.setTransform(1, 0, 0, 1, 0, 0);
            targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);
            targetCtx.drawImage(pitchImage, 0, 0);
            targetCtx.restore();
        } else {
            targetCtx.clearRect(0, 0, w, h);
            this.drawPitch(targetCtx, width, height);
        }

        // 2. Elementos estáticos intermedios (zonas)
        this.drawZones(targetCtx);

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

            // Usar radiis
            let radius = (state.fieldConfig.type === "full" && state.fieldConfig.orientation === "horizontal")
                ? p1.radius * 1.2
                : p1.radius;
            radius *= SETTINGS.PLAYER_SCALE;

            targetCtx.beginPath();
            targetCtx.arc(x, y, radius, 0, Math.PI * 2);
            targetCtx.fillStyle = p1.team === "A" ? SETTINGS.TEAM_A_COLOR : SETTINGS.TEAM_B_COLOR;
            targetCtx.fill();

            if (SETTINGS.SHOW_NUMBERS) {
                targetCtx.fillStyle = "white";
                targetCtx.font = "bold 14px Arial";
                targetCtx.textAlign = "center";
                targetCtx.textBaseline = "middle";
                targetCtx.fillText(p1.number, x, y);
            }
        }

        b.arrows.forEach(a => {
            if (a.type === "kick") this.drawKickArrow(a, targetCtx);
            else this.drawNormalArrow(a, targetCtx);
        });
        this.drawTexts(b, targetCtx);

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

        this.drawRugbyBall({ x: bx, y: by, rx: bl1.rx, ry: bl1.ry, visible: true }, targetCtx);
    }
};
