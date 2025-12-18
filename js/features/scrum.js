import { Utils } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
import { state } from '../core/state.js';
import { Popup } from '../ui/popup.js';
import { Renderer } from '../renderer/renderer.js';
import { Players } from './players.js';
import { Mode } from './mode.js';

// ==============================
// MELÉ
// ==============================
export const Scrum = {
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
