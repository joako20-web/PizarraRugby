import { canvas } from '../core/dom.js';
import { Utils } from '../core/utils.js';
import { Renderer } from '../renderer/renderer.js';

export const Export = {
    /**
     * Export the current canvas view as a PNG image
     */
    downloadImage() {
        const f = Utils.getCurrentFrame();

        // --- 1. Ocultar trayectorias ---
        const originalTrails = f.trailLines;
        f.trailLines = [];
        Renderer.drawFrame();

        // --- 2. Preparar descarga ---
        const link = document.createElement('a');
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

        link.download = `pizarra-rugby-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // --- 3. Restaurar trayectorias ---
        f.trailLines = originalTrails;
        Renderer.drawFrame();
    }
};
