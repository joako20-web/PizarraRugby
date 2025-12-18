import { Popup } from '../ui/popup.js';

// ==============================
// SISTEMA DE TUTORIAL
// ==============================
export const Tutorial = {
    active: false,
    currentStep: 0,
    currentTutorialType: null, // 'basic' o 'advanced'
    actionCompleted: false,

    // Definición de tutoriales
    tutorials: {
        basic: [
            {
                title: "0. Configuración del Campo",
                text: "Antes de empezar, elige el tipo de campo: 'Campo Completo' para ver todo el campo de rugby, o 'Mitad Campo' para enfocarte en una zona específica. Usa el botón de rotar para cambiar la orientación.",
                target: ".field-config",
                action: null,
                position: "right"
            },
            {
                title: "1. Selección de Jugadores",
                text: "En el menú izquierdo puedes seleccionar jugadores de cada equipo. Haz clic en los números para mostrar/ocultar jugadores en el campo. También puedes usar los botones 'Mostrar equipo azul/rojo' para colocar todo el equipo automáticamente.",
                target: "#players-panels",
                action: "playerToggle",
                position: "right"
            },
            {
                title: "2. Sistema de Animación",
                text: "Usa los controles de frames para crear secuencias. El botón '+ Añadir' crea un nuevo frame. Las flechas ◀ ▶ te permiten navegar entre frames. Cada frame es un paso de tu jugada.",
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
                text: "Usa '▶ Reproducir' para ver tu animación. El botón 'Exportar' te permite guardar la animación como video. ¡Ya puedes crear tus jugadas!",
                target: "#playback-controls",
                action: null,
                position: "left"
            }
        ],
        advanced: [
            {
                title: "Herramienta: Flechas",
                text: "El menú de flechas te permite dibujar dos tipos: flechas normales para indicar movimientos y flechas de patada con arco. Haz clic para marcar el inicio y el final de la flecha. Mantén Shift presionado para ajustar la altura del arco en patadas.",
                target: "#arrow-menu-container",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Texto",
                text: "Añade anotaciones a tus jugadas. Haz clic en el campo para colocar texto explicativo. Puedes arrastrar el texto para reposicionarlo y hacer doble clic para editarlo.",
                target: "#mode-text",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Melé",
                text: "Posiciona automáticamente a los jugadores en formación de melé. Haz clic en el campo y elige qué equipo(s) participan. Los jugadores se colocarán en la formación correcta de 8 vs 8.",
                target: "#mode-scrum",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Zonas",
                text: "Crea zonas de colores en el campo para destacar áreas tácticas. Selecciona un color, dibuja el área haciendo dos clics (esquinas opuestas), asígnale un nombre y luego posiciona la etiqueta. Haz clic en el candado para bloquear/desbloquear zonas.",
                target: "#mode-zone",
                action: null,
                position: "right"
            },
            {
                title: "Herramienta: Escudos",
                text: "Asigna escudos de entrenamiento a los jugadores. Haz clic cerca de un jugador para crear el escudo, luego arrastra para ajustar la dirección. El escudo se mueve con el jugador al crear animaciones.",
                target: "#mode-shield",
                action: null,
                position: "right"
            },
            {
                title: "Gestión de Formaciones",
                text: "Guarda configuraciones tácticas completas con el botón 'Guardar Formación'. Puedes cargar formaciones guardadas desde el selector y eliminarlas con el botón de papelera. Perfecto para reutilizar setups comunes.",
                target: "#save-formation-btn",
                action: null,
                position: "right"
            },
            {
                title: "Controles del Balón",
                text: "El botón 'Mostrar / ocultar balón' te permite controlar la visibilidad del balón en cada frame. Útil para simular diferentes fases de juego. Arrastra el balón para reposicionarlo.",
                target: "#toggle-ball",
                action: null,
                position: "right"
            },
            {
                title: "Borrar Elementos",
                text: "Selecciona cualquier elemento (jugador, flecha, texto, zona, escudo) y presiona la tecla 'Supr' o haz clic en el botón 'Borrar selección' para eliminarlo. 'Borrar flechas' elimina todas las flechas del frame actual.",
                target: "#delete-btn",
                action: null,
                position: "right"
            },
            {
                title: "Limpiar Tablero",
                text: "'Limpiar tablero' resetea completamente el frame actual: oculta jugadores, elimina flechas, textos, escudos y trails. Mantiene las zonas intactas. Útil para empezar un nuevo setup desde cero.",
                target: "#clear-board",
                action: null,
                position: "right"
            },
            {
                title: "Atajos de Teclado",
                text: "Usa 'Esc' para limpiar selecciones. 'Delete/Supr' para borrar elementos. 'Ctrl+Click' para selección múltiple. Estos atajos aceleran tu flujo de trabajo.",
                target: "#pitch",
                action: null,
                position: "top"
            }
        ]
    },

    start(type = 'basic') {
        this.active = true;
        this.currentStep = 0;
        this.currentTutorialType = type;
        this.actionCompleted = false;

        // Mostrar overlay
        const overlay = document.getElementById('tutorial-overlay');
        const box = document.getElementById('tutorial-box');

        if (overlay) overlay.classList.remove('is-hidden');
        if (box) box.classList.remove('is-hidden');

        this.showStep(0);
    },

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
                <span class="btn__label">Paso adelante</span>
                <span class="btn__icon">
                    <svg class="icon icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                </span>
            `;
        }

        // Posicionar spotlight y cuadro
        this.positionSpotlight(step.target, step.position);
    },

    positionSpotlight(selector, boxPosition) {
        const spotlight = document.getElementById('tutorial-spotlight');
        const tutorialBox = document.getElementById('tutorial-box');
        const target = document.querySelector(selector);

        if (!target) {
            console.warn('Tutorial: elemento no encontrado:', selector);
            spotlight.classList.remove('is-active');
            spotlight.classList.add('is-hidden'); // Ocultar si falla
            return;
        }

        const rect = target.getBoundingClientRect();
        const padding = 10;

        // Asegurar posición fija para coordinar con getBoundingClientRect
        spotlight.classList.remove('is-hidden'); // CRÍTICO: Eliminar clase que fuerza display: none
        spotlight.classList.add('is-active');

        spotlight.style.position = 'fixed';
        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';
        spotlight.classList.add('is-active');

        // Posicionar cuadro de información
        // También usar fixed para evitar problemas de scroll
        tutorialBox.style.position = 'fixed';
        const boxRect = tutorialBox.getBoundingClientRect();
        let left, top;
        const margin = 30; // Mayor margen para evitar superposición

        switch (boxPosition) {
            case 'right':
                left = rect.right + margin;
                top = rect.top + (rect.height / 2) - (boxRect.height / 2);
                // Si se sale por la derecha, ponerlo arriba
                if (left + boxRect.width > window.innerWidth - 10) {
                    left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                    top = rect.top - boxRect.height - margin;
                }
                break;
            case 'left':
                left = rect.left - boxRect.width - margin;
                top = rect.top + (rect.height / 2) - (boxRect.height / 2);
                // Si se sale por la izquierda, ponerlo arriba
                if (left < 10) {
                    left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                    top = rect.top - boxRect.height - margin;
                }
                break;
            case 'top':
                left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                top = rect.top - boxRect.height - margin;
                // Si se sale por arriba, ponerlo abajo
                if (top < 10) {
                    top = rect.bottom + margin;
                }
                break;
            case 'bottom':
                left = rect.left + (rect.width / 2) - (boxRect.width / 2);
                top = rect.bottom + margin;
                // Si se sale por abajo, ponerlo arriba
                if (top + boxRect.height > window.innerHeight - 10) {
                    top = rect.top - boxRect.height - margin;
                }
                break;
            default:
                left = window.innerWidth / 2 - boxRect.width / 2;
                top = window.innerHeight / 2 - boxRect.height / 2;
        }

        // Ajustar si se sale de la pantalla (con checks mejorados) para la posición inicial
        left = Math.max(10, Math.min(left, window.innerWidth - boxRect.width - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - boxRect.height - 10));

        // Verificar que no se superponga con el spotlight
        const spotlightRect = {
            left: rect.left - padding,
            right: rect.right + padding,
            top: rect.top - padding,
            bottom: rect.bottom + padding
        };

        const boxFinalRect = {
            left: left,
            right: left + boxRect.width,
            top: top,
            bottom: top + boxRect.height
        };

        // Si hay superposición, mover el box
        if (!(boxFinalRect.right < spotlightRect.left ||
            boxFinalRect.left > spotlightRect.right ||
            boxFinalRect.bottom < spotlightRect.top ||
            boxFinalRect.top > spotlightRect.bottom)) {
            // Hay superposición, mover a la posición opuesta
            if (boxPosition === 'right' || boxPosition === 'left') {
                top = rect.bottom + margin;
                if (top + boxRect.height > window.innerHeight - 10) {
                    top = rect.top - boxRect.height - margin;
                }
            } else {
                left = rect.right + margin;
                if (left + boxRect.width > window.innerWidth - 10) {
                    left = rect.left - boxRect.width - margin;
                }
            }

            // RE-CLAMPING: Asegurar nuevamente que no se salga después del movimiento
            // Esto corrige el bug de "popup fuera de pantalla"
            left = Math.max(10, Math.min(left, window.innerWidth - boxRect.width - 10));
            top = Math.max(10, Math.min(top, window.innerHeight - boxRect.height - 10));
        }

        tutorialBox.style.left = left + 'px';
        tutorialBox.style.top = top + 'px';

        // CORRECCIÓN VISUAL: Asegurar que el spotlight se vea sobre el overlay
        // ESTRATEGIA DEFINITIVA: Separar el borde y el fondo oscuro
        spotlight.style.boxSizing = "border-box"; // Asegurar que el borde no rompa las dimensiones
        spotlight.style.backgroundColor = "transparent";
        spotlight.style.border = "4px solid #00ff88"; // Borde sólido verde

        // ORDEN CRÍTICO: Primero el resplandor (para que se pinte encima de lo oscuro), luego la oscuridad
        spotlight.style.boxShadow = "0 0 20px #00ff88, 0 0 0 9999px rgba(0, 0, 0, 0.85)";

        spotlight.style.borderRadius = "4px";
        spotlight.style.zIndex = "10000"; // Encima de casi todo
        spotlight.style.pointerEvents = "none"; // Permitir clicks a través

        tutorialBox.style.zIndex = "10001"; // El texto por encima del spotlight

        // Ocultamos el overlay estándar para evitar conflictos
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.add('is-hidden');
    },

    next() {
        const steps = this.tutorials[this.currentTutorialType];
        if (this.currentStep < steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.finish();
        }
    },

    prev() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    },

    skip() {
        this.finish();
    },

    finish() {
        this.active = false;
        document.getElementById('tutorial-overlay').classList.add('is-hidden');
        document.getElementById('tutorial-box').classList.add('is-hidden');
        document.getElementById('tutorial-spotlight').classList.remove('is-active');

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

    // Detectar acciones del usuario
    detectAction(actionType) {
        if (!this.active) return;

        const currentStep = this.tutorials[this.currentTutorialType][this.currentStep];
        if (currentStep && currentStep.action === actionType && !this.actionCompleted) {
            this.actionCompleted = true;
            // Auto-avanzar después de 1 segundo
            setTimeout(() => {
                if (this.active && this.currentStep < this.tutorials[this.currentTutorialType].length - 1) {
                    this.next();
                }
            }, 1000);
        }
    }
};
