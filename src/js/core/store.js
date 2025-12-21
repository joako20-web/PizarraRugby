import { state } from './state.js';
import { Renderer } from '../renderer/renderer.js';

export const Store = {
    // Getters for compatibility
    get state() { return state; },

    /**
     * Set the application mode
     * @param {string} mode - The new mode (move, text, scrum, draw, freehand, eraser, zone, shield)
     */
    setMode(mode) {
        state.mode = mode;
        state.arrowStart = null;
        state.previewArrow = null;

        // Notify UI about mode change (In a React/Vue world this would be computed)
        // For now, we manually trigger the UI update helper
        this.events.emit('modeChanged', mode);

        Renderer.drawFrame();
    },

    /**
     * Clear all selections
     */
    clearSelection() {
        state.selectedPlayers.clear();
        state.selectedZone = null;
        state.selectedShield = null;
        state.selectedText = null;
        state.selectedArrow = null;
        Renderer.drawFrame();
    },

    /**
     * Set the current drag target
     * @param {Object|null} target
     */
    setDragTarget(target) {
        state.dragTarget = target;
    },

    setDragOffset(x, y) {
        state.dragOffsetX = x;
        state.dragOffsetY = y;
    },

    /**
     * Select a specific entity and clear others
     * @param {string} type - 'player', 'zone', 'shield', 'text', 'arrow'
     * @param {Object} obj - The entity object
     * @param {boolean} multi - If true, adds to selection (only for players)
     */
    selectEntity(type, obj, multi = false) {
        // Clear others unless multi-select player
        if (!multi) {
            if (type !== 'player') state.selectedPlayers.clear();
            if (type !== 'zone') state.selectedZone = null;
            if (type !== 'shield') state.selectedShield = null;
            if (type !== 'text') state.selectedText = null;
            if (type !== 'arrow') state.selectedArrow = null;
        }

        switch (type) {
            case 'player':
                if (multi) {
                    if (state.selectedPlayers.has(obj)) state.selectedPlayers.delete(obj);
                    else state.selectedPlayers.add(obj);
                } else {
                    state.selectedPlayers.clear();
                    state.selectedPlayers.add(obj);
                }
                break;
            case 'zone': state.selectedZone = obj; break;
            case 'shield': state.selectedShield = obj; break;
            case 'text': state.selectedText = obj; break;
            case 'arrow': state.selectedArrow = obj; break;
        }

        // Notify UI (e.g. delete button visibility)
        this.events.emit('selectionChanged');
        Renderer.drawFrame();
    },

    startArrow(pos) {
        state.arrowStart = pos;
    },

    setPreviewArrow(arrow) {
        state.previewArrow = arrow;
        Renderer.drawFrame();
    },

    endArrow() {
        state.arrowStart = null;
        state.previewArrow = null;
        Renderer.drawFrame();
    },

    setDraggingShield(shield) {
        state.draggingShield = shield;
    },

    // Zone Creation state
    setZoneCreationState(start, end, pending) {
        if (start !== undefined) state.zoneStart = start;
        if (end !== undefined) state.zoneEnd = end;
        if (pending !== undefined) state.pendingZone = pending;
        Renderer.drawFrame();
    },

    addZone(zone) {
        state.zones.push(zone);
        state.pendingZone = null;
        state.zoneStart = null;
        state.zoneEnd = null;
        Renderer.drawFrame();
    },

    // Simple Event Bus for Store updates
    events: {
        listeners: {},
        on(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        },
        emit(event, payload) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(cb => cb(payload));
            }
        }
    }
};
