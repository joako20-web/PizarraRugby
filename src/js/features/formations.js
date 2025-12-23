import { Utils } from '../core/utils.js';
import { state } from '../core/state.js';
import { Popup } from '../ui/popup.js';
import { Renderer } from '../renderer/renderer.js';
import { Players } from './players.js';
import { I18n } from '../core/i18n.js';
import { SETTINGS } from '../core/settings.js';


// ==============================
// FORMACIONES
// ==============================
export const Formations = {
    STORAGE_KEY: 'rugby-formations',

    getAll() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    },

    async save(name) {
        if (!name || name.trim() === '') {
            await Popup.show({
                title: I18n.t('error_title'),
                html: I18n.t('error_no_formation_name'),
                showCancel: false
            });
            return;
        }

        const f = Utils.getCurrentFrame();
        const visiblePlayers = f.players.filter(p => p.visible);

        if (visiblePlayers.length === 0) {
            await Popup.show({
                title: I18n.t('error_title'),
                html: I18n.t('error_no_visible_players'),
                showCancel: false
            });
            return;
        }

        // Capture Clean Thumbnail (No Trails, Full Field)
        let previewImage = null;
        try {
            const canvas = document.getElementById('pitch');
            if (canvas) {
                // 1. Temp High-Res Canvas (Match source size to use absolute coords)
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tCtx = tempCanvas.getContext('2d');

                // 2. Draw Pitch Only (Clean Background)
                Renderer.drawPitch(tCtx);

                // 3. Draw Players Only (Manual loop to skip trails/arrows)
                const isMobile = canvas.width <= 1024;
                const baseScale = isMobile ? 0.6 : 1.0;

                visiblePlayers.forEach(p => {
                    // Responsive Radius Logic
                    let radius = (state.fieldConfig.type === "full" && state.fieldConfig.orientation === "horizontal" && !isMobile)
                        ? p.radius * 1.2
                        : p.radius;
                    radius *= (SETTINGS.PLAYER_SCALE || 1) * baseScale;

                    // Draw Circle
                    tCtx.beginPath();
                    tCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                    tCtx.fillStyle = p.team === "A" ? (SETTINGS.TEAM_A_COLOR || "#2563eb") : (SETTINGS.TEAM_B_COLOR || "#ef4444");
                    tCtx.fill();

                    // Draw Number
                    if (SETTINGS.SHOW_NUMBERS) {
                        tCtx.fillStyle = "white";
                        tCtx.font = "bold 14px Arial";
                        tCtx.textAlign = "center";
                        tCtx.textBaseline = "middle";
                        tCtx.fillText(p.number, p.x, p.y);
                    }
                });

                // 4. Scale down to Thumbnail
                const thumbW = 800;
                const thumbH = 450;
                const thumbCanvas = document.createElement('canvas');
                thumbCanvas.width = thumbW;
                thumbCanvas.height = thumbH;
                const ctx = thumbCanvas.getContext('2d');

                // Draw temp (High Res) -> Thumb (Scaled to fit)
                ctx.drawImage(tempCanvas, 0, 0, thumbW, thumbH);
                previewImage = thumbCanvas.toDataURL('image/jpeg', 0.8);
            }
        } catch (e) { console.error("Thumbnail error", e); }

        // Guardar solo las posiciones de jugadores visibles
        const formation = {
            name: name.trim(),
            date: new Date().toISOString(),
            image: previewImage, // Stored here
            fieldConfig: { ...state.fieldConfig },
            players: visiblePlayers.map(p => ({
                team: p.team,
                number: p.number,
                x: p.x,
                y: p.y
            }))
        };

        const formations = this.getAll();
        formations[name.trim()] = formation;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(formations));

        this.updateSelector();
        await Popup.show({
            title: I18n.t('formation_saved_title'),
            html: `${I18n.t('formation_saved_msg')} "<strong>${name}</strong>"`,
            showCancel: false
        });
    },

    async load(name) {
        const formations = this.getAll();
        const formation = formations[name];

        if (!formation) {
            await Popup.show({
                title: I18n.t('error_title'),
                html: I18n.t('formation_not_found'),
                showCancel: false
            });
            return;
        }

        const f = Utils.getCurrentFrame();

        // Validar configuración del campo (Strict Mode requested by user)
        if (formation.fieldConfig) {
            const current = state.fieldConfig;
            const target = formation.fieldConfig;
            let match = false;

            if (current.type === target.type) {
                if (current.type === 'full' || current.type === 'vertical') {
                    match = current.orientation === target.orientation;
                } else if (current.type === 'half') {
                    match = current.halfSide === target.halfSide;
                }
            }

            if (!match) {
                await Popup.show({
                    title: I18n.t('error_title') || "Error",
                    html: (I18n.t('error_formation_field_mismatch') || "Esta formación es para otro tipo de campo o orientación."),
                    showCancel: false
                });
                return; // Stop loading
            }
        }

        // Ocultar todos los jugadores primero
        f.players.forEach(p => p.visible = false);

        // Cargar las posiciones guardadas
        formation.players.forEach(saved => {
            const player = f.players.find(p => p.team === saved.team && p.number === saved.number);
            if (player) {
                player.x = saved.x;
                player.y = saved.y;
                player.visible = true;
            }
        });

        Players.syncToggles();
        Players.updateTeamButtons();
        Renderer.drawFrame();
        await Popup.show({
            title: I18n.t('formation_loaded_title'),
            html: `${I18n.t('formation_loaded_msg')} "<strong>${name}</strong>"`,
            showCancel: false
        });
    },

    async delete(name, force = false) {
        if (!force) {
            const confirmed = await Popup.show({
                title: I18n.t('delete_formation_title'),
                html: `${I18n.t('delete_formation_msg')} "<strong>${name}</strong>"`,
                showCancel: true,
                okText: I18n.t('btn_delete'),
                cancelText: I18n.t('btn_cancel')
            });

            if (!confirmed) return;
        }

        const formations = this.getAll();
        delete formations[name];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(formations));

        this.updateSelector();

        if (!force) {
            await Popup.show({
                title: "Eliminado",
                html: `Formación "<strong>${name}</strong>" eliminada correctamente`,
                showCancel: false
            });
        }
    },

    updateSelector() {
        const selector = document.getElementById('formation-selector');
        if (!selector) return; // Exit if element is removed from DOM

        const formations = this.getAll();
        const names = Object.keys(formations).sort();
        const currentConfig = state.fieldConfig;

        // Limpiar y agregar opciones
        selector.innerHTML = '<option value="">-- Seleccionar formación --</option>';
        names.forEach(name => {
            const formation = formations[name];

            // Filtrar solo formaciones que coincidan con la configuración actual
            if (formation.fieldConfig) {
                const cfg = formation.fieldConfig;
                let matches = false;

                // Verificar si coincide la configuración
                if (currentConfig.type === cfg.type) {
                    if (currentConfig.type === "full") {
                        // Para campo completo, verificar orientación
                        matches = currentConfig.orientation === cfg.orientation;
                    } else {
                        // Para mitad de campo, verificar el lado
                        matches = currentConfig.halfSide === cfg.halfSide;
                    }
                }

                // Solo agregar si coincide
                if (matches) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    selector.appendChild(option);
                }
            }
        });
    }
};
