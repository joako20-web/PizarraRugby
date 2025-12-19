import { describe, it, expect, vi } from 'vitest';

// Mock DOM to avoid document access
vi.mock('../src/js/core/dom.js', () => ({
    canvas: {
        width: 800,
        height: 600,
        getContext: () => ({})
    }
}));

// Mock Config because frame.js uses it
vi.mock('../src/js/core/config.js', () => ({
    CONFIG: {
        NUM_PLAYERS: 15,
        PLAYER_RADIUS: 20,
        BALL_RX: 10,
        BALL_RY: 10
    }
}));

import { Frame } from '../src/js/model/frame.js';

describe('Frame Model', () => {
    it('should create a frame with correct structure', () => {
        const frame = Frame.create();
        expect(frame).toHaveProperty('players');
        expect(frame).toHaveProperty('ball');
        expect(frame.players.length).toBe(30); // 15 * 2
        expect(frame.ball.visible).toBe(true);
        expect(frame.arrows).toEqual([]);
    });

    it('should clone a frame correctly', () => {
        const frame = Frame.create();
        frame.ball.x = 100;
        const cloned = Frame.clone(frame);

        expect(cloned.ball.x).toBe(100);
        expect(cloned).not.toBe(frame); // reference check
        expect(cloned.ball).not.toBe(frame.ball); // deep copy check
        expect(cloned.players[0]).not.toBe(frame.players[0]); // deep copy check for players
    });
});
