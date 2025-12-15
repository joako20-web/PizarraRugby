/**
 * Sistema de Tutorial
 * PizarraRugby v2.0.0
 *
 * Maneja el sistema de tutoriales interactivos para nuevos usuarios
 */

import { Popup } from './ui.js';

/**
 * Sistema de tutorial
 */
export const Tutorial = {
    active: false,
    currentStep: 0,
    currentTutorialType: null, // 'basic' o 'advanced'
    actionCompleted: false,

    // Definición de tutoriales
    tutorials: {
        basic: [
            {
                title: "1. Selección de Jugadores",
                text: "En el menú izquierdo puedes seleccionar jugadores de cada equipo. Haz clic en los números para mostrar/ocultar jugadores en el campo. También puedes usar los botones 'Mostrar equipo azul/rojo' para colocar todo el equipo automáticamente.",
                target: "#players-panels",
                action: "playerToggle",
                position: "right"
            },
            {
                title: "2. Sistema de Animación",
                text: "Usa los controles de frames para crear secuencias. El botón '+ Añadir' crea un nuevo frame. Las flechas À ¶ te permiten navegar entre frames. Cada frame es un paso de tu jugada.",
                target: "#frame-controls",
                action: "frameAction",
                position: "left"
            },
            {
                title: "3. Mover Fichas",
                text: "Con el modo 'Mover fichas' activo, arrastra los jugadores en el campo para crear tu jugada. Al moverlos, se crearán líneas de trayectoria. Puedes seleccionar varios jugadores con Ctrl+clic o arrastrando una caja.",
                target: "#pitch",
                action: "playerMove",
                position: "top"
            },
            {
                title: "4. Reproducir y Exportar",
                text: "Usa '¶ Reproducir' para ver tu animación. El botón 'Exportar' te permite guardar la animación como video. ¡Ya puedes crear tus jugadas!",
                target: "#playback-controls",
                action: null,
                position: "left"
            }
        ],
        advanced: [
            {
                title: "Herramienta: Flechas",
                text: "El menú de flechas te permite dibujar dos tipos: flechas normales para indicar movimientos y flechas de patada con arco. Haz clic para marcar el inicio y el final de la flecha.",
                target: "#arrow-menu-container",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Texto",
                text: "Añade anotaciones a tus jugadas. Haz clic en el campo para colocar texto explicativo. Puedes arrastrar el texto para reposicionarlo.",
                target: "#mode-text",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Melé",
                text: "Posiciona automáticamente a los jugadores en formación de melé. Haz clic en el campo y elige qué equipo(s) participan. Los jugadores se colocarán en la formación correcta.",
                target: "#mode-scrum",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Zonas",
                text: "Crea zonas de colores en el campo para destacar áreas tácticas. Selecciona un color, dibuja el área y asígnale un nombre. Puedes bloquear/desbloquear zonas para evitar moverlas.",
                target: "#mode-zone",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Escudos",
                text: "Asigna escudos a los jugadores. Puedes colocarlo apuntando a donde sea. El escudo se vincula a la ficha y se mueve con ella",
                target: "#mode-shield",
                action: null,
                position: "right"
            },
            {
                title: "Controles del Balón",
                text: "El botón 'Mostrar / ocultar balón' te permite controlar la visibilidad del balón en cada frame. Útil para simular diferentes fases de juego.",
                target: "#toggle-ball",
                action: null,
                position: "right"
            },
            {
                title: "Limpiar Tablero",
                text: "Usa 'Borrar flechas' para eliminar solo las flechas del frame actual. 'Limpiar tablero' resetea completamente el frame: elimina jugadores, flechas, textos y trails.",
                target: "#clear-board",
                action: null,
                position: "right"
            }
        ]
    },

    /**
     * Inicia un tutorial
     * @param {string} type - 'basic' o 'advanced'
     */
    start(type = 'basic') {
        this.active = true;
        this.currentStep = 0;
        this.currentTutorialType = type;
        this.actionCompleted = false;

        // Mostrar overlay
        document.getElementById('tutorial-overlay').classList.remove('hidden');
        document.getElementById('tutorial-box').classList.remove('hidden');

        this.showStep(0);
    },

    /**
     * Muestra un paso específico del tutorial
     * @param {number} stepIndex - Índice del paso a mostrar
     */
    showStep(stepIndex) {
        const steps = this.tutorials[this.currentTutorialType];
        if (stepIndex < 0 || stepIndex >= steps.length) return;

        this.currentStep = stepIndex;
        this.actionCompleted = false;
        const step = steps[stepIndex];

        // Actualizar contenido
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-text').textContent = step.text;

        // Actualizar botones
        const btnPrev = document.getElementById('tutorial-prev');
        const btnNext = document.getElementById('tutorial-next');

        btnPrev.disabled = stepIndex === 0;

        // Actualizar texto del botón siguiente
        if (stepIndex === steps.length - 1) {
            btnNext.innerHTML = 'Finalizar';
        } else {
            btnNext.innerHTML = `
                <span class="btn-label">Paso adelante</span>
                <span class="btn-arrow">’</span>
            `;
        }

        // Posicionar spotlight y cuadro
        this.positionSpotlight(step.target, step.position);
    },

    /**
     * Posiciona el spotlight y el cuadro de información
     * @param {string} selector - Selector CSS del elemento a destacar
     * @param {string} boxPosition - Posición del cuadro ('top', 'bottom', 'left', 'right')
     */
    positionSpotlight(selector, boxPosition) {
        const spotlight = document.getElementById('tutorial-spotlight');
        const tutorialBox = document.getElementById('tutorial-box');
        const target = document.querySelector(selector);

        if (!target) {
            console.warn('Tutorial: elemento no encontrado:', selector);
            spotlight.classList.remove('active');
            return;
        }

        const rect = target.getBoundingClientRect();
        const padding = 10;

        // Posicionar spotlight
        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';
        spotlight.classList.add('active');

        // Posicionar cuadro de información
        const boxRect = tutorialBox.getBoundingClientRect();
        let left, top;

        switch(boxPosition) {
            case 'right':
                left = rect.right + 20;
                top = rect.top + (rect.height / 2) - (boxRect.height / 2);
                break;
            case 'left':
                left = rect.left - boxRect.width - 20;
                top = rect.top + (rect.height / 2) - (boxRect.height / 2);
                break;
            case 'top':
                left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                top = rect.top - boxRect.height - 20;
                break;
            case 'bottom':
                left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                top = rect.bottom + 20;
                break;
            default:
                left = window.innerWidth / 2 - boxRect.width / 2;
                top = window.innerHeight / 2 - boxRect.height / 2;
        }

        // Ajustar si se sale de la pantalla
        left = Math.max(10, Math.min(left, window.innerWidth - boxRect.width - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - boxRect.height - 10));

        tutorialBox.style.left = left + 'px';
        tutorialBox.style.top = top + 'px';
    },

    /**
     * Avanza al siguiente paso
     */
    next() {
        const steps = this.tutorials[this.currentTutorialType];
        if (this.currentStep < steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.finish();
        }
    },

    /**
     * Retrocede al paso anterior
     */
    prev() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    },

    /**
     * Omite el tutorial
     */
    skip() {
        this.finish();
    },

    /**
     * Finaliza el tutorial
     */
    finish() {
        this.active = false;
        document.getElementById('tutorial-overlay').classList.add('hidden');
        document.getElementById('tutorial-box').classList.add('hidden');
        document.getElementById('tutorial-spotlight').classList.remove('active');

        // Si terminó el tutorial básico, preguntar si quiere ver el avanzado
        if (this.currentTutorialType === 'basic') {
            setTimeout(async () => {
                const verAvanzado = await Popup.show({
                    title: "Tutorial Básico Completado",
                    html: `
                        <p>¡Excelente! Has completado el tutorial básico.</p>
                        <p>¿Quieres ver el tutorial avanzado para conocer todas las herramientas?</p>
                    `,
                    showCancel: true,
                    okText: "Ver tutorial avanzado",
                    cancelText: "Empezar a usar la app"
                });

                if (verAvanzado) {
                    setTimeout(() => Tutorial.start('advanced'), 300);
                }
            }, 500);
        }
    },

    /**
     * Detecta acciones del usuario y avanza automáticamente si corresponde
     * @param {string} actionType - Tipo de acción realizada
     */
    detectAction(actionType) {
        if (!this.active) return;

        const currentStep = this.tutorials[this.currentTutorialType][this.currentStep];
        if (currentStep.action === actionType && !this.actionCompleted) {
            this.actionCompleted = true;
            // Auto-avanzar después de 1 segundo
            setTimeout(() => {
                if (this.active && this.actionCompleted) {
                    this.next();
                }
            }, 1000);
        }
    }
};

/**
 * Inicializa los eventos del tutorial
 * Debe llamarse una vez que el DOM esté listo
 */
export function initTutorialEvents() {
    // Botón de ayuda - inicia directamente el tutorial básico
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.onclick = () => {
            Tutorial.start('basic');
        };
    }

    // Botones del tutorial
    const tutorialNext = document.getElementById('tutorial-next');
    const tutorialPrev = document.getElementById('tutorial-prev');
    const tutorialSkip = document.getElementById('tutorial-skip');

    if (tutorialNext) {
        tutorialNext.onclick = () => Tutorial.next();
    }

    if (tutorialPrev) {
        tutorialPrev.onclick = () => Tutorial.prev();
    }

    if (tutorialSkip) {
        tutorialSkip.onclick = () => Tutorial.skip();
    }
}
