
import { Animation } from '../features/animation.js';
import { I18n } from '../core/i18n.js';
import { CONFIG } from '../core/config.js';

export const ExportUI = {
    init() {
        this.modal = document.getElementById('export-modal');
        this.filenameInput = document.getElementById('export-filename');
        this.resolutionSelect = document.getElementById('export-resolution');
        this.fpsSelect = document.getElementById('export-fps');
        this.qualitySelect = document.getElementById('export-quality');
        this.cancelBtn = document.getElementById('export-cancel');
        this.confirmBtn = document.getElementById('export-confirm');
        this.videoExportBtn = document.getElementById('export-webm');

        // Speed Control
        this.speedInput = document.getElementById('playback-speed');
        this.speedDisplay = document.getElementById('speed-display');

        this.bindEvents();
    },

    bindEvents() {
        if (this.videoExportBtn) {
            // Override default behavior
            this.videoExportBtn.onclick = (e) => {
                e.stopImmediatePropagation(); // Stop Animation.exportWebM from firing if attached
                this.open();
            };
            // Also need to make sure we remove old listener or just replace it. 
            // In app.js we assigned onclick. If we assign it again here after app.js runs (if module loaded later), it overwrites.
            // But app.js imports this module? No, I need to import it in app.js and init it.
        }

        if (this.cancelBtn) {
            this.cancelBtn.onclick = () => this.close();
        }

        if (this.confirmBtn) {
            this.confirmBtn.onclick = () => {
                const options = {
                    filename: this.filenameInput.value || 'animation',
                    resolution: this.resolutionSelect.value,
                    fps: parseInt(this.fpsSelect.value),
                    quality: this.qualitySelect.value
                };
                Animation.exportAdvanced(options);
                this.close();
            };
        }

        if (this.speedInput) {
            this.speedInput.oninput = (e) => {
                const val = parseFloat(e.target.value);
                CONFIG.PLAYBACK_SPEED = val;
                if (this.speedDisplay) this.speedDisplay.textContent = val + 'x';
            };
        }
    },

    open() {
        if (this.modal) {
            // Set default filename
            this.filenameInput.value = I18n.t ? (I18n.t('default_animation_name') || 'Animación') : 'Animación';
            this.modal.classList.remove('is-hidden');
        }
    },

    close() {
        if (this.modal) this.modal.classList.add('is-hidden');
    }
};
