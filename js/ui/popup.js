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

            overlay.classList.remove("is-hidden");

            btnOk.onclick = () => {
                overlay.classList.add("is-hidden");
                resolve(true);
            };

            btnCancel.onclick = () => {
                overlay.classList.add("is-hidden");
                resolve(false);
            };

            overlay.onclick = (e) => {
                const popup = document.getElementById("popup-modal");
                if (!popup.contains(e.target)) {
                    overlay.classList.add("is-hidden");
                    resolve(showCancel ? false : true);
                }
            };
        });
    },

    async prompt(title, placeholder = "") {
        const ok = await this.show({
            title,
            html: `<input id="popup-input" type="text" placeholder="${placeholder}">`
        });

        if (!ok) return null;
        const val = document.getElementById("popup-input").value.trim();
        return val === "" ? null : val;
    },

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
                    document.getElementById("popup-overlay").classList.add("is-hidden");
                    resolve(btn.dataset.v);
                };
            });
        });
    }
};
