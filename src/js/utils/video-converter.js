
import { Notificacion } from '../ui/notifications.js';

export const VideoConverter = {
    ffmpeg: null,

    async load() {
        if (this.ffmpeg) return true;

        try {
            // Check if FFmpeg global exists (loaded via script)
            if (typeof FFmpeg === 'undefined') {
                // Load script dynamically
                await this.loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');
            }

            if (typeof FFmpeg === 'undefined') {
                throw new Error("FFmpeg library failed to load");
            }

            const { createFFmpeg } = FFmpeg;
            this.ffmpeg = createFFmpeg({
                log: true,
                corePath: 'https://unpkg.com/@ffmpeg/core@0.11.6/dist/ffmpeg-core.js'
            });

            await this.ffmpeg.load();
            return true;
        } catch (e) {
            console.error("FFmpeg Load Error:", e);
            Notificacion.show("Error cargando conversor de video.");
            return false;
        }
    },

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    async convertWebMToMP4(webmBlob) {
        if (!this.ffmpeg) {
            const loaded = await this.load();
            if (!loaded) return null;
        }

        try {
            Notificacion.show("Iniciando conversión a MP4...");
            const ffmpeg = this.ffmpeg;
            const name = 'input.webm';

            // Write file to FS
            const data = await this.fetchFile(webmBlob);
            ffmpeg.FS('writeFile', name, data);

            // Run FFmpeg
            // -preset ultrafast for speed
            await ffmpeg.run('-i', name, '-c:v', 'copy', 'output.mp4');
            // Try copy first (fastest). If WebM is VP9, MP4 usually doesn't support it directly.
            // WhatsApp needs H.264. 
            // So we MUST re-encode if it's VP9.
            // Let's assume re-encode is needed for compatibility.
            // await ffmpeg.run('-i', name, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22', 'output.mp4');

            // BUT, user asked for "takes little time".
            // Re-encoding in WASM is slow.
            // If we can force H.264 in MediaRecorder (Chrome supports it), we can just remux ('-c copy').

            // Check if we can assume H.264 input?
            // In animation.js we try 'video/webm;codecs=h264'.
            // IF that succeeded, we can copy.
            // IF it was VP9, we must transcode.

            // Let's try transcoding with ultrafast.
            await ffmpeg.run('-i', name, '-c:v', 'libx264', '-preset', 'ultrafast', 'output.mp4');

            // Read output
            const dataOut = ffmpeg.FS('readFile', 'output.mp4');

            // Cleanup
            ffmpeg.FS('unlink', name);
            ffmpeg.FS('unlink', 'output.mp4');

            const mp4Blob = new Blob([dataOut.buffer], { type: 'video/mp4' });
            return mp4Blob;
        } catch (e) {
            console.error("Conversion Error:", e);
            Notificacion.show("Error durante la conversión.");
            return null;
        }
    },

    async fetchFile(file) {
        const data = await file.arrayBuffer();
        return new Uint8Array(data);
    }
};
