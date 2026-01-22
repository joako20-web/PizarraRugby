import { state } from '../core/state.js';
import { Renderer } from '../renderer/renderer.js';
import { CONFIG } from '../core/config.js';
import { I18n } from '../core/i18n.js';
import { canvas } from '../core/dom.js';
import { Notificacion } from '../ui/notifications.js';
import { VideoConverter } from '../utils/video-converter.js';

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
            this.transitionProgress = overshootMs / nextDuration;
        }

        // RE-leer los frames basados en el índice actualizado
        const currentFrameA = state.frames[state.currentFrameIndex];
        const currentFrameB = state.frames[state.currentFrameIndex + 1];

        // Validar que frameB existe (por seguridad)
        if (currentFrameB) {
            Renderer.drawInterpolatedFrame(currentFrameA, currentFrameB, this.transitionProgress);
        } else {
            Renderer.drawFrame();
        }

        this.rafId = requestAnimationFrame(this._tick.bind(this));
    },

    // ==============================
    // EXPORT UI HELPERS
    // ==============================
    _showExportOverlay() {
        let overlay = document.getElementById('export-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'export-overlay';
            overlay.className = 'popup-overlay';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '9999';
            overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';

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

        // Hide guides for export
        const originalShowGuides = state.showGuides;
        state.showGuides = false;

        this._showExportOverlay();

        const fps = options.fps || 30;
        let bitrate;
        if (options.bitrate) {
            bitrate = options.bitrate;
        } else {
            const qualityMap = { 'whatsapp': 4500000, 'standard': 5000000, 'high': 8000000, 'ultra': 15000000 };
            bitrate = qualityMap[options.quality] || 8000000;
        }

        let targetWidth = canvas.width;
        let targetHeight = canvas.height;
        if (options.resolution !== 'current') {
            if (options.resolution === '4k') { targetWidth = 3840; targetHeight = 2160; }
            else if (options.resolution === '2k') { targetWidth = 2560; targetHeight = 1440; }
            else if (options.resolution === '1080p') { targetWidth = 1920; targetHeight = 1080; }
            else if (options.resolution.includes('x')) {
                const parts = options.resolution.split('x');
                if (parts.length === 2) { targetWidth = parseInt(parts[0]); targetHeight = parseInt(parts[1]); }
            }
        }

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = targetWidth;
        exportCanvas.height = targetHeight;
        exportCanvas.style.position = 'fixed';
        exportCanvas.style.left = '0';
        exportCanvas.style.top = '0';
        exportCanvas.style.opacity = '0.01';
        exportCanvas.style.pointerEvents = 'none';
        exportCanvas.style.zIndex = '-1000';
        document.body.appendChild(exportCanvas);

        const exportCtx = exportCanvas.getContext('2d');
        const logicalW = canvas.width;
        const logicalH = canvas.height;
        const scale = Math.min(targetWidth / logicalW, targetHeight / logicalH);
        const offsetX = (targetWidth - logicalW * scale) / 2;
        const offsetY = (targetHeight - logicalH * scale) / 2;

        exportCtx.fillStyle = "black";
        exportCtx.fillRect(0, 0, targetWidth, targetHeight);
        exportCtx.translate(offsetX, offsetY);
        exportCtx.scale(scale, scale);

        // --- SETUP ENCODER ---
        let muxer = null;
        let videoEncoder = null;
        let rec = null;
        let mode = 'legacy'; // 'mp4' (direct) or 'legacy' (recorder + convert)

        // Try to load Mp4Muxer
        let Mp4MuxerLib = window.Mp4Muxer;
        if (!Mp4MuxerLib) {
            try {
                // Dynamic import
                const module = await import('https://unpkg.com/mp4-muxer@5.1.4/build/mp4-muxer.mjs');
                Mp4MuxerLib = module;
            } catch (e) {
                console.warn("Mp4Muxer dynamic import failed", e);
            }
        }

        if (Mp4MuxerLib && typeof VideoEncoder !== 'undefined') {
            try {
                muxer = new Mp4MuxerLib.Muxer({
                    target: new Mp4MuxerLib.ArrayBufferTarget(),
                    video: { codec: 'avc', width: targetWidth, height: targetHeight },
                    fastStart: 'in-memory'
                });
                videoEncoder = new VideoEncoder({
                    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                    error: (e) => console.error("VideoEncoder Error", e)
                });
                // High Profile Level 4.2 (Wide compat)
                await videoEncoder.configure({
                    codec: 'avc1.4d002a',
                    width: targetWidth,
                    height: targetHeight,
                    bitrate: bitrate,
                    framerate: fps
                });
                mode = 'mp4';
            } catch (e) {
                console.warn("MP4 Encoder Init Failed, switching to Legacy", e);
                mode = 'legacy';
                muxer = null;
                videoEncoder = null;
            }
        }

        if (mode === 'legacy') {
            // FALLBACK LEGACY (WEBM + Convert)
            try {
                rec = this.setupMediaRecorder(exportCanvas, fps, bitrate, options);
                rec.start(1000); // Start recording 
            } catch (e) {
                Notificacion.show("Error fatal al iniciar grabación.");
                this.cleanupExport(exportCanvas, btnPlay, btnPause);
                return;
            }
        }

        // --- RENDER LOOP ---
        const pitchCacheCanvas = document.createElement('canvas');
        pitchCacheCanvas.width = targetWidth;
        pitchCacheCanvas.height = targetHeight;
        const pitchCacheCtx = pitchCacheCanvas.getContext('2d');
        pitchCacheCtx.fillStyle = "black";
        pitchCacheCtx.fillRect(0, 0, targetWidth, targetHeight);
        pitchCacheCtx.translate(offsetX, offsetY);
        pitchCacheCtx.scale(scale, scale);
        Renderer.drawPitch(pitchCacheCtx, logicalW, logicalH);

        let frameCurrentTime = 0;
        let frameEncodedCount = 0;
        const frameInterval = 1000 / fps;
        let nextFrameTime = performance.now();

        const drawExportFrame = async (frameOrA, b, t) => {
            // 1. Draw to Canvas
            if (b === undefined) Renderer.drawInterpolatedFrame(frameOrA, frameOrA, 0, exportCtx, logicalW, logicalH, pitchCacheCanvas);
            else Renderer.drawInterpolatedFrame(frameOrA, b, t, exportCtx, logicalW, logicalH, pitchCacheCanvas);

            // 2. Encode / Pace
            if (mode === 'mp4' && videoEncoder) {
                // Direct MP4 Encoding (Fast as possible)
                const timestamp = frameCurrentTime * 1000000; // microseconds
                const videoFrame = new VideoFrame(exportCanvas, { timestamp: timestamp });

                // Keyframe every 2s
                const keyFrame = (frameEncodedCount % (fps * 2) === 0);
                videoEncoder.encode(videoFrame, { keyFrame });
                videoFrame.close();

                frameCurrentTime += (1 / fps); // Seconds
                frameEncodedCount++;

                await new Promise(r => setTimeout(r, 0)); // Yield to UI
            } else {
                // MediaRecorder Pacing (Real-time approx)
                nextFrameTime += frameInterval;
                const now = performance.now();
                let delay = nextFrameTime - now;
                if (delay > 0) await new Promise(r => setTimeout(r, delay));
                else await new Promise(r => setTimeout(r, 0));
            }
        };

        const updateProgress = (phase, k, total) => {
            const pct = Math.min(100, Math.round((k / total) * 100));
            this._updateExportProgress(`${phase} (${pct}%)`, pct);
        };

        const pauseFramesCount = Math.ceil(fps * 1.5);
        const totalDuration = CONFIG.INTERP_DURATION / CONFIG.PLAYBACK_SPEED;
        const baseTransitionFrames = Math.ceil((totalDuration / 1000) * fps);
        const totalFramesToProcess = (pauseFramesCount * 2) + ((state.frames.length - 1) * baseTransitionFrames);
        let processedFrames = 0;

        // Loop - Start Pause
        state.currentFrameIndex = 0;
        for (let i = 0; i < pauseFramesCount; i++) {
            await drawExportFrame(state.frames[0]);
            processedFrames++;
            updateProgress("Inicio", processedFrames, totalFramesToProcess);
        }

        // Loop - Transitions
        for (let i = 0; i < state.frames.length - 1; i++) {
            const frameA = state.frames[i];
            const frameB = state.frames[i + 1];
            state.currentFrameIndex = i;
            let currentTransitionFrames = baseTransitionFrames;
            if (this._isBallOnlyMovement(frameA, frameB)) {
                currentTransitionFrames = Math.ceil(baseTransitionFrames / CONFIG.BALL_SPEED_MULTIPLIER);
                if (currentTransitionFrames < 1) currentTransitionFrames = 1;
            }
            for (let f = 0; f <= currentTransitionFrames; f++) {
                const t = f / currentTransitionFrames;
                await drawExportFrame(frameA, frameB, t);
                processedFrames++;
                updateProgress(`Movimiento ${i + 1}`, processedFrames, totalFramesToProcess);
            }
        }

        // Loop - End Pause
        state.currentFrameIndex = state.frames.length - 1;
        const lastFrame = state.frames[state.frames.length - 1];
        const originalTrails = lastFrame.trailLines;
        lastFrame.trailLines = [];
        try {
            for (let i = 0; i < pauseFramesCount; i++) {
                await drawExportFrame(lastFrame);
                processedFrames++;
                updateProgress("Final", processedFrames, totalFramesToProcess);
            }
        } finally {
            lastFrame.trailLines = originalTrails;
        }

        if (rec) {
            rec.stop();
        } else if (mode === 'mp4' && videoEncoder && muxer) {
            await videoEncoder.flush();
            muxer.finalize();
            const { buffer } = muxer.target;
            this.downloadBlob(new Blob([buffer]), `animation_${Date.now()}`, 'mp4');
            this.cleanupExport(exportCanvas, btnPlay, btnPause);
        }

        Renderer.drawFrame();
    },

    downloadBlob(blob, title, ext) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    },

    async exportWebM() {
        this.exportAdvanced({
            resolution: 'current',
            fps: 30,
            quality: 'high'
        });
    }
};
