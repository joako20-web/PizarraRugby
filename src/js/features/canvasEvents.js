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
                        offsets: Array.from(state.selectedPlayers).map(pl => ({ dx: pos.x - pl.x, dy: pos.y - pl.y })),
                        // Initialize path recording for each player
                        // If player already has a recorded path, continue from it (Append mode)
                        paths: Array.from(state.selectedPlayers).map(pl => {
                            if (pl.path && pl.path.length > 0) {
                                // Check if last point matches current pos (it should)
                                // If so, clone it.
                                return [...pl.path];
                            }
                            return [{ x: pl.x, y: pl.y }];
                        })
                    };
                } else {
                    // Selección única
                    Store.selectEntity('player', p, false);
                    state.dragTarget = {
                        type: "players",
                        players: [p],
                        startPositions: [{ x: p.x, y: p.y }],
                        offsets: [{ dx: pos.x - p.x, dy: pos.y - p.y }],
                        // Initialize path recording
                        paths: (p.path && p.path.length > 0) ? [[...p.path]] : [[{ x: p.x, y: p.y }]]
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

                // Add current position to path recorder (throttle?)
                // Since this runs on every mouse move, it might be too dense.
                // We'll filter it later or add a distance check here.

                state.dragTarget.players.forEach((pl, i) => {
                    const newX = pos.x - offsets[i].dx;
                    const newY = pos.y - offsets[i].dy;

                    pl.x = newX;
                    pl.y = newY;

                    // Record path point - only if moved enough to avoid clutter
                    const currentPath = state.dragTarget.paths[i];
                    const lastPt = currentPath[currentPath.length - 1];
                    const dist = Math.hypot(newX - lastPt.x, newY - lastPt.y);
                    if (dist > 5) {
                        currentPath.push({ x: newX, y: newY });
                    }
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

    async handleMouseUp(e) { // Make async for Popup
        // Normalize event for async usage if needed, though we only need keys
        const isAlt = e.altKey;

        if (state.draggingZone) {
            state.draggingZone = false;
        }

        // Finalizar dibujo libre
        if (state.mode === "freehand" && state.currentPath) {
            const f = Utils.getCurrentFrame();
            if (state.currentPath.length > 1) {
                if (!f.drawings) f.drawings = [];
                f.drawings.push({
                    points: state.currentPath,
                    color: "white"
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
            if (state.dragTarget.type === "players") {
                const f = Utils.getCurrentFrame();
                const currentFrameIndex = state.currentFrameIndex;

                // --- MULTI-FRAME LOGIC ---
                let framesToGenerate = 0;
                if (isAlt) {
                    const input = await Popup.prompt(I18n.t('prompt_frames_duration') || "Duration (frames):", "5");
                    const num = parseInt(input);
                    if (!isNaN(num) && num > 1) {
                        framesToGenerate = num;
                    }
                }

                state.dragTarget.players.forEach((pl, i) => {
                    const st = state.dragTarget.startPositions[i];
                    let recPath = state.dragTarget.paths[i];

                    // SIMPLIFY PATH (Linear Segments)
                    // Apply Douglas-Peucker to reduce points and create straight lines
                    if (recPath && recPath.length > 2) {
                        try {
                            recPath = this.simplifyPath(recPath, 2.0); // 2.0 tolerance
                            state.dragTarget.paths[i] = recPath; // Update reference if needed
                        } catch (e) {
                            console.error("Path simplification failed:", e);
                        }
                    }

                    // 1. Save recorded path to the player in the CURRENT frame (Frame A)
                    // The renderer looks at Frame A's player to see how they get to Frame B? 
                    // No, usually interpolation is A -> B. 
                    // If we want to animate FROM A to B using this path, the path should be assoc with the movement.
                    // Let's store it on the player in Frame A, as "nextPath" or similar, OR just "path".
                    // But wait, 'pl' is the player object in 'f' (Current Frame).
                    // If we are at Frame 1, and we move player to X.
                    // We effectively modified Frame 1. 
                    // Actually, usually you set up Frame 1, then Add Frame 2, then Move Player.
                    // So 'f' IS Frame 2. 
                    // So the path describes how we got TO Frame 2 FROM Frame 1.
                    // So the path should technically belong to the transition, or Frame 1's player?
                    // Renderer.drawInterpolatedFrame(A, B, t)
                    // It looks at A and B.
                    // If we store the path in A, we can find it.
                    // If we store it in B, we can find it.
                    // Let's store it in B (the destination frame), as "incomingPath" or just "path".

                    if (recPath && recPath.length > 1) {
                        pl.path = recPath; // Store path in the player object
                    }

                    // 2. Smart Propagation (only if NOT generating multi-frames, to avoid mess)
                    if (framesToGenerate <= 1) {
                        this.propagatePlayerMovement(pl, st.x, st.y, pl.x, pl.y, currentFrameIndex);
                    }

                    // 3. Multi-Frame Generation
                    if (framesToGenerate > 1 && recPath && recPath.length > 1) {
                        // We need to generate N-1 intermediate frames.
                        // Frame A (Start) -> ... -> Frame Z (End/Current)
                        // Actually, we are currently AT the End Frame (f).
                        // We want to insert frames BEFORE f? Or AFTER?
                        // User workflow: Frame 1 (Start). Add Frame (Frame 2). Move Player in Frame 2 (End).
                        // "Make this take 5 frames".
                        // So we want Frame 1 -> F1.1 -> F1.2 -> F1.3 -> F1.4 -> Frame 2.
                        // So we insert frames BETWEEN (currentFrameIndex - 1) and (currentFrameIndex).
                        // BUT `state.frames` is linear.
                        // So we insert at `currentFrameIndex`. original `f` shifts down.

                        // Wait, if I am at Frame 2 and I just moved the player.
                        // I want Frame 2 to become Frame 6.
                        // And Frames 2, 3, 4, 5 to be intermediates.

                        const totalDistance = this.calculatePathLength(recPath);

                        // We need to clone the PREVIOUS frame (Start State)
                        // to base our intermediates on.
                        const prevFrame = state.frames[currentFrameIndex - 1];
                        if (prevFrame) {
                            const newFrames = [];

                            for (let k = 1; k < framesToGenerate; k++) {
                                // t goes from 0 to 1 across the WHOLE path.
                                // We are generating frame k.
                                // Frame 0 (Start) -> Frame 1 (Inter 1) -> ... -> Frame N (End)
                                // There are 'framesToGenerate' segments?
                                // If duration=5. 5 Frames total (1...5). 4 Transitions.
                                // Wait. Duration 5 usually means 5 frames *inclusive*? Or 5 transitions?
                                // User typed "5".
                                // We splice (current, 0, newFrames).
                                // If I add 4 frames. Total 1+4+1 = 6?
                                // Logic: "Duration" = number of steps.
                                // If user says 2. Start -> End. 1 step.
                                // If user says 5. Start -> F1 -> F2 -> F3 -> End. 4 steps?
                                // My previous loop: k=1 to framesToGenerate.
                                // If frames=5. k=1,2,3,4. 4 new frames.
                                // Total frames: Start(old), F1, F2, F3, F4, End(new).
                                // Total 6 frames. 5 transitions. (Start->F1 ... F4->End).
                                // Segment duration = 1/5.

                                const tEnd = k / framesToGenerate;
                                const tStart = (k - 1) / framesToGenerate;

                                // Clone previous frame
                                const interFrame = Frame.clone(prevFrame);

                                // Update THIS player's position in interFrame
                                const pInter = interFrame.players.find(x => x.team === pl.team && x.number === pl.number);
                                if (pInter) {
                                    // Calculate pos at tEnd along path
                                    const pos = this.getPointOnPath(recPath, tEnd, totalDistance);
                                    pInter.x = pos.x;
                                    pInter.y = pos.y;

                                    // Assign SUB-PATH for the transition to this frame
                                    // Transition is from (k-1) to k.
                                    // Path segment: tStart to tEnd.
                                    const subPath = this.slicePath(recPath, tStart, tEnd, totalDistance);
                                    if (subPath.length > 1) {
                                        pInter.path = subPath;
                                    }
                                }

                                newFrames.push(interFrame);
                            }

                            // Update the FINAL player (End Frame) to have the last segment
                            // Transition F4 -> End.
                            const tStartFinal = (framesToGenerate - 1) / framesToGenerate;
                            const lastSubPath = this.slicePath(recPath, tStartFinal, 1.0, totalDistance);
                            if (lastSubPath.length > 1) {
                                pl.path = lastSubPath;
                            }

                            // Insert new frames BEFORE current frame
                            state.frames.splice(currentFrameIndex, 0, ...newFrames);

                            // Update current index
                            state.currentFrameIndex += (framesToGenerate - 1);

                            Animation.updateUI();
                        }
                    }

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

    calculatePathLength(points) {
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
            total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
        }
        return total;
    },

    // returns sub-segment of points
    slicePath(points, tStart, tEnd, totalLen) {
        if (!totalLen) totalLen = this.calculatePathLength(points);
        if (totalLen === 0) return [points[0], points[0]]; // fallback

        const dStart = totalLen * tStart;
        const dEnd = totalLen * tEnd;

        const result = [];
        let currentDist = 0;

        // Find start point
        // We need to interpolate the exact start point if it falls on a segment
        const startPt = this.getPointOnPath(points, tStart, totalLen);
        result.push(startPt);

        // Add all intermediate points
        for (let i = 0; i < points.length - 1; i++) {
            const dist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);

            // If this segment is fully or partially within range
            const segStart = currentDist;
            const segEnd = currentDist + dist;

            // If point i+1 is inside the range (dStart < segEnd < dEnd? No)
            // We want points whose accumulated distance is > dStart and < dEnd.
            // Actually simpler: just check if the vertex falls in range.
            // The vertex is at 'segEnd' distance.
            if (segEnd > dStart && segEnd < dEnd) {
                result.push(points[i + 1]);
            }

            currentDist += dist;
        }

        // Find end point
        const endPt = this.getPointOnPath(points, tEnd, totalLen);
        result.push(endPt);

        return result;
    },

    // DOUGLAS-PEUCKER SIMPLIFICATION
    simplifyPath(points, tolerance) {
        if (!points || points.length <= 2) return points;

        let maxSqDist = 0;
        let index = 0;
        const end = points.length - 1;

        for (let i = 1; i < end; i++) {
            const sqDist = this.getSqSegDist(points[i], points[0], points[end]);
            if (sqDist > maxSqDist) {
                maxSqDist = sqDist;
                index = i;
            }
        }

        const sqTolerance = tolerance * tolerance;

        if (maxSqDist > sqTolerance) {
            const res1 = this.simplifyPath(points.slice(0, index + 1), tolerance);
            const res2 = this.simplifyPath(points.slice(index), tolerance);

            return res1.slice(0, res1.length - 1).concat(res2);
        } else {
            return [points[0], points[end]];
        }
    },

    getSqSegDist(p, p1, p2) {
        let x = p1.x;
        let y = p1.y;
        let dx = p2.x - x;
        let dy = p2.y - y;

        if (dx !== 0 || dy !== 0) {
            const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        dx = p.x - x;
        dy = p.y - y;
        return dx * dx + dy * dy;
    },

    getPointOnPath(points, t, totalLen) {
        if (!totalLen) totalLen = this.calculatePathLength(points);
        if (totalLen === 0) return points[0];

        const targetDist = totalLen * t;
        let currentDist = 0;

        for (let i = 0; i < points.length - 1; i++) {
            const dist = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
            if (currentDist + dist >= targetDist) {
                const segT = (targetDist - currentDist) / dist;
                return {
                    x: points[i].x + (points[i + 1].x - points[i].x) * segT,
                    y: points[i].y + (points[i + 1].y - points[i].y) * segT
                };
            }
            currentDist += dist;
        }
        return points[points.length - 1];
    },

    propagatePlayerMovement(player, oldX, oldY, newX, newY, startIdx) {
        if (startIdx >= state.frames.length - 1) return;

        const Tolerance = 1.0; // Tolerance for floating point diffs

        for (let i = startIdx + 1; i < state.frames.length; i++) {
            const nextFrame = state.frames[i];
            const p = nextFrame.players.find(x => x.team === player.team && x.number === player.number);

            if (p) {
                // If the player was at the old position (conceptually "static" relative to previous frame), update it.
                // We check against oldX/oldY which represents the position *before the move*.
                // If p.x/p.y in this future frame matches oldX/oldY, it means they haven't been moved yet.
                const dist = Math.hypot(p.x - oldX, p.y - oldY);

                if (dist < Tolerance) {
                    p.x = newX;
                    p.y = newY;
                } else {
                    // Player has a different position in this future frame.
                    // This implies an intentional move existed here, so we stop propagating to preserve that history.
                    break;
                }
            }
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
    },

    handleKeyDown(e) {
        if (state.isTyping) return; // Don't handle keys if typing in a text box (though we use prompt usually)

        // Delete / Backspace
        if (e.key === "Delete" || e.key === "Backspace") {
            if (state.selectedPlayers.size > 0) {
                // We don't delete players usually, we hide them?
                // Or remove from frame?
                // Existing logic usually toggles visibility.
                // Let's leave it empty or implement "Hide Selected".
                // For now, empty prevents crash.
            }
            if (state.selectedShield) {
                const f = Utils.getCurrentFrame();
                f.trainingShields = f.trainingShields.filter(s => s !== state.selectedShield);
                state.selectedShield = null;
                Renderer.drawFrame();
                History.push();
            }
            // Delete arrows/text/drawings? 
            // Need proper selection logic for those first.
        }

        // Escape
        if (e.key === "Escape") {
            if (state.mode === "draw") {
                state.arrowPoints = [];
                state.previewArrow = null;
                state.arrowStart = null;
                Renderer.drawFrame();
            }
            if (state.mode === "zone") {
                Store.setZoneCreationState(null, null, undefined);
                Renderer.drawFrame();
            }
            // Deselect
            Store.clearSelection();
        }
    },

    handleKeyUp(e) {
        // Placeholder to prevent crash
    }
};
