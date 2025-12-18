import { SETTINGS } from '../core/settings.js';
import { Players } from './players.js';
import { Renderer } from '../renderer/renderer.js';
import { Popup } from '../ui/popup.js';

export const SettingsUI = {
    init() {
        // Load from LocalStorage
        const saved = localStorage.getItem('rugby_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(SETTINGS, parsed);
            } catch (e) {
                console.error("Error loading settings", e);
            }
        }

        // Initial Theme Application
        this.applyTheme(SETTINGS.THEME);

        // Setup Main Settings Button (in Sidebar)
        let settingsBtn = document.getElementById("settings-btn");
        if (!settingsBtn) {
            const sidebar = document.getElementById("sidebar");
            settingsBtn = document.createElement("button");
            settingsBtn.id = "settings-btn";
            settingsBtn.className = "btn btn--secondary";
            settingsBtn.style.marginBottom = "10px";
            settingsBtn.innerHTML = `Configuración`;

            // Insert at the top of the sidebar
            if (sidebar.firstChild) {
                sidebar.insertBefore(settingsBtn, sidebar.firstChild);
            } else {
                sidebar.appendChild(settingsBtn);
            }
        }

        settingsBtn.onclick = () => this.open();
    },

    async open() {
        const html = `
            <div class="settings-form">
                <h3>Visualización</h3>
                <div class="form-group">
                    <label>Tema</label>
                    <select id="set-theme" style="width:100%; padding:8px;">
                        <option value="dark" ${SETTINGS.THEME === 'dark' ? 'selected' : ''}>Oscuro (Pizarra)</option>
                        <option value="light" ${SETTINGS.THEME === 'light' ? 'selected' : ''}>Claro (Papel)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tamaño Jugadores</label>
                    <input type="range" id="set-scale" min="0.5" max="1.5" step="0.1" value="${SETTINGS.PLAYER_SCALE}" style="width:100%;" />
                </div>
                <div class="form-group" style="display:flex; align-items:center;">
                    <input type="checkbox" id="set-numbers" ${SETTINGS.SHOW_NUMBERS ? 'checked' : ''} style="margin-right:10px;" />
                    <label for="set-numbers" style="margin-bottom:0;">Mostrar Números</label>
                </div>

                <hr>
                
                <h3>Equipos</h3>
                 <div class="form-group">
                    <label>Nombre Equipo A</label>
                    <input type="text" id="set-name-a" value="${SETTINGS.TEAM_A_NAME}" />
                </div>
                <div class="form-group">
                    <label>Color Equipo A</label>
                    <input type="color" id="set-color-a" value="${SETTINGS.TEAM_A_COLOR}" style="width:100%; height:40px;" />
                </div>
                <div class="form-group">
                    <label>Nombre Equipo B</label>
                    <input type="text" id="set-name-b" value="${SETTINGS.TEAM_B_NAME}" />
                </div>
                <div class="form-group">
                    <label>Color Equipo B</label>
                    <input type="color" id="set-color-b" value="${SETTINGS.TEAM_B_COLOR}" style="width:100%; height:40px;" />
                </div>
            </div>
        `;

        const result = await Popup.show({
            title: "Configuración",
            html: html,
            showCancel: true
        });

        if (result) {
            const theme = document.getElementById("set-theme").value;
            const scale = parseFloat(document.getElementById("set-scale").value);
            const showNumbers = document.getElementById("set-numbers").checked;

            const nameA = document.getElementById("set-name-a").value;
            const colorA = document.getElementById("set-color-a").value;
            const nameB = document.getElementById("set-name-b").value;
            const colorB = document.getElementById("set-color-b").value;

            this.save({
                THEME: theme,
                PLAYER_SCALE: scale,
                SHOW_NUMBERS: showNumbers,
                TEAM_A_NAME: nameA,
                TEAM_A_COLOR: colorA,
                TEAM_B_NAME: nameB,
                TEAM_B_COLOR: colorB
            });
        }
    },

    save(newSettings) {
        Object.assign(SETTINGS, newSettings);
        localStorage.setItem('rugby_settings', JSON.stringify(SETTINGS));

        // Apply changes
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

        // Update floating icon if it exists (the FAB)
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
        // Update Sidebar Titles
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
