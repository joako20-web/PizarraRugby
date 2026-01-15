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

    /**
     * Detecta si en la transición entre frameA y frameB SOLO se mueve el balón.
     * @param {Object} frameA 
     * @param {Object} frameB 
     * @returns {boolean}
     */
    _isBallOnlyMovement(frameA, frameB) {
        if (!frameA || !frameB) return false;

        // 1. Verificar si el balón se movió
        const ballMoved = (frameA.ball.x !== frameB.ball.x) || (frameA.ball.y !== frameB.ball.y);

        // Si el balón no se movió, no es un "movimiento solo de balón" relevante para acelerar
        // (o es estático, o se mueven jugadores). Queremos acelerar PASES.
        if (!ballMoved) return false;

        // 2. Verificar si algún jugador visible se movió
        // Asumimos que la lista de jugadores es paralela (mismo orden)
        for (let i = 0; i < frameA.players.length; i++) {
            const pA = frameA.players[i];
            const pB = frameB.players[i];

            // Si el jugador no existe en B (raro) o cambia visibilidad, contamos como cambio "de escena" -> normal speed
            if (!pB || pA.visible !== pB.visible) return false;

            // Si es visible y cambió de posición
            if (pA.visible) {
                if (Math.abs(pA.x - pB.x) > 0.1 || Math.abs(pA.y - pB.y) > 0.1) {
                    return false; // Se movió un jugador
                }
            }
        }

        // Si llegamos aquí: El balón se movió Y ningún jugador se movió.
        return true;
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

        // Cap dt to prevent jumps (max 100ms per frame)
        const safeDt = Math.min(Math.max(0, dt), CONFIG.MAX_DELTA_TIME);

        const frameA = state.frames[state.currentFrameIndex];
        const frameB = state.frames[state.currentFrameIndex + 1];

        // Duración base
        let duration = CONFIG.INTERP_DURATION / CONFIG.PLAYBACK_SPEED;

        // Si es solo movimiento de balón, aceleramos
        if (this._isBallOnlyMovement(frameA, frameB)) {
            duration = duration / CONFIG.BALL_SPEED_MULTIPLIER;
        }

        // Avanzar el progreso
        this.transitionProgress += safeDt / duration;

        // Manejar cambio de frame
        if (this.transitionProgress >= 1) {
            // Calcular el overshoot en milisegundos reales basados en la duración ACTUAL
            const overshootNormalized = this.transitionProgress - 1;
            const overshootMs = overshootNormalized * duration;

            state.currentFrameIndex++;
            this.updateUI();

            // Si llegamos al final
            if (state.currentFrameIndex >= state.frames.length - 1) {
                // Fin de la animación
                state.currentFrameIndex = state.frames.length - 1;
                this.stop();
                return;
            }

            // Preparar el siguiente frame para aplicar el overshoot correctamente
            const nextFrameA = state.frames[state.currentFrameIndex];
            const nextFrameB = state.frames[state.currentFrameIndex + 1];

            // Calcular duración del SIGUIENTE frame
            let nextDuration = CONFIG.INTERP_DURATION / CONFIG.PLAYBACK_SPEED;
            if (this._isBallOnlyMovement(nextFrameA, nextFrameB)) {
                nextDuration = nextDuration / CONFIG.BALL_SPEED_MULTIPLIER;
            }

            // Aplicar el overshoot normalizado a la NUEVA duración
            // Esto evita "saltos" de tiempo (teletransportación)
            this.transitionProgress = overshootMs / nextDuration;
        }

        // Renderizar interpolación
        // Nota: frameA y frameB aquí abajo deben ser los ACTUALIZADOS si cambiamos de índice?
        // NO, porque si cambiamos de índice, el return del AnimationFrame anterior ya pintó el frame final (casi).
        // Y el nuevo requestAnimationFrame usará los nuevos índices en la SIGUIENTE llamada?
        // Espera, _tick llama a requestAnimationFrame AL FINAL.
        // Si acabamos de cambiar state.currentFrameIndex, deberíamos pintar el NUEVO estado interpolado (t=0 + overshoot).

        // RE-leer los frames basados en el índice actualizado
        const currentFrameA = state.frames[state.currentFrameIndex];
        const currentFrameB = state.frames[state.currentFrameIndex + 1];

        // Validar que frameB existe (por seguridad)
        if (currentFrameB) {
            Renderer.drawInterpolatedFrame(currentFrameA, currentFrameB, this.transitionProgress);
        } else {
            // Si estamos en el último frame (justo antes de stop(), aunque el check arriba debería haberlo parado)
            Renderer.drawFrame();
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

        let bitrate;
        if (options.bitrate) {
            bitrate = options.bitrate;
        } else {
            const qualityMap = {
                'whatsapp': 4500000,
                'standard': 5000000,
                'high': 8000000,
                'ultra': 15000000
            };
            bitrate = qualityMap[options.quality] || 8000000;
        }

        let targetWidth = canvas.width;
        let targetHeight = canvas.height;

        if (options.resolution !== 'current') {
            if (options.resolution === '4k') {
                targetWidth = 3840;
                targetHeight = 2160;
            } else if (options.resolution === '2k') {
                targetWidth = 2560;
                targetHeight = 1440;
            } else if (options.resolution === '1080p') {
                targetWidth = 1920;
                targetHeight = 1080;
            } else if (options.resolution.includes('x')) {
                const parts = options.resolution.split('x');
                if (parts.length === 2) {
                    targetWidth = parseInt(parts[0]);
                    targetHeight = parseInt(parts[1]);
                }
            }
        }

        // Crear canvas para exportación
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = targetWidth;
        exportCanvas.height = targetHeight;

        // HACK: Append to DOM to prevent throttling of disconnected canvas
        exportCanvas.style.position = 'fixed';
        exportCanvas.style.left = '0';
        exportCanvas.style.top = '0';
        exportCanvas.style.opacity = '0.01';
        exportCanvas.style.pointerEvents = 'none';
        exportCanvas.style.zIndex = '-1000';
        document.body.appendChild(exportCanvas);

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
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
            // Prefer H.264 for WebM if available (faster encoding for 4K)
            mimeType = "video/webm;codecs=h264";
            extension = ".webm";
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

        rec.onerror = (e) => {
            console.error("MediaRecorder Error:", e);
            document.body.removeChild(exportCanvas);
            this._hideExportOverlay();
            alert("Error durante la grabación: " + (e.error ? e.error.message : "Desconocido"));
        };

        rec.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        rec.onstop = () => {
            document.body.removeChild(exportCanvas); // Cleanup

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

        rec.start(1000); // 1s chunks to prevent OOM

        // ============================================
        // OPTIMIZATION: Cache Static Pitch
        // ============================================
        const pitchCacheCanvas = document.createElement('canvas');
        pitchCacheCanvas.width = targetWidth;
        pitchCacheCanvas.height = targetHeight;
        const pitchCacheCtx = pitchCacheCanvas.getContext('2d');

        // Render pitch ONCE to cache
        // We need to setup context transform similar to exportCtx
        pitchCacheCtx.fillStyle = "black";
        pitchCacheCtx.fillRect(0, 0, targetWidth, targetHeight);
        pitchCacheCtx.translate(offsetX, offsetY);
        pitchCacheCtx.scale(scale, scale);

        Renderer.drawPitch(pitchCacheCtx, logicalW, logicalH);

        const drawExportFrame = (frameOrA, b, t) => {
            if (b === undefined) {
                // Single frame (pauses)
                // We fake "interpolated" call to use our optimized cache
                // Or we update drawFrame? drawFrame doesn't support cache arg yet.
                // Let's us drawInterpolatedFrame with t=0? 
                // Wait, drawInterpolatedFrame handles t=0 logic mostly.
                Renderer.drawInterpolatedFrame(frameOrA, frameOrA, 0, exportCtx, logicalW, logicalH, pitchCacheCanvas);
            } else {
                Renderer.drawInterpolatedFrame(frameOrA, b, t, exportCtx, logicalW, logicalH, pitchCacheCanvas);
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
            let delay = nextFrameTime - now;

            // Decouple from VSync (requestAnimationFrame) to prevent throttling on hidden canvas
            // and ensure consistent frame processing for MediaRecorder.
            // We use setTimeout to yield to the event loop (MediaRecorder encoding).
            if (delay > 0) {
                await new Promise(r => setTimeout(r, delay));
            } else {
                // We are behind schedule. 
                // Yield briefly (0ms) to allow UI/Recorder updates, then proceed immediately.
                // This prevents freezing the browser while catching up.
                await new Promise(r => setTimeout(r, 0));
            }
        };

        // Estimación de frames totales para la barra de progreso
        const pauseFramesCount = Math.ceil(fps * 1.5);
        const totalDuration = CONFIG.INTERP_DURATION / CONFIG.PLAYBACK_SPEED;
        const baseTransitionFrames = Math.ceil((totalDuration / 1000) * fps);

        // Calcular total frames (aproximado, ya que varía por segmento)
        // Lo calculamos dinámicamente o hacemos una pasada previa?
        // Para la barra de progreso, una estimación es suficiente.
        const totalFramesToProcess = (pauseFramesCount * 2) + ((state.frames.length - 1) * baseTransitionFrames);
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

            state.currentFrameIndex = i;

            // Determinar duración de este segmento
            let currentTransitionFrames = baseTransitionFrames;
            if (this._isBallOnlyMovement(frameA, frameB)) {
                currentTransitionFrames = Math.ceil(baseTransitionFrames / CONFIG.BALL_SPEED_MULTIPLIER);
                // Asegurar al menos 1 frame
                if (currentTransitionFrames < 1) currentTransitionFrames = 1;
            }

            for (let f = 0; f <= currentTransitionFrames; f++) {
                const t = f / currentTransitionFrames;
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
