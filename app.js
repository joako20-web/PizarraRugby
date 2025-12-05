// ==============================
// CONFIGURACIÓN GENERAL
// ==============================
const NUM_PLAYERS = 15;
const INTERP_DURATION = 950;
const INTERP_STEPS = 24;

// Modo actual de la herramienta
let mode = "move";

// Sistema de frames / animación
let frames = [];
let currentFrameIndex = 0;
let isPlaying = false;
let cancelPlay = false;

// Drag & selección
let dragTarget = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let selectedPlayers = new Set();
let selectingBox = false;
let selectBoxStart = null;
let selectBoxEnd = null;

// Flechas / patadas
let arrowStart = null;
let previewArrow = null;
let kickArcHeight = 60; // altura inicial del arco de la patada

// Zonas (globales a toda la animación)
let zones = [];
let zoneStart = null;
let zoneEnd = null;
let pendingZone = null;        // zona a medio crear (pendiente de etiqueta)
let selectedZoneColor = null;  // color elegido en el panel superior
let selectedZone = null;       // zona actualmente seleccionada
let draggingZone = false;
let zoneDragOffset = { x: 0, y: 0 };

// Canvas
const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");
const marginX = 60;
const marginY = 50;


// ==============================
// UTILIDADES BÁSICAS
// ==============================

/**
 * Devuelve el frame actual.
 */
function getCurrentFrame() {
    return frames[currentFrameIndex];
}

/**
 * Dimensiones del campo interno (sin márgenes).
 */
function fieldDims() {
    const fieldWidth = canvas.width - marginX * 2;
    const fieldHeight = canvas.height - marginY * 2;
    return { fieldWidth, fieldHeight };
}

/**
 * Convierte coordenadas del ratón a coordenadas de canvas.
 */
function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
        x: e.clientX - r.left,
        y: e.clientY - r.top
    };
}
// ========================
// SISTEMA GLOBAL DE POPUPS
// ========================
function showPopup({ title = "Mensaje", html = "", showCancel = true }) {
    return new Promise(resolve => {
        const overlay = document.getElementById("popup-overlay");
        const modalTitle = document.getElementById("popup-title");
        const content = document.getElementById("popup-content");
        const btnCancel = document.getElementById("popup-cancel");
        const btnOk = document.getElementById("popup-ok");
        const buttonsBox = document.getElementById("popup-buttons");

        modalTitle.textContent = title;
        content.innerHTML = html;

        // Mostrar / ocultar botón cancelar y centrar botón aceptar
        if (showCancel) {
            btnCancel.style.display = "block";
            buttonsBox.style.justifyContent = "space-between";
        } else {
            btnCancel.style.display = "none";
            buttonsBox.style.justifyContent = "center";
        }

        overlay.classList.remove("hidden");

        // Click ACEPTAR
        btnOk.onclick = () => {
            overlay.classList.add("hidden");
            resolve(true);
        };

        // Click CANCELAR
        btnCancel.onclick = () => {
            overlay.classList.add("hidden");
            resolve(false);
        };

        // ============================
        // CLIC FUERA DEL POP-UP
        // ============================
        overlay.onclick = (e) => {
            const popup = document.getElementById("popup-modal");

            // Si clicas fuera del cuadro modal → cerrar
            if (!popup.contains(e.target)) {
                overlay.classList.add("hidden");

                if (showCancel)
                    resolve(false);   // Caso melé → cancelar
                else
                    resolve(true);    // Caso color → aceptar
            }
        };
    });
}



// =======================
// PROMPT PERSONALIZADO
// =======================
function popupPrompt(title, placeholder="") {
    return new Promise(resolve => {
        showPopup({
            title,
            html: `<input id="popup-input" type="text" placeholder="${placeholder}">`
        }).then(ok => {
            if (!ok) return resolve(null);
            const val = document.getElementById("popup-input").value.trim();
            resolve(val === "" ? null : val);
        });
    });
}


// =======================
// SELECCIÓN DE EQUIPO MELÉ
// =======================
function popupSelectScrumTeam() {
    return new Promise(resolve => {
        showPopup({
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
                document.getElementById("popup-overlay").classList.add("hidden");
                resolve(btn.dataset.v);
            };
        });
    });
}


// ==============================
// FRAMES Y JUGADORES
// ==============================

/**
 * Crea el array de jugadores vacío (para ambos equipos).
 */
function createEmptyPlayers() {
    const arr = [];
    for (let team of ["A", "B"]) {
        for (let n = 1; n <= NUM_PLAYERS; n++) {
            arr.push({
                team,
                number: n,
                x: null,
                y: null,
                visible: false,
                radius: 20
            });
        }
    }
    return arr;
}

/**
 * Crea un frame vacío.
 */
function createFrame() {
    return {
        players: createEmptyPlayers(),
        ball: {
            x: canvas.width / 2,
            y: canvas.height / 2,
            rx: 24,
            ry: 16,
            visible: true
        },
        arrows: [],
        texts: [],
        trailLines: [] // líneas de trayectoria al mover jugadores
    };
}

/**
 * Clona un frame (deep copy superficial).
 */
function cloneFrame(f) {
    return {
        players: f.players.map(p => ({ ...p })),
        ball: { ...f.ball },
        arrows: f.arrows.map(a => ({ ...a })),
        texts: f.texts.map(t => ({ ...t })),
        trailLines: f.trailLines.map(t => ({ ...t }))
    };
}


// ==============================
// DIBUJO DEL CAMPO
// ==============================

/**
 * Dibuja el campo de rugby con marcas reglamentarias.
 */
function drawPitch() {
    ctx.setLineDash([]);
    const w = canvas.width;
    const h = canvas.height;
    const { fieldWidth, fieldHeight } = fieldDims();

    const inGoal = fieldWidth * 0.07;
    const xTryLeft = marginX + inGoal;
    const xTryRight = marginX + fieldWidth - inGoal;

    // Césped
    const grass = ctx.createLinearGradient(0, 0, 0, h);
    grass.addColorStop(0, "#0b7c39");
    grass.addColorStop(1, "#0a6d33");
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, w, h);

    // Zonas de ensayo
    ctx.fillStyle = "#064d24";
    ctx.fillRect(marginX, marginY, inGoal, fieldHeight);
    ctx.fillRect(xTryRight, marginY, inGoal, fieldHeight);

    // Borde exterior
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

    // Líneas verticales
    const mainField = fieldWidth - inGoal * 2;
    const x5L  = xTryLeft + mainField * 0.05;
    const x22L = xTryLeft + mainField * 0.22;
    const xMid = xTryLeft + mainField * 0.50;
    const x10L = xMid - mainField * 0.10;
    const x10R = xMid + mainField * 0.10;
    const x22R = xTryLeft + mainField * (1 - 0.22);
    const x5R  = xTryLeft + mainField * (1 - 0.05);

    function v(x, dash = [], width = 2) {
        ctx.setLineDash(dash);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x, marginY);
        ctx.lineTo(x, marginY + fieldHeight);
        ctx.stroke();
    }

    v(xTryLeft, [], 3);
    v(xTryRight, [], 3);
    v(x5L, [20, 14]);
    v(x5R, [20, 14]);
    v(x22L);
    v(x22R);
    v(x10L, [14, 10]);
    v(x10R, [14, 10]);
    v(xMid, [], 3);

    // Líneas horizontales
    const y5T  = marginY + fieldHeight * 0.05;
    const y15T = marginY + fieldHeight * 0.25;
    const y15B = marginY + fieldHeight * 0.75;
    const y5B  = marginY + fieldHeight * 0.95;

    ctx.setLineDash([20, 14]);
    ctx.lineWidth = 2;

    for (let y of [y5T, y15T, y15B, y5B]) {
        ctx.beginPath();
        ctx.moveTo(xTryLeft, y);
        ctx.lineTo(xTryRight, y);
        ctx.stroke();
    }

    ctx.setLineDash([]);
}

/**
 * Dibuja el balón de rugby.
 */
function drawRugbyBall(b) {
    if (!b.visible) return;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(-0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, b.rx, b.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f5e1c0";
    ctx.fill();
    ctx.strokeStyle = "#b37a42";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}


// ==============================
// FLECHAS
// ==============================

/**
 * Dibuja una flecha recta normal.
 */
function drawNormalArrow(a) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.lineTo(a.x2, a.y2);
    ctx.stroke();

    const head = 14;
    const ang = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);

    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(
        a.x2 - head * Math.cos(ang - Math.PI / 6),
        a.y2 - head * Math.sin(ang - Math.PI / 6)
    );
    ctx.lineTo(
        a.x2 - head * Math.cos(ang + Math.PI / 6),
        a.y2 - head * Math.sin(ang + Math.PI / 6)
    );
    ctx.fillStyle = "white";
    ctx.fill();
}

/**
 * Dibuja una flecha de patada (curva).
 */
function drawKickArrow(a) {
    // Punto de control del arco (altura configurable)
    const mx = (a.x1 + a.x2) / 2;
    const my = (a.y1 + a.y2) / 2 - kickArcHeight;

    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 3;

    // Curva del arco
    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.quadraticCurveTo(mx, my, a.x2, a.y2);
    ctx.stroke();

    // Cálculo del punto cercano a la punta para orientar la cabeza
    const t = 0.9;
    const qx =
        (1 - t) * (1 - t) * a.x1 +
        2 * (1 - t) * t * mx +
        t * t * a.x2;
    const qy =
        (1 - t) * (1 - t) * a.y1 +
        2 * (1 - t) * t * my +
        t * t * a.y2;

    const ang = Math.atan2(a.y2 - qy, a.x2 - qx);
    const head = 14;

    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(
        a.x2 - head * Math.cos(ang - Math.PI / 6),
        a.y2 - head * Math.sin(ang - Math.PI / 6)
    );
    ctx.lineTo(
        a.x2 - head * Math.cos(ang + Math.PI / 6),
        a.y2 - head * Math.sin(ang + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = "yellow";
    ctx.fill();
}


// ==============================
// ZONAS
// ==============================

/**
 * Dibuja todas las zonas (y la pendingZone si existe).
 */
function drawZones() {
    const list = pendingZone ? [...zones, pendingZone] : zones;

    list.forEach(z => {
        const left = Math.min(z.x1, z.x2);
        const top = Math.min(z.y1, z.y2);
        const w = Math.abs(z.x2 - z.x1);
        const h = Math.abs(z.y2 - z.y1);

        // Relleno translúcido
        ctx.save();
        ctx.fillStyle = z.color || "#ffffff";
        ctx.globalAlpha = 0.25;
        ctx.fillRect(left, top, w, h);

        // Contorno
        ctx.globalAlpha = 1;
        ctx.strokeStyle = (z === selectedZone ? "white" : z.color);
        ctx.lineWidth = (z === selectedZone ? 4 : 3);
        ctx.strokeRect(left, top, w, h);
        ctx.restore();

        // Etiqueta
        if (z.labelOffsetX !== undefined && z.labelOffsetY !== undefined) {
            const labelX = left + z.labelOffsetX * w;
            const labelY = top + z.labelOffsetY * h;

            ctx.font = "36px Arial";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(z.name, labelX, labelY);

            z.labelX = labelX;
            z.labelY = labelY;
        }

        // Candado sólo para zonas reales (no pendingZone)
        if (z === selectedZone && z !== pendingZone) {
            const lockSize = 26;
            const lockX = left + w / 2;
            const lockY = top + h / 2;

            z.lockIcon = {
                x: lockX - lockSize / 2,
                y: lockY - lockSize / 2,
                size: lockSize
            };

            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(
                lockX - lockSize / 2,
                lockY - lockSize / 2,
                lockSize,
                lockSize
            );

            ctx.fillStyle = "white";
            ctx.font = "22px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(z.locked ? "🔒" : "🔓", lockX, lockY);
        }
    });
}

/**
 * Devuelve la última zona que contenga el punto (x,y), o null si ninguna.
 */
function zoneHitTest(x, y) {
    for (let i = zones.length - 1; i >= 0; i--) {
        const z = zones[i];
        const left = Math.min(z.x1, z.x2);
        const top = Math.min(z.y1, z.y2);
        const w = Math.abs(z.x2 - z.x1);
        const h = Math.abs(z.y2 - z.y1);
        if (x >= left && x <= left + w && y >= top && y <= top + h) {
            return z;
        }
    }
    return null;
}


// ==============================
// TEXTOS
// ==============================

/**
 * Dibuja los textos del frame.
 */
function drawTexts(f) {
    f.texts.forEach(t => {
        ctx.font = "36px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(t.text, t.x, t.y);
    });
}

/**
 * Busca un texto en el frame actual que contenga el punto (x,y).
 */
function findTextAt(x, y) {
    const f = getCurrentFrame();
    ctx.font = "16px Arial";

    for (let t of f.texts) {
        const w = ctx.measureText(t.text).width;
        const h = 18;
        const px = 6;
        const py = 4;
        const x1 = t.x - w / 2 - px;
        const y1 = t.y - py;
        const x2 = x1 + w + px * 2;
        const y2 = y1 + h + py * 2;

        if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
            return t;
        }
    }
    return null;
}


// ==============================
// HIT TESTS: JUGADORES / BALÓN
// ==============================

/**
 * Devuelve el jugador en (pos.x, pos.y) si hay alguno, o null.
 */
function findPlayerAt(pos) {
    const f = getCurrentFrame();
    for (let p of f.players) {
        if (!p.visible) continue;
        if (Math.hypot(pos.x - p.x, pos.y - p.y) < p.radius) {
            return p;
        }
    }
    return null;
}

/**
 * Test de colisión con el balón.
 */
function ballHitTest(pos) {
    const b = getCurrentFrame().ball;
    if (!b.visible) return false;

    const dx = pos.x - b.x;
    const dy = pos.y - b.y;
    const r = Math.max(b.rx, b.ry);
    return dx * dx + dy * dy <= r * r;
}


// ==============================
// DIBUJAR UN FRAME COMPLETO
// ==============================

/**
 * Dibuja el frame actual (campo + zonas + jugadores + flechas + texto).
 */
function drawFrame() {
    drawPitch();
    drawZones();

    const f = getCurrentFrame();

    // Trails almacenados
    f.trailLines.forEach(tl => {
        ctx.strokeStyle = tl.team === "A" ? "#7fb9ff" : "#ff7a7a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tl.x1, tl.y1);
        ctx.lineTo(tl.x2, tl.y2);
        ctx.stroke();
    });

    // Flechas definitivas
    f.arrows.forEach(a => {
        if (a.type === "kick") drawKickArrow(a);
        else drawNormalArrow(a);
    });

    // Flecha de preview
    if (previewArrow) {
        if (previewArrow.type === "kick") drawKickArrow(previewArrow);
        else drawNormalArrow(previewArrow);
    }

    // Textos
    drawTexts(f);

    // Rastro activo mientras arrastramos jugadores
    if (dragTarget && dragTarget.type === "players") {
        ctx.lineWidth = 2;
        dragTarget.players.forEach((pl, i) => {
            const st = dragTarget.startPositions[i];
            ctx.strokeStyle = pl.team === "A" ? "#7fb9ff" : "#ff7a7a";
            ctx.beginPath();
            ctx.moveTo(st.x, st.y);
            ctx.lineTo(pl.x, pl.y);
            ctx.stroke();
        });
    }

    // Jugadores
    f.players.forEach(p => {
        if (!p.visible) return;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.team === "A" ? "#1e88ff" : "#ff3333";
        ctx.fill();

        if (selectedPlayers.has(p)) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.number, p.x, p.y);
    });

    // Balón
    drawRugbyBall(f.ball);

    // Selección rectangular de jugadores
    if (selectingBox && selectBoxStart && selectBoxEnd) {
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        const x = Math.min(selectBoxStart.x, selectBoxEnd.x);
        const y = Math.min(selectBoxStart.y, selectBoxEnd.y);
        const w = Math.abs(selectBoxEnd.x - selectBoxStart.x);
        const h = Math.abs(selectBoxEnd.y - selectBoxStart.y);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }
}


// ==============================
// DIBUJAR FRAME INTERPOLADO
// ==============================

/**
 * Dibuja una interpolación entre dos frames (t entre 0 y 1).
 */
function drawInterpolatedFrame(a, b, t) {
    drawPitch();
    drawZones(); // Zonas se mantienen globales

    // Jugadores
    for (let i = 0; i < a.players.length; i++) {
        const p1 = a.players[i];
        const p2 = b.players[i];
        if (!(p1.visible || p2.visible)) continue;

        let x, y;
        if (p1.visible && p2.visible) {
            x = p1.x + (p2.x - p1.x) * t;
            y = p1.y + (p2.y - p1.y) * t;
        } else if (p1.visible) {
            x = p1.x;
            y = p1.y;
        } else {
            x = p2.x;
            y = p2.y;
        }

        ctx.beginPath();
        ctx.arc(x, y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.team === "A" ? "#1e88ff" : "#ff3333";
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p1.number, x, y);
    }

    // Flechas y textos del frame destino
    b.arrows.forEach(aRow => {
        if (aRow.type === "kick") drawKickArrow(aRow);
        else drawNormalArrow(aRow);
    });
    drawTexts(b);

    // Balón
    const bl1 = a.ball;
    const bl2 = b.ball;
    let bx, by;
    if (bl1.visible && bl2.visible) {
        bx = bl1.x + (bl2.x - bl1.x) * t;
        by = bl1.y + (bl2.y - bl1.y) * t;
    } else if (bl1.visible) {
        bx = bl1.x;
        by = bl1.y;
    } else {
        bx = bl2.x;
        by = bl2.y;
    }

    drawRugbyBall({ x: bx, y: by, rx: bl1.rx, ry: bl1.ry, visible: true });
}


// ==============================
// MELÉ
// ==============================

/**
 * Coloca una melé alrededor del punto (x,y).
 */
async function placeScrumWithPrompt(x, y){
    const choice = await popupSelectScrumTeam();
    if (!choice) return;  // cancelado
    const f = getCurrentFrame();

    const spacingY = 40;
    const rowX = 32;
    const pack = 35;

    function set(team, num, px, py) {
        const p = f.players.find(a => a.team === team && a.number === num);
        if (!p) return;
        p.visible = true;
        p.x = px;
        p.y = py;
    }

    // Equipo A
    if (choice === "A" || choice === "AB") {
        const bx = x - pack;
        const cy = y;
        set("A", 1, bx, cy - spacingY);
        set("A", 2, bx, cy);
        set("A", 3, bx, cy + spacingY);
        set("A", 6, bx - rowX, cy - spacingY * 1.5);
        set("A", 4, bx - rowX, cy - spacingY * 0.5);
        set("A", 5, bx - rowX, cy + spacingY * 0.5);
        set("A", 7, bx - rowX, cy + spacingY * 1.5);
        set("A", 8, bx - rowX * 2, cy);
    }

    // Equipo B
    if (choice === "B" || choice === "AB") {
        const bx = x + pack;
        const cy = y;
        set("B", 3, bx, cy - spacingY);
        set("B", 2, bx, cy);
        set("B", 1, bx, cy + spacingY);
        set("B", 7, bx + rowX, cy - spacingY * 1.5);
        set("B", 5, bx + rowX, cy - spacingY * 0.5);
        set("B", 4, bx + rowX, cy + spacingY * 0.5);
        set("B", 6, bx + rowX, cy + spacingY * 1.5);
        set("B", 8, bx + rowX * 2, cy);
    }

    syncPlayerToggles();
    drawFrame();
    setMode("move");
}


// ==============================
// EVENTOS DE RATÓN SOBRE CANVAS
// ==============================

canvas.addEventListener("mousedown", async e => {
    const pos = canvasPos(e);
    const f = getCurrentFrame();

    // --- CLICK SOBRE CANDADO DE ZONA (si hay zona seleccionada) ---
    if (selectedZone && selectedZone.lockIcon) {
        const L = selectedZone.lockIcon;
        if (
            pos.x >= L.x && pos.x <= L.x + L.size &&
            pos.y >= L.y && pos.y <= L.y + L.size
        ) {
            selectedZone.locked = !selectedZone.locked;
            drawFrame();
            return;
        }
    }

    // --- MODO ZONA: flujo de 3 clics (esquina 1, esquina 2, etiqueta) ---
    if (mode === "zone") {
        if (!selectedZoneColor) {
    await showPopup({
        title: "Color no seleccionado",
        html: `<p>Debes elegir un color para crear una zona.</p>`,
        showCancel: false
    });
    return;
}


        // Clic 1 → esquina inicial
        if (!zoneStart) {
            zoneStart = pos;
            return;
        }

        // Clic 2 → esquina final y nombre
        if (!zoneEnd) {
            zoneEnd = pos;

            const name = await popupPrompt("Nombre de la zona:");
            if (!name || name.trim() === "") {
                zoneStart = null;
                zoneEnd = null;
                return;
            }

            const x1 = Math.min(zoneStart.x, pos.x);
            const y1 = Math.min(zoneStart.y, pos.y);
            const x2 = Math.max(zoneStart.x, pos.x);
            const y2 = Math.max(zoneStart.y, pos.y);

            pendingZone = {
                x1,
                y1,
                x2,
                y2,
                name,
                color: selectedZoneColor,
                labelOffsetX: undefined,
                labelOffsetY: undefined,
                locked: false
            };

            drawFrame();
            return;
        }

        // Clic 3 → posición del texto dentro del rectángulo
        if (pendingZone) {
            const left = Math.min(pendingZone.x1, pendingZone.x2);
            const top = Math.min(pendingZone.y1, pendingZone.y2);
            const w = Math.abs(pendingZone.x2 - pendingZone.x1);
            const h = Math.abs(pendingZone.y2 - pendingZone.y1);

            pendingZone.labelOffsetX = (pos.x - left) / w;
            pendingZone.labelOffsetY = (pos.y - top) / h;

            zones.push(pendingZone);
            pendingZone = null;
            zoneStart = null;
            zoneEnd = null;

            setMode("move");
            drawFrame();
            return;
        }
    }

    // --- MODO MOVE: primero probamos interacción con zonas ---
    if (mode === "move") {
        const z = zoneHitTest(pos.x, pos.y);

        if (z) {
            selectedZone = z;

            // Si la zona no está bloqueada, la preparamos para arrastrar
            if (!z.locked) {
                draggingZone = true;

                const left = Math.min(z.x1, z.x2);
                const top = Math.min(z.y1, z.y2);

                zoneDragOffset.x = pos.x - left;
                zoneDragOffset.y = pos.y - top;
            }

            drawFrame();
            return;
        }

        // --- Si no hay zona, probamos texto, jugadores, balón o selección ---
        const t = findTextAt(pos.x, pos.y);
        if (t) {
            dragTarget = { type: "text", obj: t };
            dragOffsetX = pos.x - t.x;
            dragOffsetY = pos.y - t.y;
            return;
        }

        const p = findPlayerAt(pos);
        if (p) {
            if (e.ctrlKey) {
                if (!selectedPlayers.has(p)) {
                    selectedPlayers.add(p);
                }
            } else {
                if (!selectedPlayers.has(p) || selectedPlayers.size > 1) {
                    selectedPlayers.clear();
                    selectedPlayers.add(p);
                }
            }

            dragTarget = {
                type: "players",
                players: Array.from(selectedPlayers),
                startPositions: Array.from(selectedPlayers).map(a => ({ x: a.x, y: a.y })),
                startMouse: pos
            };
            drawFrame();
            return;
        }

        if (ballHitTest(pos)) {
            dragTarget = { type: "ball", obj: f.ball };
            dragOffsetX = pos.x - f.ball.x;
            dragOffsetY = pos.y - f.ball.y;
            return;
        }

        // Selección rectangular de jugadores
        if (!e.ctrlKey) {
            selectedPlayers.clear();
        }
        selectingBox = true;
        selectBoxStart = pos;
        selectBoxEnd = pos;
        drawFrame();
        return;
    }

    // --- MODO FLECHAS / PATADA ---
    if (mode === "draw" || mode === "kick") {
        if (!arrowStart) {
            arrowStart = pos;
        } else {
            f.arrows.push({
                x1: arrowStart.x,
                y1: arrowStart.y,
                x2: pos.x,
                y2: pos.y,
                type: mode === "kick" ? "kick" : "normal"
            });
            arrowStart = null;
            previewArrow = null;
            drawFrame();
        }
        return;
    }

    // --- MODO TEXTO ---
    if (mode === "text") {
        const tx = await popupPrompt("Escribe el texto:");
        if (tx && tx.trim() !== "") {
            f.texts.push({ x: pos.x, y: pos.y, text: tx.trim() });
            drawFrame();
        }
        return;
    }

    // --- MODO MELÉ ---
    if (mode === "scrum") {
        placeScrumWithPrompt(pos.x, pos.y);
        return;
    }
});


canvas.addEventListener("mousemove", e => {
    const pos = canvasPos(e);

    // Arrastrar zona seleccionada
    if (draggingZone && selectedZone && !selectedZone.locked) {
        const left = Math.min(selectedZone.x1, selectedZone.x2);
        const top  = Math.min(selectedZone.y1, selectedZone.y2);
        const w = Math.abs(selectedZone.x2 - selectedZone.x1);
        const h = Math.abs(selectedZone.y2 - selectedZone.y1);

        const newLeft = pos.x - zoneDragOffset.x;
        const newTop  = pos.y - zoneDragOffset.y;

        selectedZone.x1 = newLeft;
        selectedZone.y1 = newTop;
        selectedZone.x2 = newLeft + w;
        selectedZone.y2 = newTop + h;

        drawFrame();
        return;
    }

    // Preview de flecha / patada
    if ((mode === "draw" || mode === "kick") && arrowStart) {
        if (e.shiftKey && mode === "kick") {
            kickArcHeight += (arrowStart.y - pos.y) * 0.1;
            kickArcHeight = Math.max(10, Math.min(200, kickArcHeight));
        }

        previewArrow = {
            x1: arrowStart.x,
            y1: arrowStart.y,
            x2: pos.x,
            y2: pos.y,
            type: mode === "kick" ? "kick" : "normal"
        };

        drawFrame();
        return;
    }

    // Arrastre de texto, balón o jugadores
    if (dragTarget && mode === "move") {
        if (dragTarget.type === "text") {
            dragTarget.obj.x = pos.x - dragOffsetX;
            dragTarget.obj.y = pos.y - dragOffsetY;
        } else if (dragTarget.type === "ball") {
            dragTarget.obj.x = pos.x - dragOffsetX;
            dragTarget.obj.y = pos.y - dragOffsetY;
        } else if (dragTarget.type === "players") {
            const dx = pos.x - dragTarget.startMouse.x;
            const dy = pos.y - dragTarget.startMouse.y;
            dragTarget.players.forEach((pl, i) => {
                pl.x = dragTarget.startPositions[i].x + dx;
                pl.y = dragTarget.startPositions[i].y + dy;
            });
        }
        drawFrame();
        return;
    }

    // Actualizar selección rectangular
    if (selectingBox && mode === "move") {
        selectBoxEnd = pos;
        selectedPlayers.clear();

        const x1 = Math.min(selectBoxStart.x, selectBoxEnd.x);
        const y1 = Math.min(selectBoxStart.y, selectBoxEnd.y);
        const x2 = Math.max(selectBoxStart.x, selectBoxEnd.x);
        const y2 = Math.max(selectBoxStart.y, selectBoxEnd.y);

        getCurrentFrame().players.forEach(p => {
            if (!p.visible) return;
            if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) {
                selectedPlayers.add(p);
            }
        });

        drawFrame();
    }
});


canvas.addEventListener("mouseup", () => {
    draggingZone = false;

    // Al soltar jugadores, guardamos trailLines
    if (dragTarget && dragTarget.type === "players") {
        const f = getCurrentFrame();
        dragTarget.players.forEach((pl, i) => {
            const st = dragTarget.startPositions[i];
            f.trailLines.push({
                x1: st.x,
                y1: st.y,
                x2: pl.x,
                y2: pl.y,
                team: pl.team
            });
        });
    }

    dragTarget = null;

    // Final de selección rectangular
    if (selectingBox) {
        selectingBox = false;
        selectBoxStart = null;
        selectBoxEnd = null;
        drawFrame();
    }
});


canvas.addEventListener("dblclick", e => {
    const pos = canvasPos(e);
    const t = findTextAt(pos.x, pos.y);
    if (!t) return;

    const tx = prompt("Editar texto (vacío para borrar):", t.text);
    if (tx === null) return;

    const f = getCurrentFrame();
    if (tx.trim() === "") {
        f.texts = f.texts.filter(x => x !== t);
    } else {
        t.text = tx.trim();
    }
    drawFrame();
});


// ==============================
// TECLADO
// ==============================

window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        selectedPlayers.clear();
        drawFrame();
    }
});


// ==============================
// PANEL DE JUGADORES (SIDEBAR)
// ==============================

/**
 * Coloca todos los jugadores de un equipo en el lateral del campo.
 */
function showTeam(team) {
    const f = getCurrentFrame();
    const { fieldWidth } = fieldDims();

    const xSide = team === "A"
        ? marginX + fieldWidth * 0.15
        : marginX + fieldWidth * 0.85;

    const spacing = 45;
    const yTop = marginY + 40;

    for (let n = 1; n <= NUM_PLAYERS; n++) {
        const p = f.players.find(pl => pl.team === team && pl.number === n);
        p.visible = true;
        p.x = xSide;
        p.y = yTop + (n - 1) * spacing;
    }

    syncPlayerToggles();
    drawFrame();
}

/**
 * Crea los botones de jugadores en los paneles azul y rojo.
 */
function loadPlayerPanels() {
    const blueGrid = document.getElementById("players-blue");
    const redGrid = document.getElementById("players-red");

    for (let i = 1; i <= NUM_PLAYERS; i++) {
        const a = document.createElement("div");
        a.className = "player-toggle";
        a.textContent = i;
        a.dataset.team = "A";
        a.dataset.number = i;
        a.onclick = togglePlayer;
        blueGrid.appendChild(a);

        const b = document.createElement("div");
        b.className = "player-toggle red";
        b.textContent = i;
        b.dataset.team = "B";
        b.dataset.number = i;
        b.onclick = togglePlayer;
        redGrid.appendChild(b);
    }
}

/**
 * Handler del click en el botón de un jugador.
 */
function togglePlayer(e) {
    const team = e.target.dataset.team;
    const num = parseInt(e.target.dataset.number);
    togglePlayerByTeamNumber(team, num);
}

/**
 * Activa/desactiva un jugador por equipo y dorsal.
 */
function togglePlayerByTeamNumber(team, num) {
    const f = getCurrentFrame();
    const p = f.players.find(x => x.team === team && x.number === num);
    p.visible = !p.visible;

    // Si se activa por primera vez, le damos posición lateral
    if (p.visible && p.x === null) {
        const { fieldWidth } = fieldDims();

        const xSide = team === "A"
            ? marginX + fieldWidth * 0.15
            : marginX + fieldWidth * 0.85;

        const spacing = 45;
        const yTop = marginY + 40;

        p.x = xSide;
        p.y = yTop + (num - 1) * spacing;
    }

    const selector =
        `.player-toggle[data-team="${team}"][data-number="${num}"]`;
    const div = document.querySelector(selector);
    if (div) {
        div.classList.toggle("active", p.visible);
    }

    drawFrame();
}

/**
 * Sincroniza el estado visual de los botones de jugadores con el frame.
 */
function syncPlayerToggles() {
    const f = getCurrentFrame();
    document.querySelectorAll(".player-toggle").forEach(div => {
        const team = div.dataset.team;
        const num = parseInt(div.dataset.number);
        const p = f.players.find(x => x.team === team && x.number === num);
        div.classList.toggle("active", p.visible);
    });
}


// ==============================
// MODOS
// ==============================

/**
 * Cambia el modo de interacción (move, text, scrum, draw, kick, zone).
 */
function setMode(m) {
    mode = m;
    arrowStart = null;
    previewArrow = null;

    // Estado visual de los botones del sidebar
    document
        .querySelectorAll("#sidebar button")
        .forEach(b => b.classList.remove("active"));

    if (m === "move") {
        document.getElementById("mode-move").classList.add("active");
    }
    if (m === "text") {
        document.getElementById("mode-text").classList.add("active");
    }
    if (m === "scrum") {
        document.getElementById("mode-scrum").classList.add("active");
    }

    // Panel flotante de colores de zona
    const zonePanel = document.getElementById("zone-color-panel");
    if (m === "zone") {
        zonePanel.classList.remove("hidden");
    } else {
        zonePanel.classList.add("hidden");
    }

    drawFrame();
}


// ==============================
// FRAMES: UI Y NAVEGACIÓN
// ==============================

/**
 * Actualiza los indicadores de frame actual / total.
 */
function updateFrameUI() {
    document.getElementById("current-frame-index").textContent =
        currentFrameIndex + 1;
    document.getElementById("total-frames").textContent =
        frames.length;
}

// Añadir frame (clonando el actual)
document.getElementById("add-frame").onclick = () => {
    const nf = cloneFrame(getCurrentFrame());
    frames.splice(currentFrameIndex + 1, 0, nf);
    currentFrameIndex++;
    getCurrentFrame().trailLines = []; // limpiar trails en el nuevo
    updateFrameUI();
    drawFrame();
};

// Eliminar frame
document.getElementById("delete-frame").onclick = () => {
    if (frames.length > 1) {
        frames.splice(currentFrameIndex, 1);
        currentFrameIndex = Math.max(0, currentFrameIndex - 1);
        getCurrentFrame().trailLines = [];
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

// Frame siguiente
document.getElementById("next-frame").onclick = () => {
    if (currentFrameIndex < frames.length - 1) {
        currentFrameIndex++;
        getCurrentFrame().trailLines = [];
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

// Frame anterior
document.getElementById("prev-frame").onclick = () => {
    if (currentFrameIndex > 0) {
        currentFrameIndex--;
        getCurrentFrame().trailLines = [];
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};


// ==============================
// PLAY / STOP
// ==============================

/**
 * Reproducción suave de la animación con interpolación.
 */
async function playSmooth() {
    if (isPlaying || frames.length < 2) return;
    isPlaying = true;
    cancelPlay = false;

    for (let i = 0; i < frames.length - 1; i++) {
        if (cancelPlay) break;

        const a = frames[i];
        const b = frames[i + 1];

        for (let s = 0; s <= INTERP_STEPS; s++) {
            if (cancelPlay) break;
            drawInterpolatedFrame(a, b, s / INTERP_STEPS);
            await new Promise(r => setTimeout(r, INTERP_DURATION / INTERP_STEPS));
        }

        currentFrameIndex = i + 1;
        updateFrameUI();
    }

    drawFrame();
    isPlaying = false;
    cancelPlay = false;
}

document.getElementById("play-animation").onclick = () => playSmooth();
document.getElementById("stop-animation").onclick = () => {
    cancelPlay = true;
};


// ==============================
// FLECHAS: MENÚ Y BORRADO
// ==============================

// Opciones del menú desplegable de tipo de flecha
document
    .querySelectorAll("#arrow-menu button")
    .forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.arrow;

            if (type === "normal") {
                setMode("draw");
                document.getElementById("mode-arrow").textContent =
                    "Flecha (Normal) ▼";
            }
            if (type === "kick") {
                setMode("kick");
                document.getElementById("mode-arrow").textContent =
                    "Flecha (Patada) ▼";
            }

            document.getElementById("arrow-menu").classList.add("hidden");
        };
    });

// Borrar flechas del frame actual
document.getElementById("clear-arrows").onclick = () => {
    getCurrentFrame().arrows = [];
    drawFrame();
};


// ==============================
// LIMPIAR TABLERO
// ==============================

document.getElementById("clear-board").onclick = () => {
    const f = getCurrentFrame();

    // Jugadores
    f.players.forEach(p => {
        p.visible = false;
        p.x = null;
        p.y = null;
    });

    // Flechas, textos, trails
    f.arrows = [];
    f.texts = [];
    f.trailLines = [];

    // Balón al centro
    f.ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        rx: 24,
        ry: 16,
        visible: true
    };

    selectedPlayers.clear();
    dragTarget = null;
    previewArrow = null;
    arrowStart = null;

    syncPlayerToggles();
    drawFrame();
};


// ==============================
// MOSTRAR / OCULTAR BALÓN
// ==============================

document.getElementById("toggle-ball").onclick = () => {
    const f = getCurrentFrame();
    f.ball.visible = !f.ball.visible;
    drawFrame();
};


// ==============================
// EXPORTAR ANIMACIÓN A WEBM
// ==============================

document.getElementById("export-webm").onclick = async () => {
    if (frames.length < 2) return;

    const stream = canvas.captureStream(30);
    const chunks = [];
    const rec = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000
    });

    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "animacion_rugby.webm";
        a.click();
        URL.revokeObjectURL(url);
    };

    rec.start();

    for (let i = 0; i < frames.length - 1; i++) {
        const a = frames[i];
        const b = frames[i + 1];
        for (let s = 0; s <= INTERP_STEPS; s++) {
            drawInterpolatedFrame(a, b, s / INTERP_STEPS);
            await new Promise(r => setTimeout(r, INTERP_DURATION / INTERP_STEPS));
        }
    }

    currentFrameIndex = frames.length - 1;
    updateFrameUI();
    drawFrame();
    await new Promise(r => setTimeout(r, 500));

    rec.stop();
};


// ==============================
// PANEL COLORES ZONA
// ==============================

document
    .querySelectorAll(".zcp-color")
    .forEach(btn => {
        btn.onclick = () => {
            selectedZoneColor = btn.dataset.color;
        };
    });


// ==============================
// BOTONES DE MODO Y EQUIPOS
// ==============================

document.getElementById("mode-move").onclick = () => setMode("move");
document.getElementById("mode-text").onclick = () => setMode("text");
document.getElementById("mode-scrum").onclick = () => setMode("scrum");
document.getElementById("mode-arrow").onclick = () => {
    document.getElementById("arrow-menu").classList.toggle("hidden");
};
document.getElementById("mode-zone").onclick = () => setMode("zone");

document.getElementById("show-team-a").onclick = () => {
    showTeam("A");
};
document.getElementById("show-team-b").onclick = () => {
    showTeam("B");
};


// ==============================
// INICIALIZACIÓN GENERAL
// ==============================
frames.push(createFrame());
loadPlayerPanels();
updateFrameUI();
drawFrame();
syncPlayerToggles();
