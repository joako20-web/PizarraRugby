import { describe, it, expect, vi } from 'vitest';

// Mock dependencies BEFORE importing Utils
vi.mock('../js/core/dom.js', () => ({
    canvas: {
        width: 1000,
        height: 600,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 })
    }
}));

vi.mock('../js/core/state.js', () => ({
    state: {
        fieldConfig: { type: 'full', orientation: 'horizontal' },
        frames: [],
        currentFrameIndex: 0
    }
}));

vi.mock('../js/core/config.js', () => ({
    CONFIG: {
        MARGIN_X: 20,
        MARGIN_Y: 20,
        PANEL_Y_TOP: 45,
        NUM_PLAYERS: 15,
        PLAYER_SPACING: 50,
        TEAM_A_POSITION: 0.15,
        TEAM_B_POSITION: 0.85
    }
}));

// Now import target
import { calculateFieldDimensions, clampYToPlayableArea } from '../js/core/utils.js';

describe('Utils Logic', () => {

    describe('calculateFieldDimensions', () => {
        it('calculates full field horizontal dimensions correctly', () => {
            const w = 1000;
            const h = 600;
            const config = { type: 'full', orientation: 'horizontal' };

            const dims = calculateFieldDimensions(w, h, config);

            expect(dims.width).toBeGreaterThan(0);
            expect(dims.height).toBeGreaterThan(0);
            expect(dims.x).toBeGreaterThanOrEqual(0);
            expect(dims.y).toBeGreaterThanOrEqual(0);

            // Aspect ratio check (3/2 = 1.5)
            expect(dims.width / dims.height).toBeCloseTo(1.5);
        });

        it('calculates half field dimensions correctly', () => {
            const w = 1000;
            const h = 600;
            const config = { type: 'half', halfSide: 'top' };

            const dims = calculateFieldDimensions(w, h, config);

            // Should use full width minus margins
            expect(dims.width).toBe(1000 - 40); // 20 margin * 2
        });
    });

    describe('clampYToPlayableArea', () => {
        it('does not clamp in full mode', () => {
            // We need to mock state behavior or pass it, but clampYToPlayableArea imports state directly.
            // Since we mocked state.js above, we can rely on that, but we might need to modify the mock per test.
            // For now, let's skip complex state mocking integration and focus on pure function provided arguments if possible.
            // clampYToPlayableArea relies on GLOBAL state. This highlights the architectural issue!
            // BUT we can update the mock value in the test if we import the mocked state?
            // Managing state mocks in ES modules is tricky.
            // Let's assume the default mock is "full" so it returns Y as is.
            expect(clampYToPlayableArea(100)).toBe(100);
        });
    });
});
