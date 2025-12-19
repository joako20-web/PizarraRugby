
import { Formations } from '../features/formations.js';
import { state } from '../core/state.js';
import { I18n } from '../core/i18n.js';

export const Gallery = {
    init() {
        // Init logic called from app.js
        const btn = document.getElementById('btn-open-gallery');
        if (btn) {
            btn.addEventListener('click', () => this.open());
        }

        this.modal = document.getElementById('gallery-modal');
        this.closeBtn = document.getElementById('gallery-close');
        this.grid = document.getElementById('gallery-grid');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        // Close on outside click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
        }
    },

    open() {
        if (!this.modal) return;
        this.render();
        this.modal.classList.remove('is-hidden');
    },

    close() {
        if (!this.modal) return;
        this.modal.classList.add('is-hidden');
    },

    render() {
        if (!this.grid) return;
        this.grid.innerHTML = '';

        const allFormations = Formations.getAll();
        const keys = Object.keys(allFormations).sort();
        const currentConfig = state.fieldConfig;

        if (keys.length === 0) {
            this.grid.innerHTML = `<div class="gallery-empty">${I18n.t ? I18n.t('no_formations') : 'No hay formaciones guardadas'}</div>`;
            return;
        }

        let hasMatches = false;

        keys.forEach(name => {
            const f = allFormations[name];
            // Filter logic (duplicated from Formations.updateSelector for now)
            if (f.fieldConfig) {
                const cfg = f.fieldConfig;
                let matches = false;
                if (currentConfig.type === cfg.type) {
                    if (currentConfig.type === "full") {
                        matches = currentConfig.orientation === cfg.orientation;
                    } else {
                        matches = currentConfig.halfSide === cfg.halfSide;
                    }
                }

                if (matches) {
                    hasMatches = true;
                    const card = document.createElement('div');
                    card.className = 'gallery-card';

                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'gallery-card__image';

                    if (f.image) {
                        const img = document.createElement('img');
                        img.src = f.image;
                        img.alt = name;
                        imgContainer.appendChild(img);
                    } else {
                        imgContainer.textContent = '🏈'; // Placeholder
                        imgContainer.classList.add('is-placeholder');
                    }

                    const title = document.createElement('div');
                    title.className = 'gallery-card__title';
                    title.textContent = name;

                    const actions = document.createElement('div');
                    actions.className = 'gallery-card__actions';

                    const loadBtn = document.createElement('button');
                    loadBtn.className = 'btn btn--sm btn--primary';
                    loadBtn.textContent = I18n.t ? I18n.t('btn_load') : 'Cargar';
                    loadBtn.onclick = () => {
                        Formations.load(name);
                        this.close();
                    };

                    const delBtn = document.createElement('button');
                    delBtn.className = 'btn btn--sm btn--danger';
                    delBtn.textContent = '🗑️';
                    delBtn.onclick = async (e) => {
                        e.stopPropagation();
                        await Formations.delete(name); // This triggers popup
                        this.render(); // Re-render after delete
                    };

                    actions.appendChild(loadBtn);
                    actions.appendChild(delBtn);

                    card.appendChild(imgContainer);
                    card.appendChild(title);
                    card.appendChild(actions);

                    this.grid.appendChild(card);
                }
            }
        });

        if (!hasMatches) {
            this.grid.innerHTML = `<div class="gallery-empty">No hay formaciones para esta configuración de campo.</div>`;
        }
    }
};
