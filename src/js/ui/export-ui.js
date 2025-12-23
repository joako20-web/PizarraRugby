
import { Animation } from '../features/animation.js';
import { I18n } from '../core/i18n.js';
import { CONFIG } from '../core/config.js';
import { SETTINGS } from '../core/settings.js';

export const ExportUI = {
    init() {
        this.modal = document.getElementById('export-modal');
        // We might need to rebuild the modal HTML here if it was hardcoded with selectors,
        // or just hide the elements we don't want to show.
        // Given existing HTML is likely hardcoded in index.html (or injected?), we should check where it comes from.
        // Assuming it's in index.html, we should probably hide the advanced controls via CSS or style.display.

        this.filenameInput = document.getElementById('export-filename');
        this.resolutionSelect = document.getElementById('export-resolution');
        this.fpsSelect = document.getElementById('export-fps');
        this.qualitySelect = document.getElementById('export-quality');

        // Hide advanced controls container if possible, or individual elements
        // Let's hide the parents of these controls if they exist
        if (this.resolutionSelect) this.resolutionSelect.parentElement.style.display = 'none';
        if (this.fpsSelect) this.fpsSelect.parentElement.style.display = 'none';
        if (this.qualitySelect) this.qualitySelect.parentElement.style.display = 'none';

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
        }

        if (this.cancelBtn) {
            this.cancelBtn.onclick = () => this.close();
        }

        if (this.confirmBtn) {
            this.confirmBtn.onclick = () => {
                // Use settings or defaults
                const s = SETTINGS.EXPORT || { RESOLUTION: '2k', FPS: 60, BITRATE: 20 };

                // Convert simple bitrate number to bps for exportAdvanced logic
                // In exportAdvanced: bitrate = qualityMap[quality] || 8000000;
                // We need to pass a "quality" string? Or modified export logic?
                // Animation.js expects 'quality': 'standard' | 'high' | 'ultra' OR we can modify it to accept explicit bitrate.
                // Let's modify the Animation.js call to pass bitrate directly or modify Animation.js logic.
                // Actually exportAdvanced uses "options.quality" mapped to numbers.
                // Let's pass the raw bitrate and update Animation.js to use it if present.

                const options = {
                    filename: this.filenameInput.value || 'animation',
                    resolution: s.RESOLUTION,
                    fps: s.FPS,
                    bitrate: s.BITRATE * 1000000 // Convert Mbps to bps
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
