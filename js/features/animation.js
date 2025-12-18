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
        const playBtn = document.getElementById("play-animation");
        const pauseBtn = document.getElementById("pause-animation");

        if (frameIndexEl) frameIndexEl.textContent = state.currentFrameIndex + 1;
        if (totalFramesEl) totalFramesEl.textContent = state.frames.length;

        // Toggle buttons visibility based on state
        if (state.isPlaying) {
            if (playBtn) playBtn.classList.add("is-hidden");
            if (pauseBtn) pauseBtn.classList.remove("is-hidden");
        } else {
            if (playBtn) playBtn.classList.remove("is-hidden");
            if (pauseBtn) pauseBtn.classList.add("is-hidden");
        }
    },

    async play() {
        if (state.isPlaying && !state.isPaused) return; // Already playing
        if (state.frames.length < 2) return;

        state.isPlaying = true;
        state.cancelPlay = false; // Reset cancel flag
        state.isPaused = false; // Reset pause flag

        this.updateUI();

        // Guardar las líneas de trayectoria solo si empezamos desde el principio o no estábamos pausados
        if (!state.isPaused && state.currentFrameIndex === 0) {
            state.savedTrailLines = state.frames.map(f => f.trailLines);
            state.frames.forEach(f => f.trailLines = []);
        } else if (!state.savedTrailLines) {
            // Fallback safety
            state.savedTrailLines = state.frames.map(f => f.trailLines);
            state.frames.forEach(f => f.trailLines = []);
        }

        // Determine start index:
        // If paused, resume from current index.
        // If finished or stopped, start from 0 (or current if user manually moved? usually 0 for full play)
        // Let's assume 'Play' always plays from current Frame to end.
        let startIndex = state.currentFrameIndex;
        if (startIndex >= state.frames.length - 1) {
            startIndex = 0;
            state.currentFrameIndex = 0;
        }

        for (let i = startIndex; i < state.frames.length - 1; i++) {
            if (state.cancelPlay) break;
            if (state.isPaused) break;

            await this._interpolateBetweenFrames(state.frames[i], state.frames[i + 1]);

            // Only increment if we finished the interpolation successfully (not canceled/paused mid-way)
            if (!state.cancelPlay && !state.isPaused) {
                state.currentFrameIndex = i + 1;
                this.updateUI();
            }
        }

        // If loop finished naturally (not paused/canceled)
        if (!state.cancelPlay && !state.isPaused) {
            this.stop(true); // Stop but reset to start? Or just stop at end?
            // Usually stop resets or stays at end. Let's stay at end but reset state.
            state.isPlaying = false;
            // Restore trails
            if (state.savedTrailLines) {
                state.frames.forEach((f, i) => f.trailLines = state.savedTrailLines[i]);
                state.savedTrailLines = null;
            }
            Renderer.drawFrame();
            this.updateUI();
        }
    },

    pause() {
        if (state.isPlaying) {
            state.isPaused = true;
            state.isPlaying = false; // UI updates to "Play"
            this.updateUI();
        }
    },

    stop(finished = false) {
        state.cancelPlay = true;
        state.isPlaying = false;
        state.isPaused = false;

        if (!finished) {
            // If manually stopped, reset to 0 or leave at current?
            // Usually Stop means Reset. Pause means Pause.
            // But if we have only Play/Pause, maybe we don't need Stop button logic right now?
            // The user asked to change Stop to Pause.
            // But if we want a true Stop (Reset), we might need another button or double click?
            // For now, Play/Pause toggle is the requested behavior.
            // If we want to fully reset trails if stopped manually:
            if (state.savedTrailLines) {
                state.frames.forEach((f, i) => f.trailLines = state.savedTrailLines[i]);
                state.savedTrailLines = null;
            }
            Renderer.drawFrame();
        }
        this.updateUI();
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
            if (state.cancelPlay || state.isPaused) break;

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
