import { state } from '../core/state.js';


import { Renderer } from '../renderer/renderer.js';
import { Players } from './players.js';
import { Animation } from './animation.js';
import { UI } from '../ui/ui.js';

export const History = {
    stack: [],
    currentIndex: -1,
    maxSize: 50,
    active: false,
    STORAGE_KEY: 'pizarra-rugby-session',
    onStateRestored: null, // Callback para actualizar UI externa

    init() {
        // Intentar cargar sesión previa
        if (this.loadFromLocalStorage()) {
            console.log('Session restored');
            this.push(); // Guardar punto de restauración inicial
        } else {
            this.push();
            this.updateButtonsUI({});
        }
        console.log('History system initialized');
    },

    push() {
        if (this.active) return; // Don't record history while restoring history

        // Remove future states if we are in the middle of the stack
        if (this.currentIndex < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.currentIndex + 1);
        }

        // Snapshot
        const snapshot = JSON.stringify({
            frames: state.frames,
            currentFrameIndex: state.currentFrameIndex,
            // We might want to save fieldConfig too if that's considered an undoable action
            fieldConfig: state.fieldConfig
        });

        this.stack.push(snapshot);

        // Limit size
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        } else {
            this.currentIndex++;
        }

        this.saveToLocalStorage(snapshot);
        this.updateButtonsUI();
    },

    undo() {
        if (this.currentIndex > 0) {
            this.active = true;
            this.currentIndex--;
            this.restore(this.stack[this.currentIndex]);
            this.active = false;
            this.updateButtonsUI();

            // Visual feedback
            Renderer.drawFrame();
        }
    },

    redo() {
        if (this.currentIndex < this.stack.length - 1) {
            this.active = true;
            this.currentIndex++;
            this.restore(this.stack[this.currentIndex]);
            this.active = false;
            this.updateButtonsUI();

            // Visual feedback
            Renderer.drawFrame();
        }
    },

    restore(snapshotJSON) {
        try {
            const data = JSON.parse(snapshotJSON);

            // Restore Frames
            // We need to re-hydrate/ensure correct references if objects have methods?
            // Since Frame is POJO-like in this app (mostly), direct assignment works, 
            // BUT Frame.clone logic might be cleaner. 
            // For now, simple object assignment usually works for this data structure.
            state.frames = data.frames;
            state.currentFrameIndex = data.currentFrameIndex;

            // Restore Field Config
            if (data.fieldConfig) {
                state.fieldConfig = data.fieldConfig;
                // We might need to trigger UI updates for field config buttons
                // This is a dependency on app logic, might need an event
                // For now, basic assignment.
            }

            // Sync UI components
            if (typeof Players !== 'undefined') Players.syncToggles();
            if (typeof Animation !== 'undefined') Animation.updateUI();

            // Callback para UI global (configuración de campo, etc)
            if (this.onStateRestored) this.onStateRestored();

        } catch (e) {
            console.error('History: Failed to restore state', e);
        }
    },

    updateButtonsUI() {
        const btnUndo = document.getElementById('btn-undo');
        const btnRedo = document.getElementById('btn-redo');

        if (btnUndo) {
            btnUndo.disabled = this.currentIndex <= 0;
            if (btnUndo.disabled) btnUndo.classList.add('is-disabled');
            else btnUndo.classList.remove('is-disabled');
        }

        if (btnRedo) {
            btnRedo.disabled = this.currentIndex >= this.stack.length - 1;
            if (btnRedo.disabled) btnRedo.classList.add('is-disabled');
            else btnRedo.classList.remove('is-disabled');
        }

        // Update global Reset button visibility
        if (UI && UI.updateResetButtonVisibility) {
            UI.updateResetButtonVisibility(this.stack.length);
        }
    },

    saveToLocalStorage(snapshotJSON) {
        try {
            localStorage.setItem(this.STORAGE_KEY, snapshotJSON);
        } catch (e) {
            console.error('Failed to save session', e);
        }
    },

    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.restore(stored);
                return true;
            }
        } catch (e) {
            console.error('Failed to load session', e);
        }
        return false;
    },

    clear() {
        this.stack = [];
        this.currentIndex = -1;
        this.active = false;
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear session', e);
        }
        this.updateButtonsUI();
    }
};
