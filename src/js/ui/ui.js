import { state } from '../core/state.js';
import { SETTINGS } from '../core/settings.js';

// ==============================
// UTILIDADES DE UI
// ==============================
export const UI = {
    updateDeleteButton() {
        const deleteBtn = document.getElementById("delete-btn");
        const resetBtn = document.getElementById("reset-player-btn");

        const hasSelection = state.selectedShield || state.selectedZone || state.selectedText || state.selectedArrow || (state.selectedPlayers && state.selectedPlayers.size > 0);
        const hasPlayerSelection = state.selectedPlayers && state.selectedPlayers.size > 0;

        if (hasSelection) {
            deleteBtn.classList.remove("is-hidden");
        } else {
            deleteBtn.classList.add("is-hidden");
        }

        if (resetBtn) {
            if (hasPlayerSelection) {
                resetBtn.classList.remove("is-hidden");
            } else {
                resetBtn.classList.add("is-hidden");
            }
        }
    },

    updateResetButtonVisibility(historyLength) {
        const btn = document.getElementById("btn-reset-app");
        if (btn) {
            // Show if history has more than the initial state (length > 1) 
            // or if user is not at the start (currentIndex > 0)
            // But checking length > 1 is a good proxy for "has changes".
            if (historyLength > 1) {
                btn.classList.remove("is-hidden");
            } else {
                btn.classList.add("is-hidden");
            }
        }
    },

    applyLayout() {
        const ui = SETTINGS.UI;
        if (!ui) return;

        // 1. Sidebar Position
        const main = document.getElementById("main");
        const sidebar = document.getElementById("sidebar"); // Herramientas
        const rightPanel = document.getElementById("right-panel"); // Animación

        if (main && sidebar) {
            // Migration safety
            const toolsPos = ui.toolsPanelPosition || 'left';
            const animPos = ui.animationPanelPosition || 'right';

            // Default Orders
            // Main Canvas = 10
            main.style.order = "10";

            // Logic:
            // Left items: 0-9
            // Right items: 11-20

            let toolsOrder = toolsPos === 'left' ? 1 : 11;
            let animOrder = animPos === 'left' ? 2 : 12;

            // Conflict resolution if order same?
            // Not really needed if we just separate them by 1. 
            // If both left: Tools(1), Anim(2) -> Tools is leftmost? Or Anim?
            // User didn't specify preference on stacking order, but typically tools first is good.
            // Let's refine:
            if (toolsPos === 'left' && animPos === 'left') {
                toolsOrder = 1;
                animOrder = 2; // Anim inside of Tools
            } else if (toolsPos === 'right' && animPos === 'right') {
                toolsOrder = 12; // Tools outside
                animOrder = 11; // Anim inside (closer to canvas)
            }

            sidebar.style.order = toolsOrder;
            if (rightPanel) rightPanel.style.order = animOrder;

            // Borders
            // Tools Panel
            if (toolsPos === 'right') {
                sidebar.style.borderRight = "none";
                sidebar.style.borderLeft = "1px solid var(--border-color)";
            } else {
                sidebar.style.borderRight = "1px solid var(--border-color)";
                sidebar.style.borderLeft = "none";
            }

            // Anim Panel
            if (rightPanel) {
                if (animPos === 'left') {
                    rightPanel.style.borderRight = "1px solid var(--border-color)";
                    rightPanel.style.borderLeft = "none";
                } else {
                    rightPanel.style.borderRight = "none";
                    rightPanel.style.borderLeft = "1px solid var(--border-color)";
                }
            }
        }

        // 2. Button Positioning and Icons
        const toolsBtn = document.getElementById("mobile-menu-btn");
        const animBtn = document.getElementById("mobile-right-menu-btn");
        const closeToolsBtn = document.getElementById("close-sidebar-btn");
        const closeAnimBtn = document.getElementById("close-right-panel-btn");

        // Helper to update Close Button Icon
        const setCloseIcon = (btn, direction) => {
            if (!btn) return;
            const svg = btn.querySelector("svg");
            if (svg) {
                // Chevron Left: M15 19l-7-7 7-7
                // Chevron Right: M9 5l7 7-7 7
                const path = direction === 'left' ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7";
                svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="${path}" />`;
            }
        };

        // Helper to update Open Button Position
        const setOpenBtnPos = (btn, side) => {
            if (!btn) return;
            if (side === 'left') {
                btn.classList.add("mobile-nav-btn--left");
                btn.classList.remove("mobile-nav-btn--right");
            } else {
                btn.classList.add("mobile-nav-btn--right");
                btn.classList.remove("mobile-nav-btn--left");
            }
        };

        const toolsPos = ui.toolsPanelPosition || 'left';
        const animPos = ui.animationPanelPosition || 'right';

        // Update Open Buttons classes
        setOpenBtnPos(toolsBtn, toolsPos);
        setOpenBtnPos(animBtn, animPos);

        // Update Close Buttons icons based on where the panel IS
        // If panel is LEFT, close button should point LEFT (<)
        // If panel is RIGHT, close button should point RIGHT (>)
        // ...Wait, standard UI pattern:
        // Sidebar on Left -> Close button points LEFT (<) to collapse it into the left.
        // Sidebar on Right -> Close button points RIGHT (>) to collapse it into the right.
        setCloseIcon(closeToolsBtn, toolsPos);
        setCloseIcon(closeAnimBtn, animPos);

        // Handle Overlap (if both on same side)
        if (toolsBtn && animBtn) {
            // Reset tops
            toolsBtn.style.top = "";
            animBtn.style.top = "";

            if (toolsPos === animPos) {
                // Determine order. We established in Layout 1 that:
                // If both LEFT: Tools(1), Anim(2). Tools is "outer" visually? 
                // Let's just separate them vertically.
                // Standard is 50%. Let's do 45% and 55%.
                toolsBtn.style.top = "42%";
                animBtn.style.top = "58%";
            }
        }

        // 2. Tool Visibility
        const toolMap = {
            move: "mode-move",
            freehand: "mode-freehand",
            eraser: "mode-eraser",
            text: "mode-text",
            scrum: "mode-scrum",
            arrow: "mode-arrow",
            zone: "mode-zone",
            shield: "mode-shield"
        };

        for (const [key, id] of Object.entries(toolMap)) {
            const btn = document.getElementById(id);
            if (btn) {
                // Determine if visible
                // Link Eraser to Freehand visibility
                let isVisible;
                if (key === 'eraser') {
                    isVisible = ui.visibleTools['freehand'] !== false;
                } else {
                    isVisible = ui.visibleTools[key] !== false;
                }

                if (isVisible) {
                    btn.classList.remove("is-hidden");
                    btn.style.display = ""; // Reset inline display if any

                    // Special case for eraser flex container parent if needed?
                    // The eraser button is inside a flex div with freehand.
                    // If BOTH are hidden, we might want to hide the container, or just the buttons.
                    // If we hide the button with display:none, flex layout adapts.
                    if (key === 'eraser' || key === 'freehand') {
                        if (btn.parentElement.tagName === 'DIV' && btn.parentElement.style.display === 'flex') {
                            // Let flex handle it. If hidden, it takes 0 space.
                            btn.style.display = isVisible ? "" : "none";
                        }
                    }
                } else {
                    btn.classList.add("is-hidden");
                    btn.style.display = "none";
                }
            }
        }
    }
};
