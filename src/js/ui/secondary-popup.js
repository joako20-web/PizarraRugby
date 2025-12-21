import DOMPurify from 'dompurify';

export const SecondaryPopup = {
    show({ title = "Confirmación", html = "", showCancel = true, okText = "OK", cancelText = "Cancelar" }) {
        return new Promise(resolve => {
            // Remove existing if any
            const existing = document.getElementById("secondary-popup-overlay");
            if (existing) existing.remove();

            const overlay = document.createElement("div");
            overlay.id = "secondary-popup-overlay";
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.backgroundColor = "rgba(0,0,0,0.7)";
            overlay.style.zIndex = "100000"; // Higher than main popup
            overlay.style.display = "flex";
            overlay.style.justifyContent = "center";
            overlay.style.alignItems = "center";
            overlay.style.opacity = "0";
            overlay.style.transition = "opacity 0.2s";

            const modal = document.createElement("div");
            modal.style.background = "var(--bg-panel)";
            modal.style.padding = "20px";
            modal.style.borderRadius = "8px";
            modal.style.border = "1px solid var(--border-color)";
            modal.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
            modal.style.maxWidth = "400px";
            modal.style.width = "90%";
            modal.style.textAlign = "center";
            modal.style.transform = "scale(0.9)";
            modal.style.transition = "transform 0.2s";

            // Content - SANITIZED with DOMPurify
            modal.innerHTML = DOMPurify.sanitize(`
                <h3 style="margin-top:0; color:var(--text-primary);">${title}</h3>
                <div style="margin:15px 0; color:var(--text-secondary); font-size:14px;">${html}</div>
                <div style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
                    ${showCancel ? `<button id="sec-cancel" class="btn btn--secondary">${cancelText}</button>` : ''}
                    <button id="sec-ok" class="btn btn--primary">${okText}</button>
                </div>
            `);

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Animate in
            requestAnimationFrame(() => {
                overlay.style.opacity = "1";
                modal.style.transform = "scale(1)";
            });

            // Handlers
            const close = (val) => {
                overlay.style.opacity = "0";
                modal.style.transform = "scale(0.9)";
                setTimeout(() => {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    resolve(val);
                }, 200);
            };

            const btnOk = modal.querySelector("#sec-ok");
            if (btnOk) btnOk.onclick = () => close(true);

            const btnCancel = modal.querySelector("#sec-cancel");
            if (btnCancel) btnCancel.onclick = () => close(false);

            // Click outside? Maybe risky if miss-click closes it. Let's allowing closing on outside click for generic feel
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    close(false); // Treat outside click as cancel
                }
            };
        });
    }
};
