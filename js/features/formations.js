import { Utils } from '../core/utils.js';
import { state } from '../core/state.js';
import { Popup } from '../ui/popup.js';
import { Renderer } from '../renderer/renderer.js';
import { Players } from './players.js';

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
                title: "Error",
                html: "Por favor, ingresa un nombre para la formación",
                showCancel: false
            });
            return;
        }

        const f = Utils.getCurrentFrame();
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
            title: "Guardado",
            html: `Formación "<strong>${name}</strong>" guardada correctamente`,
            showCancel: false
        });
    },

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

        const f = Utils.getCurrentFrame();

        // Restaurar configuración del campo si existe
        if (formation.fieldConfig) {
            state.fieldConfig = { ...formation.fieldConfig };

            // OJO: La actualización de la UI del campo se realizará mediante eventos o callbacks si es necesario.
            // Por ahora, asumimos que app.js o el módulo principal manejará la UI de los botones si cambiamos el estado.
            // Para mantener el desacoplamiento, idealmente dispararíamos un evento o tendríamos una función de UI update.
            // Dado el enfoque "no code changes", mantenemos la lógica pero debemos exponer una forma de actualizar la UI de los botones en app.js.
            // Sin embargo, como estamos moviendo esto a un módulo, no podemos acceder directamente a funciones internas de app.js.
            // Solución: Dejaremos que Formations actualice el estado y que app.js exponga una función pública o maneje el cambio.
            // PERO: El código original manipulaba el DOM directamente aquí. Lo mantendré para compatibilidad.

            // Actualizar UI de configuración del campo
            const fullBtn = document.getElementById("field-type-full");
            const halfBtn = document.getElementById("field-type-half");

            if (state.fieldConfig.type === "full") {
                fullBtn.classList.add("is-active");
                halfBtn.classList.remove("is-active");
            } else {
                fullBtn.classList.remove("is-active");
                halfBtn.classList.add("is-active");
            }

            // Actualizar info de configuración
            const info = document.getElementById("field-config-info");
            const cfg = state.fieldConfig;
            let text = "";

            if (cfg.type === "full") {
                text = cfg.orientation === "horizontal" ? "Campo Completo - Horizontal" : "Campo Completo - Vertical";
            } else {
                text = cfg.halfSide === "top" ? "Mitad de Campo - Superior" : "Mitad de Campo - Inferior";
            }

            info.textContent = text;
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
            title: "Cargado",
            html: `Formación "<strong>${name}</strong>" cargada correctamente`,
            showCancel: false
        });
    },

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

    updateSelector() {
        const selector = document.getElementById('formation-selector');
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
