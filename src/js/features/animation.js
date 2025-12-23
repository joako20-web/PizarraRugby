import { state } from '../core/state.js';
import { Renderer } from '../renderer/renderer.js';
import { CONFIG } from '../core/config.js';
import { I18n } from '../core/i18n.js';
import { canvas } from '../core/dom.js';
import { Notificacion } from '../ui/notifications.js';

export const Animation = {
    rafId: null,
    lastTime: 0,
    transitionProgress: 0,

    init() {
        this.frameCounter = document.getElementById('frame-counter');
        this.frameBar = document.getElementById('frame-bar');
        this.updateUI();
    },

    updateUI() {
        if (!state.frames || state.frames.length === 0) return;

        const currentFrameSpan = document.getElementById('current-frame-index');
        const totalFramesSpan = document.getElementById('total-frames');

        if (currentFrameSpan) currentFrameSpan.textContent = state.currentFrameIndex + 1;
        if (totalFramesSpan) totalFramesSpan.textContent = state.frames.length;
    },

    play() {
        if (state.frames.length < 2) {
            // Check if Notificacion exists, otherwise alert or console
            const msg = (typeof I18n !== 'undefined' && I18n.t) ? I18n.t('error_no_frames') : "No hay suficientes frames (mínimo 2).";
            if (typeof Notificacion !== 'undefined') Notificacion.show(msg);
            else alert(msg);
            return;
        }

        if (state.isPlaying) return;

        // Reset si estábamos en el final
        if (state.currentFrameIndex >= state.frames.length - 1) {
            state.currentFrameIndex = 0;
            this.transitionProgress = 0;
        }

        state.isPlaying = true;
        state.isPaused = false;
        state.cancelPlay = false;

        // UI
        document.getElementById('play-animation')?.classList.add('is-hidden');
        document.getElementById('pause-animation')?.classList.remove('is-hidden');
        canvas.style.pointerEvents = 'none';

        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame(this._tick.bind(this));
    },

    pause() {
        state.isPlaying = false;
        state.isPaused = true;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        document.getElementById('play-animation')?.classList.remove('is-hidden');
        document.getElementById('pause-animation')?.classList.add('is-hidden');
        canvas.style.pointerEvents = 'auto';
    },

    stop() {
        this.pause();
        state.isPaused = false;
        state.cancelPlay = true;
        this.transitionProgress = 0;

        // Restaurar estado visual al frame entero actual
        Renderer.drawFrame();
    },

    _tick(timestamp) {
        if (!state.isPlaying) return;

        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Duración total de la transición entre dos frames
        const duration = CONFIG.INTERP_DURATION / CONFIG.PLAYBACK_SPEED;

        // Avanzar el progreso
        this.transitionProgress += dt / duration;

        // Manejar cambio de frame
        if (this.transitionProgress >= 1) {
            this.transitionProgress -= 1;
            state.currentFrameIndex++;
            this.updateUI();

            // Si llegamos al final
            if (state.currentFrameIndex >= state.frames.length - 1) {
                // Fin de la animación
                state.currentFrameIndex = state.frames.length - 1;
                this.stop();
                return;
            }
        }

        // Renderizar interpolación
        const frameA = state.frames[state.currentFrameIndex];
        const frameB = state.frames[state.currentFrameIndex + 1];

        // Validar que frameB existe (por seguridad)
        if (frameB) {
            Renderer.drawInterpolatedFrame(frameA, frameB, this.transitionProgress);
        }

        this.rafId = requestAnimationFrame(this._tick.bind(this));
    },

    // Eliminar métodos obsoletos: _playLoop, _interpolateBetweenFrames

    // ==============================
    // EXPORT UI HELPERS
    // ==============================
    _showExportOverlay() {
        let overlay = document.getElementById('export-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'export-overlay';
            overlay.className = 'popup-overlay'; // Re-use popup overlay styles for consistent look background
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '9999';
            overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'; // Darker background

            overlay.innerHTML = `
                <div style="background: var(--bg-panel); padding: 2rem; border-radius: 12px; text-align: center; border: 1px solid var(--border-color); box-shadow: var(--shadow-md); max-width: 400px; width: 90%;">
                    <h3 style="margin-top: 0; color: var(--text-primary); margin-bottom: 1rem;">Exportando Video...</h3>
                    <div id="export-spinner" style="border: 4px solid var(--bg-hover); border-top: 4px solid var(--primary); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <div id="export-progress-text" style="color: var(--text-secondary); font-size: 0.9rem;">Inicializando...</div>
                    <div style="width: 100%; background: var(--bg-hover); height: 6px; border-radius: 3px; margin-top: 1rem; overflow: hidden;">
                        <div id="export-progress-bar" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.3s ease;"></div>
                    </div>
                </div>
                <style>
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('is-hidden');
    },

    _hideExportOverlay() {
        const overlay = document.getElementById('export-overlay');
        if (overlay) {
            overlay.classList.add('is-hidden');
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
        }
    },

    _updateExportProgress(msg, percent) {
        const text = document.getElementById('export-progress-text');
        const bar = document.getElementById('export-progress-bar');
        if (text) text.textContent = msg;
        if (bar && percent !== undefined) bar.style.width = `${percent}%`;
    },

    async exportAdvanced(options) {
        // options: { filename, resolution, fps, quality }

        if (state.frames.length < 2) {
            Notificacion.show(I18n.t ? I18n.t('error_no_frames_export') : "No hay suficientes frames.");
            return;
        }

        state.cancelPlay = false;
        state.isPaused = false;

        // Block UI
        const btnPlay = document.getElementById('play-animation');
        const btnPause = document.getElementById('pause-animation');
        if (btnPlay) btnPlay.disabled = true;
        if (btnPause) btnPause.disabled = true;

        this._showExportOverlay(); // SHOW OVERLAY

        const fps = options.fps || 30;
        const qualityMap = {
            'standard': 5000000,
            'high': 8000000,
            'ultra': 15000000
        };
        const bitrate = qualityMap[options.quality] || 8000000;

        let targetWidth = canvas.width;
        let targetHeight = canvas.height;

        if (options.resolution !== 'current') {
            const parts = options.resolution.split('x');
            if (parts.length === 2) {
                targetWidth = parseInt(parts[0]);
                targetHeight = parseInt(parts[1]);
            }
        }

        // Crear canvas para exportación (Offscreen)
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = targetWidth;
        exportCanvas.height = targetHeight;
        const exportCtx = exportCanvas.getContext('2d');

        // Dimensiones lógicas (originales) para el Renderer
        const logicalW = canvas.width;
        const logicalH = canvas.height;

        // Calcular escala manteniendo aspecto (Letterboxing)
        const scale = Math.min(targetWidth / logicalW, targetHeight / logicalH);
        const offsetX = (targetWidth - logicalW * scale) / 2;
        const offsetY = (targetHeight - logicalH * scale) / 2;

        // Rellenar fondo negro (para las barras)
        exportCtx.fillStyle = "black";
        exportCtx.fillRect(0, 0, targetWidth, targetHeight);

        // Configurar el contexto para escalar y centrar contenido
        exportCtx.translate(offsetX, offsetY);
        exportCtx.scale(scale, scale);

        // Configurar grabación
        let mimeType = "video/webm;codecs=vp9";
        let extension = ".webm";

        if (MediaRecorder.isTypeSupported("video/mp4;codecs=h264")) {
            mimeType = "video/mp4;codecs=h264";
            extension = ".mp4";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
            mimeType = "video/mp4";
            extension = ".mp4";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
            mimeType = "video/webm;codecs=vp9";
            extension = ".webm";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
            mimeType = "video/webm";
            extension = ".webm";
        }

        const baseName = options.filename || 'animation';
        let fileName = baseName;
        if (!fileName.toLowerCase().endsWith(extension)) {
            fileName += extension;
        }

        const stream = exportCanvas.captureStream(fps);
        const chunks = [];

        const rec = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: bitrate
        });

        rec.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        rec.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            // Unblock UI
            if (btnPlay) btnPlay.disabled = false;
            if (btnPause) btnPause.disabled = false;

            this._hideExportOverlay(); // HIDE OVERLAY
            Notificacion.show(I18n.t ? I18n.t('export_success') : "Exportación completada exitosamente.");
        };

        rec.start();

        const drawExportFrame = (frameOrA, b, t) => {
            if (b === undefined) {
                Renderer.drawFrame(exportCtx, logicalW, logicalH);
            } else {
                Renderer.drawInterpolatedFrame(frameOrA, b, t, exportCtx, logicalW, logicalH);
            }
        };

        // ============================================
        // TIMING LOOP WITH DRIFT CORRECTION
        // ============================================
        const frameInterval = 1000 / fps;
        let nextFrameTime = performance.now();

        const waitNextFrame = async () => {
            nextFrameTime += frameInterval;
            const now = performance.now();
            const delay = Math.max(0, nextFrameTime - now);
            await new Promise(r => setTimeout(r, delay));
        };

        // Estimación de frames totales para la barra de progreso
        const pauseFramesCount = Math.ceil(fps * 1.5);
        const totalDuration = CONFIG.INTERP_DURATION / CONFIG.PLAYBACK_SPEED;
        const transitionFrames = Math.ceil((totalDuration / 1000) * fps);
        const totalFramesToProcess = (pauseFramesCount * 2) + ((state.frames.length - 1) * transitionFrames);
        let processedFrames = 0;

        const updateProgress = (phase) => {
            processedFrames++;
            const pct = Math.min(100, Math.round((processedFrames / totalFramesToProcess) * 100));
            this._updateExportProgress(`${phase} (${pct}%)`, pct);
        };


        // 1. Pausa Inicial (1.5s)
        state.currentFrameIndex = 0;
        this.updateUI();

        for (let i = 0; i < pauseFramesCount; i++) {
            drawExportFrame(state.frames[0]);
            await waitNextFrame();
            updateProgress("Inicio...");
        }

        // 2. Animación
        for (let i = 0; i < state.frames.length - 1; i++) {
            const frameA = state.frames[i];
            const frameB = state.frames[i + 1];

            state.currentFrameIndex = i;

            for (let f = 0; f <= transitionFrames; f++) {
                const t = f / transitionFrames;
                drawExportFrame(frameA, frameB, t);
                await waitNextFrame();
                updateProgress(`Procesando mov. ${i + 1}/${state.frames.length - 1}`);
            }
        }

        // 3. Pausa Final (1.5s)
        state.currentFrameIndex = state.frames.length - 1;
        this.updateUI();

        const lastFrame = state.frames[state.frames.length - 1];

        // HACK: Ocultar trayectorias
        const originalTrails = lastFrame.trailLines;
        lastFrame.trailLines = [];

        try {
            for (let i = 0; i < pauseFramesCount; i++) {
                drawExportFrame(lastFrame); // Render directly from object or state? Renderer uses state if not passed? No, we need consistent state. 
                // Actually drawExportFrame function above calls Renderer.drawFrame() which uses GLOBAL state if we don't pass frame object?
                // Renderer.drawFrame implementation: drawFrame(targetCtx, w, h) -> gets Utils.getCurrentFrame().
                // We set state.currentFrameIndex = state.frames.length - 1; so Utils.getCurrentFrame() returns lastFrame.
                // So calling drawExportFrame(lastFrame) is redundant argument-wise but harmless.
                drawExportFrame(lastFrame);
                await waitNextFrame();
                updateProgress("Finalizando...");
            }
        } finally {
            lastFrame.trailLines = originalTrails;
        }

        rec.stop();
        Renderer.drawFrame();
    },

    async exportWebM() {
        this.exportAdvanced({
            resolution: 'current',
            fps: 30,
            quality: 'high'
        });
    }
};
