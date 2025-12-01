// ==========================
// CONFIG
// ==========================
const NUM_PLAYERS = 15;
const INTERP_DURATION = 800;
const INTERP_STEPS = 24;

let mode = "move";
let frames = [];
let currentFrameIndex = 0;
let isPlaying = false;
let cancelPlay = false;

let dragTarget = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let arrowStart = null;
let previewArrow = null;

let selectedPlayers = new Set();

let selectingBox = false;
let selectBoxStart = null;
let selectBoxEnd = null;

const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

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
        arrows: [],
        texts: []
    };
}

function cloneFrame(f) {
    return {
        players: f.players.map(p => ({ ...p })),
        ball: { ...f.ball },
        arrows: f.arrows.map(a => ({ ...a })),
        texts: f.texts.map(t => ({ ...t }))
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
// DRAW FIELD (REAL RUGBY FIELD)
// ==========================
function drawPitch() {
    const w = canvas.width;
    const h = canvas.height;
    const { fieldWidth, fieldHeight } = fieldDims();

    // Césped general
    const baseGrass = ctx.createLinearGradient(0, 0, 0, h);
    baseGrass.addColorStop(0, "#0b7c39");
    baseGrass.addColorStop(1, "#0a6d33");
    ctx.fillStyle = baseGrass;
    ctx.fillRect(0, 0, w, h);

    // Cálculo zonas de ensayo
    const inGoal = fieldWidth * 0.07;
    const xTryLeft = marginX + inGoal;
    const xTryRight = marginX + fieldWidth - inGoal;

    // Zonas de ensayo → verde más oscuro
    ctx.fillStyle = "#064d24";
    ctx.fillRect(marginX, marginY, inGoal, fieldHeight);
    ctx.fillRect(xTryRight, marginY, inGoal, fieldHeight);

    // Rectángulo del área de juego
    ctx.setLineDash([]);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

    // Líneas verticales
    const mainField = fieldWidth - inGoal * 2;
    const x5Left  = xTryLeft  + mainField * 0.05;
    const x22Left = xTryLeft  + mainField * 0.22;
    const xMid    = xTryLeft  + mainField * 0.50;
    const x10Left = xMid - mainField * 0.10;
    const x10Right= xMid + mainField * 0.10;
    const x22Right= xTryLeft + mainField * (1 - 0.22);
    const x5Right = xTryLeft + mainField * (1 - 0.05);

    function vline(x, dash = [], width = 2) {
        ctx.setLineDash(dash);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x, marginY);
        ctx.lineTo(x, marginY + fieldHeight);
        ctx.stroke();
    }

    // Líneas verticales reales
    vline(xTryLeft, [], 3);
    vline(xTryRight, [], 3);

    vline(x5Left, [20, 14], 2);
    vline(x5Right, [20, 14], 2);

    vline(x22Left, [], 2);
    vline(x22Right, [], 2);

    vline(x10Left, [14, 10], 2);
    vline(x10Right, [14, 10], 2);

    vline(xMid, [], 3);

    // Líneas horizontales (NO entran en el ensayo)
    const y5Top  = marginY + fieldHeight * 0.05;
    const y15Top = marginY + fieldHeight * 0.25;
    const y15Bot = marginY + fieldHeight * 0.75;
    const y5Bot  = marginY + fieldHeight * 0.95;

    ctx.setLineDash([20,14]);
    ctx.lineWidth = 2;

    for (let y of [y5Top, y15Top, y15Bot, y5Bot]) {
        ctx.beginPath();
        ctx.moveTo(xTryLeft, y);
        ctx.lineTo(xTryRight, y);
        ctx.stroke();
    }
}

// ==========================
// DRAW BALL
// ==========================
function drawRugbyBall(b) {
    if (!b.visible) return;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(-0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, b.rx, b.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f5e1c0";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#b37a42";
    ctx.stroke();
    ctx.restore();
}

// ==========================
// ARROWS
// ==========================
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
    ctx.lineTo(a.x2 - head*Math.cos(ang - Math.PI/6), a.y2 - head*Math.sin(ang - Math.PI/6));
    ctx.lineTo(a.x2 - head*Math.cos(ang + Math.PI/6), a.y2 - head*Math.sin(ang + Math.PI/6));
    ctx.fillStyle = "white";
    ctx.fill();
}

function drawKickArrow(a) {
    const mx = (a.x1 + a.x2)/2;
    const my = (a.y1 + a.y2)/2 - 60;

    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.quadraticCurveTo(mx, my, a.x2, a.y2);
    ctx.stroke();

    const t = 0.9;
    const qx = (1-t)*(1-t)*a.x1 + 2*(1-t)*t*mx + t*t*a.x2;
    const qy = (1-t)*(1-t)*a.y1 + 2*(1-t)*t*my + t*t*a.y2;

    const ang = Math.atan2(a.y2 - qy, a.x2 - qx);
    const head = 14;

    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(a.x2 - head*Math.cos(ang - Math.PI/6), a.y2 - head*Math.sin(ang - Math.PI/6));
    ctx.lineTo(a.x2 - head*Math.cos(ang + Math.PI/6), a.y2 - head*Math.sin(ang + Math.PI/6));
    ctx.fillStyle = "yellow";
    ctx.fill();
}

// ==========================
// TEXT BOXES
// ==========================
function drawTexts(frame) {
    frame.texts.forEach(t => {
        ctx.font = "16px Arial";

        const textWidth = ctx.measureText(t.text).width;
        const padX = 6;
        const padY = 4;
        const height = 18;

        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(t.x - textWidth/2 - padX, t.y - padY, textWidth + padX*2, height + padY*2);

        ctx.strokeStyle = "white";
        ctx.strokeRect(t.x - textWidth/2 - padX, t.y - padY, textWidth + padX*2, height + padY*2);

        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(t.text, t.x, t.y);
    });
}

function findTextAt(x, y) {
    const f = getCurrentFrame();
    for (let t of f.texts) {
        ctx.font = "16px Arial";
        const padX = 6, padY = 4;
        const w = ctx.measureText(t.text).width;
        const h = 18;

        const x1 = t.x - w/2 - padX;
        const y1 = t.y - padY;
        const x2 = x1 + w + padX*2;
        const y2 = y1 + h + padY*2;

        if (x>=x1 && x<=x2 && y>=y1 && y<=y2) return t;
    }
    return null;
}

// ==========================
// DRAW FRAME
// ==========================
function drawFrame() {
    drawPitch();
    const f = getCurrentFrame();

    // Flechas definitivas
    f.arrows.forEach(a => {
        if (a.type === "kick") drawKickArrow(a);
        else drawNormalArrow(a);
    });

    // Flecha en previsualización
    if (previewArrow) {
        if (previewArrow.type === "kick") drawKickArrow(previewArrow);
        else drawNormalArrow(previewArrow);
    }

    // Textos
    drawTexts(f);

    // Rastro de arrastre múltiple
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
        ctx.fillStyle = p.team === "A" ? "#1e88ff" : "#ff3333";
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fill();

        if (selectedPlayers.has(p)) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "white";
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

    // Rectángulo selección
    if (selectingBox && selectBoxStart && selectBoxEnd) {
        ctx.setLineDash([6,4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "white";
        const x = Math.min(selectBoxStart.x, selectBoxEnd.x);
        const y = Math.min(selectBoxStart.y, selectBoxEnd.y);
        const w = Math.abs(selectBoxEnd.x - selectBoxStart.x);
        const h = Math.abs(selectBoxEnd.y - selectBoxStart.y);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }
}

// ==========================
// INTERPOLATED FRAME
// ==========================
function drawInterpolatedFrame(a, b, t) {
    drawPitch();

    // Jugadores
    for (let i = 0; i < a.players.length; i++) {
        const p1 = a.players[i];
        const p2 = b.players[i];
        if (!(p1.visible || p2.visible)) continue;

        let x, y;
        if (p1.visible && p2.visible) {
            x = p1.x + (p2.x - p1.x)*t;
            y = p1.y + (p2.y - p1.y)*t;
        } else if (p1.visible) {
            x = p1.x; y = p1.y;
        } else {
            x = p2.x; y = p2.y;
        }

        ctx.beginPath();
        ctx.fillStyle = p1.team === "A" ? "#1e88ff" : "#ff3333";
        ctx.arc(x, y, p1.radius, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p1.number, x, y);
    }

    // Flechas y textos finales
    b.arrows.forEach(a=>{
        if(a.type==="kick") drawKickArrow(a); else drawNormalArrow(a);
    });
    drawTexts(b);

    // Balón
    const bl1 = a.ball, bl2 = b.ball;
    let bx, by;
    if (bl1.visible && bl2.visible){
        bx = bl1.x + (bl2.x - bl1.x)*t;
        by = bl1.y + (bl2.y - bl1.y)*t;
    } else if (bl1.visible) {
        bx = bl1.x; by = bl1.y;
    } else {
        bx = bl2.x; by = bl2.y;
    }
    drawRugbyBall({x:bx,y:by,rx:bl1.rx,ry:bl1.ry,visible:true});
}

// ==========================
// PLAYER PANELS + SELECTOR
// ==========================
function loadPlayerPanels() {
    const blueGrid = document.getElementById("players-blue");
    const redGrid = document.getElementById("players-red");
    const blueSelect = document.getElementById("blue-select");
    const redSelect = document.getElementById("red-select");

    for (let i=1; i<=NUM_PLAYERS; i++){
        const optA=document.createElement("option");
        optA.value=i; optA.textContent="Dorsal "+i;
        blueSelect.appendChild(optA);

        const optB=document.createElement("option");
        optB.value=i; optB.textContent="Dorsal "+i;
        redSelect.appendChild(optB);

        const divA=document.createElement("div");
        divA.className="player-toggle";
        divA.textContent=i;
        divA.dataset.team="A";
        divA.dataset.number=i;
        divA.onclick=togglePlayer;
        blueGrid.appendChild(divA);

        const divB=document.createElement("div");
        divB.className="player-toggle red";
        divB.textContent=i;
        divB.dataset.team="B";
        divB.dataset.number=i;
        divB.onclick=togglePlayer;
        redGrid.appendChild(divB);
    }

    document.getElementById("blue-add").onclick=()=>{
        togglePlayerByTeamNumber("A", parseInt(blueSelect.value));
    };
    document.getElementById("red-add").onclick=()=>{
        togglePlayerByTeamNumber("B", parseInt(redSelect.value));
    };
}

function togglePlayer(e){
    const team=e.target.dataset.team;
    const number=parseInt(e.target.dataset.number);
    togglePlayerByTeamNumber(team,number);
}

function togglePlayerByTeamNumber(team, number){
    const f = getCurrentFrame();
    const p = f.players.find(x=>x.team===team && x.number===number);
    p.visible = !p.visible;

    if (p.visible && p.x===null){
        const {fieldWidth,fieldHeight}=fieldDims();
        const bx = team==="A" ? marginX+fieldWidth*0.25 : marginX+fieldWidth*0.75;
        const by = marginY+fieldHeight*0.25;
        const row = Math.floor((number-1)/5);
        const col = (number-1)%5;
        p.x = bx + col*40;
        p.y = by + row*50;
    }

    const sel = `.player-toggle[data-team="${team}"][data-number="${number}"]`;
    const div=document.querySelector(sel);
    if (div) div.classList.toggle("active", p.visible);

    drawFrame();
}

function syncPlayerToggles() {
    const f=getCurrentFrame();
    document.querySelectorAll(".player-toggle").forEach(div=>{
        const team=div.dataset.team;
        const num=parseInt(div.dataset.number);
        const p=f.players.find(x=>x.team===team && x.number===num);
        div.classList.toggle("active", p.visible);
    });
}

// ==========================
// MODOS
// ==========================
function setMode(m){
    mode=m;
    arrowStart=null;
    previewArrow=null;

    document.querySelectorAll("#sidebar button").forEach(b=>b.classList.remove("active"));
    if(m==="move") document.getElementById("mode-move").classList.add("active");
    if(m==="draw") document.getElementById("mode-draw").classList.add("active");
    if(m==="kick") document.getElementById("mode-kick").classList.add("active");
    if(m==="text") document.getElementById("mode-text").classList.add("active");
    if(m==="scrum") document.getElementById("mode-scrum").classList.add("active");

    drawFrame();
}

// ==========================
// MOUSE HELPERS
// ==========================
function canvasPos(e){
    const r=canvas.getBoundingClientRect();
    return {x:e.clientX-r.left, y:e.clientY-r.top};
}

function findPlayerAt(pos){
    const f=getCurrentFrame();
    for (let p of f.players){
        if(!p.visible) continue;
        if(Math.hypot(pos.x-p.x,pos.y-p.y)<p.radius) return p;
    }
    return null;
}

function ballHitTest(pos){
    const b=getCurrentFrame().ball;
    if(!b.visible) return false;
    const dx=pos.x-b.x, dy=pos.y-b.y;
    const r=Math.max(b.rx,b.ry);
    return dx*dx+dy*dy<=r*r;
}

// ==========================
// SCRUM (horizontal packs opuestos)
// ==========================
function placeScrumWithPrompt(x,y){
    const choice=(prompt("Equipo para melé: A (azul), B (rojo), AB (ambos)","AB")||"").toUpperCase();
    const f=getCurrentFrame();

    const spacingY=34;
    const rowSpacingX=32;
    const packOffset=45;

    function setP(team,num,px,py){
        const p=f.players.find(pl=>pl.team===team && pl.number===num);
        if(!p) return;
        p.visible=true;
        p.x=px; p.y=py;
    }

    if(choice==="A"||choice==="AB"){
        const bx=x-packOffset, cy=y;
        setP("A",1,bx,cy-spacingY);
        setP("A",2,bx,cy);
        setP("A",3,bx,cy+spacingY);
        setP("A",4,bx-rowSpacingX,cy-spacingY*1.5);
        setP("A",5,bx-rowSpacingX,cy-spacingY*0.5);
        setP("A",6,bx-rowSpacingX,cy+spacingY*0.5);
        setP("A",7,bx-rowSpacingX,cy+spacingY*1.5);
        setP("A",8,bx-rowSpacingX*2,cy);
    }

    if(choice==="B"||choice==="AB"){
        const bx=x+packOffset, cy=y;
        setP("B",1,bx,cy-spacingY);
        setP("B",2,bx,cy);
        setP("B",3,bx,cy+spacingY);
        setP("B",4,bx+rowSpacingX,cy-spacingY*1.5);
        setP("B",5,bx+rowSpacingX,cy-spacingY*0.5);
        setP("B",6,bx+rowSpacingX,cy+spacingY*0.5);
        setP("B",7,bx+rowSpacingX,cy+spacingY*1.5);
        setP("B",8,bx+rowSpacingX*2,cy);
    }

    syncPlayerToggles();
    drawFrame();
}

// ==========================
// MOUSE EVENTS
// ==========================
canvas.addEventListener("mousedown",e=>{
    const pos=canvasPos(e);
    const f=getCurrentFrame();

    if(mode==="move"){
        const t=findTextAt(pos.x,pos.y);
        if(t){
            dragTarget={type:"text",obj:t};
            dragOffsetX=pos.x-t.x;
            dragOffsetY=pos.y-t.y;
            return;
        }

        const p=findPlayerAt(pos);
        if(p){
            if(e.ctrlKey){
                if(!selectedPlayers.has(p)) selectedPlayers.add(p);
            } else {
                if(!selectedPlayers.has(p)||selectedPlayers.size>1){
                    selectedPlayers.clear();
                    selectedPlayers.add(p);
                }
            }
            const arr=Array.from(selectedPlayers);
            dragTarget={
                type:"players",
                players:arr,
                startPositions:arr.map(pl=>({x:pl.x,y:pl.y})),
                startMouse:pos
            };
            drawFrame();
            return;
        }

        if(ballHitTest(pos)){
            const b=f.ball;
            dragTarget={type:"ball",obj:b};
            dragOffsetX=pos.x-b.x;
            dragOffsetY=pos.y-b.y;
            return;
        }

        if(!e.ctrlKey) selectedPlayers.clear();
        selectingBox=true;
        selectBoxStart=pos;
        selectBoxEnd=pos;
        drawFrame();
        return;
    }

    if(mode==="draw"||mode==="kick"){
        if(!arrowStart){
            arrowStart=pos;
        } else {
            f.arrows.push({
                x1:arrowStart.x,
                y1:arrowStart.y,
                x2:pos.x,
                y2:pos.y,
                type: mode==="kick"?"kick":"normal"
            });
            arrowStart=null;
            previewArrow=null;
            drawFrame();
        }
        return;
    }

    if(mode==="text"){
        const txt=prompt("Texto:","");
        if(txt && txt.trim()!==""){
            f.texts.push({x:pos.x,y:pos.y,text:txt.trim()});
            drawFrame();
        }
        return;
    }

    if(mode==="scrum"){
        placeScrumWithPrompt(pos.x,pos.y);
        return;
    }
});

canvas.addEventListener("mousemove",e=>{
    const pos=canvasPos(e);

    if((mode==="draw"||mode==="kick")&&arrowStart){
        previewArrow={
            x1:arrowStart.x,
            y1:arrowStart.y,
            x2:pos.x,
            y2:pos.y,
            type: mode==="kick"?"kick":"normal"
        };
        drawFrame();
        return;
    }

    if(dragTarget && mode==="move"){
        if(dragTarget.type==="text"){
            dragTarget.obj.x=pos.x-dragOffsetX;
            dragTarget.obj.y=pos.y-dragOffsetY;
        } else if(dragTarget.type==="ball"){
            dragTarget.obj.x=pos.x-dragOffsetX;
            dragTarget.obj.y=pos.y-dragOffsetY;
        } else if(dragTarget.type==="players"){
            const dx=pos.x-dragTarget.startMouse.x;
            const dy=pos.y-dragTarget.startMouse.y;
            dragTarget.players.forEach((pl,i)=>{
                pl.x=dragTarget.startPositions[i].x+dx;
                pl.y=dragTarget.startPositions[i].y+dy;
            });
        }
        drawFrame();
        return;
    }

    if(selectingBox && mode==="move"){
        selectBoxEnd=pos;
        selectedPlayers.clear();
        const x1=Math.min(selectBoxStart.x,selectBoxEnd.x);
        const y1=Math.min(selectBoxStart.y,selectBoxEnd.y);
        const x2=Math.max(selectBoxStart.x,selectBoxEnd.x);
        const y2=Math.max(selectBoxStart.y,selectBoxEnd.y);
        getCurrentFrame().players.forEach(p=>{
            if(!p.visible) return;
            if(p.x>=x1 && p.x<=x2 && p.y>=y1 && p.y<=y2){
                selectedPlayers.add(p);
            }
        });
        drawFrame();
    }
});

canvas.addEventListener("mouseup",()=>{
    dragTarget=null;
    if(selectingBox){
        selectingBox=false;
        selectBoxStart=null;
        selectBoxEnd=null;
        drawFrame();
    }
});

canvas.addEventListener("dblclick",e=>{
    const pos=canvasPos(e);
    const t=findTextAt(pos.x,pos.y);
    if(!t) return;
    const n=prompt("Editar texto (vacío para borrar):",t.text);
    if(n===null) return;
    const f=getCurrentFrame();
    if(n.trim()===""){
        f.texts=f.texts.filter(x=>x!==t);
    } else {
        t.text=n.trim();
    }
    drawFrame();
});

window.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
        selectedPlayers.clear();
        drawFrame();
    }
});

// ==========================
// FRAME CONTROLS
// ==========================
function updateFrameUI(){
    document.getElementById("current-frame-index").textContent = currentFrameIndex+1;
    document.getElementById("total-frames").textContent = frames.length;
}

document.getElementById("add-frame").onclick=()=>{
    const nf = cloneFrame(getCurrentFrame());
    frames.splice(currentFrameIndex+1,0,nf);
    currentFrameIndex++;
    updateFrameUI();
    drawFrame();
};

document.getElementById("delete-frame").onclick=()=>{
    if(frames.length>1){
        frames.splice(currentFrameIndex,1);
        currentFrameIndex=Math.max(0,currentFrameIndex-1);
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

document.getElementById("next-frame").onclick=()=>{
    if(currentFrameIndex<frames.length-1){
        currentFrameIndex++;
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

document.getElementById("prev-frame").onclick=()=>{
    if(currentFrameIndex>0){
        currentFrameIndex--;
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

// ==========================
// PLAYBACK
// ==========================
async function playSmooth(){
    if(isPlaying || frames.length<2) return;
    isPlaying=true;
    cancelPlay=false;

    for(let i=0;i<frames.length-1;i++){
        if(cancelPlay) break;
        const a=frames[i], b=frames[i+1];

        for(let step=0;step<=INTERP_STEPS;step++){
            if(cancelPlay) break;
            drawInterpolatedFrame(a,b,step/INTERP_STEPS);
            await new Promise(r=>setTimeout(r,INTERP_DURATION/INTERP_STEPS));
        }
        currentFrameIndex=i+1;
        updateFrameUI();
    }

    drawFrame();
    isPlaying=false;
    cancelPlay=false;
}

document.getElementById("play-animation").onclick=()=>{
    playSmooth();
};

document.getElementById("stop-animation").onclick=()=>{
    cancelPlay=true;
};

// ==========================
// CLEAR ARROWS
// ==========================
document.getElementById("clear-arrows").onclick=()=>{
    getCurrentFrame().arrows=[];
    drawFrame();
};

// ==========================
// TOGGLE BALL
// ==========================
document.getElementById("toggle-ball").onclick=()=>{
    const f=getCurrentFrame();
    f.ball.visible=!f.ball.visible;
    drawFrame();
};

// ==========================
// EXPORT WEBM (HIGH QUALITY)
// ==========================
document.getElementById("export-webm").onclick=async()=>{
    if(frames.length<2) return;

    const stream=canvas.captureStream(30);
    const chunks=[];
    const rec=new MediaRecorder(stream,{
        mimeType:"video/webm;codecs=vp9",
        videoBitsPerSecond:8000000
    });

    rec.ondataavailable=e=>chunks.push(e.data);
    rec.onstop=()=>{
        const blob=new Blob(chunks,{type:"video/webm"});
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");
        a.href=url;
        a.download="animacion_rugby.webm";
        a.click();
        URL.revokeObjectURL(url);
    };

    rec.start();

    for(let i=0;i<frames.length-1;i++){
        const a=frames[i], b=frames[i+1];
        for(let step=0;step<=INTERP_STEPS;step++){
            drawInterpolatedFrame(a,b,step/INTERP_STEPS);
            await new Promise(r=>setTimeout(r,INTERP_DURATION/INTERP_STEPS));
        }
    }

    currentFrameIndex=frames.length-1;
    updateFrameUI();
    drawFrame();
    await new Promise(r=>setTimeout(r,500));

    rec.stop();
};

// ==========================
// MODE BUTTONS
// ==========================
document.getElementById("mode-move").onclick=()=>setMode("move");
document.getElementById("mode-draw").onclick=()=>setMode("draw");
document.getElementById("mode-kick").onclick=()=>setMode("kick");
document.getElementById("mode-text").onclick=()=>setMode("text");
document.getElementById("mode-scrum").onclick=()=>setMode("scrum");

// ==========================
// INIT
// ==========================
frames.push(createFrame());
loadPlayerPanels();
updateFrameUI();
drawFrame();
syncPlayerToggles();
