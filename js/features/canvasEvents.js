import { Utils } from '../core/utils.js';
import { state } from '../core/state.js';
import { HitTest } from '../core/hitTest.js';
import { Popup } from '../ui/popup.js';
import { UI } from '../ui/ui.js';
import { Renderer } from '../renderer/renderer.js';
import { Mode } from './mode.js';
import { Tutorial } from './tutorial.js';
import { Scrum } from './scrum.js';
import { History } from './history.js';

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
                    title: "Color no seleccionado",
                    html: `<p>Debes elegir un color para crear una zona.</p>`,
                    showCancel: false
                });
                return;
            }

            if (!state.zoneStart) {
                state.zoneStart = pos;
                return;
            }

            if (!state.zoneEnd) {
                state.zoneEnd = pos;

                const name = await Popup.prompt("Nombre de la zona:");
                if (!name || name.trim() === "") {
                    state.zoneStart = null;
                    state.zoneEnd = null;
                    return;
                }

                const x1 = Math.min(state.zoneStart.x, pos.x);
                const y1 = Math.min(state.zoneStart.y, pos.y);
                const x2 = Math.max(state.zoneStart.x, pos.x);
                const y2 = Math.max(state.zoneStart.y, pos.y);

                state.pendingZone = {
                    x1, y1, x2, y2,
                    name,
                    color: state.selectedZoneColor,
                    labelOffsetX: undefined,
                    labelOffsetY: undefined,
                    locked: false
                };

                Renderer.drawFrame();
                return;
            }

            if (state.pendingZone) {
                const { left, top, width, height } = Utils.getZoneBounds(state.pendingZone);

                state.pendingZone.labelOffsetX = (pos.x - left) / width;
                state.pendingZone.labelOffsetY = (pos.y - top) / height;

                state.zones.push(state.pendingZone);
                state.pendingZone = null;
                state.zoneStart = null;
                state.zoneEnd = null;

                Mode.set("move");
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
                    state.draggingShield = existingShield;
                } else {
                    // Crear nuevo escudo y empezar a arrastrarlo
                    const newShield = {
                        team: p.team,
                        number: p.number,
                        angle: angle
                    };
                    f.trainingShields.push(newShield);
                    state.draggingShield = newShield;
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
                state.draggingShield = shield;
                state.selectedShield = shield;
                state.selectedZone = null;
                state.selectedText = null;
                state.selectedArrow = null;
                state.selectedPlayers.clear();
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            // Verificar si se hizo clic en una flecha
            const arrow = HitTest.findArrowAt(pos.x, pos.y);
            if (arrow) {
                state.selectedArrow = arrow;
                state.selectedShield = null;
                state.selectedZone = null;
                state.selectedText = null;
                state.selectedPlayers.clear();
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            const z = HitTest.zoneHitTest(pos.x, pos.y);

            if (z) {
                state.selectedZone = z;
                state.selectedShield = null;
                state.selectedText = null;
                state.selectedArrow = null;
                state.selectedPlayers.clear();

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
                state.selectedText = t;
                state.selectedArrow = null;
                state.selectedShield = null;
                state.selectedZone = null;
                state.selectedPlayers.clear();
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
                    if (!state.selectedPlayers.has(p)) {
                        state.selectedPlayers.add(p);
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
                    state.selectedPlayers.clear();
                    state.selectedPlayers.add(p);
                    state.dragTarget = {
                        type: "players",
                        players: [p],
                        startPositions: [{ x: p.x, y: p.y }],
                        offsets: [{ dx: pos.x - p.x, dy: pos.y - p.y }]
                    };
                }

                state.selectedShield = null;
                state.selectedZone = null;
                state.selectedText = null;
                state.selectedArrow = null;
                UI.updateDeleteButton();
                Renderer.drawFrame();
                return;
            }

            // Si clic en el vacío
            if (!e.shiftKey && !e.ctrlKey) {
                state.selectedPlayers.clear();
                state.selectedZone = null;
                state.selectedText = null;
                state.selectedShield = null;
                state.selectedArrow = null;
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
            const text = await Popup.prompt("Ingrese texto:", "Nuevo texto");
            if (text) {
                f.texts.push({
                    x: pos.x,
                    y: pos.y,
                    text: text
                });
                Mode.set("move");
                Renderer.drawFrame();
            }
        }

        // Modo flecha
        if (state.mode === "draw" || state.mode === "kick") {
            if (!state.arrowStart) {
                state.arrowStart = pos;
            } else {
                // This block is replaced by the provided edit, which seems to be intended for handleMouseUp
                // but the instruction explicitly says handleMouseUp.
                // The provided edit also includes a check for distance and curved arrows.
                // Given the context, it seems the user wants to move/replace the arrow creation logic
                // to handleMouseUp and add History.push() there.
                // However, the original code creates the arrow on the *second click* in handleClick.
                // The instruction is to add History.push() if arrow was created successfully in handleMouseUp.
                // This implies the arrow creation logic should be in handleMouseUp.

                // Let's assume the user wants to move the arrow creation logic to handleMouseUp
                // and the handleClick will only set arrowStart.
                // But the provided edit is a full block of code that looks like it should be in handleMouseUp.
                // The instruction is to "Add History.push() if arrow was created successfully in handleMouseUp."
                // The provided "Code Edit" block is a complete arrow creation logic.
                // It seems the user wants to replace the existing arrow creation in handleClick
                // with the provided block, but the instruction says handleMouseUp.

                // Re-reading the instruction and the provided code edit, it seems the user wants to
                // insert the provided block into handleMouseUp, and that block *contains* the arrow creation
                // and History.push(). This means the arrow creation logic should be moved from handleClick
                // to handleMouseUp.

                // Original handleClick arrow creation:
                // f.arrows.push({ type: ..., x1: state.arrowStart.x, y1: state.arrowStart.y, x2: pos.x, y2: pos.y, color: "white" });
                // state.arrowStart = null;
                // state.previewArrow = null;
                // Renderer.drawFrame();

                // The provided edit uses `Utils.getMousePos(e)` which is only available in mouse event handlers.
                // It also uses `state.kickArcHeight` which is not present in the original code.
                // This suggests a more complex arrow drawing mechanism.

                // Given the instruction "Add History.push() if arrow was created successfully in handleMouseUp."
                // and the provided "Code Edit" block, I will insert the block into handleMouseUp.
                // This means the arrow creation logic in handleClick for the second click will be removed,
                // as it will now be handled by handleMouseUp when the mouse is released after dragging.
                // This changes the interaction from two clicks to click-and-drag-release.

                // For now, I will apply the change as literally as possible, assuming the user wants to
                // insert the provided block into handleMouseUp, and the existing arrow creation in handleClick
                // will be implicitly removed or handled differently by the user's larger context.
                // However, the provided edit is *within* the `if (text)` block in the example, which is incorrect.
                // The `{{ ... }}` indicates context. The instruction is to add the block *if arrow was created successfully in handleMouseUp*.
                // The provided "Code Edit" block itself is the arrow creation logic.

                // Let's assume the user wants to replace the existing arrow creation logic in handleClick
                // with the provided block, and the instruction text is slightly misleading about handleMouseUp.
                // The `{{ ... }}` in the instruction's "Code Edit" section shows it being inserted *after* the text mode block,
                // but *before* the scrum mode block, which is exactly where the arrow mode block is in handleClick.

                // This is a tricky instruction due to the mismatch between the instruction text ("handleMouseUp")
                // and the provided "Code Edit" context (which fits into handleClick).
                // I will prioritize the "Code Edit" block's placement as indicated by `{{ ... }}`
                // and assume it's meant to replace the existing arrow creation logic in `handleClick`.
                // The `Utils.getMousePos(e)` in the provided block implies `e` is a mouse event,
                // which is passed to `handleClick` and `handleMouseUp`.

                // If I put it in `handleMouseUp`, then `handleClick` would only set `state.arrowStart`
                // and `handleMouseUp` would complete it. This is a common pattern for drag-to-draw.
                // The original `handleClick` for arrows is two-click.
                // The provided code edit looks like a drag-to-draw completion.

                // Let's re-evaluate. The instruction says "Add `History.push()` if arrow was created successfully in `handleMouseUp`."
                // The provided "Code Edit" block *is* the arrow creation logic, and it includes `History.push()`.
                // The `{{ ... }}` in the "Code Edit" shows it being inserted *within* the `handleClick` function,
                // specifically where the arrow creation logic currently resides.
                // This means the user wants to *replace* the existing arrow creation logic in `handleClick`
                // with the provided block, and the instruction text about `handleMouseUp` is a mistake.

                // I will replace the existing arrow creation logic in `handleClick` with the provided block.
                // This will change the arrow drawing from two clicks to a click-and-drag-release interaction,
                // as `state.arrowStart` will be set on the first click, and the arrow will be drawn on `handleMouseUp`.
                // The `pos` in `handleClick` is `Utils.canvasPos(e)`.
                // The `end` in the provided block is `Utils.getMousePos(e)`.
                // This means the `e` in `handleClick` is the click event, and the `e` in `handleMouseUp` is the mouseup event.
                // The provided block uses `e` to get `end`. This confirms it belongs in `handleMouseUp`.

                // So, the `handleClick` should only set `state.arrowStart`.
                // The `handleMouseUp` should contain the provided block.

                // Let's modify `handleClick` to only set `state.arrowStart` and remove the `else` block.
                // Then, insert the provided block into `handleMouseUp`.

                // Original handleClick arrow logic:
                // if (state.mode === "draw" || state.mode === "kick") {
                //     if (!state.arrowStart) {
                //         state.arrowStart = pos;
                //     } else {
                //         f.arrows.push({ ... }); // This is the part to remove from handleClick
                //         state.arrowStart = null;
                //         state.previewArrow = null;
                //         Renderer.drawFrame();
                //     }
                // }

                // Modified handleClick arrow logic:
                // if (state.mode === "draw" || state.mode === "kick") {
                //     if (!state.arrowStart) {
                //         state.arrowStart = pos;
                //     }
                //     // No else block here, arrow creation moved to handleMouseUp
                // }

                // Now, insert the provided block into handleMouseUp.
                // The provided block uses `e` for `Utils.getMousePos(e)`.
                // The `handleMouseUp` function signature is `handleMouseUp()`. It doesn't receive `e`.
                // This is a critical mismatch. `Utils.getMousePos` needs the event object.

                // Given the `{{ ... }}` context in the instruction's "Code Edit", it's clearly showing
                // the block being inserted into `handleClick`.
                // The instruction text "in handleMouseUp" is likely a mistake.
                // I will follow the placement indicated by the `{{ ... }}` in the "Code Edit" section,
                // which means replacing the existing arrow creation logic in `handleClick`.
                // This implies `e` in `Utils.getMousePos(e)` would be the `e` from `handleClick(e)`.
                // This would make arrow drawing a two-click action, but with the new curved arrow logic.

                // Let's assume the user wants to replace the `else` block of the arrow drawing in `handleClick`.
                // The `pos` variable in `handleClick` is `Utils.canvasPos(e)`.
                // The provided code uses `const end = Utils.getMousePos(e);`.
                // If this is in `handleClick`, then `end` would be the position of the second click.

                // This interpretation makes the most sense given the provided "Code Edit" structure and context.
                // The instruction text "in handleMouseUp" is the confusing part.
                // I will proceed by replacing the `else` block of the arrow drawing in `handleClick`.

                // Original `else` block:
                // } else {
                //     f.arrows.push({
                //         type: (state.mode === "kick") ? "kick" : "normal",
                //         x1: state.arrowStart.x,
                //         y1: state.arrowStart.y,
                //         x2: pos.x,
                //         y2: pos.y,
                //         color: "white"
                //     });
                //     state.arrowStart = null;
                //     state.previewArrow = null;
                //     Renderer.drawFrame();
                // }

                // Replacing this with the provided block:
                if (state.arrowStart) { // This check is redundant if it's in the `else` block, but harmless.
                    const end = pos; // Use `pos` from handleClick, which is `Utils.canvasPos(e)`
                    const dx = end.x - state.arrowStart.x;
                    const dy = end.y - state.arrowStart.y;

                    if (Math.hypot(dx, dy) > 10) {
                        const f = Utils.getCurrentFrame();
                        f.arrows.push({
                            startX: state.arrowStart.x,
                            startY: state.arrowStart.y,
                            endX: end.x,
                            endY: end.y,
                            type: state.mode === "kick" ? "kick" : "normal", // kick o normal
                            color: "yellow",
                            cp1x: state.arrowStart.x + dx / 3,
                            cp1y: state.arrowStart.y - (state.kickArcHeight || 0), // Altura de la curva, add default 0 if not defined
                            cp2x: state.arrowStart.x + 2 * dx / 3,
                            cp2y: end.y - (state.kickArcHeight || 0)
                        });
                        History.push(); // Guardar nueva flecha
                    }
                    state.arrowStart = null;
                    state.previewArrow = null;
                    Renderer.drawFrame();
                }
            }
            // Modo Scrum
        } else if (state.mode === "scrum") {
            await Scrum.place(pos.x, pos.y);
            History.push(); // Guardar melé
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
            state.previewArrow = {
                type: (state.mode === "kick") ? "kick" : "normal",
                x1: state.arrowStart.x,
                y1: state.arrowStart.y,
                x2: pos.x,
                y2: pos.y,
                color: "rgba(255,255,255,0.5)"
            };
            Renderer.drawFrame();
        }
    },

    handleMouseUp() {
        if (state.draggingZone) {
            state.draggingZone = false;
        }

        // Si estábamos arrastrando un escudo en modo shield, volver a modo move
        if (state.draggingShield && state.mode === "shield") {
            state.draggingShield = null;
            Mode.set("move");
            Renderer.drawFrame();
            return;
        }

        state.draggingShield = null;

        if (state.dragTarget && state.dragTarget.type === "players") {
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
            History.push(); // Guardar movimiento
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

        // Verificar si se hizo doble clic en un texto
        const t = HitTest.findTextAt(pos.x, pos.y);
        if (!t) return;

        const tx = await Popup.prompt("Editar texto:", t.text);
        if (tx === null) return;

        if (tx.trim() === "") {
            f.texts = f.texts.filter(x => x !== t);
        } else {
            t.text = tx.trim();
        }
        Renderer.drawFrame();
    }
};
