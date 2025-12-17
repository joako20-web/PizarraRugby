/**
 * Sistema de Manejo de Errores
 * PizarraRugby v2.2.0
 * 
 * Captura y maneja errores globales de forma elegante
 */

export class ErrorHandler {
    constructor() {
        this.setupGlobalHandlers();
        this.errors = [];
        this.maxErrors = 50; // Límite de errores guardados
    }

    /**
     * Configura manejadores globales de errores
     */
    setupGlobalHandlers() {
        // Errores no capturados
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error,
                timestamp: new Date()
            });

            // Prevenir que el error se propague a la consola por defecto
            // event.preventDefault();
        });

        // Promesas rechazadas sin manejo
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || String(event.reason),
                error: event.reason,
                timestamp: new Date()
            });

            // event.preventDefault();
        });

        // Errores de recursos (imágenes, scripts)
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleError({
                    type: 'Resource Error',
                    message: `Failed to load: ${event.target.tagName} - ${event.target.src || event.target.href}`,
                    timestamp: new Date()
                }, false); // No mostrar al usuario
            }
        }, true);
    }

    /**
     * Maneja un error
     * @param {Object} errorInfo - Información del error
     * @param {boolean} showToUser - Si mostrar al usuario
     */
    handleError(errorInfo, showToUser = true) {
        // Guardar error
        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift(); // Eliminar el más antiguo
        }

        // Log en consola (siempre)
        console.error(`[${errorInfo.type}]`, errorInfo);

        // Mostrar al usuario si es necesario
        if (showToUser) {
            this.showUserFriendlyError(errorInfo);
        }

        // Aquí podrías enviar a un servicio de logging externo
        // this.logToExternalService(errorInfo);
    }

    /**
     * Muestra error al usuario de forma amigable
     * @param {Object} errorInfo - Información del error
     */
    showUserFriendlyError(errorInfo) {
        const notification = document.getElementById('notification');
        if (!notification) return;

        let userMessage = 'Ha ocurrido un error';

        // Mensajes personalizados según el tipo
        if (errorInfo.type === 'JavaScript Error') {
            userMessage = '⚠️ Error en la aplicación. Por favor, recarga la página.';
        } else if (errorInfo.type === 'Unhandled Promise Rejection') {
            userMessage = '⚠️ Error al procesar la acción. Inténtalo de nuevo.';
        } else if (errorInfo.message?.includes('Permission denied')) {
            userMessage = '🔒 No tienes permisos para esta acción.';
        } else if (errorInfo.message?.includes('network') || errorInfo.message?.includes('fetch')) {
            userMessage = '🌐 Error de conexión. Verifica tu internet.';
        }

        notification.textContent = userMessage;
        notification.classList.remove('hidden');
        notification.classList.add('show', 'error-notification');

        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.classList.add('hidden');
                notification.classList.remove('error-notification');
            }, 300);
        }, 5000);
    }

    /**
     * Wrapper para ejecutar funciones con manejo de errores
     * @param {Function} fn - Función a ejecutar
     * @param {string} context - Contexto de ejecución
     */
    async safeExecute(fn, context = 'Unknown') {
        try {
            return await fn();
        } catch (error) {
            this.handleError({
                type: 'Caught Error',
                message: error.message,
                context: context,
                stack: error.stack,
                error: error,
                timestamp: new Date()
            });
            return null;
        }
    }

    /**
     * Obtiene historial de errores
     * @returns {Array} Lista de errores
     */
    getErrorHistory() {
        return [...this.errors];
    }

    /**
     * Limpia historial de errores
     */
    clearErrorHistory() {
        this.errors = [];
    }

    /**
     * Log a servicio externo (placeholder)
     * @param {Object} errorInfo - Información del error
     */
    logToExternalService(errorInfo) {
        // Implementar integración con Sentry, LogRocket, etc.
        // Example:
        // if (window.Sentry) {
        //     Sentry.captureException(errorInfo.error, {
        //         tags: { type: errorInfo.type },
        //         extra: errorInfo
        //     });
        // }
    }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

// Exportar versión lista para usar
export default errorHandler;
