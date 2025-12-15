/**
 * Sistema de Animación
 * PizarraRugby v2.0.0
 *
 * Maneja la reproducción y exportación de animaciones
 */

import { CONFIG } from './config.js';
import { state, getCurrentFrame } from './state.js';
import { cloneFrame } from './utils.js';
import { Renderer } from './renderer.js';
import { Notification, Popup } from './ui.js';

/**
 * Sistema de animación
 */
export const Animation = {
    /**
     * Actualiza el contador de frames en la UI
     */
    updateUI() {
        const currentFrameEl = document.getElementById("current-frame-index");
        const totalFramesEl = document.getElementById("total-frames");

        if (currentFrameEl) {
            currentFrameEl.textContent = state.animation.currentFrameIndex + 1;
        }
        if (totalFramesEl) {
            totalFramesEl.textContent = state.animation.frames.length;
        }
    },

    /**
     * Reproduce la animación
     */
    async play() {
        if (state.ui.isPlaying || state.animation.frames.length < 2) return;

        state.ui.isPlaying = true;
        state.ui.cancelPlay = false;

        // Guardar y limpiar trail lines
        const savedTrailLines = this.saveAndClearTrails();

        // Interpolar frames
        await this.interpolateAllFrames();

        // Restaurar trail lines
        this.restoreTrails(savedTrailLines);

        Renderer.drawFrame();
        state.ui.isPlaying = false;
        state.ui.cancelPlay = false;
    },

    /**
     * Detiene la animación
     */
    stop() {
        state.ui.cancelPlay = true;
    },

    /**
     * Exporta la animación como video
     */
    async exportVideo() {
        if (state.animation.frames.length < 2) {
            Notification.show("Necesitas al menos 2 frames para exportar");
            return;
        }

        const filename = await Popup.prompt("Nombre del archivo:", "Mi animacion");
        if (!filename) return;

        await this.recordAndExport(filename);
    },

    /**
     * Interpola entre todos los frames
     */
    async interpolateAllFrames() {
        const frames = state.animation.frames;

        for (let i = 0; i < frames.length - 1; i++) {
            if (state.ui.cancelPlay) break;

            await this.interpolateBetweenFrames(frames[i], frames[i + 1]);

            state.animation.currentFrameIndex = i + 1;
            this.updateUI();
        }
    },

    /**
     * Interpola entre dos frames específicos
     * @param {Object} frameA - Frame inicial
     * @param {Object} frameB - Frame final
     */
    async interpolateBetweenFrames(frameA, frameB) {
        for (let step = 0; step <= CONFIG.INTERP_STEPS; step++) {
            if (state.ui.cancelPlay) break;

            const t = step / CONFIG.INTERP_STEPS;
            Renderer.drawInterpolatedFrame(frameA, frameB, t);

            await this.wait(CONFIG.INTERP_DURATION / CONFIG.INTERP_STEPS);
        }
    },

    /**
     * Guarda y limpia las trail lines
     * @returns {Array} Trail lines guardadas
     */
    saveAndClearTrails() {
        const saved = state.animation.frames.map(f => f.trailLines);
        state.animation.frames.forEach(f => f.trailLines = []);
        return saved;
    },

    /**
     * Restaura las trail lines
     * @param {Array} savedTrails - Trail lines a restaurar
     */
    restoreTrails(savedTrails) {
        state.animation.frames.forEach((f, i) => f.trailLines = savedTrails[i]);
    },

    /**
     * Espera un tiempo determinado
     * @param {number} ms - Milisegundos a esperar
     * @returns {Promise}
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Graba y exporta la animación como video
     * @param {string} filename - Nombre del archivo
     */
    async recordAndExport(filename) {
        const canvas = document.getElementById("pitch");
        if (!canvas) return;

        try {
            // Configurar MediaRecorder
            const stream = canvas.captureStream(30); // 30 FPS
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 8000000
            });

            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.webm`;
                a.click();
                URL.revokeObjectURL(url);

                Notification.show("Video exportado correctamente");
            };

            // Iniciar grabación
            mediaRecorder.start();

            // Reproducir animación
            const savedTrailLines = this.saveAndClearTrails();

            // Pausa inicial
            await this.wait(CONFIG.UI_TIMING.EXPORT_PAUSE_DURATION);

            // Interpolar todos los frames
            const frames = state.animation.frames;
            for (let i = 0; i < frames.length - 1; i++) {
                await this.interpolateBetweenFrames(frames[i], frames[i + 1]);
            }

            // Pausa final
            await this.wait(CONFIG.UI_TIMING.EXPORT_PAUSE_DURATION);

            // Detener grabación
            mediaRecorder.stop();

            // Restaurar
            this.restoreTrails(savedTrailLines);
            Renderer.drawFrame();

        } catch (error) {
            console.error('Error al exportar video:', error);
            Notification.show("Error al exportar video");
        }
    },

    /**
     * Añade un nuevo frame
     */
    addFrame() {
        const currentFrame = getCurrentFrame();
        const newFrame = cloneFrame(currentFrame);

        // Limpiar elementos del nuevo frame
        newFrame.arrows = [];
        newFrame.texts = [];
        newFrame.trailLines = [];

        state.animation.frames.push(newFrame);
        state.animation.currentFrameIndex = state.animation.frames.length - 1;

        this.updateUI();
        Renderer.drawFrame();
    },

    /**
     * Elimina el frame actual
     */
    deleteFrame() {
        if (state.animation.frames.length <= 1) {
            Notification.show("No puedes eliminar el último frame");
            return;
        }

        state.animation.frames.splice(state.animation.currentFrameIndex, 1);

        if (state.animation.currentFrameIndex >= state.animation.frames.length) {
            state.animation.currentFrameIndex = state.animation.frames.length - 1;
        }

        this.updateUI();
        Renderer.drawFrame();
    },

    /**
     * Navega al frame anterior
     */
    prevFrame() {
        if (state.animation.currentFrameIndex > 0) {
            state.animation.currentFrameIndex--;
            this.updateUI();
            Renderer.drawFrame();
        }
    },

    /**
     * Navega al frame siguiente
     */
    nextFrame() {
        if (state.animation.currentFrameIndex < state.animation.frames.length - 1) {
            state.animation.currentFrameIndex++;
            this.updateUI();
            Renderer.drawFrame();
        }
    }
};
