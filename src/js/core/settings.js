export const DEFAULT_SHORTCUTS = {
    MODE_MOVE: 'v',
    MODE_TEXT: 't',
    MODE_SCRUM: 'm',
    MODE_ARROW: 'a',
    MODE_ZONE: 'z',
    MODE_FREEHAND: 'f',
    MODE_ERASER: 'e',
    MODE_SHIELD: 'h',
    TOGGLE_BALL: 'b',
    PRESENTATION_MODE: 'p',
    ANIMATION_PLAY: 'Space',
    FRAME_PREV: 'ArrowLeft',
    FRAME_NEXT: 'ArrowRight',
    FRAME_ADD: '+',
    FRAME_REMOVE: '-',
    TOGGLE_GUIDES: 'Ctrl+.'
};

export const SETTINGS = {
    TEAM_A_COLOR: '#0000ff',
    TEAM_B_COLOR: '#ff0000',
    TEAM_A_NAME: 'Equipo A',
    TEAM_B_NAME: 'Equipo B',
    THEME: 'dark', // 'dark' or 'light'
    PLAYER_SCALE: 1.0,
    SHOW_NUMBERS: true,
    BALL_SCALE: 1.0,

    SHORTCUTS: { ...DEFAULT_SHORTCUTS },
    EXPORT: {
        RESOLUTION: '2k', // 'current', '1080p', '2k', '4k'
        FPS: 60,          // 30, 60
        BITRATE: 20       // Mbps
    },
    UI: {
        toolsPanelPosition: 'left',
        animationPanelPosition: 'right',
        visibleTools: {
            move: true,
            freehand: true,
            eraser: true,
            text: true,
            scrum: true,
            arrow: true,
            zone: true,
            shield: true
        }
    }
};
