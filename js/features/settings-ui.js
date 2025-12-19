import { SETTINGS } from '../core/settings.js';
import { Players } from './players.js';
import { Renderer } from '../renderer/renderer.js';
import { Popup } from '../ui/popup.js';
import { SettingsShortcuts } from './settings-shortcuts.js';

export const SettingsUI = {
    currentTab: 'general', // 'general' | 'shortcuts'

    init() {
        // Load from LocalStorage
        const saved = localStorage.getItem('rugby_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(SETTINGS, parsed);

                // Ensure shortcuts object integrity
                if (!SETTINGS.SHORTCUTS) {
                    SETTINGS.SHORTCUTS = {
                        MODE_MOVE: 'v',
                        MODE_TEXT: 't',
                        MODE_SCRUM: 'm',
                        MODE_ARROW: 'a',
                        MODE_ZONE: 'z',
                        MODE_SHIELD: 'h',
                        ANIMATION_PLAY: 'Space'
                    };
                }
            } catch (e) {
                console.error("Error loading settings", e);
            }
        }

        // Initial Theme Application
        this.applyTheme(SETTINGS.THEME);
        this.createSidebarButton();
    },

    createSidebarButton() {
        // Setup Main Settings Button (in Sidebar)
        let settingsBtn = document.getElementById("settings-btn");
        if (!settingsBtn) {
            const rightPanel = document.getElementById("right-panel");
            settingsBtn = document.createElement("button");
            settingsBtn.id = "settings-btn";
            settingsBtn.className = "btn btn--secondary";
            // Estilos para botón de icono flotante/absoluto en la esquina
            settingsBtn.style.position = "absolute";
            settingsBtn.style.top = "10px";
            settingsBtn.style.right = "10px";
            settingsBtn.style.width = "auto";
            settingsBtn.style.padding = "6px";
            settingsBtn.style.zIndex = "10";
            settingsBtn.style.border = "none";
            settingsBtn.style.background = "transparent";

            settingsBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.214-1.281z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            `;

            // Asegurarse de que rightPanel tenga posición relativa para que el absoluto funcione
            const computedStyle = window.getComputedStyle(rightPanel);
            if (computedStyle.position === 'static') {
                rightPanel.style.position = 'relative';
            }

            if (rightPanel.firstChild) {
                rightPanel.insertBefore(settingsBtn, rightPanel.firstChild);
            } else {
                rightPanel.appendChild(settingsBtn);
            }
        }
        settingsBtn.onclick = () => this.open();
    },

    async open() {
        this.currentTab = 'general'; // Default tab

        // Use custom HTML structure for tabs
        const html = `
            <div class="settings-container">
                <div class="settings-sidebar">
                    <button class="settings-tab active" data-tab="general">
                        <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        General
                    </button>
                    <button class="settings-tab" data-tab="shortcuts">
                        <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                        Atajos
                    </button>
                </div>
                <div id="settings-tab-content" class="settings-content">
                    <!-- Content injected here -->
                </div>
            </div>
            <div style="font-size: 10px; color: #666; margin-top: 10px; text-align: right;">v2.2.0</div>
        `;

        const promise = Popup.show({
            title: "Configuración",
            html: html,
            showCancel: true,
            okText: "Aceptar",
            cancelText: "Cancelar"
        });

        // Initialize immediately
        this.renderTabContent();
        this.bindTabEvents();

        const result = await promise;

        if (result && this.currentTab === 'general') {
            this.saveGeneralSettings();
        }
    },

    renderTabContent() {
        const container = document.getElementById("settings-tab-content");
        if (!container) return;

        if (this.currentTab === 'general') {
            container.innerHTML = this.getGeneralHTML();
            this.bindGeneralEvents();
        } else if (this.currentTab === 'shortcuts') {
            container.innerHTML = SettingsShortcuts.render();
            SettingsShortcuts.bindEvents(() => this.save({})); // Pass save callback
        }
    },

    bindTabEvents() {
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                if (this.currentTab === 'general') {
                    this.saveGeneralSettings();
                }

                // UI Update
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                this.currentTab = tab.dataset.tab;
                this.renderTabContent();
            };
        });
    },

    getGeneralHTML() {
        return `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div class="form-group">
                    <label>Tema</label>
                    <select id="set-theme" style="width:100%; height:40px;">
                        <option value="dark" ${SETTINGS.THEME === 'dark' ? 'selected' : ''}>Oscuro</option>
                        <option value="light" ${SETTINGS.THEME === 'light' ? 'selected' : ''}>Claro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tamaño Jugadores (x${SETTINGS.PLAYER_SCALE})</label>
                    <input type="range" id="set-scale" min="0.5" max="2.0" step="0.1" value="${SETTINGS.PLAYER_SCALE}" style="width:100%;" />
                </div>
                <div class="form-group">
                    <label>Tamaño Balón (x${SETTINGS.BALL_SCALE})</label>
                    <input type="range" id="set-ball-scale" min="0.5" max="2.0" step="0.1" value="${SETTINGS.BALL_SCALE}" style="width:100%;" />
                </div>
                <div class="form-group" style="display:flex; align-items:center;">
                    <input type="checkbox" id="set-numbers" ${SETTINGS.SHOW_NUMBERS ? 'checked' : ''} style="margin-right:10px;" />
                    <label for="set-numbers" style="margin-bottom:0;">Mostrar Números</label>
                </div>
                
                <hr>
                
                <div class="form-group">
                    <label>Nombre Equipo A</label>
                    <input type="text" id="set-name-a" value="${SETTINGS.TEAM_A_NAME}" style="width:100%; height:40px;" />
                </div>
                <div class="form-group">
                    <label>Color Equipo A</label>
                    <input type="color" id="set-color-a" value="${SETTINGS.TEAM_A_COLOR}" style="width:100%; height:40px;" />
                </div>
                <div class="form-group">
                    <label>Nombre Equipo B</label>
                    <input type="text" id="set-name-b" value="${SETTINGS.TEAM_B_NAME}" style="width:100%; height:40px;" />
                </div>
                <div class="form-group">
                    <label>Color Equipo B</label>
                    <input type="color" id="set-color-b" value="${SETTINGS.TEAM_B_COLOR}" style="width:100%; height:40px;" />
                </div>
                
                <hr>
                <button id="btn-reset-settings" class="btn btn--danger" style="width: auto; align-self: flex-end; padding: 6px 12px;">Restaurar valores fábrica</button>
            </div>
        `;
    },

    bindGeneralEvents() {
        // Live Update for Checkbox
        const checkNumbers = document.getElementById("set-numbers");
        if (checkNumbers) {
            checkNumbers.onchange = (e) => {
                SETTINGS.SHOW_NUMBERS = e.target.checked;
                import('../renderer/renderer.js').then(m => m.Renderer.drawFrame());
            };
        }

        const btnReset = document.getElementById("btn-reset-settings");
        if (btnReset) {
            btnReset.onclick = () => this.showResetConfirmation();
        }
    },

    saveGeneralSettings() {
        const nameA = document.getElementById("set-name-a");
        if (nameA) {
            const theme = document.getElementById("set-theme").value;
            const scale = parseFloat(document.getElementById("set-scale").value);
            const ballScale = parseFloat(document.getElementById("set-ball-scale").value);
            const showNumbers = document.getElementById("set-numbers").checked;
            const colorA = document.getElementById("set-color-a").value;
            const nameB = document.getElementById("set-name-b").value;
            const colorB = document.getElementById("set-color-b").value;

            this.save({
                THEME: theme,
                PLAYER_SCALE: scale,
                BALL_SCALE: ballScale,
                SHOW_NUMBERS: showNumbers,
                TEAM_A_NAME: nameA.value,
                TEAM_A_COLOR: colorA,
                TEAM_B_NAME: nameB,
                TEAM_B_COLOR: colorB
            });
        }
    },

    showResetConfirmation() {
        const overlay = document.createElement('div');
        overlay.id = "settings-reset-overlay";
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 100;
            border-radius: 8px;
            text-align: center;
            padding: 20px;
        `;

        overlay.innerHTML = `
            <h3 style="color:white; margin-bottom:15px;">¿Restaurar valores de fábrica?</h3>
            <p style="color:#ccc; font-size:14px; margin-bottom:20px;">Se restablecerán todos los ajustes, nombres y atajos.</p>
            <div style="display:flex; gap:10px;">
                <button id="confirm-reset-yes" class="btn btn--danger">Restaurar</button>
                <button id="confirm-reset-no" class="btn btn--secondary">Cancelar</button>
            </div>
        `;

        const content = document.getElementById('settings-tab-content');
        if (content) {
            content.style.position = 'relative';
            content.appendChild(overlay);
        }

        document.getElementById("confirm-reset-no").onclick = () => overlay.remove();

        document.getElementById("confirm-reset-yes").onclick = () => {
            const defaults = {
                TEAM_A_COLOR: '#0000ff',
                TEAM_B_COLOR: '#ff0000',
                TEAM_A_NAME: 'Equipo A',
                TEAM_B_NAME: 'Equipo B',
                THEME: 'dark',
                PLAYER_SCALE: 1.0,
                SHOW_NUMBERS: true,
                BALL_SCALE: 1.0,
                SHORTCUTS: {
                    MODE_MOVE: 'v',
                    MODE_TEXT: 't',
                    MODE_SCRUM: 'm',
                    MODE_ARROW: 'a',
                    MODE_ZONE: 'z',
                    MODE_SHIELD: 'h',
                    ANIMATION_PLAY: 'Space'
                }
            };
            this.save(defaults);
            this.renderTabContent();
            import('../renderer/renderer.js').then(m => m.Renderer.drawFrame());
            window.dispatchEvent(new CustomEvent('shortcuts-changed'));
            overlay.remove();
        };
    },

    save(newSettings) {
        Object.assign(SETTINGS, newSettings);
        localStorage.setItem('rugby_settings', JSON.stringify(SETTINGS));
        this.applyTheme(SETTINGS.THEME);
        this.updateUI();
        Renderer.drawFrame();
    },

    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }

        const sun = document.getElementById("icon-sun");
        const moon = document.getElementById("icon-moon");
        if (sun && moon) {
            if (theme === 'light') {
                sun.classList.add("is-hidden");
                moon.classList.remove("is-hidden");
            } else {
                sun.classList.remove("is-hidden");
                moon.classList.add("is-hidden");
            }
        }
    },

    updateUI() {
        const panels = document.querySelectorAll("#players-panels .panel");
        if (panels.length >= 2) {
            const titleA = panels[0].querySelector(".panel__title");
            if (titleA) titleA.textContent = SETTINGS.TEAM_A_NAME;

            const titleB = panels[1].querySelector(".panel__title");
            if (titleB) titleB.textContent = SETTINGS.TEAM_B_NAME;
        }

        Players.updateTeamButtons();
        Players.syncToggles();
    }
};
