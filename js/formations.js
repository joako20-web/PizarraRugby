/**
 * Sistema de Formaciones
 * PizarraRugby v2.0.0
 *
 * Guarda y carga formaciones de jugadores usando localStorage
 */

import { getCurrentFrame, state } from './state.js';
import { Popup } from './ui.js';

// Dependencias externas que se establecerán después
let Players = null;
let Renderer = null;

/**
 * Establece las dependencias externas
 */
export function setFormationDependencies(deps) {
    Players = deps.Players;
    Renderer = deps.Renderer;
}

/**
 * Sistema de formaciones
 */
export const Formations = {
    STORAGE_KEY: 'rugby-formations',

    /**
     * Obtiene todas las formaciones guardadas
     * @returns {Object} Objeto con todas las formaciones
     */
    getAll() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    },

    /**
     * Guarda la formación actual
     * @param {string} name - Nombre de la formación
     */
    async save(name) {
        if (!name || name.trim() === '') {
            await Popup.show({
                title: "Error",
                html: "Por favor, ingresa un nombre para la formación",
                showCancel: false
            });
            return;
        }

        const f = getCurrentFrame();
        const visiblePlayers = f.players.filter(p => p.visible);

        if (visiblePlayers.length === 0) {
            await Popup.show({
                title: "Error",
                html: "No hay jugadores visibles para guardar",
                showCancel: false
            });
            return;
        }

        // Guardar solo las posiciones de jugadores visibles
        const formation = {
            name: name.trim(),
            date: new Date().toISOString(),
            fieldConfig: { ...state.field },
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
            title: "Guardado",
            html: `Formación "<strong>${name}</strong>" guardada correctamente`,
            showCancel: false
        });
    },

    /**
     * Carga una formación guardada
     * @param {string} name - Nombre de la formación
     */
    async load(name) {
        const formations = this.getAll();
        const formation = formations[name];

        if (!formation) {
            await Popup.show({
                title: "Error",
                html: "Formación no encontrada",
                showCancel: false
            });
            return;
        }

        const f = getCurrentFrame();

        // Restaurar configuración del campo si existe
        if (formation.fieldConfig) {
            state.field = { ...formation.fieldConfig };

            // Actualizar UI de configuración del campo
            const fullBtn = document.getElementById("field-type-full");
            const halfBtn = document.getElementById("field-type-half");

            if (state.field.type === "full") {
                fullBtn?.classList.add("active");
                halfBtn?.classList.remove("active");
            } else {
                fullBtn?.classList.remove("active");
                halfBtn?.classList.add("active");
            }

            // Actualizar info de configuración
            const info = document.getElementById("field-config-info");
            const cfg = state.field;
            let text = "";

            if (cfg.type === "full") {
                text = cfg.orientation === "horizontal" ? "Campo Completo - Horizontal" : "Campo Completo - Vertical";
            } else {
                text = cfg.halfSide === "top" ? "Mitad de Campo - Superior" : "Mitad de Campo - Inferior";
            }

            if (info) {
                info.textContent = text;
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

        if (Players) {
            Players.syncToggles();
            Players.updateTeamButtons();
        }
        if (Renderer) {
            Renderer.drawFrame();
        }

        await Popup.show({
            title: "Cargado",
            html: `Formación "<strong>${name}</strong>" cargada correctamente`,
            showCancel: false
        });
    },

    /**
     * Elimina una formación guardada
     * @param {string} name - Nombre de la formación
     */
    async delete(name) {
        const confirmed = await Popup.show({
            title: "Confirmar eliminación",
            html: `¿Estás seguro de que quieres eliminar la formación "<strong>${name}</strong>"?`,
            showCancel: true,
            okText: "Eliminar",
            cancelText: "Cancelar"
        });

        if (!confirmed) {
            return;
        }

        const formations = this.getAll();
        delete formations[name];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(formations));

        this.updateSelector();
        await Popup.show({
            title: "Eliminado",
            html: `Formación "<strong>${name}</strong>" eliminada correctamente`,
            showCancel: false
        });
    },

    /**
     * Actualiza el selector de formaciones en el UI
     */
    updateSelector() {
        const selector = document.getElementById('formation-selector');
        if (!selector) return;

        const formations = this.getAll();
        const names = Object.keys(formations).sort();
        const currentConfig = state.field;

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
