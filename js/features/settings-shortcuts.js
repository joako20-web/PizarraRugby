import { SETTINGS } from '../core/settings.js';
import { SecondaryPopup } from '../ui/secondary-popup.js';

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
                    <label>Mostrar/Ocultar balón</label>
                    <button class="btn btn--secondary bind-btn" data-action="TOGGLE_BALL">${fmt(s.TOGGLE_BALL)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Reproducir/Pausar</label>
                    <button class="btn btn--secondary bind-btn" data-action="ANIMATION_PLAY">${fmt(s.ANIMATION_PLAY)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Modo Presentación</label>
                    <button class="btn btn--secondary bind-btn" data-action="PRESENTATION_MODE">${fmt(s.PRESENTATION_MODE)}</button>
                </div>
                
                <h4 style="margin: 15px 0 10px 0; color: #888; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Fotogramas</h4>
                
                <div class="shortcut-item">
                    <label>Siguiente Frame</label>
                    <button class="btn btn--secondary bind-btn" data-action="FRAME_NEXT">${fmt(s.FRAME_NEXT)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Anterior Frame</label>
                    <button class="btn btn--secondary bind-btn" data-action="FRAME_PREV">${fmt(s.FRAME_PREV)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Añadir Frame</label>
                    <button class="btn btn--secondary bind-btn" data-action="FRAME_ADD">${fmt(s.FRAME_ADD)}</button>
                </div>
                <div class="shortcut-item">
                    <label>Eliminar Frame</label>
                    <button class="btn btn--secondary bind-btn" data-action="FRAME_REMOVE">${fmt(s.FRAME_REMOVE)}</button>
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
            btnReset.onclick = async () => {
                const confirmed = await SecondaryPopup.show({
                    title: "Restaurar Atajos",
                    html: "¿Estás seguro de que quieres restaurar todos los atajos a sus valores por defecto?",
                    showCancel: true,
                    okText: "Sí, restaurar",
                    cancelText: "Cancelar"
                });

                if (confirmed) {
                    SETTINGS.SHORTCUTS = {
                        MODE_MOVE: 'v',
                        MODE_TEXT: 't',
                        MODE_SCRUM: 'm',
                        MODE_ARROW: 'a',
                        MODE_ZONE: 'z',
                        MODE_SHIELD: 'h',
                        ANIMATION_PLAY: 'Space',
                        FRAME_PREV: 'Arrowleft',
                        FRAME_NEXT: 'Arrowright',
                        FRAME_ADD: '+',
                        FRAME_REMOVE: '-'
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

                const handler = async (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    // Ignorar si solo se pulsan modificadores
                    if (['Control', 'Alt', 'Shift', 'Meta'].includes(ev.key)) return;

                    if (ev.key !== "Escape") {
                        let keys = [];
                        if (ev.ctrlKey) keys.push('Ctrl');
                        if (ev.altKey) keys.push('Alt');
                        if (ev.shiftKey) keys.push('Shift');

                        let mainKey = ev.key;
                        if (ev.code === 'Space') mainKey = 'Space';
                        if (mainKey.length === 1) mainKey = mainKey.toUpperCase();

                        keys.push(mainKey);
                        const newShortcut = keys.join('+');

                        // Check for conflicts
                        let conflict = null;
                        for (const [key, value] of Object.entries(SETTINGS.SHORTCUTS)) {
                            if (value.toUpperCase() === newShortcut.toUpperCase() && key !== action) {
                                conflict = key;
                                break;
                            }
                        }

                        if (conflict) {
                            // Map internal codes to readable names
                            const names = {
                                MODE_MOVE: "Modo Mover",
                                MODE_TEXT: "Modo Texto",
                                MODE_SCRUM: "Modo Melé",
                                MODE_ARROW: "Modo Flecha",
                                MODE_ZONE: "Modo Zonas",
                                MODE_SHIELD: "Modo Escudo",
                                TOGGLE_BALL: "Mostrar/Ocultar Balón",
                                ANIMATION_PLAY: "Reproducir/Pausar",
                                PRESENTATION_MODE: "Modo Presentación",
                                FRAME_NEXT: "Siguiente Frame",
                                FRAME_PREV: "Anterior Frame",
                                FRAME_ADD: "Añadir Frame",
                                FRAME_REMOVE: "Eliminar Frame"
                            };
                            const conflictName = names[conflict] || conflict;

                            const overwrite = await SecondaryPopup.show({
                                title: "Atajo ya en uso",
                                html: `La tecla <strong>${newShortcut}</strong> ya está asignada a: <strong>${conflictName}</strong>.<br><br>¿Quieres asignarla aquí y dejar "${conflictName}" sin atajo?`,
                                showCancel: true,
                                okText: "Sí, asignar",
                                cancelText: "Cancelar"
                            });

                            if (overwrite) {
                                // 1. Remove from old action
                                SETTINGS.SHORTCUTS[conflict] = "";

                                // 2. Assign to new action
                                SETTINGS.SHORTCUTS[action] = newShortcut;

                                // 3. Update UI for the CLEARED action
                                const conflictBtn = document.querySelector(`button[data-action="${conflict}"]`);
                                if (conflictBtn) conflictBtn.textContent = "?";

                                // 4. Update UI for the NEW action
                                btn.textContent = newShortcut;

                                if (saveCallback) saveCallback();
                            } else {
                                btn.textContent = originalText;
                            }
                        } else {
                            SETTINGS.SHORTCUTS[action] = newShortcut;
                            if (saveCallback) saveCallback();
                            btn.textContent = newShortcut;
                        }

                    } else {
                        btn.textContent = originalText;
                    }

                    btn.classList.remove("is-active");
                    window.removeEventListener('keydown', handler, true);
                    window.dispatchEvent(new CustomEvent('shortcuts-changed'));
                };

                window.addEventListener('keydown', handler, { capture: true });
            };
        });
    }
};
