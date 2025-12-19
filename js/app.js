import { CONFIG } from "./core/config.js";
import { SETTINGS } from "./core/settings.js";
import { state } from "./core/state.js";
import { canvas, ctx } from "./core/dom.js";
import { Utils, clampYToPlayableArea, getPlayerInitialPosition, calculateFieldDimensions } from "./core/utils.js";
import { Frame } from "./model/frame.js";
import { Renderer } from "./renderer/renderer.js";
import { Popup } from "./ui/popup.js";
import { UI } from "./ui/ui.js";
import { Players } from "./features/players.js"; // CRÍTICO: Usado en init() y eventos
import { Formations } from "./features/formations.js";
import { Mode } from "./features/mode.js";
import { Animation } from "./features/animation.js";
import { Tutorial } from "./features/tutorial.js";
import { CanvasEvents } from "./features/canvasEvents.js";
import { History } from "./features/history.js";
import { Export } from "./features/export.js";
import { SettingsUI } from "./features/settings-ui.js";


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
    History.push(); // Guardar cambio de campo
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
        History.push(); // Guardar borrado
    }
}

function updateFieldTypeButtons() {
    const fullBtn = document.getElementById("field-type-full");
    const halfBtn = document.getElementById("field-type-half");

    if (state.fieldConfig.type === "full") {
        fullBtn.classList.add("is-active");
        halfBtn.classList.remove("is-active");
    } else {
        fullBtn.classList.remove("is-active");
        halfBtn.classList.add("is-active");
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

async function resetApp() {
    const confirm = await Popup.show({
        title: "Resetear Todo",
        html: "¿Estás seguro? Esto borrará <b>todo</b> el progreso actual y comenzará un nuevo proyecto desde cero.<br><br>Esta acción no se puede deshacer.",
        okText: "Sí, borrar todo",
        cancelText: "Cancelar"
    });

    if (confirm) {
        // 1. Resetear Estado
        state.frames = [];
        state.currentFrameIndex = 0;
        state.frames.push(Frame.create());
        state.fieldConfig = {
            type: "full",
            orientation: "horizontal",
            halfSide: "top"
        };
        state.zones = [];

        // Limpiar selecciones
        state.selectedPlayers.clear();
        state.selectedZone = null;
        state.selectedText = null;
        state.selectedArrow = null;
        state.selectedShield = null;
        state.dragTarget = null;
        state.previewArrow = null;
        state.arrowStart = null;

        // Resetear Settings a defaults
        SETTINGS.TEAM_A_NAME = 'Equipo A';
        SETTINGS.TEAM_B_NAME = 'Equipo B';
        SETTINGS.TEAM_A_COLOR = '#0000ff';
        SETTINGS.TEAM_B_COLOR = '#ff0000';
        SETTINGS.THEME = 'dark';
        SETTINGS.PLAYER_SCALE = 1.0;
        SETTINGS.BALL_SCALE = 1.0;
        SETTINGS.SHOW_NUMBERS = true;

        SETTINGS.SHORTCUTS = {
            MODE_MOVE: 'v',
            MODE_TEXT: 't',
            MODE_SCRUM: 'm',
            MODE_ARROW: 'a',
            MODE_ZONE: 'z',
            MODE_SHIELD: 'h',
            TOGGLE_BALL: 'b',
            PRESENTATION_MODE: 'p',
            ANIMATION_PLAY: 'Space',
            FRAME_PREV: 'ArrowLeft',
            FRAME_NEXT: 'ArrowRight',
            FRAME_ADD: '+',
            FRAME_REMOVE: '-'
        };

        // Limpiar settings de localStorage
        localStorage.removeItem('rugby_settings');

        // 2. Resetear Historial
        History.clear();
        History.push(); // Estado inicial limpio

        // 3. Actualizar UI
        // Resetear configuración de campo en UI
        updateFieldTypeButtons();
        updateFieldConfigInfo();

        // Settings UI update
        if (typeof SettingsUI !== "undefined") {
            SettingsUI.applyTheme(SETTINGS.THEME); // Re-aplicar tema
            SettingsUI.updateUI();
            // Also need to re-apply team buttons generation as names changed
            // updateUI calls Players.updateTeamButtons() internally so it should be fine.
        }

        // Resetear selectores de formaciones si es necesario
        // (Formations module might need a reset or just update selector)
        if (typeof Formations !== "undefined") Formations.updateSelector();

        // Sincronizar UI de jugadores
        if (typeof Players !== "undefined") {
            Players.syncToggles();
        }

        // Sincronizar UI de animación
        if (typeof Animation !== "undefined") {
            Animation.updateUI();
        }

        UI.updateDeleteButton();
        updateButtonTooltips(); // Refresh tooltips

        // 4. Redibujar
        resizeCanvas(); // Fuerza recalculo de dimensiones y redibujado

        // Notificación opcional
        if (typeof Notification !== "undefined") {
            // Si hubiera sistema de notificaciones
        }
    }
}

function updateButtonTooltips() {
    const s = SETTINGS.SHORTCUTS;
    if (!s) return;

    const setTooltip = (id, text, key) => {
        const el = document.getElementById(id);
        if (el) el.title = `${text} (${key})`;
    };

    setTooltip('mode-move', "Mover / Seleccionar", s.MODE_MOVE.toUpperCase());
    setTooltip('mode-text', "Texto", s.MODE_TEXT.toUpperCase());
    setTooltip('mode-scrum', "Melé", s.MODE_SCRUM.toUpperCase());
    setTooltip('mode-arrow', "Flecha", s.MODE_ARROW.toUpperCase());
    setTooltip('mode-zone', "Zonas", s.MODE_ZONE.toUpperCase());
    setTooltip('mode-shield', "Escudo", s.MODE_SHIELD.toUpperCase());
    setTooltip('play-animation', "Reproducir", s.ANIMATION_PLAY === 'Space' ? 'Espacio' : s.ANIMATION_PLAY.toUpperCase());
}


// ==============================
// INICIALIZACIÓN DE EVENTOS
// ==============================

function initEvents() {
    // Historial
    const btnUndo = document.getElementById("btn-undo");
    const btnRedo = document.getElementById("btn-redo");

    if (btnUndo) btnUndo.onclick = () => History.undo();
    if (btnRedo) btnRedo.onclick = () => History.redo();

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
        // Ignorar si estamos escribiendo en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Undo/Redo (Hardcoded standard)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            History.undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
            e.preventDefault();
            History.redo();
            return;
        }

        // Custom Shortcuts Logic with Modifiers
        // 1. Construct the string for the current press
        // Ignorar modificadores sueltos
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

        let currentKeys = [];
        if (e.ctrlKey) currentKeys.push('Ctrl');
        if (e.altKey) currentKeys.push('Alt');
        if (e.shiftKey) currentKeys.push('Shift');

        let mainKey = e.key;
        if (e.code === 'Space') mainKey = 'Space';
        if (mainKey.length === 1) mainKey = mainKey.toUpperCase();
        currentKeys.push(mainKey);

        const currentShortcut = currentKeys.join('+');
        const s = SETTINGS.SHORTCUTS;

        if (!s) return;

        // Helper to check match
        const isMatch = (settingKey) => {
            if (!settingKey) return false;
            // Normalize for comparison: ensure uppercase for single letters if manually edited
            return settingKey.toUpperCase() === currentShortcut.toUpperCase();
        };

        let actionTriggered = false;

        if (isMatch(s.MODE_MOVE)) { Mode.set("move"); actionTriggered = true; }
        else if (isMatch(s.MODE_TEXT)) { Mode.set("text"); actionTriggered = true; }
        else if (isMatch(s.MODE_SCRUM)) { Mode.set("scrum"); actionTriggered = true; }
        else if (isMatch(s.MODE_ARROW)) { Mode.set("draw"); actionTriggered = true; }
        else if (isMatch(s.MODE_ZONE)) { Mode.set("zone"); actionTriggered = true; }
        else if (isMatch(s.MODE_SHIELD)) { Mode.set("shield"); actionTriggered = true; }
        else if (isMatch(s.TOGGLE_BALL)) {
            const btn = document.getElementById("toggle-ball");
            if (btn) btn.click();
            actionTriggered = true;
        }
        else if (isMatch(s.PRESENTATION_MODE)) {
            const btn = document.getElementById("toggle-presentation");
            if (btn) btn.click();
            actionTriggered = true;
        }
        else if (isMatch(s.ANIMATION_PLAY)) {
            if (state.isPlaying) Animation.pause();
            else Animation.play();
            actionTriggered = true;
        }
        // Frames
        else if (isMatch(s.FRAME_NEXT)) { document.getElementById("next-frame").click(); actionTriggered = true; }
        else if (isMatch(s.FRAME_PREV)) { document.getElementById("prev-frame").click(); actionTriggered = true; }
        else if (isMatch(s.FRAME_ADD)) { document.getElementById("add-frame").click(); actionTriggered = true; }
        else if (isMatch(s.FRAME_REMOVE)) { document.getElementById("delete-frame").click(); actionTriggered = true; }

        if (actionTriggered) {
            e.preventDefault();
            e.stopPropagation();
        }
    });

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

    // Eventos mouse
    canvas.addEventListener("mousedown", e => CanvasEvents.handleMouseDown(e));
    canvas.addEventListener("mousemove", e => CanvasEvents.handleMouseMove(e));
    canvas.addEventListener("mouseup", () => CanvasEvents.handleMouseUp());
    // Doble clic para editar texto
    canvas.addEventListener("dblclick", e => CanvasEvents.handleDoubleClick(e));

    window.addEventListener("keydown", e => {
        // Global keys that are always active (unless input)
        // Check for specific functional keys like Escape or Delete
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === "Escape") {
            if (document.body.classList.contains('presentation-mode')) {
                document.body.classList.remove('presentation-mode');
                handleResize(); // trigger smooth resize logic via helper if needed or direct
            } else {
                clearAllSelections();
                Renderer.drawFrame();
            }
        }

        if (e.key === "Delete" || e.key === "Supr") {
            deleteSelectedElement();
        }


        if (e.key === "Delete" || e.key === "Supr") {
            deleteSelectedElement();
        }
    });

    // Botón de borrar
    document.getElementById("delete-btn").onclick = deleteSelectedElement;

    // Botón de Resetear Todo
    const btnReset = document.getElementById("btn-reset-app");
    if (btnReset) btnReset.onclick = resetApp;

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
    const pauseBtn = document.getElementById("pause-animation");
    if (pauseBtn) pauseBtn.onclick = () => Animation.pause();
    document.getElementById("export-webm").onclick = () => Animation.exportWebM();
    document.getElementById("export-image").onclick = () => Export.downloadImage();

    // Presentation Mode
    const togglePresentation = () => {
        document.body.classList.toggle('presentation-mode');

        // Redimensionar suavemente durante la transición CSS (400ms)
        let start = null;
        const duration = 500;

        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;

            handleResize();

            if (progress < duration) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    };

    document.getElementById("toggle-presentation").onclick = togglePresentation;
    document.getElementById("exit-presentation").onclick = () => {
        document.body.classList.remove('presentation-mode');
        // Usar la misma lógica de redimensionado suave al salir
        let start = null;
        const duration = 500;
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            handleResize();
            if (progress < duration) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    };

    // Atajo de teclado (Escape)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.body.classList.remove('presentation-mode');

            // Redimensionado suave al salir con Escape
            let start = null;
            const duration = 500;
            const step = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                handleResize();
                if (progress < duration) window.requestAnimationFrame(step);
            };
            window.requestAnimationFrame(step);
        }
    });

    // Theme Toggle - HANDLED BY SETTINGS UI NOW
    // const updateThemeIcon = (isLight) => ...
    // const toggleTheme = () => ...

    // Bind to the new FAB - We can keep FAB functionality via SettingsUI or just redirect it
    // REMOVED at user request


    // Bind to the sidebar button - REMOVED
    // const themeSidebar = document.getElementById("toggle-theme");
    // if (themeSidebar) themeSidebar.onclick = toggleTheme;

    // Load Theme Preference from localStorage - HANDLED BY SETTINGS UI
    // const storedTheme = localStorage.getItem('pizarra_theme');
    // ...

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
            document.getElementById("arrow-menu").classList.add("is-hidden");
        };
    });

    // Modos
    document.getElementById("mode-move").onclick = () => Mode.set("move");
    document.getElementById("mode-text").onclick = () => Mode.set("text");
    document.getElementById("mode-scrum").onclick = () => Mode.set("scrum");
    document.getElementById("mode-arrow").onclick = () => {
        document.getElementById("arrow-menu").classList.toggle("is-hidden");
    };
    document.getElementById("mode-zone").onclick = () => Mode.set("zone");
    document.getElementById("mode-shield").onclick = () => Mode.set("shield");

    // Equipos
    document.getElementById("show-team-a").onclick = () => Players.showTeam("A");
    document.getElementById("show-team-b").onclick = () => Players.showTeam("B");

    // Colores de zona
    document.querySelectorAll(".color-picker__swatch").forEach(btn => {
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
        History.push(); // Guardar limpieza
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

        sidebar.classList.toggle("is-visible");
        overlay.classList.toggle("is-visible");

        // Cerrar el panel derecho si está abierto
        if (rightPanel.classList.contains("is-visible")) {
            rightPanel.classList.remove("is-visible");
        }
    };

    // Menú móvil - Panel derecho
    document.getElementById("mobile-right-menu-btn").onclick = () => {
        const rightPanel = document.getElementById("right-panel");
        const overlay = document.getElementById("mobile-overlay");
        const sidebar = document.getElementById("sidebar");

        rightPanel.classList.toggle("is-visible");
        overlay.classList.toggle("is-visible");

        // Cerrar el sidebar si está abierto
        if (sidebar.classList.contains("is-visible")) {
            sidebar.classList.remove("is-visible");
        }
    };

    // Overlay móvil - Cerrar menús al hacer clic fuera
    document.getElementById("mobile-overlay").onclick = () => {
        const sidebar = document.getElementById("sidebar");
        const rightPanel = document.getElementById("right-panel");
        const overlay = document.getElementById("mobile-overlay");

        sidebar.classList.remove("is-visible");
        rightPanel.classList.remove("is-visible");
        overlay.classList.remove("is-visible");
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

    // Guardar dimensiones anteriores
    const prevW = canvas.width;
    const prevH = canvas.height;

    // Si es la primera vez (prevW=300 default), no reescalar
    const isFirstRun = (prevW === 300 && prevH === 150);

    // Obtener rectángulo de juego ANTERIOR
    const prevDims = calculateFieldDimensions(prevW, prevH, state.fieldConfig);

    // Actualizar canvas
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Si cambió el tamaño y no es la primera vez, reescalar posiciones
    if (!isFirstRun && (prevW !== canvas.width || prevH !== canvas.height)) {
        const newDims = calculateFieldDimensions(canvas.width, canvas.height, state.fieldConfig);

        // Función auxiliar de mapeo
        const mapX = (x) => newDims.x + ((x - prevDims.x) / prevDims.width) * newDims.width;
        const mapY = (y) => newDims.y + ((y - prevDims.y) / prevDims.height) * newDims.height;
        const scaleVal = (v) => v * (newDims.width / prevDims.width); // Escalar radios/tamaños

        // Iterar por todos los frames para mantener consistencia en animación
        state.frames.forEach(f => {
            // Ball
            f.ball.x = mapX(f.ball.x);
            f.ball.y = mapY(f.ball.y);

            // Players
            f.players.forEach(p => {
                p.x = mapX(p.x);
                p.y = mapY(p.y);
                // Opcional: escalar radio ligeramente si el cambio es muy drástico? 
                // Mejor mantener tamaño fijo para legibilidad, o escalar?
                // En V1 mantuvimos tamaño fijo, pero en Presentation si es muy grande...
                // Por ahora solo posición.
            });

            // Arrows
            f.arrows.forEach(a => {
                a.x1 = mapX(a.x1);
                a.y1 = mapY(a.y1);
                a.x2 = mapX(a.x2);
                a.y2 = mapY(a.y2);
            });

            // Texts
            f.texts.forEach(t => {
                t.x = mapX(t.x);
                t.y = mapY(t.y);
            });

            // Trail Lines
            f.trailLines.forEach(tl => {
                tl.x1 = mapX(tl.x1);
                tl.y1 = mapY(tl.y1);
                tl.x2 = mapX(tl.x2);
                tl.y2 = mapY(tl.y2);
            });

            // Scrum/Formations/Zones placeholders if any...
            // Zones logic is complex as it might be defined by config, but custom zones?
            // Assuming zones module handles its own rescale or stays relative if impl implemented relative. 
            // In current code, zones seem to be missing or stored in state.zones global?
            if (state.zones) {
                state.zones.forEach(z => {
                    z.x1 = mapX(z.x1);
                    z.y1 = mapY(z.y1);
                    z.x2 = mapX(z.x2);
                    z.y2 = mapY(z.y2);
                    if (z.labelX) z.labelX = mapX(z.labelX);
                    if (z.labelY) z.labelY = mapY(z.labelY);
                });
            }
        });
    } else if (isFirstRun && state.frames.length > 0) {
        // Inicialización centrada del balón si es primera vez
        const f = Utils.getCurrentFrame();
        if (f && f.ball) {
            f.ball.x = canvas.width / 2;
            f.ball.y = canvas.height / 2;
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

        sidebar.classList.remove("is-visible");
        rightPanel.classList.remove("is-visible");
        overlay.classList.remove("is-visible");
    } else {
        // MODO DESKTOP
        mobileMenuBtn.style.display = "none";
        mobileRightMenuBtn.style.display = "none";

        sidebar.classList.remove("is-visible");
        rightPanel.classList.remove("is-visible");
        overlay.classList.remove("is-visible");
    }

    // Redimensionar canvas para ambos modos
    resizeCanvas();
}

// ==============================
// INICIALIZACIÓN
// ==============================
function init() {
    state.frames.push(Frame.create());
    SettingsUI.init(); // Initialize settings (loads from storage & creates button)
    Players.loadPanels(); // Now this will use default or loaded names? Actually panels are hardcoded in HTML but titles updated by SettingsUI.init indirectly or we call updateUI.
    SettingsUI.updateUI(); // Force update titles

    Animation.updateUI();
    Renderer.drawFrame();
    Players.syncToggles();
    Formations.updateSelector();

    // Shortcuts Tooltips
    updateButtonTooltips();
    window.addEventListener('shortcuts-changed', () => updateButtonTooltips());

    // Configurar callback de restauración
    History.onStateRestored = () => {
        updateFieldTypeButtons();
        updateFieldConfigInfo();
        Formations.updateSelector();
        Renderer.drawFrame();
        updateButtonTooltips();
    };

    History.init(); // Iniciar historial con estado base (y restaurar si existe)
    initEvents();

    // Ajustar tamaño inicial para móviles y desktop (con pequeño un delay para asegurar layout)
    setTimeout(handleResize, 100);

    // Redimensionar cuando cambie la orientación o tamaño de ventana
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        setTimeout(handleResize, 100);
    });
}

// ==============================
// SISTEMA DE TUTORIAL
// ==============================


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
    const result = originalToggle.call(this, e);
    History.push(); // Guardar cambio de visibilidad
    return result;
};

const originalShowTeam = Players.showTeam;
Players.showTeam = function (team) {
    Tutorial.detectAction('playerToggle');
    const result = originalShowTeam.call(this, team);
    History.push(); // Guardar cambio de equipo
    return result;
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

// [Deleted override]

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
