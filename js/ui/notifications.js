import { CONFIG } from '../core/config.js';

// ==============================
// SISTEMA DE NOTIFICACIONES
// ==============================
export const Notificacion = {
    show(mensaje, duracion = 3000) {
        const notif = document.getElementById("notification");
        notif.textContent = mensaje;
        notif.classList.remove("is-hidden");

        // Esperar un frame para que se aplique el display antes de animar
        setTimeout(() => {
            notif.classList.add("is-visible");
        }, CONFIG.UI_TIMING.NOTIFICATION_SHOW_DELAY);

        // Ocultar después de la duración especificada
        setTimeout(() => {
            notif.classList.remove("is-visible");
            setTimeout(() => {
                notif.classList.add("is-hidden");
            }, CONFIG.UI_TIMING.NOTIFICATION_HIDE_DELAY);
        }, duracion);
    }
};
