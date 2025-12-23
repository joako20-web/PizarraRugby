import DOMPurify from 'dompurify';
import { I18n } from '../core/i18n.js';

// ==============================
// SISTEMA DE POPUPS
// ==============================
export const Popup = {
    show({ title = "Mensaje", html = "", showCancel = true, okText = "OK", cancelText = "Cancelar" }) {
        return new Promise(resolve => {
            const overlay = document.getElementById("popup-overlay");
            const modalTitle = document.getElementById("popup-title");
            const content = document.getElementById("popup-content");
            const btnCancel = document.getElementById("popup-cancel");
            const btnOk = document.getElementById("popup-ok");
            const buttonsBox = document.getElementById("popup-buttons");
            const modal = document.getElementById("popup-modal"); // Container for focus trap

            // Save previous focus
            const previousActiveElement = document.activeElement;

            modalTitle.textContent = title;
            if (html instanceof Node) {
                content.innerHTML = '';
                content.appendChild(html);
            } else {
                content.innerHTML = DOMPurify.sanitize(html);
            }

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

            overlay.classList.remove("is-hidden");

            // --- FOCUS TRAP LOGIC ---
            // Find all focusable elements
            const focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
            let focusableElements = modal.querySelectorAll(focusableElementsString);
            focusableElements = Array.prototype.slice.call(focusableElements);

            const firstTabStop = focusableElements[0];
            const lastTabStop = focusableElements[focusableElements.length - 1];

            // Set initial focus (to input if exists, or Cancel/OK)
            // If prompt input exists, focus it
            const input = modal.querySelector('input, textarea');
            if (input) {
                input.focus();
            } else if (showCancel) {
                btnCancel.focus();
            } else {
                btnOk.focus();
            }

            const trapTabKey = (e) => {
                if (e.key === 'Tab') {
                    // Shift + Tab
                    if (e.shiftKey) {
                        if (document.activeElement === firstTabStop) {
                            e.preventDefault();
                            lastTabStop.focus();
                        }
                    } else {
                        // Tab
                        if (document.activeElement === lastTabStop) {
                            e.preventDefault();
                            firstTabStop.focus();
                        }
                    }
                }
                if (e.key === 'Escape') {
                    close(false);
                }
            };

            modal.addEventListener('keydown', trapTabKey);
            // ------------------------

            const close = (result) => {
                overlay.classList.add("is-hidden");
                modal.removeEventListener('keydown', trapTabKey);
                if (previousActiveElement) previousActiveElement.focus();
                resolve(result);
            };

            btnOk.onclick = () => close(true);
            btnCancel.onclick = () => close(false);

            overlay.onclick = (e) => {
                if (!modal.contains(e.target)) {
                    close(showCancel ? false : true);
                }
            };
        });
    },

    async prompt(title, placeholder = "") {
        const input = document.createElement('input');
        input.id = 'popup-input';
        input.type = 'text';
        input.placeholder = placeholder;

        const ok = await this.show({
            title,
            html: input
        });

        if (!ok) return null;
        const val = document.getElementById("popup-input").value.trim();
        return val === "" ? null : val;
    },

    async selectScrumTeam() {
        return new Promise(resolve => {
            this.show({
                title: I18n.t('scrum_team_title'),
                html: `
                    <button class="choice" data-v="A">${I18n.t('settings_team_a')}</button>
                    <button class="choice" data-v="B">${I18n.t('settings_team_b')}</button>
                    <button class="choice" data-v="AB">${I18n.t('scrum_team_both')}</button>
                `,
                showCancel: true
            }).then(ok => {
                if (!ok) return resolve(null);
            });

            document.querySelectorAll("#popup-content .choice").forEach(btn => {
                btn.onclick = () => {
                    document.getElementById("popup-overlay").classList.add("is-hidden");
                    resolve(btn.dataset.v);
                };
            });
        });
    }
};
