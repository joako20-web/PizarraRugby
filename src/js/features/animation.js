import { state } from '../core/state.js';
import { Renderer } from '../renderer/renderer.js';
import { CONFIG } from '../core/config.js';
import { I18n } from '../core/i18n.js';
import { canvas } from '../core/dom.js';

export const Animation = {
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
            Notificacion.show(I18n.t ? I18n.t('error_no_frames') : "No hay suficientes frames (mínimo 2).");
            return;
        }

        // Si ya está reproduciendo, ignorar
        if (state.isPlaying) return;

        // Si estaba pausado, simplemente reanudar (la loop vieja sigue viva esperando)
        if (state.isPaused) {
            state.isPlaying = true;
            state.isPaused = false;
            state.cancelPlay = false;

            document.getElementById('play-animation')?.classList.add('is-hidden');
            document.getElementById('pause-animation')?.classList.remove('is-hidden');
            canvas.style.pointerEvents = 'none';
            return; // IMPORTANTE: No iniciar nueva loop
        }

        // Si por alguna razón hay una loop corriendo (aunque no esté playing/paused), evitar duplicados
        if (this.isLoopRunning) return;

        state.isPlaying = true;
        state.cancelPlay = false;
        state.isPaused = false;

        // Ocultar botón Play, mostrar Pausa
        document.getElementById('play-animation')?.classList.add('is-hidden');
        document.getElementById('pause-animation')?.classList.remove('is-hidden');

        // Deshabilitar edición
        canvas.style.pointerEvents = 'none';

        this.isLoopRunning = true;
        this._playLoop().finally(() => {
            this.isLoopRunning = false;
        });
    },

    pause() {
        state.isPaused = true;
        state.isPlaying = false;
        document.getElementById('play-animation')?.classList.remove('is-hidden');
        document.getElementById('pause-animation')?.classList.add('is-hidden');
        canvas.style.pointerEvents = 'auto';
    },

    stop() {
        state.isPlaying = false;
        state.cancelPlay = true;
        state.isPaused = false; // Romper el while(isPaused) de la loop

        document.getElementById('play-animation')?.classList.remove('is-hidden');
        document.getElementById('pause-animation')?.classList.add('is-hidden');
        canvas.style.pointerEvents = 'auto';

        // Restaurar frame actual
        Renderer.drawFrame();
    },

    async _playLoop() {
        // ... Logic continues ...
        // Note: The caller sets isLoopRunning=true and handles finally=false.
        // We just execute the logic.

        // Si estamos en el último frame, volver al inicio
        if (state.currentFrameIndex >= state.frames.length - 1) {
            state.currentFrameIndex = 0;
        }

        this.updateUI();
        Renderer.drawFrame();

        // Pequeña pausa inicial si empezamos desde frame 0
        if (state.currentFrameIndex === 0) {
            await new Promise(r => setTimeout(r, 500));
        }

        for (let i = state.currentFrameIndex; i < state.frames.length - 1; i++) {
            if (state.cancelPlay) break;

            // Esperar si está pausado
            while (state.isPaused) {
                if (state.cancelPlay) break;
                await new Promise(r => setTimeout(r, 100));
            }

            state.currentFrameIndex = i;
            this.updateUI();

            const frameA = state.frames[i];
            const frameB = state.frames[i + 1];

            await this._interpolateBetweenFrames(frameA, frameB);
        }

        // Si llegó al final satisfactoriamente
        if (!state.cancelPlay) {
            state.currentFrameIndex = state.frames.length - 1;
            this.updateUI();
            Renderer.drawFrame();
            state.isPlaying = false;
            document.getElementById('play-animation')?.classList.remove('is-hidden');
            document.getElementById('pause-animation')?.classList.add('is-hidden');
            canvas.style.pointerEvents = 'auto'; // Reactivar edición
        }
    },

    /**
     * Interpola suavemente entre dos frames
     * @private
     */
    async _interpolateBetweenFrames(frameA, frameB) {
        // Ajustar pasos según velocidad: A mayor velocidad, menos duración total, mismos pasos?
        // O mantener duración base y dividir por velocidad.
        // Duration = Base / Speed.
        // Steps = BaseSteps.
        // Delay = Duration / Steps = (Base / Speed) / Steps

        const effectiveDuration = CONFIG.INTERP_DURATION / CONFIG.PLAYBACK_SPEED;

        for (let step = 0; step <= CONFIG.INTERP_STEPS; step++) {
            if (state.cancelPlay) break;

            // FIX: Si se pausa, ESPERAR aquí en lugar de romper el loop
            while (state.isPaused) {
                if (state.cancelPlay) break;
                await new Promise(r => setTimeout(r, 100));
            }
            if (state.cancelPlay) break; // Re-check after resume

            const t = step / CONFIG.INTERP_STEPS;
            Renderer.drawInterpolatedFrame(frameA, frameB, t);

            await new Promise(resolve =>
                setTimeout(resolve, effectiveDuration / CONFIG.INTERP_STEPS)
            );
        }
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
        // NOTA: Lo hacemos antes de aplicar transformaciones
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

        // Crear stream desde el canvas de exportación
        // NOTA: captureStream(fps) funciona mejor si el canvas se actualiza regularmente.
        // Aquí actualizaremos el canvas manualmente en un bucle.
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

            Notificacion.show(I18n.t ? I18n.t('export_success') : "Exportación completada exitosamente.");
        };

        rec.start();

        // Helper para dibujar en el contexto de exportación
        const drawExportFrame = (frameOrA, b, t) => {
            if (b === undefined) {
                // Single frame (Frame object needs to be pre-processed if needed by Renderer? No, Renderer handles globals if needed but we pass ctx)
                // Renderer.drawFrame usa Utils.getCurrentFrame() ?
                // Renderer.drawFrame dibuja 'state.frames[state.currentFrameIndex]'.
                // Así que debemos setear state.currentFrameIndex si queremos usar drawFrame.
                // O mejor: Renderer.drawFrame debería dibujar el frame actual global.
                // Pero para exportación estamos iterando.
                // Necesitamos que Renderer pueda dibujar un frame arbitrario o setear el frame global.
                // Setear el frame global es mas facil dado como está diseñado Renderer (depende de 'state').
                Renderer.drawFrame(exportCtx, logicalW, logicalH);
            } else {
                // Interpolated
                Renderer.drawInterpolatedFrame(frameOrA, b, t, exportCtx, logicalW, logicalH);
            }
        };

        // Bucle de Exportación Sincronizado
        const frameDelay = 1000 / fps; // Duración de cada frame físico del video en ms

        // 1. Pausa Inicial (1s)
        state.currentFrameIndex = 0;
        this.updateUI(); // Actualizar UI principal para feedback visual

        const startPauseFrames = fps * 1.5; // 1.5 segundos
        for (let i = 0; i < startPauseFrames; i++) {
            drawExportFrame(state.frames[0]); // frame 0
            await new Promise(r => setTimeout(r, frameDelay));
        }

        // 2. Animación
        const totalDuration = CONFIG.INTERP_DURATION / CONFIG.PLAYBACK_SPEED;
        const videoFramesPerTransition = (totalDuration / 1000) * fps;

        for (let i = 0; i < state.frames.length - 1; i++) {
            const frameA = state.frames[i];
            const frameB = state.frames[i + 1];

            // Actualizar índice para elementos estáticos dependientes del index
            state.currentFrameIndex = i;

            for (let f = 0; f <= videoFramesPerTransition; f++) {
                const t = f / videoFramesPerTransition;
                drawExportFrame(frameA, frameB, t);
                await new Promise(r => setTimeout(r, frameDelay));
            }
        }

        // 3. Pausa Final (1.5s)
        state.currentFrameIndex = state.frames.length - 1;
        this.updateUI();

        const endPauseFrames = fps * 1.5;
        const lastFrame = state.frames[state.frames.length - 1];

        // HACK: Ocultar trayectorias para el final limpio
        const originalTrails = lastFrame.trailLines;
        lastFrame.trailLines = [];

        try {
            for (let i = 0; i < endPauseFrames; i++) {
                drawExportFrame(lastFrame);
                await new Promise(r => setTimeout(r, frameDelay));
            }
        } finally {
            // Restaurar trayectorias
            lastFrame.trailLines = originalTrails;
        }

        rec.stop();

        // Restaurar render principal
        // Esperamos un poco para que el stop se procese? No, rec.onstop es async.
        // Pero el render principal debe volver a la normalidad.
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
