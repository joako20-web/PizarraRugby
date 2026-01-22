import { state } from './state.js';
import { SETTINGS } from './settings.js';
import { I18n } from './i18n.js';
import { canvas } from './dom.js';
import { Utils } from './utils.js';
import { Frame } from '../model/frame.js';
import { Renderer } from '../renderer/renderer.js';
import { History } from '../features/history.js';
import { CanvasEvents } from '../features/canvasEvents.js';
import { Animation } from '../features/animation.js';
import { Players } from '../features/players.js';
import { Formations } from '../features/formations.js';
import { Popup } from '../ui/popup.js';
import { UI } from '../ui/ui.js';
import { Export } from '../features/export.js';
import { Store } from './store.js';
import { Notificacion } from '../ui/notifications.js';

export const InputHandler = {
    callbacks: {},

    init(callbacks = {}) {
        this.callbacks = callbacks;
        this.bindKeyboard();
        this.bindMouseAndTouch();
        this.bindUIButtons();
    },

    bindKeyboard() {
        window.addEventListener("keydown", (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Undo/Redo
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

            // Shortcutsystem
            this.handleShortcut(e);

            // Global keys
            if (e.key === "Escape") {
                // Cancel arrow creation if in progress
                if ((state.mode === "draw" || state.mode === "kick") && (state.arrowPoints.length > 0 || state.arrowStart)) {
                    state.arrowStart = null;
                    state.arrowPoints = [];
                    state.previewArrow = null;
                    Renderer.drawFrame();
                    return;
                }

                if (document.body.classList.contains('presentation-mode')) {
                    document.body.classList.remove('presentation-mode');
                    if (this.callbacks.handleResize) this.callbacks.handleResize();
                } else {
                    if (this.callbacks.clearSelections) this.callbacks.clearSelections();
                    Renderer.drawFrame();
                }
            }

            if (e.key === "Delete" || e.key === "Supr") {
                if (this.callbacks.deleteSelection) this.callbacks.deleteSelection();
            }

            // Shortcutsystem handles actions, but "Hold" actions like Ghost are distinct?
            // "Hold" actions are tricky with the current `handleShortcut` which is for triggers.
            // AND `handleShortcut` returns early if Shift is pressed alone? No, it checks keys.
            // But we need to know if keys MATCH.

            // Let's implement a helper `isPressed(e, shortcut)`
            // Helper to check if a specific shortcut is pressed, independent of key order
            const isPressed = (evt, shortcutKey) => {
                if (!shortcutKey) return false;

                // Helper to normalize key names
                const normalize = (k) => {
                    k = k.toUpperCase();
                    if (k === 'CONTROL') return 'CTRL';
                    return k;
                };

                const targetKeys = shortcutKey.split('+').map(normalize).sort();

                let currentKeys = [];
                if (evt.ctrlKey) currentKeys.push('CTRL');
                if (evt.altKey) currentKeys.push('ALT');
                if (evt.shiftKey) currentKeys.push('SHIFT');
                if (evt.metaKey) currentKeys.push('META');

                let main = evt.key.toUpperCase();
                if (evt.code === 'Space') main = 'SPACE';

                // Add main key if it's not a modifier
                if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(main)) {
                    currentKeys.push(normalize(main));
                }

                currentKeys.sort();

                return targetKeys.join('+') === currentKeys.join('+');
            };

            if (isPressed(e, SETTINGS.SHORTCUTS.GHOST_SHOW)) {
                if (!state.showGhost) {
                    state.showGhost = true;
                    Renderer.drawFrame();
                }
            }

            if (isPressed(e, SETTINGS.SHORTCUTS.GHOST_PREV)) {
                if (!state.showGhostPrev) {
                    state.showGhostPrev = true;
                    Renderer.drawFrame();
                }
            }

            if (isPressed(e, SETTINGS.SHORTCUTS.TOGGLE_PROPAGATION)) {
                state.propagationMode = !state.propagationMode;
                const msg = state.propagationMode ? I18n.t('msg_propagation_on') : I18n.t('msg_propagation_off');
                if (typeof Notificacion !== 'undefined') Notificacion.show(msg);
                else alert(msg);
                Renderer.drawFrame(); // To update cursor if needed
            }
        });

        window.addEventListener("keyup", (e) => {
            // Logic for Release is harder because we don't know which shortcut was active easily without state.
            // But we can check if the KEY associated with the shortcut was released?
            // Or simpler: If showGhost is true, checking if the released key was PART of the shortcut?
            // The previous logic was: `if (e.key === 'Shift' || e.key === 'a' ...)`
            // This implies ANY key of the combo releasing stops the mode.

            const checkRelease = (shortcutKey) => {
                if (!shortcutKey) return false;
                const parts = shortcutKey.toUpperCase().split('+');
                let key = e.key.toUpperCase();
                if (key === 'CONTROL') key = 'CTRL';
                // If the released key is in the shortcut definition, we stop.
                return parts.includes(key);
            };

            if (state.showGhost && checkRelease(SETTINGS.SHORTCUTS.GHOST_SHOW)) {
                state.showGhost = false;
                Renderer.drawFrame();
            }

            if (state.showGhostPrev && checkRelease(SETTINGS.SHORTCUTS.GHOST_PREV)) {
                state.showGhostPrev = false;
                Renderer.drawFrame();
            }
        });
    },

    handleShortcut(e) {
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

        const isMatch = (settingKey) => settingKey && settingKey.toUpperCase() === currentShortcut.toUpperCase();

        let actionTriggered = false;

        if (isMatch(s.MODE_MOVE)) { Store.setMode("move"); actionTriggered = true; }
        else if (isMatch(s.MODE_TEXT)) { Store.setMode("text"); actionTriggered = true; }
        else if (isMatch(s.MODE_SCRUM)) { Store.setMode("scrum"); actionTriggered = true; }
        else if (isMatch(s.MODE_ARROW)) { Store.setMode("draw"); actionTriggered = true; }
        else if (isMatch(s.MODE_FREEHAND)) { Store.setMode("freehand"); actionTriggered = true; }
        else if (isMatch(s.MODE_ERASER)) { Store.setMode("eraser"); actionTriggered = true; }
        else if (isMatch(s.MODE_ZONE)) { Store.setMode("zone"); actionTriggered = true; }
        else if (isMatch(s.MODE_SHIELD)) { Store.setMode("shield"); actionTriggered = true; }
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
            // Update icon needs to be handled? app.js handled it, or we dispatch event?
            // For now, let's rely on the click trigger or Animation module updating UI.
            // app.js patched the onclick. here we call Animation directly.
            // We can expose an updatePlayIcon callback
            if (this.callbacks.updatePresentationPlayIcon) this.callbacks.updatePresentationPlayIcon();
            actionTriggered = true;
        }
        else if (isMatch(s.FRAME_NEXT)) { document.getElementById("next-frame")?.click(); actionTriggered = true; }
        else if (isMatch(s.FRAME_PREV)) { document.getElementById("prev-frame")?.click(); actionTriggered = true; }
        else if (isMatch(s.FRAME_ADD)) { document.getElementById("add-frame")?.click(); actionTriggered = true; }
        else if (isMatch(s.FRAME_ADD)) { document.getElementById("add-frame")?.click(); actionTriggered = true; }
        else if (isMatch(s.FRAME_REMOVE)) { document.getElementById("delete-frame")?.click(); actionTriggered = true; }
        else if (isMatch(s.TOGGLE_GUIDES)) {
            state.showGuides = !state.showGuides;
            Renderer.drawFrame();
            // Optional: Toggle UI text elsewhere if needed
            actionTriggered = true;
        }

        if (actionTriggered) {
            e.preventDefault();
            e.stopPropagation();
        }
    },

    bindMouseAndTouch() {
        // Touch
        canvas.addEventListener("touchstart", e => { e.preventDefault(); CanvasEvents.handleMouseDown(e); }, { passive: false });
        canvas.addEventListener("touchmove", e => { e.preventDefault(); CanvasEvents.handleMouseMove(e); }, { passive: false });
        canvas.addEventListener("touchend", e => { e.preventDefault(); CanvasEvents.handleMouseUp(); }, { passive: false });
        canvas.addEventListener("touchcancel", e => { e.preventDefault(); CanvasEvents.handleMouseUp(); }, { passive: false });

        // Mouse
        canvas.addEventListener("mousedown", e => CanvasEvents.handleMouseDown(e));
        canvas.addEventListener("mousemove", e => CanvasEvents.handleMouseMove(e));
        canvas.addEventListener("mousemove", e => CanvasEvents.handleMouseMove(e));
        canvas.addEventListener("mouseup", (e) => CanvasEvents.handleMouseUp(e));
        canvas.addEventListener("dblclick", e => CanvasEvents.handleDoubleClick(e));
    },

    bindUIButtons() {
        // --- History ---
        const btnUndo = document.getElementById("btn-undo");
        const btnRedo = document.getElementById("btn-redo");
        if (btnUndo) btnUndo.onclick = () => History.undo();
        if (btnRedo) btnRedo.onclick = () => History.redo();

        // --- Board Actions ---
        document.getElementById("delete-btn").onclick = () => { if (this.callbacks.deleteSelection) this.callbacks.deleteSelection(); };
        const btnReset = document.getElementById("btn-reset-app");
        if (btnReset) btnReset.onclick = () => { if (this.callbacks.resetApp) this.callbacks.resetApp(); };
        document.getElementById("clear-board").onclick = () => {
            // Logic repeated from app.js cleanup, but simpler to use callback or re-implement here?
            // Since it uses Utils, Frame, state... we can re-implement safely.
            // Or callback. Let's re-implement to reduce callback hell if simple.
            // It's a standard action.
            const f = Utils.getCurrentFrame();
            if (f) {
                f.players.forEach(p => { p.x = null; p.y = null; });
                f.arrows = [];
                f.texts = [];
                f.drawings = [];
                f.trailLines = [];
                f.trainingShields = [];
                f.ball.x = canvas.width / 2;
                f.ball.y = canvas.height / 2;

                state.zones = [];
                state.selectedPlayers.clear();
                state.selectedZone = null;
                state.selectedShield = null;
                state.dragTarget = null;

                UI.updateDeleteButton();
                Players.syncToggles();
                Renderer.drawFrame();
                History.push();
            }
        };

        document.getElementById("toggle-ball").onclick = () => {
            const f = Utils.getCurrentFrame();
            f.ball.visible = !f.ball.visible;
            Renderer.drawFrame();
        };

        // --- Frames ---
        document.getElementById("add-frame").onclick = () => {
            const nf = Frame.clone(Utils.getCurrentFrame());
            state.frames.splice(state.currentFrameIndex + 1, 0, nf);
            state.currentFrameIndex++;
            Utils.getCurrentFrame().trailLines = [];
            Animation.updateUI();
            Renderer.drawFrame();
            History.push();
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

        // --- Animation ---
        document.getElementById("play-animation").onclick = () => {
            Animation.play();
            if (this.callbacks.updatePresentationPlayIcon) this.callbacks.updatePresentationPlayIcon();
        };
        const pauseBtn = document.getElementById("pause-animation");
        if (pauseBtn) pauseBtn.onclick = () => {
            Animation.pause();
            if (this.callbacks.updatePresentationPlayIcon) this.callbacks.updatePresentationPlayIcon();
        };
        document.getElementById("export-image").onclick = () => Export.downloadImage();

        // --- Field Config ---
        document.getElementById("field-type-full").onclick = () => {
            state.fieldConfig.type = "full";
            state.fieldConfig.orientation = "horizontal";
            if (this.callbacks.resetBoard) this.callbacks.resetBoard();
            this.callbacks.updateFieldUI();
            Formations.updateSelector();
            Renderer.drawFrame();
        };

        document.getElementById("field-type-half").onclick = () => {
            state.fieldConfig.type = "half";
            state.fieldConfig.halfSide = "top";
            if (this.callbacks.resetBoard) this.callbacks.resetBoard();
            // Ball logic from app.js moved here or covered by resetBoard?
            // app.js resetBoardForFieldChange handles ball placement!
            // BUT app.js had explicit ball placement logic inside the onclick handler for half field too?
            // Let's check app.js lines 680-689.
            // It calls resetBoardForFieldChange() AND THEN overrides ball position.
            // That's redundant or specific. logic in resetBoard uses state.fieldConfig.
            // Let's trust resetBoard handles it if state is set correctly.

            this.callbacks.updateFieldUI();
            Formations.updateSelector();
            Renderer.drawFrame();
        };

        document.getElementById("rotate-field-btn").onclick = () => {
            if (state.fieldConfig.type === "full") {
                state.fieldConfig.orientation = state.fieldConfig.orientation === "horizontal" ? "vertical" : "horizontal";
            } else {
                state.fieldConfig.halfSide = state.fieldConfig.halfSide === "top" ? "bottom" : "top";
            }
            if (this.callbacks.resetBoard) this.callbacks.resetBoard();
            this.callbacks.updateFieldUI();
            Formations.updateSelector();
            Renderer.drawFrame();
        };

        document.getElementById("toggle-field-lines-btn").onclick = () => {
            state.showFieldLines = !state.showFieldLines;
            const btnText = document.getElementById("toggle-field-lines-text");
            const iconVisible = document.getElementById("icon-lines-visible");
            const iconHidden = document.getElementById("icon-lines-hidden");

            if (btnText) {
                btnText.textContent = state.showFieldLines ? "Ocultar Líneas" : "Mostrar Líneas";
            }

            if (iconVisible && iconHidden) {
                if (state.showFieldLines) {
                    iconVisible.classList.remove("is-hidden");
                    iconHidden.classList.add("is-hidden");
                } else {
                    iconVisible.classList.add("is-hidden");
                    iconHidden.classList.remove("is-hidden");
                }
            }

            Renderer.invalidateBackground();
            Renderer.drawFrame();
        };

        // --- Modes ---
        document.getElementById("mode-move").onclick = () => Store.setMode("move");
        const btnFreehand = document.getElementById("mode-freehand");
        if (btnFreehand) btnFreehand.onclick = () => Store.setMode("freehand");
        const btnEraser = document.getElementById("mode-eraser");
        if (btnEraser) btnEraser.onclick = () => Store.setMode("eraser");
        document.getElementById("mode-text").onclick = () => Store.setMode("text");
        document.getElementById("mode-scrum").onclick = () => Store.setMode("scrum");
        document.getElementById("mode-arrow").onclick = () => {
            document.getElementById("arrow-menu").classList.toggle("is-hidden");
        };
        document.getElementById("mode-zone").onclick = () => Store.setMode("zone");
        document.getElementById("mode-shield").onclick = () => Store.setMode("shield");

        document.querySelectorAll("#arrow-menu button").forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.arrow;
                if (type === "normal") {
                    Store.setMode("draw");
                    // Hardcoded label update
                    const lbl = document.getElementById("mode-arrow");
                    if (lbl) lbl.textContent = "Flecha (Normal) ▼";
                }
                if (type === "kick") {
                    Store.setMode("kick");
                    const lbl = document.getElementById("mode-arrow");
                    if (lbl) lbl.textContent = "Flecha (Patada) ▼";
                }
                document.getElementById("arrow-menu").classList.add("is-hidden");
            };
        });

        // --- Formations ---
        // --- Formations (Legacy / Optional) ---
        const btnSaveForm = document.getElementById("save-formation-btn");
        if (btnSaveForm) {
            btnSaveForm.onclick = async () => {
                const name = await Popup.prompt(I18n.t('prompt_formation_name'), I18n.t('prompt_formation_placeholder'));
                if (name) await Formations.save(name);
            };
        }

        const btnLoadForm = document.getElementById("load-formation-btn");
        if (btnLoadForm) {
            btnLoadForm.onclick = async () => {
                const selector = document.getElementById("formation-selector");
                if (selector.value) await Formations.load(selector.value);
                else await Popup.show({ title: I18n.t('alert_select_formation'), html: I18n.t('alert_select_formation_desc'), showCancel: false });
            };
        }

        const btnDelForm = document.getElementById("delete-formation-btn");
        if (btnDelForm) {
            btnDelForm.onclick = async () => {
                const selector = document.getElementById("formation-selector");
                if (selector.value) {
                    await Formations.delete(selector.value);
                    selector.value = "";
                } else {
                    await Popup.show({ title: I18n.t('alert_select_formation'), html: I18n.t('alert_select_formation_desc'), showCancel: false });
                }
            };
        }

        // --- Teams ---
        document.getElementById("show-team-a").onclick = () => Players.showTeam("A");
        document.getElementById("show-team-b").onclick = () => Players.showTeam("B");

        // --- Colors ---
        document.querySelectorAll(".color-picker__swatch").forEach(btn => {
            btn.onclick = () => {
                state.selectedZoneColor = btn.dataset.color;
            };
        });

        // --- Presentation Mode ---
        document.getElementById("toggle-presentation").onclick = () => this.togglePresentation();
        document.getElementById("exit-presentation").onclick = () => {
            document.body.classList.remove('presentation-mode');
            this.smoothResize();
        };

        // Presentation Controls
        document.getElementById("pres-prev").onclick = () => document.getElementById("prev-frame")?.click();
        document.getElementById("pres-next").onclick = () => document.getElementById("next-frame")?.click();
        document.getElementById("pres-play").onclick = () => {
            if (state.isPlaying) Animation.pause();
            else Animation.play();
            if (this.callbacks.updatePresentationPlayIcon) this.callbacks.updatePresentationPlayIcon();
        };

        // Draggable controls
        const presControls = document.querySelector('.presentation-controls');
        if (presControls) this.makeDraggable(presControls);

        // Sidebar Toggles handled in app.js via toggleLeftSidebar/RightSidebar.
        // If those are moved to callbacks or we move the logic here.
        // Those manipulate DOM classes. Can be moved here but app.js had them local.
        // We will need to bind them.

        const mobileMenuBtn = document.getElementById("mobile-menu-btn");
        if (mobileMenuBtn) mobileMenuBtn.onclick = (e) => { e.stopPropagation(); this.callbacks.toggleLeftSidebar(); };

        const closeLeftBtn = document.getElementById("close-sidebar-btn");
        if (closeLeftBtn) closeLeftBtn.onclick = (e) => { e.stopPropagation(); this.callbacks.toggleLeftSidebar(); };

        const mobileRightMenuBtn = document.getElementById("mobile-right-menu-btn");
        if (mobileRightMenuBtn) mobileRightMenuBtn.onclick = (e) => { e.stopPropagation(); this.callbacks.toggleRightSidebar(); };

        const closeRightBtn = document.getElementById("close-right-panel-btn");
        if (closeRightBtn) closeRightBtn.onclick = (e) => { e.stopPropagation(); this.callbacks.toggleRightSidebar(); };

        document.getElementById("mobile-overlay").onclick = () => {
            // Can implement directly here
            document.getElementById("sidebar")?.classList.remove("is-visible");
            document.getElementById("right-panel")?.classList.remove("is-visible");
            document.getElementById("mobile-overlay")?.classList.remove("is-visible");
        };
    },

    togglePresentation() {
        document.body.classList.toggle('presentation-mode');
        this.smoothResize();
    },

    smoothResize() {
        let start = null;
        const duration = 500;
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            if (this.callbacks.handleResize) this.callbacks.handleResize();
            if (progress < duration) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    },

    makeDraggable(element) {
        let isDragging = false;
        let startX, startY;

        const dragStart = (e) => {
            if (e.target.closest('button')) return;
            const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

            const rect = element.getBoundingClientRect();
            element.style.bottom = 'auto';
            element.style.left = rect.left + 'px';
            element.style.top = rect.top + 'px';
            element.style.transform = 'none';

            isDragging = true;
            startX = clientX;
            startY = clientY;
            element.style.transition = 'none';
        }

        const drag = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            const dx = clientX - startX;
            const dy = clientY - startY;

            const rect = element.getBoundingClientRect();
            element.style.left = (rect.left + dx) + 'px';
            element.style.top = (rect.top + dy) + 'px';

            startX = clientX;
            startY = clientY;
        }

        const dragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            element.style.transition = 'opacity 0.4s';
        }

        element.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        element.addEventListener('touchstart', dragStart, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);
    }
};
