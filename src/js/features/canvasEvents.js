import { Utils } from '../core/utils.js';
import { state } from '../core/state.js';
import { Store } from '../core/store.js';
import { HitTest } from '../core/hitTest.js';
import { Popup } from '../ui/popup.js';
import { UI } from '../ui/ui.js';
import { Renderer } from '../renderer/renderer.js';
import { Tutorial } from './tutorial.js';
import { Scrum } from './scrum.js';
import { History } from './history.js';
import { I18n } from '../core/i18n.js';

// ==============================
// EVENTOS DEL CANVAS
// ==============================
export const CanvasEvents = {
    /**
     * Maneja el evento de clic del mouse/touch en el canvas
     * Delega a diferentes handlers según el modo activo
     * @param {Event} e - Evento del mouse/touch
     */
    async handleMouseDown(e) {
        const pos = Utils.canvasPos(e);
        const f = Utils.getCurrentFrame();

        // Candado de zona
        if (state.selectedZone && state.selectedZone.lockIcon) {
            const L = state.selectedZone.lockIcon;
            if (pos.x >= L.x && pos.x <= L.x + L.size && pos.y >= L.y && pos.y <= L.y + L.size) {
                state.selectedZone.locked = !state.selectedZone.locked;
                Renderer.drawFrame();
                return;
            }
        }

        // Modo zona
        if (state.mode === "zone") {
            if (!state.selectedZoneColor) {
                await Popup.show({
                    title: I18n.t('error_no_color_title'),
                    html: `<p>${I18n.t('error_no_color_msg')}</p>`,
                    showCancel: false
                });
                return;
            }

            if (!state.zoneStart) {
                Store.setZoneCreationState(pos, undefined, undefined);
                return;
            }

            if (!state.zoneEnd) {
                // Prompt for name
                const name = await Popup.prompt(I18n.t('prompt_zone_name'));
                if (!name || name.trim() === "") {
                    Store.setZoneCreationState(null, null, undefined);
                    return;
                }

                const x1 = Math.min(state.zoneStart.x, pos.x);
                const y1 = Math.min(state.zoneStart.y, pos.y);
                const x2 = Math.max(state.zoneStart.x, pos.x);
                const y2 = Math.max(state.zoneStart.y, pos.y);

                const pending = {
                    x1, y1, x2, y2,
                    name,
                    color: state.selectedZoneColor,
                    labelOffsetX: undefined,
                    labelOffsetY: undefined,
                    locked: false
                };

                Store.setZoneCreationState(undefined, pos, pending);
                return;
            }

            if (state.pendingZone) {
                const { left, top, width, height } = Utils.getZoneBounds(state.pendingZone);

                state.pendingZone.labelOffsetX = (pos.x - left) / width;
                state.pendingZone.labelOffsetY = (pos.y - top) / height;

                Store.addZone(state.pendingZone);

                Store.setMode("move");
                Renderer.drawFrame();
                return;
            }
        }

        // Modo escudo de entrenamiento
        if (state.mode === "shield") {
            const p = HitTest.findPlayerAt(pos);
            if (p) {
                // Calcular el ángulo desde el centro del jugador hasta el punto de clic
                const dx = pos.x - p.x;
                const dy = pos.y - p.y;
                const angle = Math.atan2(dy, dx);

                // Buscar si el jugador ya tiene un escudo
                const existingShield = f.trainingShields.find(s =>
                    s.team === p.team && s.number === p.number
                );

                if (existingShield) {
                    // Actualizar el ángulo del escudo existente y empezar a arrastrarlo
                    existingShield.angle = angle;
                    Store.setDraggingShield(existingShield);
                } else {
                    // Crear nuevo escudo y empezar a arrastrarlo
                    const newShield = {
                        team: p.team,
                        number: p.number,
                        angle: angle
                    };
                    f.trainingShields.push(newShield);
                    Store.setDraggingShield(newShield);
                }

                Renderer.drawFrame();
                return;
            }
        }

        // Modo move
        if (state.mode === "move") {
            // Primero verificar si se hizo clic en un escudo
            const shield = HitTest.findShieldAt(pos.x, pos.y);
            if (shield) {
                Store.setDraggingShield(shield);
                Store.selectEntity('shield', shield);
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            // Verificar si se hizo clic en una flecha
            const arrow = HitTest.findArrowAt(pos.x, pos.y);
            if (arrow) {
                Store.selectEntity('arrow', arrow);
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            const z = HitTest.zoneHitTest(pos.x, pos.y);

            if (z) {
                Store.selectEntity('zone', z);

                if (!z.locked) {
                    state.draggingZone = true;
                    const left = Math.min(z.x1, z.x2);
                    const top = Math.min(z.y1, z.y2);
                    state.zoneDragOffset.x = pos.x - left;
                    state.zoneDragOffset.y = pos.y - top;
                }

                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            // Balón
            if (HitTest.ballHitTest(pos)) {
                state.dragTarget = { type: "ball" };
                state.dragOffsetX = pos.x - f.ball.x;
                state.dragOffsetY = pos.y - f.ball.y;
                Renderer.drawFrame();
                return;
            }

            // Texto
            const t = HitTest.findTextAt(pos.x, pos.y);
            if (t) {
                Store.selectEntity('text', t);
                state.dragTarget = { type: "text", obj: t };
                state.dragOffsetX = pos.x - t.x;
                state.dragOffsetY = pos.y - t.y;
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            // Jugador
            const p = HitTest.findPlayerAt(pos);
            if (p) {
                // Tutorial: Mover fichas
                Tutorial.detectAction('playerMove');

                // Si shift está presionado o ya está en selección múltiple
                if (e.shiftKey || e.ctrlKey || state.selectedPlayers.has(p)) {
                    // Logic kept locally for drag preparation, but selection update:
                    if (e.shiftKey || e.ctrlKey) {
                        Store.selectEntity('player', p, true);
                    } else if (!state.selectedPlayers.has(p)) {
                        Store.selectEntity('player', p, false);
                    }

                    // Iniciar arrastre grupal
                    state.dragTarget = {
                        type: "players",
                        players: Array.from(state.selectedPlayers),
                        startPositions: Array.from(state.selectedPlayers).map(pl => ({ x: pl.x, y: pl.y })),
                        offsets: Array.from(state.selectedPlayers).map(pl => ({ dx: pos.x - pl.x, dy: pos.y - pl.y }))
                    };
                } else {
                    // Selección única
                    Store.selectEntity('player', p, false);
                    state.dragTarget = {
                        type: "players",
                        players: [p],
                        startPositions: [{ x: p.x, y: p.y }],
                        players: [p],
                        startPositions: [{ x: p.x, y: p.y }],
                        offsets: [{ dx: pos.x - p.x, dy: pos.y - p.y }]
                    };
                }

                // Ball Carrier Logic (Sticky Ball)
                // Check if ball is "on" any of the dragged players
                const f = Utils.getCurrentFrame();
                const ball = f.ball;
                // Find a carrier among the dragged players
                const carrier = state.dragTarget.players.find(pl => {
                    const dist = Math.hypot(pl.x - ball.x, pl.y - ball.y);
                    // Use a slightly generous threshold (player radius + ball radius seems fair, or just radius)
                    // Let's use 25px (approx player radius + leeway)
                    return dist < 25;
                });

                if (carrier) {
                    state.dragTarget.carryBall = true;
                    state.dragTarget.ballOffset = { dx: carrier.x - ball.x, dy: carrier.y - ball.y };
                    state.dragTarget.carrier = carrier;
                }

                Store.events.emit('selectionChanged'); // Explicitly notify if we bypassed parts of Store logic?
                // Actually selectEntity emits it.
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            // Si clic en el vacío
            if (!e.shiftKey && !e.ctrlKey) {
                Store.clearSelection();
                UI.updateDeleteButton();
                Renderer.drawFrame();
            }

            // Iniciar caja de selección si es click en vacío y no hay otra acción
            state.selectingBox = true;
            state.selectBoxStart = pos;
            state.selectBoxEnd = pos;
        }

        // Modo texto
        if (state.mode === "text") {
            const text = await Popup.prompt(I18n.t('prompt_text_enter'), I18n.t('default_text_new'));
            if (text) {
                f.texts.push({
                    x: pos.x,
                    y: pos.y,
                    text: text
                });
                Store.setMode("move");
                Renderer.drawFrame();
                History.push();
            }
        }

        // Modo flecha
        if (state.mode === "draw" || state.mode === "kick") {
            // Kick arrows use legacy format (2 points only, no multi-point support)
            if (state.mode === "kick") {
                if (!state.arrowStart) {
                    state.arrowStart = pos;
                } else {
                    const f = Utils.getCurrentFrame();
                    f.arrows.push({
                        type: "kick",
                        x1: state.arrowStart.x,
                        y1: state.arrowStart.y,
                        x2: pos.x,
                        y2: pos.y,
                        color: "yellow"
                    });
                    state.arrowStart = null;
                    state.previewArrow = null;
                    Renderer.drawFrame();
                    History.push();
                }
                return;
            }

            // Normal arrows support multi-point (corners)
            // Right-click finalizes arrow if in progress
            if (e.button === 2 && state.arrowPoints.length > 0) {
                const f = Utils.getCurrentFrame();
                f.arrows.push({
                    type: "normal",
                    points: [...state.arrowPoints],
                    color: "white"
                });
                state.arrowStart = null;
                state.arrowPoints = [];
                state.previewArrow = null;
                Renderer.drawFrame();
                History.push();
                return;
            }

            if (!state.arrowStart) {
                // First click: start arrow
                state.arrowStart = pos;
                state.arrowPoints = [{ x: pos.x, y: pos.y }];
            } else {
                // Subsequent clicks: add point with delay to detect double-click
                // Clear any pending timeout
                if (state.clickTimeout) {
                    clearTimeout(state.clickTimeout);
                    state.clickTimeout = null;
                }

                // Set timeout to add point (will be cancelled if double-click happens)
                state.clickTimeout = setTimeout(() => {
                    state.arrowPoints.push({ x: pos.x, y: pos.y });
                    Renderer.drawFrame();
                    state.clickTimeout = null;
                }, 250); // 250ms delay to detect double-click
            }
        } else if (state.mode === "scrum") {
            await Scrum.place(pos.x, pos.y);
            History.push(); // Guardar melé
        }

        // Modo dibujo libre
        if (state.mode === "freehand") {
            state.currentPath = [{ x: pos.x, y: pos.y }];
            Renderer.drawFrame();
        }
    },

    handleMouseMove(e) {
        const pos = Utils.canvasPos(e);

        if (state.mode === "zone" && state.pendingZone) {
            Renderer.drawFrame(); // Redibujar zona pendiente si la tuviéramos interactiva
            return;
        }

        // Arrastrar zona
        if (state.draggingZone && state.selectedZone && !state.selectedZone.locked) {
            const z = state.selectedZone;
            const w = Math.abs(z.x2 - z.x1);
            const h = Math.abs(z.y2 - z.y1);

            const newLeft = pos.x - state.zoneDragOffset.x;
            const newTop = pos.y - state.zoneDragOffset.y;

            z.x1 = newLeft;
            z.y1 = newTop;
            z.x2 = newLeft + w;
            z.y2 = newTop + h;

            Renderer.drawFrame();
            return;
        }

        // Arrastrar escudo
        if (state.draggingShield) {
            const shield = state.draggingShield;
            const f = Utils.getCurrentFrame();
            const player = Utils.findPlayerByTeamNumber(shield.team, shield.number, f);

            if (player) {
                // Actualizar ángulo
                const dx = pos.x - player.x;
                const dy = pos.y - player.y;
                shield.angle = Math.atan2(dy, dx);
            }
            Renderer.drawFrame();
            return;
        }

        if (state.dragTarget) {
            if (state.dragTarget.type === "ball") {
                const f = Utils.getCurrentFrame();
                f.ball.x = pos.x - state.dragOffsetX;
                f.ball.y = pos.y - state.dragOffsetY;
            } else if (state.dragTarget.type === "text") {
                state.dragTarget.obj.x = pos.x - state.dragOffsetX;
                state.dragTarget.obj.y = pos.y - state.dragOffsetY;
            } else if (state.dragTarget.type === "players") {
                const offsets = state.dragTarget.offsets;
                state.dragTarget.players.forEach((pl, i) => {
                    pl.x = pos.x - offsets[i].dx;
                    pl.y = pos.y - offsets[i].dy;
                });

                // Move Ball if carried
                if (state.dragTarget.carryBall && state.dragTarget.carrier) {
                    const f = Utils.getCurrentFrame();
                    const carrier = state.dragTarget.carrier;
                    f.ball.x = carrier.x - state.dragTarget.ballOffset.dx;
                    f.ball.y = carrier.y - state.dragTarget.ballOffset.dy;
                }
            }
            Renderer.drawFrame();
            return;
        }

        // Caja de selección
        if (state.selectingBox) {
            state.selectBoxEnd = pos;
            // Actualizar selección
            const x1 = Math.min(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y1 = Math.min(state.selectBoxStart.y, state.selectBoxEnd.y);
            const x2 = Math.max(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y2 = Math.max(state.selectBoxStart.y, state.selectBoxEnd.y);

            const f = Utils.getCurrentFrame();
            state.selectedPlayers.clear();
            f.players.forEach(p => {
                if (!p.visible) return;
                if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) {
                    state.selectedPlayers.add(p);
                }
            });
            UI.updateDeleteButton();
            Renderer.drawFrame();
        }

        // Preview flecha
        if ((state.mode === "draw" || state.mode === "kick") && state.arrowStart) {
            if (state.mode === "kick") {
                // Kick arrows use legacy format
                state.previewArrow = {
                    type: "kick",
                    x1: state.arrowStart.x,
                    y1: state.arrowStart.y,
                    x2: pos.x,
                    y2: pos.y,
                    color: "rgba(255,255,0,0.5)"
                };
            } else {
                // Normal arrows use multi-point format
                const previewPoints = [...state.arrowPoints, { x: pos.x, y: pos.y }];
                state.previewArrow = {
                    type: "normal",
                    points: previewPoints,
                    color: "rgba(255,255,255,0.5)"
                };
            }
            Renderer.drawFrame();
        }

        // Modo dibujo libre en progreso
        if (state.mode === "freehand" && state.currentPath) {
            state.currentPath.push({ x: pos.x, y: pos.y });
            Renderer.drawFrame();
        }

        // Modo Borrador (Eraser)
        if (state.mode === "eraser" && (e.buttons === 1 || e.type === "touchmove")) {
            const f = Utils.getCurrentFrame();
            if (f.drawings && f.drawings.length > 0) {
                const eraserRadius = 20; // Radio de borrado


                // Filtrar dibujos que NO toquen el borrador
                const initialLength = f.drawings.length;
                f.drawings = f.drawings.filter(drawing => {
                    // Verificar si algún punto del dibujo está cerca del mouse
                    for (const point of drawing.points) {
                        const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
                        if (dist < eraserRadius) {
                            return false; // Eliminar este dibujo
                        }
                    }
                    return true; // Mantener
                });

                if (f.drawings.length < initialLength) {
                    Renderer.drawFrame();
                    // Debounce history push? Or just push on mouse up? 
                    // Pushing on every delete might be too much, but effective.
                    // Let's rely on MouseUp for history if possible, or just push now.
                    // For better UX, pushing now ensures granularity if we delete multiple strokes.
                    // But undoing one by one might be tedious.
                    // Let's wait for mouseUp to push history if we want to group deletions?
                    // OR push history ONLY if we deleted something.
                    // Ideally we group deletions per stroke (drag action).
                    // We can set a flag "state.somethingErased = true" and push on mouseUp.
                    state.somethingErased = true;
                }
            }
        }
    },

    handleMouseUp() {
        if (state.draggingZone) {
            // draggingZone is a local flag in older code?
            // checking grep: state.draggingZone = true (line 170)
            // It seems 'state.draggingZone' is also a state property!
            // I should migrate this too, or assume setSelection handles it implicitly?
            // Logic says it handles drag state. Let's create a setter or just manually fix here for now
            // But Store.selectEntity handles selection. Dragging logic is usually separate.
            state.draggingZone = false;
        }

        // Finalizar dibujo libre
        if (state.mode === "freehand" && state.currentPath) {
            const f = Utils.getCurrentFrame();
            if (state.currentPath.length > 1) {
                // Ensure drawings array exists (for legacy frames)
                if (!f.drawings) f.drawings = [];

                f.drawings.push({
                    points: state.currentPath,
                    color: "white" // Default color
                });
                History.push();
            }
            state.currentPath = null;
            Renderer.drawFrame();
            return;
        }

        // Finalizar borrado
        if (state.mode === "eraser" && state.somethingErased) {
            History.push();
            state.somethingErased = false;
        }

        // Si estábamos arrastrando un escudo en modo shield, volver a modo move
        if (state.draggingShield && state.mode === "shield") {
            state.draggingShield = null;
            Store.setMode("move");
            Renderer.drawFrame();
            return;
        }

        Store.setDraggingShield(null);

        if (state.dragTarget) {
            // Push history for ANY drag action completion (ball, text, players)
            // But only if we actually moved something?
            // For now, simpler to just push if we had a drag target.

            if (state.dragTarget.type === "players") {
                const f = Utils.getCurrentFrame();
                state.dragTarget.players.forEach((pl, i) => {
                    const st = state.dragTarget.startPositions[i];
                    // Solo añadir trail si se movió significativamente
                    if (Math.hypot(pl.x - st.x, pl.y - st.y) > 2) {
                        f.trailLines.push({
                            x1: st.x,
                            y1: st.y,
                            x2: pl.x,
                            y2: pl.y,
                            team: pl.team
                        });
                    }
                });
            }
            History.push();
        }

        state.dragTarget = null;

        if (state.selectingBox) {
            state.selectingBox = false;
            state.selectBoxStart = null;
            state.selectBoxEnd = null;
            Renderer.drawFrame();
        }
    },

    async handleDoubleClick(e) {
        const pos = Utils.canvasPos(e);
        const f = Utils.getCurrentFrame();

        // If creating a normal arrow (not kick), finalize it on double-click
        if (state.mode === "draw" && state.arrowPoints.length > 0) {
            // Clear any pending single-click add (which might have been set by the first click of the dbl-click)
            if (state.clickTimeout) {
                clearTimeout(state.clickTimeout);
                state.clickTimeout = null;
            }

            // Ensure the final point (where double-click happened) is added
            const lastPoint = state.arrowPoints[state.arrowPoints.length - 1];
            const dist = Math.hypot(pos.x - lastPoint.x, pos.y - lastPoint.y);

            // Add point if it's distinct enough from the last confirmed point
            if (dist > 5) {
                state.arrowPoints.push({ x: pos.x, y: pos.y });
            }

            // Finalize with existing points
            f.arrows.push({
                type: "normal",
                points: [...state.arrowPoints],
                color: "white"
            });
            state.arrowStart = null;
            state.arrowPoints = [];
            state.previewArrow = null;
            Renderer.drawFrame();
            History.push();
            return;
        }

        // Verificar si se hizo doble clic en un texto
        const t = HitTest.findTextAt(pos.x, pos.y);
        if (!t) return;

        const tx = await Popup.prompt(I18n.t('prompt_text_edit'), t.text);
        if (tx === null) return;

        if (tx.trim() === "") {
            f.texts = f.texts.filter(x => x !== t);
        } else {
            t.text = tx.trim();
        }
        Renderer.drawFrame();
    }
};
