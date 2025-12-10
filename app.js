// ==============================
// CONFIGURACIÓN GENERAL
// ==============================
const CONFIG = {
    NUM_PLAYERS: 15,
    INTERP_DURATION: 950,
    INTERP_STEPS: 24,
    MARGIN_X: 60,
    MARGIN_Y: 50,
    PLAYER_RADIUS: 20,
    BALL_RX: 24,
    BALL_RY: 16,
    KICK_ARC_HEIGHT: 60
};

// ==============================
// ESTADO DE LA APLICACIÓN
// ==============================
const state = {
    // Modo actual
    mode: "move",
    
    // Frames y animación
    frames: [],
    currentFrameIndex: 0,
    isPlaying: false,
    cancelPlay: false,
    
    // Drag & selección
    dragTarget: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    selectedPlayers: new Set(),
    selectingBox: false,
    selectBoxStart: null,
    selectBoxEnd: null,
    
    // Flechas
    arrowStart: null,
    previewArrow: null,
    kickArcHeight: CONFIG.KICK_ARC_HEIGHT,
    
    // Zonas
    zones: [],
    zoneStart: null,
    zoneEnd: null,
    pendingZone: null,
    selectedZoneColor: null,
    selectedZone: null,
    draggingZone: false,
    zoneDragOffset: { x: 0, y: 0 }
};

// Canvas
const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

// ==============================
// UTILIDADES BÁSICAS
// ==============================
const Utils = {
    getCurrentFrame() {
        return state.frames[state.currentFrameIndex];
    },
    
    fieldDims() {
        return {
            fieldWidth: canvas.width - CONFIG.MARGIN_X * 2,
            fieldHeight: canvas.height - CONFIG.MARGIN_Y * 2
        };
    },
    
    canvasPos(e) {
        const r = canvas.getBoundingClientRect();
        // Soporte para eventos touch
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        // Calcular escala entre tamaño visual (CSS) y tamaño interno del canvas
        const scaleX = canvas.width / r.width;
        const scaleY = canvas.height / r.height;

        return {
            x: (clientX - r.left) * scaleX,
            y: (clientY - r.top) * scaleY
        };
    }
};

// ==============================
// SISTEMA DE POPUPS
// ==============================
const Popup = {
    show({ title = "Mensaje", html = "", showCancel = true }) {
        return new Promise(resolve => {
            const overlay = document.getElementById("popup-overlay");
            const modalTitle = document.getElementById("popup-title");
            const content = document.getElementById("popup-content");
            const btnCancel = document.getElementById("popup-cancel");
            const btnOk = document.getElementById("popup-ok");
            const buttonsBox = document.getElementById("popup-buttons");

            modalTitle.textContent = title;
            content.innerHTML = html;

            if (showCancel) {
                btnCancel.style.display = "block";
                buttonsBox.style.justifyContent = "space-between";
            } else {
                btnCancel.style.display = "none";
                buttonsBox.style.justifyContent = "center";
            }

            overlay.classList.remove("hidden");

            btnOk.onclick = () => {
                overlay.classList.add("hidden");
                resolve(true);
            };

            btnCancel.onclick = () => {
                overlay.classList.add("hidden");
                resolve(false);
            };

            overlay.onclick = (e) => {
                const popup = document.getElementById("popup-modal");
                if (!popup.contains(e.target)) {
                    overlay.classList.add("hidden");
                    resolve(showCancel ? false : true);
                }
            };
        });
    },

    async prompt(title, placeholder = "") {
        const ok = await this.show({
            title,
            html: `<input id="popup-input" type="text" placeholder="${placeholder}">`
        });
        
        if (!ok) return null;
        const val = document.getElementById("popup-input").value.trim();
        return val === "" ? null : val;
    },

    async selectScrumTeam() {
        return new Promise(resolve => {
            this.show({
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
};

// ==============================
// FRAMES Y JUGADORES
// ==============================
const Frame = {
    createEmptyPlayers() {
        const arr = [];
        for (let team of ["A", "B"]) {
            for (let n = 1; n <= CONFIG.NUM_PLAYERS; n++) {
                arr.push({
                    team,
                    number: n,
                    x: null,
                    y: null,
                    visible: false,
                    radius: CONFIG.PLAYER_RADIUS
                });
            }
        }
        return arr;
    },

    create() {
        return {
            players: this.createEmptyPlayers(),
            ball: {
                x: canvas.width / 2,
                y: canvas.height / 2,
                rx: CONFIG.BALL_RX,
                ry: CONFIG.BALL_RY,
                visible: true
            },
            arrows: [],
            texts: [],
            trailLines: []
        };
    },

    clone(f) {
        return {
            players: f.players.map(p => ({ ...p })),
            ball: { ...f.ball },
            arrows: f.arrows.map(a => ({ ...a })),
            texts: f.texts.map(t => ({ ...t })),
            trailLines: f.trailLines.map(t => ({ ...t }))
        };
    }
};

// ==============================
// RENDERIZADO
// ==============================
const Renderer = {
    drawPitch() {
        ctx.setLineDash([]);
        const w = canvas.width;
        const h = canvas.height;
        const { fieldWidth, fieldHeight } = Utils.fieldDims();

        const inGoal = fieldWidth * 0.07;
        const xTryLeft = CONFIG.MARGIN_X + inGoal;
        const xTryRight = CONFIG.MARGIN_X + fieldWidth - inGoal;

        // Césped
        const grass = ctx.createLinearGradient(0, 0, 0, h);
        grass.addColorStop(0, "#0b7c39");
        grass.addColorStop(1, "#0a6d33");
        ctx.fillStyle = grass;
        ctx.fillRect(0, 0, w, h);

        // Zonas de ensayo
        ctx.fillStyle = "#064d24";
        ctx.fillRect(CONFIG.MARGIN_X, CONFIG.MARGIN_Y, inGoal, fieldHeight);
        ctx.fillRect(xTryRight, CONFIG.MARGIN_Y, inGoal, fieldHeight);

        // Borde exterior
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(CONFIG.MARGIN_X, CONFIG.MARGIN_Y, fieldWidth, fieldHeight);

        // Líneas verticales
        const mainField = fieldWidth - inGoal * 2;
        const lines = {
            xTryLeft,
            xTryRight,
            x5L: xTryLeft + mainField * 0.05,
            x22L: xTryLeft + mainField * 0.22,
            xMid: xTryLeft + mainField * 0.50,
            x10L: xTryLeft + mainField * 0.40,
            x10R: xTryLeft + mainField * 0.60,
            x22R: xTryLeft + mainField * 0.78,
            x5R: xTryLeft + mainField * 0.95
        };

        const drawVertical = (x, dash = [], width = 2) => {
            ctx.setLineDash(dash);
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x, CONFIG.MARGIN_Y);
            ctx.lineTo(x, CONFIG.MARGIN_Y + fieldHeight);
            ctx.stroke();
        };

        drawVertical(lines.xTryLeft, [], 3);
        drawVertical(lines.xTryRight, [], 3);
        drawVertical(lines.x5L, [20, 14]);
        drawVertical(lines.x5R, [20, 14]);
        drawVertical(lines.x22L);
        drawVertical(lines.x22R);
        drawVertical(lines.x10L, [14, 10]);
        drawVertical(lines.x10R, [14, 10]);
        drawVertical(lines.xMid, [], 3);

        // Líneas horizontales
        const yLines = [
            CONFIG.MARGIN_Y + fieldHeight * 0.05,
            CONFIG.MARGIN_Y + fieldHeight * 0.25,
            CONFIG.MARGIN_Y + fieldHeight * 0.75,
            CONFIG.MARGIN_Y + fieldHeight * 0.95
        ];

        ctx.setLineDash([20, 14]);
        ctx.lineWidth = 2;

        yLines.forEach(y => {
            ctx.beginPath();
            ctx.moveTo(xTryLeft, y);
            ctx.lineTo(xTryRight, y);
            ctx.stroke();
        });

        ctx.setLineDash([]);
    },

    drawRugbyBall(b) {
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
    },

    drawNormalArrow(a) {
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
    },

    drawKickArrow(a) {
        const mx = (a.x1 + a.x2) / 2;
        const my = (a.y1 + a.y2) / 2 - state.kickArcHeight;

        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(a.x1, a.y1);
        ctx.quadraticCurveTo(mx, my, a.x2, a.y2);
        ctx.stroke();

        const t = 0.9;
        const qx = (1 - t) * (1 - t) * a.x1 + 2 * (1 - t) * t * mx + t * t * a.x2;
        const qy = (1 - t) * (1 - t) * a.y1 + 2 * (1 - t) * t * my + t * t * a.y2;

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
    },

    drawZones() {
        const list = state.pendingZone ? [...state.zones, state.pendingZone] : state.zones;

        list.forEach(z => {
            const left = Math.min(z.x1, z.x2);
            const top = Math.min(z.y1, z.y2);
            const w = Math.abs(z.x2 - z.x1);
            const h = Math.abs(z.y2 - z.y1);

            ctx.save();
            ctx.fillStyle = z.color || "#ffffff";
            ctx.globalAlpha = 0.25;
            ctx.fillRect(left, top, w, h);

            ctx.globalAlpha = 1;
            ctx.strokeStyle = (z === state.selectedZone ? "white" : z.color);
            ctx.lineWidth = (z === state.selectedZone ? 4 : 3);
            ctx.strokeRect(left, top, w, h);
            ctx.restore();

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

            if (z === state.selectedZone && z !== state.pendingZone) {
                const lockSize = 26;
                const lockX = left + w / 2;
                const lockY = top + h / 2;

                z.lockIcon = {
                    x: lockX - lockSize / 2,
                    y: lockY - lockSize / 2,
                    size: lockSize
                };

                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(lockX - lockSize / 2, lockY - lockSize / 2, lockSize, lockSize);

                ctx.fillStyle = "white";
                ctx.font = "22px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(z.locked ? "🔒" : "🔓", lockX, lockY);
            }
        });
    },

    drawTexts(f) {
        f.texts.forEach(t => {
            ctx.font = "36px Arial";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(t.text, t.x, t.y);
        });
    },

    drawFrame() {
        this.drawPitch();
        this.drawZones();

        const f = Utils.getCurrentFrame();

        // Trails
        f.trailLines.forEach(tl => {
            ctx.strokeStyle = tl.team === "A" ? "#7fb9ff" : "#ff7a7a";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tl.x1, tl.y1);
            ctx.lineTo(tl.x2, tl.y2);
            ctx.stroke();
        });

        // Flechas
        f.arrows.forEach(a => {
            if (a.type === "kick") this.drawKickArrow(a);
            else this.drawNormalArrow(a);
        });

        if (state.previewArrow) {
            if (state.previewArrow.type === "kick") this.drawKickArrow(state.previewArrow);
            else this.drawNormalArrow(state.previewArrow);
        }

        this.drawTexts(f);

        // Rastro activo
        if (state.dragTarget && state.dragTarget.type === "players") {
            ctx.lineWidth = 2;
            state.dragTarget.players.forEach((pl, i) => {
                const st = state.dragTarget.startPositions[i];
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

            if (state.selectedPlayers.has(p)) {
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

        this.drawRugbyBall(f.ball);

        // Caja de selección
        if (state.selectingBox && state.selectBoxStart && state.selectBoxEnd) {
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 1.5;
            const x = Math.min(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y = Math.min(state.selectBoxStart.y, state.selectBoxEnd.y);
            const w = Math.abs(state.selectBoxEnd.x - state.selectBoxStart.x);
            const h = Math.abs(state.selectBoxEnd.y - state.selectBoxStart.y);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }
    },

    drawInterpolatedFrame(a, b, t) {
        this.drawPitch();
        this.drawZones();

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

        b.arrows.forEach(a => {
            if (a.type === "kick") this.drawKickArrow(a);
            else this.drawNormalArrow(a);
        });
        this.drawTexts(b);

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

        this.drawRugbyBall({ x: bx, y: by, rx: bl1.rx, ry: bl1.ry, visible: true });
    }
};

// ==============================
// HIT TESTS
// ==============================
const HitTest = {
    findPlayerAt(pos) {
        const f = Utils.getCurrentFrame();
        for (let p of f.players) {
            if (!p.visible) continue;
            if (Math.hypot(pos.x - p.x, pos.y - p.y) < p.radius) {
                return p;
            }
        }
        return null;
    },

    ballHitTest(pos) {
        const b = Utils.getCurrentFrame().ball;
        if (!b.visible) return false;

        const dx = pos.x - b.x;
        const dy = pos.y - b.y;
        const r = Math.max(b.rx, b.ry);
        return dx * dx + dy * dy <= r * r;
    },

    zoneHitTest(x, y) {
        for (let i = state.zones.length - 1; i >= 0; i--) {
            const z = state.zones[i];
            const left = Math.min(z.x1, z.x2);
            const top = Math.min(z.y1, z.y2);
            const w = Math.abs(z.x2 - z.x1);
            const h = Math.abs(z.y2 - z.y1);
            if (x >= left && x <= left + w && y >= top && y <= top + h) {
                return z;
            }
        }
        return null;
    },

    findTextAt(x, y) {
        const f = Utils.getCurrentFrame();
        ctx.font = "36px Arial";

        for (let t of f.texts) {
            const w = ctx.measureText(t.text).width;
            const h = 40;
            const px = 10;
            const py = 10;
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
};

// ==============================
// MELÉ
// ==============================
const Scrum = {
    async place(x, y) {
        const choice = await Popup.selectScrumTeam();
        if (!choice) return;
        
        const f = Utils.getCurrentFrame();

        const spacingY = 40;
        const rowX = 32;
        const pack = 35;

        const setPlayer = (team, num, px, py) => {
            const p = f.players.find(a => a.team === team && a.number === num);
            if (!p) return;
            p.visible = true;
            p.x = px;
            p.y = py;
        };

        if (choice === "A" || choice === "AB") {
            const bx = x - pack;
            const cy = y;
            setPlayer("A", 1, bx, cy - spacingY);
            setPlayer("A", 2, bx, cy);
            setPlayer("A", 3, bx, cy + spacingY);
            setPlayer("A", 6, bx - rowX, cy - spacingY * 1.5);
            setPlayer("A", 4, bx - rowX, cy - spacingY * 0.5);
            setPlayer("A", 5, bx - rowX, cy + spacingY * 0.5);
            setPlayer("A", 7, bx - rowX, cy + spacingY * 1.5);
            setPlayer("A", 8, bx - rowX * 2, cy);
        }

        if (choice === "B" || choice === "AB") {
            const bx = x + pack;
            const cy = y;
            setPlayer("B", 3, bx, cy - spacingY);
            setPlayer("B", 2, bx, cy);
            setPlayer("B", 1, bx, cy + spacingY);
            setPlayer("B", 7, bx + rowX, cy - spacingY * 1.5);
            setPlayer("B", 5, bx + rowX, cy - spacingY * 0.5);
            setPlayer("B", 4, bx + rowX, cy + spacingY * 0.5);
            setPlayer("B", 6, bx + rowX, cy + spacingY * 1.5);
            setPlayer("B", 8, bx + rowX * 2, cy);
        }

        Players.syncToggles();
        Renderer.drawFrame();
        Mode.set("move");
    }
};

// ==============================
// GESTIÓN DE JUGADORES
// ==============================
const Players = {
    showTeam(team) {
        const f = Utils.getCurrentFrame();
        const { fieldWidth } = Utils.fieldDims();

        const xSide = team === "A"
            ? CONFIG.MARGIN_X + fieldWidth * 0.15
            : CONFIG.MARGIN_X + fieldWidth * 0.85;

        const spacing = 45;
        const yTop = CONFIG.MARGIN_Y + 40;

        for (let n = 1; n <= CONFIG.NUM_PLAYERS; n++) {
            const p = f.players.find(pl => pl.team === team && pl.number === n);
            p.visible = true;
            p.x = xSide;
            p.y = yTop + (n - 1) * spacing;
        }

        this.syncToggles();
        Renderer.drawFrame();
    },

    loadPanels() {
        const blueGrid = document.getElementById("players-blue");
        const redGrid = document.getElementById("players-red");

        for (let i = 1; i <= CONFIG.NUM_PLAYERS; i++) {
            const a = document.createElement("div");
            a.className = "player-toggle";
            a.textContent = i;
            a.dataset.team = "A";
            a.dataset.number = i;
            a.onclick = (e) => this.toggle(e);
            blueGrid.appendChild(a);

            const b = document.createElement("div");
            b.className = "player-toggle red";
            b.textContent = i;
            b.dataset.team = "B";
            b.dataset.number = i;
            b.onclick = (e) => this.toggle(e);
            redGrid.appendChild(b);
        }
    },

    toggle(e) {
        const team = e.target.dataset.team;
        const num = parseInt(e.target.dataset.number);
        this.toggleByTeamNumber(team, num);
    },

    toggleByTeamNumber(team, num) {
        const f = Utils.getCurrentFrame();
        const p = f.players.find(x => x.team === team && x.number === num);
        p.visible = !p.visible;

        if (p.visible && p.x === null) {
            const { fieldWidth } = Utils.fieldDims();

            const xSide = team === "A"
                ? CONFIG.MARGIN_X + fieldWidth * 0.15
                : CONFIG.MARGIN_X + fieldWidth * 0.85;

            const spacing = 45;
            const yTop = CONFIG.MARGIN_Y + 40;

            p.x = xSide;
            p.y = yTop + (num - 1) * spacing;
        }

        const selector = `.player-toggle[data-team="${team}"][data-number="${num}"]`;
        const div = document.querySelector(selector);
        if (div) {
            div.classList.toggle("active", p.visible);
        }

        Renderer.drawFrame();
    },

    syncToggles() {
        const f = Utils.getCurrentFrame();
        document.querySelectorAll(".player-toggle").forEach(div => {
            const team = div.dataset.team;
            const num = parseInt(div.dataset.number);
            const p = f.players.find(x => x.team === team && x.number === num);
            div.classList.toggle("active", p.visible);
        });
    }
};

// ==============================
// MODOS
// ==============================
const Mode = {
    set(m) {
        state.mode = m;
        state.arrowStart = null;
        state.previewArrow = null;

        document.querySelectorAll("#sidebar button")
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

        const zonePanel = document.getElementById("zone-color-panel");
        if (m === "zone") {
            zonePanel.classList.remove("hidden");
        } else {
            zonePanel.classList.add("hidden");
        }

        Renderer.drawFrame();
    }
};

// ==============================
// ANIMACIÓN
// ==============================
const Animation = {
    updateUI() {
        document.getElementById("current-frame-index").textContent = state.currentFrameIndex + 1;
        document.getElementById("total-frames").textContent = state.frames.length;
    },

    async play() {
        if (state.isPlaying || state.frames.length < 2) return;
        state.isPlaying = true;
        state.cancelPlay = false;

        for (let i = 0; i < state.frames.length - 1; i++) {
            if (state.cancelPlay) break;

            const a = state.frames[i];
            const b = state.frames[i + 1];

            for (let s = 0; s <= CONFIG.INTERP_STEPS; s++) {
                if (state.cancelPlay) break;
                Renderer.drawInterpolatedFrame(a, b, s / CONFIG.INTERP_STEPS);
                await new Promise(r => setTimeout(r, CONFIG.INTERP_DURATION / CONFIG.INTERP_STEPS));
            }

            state.currentFrameIndex = i + 1;
            this.updateUI();
        }

        Renderer.drawFrame();
        state.isPlaying = false;
        state.cancelPlay = false;
    },

    stop() {
        state.cancelPlay = true;
    },

async exportWebM() {
    if (state.frames.length < 2) return;

    // Pedir nombre
    const nombre = await Popup.prompt("Nombre del archivo:", "Mi animacion");
    if (!nombre) return;

    const fileName = nombre + ".webm";

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
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    rec.start();

    for (let i = 0; i < state.frames.length - 1; i++) {
        const a = state.frames[i];
        const b = state.frames[i + 1];
        for (let s = 0; s <= CONFIG.INTERP_STEPS; s++) {
            Renderer.drawInterpolatedFrame(a, b, s / CONFIG.INTERP_STEPS);
            await new Promise(r => setTimeout(r, CONFIG.INTERP_DURATION / CONFIG.INTERP_STEPS));
        }
    }

    state.currentFrameIndex = state.frames.length - 1;
    this.updateUI();
    Renderer.drawFrame();
    await new Promise(r => setTimeout(r, 500));

    rec.stop();
}

};

// ==============================
// EVENTOS DEL CANVAS
// ==============================
const CanvasEvents = {
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
                const left = Math.min(state.pendingZone.x1, state.pendingZone.x2);
                const top = Math.min(state.pendingZone.y1, state.pendingZone.y2);
                const w = Math.abs(state.pendingZone.x2 - state.pendingZone.x1);
                const h = Math.abs(state.pendingZone.y2 - state.pendingZone.y1);

                state.pendingZone.labelOffsetX = (pos.x - left) / w;
                state.pendingZone.labelOffsetY = (pos.y - top) / h;

                state.zones.push(state.pendingZone);
                state.pendingZone = null;
                state.zoneStart = null;
                state.zoneEnd = null;

                Mode.set("move");
                Renderer.drawFrame();
                return;
            }
        }

        // Modo move
        if (state.mode === "move") {
            const z = HitTest.zoneHitTest(pos.x, pos.y);

            if (z) {
                state.selectedZone = z;

                if (!z.locked) {
                    state.draggingZone = true;
                    const left = Math.min(z.x1, z.x2);
                    const top = Math.min(z.y1, z.y2);
                    state.zoneDragOffset.x = pos.x - left;
                    state.zoneDragOffset.y = pos.y - top;
                }

                Renderer.drawFrame();
                return;
            }

            const t = HitTest.findTextAt(pos.x, pos.y);
            if (t) {
                state.dragTarget = { type: "text", obj: t };
                state.dragOffsetX = pos.x - t.x;
                state.dragOffsetY = pos.y - t.y;
                return;
            }

            const p = HitTest.findPlayerAt(pos);
            if (p) {
                if (e.ctrlKey) {
                    if (!state.selectedPlayers.has(p)) {
                        state.selectedPlayers.add(p);
                    }
                } else {
                    if (!state.selectedPlayers.has(p) || state.selectedPlayers.size > 1) {
                        state.selectedPlayers.clear();
                        state.selectedPlayers.add(p);
                    }
                }

                state.dragTarget = {
                    type: "players",
                    players: Array.from(state.selectedPlayers),
                    startPositions: Array.from(state.selectedPlayers).map(a => ({ x: a.x, y: a.y })),
                    startMouse: pos
                };
                Renderer.drawFrame();
                return;
            }

            if (HitTest.ballHitTest(pos)) {
                state.dragTarget = { type: "ball", obj: f.ball };
                state.dragOffsetX = pos.x - f.ball.x;
                state.dragOffsetY = pos.y - f.ball.y;
                return;
            }

            if (!e.ctrlKey) {
                state.selectedPlayers.clear();
            }
            state.selectingBox = true;
            state.selectBoxStart = pos;
            state.selectBoxEnd = pos;
            Renderer.drawFrame();
            return;
        }

        // Modo flechas
        if (state.mode === "draw" || state.mode === "kick") {
            if (!state.arrowStart) {
                state.arrowStart = pos;
            } else {
                f.arrows.push({
                    x1: state.arrowStart.x,
                    y1: state.arrowStart.y,
                    x2: pos.x,
                    y2: pos.y,
                    type: state.mode === "kick" ? "kick" : "normal"
                });
                state.arrowStart = null;
                state.previewArrow = null;
                Renderer.drawFrame();
            }
            return;
        }

        // Modo texto
        if (state.mode === "text") {
            const tx = await Popup.prompt("Escribe el texto:");
            if (tx && tx.trim() !== "") {
                f.texts.push({ x: pos.x, y: pos.y, text: tx.trim() });
                Renderer.drawFrame();
            }
            return;
        }

        // Modo melé
        if (state.mode === "scrum") {
            Scrum.place(pos.x, pos.y);
            return;
        }
    },

    handleMouseMove(e) {
        const pos = Utils.canvasPos(e);

        if (state.draggingZone && state.selectedZone && !state.selectedZone.locked) {
            const w = Math.abs(state.selectedZone.x2 - state.selectedZone.x1);
            const h = Math.abs(state.selectedZone.y2 - state.selectedZone.y1);

            const newLeft = pos.x - state.zoneDragOffset.x;
            const newTop = pos.y - state.zoneDragOffset.y;

            state.selectedZone.x1 = newLeft;
            state.selectedZone.y1 = newTop;
            state.selectedZone.x2 = newLeft + w;
            state.selectedZone.y2 = newTop + h;

            Renderer.drawFrame();
            return;
        }

        if ((state.mode === "draw" || state.mode === "kick") && state.arrowStart) {
            if (e.shiftKey && state.mode === "kick") {
                state.kickArcHeight += (state.arrowStart.y - pos.y) * 0.1;
                state.kickArcHeight = Math.max(10, Math.min(200, state.kickArcHeight));
            }

            state.previewArrow = {
                x1: state.arrowStart.x,
                y1: state.arrowStart.y,
                x2: pos.x,
                y2: pos.y,
                type: state.mode === "kick" ? "kick" : "normal"
            };

            Renderer.drawFrame();
            return;
        }

        if (state.dragTarget && state.mode === "move") {
            if (state.dragTarget.type === "text") {
                state.dragTarget.obj.x = pos.x - state.dragOffsetX;
                state.dragTarget.obj.y = pos.y - state.dragOffsetY;
            } else if (state.dragTarget.type === "ball") {
                state.dragTarget.obj.x = pos.x - state.dragOffsetX;
                state.dragTarget.obj.y = pos.y - state.dragOffsetY;
            } else if (state.dragTarget.type === "players") {
                const dx = pos.x - state.dragTarget.startMouse.x;
                const dy = pos.y - state.dragTarget.startMouse.y;
                state.dragTarget.players.forEach((pl, i) => {
                    pl.x = state.dragTarget.startPositions[i].x + dx;
                    pl.y = state.dragTarget.startPositions[i].y + dy;
                });
            }
            Renderer.drawFrame();
            return;
        }

        if (state.selectingBox && state.mode === "move") {
            state.selectBoxEnd = pos;
            state.selectedPlayers.clear();

            const x1 = Math.min(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y1 = Math.min(state.selectBoxStart.y, state.selectBoxEnd.y);
            const x2 = Math.max(state.selectBoxStart.x, state.selectBoxEnd.x);
            const y2 = Math.max(state.selectBoxStart.y, state.selectBoxEnd.y);

            Utils.getCurrentFrame().players.forEach(p => {
                if (!p.visible) return;
                if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) {
                    state.selectedPlayers.add(p);
                }
            });

            Renderer.drawFrame();
        }
    },

    handleMouseUp() {
        state.draggingZone = false;

        if (state.dragTarget && state.dragTarget.type === "players") {
            const f = Utils.getCurrentFrame();
            state.dragTarget.players.forEach((pl, i) => {
                const st = state.dragTarget.startPositions[i];
                f.trailLines.push({
                    x1: st.x,
                    y1: st.y,
                    x2: pl.x,
                    y2: pl.y,
                    team: pl.team
                });
            });
        }

        state.dragTarget = null;

        if (state.selectingBox) {
            state.selectingBox = false;
            state.selectBoxStart = null;
            state.selectBoxEnd = null;
            Renderer.drawFrame();
        }
    },

    handleDoubleClick(e) {
        const pos = Utils.canvasPos(e);
        const t = HitTest.findTextAt(pos.x, pos.y);
        if (!t) return;

        const tx = prompt("Editar texto (vacío para borrar):", t.text);
        if (tx === null) return;

        const f = Utils.getCurrentFrame();
        if (tx.trim() === "") {
            f.texts = f.texts.filter(x => x !== t);
        } else {
            t.text = tx.trim();
        }
        Renderer.drawFrame();
    }
};

// ==============================
// INICIALIZACIÓN DE EVENTOS
// ==============================
function initEvents() {
    // Eventos de mouse
    canvas.addEventListener("mousedown", e => CanvasEvents.handleMouseDown(e));
    canvas.addEventListener("mousemove", e => CanvasEvents.handleMouseMove(e));
    canvas.addEventListener("mouseup", () => CanvasEvents.handleMouseUp());
    canvas.addEventListener("dblclick", e => CanvasEvents.handleDoubleClick(e));

    // Eventos touch para móviles
    canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        CanvasEvents.handleMouseDown(e);
    }, { passive: false });

    canvas.addEventListener("touchmove", e => {
        e.preventDefault();
        CanvasEvents.handleMouseMove(e);
    }, { passive: false });

    canvas.addEventListener("touchend", e => {
        e.preventDefault();
        CanvasEvents.handleMouseUp();
    }, { passive: false });

    canvas.addEventListener("touchcancel", e => {
        e.preventDefault();
        CanvasEvents.handleMouseUp();
    }, { passive: false });

    window.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            state.selectedPlayers.clear();
            Renderer.drawFrame();
        }
    });

    // Frames
    document.getElementById("add-frame").onclick = () => {
        const nf = Frame.clone(Utils.getCurrentFrame());
        state.frames.splice(state.currentFrameIndex + 1, 0, nf);
        state.currentFrameIndex++;
        Utils.getCurrentFrame().trailLines = [];
        Animation.updateUI();
        Renderer.drawFrame();
    };

    document.getElementById("delete-frame").onclick = () => {
        if (state.frames.length > 1) {
            state.frames.splice(state.currentFrameIndex, 1);
            state.currentFrameIndex = Math.max(0, state.currentFrameIndex - 1);
            Utils.getCurrentFrame().trailLines = [];
            Animation.updateUI();
            Renderer.drawFrame();
            Players.syncToggles();
        }
    };

    document.getElementById("next-frame").onclick = () => {
        if (state.currentFrameIndex < state.frames.length - 1) {
            state.currentFrameIndex++;
            Utils.getCurrentFrame().trailLines = [];
            Animation.updateUI();
            Renderer.drawFrame();
            Players.syncToggles();
        }
    };

    document.getElementById("prev-frame").onclick = () => {
        if (state.currentFrameIndex > 0) {
            state.currentFrameIndex--;
            Utils.getCurrentFrame().trailLines = [];
            Animation.updateUI();
            Renderer.drawFrame();
            Players.syncToggles();
        }
    };

    // Animación
    document.getElementById("play-animation").onclick = () => Animation.play();
    document.getElementById("stop-animation").onclick = () => Animation.stop();
    document.getElementById("export-webm").onclick = () => Animation.exportWebM();

    // Flechas
    document.querySelectorAll("#arrow-menu button").forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.arrow;
            if (type === "normal") {
                Mode.set("draw");
                document.getElementById("mode-arrow").textContent = "Flecha (Normal) ▼";
            }
            if (type === "kick") {
                Mode.set("kick");
                document.getElementById("mode-arrow").textContent = "Flecha (Patada) ▼";
            }
            document.getElementById("arrow-menu").classList.add("hidden");
        };
    });

    document.getElementById("clear-arrows").onclick = () => {
        Utils.getCurrentFrame().arrows = [];
        Renderer.drawFrame();
    };

    // Modos
    document.getElementById("mode-move").onclick = () => Mode.set("move");
    document.getElementById("mode-text").onclick = () => Mode.set("text");
    document.getElementById("mode-scrum").onclick = () => Mode.set("scrum");
    document.getElementById("mode-arrow").onclick = () => {
        document.getElementById("arrow-menu").classList.toggle("hidden");
    };
    document.getElementById("mode-zone").onclick = () => Mode.set("zone");

    // Equipos
    document.getElementById("show-team-a").onclick = () => Players.showTeam("A");
    document.getElementById("show-team-b").onclick = () => Players.showTeam("B");

    // Colores de zona
    document.querySelectorAll(".zcp-color").forEach(btn => {
        btn.onclick = () => {
            state.selectedZoneColor = btn.dataset.color;
        };
    });

    // Limpiar
    document.getElementById("clear-board").onclick = () => {
        const f = Utils.getCurrentFrame();

        f.players.forEach(p => {
            p.visible = false;
            p.x = null;
            p.y = null;
        });

        f.arrows = [];
        f.texts = [];
        f.trailLines = [];

        f.ball = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            rx: CONFIG.BALL_RX,
            ry: CONFIG.BALL_RY,
            visible: true
        };

        state.selectedPlayers.clear();
        state.dragTarget = null;
        state.previewArrow = null;
        state.arrowStart = null;

        Players.syncToggles();
        Renderer.drawFrame();
    };

    // Toggle balón
    document.getElementById("toggle-ball").onclick = () => {
        const f = Utils.getCurrentFrame();
        f.ball.visible = !f.ball.visible;
        Renderer.drawFrame();
    };

    // Menú móvil - Sidebar izquierdo
    document.getElementById("mobile-menu-btn").onclick = () => {
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("mobile-overlay");
        const rightPanel = document.getElementById("right-panel");

        sidebar.classList.toggle("show");
        overlay.classList.toggle("show");

        // Cerrar el panel derecho si está abierto
        if (rightPanel.classList.contains("show")) {
            rightPanel.classList.remove("show");
        }
    };

    // Menú móvil - Panel derecho
    document.getElementById("mobile-right-menu-btn").onclick = () => {
        const rightPanel = document.getElementById("right-panel");
        const overlay = document.getElementById("mobile-overlay");
        const sidebar = document.getElementById("sidebar");

        rightPanel.classList.toggle("show");
        overlay.classList.toggle("show");

        // Cerrar el sidebar si está abierto
        if (sidebar.classList.contains("show")) {
            sidebar.classList.remove("show");
        }
    };

    // Overlay móvil - Cerrar menús al hacer clic fuera
    document.getElementById("mobile-overlay").onclick = () => {
        const sidebar = document.getElementById("sidebar");
        const rightPanel = document.getElementById("right-panel");
        const overlay = document.getElementById("mobile-overlay");

        sidebar.classList.remove("show");
        rightPanel.classList.remove("show");
        overlay.classList.remove("show");
    };
}

// ==============================
// REDIMENSIONAMIENTO PARA MÓVILES
// ==============================
function isMobileDevice() {
    // Detecta móviles reales (user agent) + pantallas pequeñas
    const ua = navigator.userAgent.toLowerCase();

    const isPhoneUA =
        /iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|mobile/i.test(ua);

    const isSmall = Math.min(window.innerWidth, window.innerHeight) < 850;

    return isPhoneUA || isSmall;
}


function handleResize() {
    const sidebar = document.getElementById("sidebar");
    const rightPanel = document.getElementById("right-panel");
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const mobileRightMenuBtn = document.getElementById("mobile-right-menu-btn");
    const overlay = document.getElementById("mobile-overlay");

    // Solo redimensionar en móviles
    if (isMobileDevice()) {
        // MODO MÓVIL

        // Mostrar botones de menú móvil
        mobileMenuBtn.style.display = "block";
        mobileRightMenuBtn.style.display = "block";

        // Ocultar paneles laterales (quitar clase show si está)
        sidebar.classList.remove("show");
        rightPanel.classList.remove("show");
        overlay.classList.remove("show");

// Forzar que el campo ocupe TODO el espacio disponible
const areaW = window.innerWidth;
const areaH = window.innerHeight;

// Mantener proporción 3:2
const aspect = 1200 / 800;

let w = areaW;
let h = w / aspect;

if (h > areaH) {
    h = areaH;
    w = h * aspect;
}

// Establecer tamaño REAL del canvas
canvas.width  = w;
canvas.height = h;

// Ajustar tamaño visual (CSS) al mismo valor
canvas.style.width  = w + "px";
canvas.style.height = h + "px";

Renderer.drawFrame();


Renderer.drawFrame();

    } else {
        // MODO DESKTOP

        // Ocultar botones de menú móvil
        mobileMenuBtn.style.display = "none";
        mobileRightMenuBtn.style.display = "none";

        // Asegurar que paneles estén visibles en desktop
        sidebar.classList.remove("show");
        rightPanel.classList.remove("show");
        overlay.classList.remove("show");

        // En desktop, mantener tamaño original del canvas
        canvas.style.width = '';
        canvas.style.height = '';
    }
}

// ==============================
// INICIALIZACIÓN
// ==============================
function init() {
    state.frames.push(Frame.create());
    Players.loadPanels();
    Animation.updateUI();
    Renderer.drawFrame();
    Players.syncToggles();
    initEvents();

    // Ajustar tamaño inicial para móviles
    handleResize();

    // Redimensionar cuando cambie la orientación o tamaño de ventana
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        setTimeout(handleResize, 100);
    });
}

// Iniciar la aplicación
init();