import { es } from "../locales/es.js";
import { en } from "../locales/en.js";

export const I18n = {
    currentLocale: 'es',
    translations: {
        es: es,
        en: en
    },

    /**
     * Inicializa el sistema de i18n
     * @param {string} locale Idioma inicial (opcional)
     */
    init(locale = 'es') {
        // Intentar cargar de localStorage si existe
        const storedLocale = localStorage.getItem('rugby_locale');
        if (storedLocale && this.translations[storedLocale]) {
            this.currentLocale = storedLocale;
        } else {
            this.currentLocale = locale;
        }

        console.log(`I18n initialized with locale: ${this.currentLocale}`);
        this.translatePage();
    },

    /**
     * Cambia el idioma actual y actualiza la página
     * @param {string} locale Nuevo idioma ('es', 'en')
     */
    setLocale(locale) {
        if (!this.translations[locale]) {
            console.error(`Locale '${locale}' not found.`);
            return;
        }
        this.currentLocale = locale;
        localStorage.setItem('rugby_locale', locale);
        this.translatePage();
    },

    /**
     * Obtiene una traducción por clave
     * @param {string} key Clave de la traducción
     * @returns {string} Texto traducido o la clave si no existe
     */
    t(key) {
        const dict = this.translations[this.currentLocale];
        return dict[key] || key;
    },

    /**
     * Traduce todos los elementos con el atributo data-i18n
     */
    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);

            // Si es un input/textarea, usar placeholder o value
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) {
                    el.placeholder = text;
                }
            } else {
                // Mantener iconos SVG u otros elementos hijos si es necesario?
                // En este caso, reemplazamos el texto. 
                // Si el botón tiene icono + texto, necesitamos estructura específica.
                // Estrategia: Buscar nodo de texto directo y reemplazarlo, o usar span para texto.

                // Opción simple: Si el elemento tiene hijos elementales (no solo texto), 
                // intentamos buscar un span con clase 'i18n-text' o similar, 
                // o asumimos que el texto es el último nodo hijo.

                // Estrategia robusa: Reemplazar solo contenido de texto, preservando iconos.
                // O mejor aún: el HTML debería tener <span> para el texto si hay iconos combinados.

                // Verificamos si tiene hijos elementos (como SVG)
                if (el.children.length > 0) {
                    // Caso especial: Botones con Icono + Texto
                    // Buscamos si hay nudos de texto mezclados
                    // O si estamos usando data-i18n-target="title" para attributos

                    // Si el elemento tiene children, asumimos que el texto está en un nodo de texto directo
                    // o envuelto.

                    // Iteramos nodos hijos
                    let textNodeFound = false;
                    el.childNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                            node.textContent = text; // Padding spaces lost? Use ' ' + text?
                            // A veces los botones tienen " <svg>... Icono"
                            // Esto puede ser tricky.
                            textNodeFound = true;
                        }
                    });

                    if (!textNodeFound) {
                        // Si no encontramos nodo texto, tal vez deberíamos agregar uno o reemplazar todo?
                        // Si data-i18n está en el padre, y tiene SVG, asumamos que queremos poner el texto.
                        // Pero esto borraria el SVG si usamos textContent.
                        // Por seguridad: Si no encontramos nodo texto, NO hacemos nada destructivo por ahora,
                        // salvo que el elemento sea conocido.
                    }
                } else {
                    el.textContent = text;
                }
            }

            // Atributos especiales title, aria-label
            if (el.hasAttribute('title')) {
                // A veces el título también se traduce, o es LO QUE se traduce
                // Si data-i18n está puesto, asumimos que el contenido principal es lo que se traduce.
                // Si queremos traducir title, usamos data-i18n-title
            }
        });

        // Traducir atributos específicos (title, aria-label, placeholder)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = this.t(el.getAttribute('data-i18n-title'));
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
        });

        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            el.ariaLabel = this.t(el.getAttribute('data-i18n-aria'));
        });

        // Disparar evento de cambio de idioma por si otros componentes necesitan redibujarse
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { locale: this.currentLocale } }));
    }
};
