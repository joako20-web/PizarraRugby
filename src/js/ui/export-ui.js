
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

        // Advanced controls are now visible by default


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
                // Get values from UI
                const resolution = this.resolutionSelect ? this.resolutionSelect.value : '1920x1080';
                const fps = this.fpsSelect ? parseInt(this.fpsSelect.value) : 30;
                const quality = this.qualitySelect ? this.qualitySelect.value : 'high';
                const filename = this.filenameInput.value || 'animation';

                // Map quality to bitrate
                let bitrate = 8000000;
                const qualityMap = {
                    'whatsapp': 4500000,
                    'standard': 5000000,
                    'high': 8000000,
                    'ultra': 15000000,
                    'master': 18000000
                };
                if (qualityMap[quality]) bitrate = qualityMap[quality];

                // Update SETTINGS for next time
                SETTINGS.EXPORT = {
                    RESOLUTION: resolution,
                    FPS: fps,
                    BITRATE: bitrate / 1000000
                };

                const options = {
                    filename: filename,
                    resolution: resolution,
                    fps: fps,
                    bitrate: bitrate
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
        if (this.qualitySelect) {
            this.qualitySelect.onchange = () => {
                if (this.qualitySelect.value === 'whatsapp') {
                    // Force settings friendly for WhatsApp
                    if (this.resolutionSelect) this.resolutionSelect.value = '1920x1080'; // 1080p is generally safe, 720p safer. Let's try 1080p
                    if (this.fpsSelect) this.fpsSelect.value = '30';
                }
            };
        }
    },

    open() {
        if (this.modal) {
            // Set default filename
            this.filenameInput.value = I18n.t ? (I18n.t('default_animation_name') || 'Animación') : 'Animación';

            // Restore settings if available
            if (SETTINGS.EXPORT) {
                if (this.resolutionSelect) this.resolutionSelect.value = SETTINGS.EXPORT.RESOLUTION;
                if (this.fpsSelect) this.fpsSelect.value = SETTINGS.EXPORT.FPS;

                // Map bitrate back to quality string roughly
                if (this.qualitySelect && SETTINGS.EXPORT.BITRATE) {
                    const b = SETTINGS.EXPORT.BITRATE;
                    if (b >= 25) this.qualitySelect.value = 'master';
                    else if (b >= 15) this.qualitySelect.value = 'ultra';
                    else if (b >= 8) this.qualitySelect.value = 'high';
                    else this.qualitySelect.value = 'standard';
                }
            }

            this.modal.classList.remove('is-hidden');
        }
    },

    close() {
        if (this.modal) this.modal.classList.add('is-hidden');
    }
};
