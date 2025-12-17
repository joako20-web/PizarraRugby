/**
 * ================================================================
 * PIZARRA RUGBY v2.2.0
 * ================================================================
 * Herramienta táctica profesional para diseño y animación de jugadas
 * 
 * @version 2.2.0
 * @license MIT
 * @see README.md
 * ================================================================
 */

// ==============================
// CONFIGURACIÓN GENERAL
// ==============================
const CONFIG = {
    // ============================================
    // JUGADORES
    // ============================================
    NUM_PLAYERS: 15,
    PLAYER_RADIUS: 20,
    PLAYER_SPACING: 50,

    // ============================================
    // ANIMACIÓN
    // ============================================
    INTERP_DURATION: 1600,      // Duración de transición entre frames (ms)
    INTERP_STEPS: 24,            // Pasos de interpolación

    // ============================================
    // CAMPO Y MÁRGENES
    // ============================================
    MARGIN_X: 60,                // Margen horizontal
    MARGIN_Y: 50,                // Margen vertical
    VERTICAL_MARGIN_Y: 10,       // Margen adicional para campo vertical
    MIN_MARGIN: 20,              // Margen mínimo

    // ============================================
    // BALÓN
    // ============================================
    BALL_RX: 24,                 // Radio X del balón (elipse)
    BALL_RY: 16,                 // Radio Y del balón (elipse)

    // ============================================
    // ESCUDOS DE ENTRENAMIENTO
    // ============================================
    SHIELD_WIDTH: 16,
    SHIELD_HEIGHT: 24,
    SHIELD_DISTANCE: 8,          // Distancia del escudo al jugador

    // ============================================
    // FLECHAS
    // ============================================
    ARROW_HEAD_SIZE: 14,
    KICK_ARC_HEIGHT: 60,

    // ============================================
    // MELÉ (Scrum)
    // ============================================
    SCRUM: {
        SPACING: 50,             // Espaciado entre filas (campo completo)
        ROW_OFFSET: 42,          // Offset horizontal de filas
        PACK_OFFSET: 45,         // Offset del pack
        SPACING_HALF: 25,        // Espaciado para medio campo
        ROW_OFFSET_HALF: 28,     // Offset de filas (medio campo)
        PACK_OFFSET_HALF: 30     // Offset del pack (medio campo)
    },

    // ============================================
    // LÍNEAS DEL CAMPO (Proporciones 0-1)
    // ============================================
    FIELD_LINES: {
        FIVE_METER: 0.05,
        TWENTY_TWO: 0.22,
        MIDFIELD: 0.50,
        TEN_METER_LEFT: 0.40,
        TEN_METER_RIGHT: 0.60,
        TWENTY_TWO_RIGHT: 0.78,
        FIVE_METER_RIGHT: 0.95
    },

    // ============================================
    // TEXTO Y FUENTES
    // ============================================
    FONT_TEXT: "36px Arial",
    FONT_ZONE_LABEL: "14px Arial",

    // ============================================
    // UI Y TIEMPOS (ms)
    // ============================================
    UI_TIMING: {
        NOTIFICATION_SHOW_DELAY: 10,
        NOTIFICATION_HIDE_DELAY: 300,
        RESIZE_DEBOUNCE: 100,
        EXPORT_PAUSE_DURATION: 1500
    },

    // ============================================
    // RESPONSIVE
    // ============================================
    BREAKPOINT: {
        MOBILE: 1024
    },

    // ============================================
    // CANVAS Y DIBUJO
    // ============================================
    SELECTION_BOX_DASH: [6, 4],
    HIT_THRESHOLD: 15,
    ARROW_SAMPLE_STEP: 0.1,

    // ============================================
    // POSICIONAMIENTO DE EQUIPOS
    // ============================================
    PANEL_Y_TOP: 45,
    TEAM_A_POSITION: 0.15,
    TEAM_B_POSITION: 0.85,

    // Selection color
    SELECTION_COLOR: "#00ff88"
};

// ==============================
// ESTADO DE LA APLICACIÓN
// ==============================
const state = {
    // Modo actual
    mode: "move",

    // Frames y animación
    frames: [],
    currentFrameIndex: 0,
    isPlaying: false,
    cancelPlay: false,

    // Drag & selección
    dragTarget: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    selectedPlayers: new Set(),
    selectingBox: false,
    selectBoxStart: null,
    selectBoxEnd: null,

    // Flechas
    arrowStart: null,
    previewArrow: null,
    kickArcHeight: CONFIG.KICK_ARC_HEIGHT,

    // Zonas
    zones: [],
    zoneStart: null,
    zoneEnd: null,
    pendingZone: null,
    selectedZoneColor: null,
    selectedZone: null,
    draggingZone: false,
    zoneDragOffset: { x: 0, y: 0 },

    // Escudos
    draggingShield: null,
    selectedShield: null,

    // Textos y flechas
    selectedText: null,
    selectedArrow: null,

    // Field configuration
    fieldConfig: {
        type: "full",        // "full" or "half"
        orientation: "horizontal",  // "horizontal" or "vertical"
        halfSide: "top"      // "top" or "bottom" (only for type="half")
    }
};

// Canvas
const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

// ==============================
// UTILIDADES BÁSICAS
// ==============================
const Utils = {
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
// SISTEMA DE NOTIFICACIONES
// ==============================
const Notificacion = {
    show(mensaje, duracion = 3000) {
        const notif = document.getElementById("notification");
        notif.textContent = mensaje;
        notif.classList.remove("hidden");

        // Esperar un frame para que se aplique el display antes de animar
        setTimeout(() => {
            notif.classList.add("show");
        }, CONFIG.UI_TIMING.NOTIFICATION_SHOW_DELAY);

        // Ocultar después de la duración especificada
        setTimeout(() => {
            notif.classList.remove("show");
            setTimeout(() => {
                notif.classList.add("hidden");
            }, CONFIG.UI_TIMING.NOTIFICATION_HIDE_DELAY);
        }, duracion);
    }
};

// ==============================
// SISTEMA DE POPUPS
// ==============================
const Popup = {
    show({ title = "Mensaje", html = "", showCancel = true, okText = "OK", cancelText = "Cancelar" }) {
        return new Promise(resolve => {
            const overlay = document.getElementById("popup-overlay");
            const modalTitle = document.getElementById("popup-title");
            const content = document.getElementById("popup-content");
            const btnCancel = document.getElementById("popup-cancel");
            const btnOk = document.getElementById("popup-ok");
            const buttonsBox = document.getElementById("popup-buttons");

            modalTitle.textContent = title;
            content.innerHTML = html;

            // Resetear el texto de los botones a los valores por defecto o personalizados
            btnOk.textContent = okText;
            btnCancel.textContent = cancelText;

            if (showCancel) {
                btnCancel.style.display = "block";
                buttonsBox.style.justifyContent = "space-between";
            } else {
                btnCancel.style.display = "none";
                buttonsBox.style.justifyContent = "center";
            }

            overlay.classList.remove("hidden");

            btnOk.onclick = () => {
                overlay.classList.add("hidden");
                resolve(true);
            };

            btnCancel.onclick = () => {
                overlay.classList.add("hidden");
                resolve(false);
            };

            overlay.onclick = (e) => {
                const popup = document.getElementById("popup-modal");
                if (!popup.contains(e.target)) {
                    overlay.classList.add("hidden");
                    resolve(showCancel ? false : true);
                }
            };
        });
    },

    async prompt(title, placeholder = "") {
        const ok = await this.show({
            title,
            html: `<input id="popup-input" type="text" placeholder="${placeholder}">`
        });

        if (!ok) return null;
        const val = document.getElementById("popup-input").value.trim();
        return val === "" ? null : val;
    },

    async selectScrumTeam() {
        return new Promise(resolve => {
            this.show({
                title: "Equipo para la melé",
                html: `
                    <button class="choice" data-v="A">Equipo A</button>
                    <button class="choice" data-v="B">Equipo B</button>
                    <button class="choice" data-v="AB">Ambos (AB)</button>
                `,
                showCancel: true
            }).then(ok => {
                if (!ok) return resolve(null);
            });

            document.querySelectorAll("#popup-content .choice").forEach(btn => {
                btn.onclick = () => {
                    document.getElementById("popup-overlay").classList.add("hidden");
                    resolve(btn.dataset.v);
                };
            });
        });
    }
};

// ==============================
// FRAMES Y JUGADORES
// ==============================
const Frame = {
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
            trailLines: f.trailLines.map(t => ({ ...t })),
            trainingShields: (f.trainingShields || []).map(s => ({ ...s }))
        };
    }
};

// ==============================
// UTILIDADES DE UI
// ==============================
const UI = {
    updateDeleteButton() {
        const deleteBtn = document.getElementById("delete-btn");
        const hasSelection = state.selectedShield || state.selectedZone || state.selectedText || state.selectedArrow;

        if (hasSelection) {
            deleteBtn.classList.remove("hidden");
        } else {
            deleteBtn.classList.add("hidden");
        }
    }
};

// ==============================
// HELPER FUNCTIONS
// ==============================

// Función para limitar coordenadas Y en modo mitad de campo
function clampYToPlayableArea(y) {
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

function resetBoardForFieldChange() {
    // Vaciar frames
    state.frames = [];
    state.currentFrameIndex = 0;

    // Crear frame limpio
    const f = Frame.create();

    // Reset balón
    f.ball.visible = true;
    f.ball.x = canvas.width / 2;

    if (state.fieldConfig.type === "half") {
        // Balón en medio campo REAL
        f.ball.y = state.fieldConfig.halfSide === "top"
            ? CONFIG.MARGIN_Y + (canvas.height - CONFIG.MARGIN_Y * 2)
            : CONFIG.MARGIN_Y;
    } else {
        // Campo completo
        f.ball.y = canvas.height / 2;
    }

    state.frames.push(f);

    // Limpiar selecciones
    state.selectedPlayers.clear();
    state.selectedZone = null;
    state.selectedText = null;
    state.selectedArrow = null;
    state.selectedShield = null;

    // Sincronizar UI
    if (typeof Players !== "undefined") {
        Players.syncToggles();
    }

    if (typeof Animation !== "undefined") {
        Animation.updateUI();
    }

    Renderer.drawFrame();
}

function clearAllSelections() {
    state.selectedPlayers.clear();
    state.selectedShield = null;
    state.selectedZone = null;
    state.selectedText = null;
    state.selectedArrow = null;
    UI.updateDeleteButton();
}

function deleteSelectedElement() {
    const f = Utils.getCurrentFrame();
    let deleted = false;

    if (state.selectedShield) {
        f.trainingShields = f.trainingShields.filter(s => s !== state.selectedShield);
        state.selectedShield = null;
        deleted = true;
    }
    if (state.selectedZone) {
        state.zones = state.zones.filter(z => z !== state.selectedZone);
        state.selectedZone = null;
        deleted = true;
    }
    if (state.selectedText) {
        f.texts = f.texts.filter(t => t !== state.selectedText);
        state.selectedText = null;
        deleted = true;
    }
    if (state.selectedArrow) {
        f.arrows = f.arrows.filter(a => a !== state.selectedArrow);
        state.selectedArrow = null;
        deleted = true;
    }

    if (deleted) {
        UI.updateDeleteButton();
        Renderer.drawFrame();
    }
}

function getPlayerInitialPosition(team, playerNumber) {
    const w = canvas.width;
    const h = canvas.height;
    const cfg = state.fieldConfig;

    // ============================
    // CAMPO COMPLETO – HORIZONTAL
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
    // CAMPO COMPLETO – VERTICAL
    // ============================
    if (cfg.type === "full" && cfg.orientation === "vertical") {
        // Usar los mismos cálculos que drawFullFieldVertical()
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




// ==============================
// RENDERIZADO - Sistema de renderizado del canvas
// ==============================
const Renderer = {
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
            ctx.strokeStyle = tl.team === "A" ? "#7fb9ff" : "#ff7a7a";
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

            // Usar fichas más grandes en campo completo horizontal
            const radius = (state.fieldConfig.type === "full" && state.fieldConfig.orientation === "horizontal")
                ? p.radius * 1.2
                : p.radius;

            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = p.team === "A" ? "#1e88ff" : "#ff3333";
            ctx.fill();

            if (state.selectedPlayers.has(p)) {
                ctx.strokeStyle = "white";
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            ctx.fillStyle = "white";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.number, p.x, p.y);
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
            ctx.fillStyle = p1.team === "A" ? "#1e88ff" : "#ff3333";
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

// ==============================
// HIT TESTS
// ==============================
const HitTest = {
    findPlayerAt(pos) {
        const f = Utils.getCurrentFrame();
        for (let p of f.players) {
            if (!p.visible) continue;
            // Usar el mismo radio aumentado que en el dibujo
            const radius = (state.fieldConfig.type === "full" && state.fieldConfig.orientation === "horizontal")
                ? p.radius * 1.5
                : p.radius;
            if (Math.hypot(pos.x - p.x, pos.y - p.y) < radius) {
                return p;
            }
        }
        return null;
    },

    ballHitTest(pos) {
        const b = Utils.getCurrentFrame().ball;
        if (!b.visible) return false;

        const dx = pos.x - b.x;
        const dy = pos.y - b.y;
        const r = Math.max(b.rx, b.ry);
        return dx * dx + dy * dy <= r * r;
    },

    zoneHitTest(x, y) {
        for (let i = state.zones.length - 1; i >= 0; i--) {
            const z = state.zones[i];
            const { left, top, width, height } = Utils.getZoneBounds(z);
            if (x >= left && x <= left + width && y >= top && y <= top + height) {
                return z;
            }
        }
        return null;
    },

    findTextAt(x, y) {
        const f = Utils.getCurrentFrame();
        ctx.font = CONFIG.FONT_TEXT;

        for (let t of f.texts) {
            const w = ctx.measureText(t.text).width;
            const h = 40;
            const px = 10;
            const py = 10;
            const x1 = t.x - w / 2 - px;
            const y1 = t.y - py;
            const x2 = x1 + w + px * 2;
            const y2 = y1 + h + py * 2;

            if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
                return t;
            }
        }
        return null;
    },

    findShieldAt(x, y) {
        const f = Utils.getCurrentFrame();
        const shieldWidth = CONFIG.SHIELD_WIDTH;
        const shieldHeight = CONFIG.SHIELD_HEIGHT;

        for (let shield of f.trainingShields) {
            // Encontrar el jugador asociado
            const player = Utils.findPlayerByTeamNumber(shield.team, shield.number, f);

            if (!player) continue;

            // Calcular la posición del escudo
            const shieldPos = Utils.getShieldPosition(player, shield);
            const shieldX = shieldPos.x;
            const shieldY = shieldPos.y;

            // Rotar el punto de clic para verificarlo en el espacio local del escudo
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

// ==============================
// MELÉ
// ==============================
const Scrum = {
    async place(x, y) {
        const choice = await Popup.selectScrumTeam();
        if (!choice) return;

        const f = Utils.getCurrentFrame();
        const cfg = state.fieldConfig;

        // Adapt spacing based on configuration
        let spacingY = CONFIG.SCRUM.SPACING;
        let rowX = CONFIG.SCRUM.ROW_OFFSET;
        let pack = CONFIG.SCRUM.PACK_OFFSET;

        // For half field, reduce spacing
        if (cfg.type === "half") {
            spacingY = CONFIG.SCRUM.SPACING_HALF;
            rowX = CONFIG.SCRUM.ROW_OFFSET_HALF;
            pack = CONFIG.SCRUM.PACK_OFFSET_HALF;
        }

        const setPlayer = (team, num, px, py) => {
            const p = f.players.find(a => a.team === team && a.number === num);
            if (!p) return;
            p.visible = true;
            p.x = px;
            p.y = py;
        };

        // Apply formation based on orientation
        if (cfg.type === "full" && cfg.orientation === "horizontal") {
            // Horizontal field
            this.placeHorizontalScrum(x, y, choice, setPlayer, spacingY, rowX, pack);
        } else {
            // Vertical field (full vertical or half field which is always vertical)
            this.placeVerticalScrum(x, y, choice, setPlayer, spacingY, rowX, pack);
        }

        Players.syncToggles();
        Renderer.drawFrame();
        Mode.set("move");
    },

    placeHorizontalScrum(x, y, choice, setPlayer, spacingY, rowX, pack) {
        if (choice === "A" || choice === "AB") {
            const bx = x - pack;
            const cy = y;
            setPlayer("A", 1, bx, cy - spacingY);
            setPlayer("A", 2, bx, cy);
            setPlayer("A", 3, bx, cy + spacingY);
            setPlayer("A", 6, bx - rowX, cy - spacingY * 1.5);
            setPlayer("A", 4, bx - rowX, cy - spacingY * 0.5);
            setPlayer("A", 5, bx - rowX, cy + spacingY * 0.5);
            setPlayer("A", 7, bx - rowX, cy + spacingY * 1.5);
            setPlayer("A", 8, bx - rowX * 2, cy);
        }

        if (choice === "B" || choice === "AB") {
            const bx = x + pack;
            const cy = y;
            setPlayer("B", 3, bx, cy - spacingY);
            setPlayer("B", 2, bx, cy);
            setPlayer("B", 1, bx, cy + spacingY);
            setPlayer("B", 7, bx + rowX, cy - spacingY * 1.5);
            setPlayer("B", 5, bx + rowX, cy - spacingY * 0.5);
            setPlayer("B", 4, bx + rowX, cy + spacingY * 0.5);
            setPlayer("B", 6, bx + rowX, cy + spacingY * 1.5);
            setPlayer("B", 8, bx + rowX * 2, cy);
        }
    },

    placeVerticalScrum(x, y, choice, setPlayer, spacingX, rowY, pack) {
        // Rotated 90°: spacing is now horizontal
        if (choice === "A" || choice === "AB") {
            const by = y - pack;
            const cx = x;

            setPlayer("A", 1, cx - spacingX, by);
            setPlayer("A", 2, cx, by);
            setPlayer("A", 3, cx + spacingX, by);
            setPlayer("A", 6, cx - spacingX * 1.5, by - rowY);
            setPlayer("A", 4, cx - spacingX * 0.5, by - rowY);
            setPlayer("A", 5, cx + spacingX * 0.5, by - rowY);
            setPlayer("A", 7, cx + spacingX * 1.5, by - rowY);
            setPlayer("A", 8, cx, by - rowY * 2);
        }

        if (choice === "B" || choice === "AB") {
            const by = y + pack;
            const cx = x;

            setPlayer("B", 3, cx - spacingX, by);
            setPlayer("B", 2, cx, by);
            setPlayer("B", 1, cx + spacingX, by);
            setPlayer("B", 7, cx - spacingX * 1.5, by + rowY);
            setPlayer("B", 5, cx - spacingX * 0.5, by + rowY);
            setPlayer("B", 4, cx + spacingX * 0.5, by + rowY);
            setPlayer("B", 6, cx + spacingX * 1.5, by + rowY);
            setPlayer("B", 8, cx, by + rowY * 2);
        }
    }
};

// ==============================
// GESTIÓN DE JUGADORES
// ==============================
const Players = {
    showTeam(team) {
        const f = Utils.getCurrentFrame();
        const { fieldWidth } = Utils.fieldDims();

        // Verificar si todos los jugadores están visibles
        const allVisible = f.players
            .filter(pl => pl.team === team)
            .every(pl => pl.visible);

        if (allVisible) {
            // Si todos están visibles, ocultarlos
            for (let n = 1; n <= CONFIG.NUM_PLAYERS; n++) {
                const p = f.players.find(pl => pl.team === team && pl.number === n);
                p.visible = false;
            }
        } else {
            // Si no todos están visibles, mostrarlos
            for (let n = 1; n <= CONFIG.NUM_PLAYERS; n++) {
                const p = f.players.find(pl => pl.team === team && pl.number === n);
                const pos = getPlayerInitialPosition(team, n);
                p.visible = true;
                p.x = pos.x;
                p.y = pos.y;
            }
        }

        this.syncToggles();
        this.updateTeamButtons();
        Renderer.drawFrame();
    },

    updateTeamButtons() {
        const f = Utils.getCurrentFrame();

        // Actualizar botón del equipo A
        const allVisibleA = f.players
            .filter(pl => pl.team === "A")
            .every(pl => pl.visible);
        const btnA = document.getElementById("show-team-a");
        btnA.textContent = allVisibleA ? "Ocultar equipo azul" : "Mostrar equipo azul";

        // Actualizar botón del equipo B
        const allVisibleB = f.players
            .filter(pl => pl.team === "B")
            .every(pl => pl.visible);
        const btnB = document.getElementById("show-team-b");
        btnB.textContent = allVisibleB ? "Ocultar equipo rojo" : "Mostrar equipo rojo";
    },

    loadPanels() {
        const blueGrid = document.getElementById("players-blue");
        const redGrid = document.getElementById("players-red");

        for (let i = 1; i <= CONFIG.NUM_PLAYERS; i++) {
            const a = document.createElement("div");
            a.className = "player-toggle";
            a.textContent = i;
            a.dataset.team = "A";
            a.dataset.number = i;
            a.onclick = (e) => this.toggle(e);
            blueGrid.appendChild(a);

            const b = document.createElement("div");
            b.className = "player-toggle red";
            b.textContent = i;
            b.dataset.team = "B";
            b.dataset.number = i;
            b.onclick = (e) => this.toggle(e);
            redGrid.appendChild(b);
        }
    },

    toggle(e) {
        const team = e.target.dataset.team;
        const num = parseInt(e.target.dataset.number);
        this.toggleByTeamNumber(team, num);
    },

    toggleByTeamNumber(team, num) {
        const f = Utils.getCurrentFrame();
        const p = f.players.find(x => x.team === team && x.number === num);
        p.visible = !p.visible;

        if (p.visible && p.x === null) {
            const pos = getPlayerInitialPosition(team, num);
            p.x = pos.x;
            p.y = pos.y;
        }

        const selector = `.player-toggle[data-team="${team}"][data-number="${num}"]`;
        const div = document.querySelector(selector);
        if (div) {
            div.classList.toggle("active", p.visible);
        }

        this.updateTeamButtons();
        Renderer.drawFrame();
    },

    syncToggles() {
        const f = Utils.getCurrentFrame();
        document.querySelectorAll(".player-toggle").forEach(div => {
            const team = div.dataset.team;
            const num = parseInt(div.dataset.number);
            const p = f.players.find(x => x.team === team && x.number === num);
            div.classList.toggle("active", p.visible);
        });
        this.updateTeamButtons();
    }
};

// ==============================
// FORMACIONES
// ==============================
const Formations = {
    STORAGE_KEY: 'rugby-formations',

    getAll() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    },

    async save(name) {
        if (!name || name.trim() === '') {
            await Popup.show({
                title: "Error",
                html: "Por favor, ingresa un nombre para la formación",
                showCancel: false
            });
            return;
        }

        const f = Utils.getCurrentFrame();
        const visiblePlayers = f.players.filter(p => p.visible);

        if (visiblePlayers.length === 0) {
            await Popup.show({
                title: "Error",
                html: "No hay jugadores visibles para guardar",
                showCancel: false
            });
            return;
        }

        // Guardar solo las posiciones de jugadores visibles
        const formation = {
            name: name.trim(),
            date: new Date().toISOString(),
            fieldConfig: { ...state.fieldConfig },
            players: visiblePlayers.map(p => ({
                team: p.team,
                number: p.number,
                x: p.x,
                y: p.y
            }))
        };

        const formations = this.getAll();
        formations[name.trim()] = formation;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(formations));

        this.updateSelector();
        await Popup.show({
            title: "Guardado",
            html: `Formación "<strong>${name}</strong>" guardada correctamente`,
            showCancel: false
        });
    },

    async load(name) {
        const formations = this.getAll();
        const formation = formations[name];

        if (!formation) {
            await Popup.show({
                title: "Error",
                html: "Formación no encontrada",
                showCancel: false
            });
            return;
        }

        const f = Utils.getCurrentFrame();

        // Restaurar configuración del campo si existe
        if (formation.fieldConfig) {
            state.fieldConfig = { ...formation.fieldConfig };

            // Actualizar UI de configuración del campo
            const fullBtn = document.getElementById("field-type-full");
            const halfBtn = document.getElementById("field-type-half");

            if (state.fieldConfig.type === "full") {
                fullBtn.classList.add("active");
                halfBtn.classList.remove("active");
            } else {
                fullBtn.classList.remove("active");
                halfBtn.classList.add("active");
            }

            // Actualizar info de configuración
            const info = document.getElementById("field-config-info");
            const cfg = state.fieldConfig;
            let text = "";

            if (cfg.type === "full") {
                text = cfg.orientation === "horizontal" ? "Campo Completo - Horizontal" : "Campo Completo - Vertical";
            } else {
                text = cfg.halfSide === "top" ? "Mitad de Campo - Superior" : "Mitad de Campo - Inferior";
            }

            info.textContent = text;
        }

        // Ocultar todos los jugadores primero
        f.players.forEach(p => p.visible = false);

        // Cargar las posiciones guardadas
        formation.players.forEach(saved => {
            const player = f.players.find(p => p.team === saved.team && p.number === saved.number);
            if (player) {
                player.x = saved.x;
                player.y = saved.y;
                player.visible = true;
            }
        });

        Players.syncToggles();
        Players.updateTeamButtons();
        Renderer.drawFrame();
        await Popup.show({
            title: "Cargado",
            html: `Formación "<strong>${name}</strong>" cargada correctamente`,
            showCancel: false
        });
    },

    async delete(name) {
        const confirmed = await Popup.show({
            title: "Confirmar eliminación",
            html: `¿Estás seguro de que quieres eliminar la formación "<strong>${name}</strong>"?`,
            showCancel: true,
            okText: "Eliminar",
            cancelText: "Cancelar"
        });

        if (!confirmed) {
            return;
        }

        const formations = this.getAll();
        delete formations[name];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(formations));

        this.updateSelector();
        await Popup.show({
            title: "Eliminado",
            html: `Formación "<strong>${name}</strong>" eliminada correctamente`,
            showCancel: false
        });
    },

    updateSelector() {
        const selector = document.getElementById('formation-selector');
        const formations = this.getAll();
        const names = Object.keys(formations).sort();
        const currentConfig = state.fieldConfig;

        // Limpiar y agregar opciones
        selector.innerHTML = '<option value="">-- Seleccionar formación --</option>';
        names.forEach(name => {
            const formation = formations[name];

            // Filtrar solo formaciones que coincidan con la configuración actual
            if (formation.fieldConfig) {
                const cfg = formation.fieldConfig;
                let matches = false;

                // Verificar si coincide la configuración
                if (currentConfig.type === cfg.type) {
                    if (currentConfig.type === "full") {
                        // Para campo completo, verificar orientación
                        matches = currentConfig.orientation === cfg.orientation;
                    } else {
                        // Para mitad de campo, verificar el lado
                        matches = currentConfig.halfSide === cfg.halfSide;
                    }
                }

                // Solo agregar si coincide
                if (matches) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    selector.appendChild(option);
                }
            }
        });
    }
};

// ==============================
// MODOS
// ==============================
const Mode = {
    set(m) {
        state.mode = m;
        state.arrowStart = null;
        state.previewArrow = null;

        document.querySelectorAll("#sidebar button")
            .forEach(b => b.classList.remove("active"));

        if (m === "move") {
            document.getElementById("mode-move").classList.add("active");
        }
        if (m === "text") {
            document.getElementById("mode-text").classList.add("active");
        }
        if (m === "scrum") {
            document.getElementById("mode-scrum").classList.add("active");
        }
        if (m === "shield") {
            document.getElementById("mode-shield").classList.add("active");
        }

        const zonePanel = document.getElementById("zone-color-panel");
        if (m === "zone") {
            zonePanel.classList.remove("hidden");
        } else {
            zonePanel.classList.add("hidden");
        }

        Renderer.drawFrame();
    }
};

// ==============================
// ANIMACIÓN
// ==============================
const Animation = {
    updateUI() {
        document.getElementById("current-frame-index").textContent = state.currentFrameIndex + 1;
        document.getElementById("total-frames").textContent = state.frames.length;
    },

    async play() {
        if (state.isPlaying || state.frames.length < 2) return;
        state.isPlaying = true;
        state.cancelPlay = false;

        // Guardar y limpiar todas las líneas de trayectoria temporalmente
        const savedTrailLines = state.frames.map(f => f.trailLines);
        state.frames.forEach(f => f.trailLines = []);

        for (let i = 0; i < state.frames.length - 1; i++) {
            if (state.cancelPlay) break;

            await this._interpolateBetweenFrames(state.frames[i], state.frames[i + 1]);

            state.currentFrameIndex = i + 1;
            this.updateUI();
        }

        // Restaurar las líneas de trayectoria
        state.frames.forEach((f, i) => f.trailLines = savedTrailLines[i]);
        Renderer.drawFrame();
        state.isPlaying = false;
        state.cancelPlay = false;
    },

    stop() {
        state.cancelPlay = true;
    },

    /**
     * Interpola y dibuja los frames entre dos frames dados
     * @param {Object} frameA - Frame inicial
     * @param {Object} frameB - Frame final
     * @returns {Promise<void>}
     * @private
     */
    async _interpolateBetweenFrames(frameA, frameB) {
        for (let step = 0; step <= CONFIG.INTERP_STEPS; step++) {
            if (state.cancelPlay) break;

            const t = step / CONFIG.INTERP_STEPS;
            Renderer.drawInterpolatedFrame(frameA, frameB, t);

            await new Promise(resolve =>
                setTimeout(resolve, CONFIG.INTERP_DURATION / CONFIG.INTERP_STEPS)
            );
        }
    },

    async exportWebM() {
        if (state.frames.length < 2) {
            Notificacion.show("No puedes exportar un video con un solo frame. Añade más frames para crear una animación.");
            return;
        }

        // Pedir nombre
        const nombre = await Popup.prompt("Nombre del archivo:", "Mi animacion");
        if (!nombre) return;

        const fileName = nombre + ".mp4";

        const stream = canvas.captureStream(30);
        const chunks = [];

        // Intentar usar formato MP4 compatible, con fallback a WebM
        let mimeType = "video/webm;codecs=vp9";
        let videoType = "video/webm";

        if (MediaRecorder.isTypeSupported("video/mp4")) {
            mimeType = "video/mp4";
            videoType = "video/mp4";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
            mimeType = "video/webm;codecs=h264";
            videoType = "video/mp4";
        }

        const rec = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 8000000
        });

        rec.ondataavailable = e => chunks.push(e.data);
        rec.onstop = () => {
            const blob = new Blob(chunks, { type: videoType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        };

        // Guardar y limpiar todas las líneas de trayectoria temporalmente
        const savedTrailLines = state.frames.map(f => f.trailLines);
        state.frames.forEach(f => f.trailLines = []);

        rec.start();

        // Pausa inicial de 1.5 segundos - comenzar desde el primer frame
        state.currentFrameIndex = 0;
        this.updateUI();
        Renderer.drawFrame();
        await new Promise(r => setTimeout(r, 1500));

        // Animación
        for (let i = 0; i < state.frames.length - 1; i++) {
            await this._interpolateBetweenFrames(state.frames[i], state.frames[i + 1]);
        }

        // Pausa final de 1.5 segundos
        state.currentFrameIndex = state.frames.length - 1;
        this.updateUI();
        Renderer.drawFrame();
        await new Promise(r => setTimeout(r, 1500));

        rec.stop();

        // Restaurar las líneas de trayectoria
        state.frames.forEach((f, i) => f.trailLines = savedTrailLines[i]);
        Renderer.drawFrame();
    }

};

// ==============================
// EVENTOS DEL CANVAS
// ==============================
const CanvasEvents = {
    /**
     * Maneja el evento de clic del mouse/touch en el canvas
     * Delega a diferentes handlers según el modo activo
     * @param {Event} e - Evento del mouse/touch
     */
    async handleMouseDown(e) {
        const pos = Utils.canvasPos(e);
        const f = Utils.getCurrentFrame();

        // Candado de zona
        if (state.selectedZone && state.selectedZone.lockIcon) {
            const L = state.selectedZone.lockIcon;
            if (pos.x >= L.x && pos.x <= L.x + L.size && pos.y >= L.y && pos.y <= L.y + L.size) {
                state.selectedZone.locked = !state.selectedZone.locked;
                Renderer.drawFrame();
                return;
            }
        }

        // Modo zona
        if (state.mode === "zone") {
            if (!state.selectedZoneColor) {
                await Popup.show({
                    title: "Color no seleccionado",
                    html: `<p>Debes elegir un color para crear una zona.</p>`,
                    showCancel: false
                });
                return;
            }

            if (!state.zoneStart) {
                state.zoneStart = pos;
                return;
            }

            if (!state.zoneEnd) {
                state.zoneEnd = pos;

                const name = await Popup.prompt("Nombre de la zona:");
                if (!name || name.trim() === "") {
                    state.zoneStart = null;
                    state.zoneEnd = null;
                    return;
                }

                const x1 = Math.min(state.zoneStart.x, pos.x);
                const y1 = Math.min(state.zoneStart.y, pos.y);
                const x2 = Math.max(state.zoneStart.x, pos.x);
                const y2 = Math.max(state.zoneStart.y, pos.y);

                state.pendingZone = {
                    x1, y1, x2, y2,
                    name,
                    color: state.selectedZoneColor,
                    labelOffsetX: undefined,
                    labelOffsetY: undefined,
                    locked: false
                };

                Renderer.drawFrame();
                return;
            }

            if (state.pendingZone) {
                const { left, top, width, height } = Utils.getZoneBounds(state.pendingZone);

                state.pendingZone.labelOffsetX = (pos.x - left) / width;
                state.pendingZone.labelOffsetY = (pos.y - top) / height;

                state.zones.push(state.pendingZone);
                state.pendingZone = null;
                state.zoneStart = null;
                state.zoneEnd = null;

                Mode.set("move");
                Renderer.drawFrame();
                return;
            }
        }

        // Modo escudo de entrenamiento
        if (state.mode === "shield") {
            const p = HitTest.findPlayerAt(pos);
            if (p) {
                // Calcular el ángulo desde el centro del jugador hasta el punto de clic
                const dx = pos.x - p.x;
                const dy = pos.y - p.y;
                const angle = Math.atan2(dy, dx);

                // Buscar si el jugador ya tiene un escudo
                const existingShield = f.trainingShields.find(s =>
                    s.team === p.team && s.number === p.number
                );

                if (existingShield) {
                    // Actualizar el ángulo del escudo existente y empezar a arrastrarlo
                    existingShield.angle = angle;
                    state.draggingShield = existingShield;
                } else {
                    // Crear nuevo escudo y empezar a arrastrarlo
                    const newShield = {
                        team: p.team,
                        number: p.number,
                        angle: angle
                    };
                    f.trainingShields.push(newShield);
                    state.draggingShield = newShield;
                }

                Renderer.drawFrame();
                return;
            }
        }

        // Modo move
        if (state.mode === "move") {
            // Primero verificar si se hizo clic en un escudo
            const shield = HitTest.findShieldAt(pos.x, pos.y);
            if (shield) {
                state.draggingShield = shield;
                state.selectedShield = shield;
                state.selectedZone = null;
                state.selectedText = null;
                state.selectedArrow = null;
                state.selectedPlayers.clear();
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            // Verificar si se hizo clic en una flecha
            const arrow = HitTest.findArrowAt(pos.x, pos.y);
            if (arrow) {
                state.selectedArrow = arrow;
                state.selectedShield = null;
                state.selectedZone = null;
                state.selectedText = null;
                state.selectedPlayers.clear();
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            const z = HitTest.zoneHitTest(pos.x, pos.y);

            if (z) {
                state.selectedZone = z;
                state.selectedShield = null;
                state.selectedText = null;
                state.selectedArrow = null;
                state.selectedPlayers.clear();

                if (!z.locked) {
                    state.draggingZone = true;
                    const left = Math.min(z.x1, z.x2);
                    const top = Math.min(z.y1, z.y2);
                    state.zoneDragOffset.x = pos.x - left;
                    state.zoneDragOffset.y = pos.y - top;
                }

                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            const t = HitTest.findTextAt(pos.x, pos.y);
            if (t) {
                state.selectedText = t;
                state.selectedShield = null;
                state.selectedZone = null;
                state.selectedArrow = null;
                state.selectedPlayers.clear();
                state.dragTarget = { type: "text", obj: t };
                state.dragOffsetX = pos.x - t.x;
                state.dragOffsetY = pos.y - t.y;
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            const p = HitTest.findPlayerAt(pos);
            if (p) {
                if (e.ctrlKey) {
                    if (!state.selectedPlayers.has(p)) {
                        state.selectedPlayers.add(p);
                    }
                } else {
                    if (!state.selectedPlayers.has(p) || state.selectedPlayers.size > 1) {
                        state.selectedPlayers.clear();
                        state.selectedPlayers.add(p);
                    }
                }

                state.dragTarget = {
                    type: "players",
                    players: Array.from(state.selectedPlayers),
                    startPositions: Array.from(state.selectedPlayers).map(a => ({ x: a.x, y: a.y })),
                    startMouse: pos
                };
                Renderer.drawFrame();
                return;
            }

            if (HitTest.ballHitTest(pos)) {
                state.dragTarget = { type: "ball", obj: f.ball };
                state.dragOffsetX = pos.x - f.ball.x;
                state.dragOffsetY = pos.y - f.ball.y;
                return;
            }

            if (!e.ctrlKey) {
                clearAllSelections();
            } else {
                state.selectedShield = null;
                state.selectedZone = null;
                state.selectedText = null;
                state.selectedArrow = null;
                UI.updateDeleteButton();
            }
            state.selectingBox = true;
            state.selectBoxStart = pos;
            state.selectBoxEnd = pos;
            Renderer.drawFrame();
            return;
        }

        // Modo flechas
        if (state.mode === "draw" || state.mode === "kick") {
            if (!state.arrowStart) {
                // Limitar el punto de inicio para que no esté en zona de ensayo
                state.arrowStart = {
                    x: pos.x,
                    y: clampYToPlayableArea(pos.y)
                };
            } else {
                // Limitar ambos puntos para que no estén en zona de ensayo
                f.arrows.push({
                    x1: state.arrowStart.x,
                    y1: clampYToPlayableArea(state.arrowStart.y),
                    x2: pos.x,
                    y2: clampYToPlayableArea(pos.y),
                    type: state.mode === "kick" ? "kick" : "normal"
                });
                state.arrowStart = null;
                state.previewArrow = null;
                Mode.set("move");
                Renderer.drawFrame();
            }
            return;
        }

        // Modo texto
        if (state.mode === "text") {
            const tx = await Popup.prompt("Escribe el texto:");
            if (tx && tx.trim() !== "") {
                f.texts.push({ x: pos.x, y: pos.y, text: tx.trim() });
            }
            Mode.set("move");
            Renderer.drawFrame();
            return;
        }

        // Modo melé
        if (state.mode === "scrum") {
            Scrum.place(pos.x, pos.y);
            return;
        }
    },

    handleMouseMove(e) {
        const pos = Utils.canvasPos(e);

        // Si estamos arrastrando un escudo, actualizar su ángulo
        if (state.draggingShield) {
            const player = Utils.findPlayerByTeamNumber(state.draggingShield.team, state.draggingShield.number);

            if (player) {
                const dx = pos.x - player.x;
                const dy = pos.y - player.y;
                state.draggingShield.angle = Math.atan2(dy, dx);
                Renderer.drawFrame();
            }
            return;
        }

        if (state.draggingZone && state.selectedZone && !state.selectedZone.locked) {
            const { width, height } = Utils.getZoneBounds(state.selectedZone);

            const newLeft = pos.x - state.zoneDragOffset.x;
            const newTop = pos.y - state.zoneDragOffset.y;

            state.selectedZone.x1 = newLeft;
            state.selectedZone.y1 = newTop;
            state.selectedZone.x2 = newLeft + width;
            state.selectedZone.y2 = newTop + height;

            Renderer.drawFrame();
            return;
        }

        if ((state.mode === "draw" || state.mode === "kick") && state.arrowStart) {
            if (e.shiftKey && state.mode === "kick") {
                state.kickArcHeight += (state.arrowStart.y - pos.y) * 0.1;
                state.kickArcHeight = Math.max(10, Math.min(200, state.kickArcHeight));
            }

            state.previewArrow = {
                x1: state.arrowStart.x,
                y1: clampYToPlayableArea(state.arrowStart.y),
                x2: pos.x,
                y2: clampYToPlayableArea(pos.y),
                type: state.mode === "kick" ? "kick" : "normal"
            };

            Renderer.drawFrame();
            return;
        }

        if (state.dragTarget && state.mode === "move") {
            if (state.dragTarget.type === "text") {
                state.dragTarget.obj.x = pos.x - state.dragOffsetX;
                state.dragTarget.obj.y = pos.y - state.dragOffsetY;
            } else if (state.dragTarget.type === "ball") {
                state.dragTarget.obj.x = pos.x - state.dragOffsetX;
                state.dragTarget.obj.y = pos.y - state.dragOffsetY;
            } else if (state.dragTarget.type === "players") {
                const dx = pos.x - state.dragTarget.startMouse.x;
                const dy = pos.y - state.dragTarget.startMouse.y;
                state.dragTarget.players.forEach((pl, i) => {
                    pl.x = state.dragTarget.startPositions[i].x + dx;
                    pl.y = state.dragTarget.startPositions[i].y + dy;
                });
            }
            Renderer.drawFrame();
            return;
        }

        if (state.selectingBox && state.mode === "move") {
            state.selectBoxEnd = pos;
            state.selectedPlayers.clear();

            const x1 = Math.min(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y1 = Math.min(state.selectBoxStart.y, state.selectBoxEnd.y);
            const x2 = Math.max(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y2 = Math.max(state.selectBoxStart.y, state.selectBoxEnd.y);

            Utils.getCurrentFrame().players.forEach(p => {
                if (!p.visible) return;
                if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) {
                    state.selectedPlayers.add(p);
                }
            });

            Renderer.drawFrame();
        }
    },

    handleMouseUp() {
        state.draggingZone = false;

        // Si estábamos arrastrando un escudo en modo shield, volver a modo move
        if (state.draggingShield && state.mode === "shield") {
            state.draggingShield = null;
            Mode.set("move");
            Renderer.drawFrame();
            return;
        }

        state.draggingShield = null;

        if (state.dragTarget && state.dragTarget.type === "players") {
            const f = Utils.getCurrentFrame();
            state.dragTarget.players.forEach((pl, i) => {
                const st = state.dragTarget.startPositions[i];
                f.trailLines.push({
                    x1: st.x,
                    y1: st.y,
                    x2: pl.x,
                    y2: pl.y,
                    team: pl.team
                });
            });
        }

        state.dragTarget = null;

        if (state.selectingBox) {
            state.selectingBox = false;
            state.selectBoxStart = null;
            state.selectBoxEnd = null;
            Renderer.drawFrame();
        }
    },

    async handleDoubleClick(e) {
        const pos = Utils.canvasPos(e);
        const f = Utils.getCurrentFrame();

        // Verificar si se hizo doble clic en un texto
        const t = HitTest.findTextAt(pos.x, pos.y);
        if (!t) return;

        const tx = await Popup.prompt("Editar texto:", t.text);
        if (tx === null) return;

        if (tx.trim() === "") {
            f.texts = f.texts.filter(x => x !== t);
        } else {
            t.text = tx.trim();
        }
        Renderer.drawFrame();
    }
};

// ==============================
// INICIALIZACIÓN DE EVENTOS
// ==============================
function initEvents() {
    // Eventos de mouse
    canvas.addEventListener("mousedown", e => CanvasEvents.handleMouseDown(e));
    canvas.addEventListener("mousemove", e => CanvasEvents.handleMouseMove(e));
    canvas.addEventListener("mouseup", () => CanvasEvents.handleMouseUp());
    canvas.addEventListener("dblclick", e => CanvasEvents.handleDoubleClick(e));

    // Eventos touch para móviles
    canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        CanvasEvents.handleMouseDown(e);
    }, { passive: false });

    canvas.addEventListener("touchmove", e => {
        e.preventDefault();
        CanvasEvents.handleMouseMove(e);
    }, { passive: false });

    canvas.addEventListener("touchend", e => {
        e.preventDefault();
        CanvasEvents.handleMouseUp();
    }, { passive: false });

    canvas.addEventListener("touchcancel", e => {
        e.preventDefault();
        CanvasEvents.handleMouseUp();
    }, { passive: false });

    window.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            clearAllSelections();
            Renderer.drawFrame();
        }

        if (e.key === "Delete" || e.key === "Supr") {
            deleteSelectedElement();
        }
    });

    // Botón de borrar
    document.getElementById("delete-btn").onclick = deleteSelectedElement;

    // Frames
    document.getElementById("add-frame").onclick = () => {
        const nf = Frame.clone(Utils.getCurrentFrame());
        state.frames.splice(state.currentFrameIndex + 1, 0, nf);
        state.currentFrameIndex++;
        Utils.getCurrentFrame().trailLines = [];
        Animation.updateUI();
        Renderer.drawFrame();
    };

    document.getElementById("delete-frame").onclick = () => {
        if (state.frames.length > 1) {
            state.frames.splice(state.currentFrameIndex, 1);
            state.currentFrameIndex = Math.max(0, state.currentFrameIndex - 1);
            Utils.getCurrentFrame().trailLines = [];
            Animation.updateUI();
            Renderer.drawFrame();
            Players.syncToggles();
        }
    };

    document.getElementById("next-frame").onclick = () => {
        if (state.currentFrameIndex < state.frames.length - 1) {
            state.currentFrameIndex++;
            Utils.getCurrentFrame().trailLines = [];
            Animation.updateUI();
            Renderer.drawFrame();
            Players.syncToggles();
        }
    };

    document.getElementById("prev-frame").onclick = () => {
        if (state.currentFrameIndex > 0) {
            state.currentFrameIndex--;
            Utils.getCurrentFrame().trailLines = [];
            Animation.updateUI();
            Renderer.drawFrame();
            Players.syncToggles();
        }
    };

    // Animación
    document.getElementById("play-animation").onclick = () => Animation.play();
    document.getElementById("stop-animation").onclick = () => Animation.stop();
    document.getElementById("export-webm").onclick = () => Animation.exportWebM();

    // Field Configuration Helper Functions
    function updateFieldTypeButtons() {
        const fullBtn = document.getElementById("field-type-full");
        const halfBtn = document.getElementById("field-type-half");

        if (state.fieldConfig.type === "full") {
            fullBtn.classList.add("active");
            halfBtn.classList.remove("active");
        } else {
            fullBtn.classList.remove("active");
            halfBtn.classList.add("active");
        }
    }

    function updateFieldConfigInfo() {
        const info = document.getElementById("field-config-info");
        const cfg = state.fieldConfig;

        let text = "";

        if (cfg.type === "full") {
            text = cfg.orientation === "horizontal" ? "Campo Completo - Horizontal" : "Campo Completo - Vertical";
        } else {
            text = cfg.halfSide === "top" ? "Mitad Campo - Ensayo Superior" : "Mitad Campo - Ensayo Inferior";
        }

        info.textContent = text;
    }

    // Field Configuration
    document.getElementById("field-type-full").onclick = () => {
        state.fieldConfig.type = "full";
        state.fieldConfig.orientation = "horizontal";  // Reset to horizontal
        resetBoardForFieldChange();
        updateFieldTypeButtons();
        updateFieldConfigInfo();
        Formations.updateSelector();
        Renderer.drawFrame();
    };

    document.getElementById("field-type-half").onclick = () => {
        state.fieldConfig.type = "half";
        state.fieldConfig.halfSide = "top";
        resetBoardForFieldChange();
        const f = Utils.getCurrentFrame();

        // Colocar balón en medio campo
        f.ball.x = canvas.width / 2;
        f.ball.y = CONFIG.MARGIN_Y + (canvas.height - CONFIG.MARGIN_Y * 2);
        f.ball.visible = true;

        updateFieldTypeButtons();
        updateFieldConfigInfo();
        Formations.updateSelector();
        Renderer.drawFrame();
    };


    document.getElementById("rotate-field-btn").onclick = () => {
        if (state.fieldConfig.type === "full") {
            // Rotate full field: horizontal ↔ vertical
            state.fieldConfig.orientation = state.fieldConfig.orientation === "horizontal" ? "vertical" : "horizontal";
        } else {
            // Switch visible half: top ↔ bottom
            state.fieldConfig.halfSide = state.fieldConfig.halfSide === "top" ? "bottom" : "top";
        }
        // Reposicionar balón al medio campo
        const f = Utils.getCurrentFrame();
        f.ball.x = canvas.width / 2;
        f.ball.y = state.fieldConfig.halfSide === "top"
            ? CONFIG.MARGIN_Y + (canvas.height - CONFIG.MARGIN_Y * 2)
            : CONFIG.MARGIN_Y;
        resetBoardForFieldChange();
        updateFieldConfigInfo();
        Formations.updateSelector();
        Renderer.drawFrame();
    };

    // Formaciones
    document.getElementById("save-formation-btn").onclick = async () => {
        const name = await Popup.prompt("Nombre de la formación", "Ej: Ataque 1");
        if (name) {
            await Formations.save(name);
        }
    };

    document.getElementById("load-formation-btn").onclick = async () => {
        const selector = document.getElementById("formation-selector");
        const name = selector.value;
        if (name) {
            await Formations.load(name);
        } else {
            await Popup.show({
                title: "Seleccionar formación",
                html: "Por favor, selecciona una formación de la lista",
                showCancel: false
            });
        }
    };

    document.getElementById("delete-formation-btn").onclick = async () => {
        const selector = document.getElementById("formation-selector");
        const name = selector.value;
        if (name) {
            await Formations.delete(name);
            selector.value = "";
        } else {
            await Popup.show({
                title: "Seleccionar formación",
                html: "Por favor, selecciona una formación de la lista",
                showCancel: false
            });
        }
    };

    // Flechas
    document.querySelectorAll("#arrow-menu button").forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.arrow;
            if (type === "normal") {
                Mode.set("draw");
                document.getElementById("mode-arrow").textContent = "Flecha (Normal) ▼";
            }
            if (type === "kick") {
                Mode.set("kick");
                document.getElementById("mode-arrow").textContent = "Flecha (Patada) ▼";
            }
            document.getElementById("arrow-menu").classList.add("hidden");
        };
    });

    // Modos
    document.getElementById("mode-move").onclick = () => Mode.set("move");
    document.getElementById("mode-text").onclick = () => Mode.set("text");
    document.getElementById("mode-scrum").onclick = () => Mode.set("scrum");
    document.getElementById("mode-arrow").onclick = () => {
        document.getElementById("arrow-menu").classList.toggle("hidden");
    };
    document.getElementById("mode-zone").onclick = () => Mode.set("zone");
    document.getElementById("mode-shield").onclick = () => Mode.set("shield");

    // Equipos
    document.getElementById("show-team-a").onclick = () => Players.showTeam("A");
    document.getElementById("show-team-b").onclick = () => Players.showTeam("B");

    // Colores de zona
    document.querySelectorAll(".zcp-color").forEach(btn => {
        btn.onclick = () => {
            state.selectedZoneColor = btn.dataset.color;
        };
    });

    // Limpiar
    document.getElementById("clear-board").onclick = () => {
        const f = Utils.getCurrentFrame();

        f.players.forEach(p => {
            p.visible = false;
            p.x = null;
            p.y = null;
        });

        f.arrows = [];
        f.texts = [];
        f.trailLines = [];
        f.trainingShields = [];

        f.ball = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            rx: CONFIG.BALL_RX,
            ry: CONFIG.BALL_RY,
            visible: true
        };

        state.zones = [];
        state.selectedPlayers.clear();
        state.selectedZone = null;
        state.selectedShield = null;
        state.dragTarget = null;
        state.previewArrow = null;
        state.arrowStart = null;

        UI.updateDeleteButton();
        Players.syncToggles();
        Renderer.drawFrame();
    };

    // Toggle balón
    document.getElementById("toggle-ball").onclick = () => {
        const f = Utils.getCurrentFrame();
        f.ball.visible = !f.ball.visible;
        Renderer.drawFrame();
    };

    // Menú móvil - Sidebar izquierdo
    document.getElementById("mobile-menu-btn").onclick = () => {
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("mobile-overlay");
        const rightPanel = document.getElementById("right-panel");

        sidebar.classList.toggle("show");
        overlay.classList.toggle("show");

        // Cerrar el panel derecho si está abierto
        if (rightPanel.classList.contains("show")) {
            rightPanel.classList.remove("show");
        }
    };

    // Menú móvil - Panel derecho
    document.getElementById("mobile-right-menu-btn").onclick = () => {
        const rightPanel = document.getElementById("right-panel");
        const overlay = document.getElementById("mobile-overlay");
        const sidebar = document.getElementById("sidebar");

        rightPanel.classList.toggle("show");
        overlay.classList.toggle("show");

        // Cerrar el sidebar si está abierto
        if (sidebar.classList.contains("show")) {
            sidebar.classList.remove("show");
        }
    };

    // Overlay móvil - Cerrar menús al hacer clic fuera
    document.getElementById("mobile-overlay").onclick = () => {
        const sidebar = document.getElementById("sidebar");
        const rightPanel = document.getElementById("right-panel");
        const overlay = document.getElementById("mobile-overlay");

        sidebar.classList.remove("show");
        rightPanel.classList.remove("show");
        overlay.classList.remove("show");
    };
}

// ==============================
// REDIMENSIONAMIENTO PARA MÓVILES
// ==============================
function isMobileDevice() {
    // Detectar dispositivo móvil por capacidad táctil Y tamaño de pantalla
    const hasTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 1024 || window.innerHeight <= 1024;
    return hasTouchScreen && isSmallScreen;
}

function resizeCanvas() {
    const mainContainer = document.getElementById("main");
    const rect = mainContainer.getBoundingClientRect();

    // Establecer el tamaño del canvas al tamaño del contenedor
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Reposicionar el balón al centro del canvas
    if (state.frames.length > 0) {
        const f = Utils.getCurrentFrame();
        if (f.ball) {
            f.ball.x = canvas.width / 2;
            if (state.fieldConfig.type === "half") {
                f.ball.y = state.fieldConfig.halfSide === "top"
                    ? canvas.height - 50
                    : 50;
            } else {
                f.ball.y = canvas.height / 2;
            }
        }
    }

    // Redibujar
    Renderer.drawFrame();
}

function handleResize() {
    const sidebar = document.getElementById("sidebar");
    const rightPanel = document.getElementById("right-panel");
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const mobileRightMenuBtn = document.getElementById("mobile-right-menu-btn");
    const overlay = document.getElementById("mobile-overlay");

    if (isMobileDevice()) {
        // MODO MÓVIL
        mobileMenuBtn.style.display = "block";
        mobileRightMenuBtn.style.display = "block";

        sidebar.classList.remove("show");
        rightPanel.classList.remove("show");
        overlay.classList.remove("show");
    } else {
        // MODO DESKTOP
        mobileMenuBtn.style.display = "none";
        mobileRightMenuBtn.style.display = "none";

        sidebar.classList.remove("show");
        rightPanel.classList.remove("show");
        overlay.classList.remove("show");
    }

    // Redimensionar canvas para ambos modos
    resizeCanvas();
}

// ==============================
// INICIALIZACIÓN
// ==============================
function init() {
    state.frames.push(Frame.create());
    Players.loadPanels();
    Animation.updateUI();
    Renderer.drawFrame();
    Players.syncToggles();
    Formations.updateSelector();
    initEvents();

    // Ajustar tamaño inicial para móviles
    handleResize();

    // Redimensionar cuando cambie la orientación o tamaño de ventana
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        setTimeout(handleResize, 100);
    });
}

// ==============================
// SISTEMA DE TUTORIAL
// ==============================
const Tutorial = {
    active: false,
    currentStep: 0,
    currentTutorialType: null, // 'basic' o 'advanced'
    actionCompleted: false,

    // Definición de tutoriales
    tutorials: {
        basic: [
            {
                title: "0. Configuración del Campo",
                text: "Antes de empezar, elige el tipo de campo: 'Campo Completo' para ver todo el campo de rugby, o 'Mitad Campo' para enfocarte en una zona específica. Usa el botón de rotar para cambiar la orientación.",
                target: ".field-type-selector",
                action: null,
                position: "right"
            },
            {
                title: "1. Selección de Jugadores",
                text: "En el menú izquierdo puedes seleccionar jugadores de cada equipo. Haz clic en los números para mostrar/ocultar jugadores en el campo. También puedes usar los botones 'Mostrar equipo azul/rojo' para colocar todo el equipo automáticamente.",
                target: "#players-panels",
                action: "playerToggle",
                position: "right"
            },
            {
                title: "2. Sistema de Animación",
                text: "Usa los controles de frames para crear secuencias. El botón '+ Añadir' crea un nuevo frame. Las flechas ◀ ▶ te permiten navegar entre frames. Cada frame es un paso de tu jugada.",
                target: "#frame-controls",
                action: "frameAction",
                position: "left"
            },
            {
                title: "3. Mover Fichas",
                text: "Con el modo 'Mover fichas' activo, arrastra los jugadores en el campo para crear tu jugada. Al moverlos, se crearán líneas de trayectoria. Puedes seleccionar varios jugadores con Ctrl+clic o arrastrando una caja.",
                target: "#pitch",
                action: "playerMove",
                position: "top"
            },
            {
                title: "4. Reproducir y Exportar",
                text: "Usa '▶ Reproducir' para ver tu animación. El botón 'Exportar' te permite guardar la animación como video. ¡Ya puedes crear tus jugadas!",
                target: "#playback-controls",
                action: null,
                position: "left"
            }
        ],
        advanced: [
            {
                title: "Herramienta: Flechas",
                text: "El menú de flechas te permite dibujar dos tipos: flechas normales para indicar movimientos y flechas de patada con arco. Haz clic para marcar el inicio y el final de la flecha. Mantén Shift presionado para ajustar la altura del arco en patadas.",
                target: "#arrow-menu-container",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Texto",
                text: "Añade anotaciones a tus jugadas. Haz clic en el campo para colocar texto explicativo. Puedes arrastrar el texto para reposicionarlo y hacer doble clic para editarlo.",
                target: "#mode-text",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Melé",
                text: "Posiciona automáticamente a los jugadores en formación de melé. Haz clic en el campo y elige qué equipo(s) participan. Los jugadores se colocarán en la formación correcta de 8 vs 8.",
                target: "#mode-scrum",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Zonas",
                text: "Crea zonas de colores en el campo para destacar áreas tácticas. Selecciona un color, dibuja el área haciendo dos clics (esquinas opuestas), asígnale un nombre y luego posiciona la etiqueta. Haz clic en el candado para bloquear/desbloquear zonas.",
                target: "#mode-zone",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Escudos",
                text: "Asigna escudos de entrenamiento a los jugadores. Haz clic cerca de un jugador para crear el escudo, luego arrastra para ajustar la dirección. El escudo se mueve con el jugador al crear animaciones.",
                target: "#mode-shield",
                action: null,
                position: "right"
            },
            {
                title: "Gestión de Formaciones",
                text: "Guarda configuraciones tácticas completas con el botón 'Guardar Formación'. Puedes cargar formaciones guardadas desde el selector y eliminarlas con el botón de papelera. Perfecto para reutilizar setups comunes.",
                target: "#save-formation-btn",
                action: null,
                position: "right"
            },
            {
                title: "Controles del Balón",
                text: "El botón 'Mostrar / ocultar balón' te permite controlar la visibilidad del balón en cada frame. Útil para simular diferentes fases de juego. Arrastra el balón para reposicionarlo.",
                target: "#toggle-ball",
                action: null,
                position: "right"
            },
            {
                title: "Borrar Elementos",
                text: "Selecciona cualquier elemento (jugador, flecha, texto, zona, escudo) y presiona la tecla 'Supr' o haz clic en el botón 'Borrar selección' para eliminarlo. 'Borrar flechas' elimina todas las flechas del frame actual.",
                target: "#delete-btn",
                action: null,
                position: "right"
            },
            {
                title: "Limpiar Tablero",
                text: "'Limpiar tablero' resetea completamente el frame actual: oculta jugadores, elimina flechas, textos, escudos y trails. Mantiene las zonas intactas. Útil para empezar un nuevo setup desde cero.",
                target: "#clear-board",
                action: null,
                position: "right"
            },
            {
                title: "Atajos de Teclado",
                text: "Usa 'Esc' para limpiar selecciones. 'Delete/Supr' para borrar elementos. 'Ctrl+Click' para selección múltiple. Estos atajos aceleran tu flujo de trabajo.",
                target: "#pitch",
                action: null,
                position: "top"
            }
        ]
    },

    start(type = 'basic') {
        this.active = true;
        this.currentStep = 0;
        this.currentTutorialType = type;
        this.actionCompleted = false;

        // Mostrar overlay
        document.getElementById('tutorial-overlay').classList.remove('hidden');
        document.getElementById('tutorial-box').classList.remove('hidden');

        this.showStep(0);
    },

    showStep(stepIndex) {
        const steps = this.tutorials[this.currentTutorialType];
        if (stepIndex < 0 || stepIndex >= steps.length) return;

        this.currentStep = stepIndex;
        this.actionCompleted = false;
        const step = steps[stepIndex];

        // Actualizar contenido
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-text').textContent = step.text;

        // Actualizar botones
        const btnPrev = document.getElementById('tutorial-prev');
        const btnNext = document.getElementById('tutorial-next');

        btnPrev.disabled = stepIndex === 0;

        // Actualizar texto del botón siguiente
        if (stepIndex === steps.length - 1) {
            btnNext.innerHTML = 'Finalizar';
        } else {
            btnNext.innerHTML = `
                <span class="btn-label">Paso adelante</span>
                <span class="btn-arrow">→</span>
            `;
        }

        // Posicionar spotlight y cuadro
        this.positionSpotlight(step.target, step.position);
    },

    positionSpotlight(selector, boxPosition) {
        const spotlight = document.getElementById('tutorial-spotlight');
        const tutorialBox = document.getElementById('tutorial-box');
        const target = document.querySelector(selector);

        if (!target) {
            console.warn('Tutorial: elemento no encontrado:', selector);
            spotlight.classList.remove('active');
            return;
        }

        const rect = target.getBoundingClientRect();
        const padding = 10;

        // Posicionar spotlight
        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';
        spotlight.classList.add('active');

        // Posicionar cuadro de información
        const boxRect = tutorialBox.getBoundingClientRect();
        let left, top;
        const margin = 30; // Mayor margen para evitar superposición

        switch (boxPosition) {
            case 'right':
                left = rect.right + margin;
                top = rect.top + (rect.height / 2) - (boxRect.height / 2);
                // Si se sale por la derecha, ponerlo arriba
                if (left + boxRect.width > window.innerWidth - 10) {
                    left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                    top = rect.top - boxRect.height - margin;
                }
                break;
            case 'left':
                left = rect.left - boxRect.width - margin;
                top = rect.top + (rect.height / 2) - (boxRect.height / 2);
                // Si se sale por la izquierda, ponerlo arriba
                if (left < 10) {
                    left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                    top = rect.top - boxRect.height - margin;
                }
                break;
            case 'top':
                left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                top = rect.top - boxRect.height - margin;
                // Si se sale por arriba, ponerlo abajo
                if (top < 10) {
                    top = rect.bottom + margin;
                }
                break;
            case 'bottom':
                left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                top = rect.bottom + margin;
                // Si se sale por abajo, ponerlo arriba
                if (top + boxRect.height > window.innerHeight - 10) {
                    top = rect.top - boxRect.height - margin;
                }
                break;
            default:
                left = window.innerWidth / 2 - boxRect.width / 2;
                top = window.innerHeight / 2 - boxRect.height / 2;
        }

        // Ajustar si se sale de la pantalla (con checks mejorados)
        left = Math.max(10, Math.min(left, window.innerWidth - boxRect.width - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - boxRect.height - 10));

        // Verificar que no se superponga con el spotlight
        const spotlightRect = {
            left: rect.left - padding,
            right: rect.right + padding,
            top: rect.top - padding,
            bottom: rect.bottom + padding
        };

        const boxFinalRect = {
            left: left,
            right: left + boxRect.width,
            top: top,
            bottom: top + boxRect.height
        };

        // Si hay superposición, mover el box
        if (!(boxFinalRect.right < spotlightRect.left ||
            boxFinalRect.left > spotlightRect.right ||
            boxFinalRect.bottom < spotlightRect.top ||
            boxFinalRect.top > spotlightRect.bottom)) {
            // Hay superposición, mover a la posición opuesta
            if (boxPosition === 'right' || boxPosition === 'left') {
                top = rect.bottom + margin;
                if (top + boxRect.height > window.innerHeight - 10) {
                    top = rect.top - boxRect.height - margin;
                }
            } else {
                left = rect.right + margin;
                if (left + boxRect.width > window.innerWidth - 10) {
                    left = rect.left - boxRect.width - margin;
                }
            }
        }

        tutorialBox.style.left = left + 'px';
        tutorialBox.style.top = top + 'px';
    },

    next() {
        const steps = this.tutorials[this.currentTutorialType];
        if (this.currentStep < steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.finish();
        }
    },

    prev() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    },

    skip() {
        this.finish();
    },

    finish() {
        this.active = false;
        document.getElementById('tutorial-overlay').classList.add('hidden');
        document.getElementById('tutorial-box').classList.add('hidden');
        document.getElementById('tutorial-spotlight').classList.remove('active');

        // Si terminó el tutorial básico, preguntar si quiere ver el avanzado
        if (this.currentTutorialType === 'basic') {
            setTimeout(async () => {
                const verAvanzado = await Popup.show({
                    title: "Tutorial Básico Completado",
                    html: `
                        <p>¡Excelente! Has completado el tutorial básico.</p>
                        <p>¿Quieres ver el tutorial avanzado para conocer todas las herramientas?</p>
                    `,
                    showCancel: true,
                    okText: "Ver tutorial avanzado",
                    cancelText: "Empezar a usar la app"
                });

                if (verAvanzado) {
                    setTimeout(() => Tutorial.start('advanced'), 300);
                }
            }, 500);
        }
    },

    // Detectar acciones del usuario
    detectAction(actionType) {
        if (!this.active) return;

        const currentStep = this.tutorials[this.currentTutorialType][this.currentStep];
        if (currentStep.action === actionType && !this.actionCompleted) {
            this.actionCompleted = true;
            // Auto-avanzar después de 1 segundo
            setTimeout(() => {
                if (this.active && this.actionCompleted) {
                    this.next();
                }
            }, 1000);
        }
    }
};

// ==============================
// EVENTOS DEL TUTORIAL
// ==============================
function initTutorialEvents() {
    // Botón de ayuda - inicia directamente el tutorial básico
    document.getElementById('help-btn').onclick = () => {
        if (!Tutorial.active) {
            Tutorial.start('basic');
        }
    };

    // Navegación del tutorial
    document.getElementById('tutorial-next').onclick = () => Tutorial.next();
    document.getElementById('tutorial-prev').onclick = () => Tutorial.prev();
    document.getElementById('tutorial-skip').onclick = () => Tutorial.skip();

    // Navegación con teclas de flechas
    window.addEventListener('keydown', (e) => {
        if (Tutorial.active) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                Tutorial.next();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                Tutorial.prev();
            }
        }
    });

    // Reposicionar al cambiar tamaño de ventana
    window.addEventListener('resize', () => {
        if (Tutorial.active) {
            const step = Tutorial.tutorials[Tutorial.currentTutorialType][Tutorial.currentStep];
            Tutorial.positionSpotlight(step.target, step.position);
        }
    });
}

// ==============================
// INTEGRACIÓN CON EVENTOS EXISTENTES
// ==============================
const originalToggle = Players.toggle;
Players.toggle = function (e) {
    Tutorial.detectAction('playerToggle');
    return originalToggle.call(this, e);
};

const originalShowTeam = Players.showTeam;
Players.showTeam = function (team) {
    Tutorial.detectAction('playerToggle');
    return originalShowTeam.call(this, team);
};

const originalAddFrame = document.getElementById("add-frame");
if (originalAddFrame) {
    const originalOnClick = originalAddFrame.onclick;
    document.getElementById("add-frame").onclick = function (e) {
        Tutorial.detectAction('frameAction');
        return originalOnClick ? originalOnClick.call(this, e) : null;
    };
}

const originalNextFrame = document.getElementById("next-frame");
if (originalNextFrame) {
    const originalOnClick = originalNextFrame.onclick;
    document.getElementById("next-frame").onclick = function (e) {
        Tutorial.detectAction('frameAction');
        return originalOnClick ? originalOnClick.call(this, e) : null;
    };
}

const originalMouseUp = CanvasEvents.handleMouseUp;
CanvasEvents.handleMouseUp = function () {
    if (state.dragTarget && state.dragTarget.type === "players") {
        Tutorial.detectAction('playerMove');
    }
    return originalMouseUp.call(this);
};

// Iniciar la aplicación
init();

// Inicializar eventos del tutorial después de init
initTutorialEvents();

// ==============================
// ERROR HANDLING INTEGRATION
// ==============================
// El error handler se carga como módulo ES6 en index.html
// y se expone globalmente como window.errorHandler
// Aquí lo referenciamos para debugging
if (window.errorHandler) {
    console.log('✅ PizarraRugby v2.2.0 con Error Handling activo');
    console.log('📊 Debug: errorHandler.getErrorHistory()');
} else {
    console.log('✅ PizarraRugby v2.2 .0 iniciado');
}
