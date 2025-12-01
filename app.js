// ==========================
// CONFIG
// ==========================
const NUM_PLAYERS = 15;
const INTERP_DURATION = 800; // ms
const INTERP_STEPS = 24;     // pasos de interpolación

// move | draw | kick | text | scrum
let mode = "move";

let frames = [];
let currentFrameIndex = 0;
let isPlaying = false;
let cancelPlay = false;

let dragTarget = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let arrowStart = null;        // para flechas
let previewArrow = null;      // flecha en previsualización

let selectedPlayers = new Set();

let selectingBox = false;
let selectBoxStart = null;
let selectBoxEnd = null;

const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

// márgenes del campo
const marginX = 60;
const marginY = 50;

// ==========================
// FRAME STRUCTURE
// ==========================
function createEmptyPlayers() {
    const players = [];
    for (let team of ["A", "B"]) {
        for (let n = 1; n <= NUM_PLAYERS; n++) {
            players.push({
                team,
                number: n,
                x: null,
                y: null,
                visible: false,
                radius: 20
            });
        }
    }
    return players;
}

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
        arrows: [], // {x1,y1,x2,y2,type:'normal'|'kick'}
        texts: []   // {x,y,text}
    };
}

function cloneFrame(frame) {
    return {
        players: frame.players.map(p => ({ ...p })),
        ball: { ...frame.ball },
        arrows: frame.arrows.map(a => ({ ...a })),
        texts: frame.texts.map(t => ({ ...t }))
    };
}

function getCurrentFrame() {
    return frames[currentFrameIndex];
}

function fieldDims() {
    const fieldWidth = canvas.width - marginX * 2;
    const fieldHeight = canvas.height - marginY * 2;
    return { fieldWidth, fieldHeight };
}

// ==========================
// DRAW FIELD (según especificación)
// ==========================
function drawPitch() {
    const w = canvas.width;
    const h = canvas.height;
    const { fieldWidth, fieldHeight } = fieldDims();

    // Césped
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#18a34a");
    grad.addColorStop(1, "#0b6b31");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Rectángulo exterior
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

    // Geometría longitudinal
    const inGoal = fieldWidth * 0.07;              // zona de ensayo
    const mainField = fieldWidth - 2 * inGoal;

    const xBackLeft  = marginX;                    // fondo ensayo izq
    const xTryLeft   = marginX + inGoal;           // inicio ensayo izq
    const xBackRight = marginX + fieldWidth;       // fondo derecho
    const xTryRight  = marginX + fieldWidth - inGoal;

    const x5Left  = xTryLeft + mainField * (5 / 100);
    const x22Left = xTryLeft + mainField * (22 / 100);

    const xMainStart = xTryLeft;
    const xMainEnd   = xTryRight;
    const xMid       = (xMainStart + xMainEnd) / 2;
    const d10        = mainField * (10 / 100);

    const x10Left  = xMid - d10;
    const x10Right = xMid + d10;

    const x22Right = xMainEnd - mainField * (22 / 100);
    const x5Right  = xMainEnd - mainField * (5 / 100);

    // verticales: fondo, try, 5m, 22m, 10m antes del medio, medio, simétricas
    function vline(x, dash = [], width = 2) {
        ctx.setLineDash(dash);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x, marginY);
        ctx.lineTo(x, marginY + fieldHeight);
        ctx.stroke();
    }

    // márgenes
    vline(xBackLeft, [], 3);
    vline(xBackRight, [], 3);

    // try
    vline(xTryLeft, [], 2.5);
    vline(xTryRight, [], 2.5);

    // 5m (discontinuas)
    vline(x5Left, [20, 14], 2);
    vline(x5Right, [20, 14], 2);

    // 22m (continuas)
    vline(x22Left, [], 2);
    vline(x22Right, [], 2);

    // 10m antes del medio (discontinuas)
    vline(x10Left, [14, 10], 2);
    vline(x10Right, [14, 10], 2);

    // medio campo
    vline(xMid, [], 3);

    // horizontales: margen, 5m, 15m, 15m opuesta, 5m opuesta, margen
    const y5Top  = marginY + fieldHeight * 0.05;
    const y15Top = marginY + fieldHeight * 0.15;
    const y15Bot = marginY + fieldHeight * 0.85;
    const y5Bot  = marginY + fieldHeight * 0.95;

    ctx.setLineDash([20, 14]);
    ctx.lineWidth = 2;

    [y5Top, y15Top, y15Bot, y5Bot].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(marginX, y);
        ctx.lineTo(marginX + fieldWidth, y);
        ctx.stroke();
    });

    // poste tipo H a cada lado
    const goalHeight = fieldHeight * 0.2;
    const postWidth = 18;

    function drawPosts(xBase) {
        const yMid = marginY + fieldHeight / 2;
        ctx.setLineDash([]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        // verticales
        ctx.moveTo(xBase, yMid - goalHeight / 2);
        ctx.lineTo(xBase, yMid + goalHeight / 2);
        ctx.moveTo(xBase + postWidth, yMid - goalHeight / 2);
        ctx.lineTo(xBase + postWidth, yMid + goalHeight / 2);
        // travesaño
        ctx.moveTo(xBase, yMid);
        ctx.lineTo(xBase + postWidth, yMid);
        ctx.stroke();
    }

    drawPosts(xBackLeft + 10);
    drawPosts(xBackRight - postWidth - 10);
}

// ==========================
// DIBUJAR BALÓN (ovalado)
// ==========================
function drawRugbyBall(ball) {
    if (!ball.visible) return;
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(-0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, ball.rx, ball.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f5e1c0";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#b37a42";
    ctx.stroke();

    // banda interior
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#b37a42";
    ctx.beginPath();
    ctx.ellipse(0, 0, ball.rx * 0.8, ball.ry * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

// ==========================
// DIBUJAR FLECHAS
// ==========================
function drawNormalArrow(a) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.lineTo(a.x2, a.y2);
    ctx.stroke();

    const headlen = 14;
    const angle = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(
        a.x2 - headlen * Math.cos(angle - Math.PI / 6),
        a.x2 === a.x2 ? a.y2 - headlen * Math.sin(angle - Math.PI / 6) : a.y2
    );
    ctx.lineTo(
        a.x2 - headlen * Math.cos(angle + Math.PI / 6),
        a.y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();
}

function drawKickArrow(a) {
    const midX = (a.x1 + a.x2) / 2;
    const midY = (a.y1 + a.y2) / 2 - 60;

    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.quadraticCurveTo(midX, midY, a.x2, a.y2);
    ctx.stroke();

    const t = 0.9;
    const qx1 =
        (1 - t) * (1 - t) * a.x1 + 2 * (1 - t) * t * midX + t * t * a.x2;
    const qy1 =
        (1 - t) * (1 - t) * a.y1 + 2 * (1 - t) * t * midY + t * t * a.y2;
    const angle = Math.atan2(a.y2 - qy1, a.x2 - qx1);
    const headlen = 14;

    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(
        a.x2 - headlen * Math.cos(angle - Math.PI / 6),
        a.y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        a.x2 - headlen * Math.cos(angle + Math.PI / 6),
        a.y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = "yellow";
    ctx.fill();
}

// ==========================
// TEXTOS (cajas)
// ==========================
function drawTexts(frame) {
    frame.texts.forEach(t => {
        const paddingX = 6;
        const paddingY = 4;

        ctx.font = "16px Arial";
        const metrics = ctx.measureText(t.text);
        const textWidth = metrics.width;
        const textHeight = 18;

        const x = t.x;
        const y = t.y;

        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(
            x - textWidth / 2 - paddingX,
            y - paddingY,
            textWidth + paddingX * 2,
            textHeight + paddingY * 2
        );

        ctx.strokeStyle = "white";
        ctx.strokeRect(
            x - textWidth / 2 - paddingX,
            y - paddingY,
            textWidth + paddingX * 2,
            textHeight + paddingY * 2
        );

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(t.text, x, y);
    });
}

function findTextAt(x, y) {
    const frame = getCurrentFrame();
    for (let t of frame.texts) {
        ctx.font = "16px Arial";
        const metrics = ctx.measureText(t.text);
        const w = metrics.width;
        const h = 18;
        const paddingX = 6;
        const paddingY = 4;
        const left = t.x - w / 2 - paddingX;
        const top = t.y - paddingY;
        const right = left + w + paddingX * 2;
        const bottom = top + h + paddingY * 2;
        if (x >= left && x <= right && y >= top && y <= bottom) {
            return t;
        }
    }
    return null;
}

// ==========================
// DIBUJAR FRAME COMPLETO
// ==========================
function drawFrame() {
    drawPitch();
    const frame = getCurrentFrame();

    // Flechas definitivas
    frame.arrows.forEach(a => {
        if (a.type === "kick") drawKickArrow(a);
        else drawNormalArrow(a);
    });

    // Flecha en previsualización
    if (previewArrow) {
        if (previewArrow.type === "kick") drawKickArrow(previewArrow);
        else drawNormalArrow(previewArrow);
    }

    // Textos
    drawTexts(frame);

    // RASTROS durante arrastre de grupo
    if (dragTarget && dragTarget.type === "players") {
        const playersArr = dragTarget.players;
        const startPositions = dragTarget.startPositions;
        ctx.lineWidth = 2;
        playersArr.forEach((pl, idx) => {
            const start = startPositions[idx];
            ctx.strokeStyle = pl.team === "A" ? "#7fb9ff" : "#ff7a7a";
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(pl.x, pl.y);
            ctx.stroke();
        });
    }

    // Jugadores
    frame.players.forEach(p => {
        if (!p.visible || p.x == null || p.y == null) return;
        ctx.beginPath();
        ctx.fillStyle = p.team === "A" ? "#1e88ff" : "#ff3333";
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (selectedPlayers.has(p)) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();
        }

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.number, p.x, p.y);
    });

    // Balón
    drawRugbyBall(frame.ball);

    // Rectángulo de selección
    if (selectingBox && selectBoxStart && selectBoxEnd) {
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#ffffff";
        const x = Math.min(selectBoxStart.x, selectBoxEnd.x);
        const y = Math.min(selectBoxStart.y, selectBoxEnd.y);
        const wBox = Math.abs(selectBoxEnd.x - selectBoxStart.x);
        const hBox = Math.abs(selectBoxEnd.y - selectBoxStart.y);
        ctx.strokeRect(x, y, wBox, hBox);
        ctx.setLineDash([]);
    }
}

// ==========================
// INTERPOLATED FRAME
// ==========================
function drawInterpolatedFrame(from, to, t) {
    drawPitch();

    // Jugadores
    for (let i = 0; i < from.players.length; i++) {
        const p1 = from.players[i];
        const p2 = to.players[i];
        const visible = p1.visible || p2.visible;
        if (!visible) continue;

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
        ctx.fillStyle = p1.team === "A" ? "#1e88ff" : "#ff3333";
        ctx.arc(x, y, p1.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p1.number, x, y);
    }

    // Flechas + textos del frame destino
    to.arrows.forEach(a => {
        if (a.type === "kick") drawKickArrow(a);
        else drawNormalArrow(a);
    });
    drawTexts(to);

    // Balón
    const b1 = from.ball;
    const b2 = to.ball;
    let bx, by;
    if (b1.visible && b2.visible) {
        bx = b1.x + (b2.x - b1.x) * t;
        by = b1.y + (b2.y - b1.y) * t;
    } else if (b1.visible) {
        bx = b1.x;
        by = b1.y;
    } else {
        bx = b2.x;
        by = b2.y;
    }

    drawRugbyBall({ x: bx, y: by, rx: b1.rx, ry: b1.ry, visible: true });
}

// ==========================
// PLAYER PANELS + SELECTORES
// ==========================
function loadPlayerPanels() {
    const blueGrid = document.getElementById("players-blue");
    const redGrid = document.getElementById("players-red");
    const blueSelect = document.getElementById("blue-select");
    const redSelect = document.getElementById("red-select");

    for (let i = 1; i <= NUM_PLAYERS; i++) {
        let optB = document.createElement("option");
        optB.value = i;
        optB.textContent = "Dorsal " + i;
        blueSelect.appendChild(optB);

        let optR = document.createElement("option");
        optR.value = i;
        optR.textContent = "Dorsal " + i;
        redSelect.appendChild(optR);

        const b = document.createElement("div");
        b.className = "player-toggle";
        b.textContent = i;
        b.dataset.team = "A";
        b.dataset.number = i;
        b.onclick = togglePlayer;
        blueGrid.appendChild(b);

        const r = document.createElement("div");
        r.className = "player-toggle red";
        r.textContent = i;
        r.dataset.team = "B";
        r.dataset.number = i;
        r.onclick = togglePlayer;
        redGrid.appendChild(r);
    }

    document.getElementById("blue-add").onclick = () => {
        const n = parseInt(blueSelect.value);
        togglePlayerByTeamNumber("A", n);
    };
    document.getElementById("red-add").onclick = () => {
        const n = parseInt(redSelect.value);
        togglePlayerByTeamNumber("B", n);
    };
}

function togglePlayerByTeamNumber(team, number) {
    const frame = getCurrentFrame();
    const p = frame.players.find(pl => pl.team === team && pl.number === number);
    p.visible = !p.visible;

    if (p.visible && p.x === null) {
        const { fieldWidth, fieldHeight } = fieldDims();
        const baseX = team === "A"
            ? marginX + fieldWidth * 0.25
            : marginX + fieldWidth * 0.75;
        const baseY = marginY + fieldHeight * 0.25;
        const row = Math.floor((number - 1) / 5);
        const col = (number - 1) % 5;
        p.x = baseX + col * 40;
        p.y = baseY + row * 50;
    }

    const selector = `.player-toggle[data-team="${team}"][data-number="${number}"]`;
    const div = document.querySelector(selector);
    if (div) div.classList.toggle("active", p.visible);

    drawFrame();
}

function togglePlayer(e) {
    const div = e.target;
    const team = div.dataset.team;
    const number = parseInt(div.dataset.number);
    togglePlayerByTeamNumber(team, number);
}

function syncPlayerToggles() {
    const frame = getCurrentFrame();
    document.querySelectorAll(".player-toggle").forEach(div => {
        const team = div.dataset.team;
        const number = parseInt(div.dataset.number);
        const p = frame.players.find(pl => pl.team === team && pl.number === number);
        div.classList.toggle("active", !!(p && p.visible));
    });
}

// ==========================
// MODOS
// ==========================
function setMode(newMode) {
    mode = newMode;
    arrowStart = null;
    previewArrow = null;
    document.querySelectorAll("#sidebar button").forEach(btn =>
        btn.classList.remove("active")
    );
    if (mode === "move")  document.getElementById("mode-move").classList.add("active");
    if (mode === "draw")  document.getElementById("mode-draw").classList.add("active");
    if (mode === "kick")  document.getElementById("mode-kick").classList.add("active");
    if (mode === "text")  document.getElementById("mode-text").classList.add("active");
    if (mode === "scrum") document.getElementById("mode-scrum").classList.add("active");
    drawFrame();
}

// ==========================
// MOUSE HELPERS
// ==========================
function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function findPlayerAt(pos) {
    const frame = getCurrentFrame();
    for (let p of frame.players) {
        if (!p.visible) continue;
        if (Math.hypot(pos.x - p.x, pos.y - p.y) < p.radius) return p;
    }
    return null;
}

function ballHitTest(pos) {
    const b = getCurrentFrame().ball;
    if (!b.visible) return false;
    const dx = pos.x - b.x;
    const dy = pos.y - b.y;
    const r = Math.max(b.rx, b.ry);
    return dx * dx + dy * dy <= r * r;
}

// ==========================
// MELÉ HORIZONTAL (Azul izq, Rojo dcha)
// ==========================
function placeScrumWithPrompt(x, y) {
    const choice = (prompt("Equipo para melé: A (azul), B (rojo), AB (ambos)", "AB") || "")
        .toUpperCase();
    const frame = getCurrentFrame();

    // más separación interna, packs más juntos
    const spacingY = 34;
    const rowSpacingX = 32;
    const packOffset = 45;

    function setPlayer(team, number, px, py) {
        const p = frame.players.find(pl => pl.team === team && pl.number === number);
        if (!p) return;
        p.visible = true;
        p.x = px;
        p.y = py;
    }

    // Azul izquierda
    if (choice === "A" || choice === "AB") {
        const baseX = x - packOffset;
        const centerY = y;
        setPlayer("A", 1, baseX, centerY - spacingY);
        setPlayer("A", 2, baseX, centerY);
        setPlayer("A", 3, baseX, centerY + spacingY);
        setPlayer("A", 4, baseX - rowSpacingX, centerY - spacingY * 1.5);
        setPlayer("A", 5, baseX - rowSpacingX, centerY - spacingY * 0.5);
        setPlayer("A", 6, baseX - rowSpacingX, centerY + spacingY * 0.5);
        setPlayer("A", 7, baseX - rowSpacingX, centerY + spacingY * 1.5);
        setPlayer("A", 8, baseX - rowSpacingX * 2, centerY);
    }

    // Rojo derecha
    if (choice === "B" || choice === "AB") {
        const baseX = x + packOffset;
        const centerY = y;
        setPlayer("B", 1, baseX, centerY - spacingY);
        setPlayer("B", 2, baseX, centerY);
        setPlayer("B", 3, baseX, centerY + spacingY);
        setPlayer("B", 4, baseX + rowSpacingX, centerY - spacingY * 1.5);
        setPlayer("B", 5, baseX + rowSpacingX, centerY - spacingY * 0.5);
        setPlayer("B", 6, baseX + rowSpacingX, centerY + spacingY * 0.5);
        setPlayer("B", 7, baseX + rowSpacingX, centerY + spacingY * 1.5);
        setPlayer("B", 8, baseX + rowSpacingX * 2, centerY);
    }

    syncPlayerToggles();
    drawFrame();
}

// ==========================
// MOUSE EVENTS (selección múltiple + rastro + preview flechas)
// ==========================
canvas.addEventListener("mousedown", e => {
    const pos = canvasPos(e);
    const frame = getCurrentFrame();

    if (mode === "move") {
        // Texto primero
        const t = findTextAt(pos.x, pos.y);
        if (t) {
            dragTarget = { type: "text", obj: t };
            dragOffsetX = pos.x - t.x;
            dragOffsetY = pos.y - t.y;
            return;
        }

        // Jugadores
        const p = findPlayerAt(pos);
        if (p) {
            if (e.ctrlKey) {
                // Ctrl solo añade (no quita) para no perder selección
                if (!selectedPlayers.has(p)) selectedPlayers.add(p);
            } else {
                if (!selectedPlayers.has(p) || selectedPlayers.size > 1) {
                    selectedPlayers.clear();
                    selectedPlayers.add(p);
                }
            }
            // arrastre conjunto
            const playersArr = Array.from(selectedPlayers);
            const startPositions = playersArr.map(pl => ({ x: pl.x, y: pl.y }));
            dragTarget = {
                type: "players",
                players: playersArr,
                startPositions,
                startMouse: pos
            };
            drawFrame();
            return;
        }

        // Balón
        if (ballHitTest(pos)) {
            const b = frame.ball;
            dragTarget = { type: "ball", obj: b };
            dragOffsetX = pos.x - b.x;
            dragOffsetY = pos.y - b.y;
            return;
        }

        // Nada: iniciar selección por rectángulo
        if (!e.ctrlKey) selectedPlayers.clear();
        selectingBox = true;
        selectBoxStart = pos;
        selectBoxEnd = pos;
        drawFrame();
        return;
    }

    if (mode === "draw" || mode === "kick") {
        if (!arrowStart) {
            arrowStart = pos;
        } else {
            frame.arrows.push({
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

    if (mode === "text") {
        const txt = prompt("Texto a mostrar:", "");
        if (txt && txt.trim() !== "") {
            frame.texts.push({ x: pos.x, y: pos.y, text: txt.trim() });
            drawFrame();
        }
        return;
    }

    if (mode === "scrum") {
        placeScrumWithPrompt(pos.x, pos.y);
        return;
    }
});

canvas.addEventListener("mousemove", e => {
    const pos = canvasPos(e);

    // Preview flecha
    if ((mode === "draw" || mode === "kick") && arrowStart) {
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
            dragTarget.players.forEach((pl, idx) => {
                pl.x = dragTarget.startPositions[idx].x + dx;
                pl.y = dragTarget.startPositions[idx].y + dy;
            });
        }
        drawFrame();
        return;
    }

    if (selectingBox && mode === "move") {
        selectBoxEnd = pos;

        // actualizar selección
        const x1 = Math.min(selectBoxStart.x, selectBoxEnd.x);
        const y1 = Math.min(selectBoxStart.y, selectBoxEnd.y);
        const x2 = Math.max(selectBoxStart.x, selectBoxEnd.x);
        const y2 = Math.max(selectBoxStart.y, selectBoxEnd.y);

        selectedPlayers.clear();
        const frame = getCurrentFrame();
        frame.players.forEach(p => {
            if (!p.visible) return;
            if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) {
                selectedPlayers.add(p);
            }
        });

        drawFrame();
    }
});

canvas.addEventListener("mouseup", () => {
    dragTarget = null;
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
    const nuevo = prompt("Editar texto (vacío para borrar):", t.text);
    if (nuevo === null) return;
    const frame = getCurrentFrame();
    if (nuevo.trim() === "") {
        frame.texts = frame.texts.filter(x => x !== t);
    } else {
        t.text = nuevo.trim();
    }
    drawFrame();
});

// ESC limpia selección
window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        selectedPlayers.clear();
        drawFrame();
    }
});

// ==========================
// FRAMES
// ==========================
function updateFrameUI() {
    document.getElementById("current-frame-index").textContent = currentFrameIndex + 1;
    document.getElementById("total-frames").textContent = frames.length;
}

document.getElementById("add-frame").onclick = () => {
    const newFrame = cloneFrame(getCurrentFrame());
    frames.splice(currentFrameIndex + 1, 0, newFrame);
    currentFrameIndex++;
    updateFrameUI();
    drawFrame();
};

document.getElementById("delete-frame").onclick = () => {
    if (frames.length > 1) {
        frames.splice(currentFrameIndex, 1);
        currentFrameIndex = Math.max(0, currentFrameIndex - 1);
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

document.getElementById("next-frame").onclick = () => {
    if (currentFrameIndex < frames.length - 1) {
        currentFrameIndex++;
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

document.getElementById("prev-frame").onclick = () => {
    if (currentFrameIndex > 0) {
        currentFrameIndex--;
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

// ==========================
// PLAYBACK SUAVE
// ==========================
async function playSmooth() {
    if (isPlaying || frames.length < 2) return;
    isPlaying = true;
    cancelPlay = false;

    for (let i = 0; i < frames.length - 1; i++) {
        if (cancelPlay) break;
        const from = frames[i];
        const to = frames[i + 1];

        for (let step = 0; step <= INTERP_STEPS; step++) {
            if (cancelPlay) break;
            const t = step / INTERP_STEPS;
            drawInterpolatedFrame(from, to, t);
            await new Promise(r => setTimeout(r, INTERP_DURATION / INTERP_STEPS));
        }
        currentFrameIndex = i + 1;
        updateFrameUI();
    }

    drawFrame();
    isPlaying = false;
    cancelPlay = false;
}

document.getElementById("play-animation").onclick = () => {
    playSmooth();
};

document.getElementById("stop-animation").onclick = () => {
    cancelPlay = true;
};

// ==========================
// CLEAR ARROWS
// ==========================
document.getElementById("clear-arrows").onclick = () => {
    getCurrentFrame().arrows = [];
    drawFrame();
};

// ==========================
// TOGGLE BALL
// ==========================
document.getElementById("toggle-ball").onclick = () => {
    const frame = getCurrentFrame();
    frame.ball.visible = !frame.ball.visible;
    drawFrame();
};

// ==========================
// EXPORT WEBM (alta calidad)
// ==========================
document.getElementById("export-webm").onclick = async () => {
    if (frames.length < 2) return;

    const stream = canvas.captureStream(30);
    const chunks = [];
    const rec = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000  // 8 Mbps
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

    // misma lógica que playSmooth, pero sin tocar isPlaying/cancelPlay
    for (let i = 0; i < frames.length - 1; i++) {
        const from = frames[i];
        const to = frames[i + 1];

        for (let step = 0; step <= INTERP_STEPS; step++) {
            const t = step / INTERP_STEPS;
            drawInterpolatedFrame(from, to, t);
            await new Promise(r => setTimeout(r, INTERP_DURATION / INTERP_STEPS));
        }
    }

    // último frame quieto un poco
    currentFrameIndex = frames.length - 1;
    updateFrameUI();
    drawFrame();
    await new Promise(r => setTimeout(r, 500));

    rec.stop();
};

// ==========================
// BOTONES MODO
// ==========================
document.getElementById("mode-move").onclick  = () => setMode("move");
document.getElementById("mode-draw").onclick  = () => setMode("draw");
document.getElementById("mode-kick").onclick  = () => setMode("kick");
document.getElementById("mode-text").onclick  = () => setMode("text");
document.getElementById("mode-scrum").onclick = () => setMode("scrum");

// ==========================
// START
// ==========================
frames.push(createFrame());
loadPlayerPanels();
updateFrameUI();
drawFrame();
syncPlayerToggles();
