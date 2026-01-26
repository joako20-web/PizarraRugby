import { Utils, getPlayerInitialPosition } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
import { Renderer } from '../renderer/renderer.js';
import { SETTINGS } from '../core/settings.js';
import { I18n } from '../core/i18n.js';
import { History } from './history.js';

// ==============================
// GESTIÓN DE JUGADORES
// ==============================
export const Players = {
    showTeam(team) {
        const f = Utils.getCurrentFrame();

        // Verificar si todos los jugadores están visibles
        const allVisible = f.players
            .filter(pl => pl.team === team)
            .every(pl => pl.visible);

        if (allVisible) {
            // Si todos están visibles, ocultarlos
            for (let n = 1; n <= CONFIG.NUM_PLAYERS; n++) {
                const p = f.players.find(pl => pl.team === team && pl.number === n);
                p.visible = false;
            }
        } else {
            // Si no todos están visibles, mostrarlos
            for (let n = 1; n <= CONFIG.NUM_PLAYERS; n++) {
                const p = f.players.find(pl => pl.team === team && pl.number === n);
                const pos = getPlayerInitialPosition(team, n);
                p.visible = true;
                p.x = pos.x;
                p.y = pos.y;
            }
        }

        this.syncToggles();
        this.updateTeamButtons();
        Renderer.drawFrame();
    },


    updateTeamButtons() {
        const f = Utils.getCurrentFrame();

        // Actualizar botón del equipo A
        const allVisibleA = f.players
            .filter(pl => pl.team === "A")
            .every(pl => pl.visible);
        const btnA = document.getElementById("show-team-a");
        if (btnA) {
            const actionKey = allVisibleA ? "action_hide" : "action_show";
            const actionText = I18n.t(actionKey);
            btnA.textContent = `${actionText} ${SETTINGS.TEAM_A_NAME}`;

            // Revert styles to default CSS
            btnA.style.backgroundColor = "";
            btnA.style.color = "";
            btnA.style.borderColor = "";
        }

        // Actualizar botón del equipo B
        const allVisibleB = f.players
            .filter(pl => pl.team === "B")
            .every(pl => pl.visible);
        const btnB = document.getElementById("show-team-b");
        if (btnB) {
            const actionKey = allVisibleB ? "action_hide" : "action_show";
            const actionText = I18n.t(actionKey);
            btnB.textContent = `${actionText} ${SETTINGS.TEAM_B_NAME}`;

            // Revert styles to default CSS
            btnB.style.backgroundColor = "";
            btnB.style.color = "";
            btnB.style.borderColor = "";
        }
    },

    loadPanels() {
        const blueGrid = document.getElementById("players-blue");
        const redGrid = document.getElementById("players-red");

        // Clear existing to avoid duplication if called multiple times (though shouldn't happen)
        blueGrid.innerHTML = '';
        redGrid.innerHTML = '';

        for (let i = 1; i <= CONFIG.NUM_PLAYERS; i++) {
            const a = document.createElement("div");
            a.className = "player-toggle";
            a.textContent = i;
            a.dataset.team = "A";
            a.dataset.number = i;
            a.onclick = (e) => this.toggle(e);
            a.oncontextmenu = (e) => {
                e.preventDefault();
                this.resetPosition("A", i);
            };
            blueGrid.appendChild(a);

            const b = document.createElement("div");
            b.className = "player-toggle red";
            b.textContent = i;
            b.dataset.team = "B";
            b.dataset.number = i;
            b.onclick = (e) => this.toggle(e);
            b.oncontextmenu = (e) => {
                e.preventDefault();
                this.resetPosition("B", i);
            };
            redGrid.appendChild(b);
        }
    },

    resetPosition(team, number) {
        const f = Utils.getCurrentFrame();
        const p = f.players.find(x => x.team === team && x.number === number);
        if (p) {
            const pos = getPlayerInitialPosition(team, number);
            p.x = pos.x;
            p.y = pos.y;
            p.visible = true; // Force visible if they reset it
            this.syncToggles();
            Renderer.drawFrame();
            History.push();
        }
    },

    toggle(e) {
        const team = e.target.dataset.team;
        const num = parseInt(e.target.dataset.number);
        this.toggleByTeamNumber(team, num);
    },

    toggleByTeamNumber(team, num) {
        const f = Utils.getCurrentFrame();
        const p = f.players.find(x => x.team === team && x.number === num);
        p.visible = !p.visible;

        if (p.visible && p.x === null) {
            const pos = getPlayerInitialPosition(team, num);
            p.x = pos.x;
            p.y = pos.y;
        }




        // We rely on syncToggles to handle UI state and colors consistently
        this.syncToggles();
        Renderer.drawFrame();
    },

    syncToggles() {
        const f = Utils.getCurrentFrame();
        document.querySelectorAll(".player-toggle").forEach(div => {
            const team = div.dataset.team;
            const num = parseInt(div.dataset.number);
            const p = f.players.find(x => x.team === team && x.number === num);

            if (p) {
                const isActive = p.visible;
                div.classList.toggle("is-active", isActive);

                // Dynamic Coloring based on Settings
                const teamColor = team === "A" ? SETTINGS.TEAM_A_COLOR : SETTINGS.TEAM_B_COLOR;

                // "Justo al revés": Active = Neutral (On Field), Inactive = Colored (On Bench)
                if (isActive) {
                    // Active (On Field) -> Standard Highlight or Neutral
                    // Ahora aplicamos también el color personalizado
                    div.style.backgroundColor = teamColor;
                    div.style.color = "#ffffff";
                    div.style.borderColor = teamColor;
                } else {
                    // Inactive (On Bench) -> Has the Token Color
                    div.style.backgroundColor = teamColor;
                    div.style.color = "#ffffff";
                    div.style.borderColor = teamColor;
                }


            }
        });
        this.updateTeamButtons();
    }
};
