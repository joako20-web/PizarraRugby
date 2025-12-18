import { state } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { canvas } from '../core/dom.js';
import { Renderer } from '../renderer/renderer.js';
import { Notificacion } from '../ui/notifications.js';
import { Popup } from '../ui/popup.js';

// ==============================
// ANIMACIÓN
// ==============================
export const Animation = {
    updateUI() {
        const frameIndexEl = document.getElementById("current-frame-index");
        const totalFramesEl = document.getElementById("total-frames");

        if (frameIndexEl) frameIndexEl.textContent = state.currentFrameIndex + 1;
        if (totalFramesEl) totalFramesEl.textContent = state.frames.length;
    },

    async play() {
        if (state.isPlaying || state.frames.length < 2) return;
        state.isPlaying = true;
        state.cancelPlay = false;

        // Guardar y limpiar todas las líneas de trayectoria temporalmente
        const savedTrailLines = state.frames.map(f => f.trailLines);
        state.frames.forEach(f => f.trailLines = []);

        for (let i = 0; i < state.frames.length - 1; i++) {
            if (state.cancelPlay) break;

            await this._interpolateBetweenFrames(state.frames[i], state.frames[i + 1]);

            state.currentFrameIndex = i + 1;
            this.updateUI();
        }

        // Restaurar las líneas de trayectoria
        state.frames.forEach((f, i) => f.trailLines = savedTrailLines[i]);
        Renderer.drawFrame();
        state.isPlaying = false;
        state.cancelPlay = false;
    },

    stop() {
        state.cancelPlay = true;
    },

    /**
     * Interpola y dibuja los frames entre dos frames dados
     * @param {Object} frameA - Frame inicial
     * @param {Object} frameB - Frame final
     * @returns {Promise<void>}
     * @private
     */
    async _interpolateBetweenFrames(frameA, frameB) {
        for (let step = 0; step <= CONFIG.INTERP_STEPS; step++) {
            if (state.cancelPlay) break;

            const t = step / CONFIG.INTERP_STEPS;
            Renderer.drawInterpolatedFrame(frameA, frameB, t);

            await new Promise(resolve =>
                setTimeout(resolve, CONFIG.INTERP_DURATION / CONFIG.INTERP_STEPS)
            );
        }
    },

    async exportWebM() {
        if (state.frames.length < 2) {
            Notificacion.show("No puedes exportar un video con un solo frame. Añade más frames para crear una animación.");
            return;
        }

        // Pedir nombre
        const nombre = await Popup.prompt("Nombre del archivo:", "Mi animacion");
        if (!nombre) return;

        const fileName = nombre + ".mp4";

        const stream = canvas.captureStream(30);
        const chunks = [];

        // Intentar usar formato MP4 compatible, con fallback a WebM
        let mimeType = "video/webm;codecs=vp9";
        let videoType = "video/webm";

        if (MediaRecorder.isTypeSupported("video/mp4")) {
            mimeType = "video/mp4";
            videoType = "video/mp4";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
            mimeType = "video/webm;codecs=h264";
            videoType = "video/mp4";
        }

        const rec = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 8000000
        });

        rec.ondataavailable = e => chunks.push(e.data);
        rec.onstop = () => {
            const blob = new Blob(chunks, { type: videoType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        };

        // Guardar y limpiar todas las líneas de trayectoria temporalmente
        const savedTrailLines = state.frames.map(f => f.trailLines);
        state.frames.forEach(f => f.trailLines = []);

        rec.start();

        // Pausa inicial de 1.5 segundos - comenzar desde el primer frame
        state.currentFrameIndex = 0;
        this.updateUI();
        Renderer.drawFrame();
        await new Promise(r => setTimeout(r, 1500));

        // Animación
        for (let i = 0; i < state.frames.length - 1; i++) {
            await this._interpolateBetweenFrames(state.frames[i], state.frames[i + 1]);
        }

        // Pausa final de 1.5 segundos
        state.currentFrameIndex = state.frames.length - 1;
        this.updateUI();
        Renderer.drawFrame();
        await new Promise(r => setTimeout(r, 1500));

        rec.stop();

        // Restaurar las líneas de trayectoria
        state.frames.forEach((f, i) => f.trailLines = savedTrailLines[i]);
        Renderer.drawFrame();
    }
};
