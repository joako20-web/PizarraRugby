/**
 * Componentes de Interfaz de Usuario
 * PizarraRugby v2.0.0
 *
 * Sistema de notificaciones, popups y utilidades de UI
 */

import { CONFIG } from './config.js';
import { state } from './state.js';

/**
 * Sistema de notificaciones temporales
 */
export const Notification = {
    /**
     * Muestra una notificación temporal
     * @param {string} mensaje - Mensaje a mostrar
     * @param {number} duracion - Duración en milisegundos (default: 3000)
     */
    show(mensaje, duracion = 3000) {
        const notif = document.getElementById("notification");
        notif.textContent = mensaje;
        notif.classList.remove("hidden");

        // Esperar un frame para que se aplique el display antes de animar
        setTimeout(() => {
            notif.classList.add("show");
        }, CONFIG.UI_TIMING.NOTIFICATION_SHOW_DELAY);

        // Ocultar después de la duración especificada
        setTimeout(() => {
            notif.classList.remove("show");
            setTimeout(() => {
                notif.classList.add("hidden");
            }, CONFIG.UI_TIMING.NOTIFICATION_HIDE_DELAY);
        }, duracion);
    }
};

/**
 * Sistema de popups modales
 */
export const Popup = {
    /**
     * Muestra un popup modal
     * @param {Object} options - Opciones del popup
     * @param {string} options.title - Título del popup
     * @param {string} options.html - Contenido HTML del popup
     * @param {boolean} options.showCancel - Mostrar botón cancelar (default: true)
     * @param {string} options.okText - Texto del botón OK (default: "OK")
     * @param {string} options.cancelText - Texto del botón cancelar (default: "Cancelar")
     * @returns {Promise<boolean>} Promesa que resuelve true si se acepta, false si se cancela
     */
    show({ title = "Mensaje", html = "", showCancel = true, okText = "OK", cancelText = "Cancelar" }) {
        return new Promise(resolve => {
            const overlay = document.getElementById("popup-overlay");
            const modalTitle = document.getElementById("popup-title");
            const content = document.getElementById("popup-content");
            const btnCancel = document.getElementById("popup-cancel");
            const btnOk = document.getElementById("popup-ok");
            const buttonsBox = document.getElementById("popup-buttons");

            modalTitle.textContent = title;
            content.innerHTML = html;

            // Resetear el texto de los botones a los valores por defecto o personalizados
            btnOk.textContent = okText;
            btnCancel.textContent = cancelText;

            if (showCancel) {
                btnCancel.style.display = "block";
                buttonsBox.style.justifyContent = "space-between";
            } else {
                btnCancel.style.display = "none";
                buttonsBox.style.justifyContent = "center";
            }

            overlay.classList.remove("hidden");

            btnOk.onclick = () => {
                overlay.classList.add("hidden");
                resolve(true);
            };

            btnCancel.onclick = () => {
                overlay.classList.add("hidden");
                resolve(false);
            };

            overlay.onclick = (e) => {
                const popup = document.getElementById("popup-modal");
                if (!popup.contains(e.target)) {
                    overlay.classList.add("hidden");
                    resolve(showCancel ? false : true);
                }
            };
        });
    },

    /**
     * Muestra un popup con un input de texto
     * @param {string} title - Título del popup
     * @param {string} placeholder - Placeholder del input
     * @returns {Promise<string|null>} Promesa que resuelve con el texto ingresado o null si se cancela
     */
    async prompt(title, placeholder = "") {
        const ok = await this.show({
            title,
            html: `<input id="popup-input" type="text" placeholder="${placeholder}">`
        });

        if (!ok) return null;
        const val = document.getElementById("popup-input").value.trim();
        return val === "" ? null : val;
    },

    /**
     * Muestra un popup para seleccionar el equipo de la melé
     * @returns {Promise<string|null>} Promesa que resuelve con "A", "B", "AB" o null si se cancela
     */
    async selectScrumTeam() {
        return new Promise(resolve => {
            this.show({
                title: "Equipo para la melé",
                html: `
                    <button class="choice" data-v="A">Equipo A</button>
                    <button class="choice" data-v="B">Equipo B</button>
                    <button class="choice" data-v="AB">Ambos (AB)</button>
                `,
                showCancel: true
            }).then(ok => {
                if (!ok) return resolve(null);
            });

            document.querySelectorAll("#popup-content .choice").forEach(btn => {
                btn.onclick = () => {
                    document.getElementById("popup-overlay").classList.add("hidden");
                    resolve(btn.dataset.v);
                };
            });
        });
    },

    /**
     * Muestra una alerta simple (sin botón cancelar)
     * @param {string} title - Título del popup
     * @param {string} message - Mensaje a mostrar
     * @returns {Promise<boolean>}
     */
    async alert(title, message) {
        return this.show({
            title: title,
            html: `<p>${message}</p>`,
            showCancel: false
        });
    },

    /**
     * Muestra un popup de confirmación
     * @param {string} title - Título del popup
     * @param {string} message - Mensaje a mostrar
     * @returns {Promise<boolean>} Promesa que resuelve true si se confirma, false si se cancela
     */
    async confirm(title, message) {
        return this.show({
            title: title,
            html: `<p>${message}</p>`,
            showCancel: true
        });
    }
};

/**
 * Utilidades de UI
 */
export const UI = {
    /**
     * Actualiza la visibilidad del botón de eliminar según las selecciones actuales
     */
    updateDeleteButton() {
        const deleteBtn = document.getElementById("delete-btn");
        const hasSelection = state.selection.shield || state.selection.zone ||
                            state.selection.text || state.selection.arrow;

        if (hasSelection) {
            deleteBtn.classList.remove("hidden");
        } else {
            deleteBtn.classList.add("hidden");
        }
    }
};
