import { describe, it, expect, vi, beforeEach } from 'vitest';

const { stateMock, drawFrameMock } = vi.hoisted(() => {
    return {
        stateMock: {
            mode: 'move',
            selectedPlayers: new Set(),
            selectedZone: null,
            selectedShield: null,
            selectedText: null, // Added missing props
            selectedArrow: null, // Added missing props
            arrowStart: null,
            previewArrow: null
        },
        drawFrameMock: vi.fn()
    };
});

// Mock Dependencies
vi.mock('../js/core/state.js', () => ({
    state: stateMock
}));

vi.mock('../js/renderer/renderer.js', () => ({
    Renderer: {
        drawFrame: drawFrameMock
    }
}));

// Import Store AFTER mocks
import { Store } from '../js/core/store.js';

describe('Store', () => {
    beforeEach(() => {
        // Reset state and mocks
        stateMock.mode = 'move';
        stateMock.arrowStart = 'data';
        stateMock.previewArrow = 'data';
        stateMock.selectedPlayers = new Set(['p1']);
        stateMock.selectedZone = 'z1';
        drawFrameMock.mockClear();
    });

    describe('setMode', () => {
        it('updates mode in state', () => {
            Store.setMode('kick');
            expect(stateMock.mode).toBe('kick');
        });

        it('clears arrow temporary data', () => {
            Store.setMode('move');
            expect(stateMock.arrowStart).toBeNull();
            expect(stateMock.previewArrow).toBeNull();
        });

        it('calls Renderer.drawFrame', () => {
            Store.setMode('text');
            expect(drawFrameMock).toHaveBeenCalled();
        });

        it('emits modeChanged event', () => {
            const listener = vi.fn();
            Store.events.on('modeChanged', listener);

            Store.setMode('scrum');

            expect(listener).toHaveBeenCalledWith('scrum');
        });
    });

    describe('clearSelection', () => {
        it('clears all selected items', () => {
            // Setup dirty state
            stateMock.selectedPlayers.add('p1');
            stateMock.selectedZone = 'z1';

            Store.clearSelection();

            expect(stateMock.selectedPlayers.size).toBe(0);
            expect(stateMock.selectedZone).toBeNull();
            expect(stateMock.selectedShield).toBeNull();
        });

        it('calls Renderer.drawFrame', () => {
            Store.clearSelection();
            expect(drawFrameMock).toHaveBeenCalled();
        });
    });
});
