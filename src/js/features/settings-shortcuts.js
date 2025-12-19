import { SETTINGS, DEFAULT_SHORTCUTS } from '../core/settings.js';
import { SecondaryPopup } from '../ui/secondary-popup.js';
import { I18n } from '../core/i18n.js';

export const SettingsShortcuts = {
    render() {
        const s = SETTINGS.SHORTCUTS;
        const fmt = (k) => {
            if (!k) return '?';
            if (k === 'Space') return I18n.t('key_space');
            if (k === 'ArrowLeft') return '←';
            if (k === 'ArrowRight') return '→';
            if (k === 'ArrowUp') return '↑';
            if (k === 'ArrowDown') return '↓';
            return k.toUpperCase();
        };

        return `
            <div class="shortcuts-list">
                <h3>${I18n.t('shortcuts_title')}</h3>
                <p style="font-size: 12px; color: #888; margin-bottom: 15px;">${I18n.t('shortcuts_desc')}</p>
                
                <div class="shortcut-item">
                    <label>${I18n.t('mode_move')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_MOVE">${fmt(s.MODE_MOVE)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('mode_text')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_TEXT">${fmt(s.MODE_TEXT)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('mode_scrum')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_SCRUM">${fmt(s.MODE_SCRUM)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('mode_arrow')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_ARROW">${fmt(s.MODE_ARROW)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('mode_draw')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_FREEHAND">${fmt(s.MODE_FREEHAND)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('mode_eraser_title')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_ERASER">${fmt(s.MODE_ERASER)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('mode_zone')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_ZONE">${fmt(s.MODE_ZONE)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('mode_shield')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="MODE_SHIELD">${fmt(s.MODE_SHIELD)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('btn_toggle_ball')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="TOGGLE_BALL">${fmt(s.TOGGLE_BALL)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('shortcut_anim_play')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="ANIMATION_PLAY">${fmt(s.ANIMATION_PLAY)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('btn_presentation')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="PRESENTATION_MODE">${fmt(s.PRESENTATION_MODE)}</button>
                </div>
                
                <h4 style="margin: 15px 0 10px 0; color: #888; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">${I18n.t('shortcut_section_frames')}</h4>
                
                <div class="shortcut-item">
                    <label>${I18n.t('shortcut_frame_next')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="FRAME_NEXT">${fmt(s.FRAME_NEXT)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('shortcut_frame_prev')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="FRAME_PREV">${fmt(s.FRAME_PREV)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('shortcut_frame_add')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="FRAME_ADD">${fmt(s.FRAME_ADD)}</button>
                </div>
                <div class="shortcut-item">
                    <label>${I18n.t('shortcut_frame_remove')}</label>
                    <button class="btn btn--secondary bind-btn" data-action="FRAME_REMOVE">${fmt(s.FRAME_REMOVE)}</button>
                </div>

                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); text-align: right;">
                    <button id="btn-reset-shortcuts" class="btn btn--danger" style="width: auto; padding: 6px 12px; font-size: 13px;">${I18n.t('shortcuts_reset')}</button>
                </div>
            </div>
        `;
    },

    bindEvents(saveCallback) {
        const fmt = (k) => {
            if (!k) return '?';
            if (k === 'Space') return I18n.t('key_space');
            if (k === 'ArrowLeft') return '←';
            if (k === 'ArrowRight') return '→';
            if (k === 'ArrowUp') return '↑';
            if (k === 'ArrowDown') return '↓';
            return k.toUpperCase();
        };

        // Bind Reset Button
        const btnReset = document.getElementById("btn-reset-shortcuts");
        if (btnReset) {
            btnReset.onclick = async () => {
                const confirmed = await SecondaryPopup.show({
                    title: I18n.t('shortcuts_reset_title'),
                    html: I18n.t('shortcuts_reset_text'),
                    showCancel: true,
                    okText: I18n.t('shortcuts_reset_confirm'),
                    cancelText: I18n.t('popup_cancel')
                });

                if (confirmed) {
                    SETTINGS.SHORTCUTS = { ...DEFAULT_SHORTCUTS };
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
                        // Keep symbols as symbols, don't uppercase them if they are special
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
                                MODE_MOVE: I18n.t('mode_move'),
                                MODE_TEXT: I18n.t('mode_text'),
                                MODE_SCRUM: I18n.t('mode_scrum'),
                                MODE_ARROW: I18n.t('mode_arrow'),
                                MODE_FREEHAND: I18n.t('mode_draw'),
                                MODE_ERASER: I18n.t('mode_eraser_title'),
                                MODE_ZONE: I18n.t('mode_zone'),
                                MODE_SHIELD: I18n.t('mode_shield'),
                                TOGGLE_BALL: I18n.t('btn_toggle_ball'),
                                ANIMATION_PLAY: I18n.t('shortcut_anim_play'),
                                PRESENTATION_MODE: I18n.t('btn_presentation'),
                                FRAME_NEXT: I18n.t('shortcut_frame_next'),
                                FRAME_PREV: I18n.t('shortcut_frame_prev'),
                                FRAME_ADD: I18n.t('shortcut_frame_add'),
                                FRAME_REMOVE: I18n.t('shortcut_frame_remove')
                            };
                            const conflictName = names[conflict] || conflict;

                            const msg = I18n.t('shortcuts_conflict_msg')
                                .replace('{key}', newShortcut)
                                .replace('{action}', conflictName)
                                // Handle action twice if needed in translation
                                .replace('{action}', conflictName);

                            const overwrite = await SecondaryPopup.show({
                                title: I18n.t('shortcuts_conflict_title'),
                                html: msg,
                                showCancel: true,
                                okText: I18n.t('shortcuts_conflict_confirm'),
                                cancelText: I18n.t('popup_cancel')
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
