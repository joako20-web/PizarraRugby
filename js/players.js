/**
 * Gestión de jugadores
 * PizarraRugby v2.0.0
 *
 * Controla la visibilidad y posicionamiento de jugadores
 */

import { CONFIG } from './config.js';
import { getCurrentFrame } from './state.js';
import { getFieldDimensions } from './utils.js';

// Esta función será proporcionada por field.js
// Por ahora la declaramos como importación pendiente
let getPlayerInitialPosition = null;
let Renderer = null;

/**
 * Establece las dependencias externas
 * Necesario para evitar dependencias circulares
 */
export function setPlayerDependencies(deps) {
    getPlayerInitialPosition = deps.getPlayerInitialPosition;
    Renderer = deps.Renderer;
}

/**
 * Gestión de jugadores
 */
export const Players = {
    /**
     * Muestra u oculta un equipo completo
     * @param {string} team - "A" o "B"
     */
    showTeam(team) {
        const f = getCurrentFrame();

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
        if (Renderer) Renderer.drawFrame();
    },

    /**
     * Actualiza el texto de los botones de equipo según su estado
     */
    updateTeamButtons() {
        const f = getCurrentFrame();

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

    /**
     * Carga los paneles de jugadores en el DOM
     */
    loadPanels() {
        const blueGrid = document.getElementById("players-blue");
        const redGrid = document.getElementById("players-red");

        if (!blueGrid || !redGrid) return;

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

    /**
     * Maneja el clic en un toggle de jugador
     * @param {Event} e - Evento del clic
     */
    toggle(e) {
        const team = e.target.dataset.team;
        const num = parseInt(e.target.dataset.number);
        this.toggleByTeamNumber(team, num);
    },

    /**
     * Alterna la visibilidad de un jugador específico
     * @param {string} team - "A" o "B"
     * @param {number} num - Número del jugador (1-15)
     */
    toggleByTeamNumber(team, num) {
        const f = getCurrentFrame();
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
            div.classList.toggle("active", p.visible);
        }

        this.updateTeamButtons();
        if (Renderer) Renderer.drawFrame();
    },

    /**
     * Sincroniza los toggles visuales con el estado de los jugadores
     */
    syncToggles() {
        const f = getCurrentFrame();
        document.querySelectorAll(".player-toggle").forEach(div => {
            const team = div.dataset.team;
            const num = parseInt(div.dataset.number);
            const p = f.players.find(x => x.team === team && x.number === num);
            div.classList.toggle("active", p.visible);
        });
        this.updateTeamButtons();
    }
};
