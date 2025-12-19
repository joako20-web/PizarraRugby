import { state } from '../core/state.js';
import { Renderer } from '../renderer/renderer.js';

// ==============================
// MODOS
// ==============================
export const Mode = {
    set(m) {
        state.mode = m;
        state.arrowStart = null;
        state.previewArrow = null;

        document.querySelectorAll("#sidebar button")
            .forEach(b => b.classList.remove("is-active"));

        if (m === "move") {
            const btn = document.getElementById("mode-move");
            if (btn) btn.classList.add("is-active");
        }
        if (m === "text") {
            const btn = document.getElementById("mode-text");
            if (btn) btn.classList.add("is-active");
        }
        if (m === "scrum") {
            const btn = document.getElementById("mode-scrum");
            if (btn) btn.classList.add("is-active");
        }
        if (m === "shield") {
            const btn = document.getElementById("mode-shield");
            if (btn) btn.classList.add("is-active");
        }
        if (m === "freehand") {
            const btn = document.getElementById("mode-freehand");
            if (btn) btn.classList.add("is-active");
        }
        if (m === "eraser") {
            const btn = document.getElementById("mode-eraser");
            if (btn) btn.classList.add("is-active");
        }

        const zonePanel = document.getElementById("zone-color-panel");
        if (zonePanel) {
            if (m === "zone") {
                zonePanel.classList.remove("is-hidden");
            } else {
                zonePanel.classList.add("is-hidden");
            }
        }

        Renderer.drawFrame();
    }
};
