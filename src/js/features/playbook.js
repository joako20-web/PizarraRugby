import { DB } from '../core/db.js';
import { state } from '../core/state.js';
import { Utils } from '../core/utils.js';
import { Popup } from '../ui/popup.js';
import { I18n } from '../core/i18n.js';
import { Renderer } from '../renderer/renderer.js';
import { Animation } from './animation.js';

export const Playbook = {
    async init() {
        try {
            await DB.init();
            console.log("Playbook DB initialized");
        } catch (e) {
            console.error("Failed to init Playbook DB", e);
        }
    },

    generateId() {
        return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    },

    async saveCurrentPlay() {
        const name = await Popup.prompt(I18n.t('prompt_play_name') || "Nombre de la jugada", "Nueva Jugada");
        if (!name) return;

        // Capture thumbnail?
        // We can technically capture the canvas at low res
        // But renderer is offscreen? Or we can use the canvas directly.
        // Let's use current canvas state.
        const canvas = document.getElementById('pitch');
        if (!canvas) {
            console.error("Canvas 'pitch' not found");
            return;
        }
        // Thumbnail (Medium/High Quality)
        const thumbW = 800;
        const thumbH = 450;
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const ctx = thumbCanvas.getContext('2d');

        // Fill background (Rugby Green) to avoid transparency
        ctx.fillStyle = "#0b7c39";
        ctx.fillRect(0, 0, thumbW, thumbH);

        // Draw current canvas scaled
        ctx.drawImage(canvas, 0, 0, thumbW, thumbH);
        const previewImage = thumbCanvas.toDataURL('image/jpeg', 0.8); // Higher quality

        const playData = {
            id: this.generateId(),
            name: name,
            date: new Date().toISOString(),
            frames: JSON.parse(JSON.stringify(state.frames)), // Clone frames
            fieldConfig: { ...state.fieldConfig },
            previewImage: previewImage
        };

        try {
            if (!state.frames || state.frames.length === 0) {
                throw new Error("No animations frames to save");
            }
            console.log("Saving play:", name, playData);
            await DB.savePlay(playData);
            console.log("Play saved successfully ID:", playData.id);
            Popup.show({
                title: I18n.t('playbook_saved_title') || "Guardado",
                html: (I18n.t('playbook_saved_msg') || "Jugada guardada").replace('{name}', name),
                showCancel: false
            });
        } catch (e) {
            console.error("Save Error:", e);
            Popup.show({
                title: I18n.t('playbook_error_title') || "Error",
                html: (I18n.t('playbook_error_msg') || "Error al guardar.") + "<br><small>" + e.message + "</small>",
                showCancel: false
            });
        }
    },

    async openLibrary() {
        try {
            // Fetch everything
            const plays = await DB.getAllPlays();

            // Dynamic import Formations to avoid top-level circular dependency if any, 
            // and ensuring we get the module instance
            const { Formations } = await import('./formations.js');
            const formationsObj = Formations.getAll();

            // Convert formations obj to array and FILTER by current field config
            const currentConfig = state.fieldConfig;
            const formations = Object.keys(formationsObj).map(key => ({
                id: key,
                name: key,
                data: formationsObj[key],
                type: 'formation'
            })).filter(f => {
                if (!f.data.fieldConfig) return true; // Legacy formations (assume compatible or show)
                const cfg = f.data.fieldConfig;

                // Strict match logic
                if (currentConfig.type !== cfg.type) return false;
                if (currentConfig.type === 'full') return currentConfig.orientation === cfg.orientation;
                if (currentConfig.type === 'half') return currentConfig.halfSide === cfg.halfSide;
                // Vertical?
                if (currentConfig.type === 'vertical') return currentConfig.orientation === cfg.orientation;

                return true;
            });

            // --- HTML STRUCTURE ---
            const html = `
                <div class="playbook-tabs" style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem;">
                    <button class="tab-btn is-active" data-tab="plays" style="padding: 0.5rem 1rem; background: none; border: none; border-bottom: 2px solid var(--color-primary, #2563eb); color: var(--color-primary, #2563eb); cursor: pointer; font-weight: bold;">Jugadas</button>
                    <button class="tab-btn" data-tab="formations" style="padding: 0.5rem 1rem; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-secondary); cursor: pointer;">Formaciones</button>
                </div>

                <div id="tab-plays" class="tab-content">
                    ${this._renderPlaysGrid(plays)}
                </div>

                <div id="tab-formations" class="tab-content" style="display: none;">
                    ${this._renderFormationsGrid(formations)}
                </div>
            `;

            const container = document.createElement('div');
            container.classList.add('playbook-container');
            container.style.width = "100%";
            container.innerHTML = html;

            // --- TAB LOGIC ---
            const tabBtns = container.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                btn.onclick = (e) => {
                    // Update buttons
                    tabBtns.forEach(b => {
                        b.style.borderBottomColor = 'transparent';
                        b.style.color = 'var(--text-secondary)';
                        b.classList.remove('is-active');
                    });
                    e.target.style.borderBottomColor = 'var(--color-primary, #2563eb)';
                    e.target.style.color = 'var(--color-primary, #2563eb)';
                    e.target.classList.add('is-active');

                    // Show Content
                    const tabId = e.target.dataset.tab;
                    container.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                    const tabContent = container.querySelector(`#tab-${tabId}`);
                    if (tabContent) tabContent.style.display = 'block';
                };
            });

            // --- ACTION LOGIC (Plays & Formations) ---
            container.addEventListener('click', async (e) => {
                const deleteBtn = e.target.closest('.btn-play-delete');
                const loadBtn = e.target.closest('.btn-play-load');
                const item = e.target.closest('.playbook-item');

                // --- DELETE ---
                if (deleteBtn) {
                    e.stopPropagation();
                    const id = deleteBtn.dataset.id;
                    const type = deleteBtn.dataset.type; // 'play' or 'formation'

                    // Usar Popup personalizado en lugar de confirm() nativo
                    // Nota: Esto cerrará la librería momentáneamente.
                    const confirmed = await Popup.show({
                        title: I18n.t('playbook_delete_confirm') || "Eliminar",
                        html: I18n.t('playbook_delete_confirm_msg') || "¿Seguro que quieres borrar este elemento?",
                        showCancel: true,
                        okText: "Borrar", // TODO: I18n
                        cancelText: "Cancelar" // TODO: I18n
                    });

                    if (confirmed) {
                        try {
                            if (type === 'formation') {
                                const { Formations } = await import('./formations.js');
                                Formations.delete(id, true);
                            } else {
                                await DB.deletePlay(id);
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }

                    // Reabrir librería siempre (refrescar si se borró, restaurar si se canceló)
                    setTimeout(() => this.openLibrary(), 200);

                    return;
                }

                // --- LOAD ---
                // Try button first
                if (loadBtn) {
                    e.stopPropagation();
                    const id = loadBtn.dataset.id;
                    const type = loadBtn.dataset.type;

                    if (type === 'formation') {
                        const { Formations } = await import('./formations.js');
                        Formations.load(id); // Using name as ID for standard formations
                        document.getElementById('popup-ok').click();
                    } else {
                        await this.loadPlay(id);
                        document.getElementById('popup-ok').click();
                    }
                    return;
                }

                // Try Item Click (Plays)
                if (item) {
                    await this.loadPlay(item.dataset.id);
                    document.getElementById('popup-ok').click();
                }
            });

            Popup.show({
                title: I18n.t('playbook_title') || "Librería",
                html: container,
                showCancel: true,
                okText: I18n.t('popup_ok') || "Cerrar",
                cancelText: ""
            });

        } catch (error) {
            console.error("Error opening library:", error);
            Popup.show({
                title: "Error",
                html: "Error al cargar la librería. Revisa la consola.",
                showCancel: false
            });
        }
    },

    _renderPlaysGrid(plays) {
        if (!plays || plays.length === 0) {
            return `<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">${I18n.t('playbook_no_plays') || "No hay jugadas."}</p>`;
        }
        let html = '<div class="playbook-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; max-height: 50vh; overflow-y: auto; padding: 0.5rem; width: 100%;">';
        plays.forEach(play => {
            const date = new Date(play.date).toLocaleDateString();
            html += `
                <div class="playbook-item" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s;" data-id="${play.id}">
                    <div style="height: 100px; background: #333; display: flex; align-items: center; justify-content: center;">
                        <img src="${play.previewImage}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    </div>
                    <div style="padding: 0.5rem; background: var(--bg-panel); color: var(--text-primary);">
                        <div style="font-weight: bold; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${play.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">${date}</div>
                    </div>
                    <div class="actions" style="display: flex; gap: 4px; border-top: 1px solid var(--border-color); padding: 4px;">
                        <button class="btn-play-load" data-id="${play.id}" data-type="play" style="flex: 1; border: none; background: var(--color-primary, #2563eb); color: white; padding: 6px; cursor: pointer; font-size: 0.8rem; border-radius: 4px;">${I18n.t('playbook_btn_load') || "Cargar"}</button>
                        <button class="btn-play-delete" data-id="${play.id}" data-type="play" style="border: none; background: #ef4444; color: white; padding: 6px 10px; cursor: pointer; font-size: 0.8rem; border-radius: 4px;">Del</button>
                    </div>
                </div>`;
        });
        html += '</div>';
        return html;
    },

    _renderFormationsGrid(formations) {
        if (!formations || formations.length === 0) {
            return `<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No hay formaciones guardadas.</p>`;
        }
        let html = '<div class="playbook-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; max-height: 50vh; overflow-y: auto; padding: 0.5rem; width: 100%;">';
        formations.forEach(f => {
            const imgHtml = f.data.image
                ? `<div style="height: 100px; background: #333; display: flex; align-items: center; justify-content: center;"><img src="${f.data.image}" style="width: 100%; height: 100%; object-fit: cover; display: block;"></div>`
                : `<div style="height: 100px; background: #222; display: flex; align-items: center; justify-content: center; color: #666; font-size: 2rem;">🛡️</div>`;

            html += `
                <div class="formation-item" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; position: relative; background: var(--bg-panel);">
                    ${imgHtml}
                    <div style="padding: 0.5rem; background: var(--bg-panel); color: var(--text-primary);">
                        <div style="font-weight: bold; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">(${f.data.fieldConfig?.type || 'Standard'})</div>
                    </div>
                    <div class="actions" style="display: flex; gap: 4px; border-top: 1px solid var(--border-color); padding: 4px;">
                        <button class="btn-play-load" data-id="${f.id}" data-type="formation" style="flex: 1; border: none; background: var(--color-primary, #2563eb); color: white; padding: 6px; cursor: pointer; font-size: 0.8rem; border-radius: 4px;">${I18n.t('playbook_btn_load') || "Cargar"}</button>
                        <button class="btn-play-delete" data-id="${f.id}" data-type="formation" style="border: none; background: #ef4444; color: white; padding: 6px 10px; cursor: pointer; font-size: 0.8rem; border-radius: 4px;">Del</button>
                    </div>
                </div>`;
        });
        html += '</div>';
        return html;
    },

    async loadPlay(id) {
        const play = await DB.getPlay(id);
        if (!play) return;

        // Restore state
        state.frames = play.frames; // TODO: Clone? JSON parse/stringify might be safer if references exist

        // Restore Field Config if available
        if (play.fieldConfig) {
            state.fieldConfig = { ...play.fieldConfig };
            // Notify changes to update UI (Buttons, Info, Formation Selector)
            window.dispatchEvent(new CustomEvent('field-config-changed'));
        }

        // Reset current frame
        state.currentFrameIndex = 0;

        Animation.updateUI();
        Renderer.drawFrame();
    },
};
