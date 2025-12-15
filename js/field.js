/**
 * Lógica del Campo de Rugby
 * PizarraRugby v2.0.0
 *
 * Gestiona el dibujo del campo de rugby en sus diferentes configuraciones
 * y el posicionamiento inicial de jugadores
 */

import { CONFIG, COLORS } from './config.js';
import { state } from './state.js';

// Referencia al canvas y contexto (se establecerá externamente)
let canvas = null;
let ctx = null;

/**
 * Establece la referencia al canvas
 */
export function setCanvasReference(canvasElement) {
    canvas = canvasElement;
    ctx = canvasElement.getContext("2d");
}

/**
 * Dibuja el campo de rugby según la configuración actual
 * @param {CanvasRenderingContext2D} context - Contexto del canvas
 * @param {HTMLCanvasElement} canvasElement - Elemento canvas
 */
export function drawPitch(context, canvasElement) {
    ctx = context;
    canvas = canvasElement;

    ctx.save();
    ctx.setLineDash([]);

    const cfg = state.field;
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
        drawHalfField();
    } else if (cfg.orientation === "vertical") {
        drawFullFieldVertical();
    } else {
        drawFullField();
    }

    ctx.restore();
}

/**
 * Dibuja el campo completo en orientación horizontal
 */
function drawFullField() {
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

    const inGoal = fieldWidth * CONFIG.FIELD_LINES.GOAL;
    const xTryLeft = marginX + inGoal;
    const xTryRight = marginX + fieldWidth - inGoal;

    // Try zones
    ctx.fillStyle = "#064d24";
    ctx.fillRect(marginX, marginY, inGoal, fieldHeight);
    ctx.fillRect(xTryRight, marginY, inGoal, fieldHeight);

    // Field border
    ctx.strokeStyle = COLORS.FIELD_LINES;
    ctx.lineWidth = 3;
    ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

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
}

/**
 * Dibuja el campo completo en orientación vertical
 */
function drawFullFieldVertical() {
    // For vertical field: try zones at top/bottom, scaled to fit canvas
    const w = canvas.width;
    const h = canvas.height;

    // Use minimal margins for vertical field to maximize height usage
    const verticalMarginY = CONFIG.VERTICAL_MARGIN_Y;
    const verticalMarginX = CONFIG.MIN_MARGIN;

    // Original field dimensions (horizontal reference)
    const originalWidth = 1200 - CONFIG.MARGIN_X * 2;
    const originalHeight = 800 - CONFIG.MARGIN_Y * 2;

    // For vertical: use almost full height
    const fieldHeight = h - verticalMarginY * 2;
    const fieldWidth = fieldHeight * (originalHeight / originalWidth);

    // Center horizontally
    const marginX = (w - fieldWidth) / 2;
    const marginY = verticalMarginY;

    const inGoal = fieldHeight * CONFIG.FIELD_LINES.GOAL;
    const yTryTop = marginY + inGoal;
    const yTryBottom = marginY + fieldHeight - inGoal;

    // Try zones (top and bottom)
    ctx.fillStyle = "#064d24";
    ctx.fillRect(marginX, marginY, fieldWidth, inGoal);
    ctx.fillRect(marginX, yTryBottom, fieldWidth, inGoal);

    // Field border
    ctx.strokeStyle = COLORS.FIELD_LINES;
    ctx.lineWidth = 3;
    ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

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
}

/**
 * Dibuja medio campo
 */
function drawHalfField() {
    const w = canvas.width;
    const h = canvas.height;
    const cfg = state.field;

    const marginX = CONFIG.MARGIN_X;
    const marginY = CONFIG.MARGIN_Y;

    const fieldWidth = w - CONFIG.MARGIN_X * 2;
    const fieldHeight = h - CONFIG.MARGIN_Y * 2;

    // Proporciones reales sobre 50 metros
    const P_5   = 5  / 50;   // 0.10
    const P_22  = 22 / 50;   // 0.44
    const P_40  = 40 / 50;   // 0.80
    const P_MID = 1.0;       // 50 / 50

    // Dibujo de borde completo
    ctx.strokeStyle = COLORS.FIELD_LINES;
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
    drawLine(base + dir * fieldHeight * P_5, [20,14]);

    // 22 m
    drawLine(base + dir * fieldHeight * P_22);

    // 40 m
    drawLine(base + dir * fieldHeight * P_40, [14,10]);

    // Medio campo
    drawLine(
        cfg.halfSide === "top"
            ? marginY + fieldHeight
            : marginY,
        [],
        3
    );

    // Líneas verticales (5 m y touch) - solo en zona jugable, no en ensayo
    ctx.setLineDash([20,14]);
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

/**
 * Calcula la posición inicial de un jugador
 * @param {string} team - "A" o "B"
 * @param {number} playerNumber - Número del jugador (1-15)
 * @param {HTMLCanvasElement} canvasElement - Elemento canvas (opcional, usa el global si no se provee)
 * @returns {{x: number, y: number}} Posición inicial del jugador
 */
export function getPlayerInitialPosition(team, playerNumber, canvasElement = null) {
    const canv = canvasElement || canvas;
    const w = canv.width;
    const h = canv.height;
    const cfg = state.field;

    // ============================
    // CAMPO COMPLETO  HORIZONTAL
    // ============================
    if (cfg.type === "full" && cfg.orientation === "horizontal") {
        // Usar los mismos cálculos que drawFullField()
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
    // CAMPO COMPLETO  VERTICAL
    // ============================
    if (cfg.type === "full" && cfg.orientation === "vertical") {
        // Usar los mismos cálculos que drawFullFieldVertical()
        const verticalMarginY = CONFIG.VERTICAL_MARGIN_Y;
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
        const P5  = 5 / 50;
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
