import { state } from '../core/state.js';

// ==============================
// UTILIDADES DE UI
// ==============================
export const UI = {
    updateDeleteButton() {
        const deleteBtn = document.getElementById("delete-btn");
        const hasSelection = state.selectedShield || state.selectedZone || state.selectedText || state.selectedArrow;

        if (hasSelection) {
            deleteBtn.classList.remove("is-hidden");
        } else {
            deleteBtn.classList.add("is-hidden");
        }
    }
};
