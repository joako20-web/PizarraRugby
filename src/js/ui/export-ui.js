
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
        // Removed advanced controls (resolution, fps, quality) as they are now in Global Settings


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
                const filename = this.filenameInput.value || 'animation';

                // Get settings from Global Config
                const exportSettings = SETTINGS.EXPORT || { RESOLUTION: '1080p', FPS: 30, BITRATE: 8 };

                const options = {
                    filename: filename,
                    resolution: exportSettings.RESOLUTION,
                    fps: exportSettings.FPS,
                    bitrate: exportSettings.BITRATE * 1000000 // Convert Mbps to bps
                };

                Animation.exportAdvanced(options);
                this.close();
            };
        }

        // Removed speed/quality listeners
    },

    open() {
        if (this.modal) {
            // Set default filename
            this.filenameInput.value = I18n.t ? (I18n.t('default_animation_name') || 'Animación') : 'Animación';

            // Note: Resolution/FPS/Bitrate are now read from SETTINGS.EXPORT at export time.
            this.modal.classList.remove('is-hidden');
        }
    },

    close() {
        if (this.modal) this.modal.classList.add('is-hidden');
    }
};
