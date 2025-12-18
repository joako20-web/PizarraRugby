import { SETTINGS } from '../core/settings.js';

export const SettingsShortcuts = {
    render() {
        const s = SETTINGS.SHORTCUTS;
        const fmt = (k) => (!k) ? '?' : (k === 'Space' ? 'Espacio' : k.toUpperCase());

        return `
            <div class="shortcuts-list">
                <h3>Atajos de Teclado</h3>
                <p style="font-size: 12px; color: #888; margin-bottom: 15px;">Haz clic en un botón y pulsa la tecla deseada.</p>
                
                <div class="shortcut-item">
                    <label>Modo Mover</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_MOVE">${fmt(s.MODE_MOVE)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Modo Texto</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_TEXT">${fmt(s.MODE_TEXT)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Modo Melé</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_SCRUM">${fmt(s.MODE_SCRUM)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Modo Flecha</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_ARROW">${fmt(s.MODE_ARROW)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Modo Zonas</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_ZONE">${fmt(s.MODE_ZONE)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Modo Escudo</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_SHIELD">${fmt(s.MODE_SHIELD)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Reproducir/Pausar</label>
                    <button class="btn btn--secondary bind-btn" data-action="ANIMATION_PLAY">${fmt(s.ANIMATION_PLAY)}</button>
                </div>

                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); text-align: right;">
                    <button id="btn-reset-shortcuts" class="btn btn--danger" style="width: auto; padding: 6px 12px; font-size: 13px;">Restaurar Atajos</button>
                </div>
            </div>
        `;
    },

    bindEvents(saveCallback) {
        const fmt = (k) => (!k) ? '?' : (k === 'Space' ? 'Espacio' : k.toUpperCase());

        // Bind Reset Button
        const btnReset = document.getElementById("btn-reset-shortcuts");
        if (btnReset) {
            btnReset.onclick = () => {
                if (confirm("¿Restaurar todos los atajos a sus valores por defecto?")) {
                    SETTINGS.SHORTCUTS = {
                        MODE_MOVE: 'v',
                        MODE_TEXT: 't',
                        MODE_SCRUM: 'm  ',
                        MODE_ARROW: 'a',
                        MODE_ZONE: 'z',
                        MODE_SHIELD: 'h',
                        ANIMATION_PLAY: 'Space'
                    };
                    if (saveCallback) saveCallback();

                    // Force refresh of the shortcuts view (hacky but acts as re-render)
                    // We need to re-render the list to show new values
                    const container = document.getElementById("settings-tab-content");
                    if (container) {
                        container.innerHTML = this.render();
                        this.bindEvents(saveCallback);
                    }
                    window.dispatchEvent(new CustomEvent('shortcuts-changed'));
                }
            };
        }

        document.querySelectorAll('.bind-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const action = btn.dataset.action;
                const originalText = btn.textContent;

                btn.textContent = "Pulsar...";
                btn.classList.add("is-active");

                const handler = (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    if (ev.key !== "Escape") {
                        let newKey = ev.key;
                        if (ev.code === 'Space') newKey = 'Space';

                        SETTINGS.SHORTCUTS[action] = newKey;
                        if (saveCallback) saveCallback(); // Trigger save logic

                        btn.textContent = fmt(newKey);
                    } else {
                        btn.textContent = originalText;
                    }

                    btn.classList.remove("is-active");
                    window.removeEventListener('keydown', handler, true);
                    window.dispatchEvent(new CustomEvent('shortcuts-changed'));
                };

                window.addEventListener('keydown', handler, { once: true, capture: true });
            };
        });
    }
};
