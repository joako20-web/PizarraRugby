import { Utils, getPlayerInitialPosition } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
import { Renderer } from '../renderer/renderer.js';

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
            btnA.textContent = allVisibleA ? "Ocultar equipo azul" : "Mostrar equipo azul";
        }

        // Actualizar botón del equipo B
        const allVisibleB = f.players
            .filter(pl => pl.team === "B")
            .every(pl => pl.visible);
        const btnB = document.getElementById("show-team-b");
        if (btnB) {
            btnB.textContent = allVisibleB ? "Ocultar equipo rojo" : "Mostrar equipo rojo";
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
            blueGrid.appendChild(a);

            const b = document.createElement("div");
            b.className = "player-toggle red";
            b.textContent = i;
            b.dataset.team = "B";
            b.dataset.number = i;
            b.onclick = (e) => this.toggle(e);
            redGrid.appendChild(b);
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

        const selector = `.player-toggle[data-team="${team}"][data-number="${num}"]`;
        const div = document.querySelector(selector);
        if (div) {
            div.classList.toggle("is-active", p.visible);
        }

        this.updateTeamButtons();
        Renderer.drawFrame();
    },

    syncToggles() {
        const f = Utils.getCurrentFrame();
        document.querySelectorAll(".player-toggle").forEach(div => {
            const team = div.dataset.team;
            const num = parseInt(div.dataset.number);
            const p = f.players.find(x => x.team === team && x.number === num);
            if (p) {
                div.classList.toggle("is-active", p.visible);
            }
        });
        this.updateTeamButtons();
    }
};
