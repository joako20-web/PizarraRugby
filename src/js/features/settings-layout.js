import { SETTINGS } from '../core/settings.js';
import { UI } from '../ui/ui.js';

export const SettingsLayout = {
    render() {
        const ui = SETTINGS.UI;
        // Ensure defaults if missing (migration safety)
        if (!ui.visibleTools) {
            ui.visibleTools = { move: true, freehand: false, eraser: true, text: true, scrum: true, arrow: true, zone: true, shield: true };
        }
        // Migration check
        if (!ui.toolsPanelPosition) ui.toolsPanelPosition = 'left';
        if (!ui.animationPanelPosition) ui.animationPanelPosition = 'right';

        const tools = [
            { id: 'move', label: 'Mover / Selección' },
            { id: 'freehand', label: 'Dibujo Libre (+ Goma)' },
            { id: 'text', label: 'Texto' },
            { id: 'scrum', label: 'Melé' },
            { id: 'arrow', label: 'Flechas' },
            { id: 'zone', label: 'Zonas' },
            { id: 'shield', label: 'Escudos' }
        ];

        let toolsHtml = tools.map(t => `
            <div class="form-group" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="margin:0;">${t.label}</label>
                <div class="toggle-switch">
                    <input type="checkbox" id="toggle-tool-${t.id}" class="tool-toggle" data-tool="${t.id}" ${ui.visibleTools[t.id] !== false ? 'checked' : ''}>
                    <label for="toggle-tool-${t.id}"></label>
                </div>
            </div>
        `).join('');

        return `
            <div class="settings-section">
                <h3>Disposición de Paneles</h3>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="margin-bottom: 5px; display:block;">Panel de Herramientas (Modos)</label>
                    <div class="radio-group" style="display:flex; gap:15px;">
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                            <input type="radio" name="pos-tools" value="left" ${ui.toolsPanelPosition !== 'right' ? 'checked' : ''}>
                            Izquierda
                        </label>
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                            <input type="radio" name="pos-tools" value="right" ${ui.toolsPanelPosition === 'right' ? 'checked' : ''}>
                            Derecha
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label style="margin-bottom: 5px; display:block;">Panel de Animación / Configuración</label>
                    <div class="radio-group" style="display:flex; gap:15px;">
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                            <input type="radio" name="pos-anim" value="left" ${ui.animationPanelPosition === 'left' ? 'checked' : ''}>
                            Izquierda
                        </label>
                        <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                            <input type="radio" name="pos-anim" value="right" ${ui.animationPanelPosition !== 'left' ? 'checked' : ''}>
                            Derecha
                        </label>
                    </div>
                </div>

                <hr style="margin: 20px 0;">

                <h3>Visibilidad de Herramientas</h3>
                <p style="font-size: 12px; color: #888; margin-bottom: 15px;">Oculta las herramientas que no utilices.</p>
                <div class="tools-list">
                    ${toolsHtml}
                </div>
            </div>
        `;
    },

    bindEvents(saveCallback) {
        // Tools Panel Position
        document.querySelectorAll('input[name="pos-tools"]').forEach(radio => {
            radio.onchange = (e) => {
                SETTINGS.UI.toolsPanelPosition = e.target.value;
                if (saveCallback) saveCallback(SETTINGS);
                UI.applyLayout();
            };
        });

        // Animation Panel Position
        document.querySelectorAll('input[name="pos-anim"]').forEach(radio => {
            radio.onchange = (e) => {
                SETTINGS.UI.animationPanelPosition = e.target.value;
                if (saveCallback) saveCallback(SETTINGS);
                UI.applyLayout();
            };
        });

        // Tools Visibility
        document.querySelectorAll('.tool-toggle').forEach(toggle => {
            toggle.onchange = (e) => {
                const toolId = e.target.dataset.tool;
                SETTINGS.UI.visibleTools[toolId] = e.target.checked;
                if (saveCallback) saveCallback(SETTINGS);

                // Apply immediately
                UI.applyLayout();
            };
        });
    }
};
