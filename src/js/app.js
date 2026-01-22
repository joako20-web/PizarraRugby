import { CONFIG } from "./core/config.js";
import { SETTINGS, DEFAULT_SHORTCUTS } from "./core/settings.js";
import { state } from "./core/state.js";
import { canvas } from "./core/dom.js";
import { Utils, calculateFieldDimensions, debounce } from "./core/utils.js";
import { Frame } from "./model/frame.js";
import { Renderer } from "./renderer/renderer.js";
import { Popup } from "./ui/popup.js";
import { I18n } from "./core/i18n.js";
import { UI } from "./ui/ui.js";
import { Players } from "./features/players.js"; // CRÍTICO: Usado en init() y eventos
import { Formations } from "./features/formations.js";
import { Animation } from "./features/animation.js";
import { Tutorial } from "./features/tutorial.js";
import { History } from "./features/history.js";
import { SettingsUI } from "./features/settings-ui.js";
import { ExportUI } from "./ui/export-ui.js";


import { InputHandler } from "./core/input-handler.js";
import { Store } from "./core/store.js";
import { Playbook } from './features/playbook.js';

// CSS Imports - Removed (now in main.css)

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

    Renderer.invalidateBackground();
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
        title: I18n.t('popup_reset_title'),
        html: I18n.t('popup_reset_text'),
        okText: I18n.t('popup_reset_confirm'),
        cancelText: I18n.t('popup_reset_cancel')
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

        SETTINGS.SHORTCUTS = { ...DEFAULT_SHORTCUTS };

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

    const setTooltip = (id, key, shortcut) => {
        const el = document.getElementById(id);
        if (el) {
            const text = I18n.t(key);
            // Si la traducción es igual a la clave (no encontrada), usar la clave como fallback visual temporario
            // o buscar en el diccionario actual si hay fallbacks hardcoded? 
            // Mejor confiar en que las claves existen.
            el.title = `${text} (${shortcut})`;
        }
    };

    setTooltip('mode-move', "mode_move", s.MODE_MOVE.toUpperCase());
    setTooltip('mode-text', "mode_text", s.MODE_TEXT.toUpperCase());
    setTooltip('mode-scrum', "mode_scrum", s.MODE_SCRUM.toUpperCase());
    setTooltip('mode-arrow', "mode_arrow", s.MODE_ARROW.toUpperCase());
    setTooltip('mode-freehand', "mode_draw", s.MODE_FREEHAND.toUpperCase());
    // "mode_eraser_title" keys in locale is "Goma de borrar" / "Eraser"
    setTooltip('mode-eraser', "mode_eraser_title", s.MODE_ERASER.toUpperCase());
    setTooltip('mode-zone', "mode_zone", s.MODE_ZONE.toUpperCase());
    setTooltip('mode-shield', "mode_shield", s.MODE_SHIELD.toUpperCase());

    // Play button special case
    const playShortcut = s.ANIMATION_PLAY === 'Space' ? (I18n.currentLocale === 'es' ? 'Espacio' : 'Space') : s.ANIMATION_PLAY.toUpperCase();
    setTooltip('play-animation', "btn_play", playShortcut);
}


// ==============================
// INICIALIZACIÓN DE EVENTOS
// ==============================



// ==============================
// INICIALIZACIÓN DE EVENTOS
// ==============================

function updatePresentationPlayIcon() {
    const icon = document.getElementById("pres-play-icon");
    if (!icon) return;
    if (state.isPlaying) {
        icon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
    } else {
        icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
    }
}

function initEvents() {
    // Initialize i18n
    I18n.init();

    // Initialize ExportUI
    if (typeof ExportUI !== "undefined") ExportUI.init();

    // Initial tooltip update
    updateButtonTooltips();

    // Listen for language changes to update tooltips
    window.addEventListener('languageChanged', () => {
        updateButtonTooltips();
    });

    // Pass dependencies to InputHandler
    InputHandler.init({
        resetApp,
        resetBoard: resetBoardForFieldChange,
        deleteSelection: deleteSelectedElement,
        clearSelections: clearAllSelections,
        handleResize,
        toggleLeftSidebar,
        toggleRightSidebar,
        updateFieldUI: () => {
            updateFieldTypeButtons();
            updateFieldConfigInfo();
        },
        updatePresentationPlayIcon
    });

    // Tutorial Events (Tutorial has its own internal event logic or we can migrate it later)
    // initTutorialEvents() called separately in init()

    // Listen to Store changes
    Store.events.on('modeChanged', (mode) => {
        updateModeUI(mode);
    });
}


// ==============================
// GESTIÓN DE PANELES (UNIFICADO)
// ==============================

function toggleLeftSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("mobile-overlay");
    const menuBtn = document.getElementById("mobile-menu-btn");

    if (isMobileView()) {
        sidebar.classList.toggle("is-visible");
        overlay.classList.toggle("is-visible");
    } else {
        // Desktop Logic
        sidebar.classList.toggle("is-collapsed");
        // Toggle button visibility via class
        if (sidebar.classList.contains("is-collapsed")) {
            menuBtn.classList.add("is-active");
        } else {
            menuBtn.classList.remove("is-active");
        }
    }

    setTimeout(() => {
        resizeCanvas(); // Ajustar canvas tras animación
        Renderer.drawFrame();
    }, 350);
}

function toggleRightSidebar() {
    const rightPanel = document.getElementById("right-panel");
    const overlay = document.getElementById("mobile-overlay");
    const rightMenuBtn = document.getElementById("mobile-right-menu-btn");

    if (isMobileView()) {
        rightPanel.classList.toggle("is-visible");
        overlay.classList.toggle("is-visible");
    } else {
        // Desktop Logic
        rightPanel.classList.toggle("is-collapsed");
        if (rightPanel.classList.contains("is-collapsed")) {
            rightMenuBtn.classList.add("is-active");
        } else {
            rightMenuBtn.classList.remove("is-active");
        }
    }

    setTimeout(() => {
        resizeCanvas();
        Renderer.drawFrame();
    }, 350);
}

// Menú móvil - Sidebar izquierdo
// Menú móvil - Sidebar izquierdo
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
if (mobileMenuBtn) {
    mobileMenuBtn.onclick = (e) => {
        e.stopPropagation();
        toggleLeftSidebar();
    };
}

// Botones de Cerrar (Close) - Sidebar Izquierdo
const closeLeftBtn = document.getElementById("close-sidebar-btn");
if (closeLeftBtn) {
    closeLeftBtn.onclick = (e) => {
        e.stopPropagation();
        toggleLeftSidebar();
    };
}

// Menú móvil - Panel derecho
const mobileRightMenuBtn = document.getElementById("mobile-right-menu-btn");
if (mobileRightMenuBtn) {
    mobileRightMenuBtn.onclick = (e) => {
        e.stopPropagation();
        toggleRightSidebar();
    };
}

// Botones de Cerrar (Close) - Panel Derecho
const closeRightBtn = document.getElementById("close-right-panel-btn");
if (closeRightBtn) {
    closeRightBtn.onclick = (e) => {
        e.stopPropagation();
        toggleRightSidebar();
    };
}

// Overlay móvil - Cerrar menús al hacer clic fuera
document.getElementById("mobile-overlay").onclick = () => {
    const sidebar = document.getElementById("sidebar");
    const rightPanel = document.getElementById("right-panel");
    const overlay = document.getElementById("mobile-overlay");

    sidebar.classList.remove("is-visible");
    rightPanel.classList.remove("is-visible");
    overlay.classList.remove("is-visible");
};
// ==============================
// REDIMENSIONAMIENTO PARA MÓVILES
// ==============================
function isMobileView() {
    // Coincidir con el breakpoint CSS de 1024px
    return window.innerWidth <= 1024;
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

    if (isMobileView()) {
        // MODO MÓVIL
        // Reset styles set by JS in previous versions
        mobileMenuBtn.style.display = "";
        mobileRightMenuBtn.style.display = "";

        // Reset desktop states
        sidebar.classList.remove("is-collapsed");
        rightPanel.classList.remove("is-collapsed");

        // Ensure buttons are visible (handled by CSS now, but good to ensure consistent state)
        mobileMenuBtn.classList.remove("is-active");
        mobileRightMenuBtn.classList.remove("is-active");

        // Hide overlay if resizing from Desktop to Mobile
        sidebar.classList.remove("is-visible");
        rightPanel.classList.remove("is-visible");
        overlay.classList.remove("is-visible");
    } else {
        // MODO DESKTOP
        mobileMenuBtn.style.display = "";
        mobileRightMenuBtn.style.display = "";

        // Reset mobile states
        sidebar.classList.remove("is-visible");
        rightPanel.classList.remove("is-visible");
        overlay.classList.remove("is-visible");

        // Default state for Desktop: Open
        sidebar.classList.remove("is-collapsed");
        rightPanel.classList.remove("is-collapsed");
        mobileMenuBtn.classList.remove("is-active");
        mobileRightMenuBtn.classList.remove("is-active");
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

    // Evento personalizado para actualizar UI de campo desde módulos (e.g. Formations)
    window.addEventListener('field-config-changed', () => {
        updateFieldTypeButtons();
        updateFieldConfigInfo();
        Formations.updateSelector(); // Filter formations for new field
        Renderer.drawFrame(); // Redibujar campo nuevo
    });

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

    // --- PLAYBOOK EVENTS (Injected here to ensure binding) ---
    const btnOpenLib = document.getElementById('open-library-btn');
    if (btnOpenLib) {
        btnOpenLib.onclick = (e) => {
            e.stopPropagation(); // Prevent propagation just in case
            Playbook.openLibrary();
        };
    } else {
        console.warn("Playbook Button 'open-library-btn' NOT FOUND");
    }

    const btnSavePlay = document.getElementById('save-play-btn');
    if (btnSavePlay) {
        btnSavePlay.onclick = (e) => {
            e.stopPropagation();
            Playbook.saveCurrentPlay();
        };
    } else {
        console.warn("Playbook Button 'save-play-btn' NOT FOUND");
    }
    // -------------------------------------------------------

    // Ajustar tamaño inicial para móviles y desktop (con pequeño un delay para asegurar layout)
    setTimeout(handleResize, 100);

    // Redimensionar cuando cambie la orientación o tamaño de ventana (con debounce para performance)
    window.addEventListener('resize', debounce(handleResize, 150));
    window.addEventListener('orientationchange', debounce(() => {
        setTimeout(handleResize, 100);
    }, 150));
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

// ==============================
// STORE UI UPDATES
// ==============================
function updateModeUI(mode) {
    // Clear active classes from sidebar
    document.querySelectorAll("#sidebar button").forEach(b => b.classList.remove("is-active"));

    // Activate current mode button
    const modeMap = {
        'move': 'mode-move',
        'text': 'mode-text',
        'scrum': 'mode-scrum',
        'draw': 'mode-arrow', // Generic arrow button
        'kick': 'mode-arrow',
        'freehand': 'mode-freehand',
        'eraser': 'mode-eraser',
        'zone': 'mode-zone',
        'shield': 'mode-shield'
    };

    const btnId = modeMap[mode];
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add("is-active");
    }

    // Toggle Zone Color Panel
    const zonePanel = document.getElementById("zone-color-panel");
    if (zonePanel) {
        if (mode === "zone") {
            zonePanel.classList.remove("is-hidden");
        } else {
            zonePanel.classList.add("is-hidden");
        }
    }
}
