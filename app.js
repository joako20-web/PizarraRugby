// ==============================
// CONFIGURACIÓN GENERAL
// ==============================
const NUM_PLAYERS = 15;
const INTERP_DURATION = 950;
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
let kickArcHeight = 60;  // altura inicial del arco de la patada

const canvas = document.getElementById("pitch");
const ctx = canvas.getContext("2d");

const marginX = 60;
const marginY = 50;


// ==============================
// CREAR FRAME
// ==============================
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

function createFrame() {
    return {
        players: createEmptyPlayers(),
        ball: { x: canvas.width/2, y: canvas.height/2, rx: 24, ry: 16, visible: true },
        arrows: [],
        texts: [],
        trailLines: []   // << TRAILS POR FRAME
    };
}

function cloneFrame(f) {
    return {
        players: f.players.map(p => ({ ...p })),
        ball: { ...f.ball },
        arrows: f.arrows.map(a => ({ ...a })),
        texts: f.texts.map(t => ({ ...t })),
        trailLines: f.trailLines.map(t => ({ ...t }))
    };
}

function getCurrentFrame() {
    return frames[currentFrameIndex];
}

function fieldDims() {
    const fw = canvas.width - marginX * 2;
    const fh = canvas.height - marginY * 2;
    return { fieldWidth: fw, fieldHeight: fh };
}


// ==============================
// DIBUJAR CAMPO REGLAMENTARIO
// ==============================
function drawPitch() {
    ctx.setLineDash([]);
    const w = canvas.width;
    const h = canvas.height;
    const { fieldWidth, fieldHeight } = fieldDims();

    const inGoal = fieldWidth * 0.07;
    const xTryLeft = marginX + inGoal;
    const xTryRight = marginX + fieldWidth - inGoal;

    // Césped general
    const grass = ctx.createLinearGradient(0,0,0,h);
    grass.addColorStop(0,"#0b7c39");
    grass.addColorStop(1,"#0a6d33");
    ctx.fillStyle = grass;
    ctx.fillRect(0,0,w,h);

    // Zonas de ensayo más oscuras
    ctx.fillStyle = "#064d24";
    ctx.fillRect(marginX, marginY, inGoal, fieldHeight);
    ctx.fillRect(xTryRight, marginY, inGoal, fieldHeight);

    // Borde exterior
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(marginX, marginY, fieldWidth, fieldHeight);

    // Líneas verticales
    const mainField = fieldWidth - inGoal*2;
    const x5L  = xTryLeft + mainField*0.05;
    const x22L = xTryLeft + mainField*0.22;
    const xMid = xTryLeft + mainField*0.50;
    const x10L = xMid - mainField*0.10;
    const x10R = xMid + mainField*0.10;
    const x22R = xTryLeft + mainField*(1 - 0.22);
    const x5R  = xTryLeft + mainField*(1 - 0.05);

    function v(x, dash=[], width=2) {
        ctx.setLineDash(dash);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x, marginY);
        ctx.lineTo(x, marginY + fieldHeight);
        ctx.stroke();
    }

    v(xTryLeft, [],3);
    v(xTryRight,[],3);
    v(x5L,[20,14]);
    v(x5R,[20,14]);
    v(x22L);
    v(x22R);
    v(x10L,[14,10]);
    v(x10R,[14,10]);
    v(xMid,[],3);

    // Líneas horizontales (solo en campo de juego)
    const y5T  = marginY + fieldHeight*0.05;
    const y15T = marginY + fieldHeight*0.25;
    const y15B = marginY + fieldHeight*0.75;
    const y5B  = marginY + fieldHeight*0.95;

    ctx.setLineDash([20,14]);
    ctx.lineWidth = 2;

    for (let y of [y5T,y15T,y15B,y5B]) {
        ctx.beginPath();
        ctx.moveTo(xTryLeft, y);
        ctx.lineTo(xTryRight, y);
        ctx.stroke();
    }
}


// ==============================
// BALÓN OVALADO
// ==============================
function drawRugbyBall(b) {
    if (!b.visible) return;
    ctx.save();
    ctx.translate(b.x,b.y);
    ctx.rotate(-0.4);
    ctx.beginPath();
    ctx.ellipse(0,0,b.rx,b.ry,0,0,Math.PI*2);
    ctx.fillStyle="#f5e1c0";
    ctx.fill();
    ctx.strokeStyle="#b37a42";
    ctx.lineWidth=2;
    ctx.stroke();
    ctx.restore();
}


// ==============================
// FLECHAS
// ==============================
function drawNormalArrow(a){
    ctx.strokeStyle="white";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(a.x1,a.y1);
    ctx.lineTo(a.x2,a.y2);
    ctx.stroke();

    const head=14;
    const ang=Math.atan2(a.y2-a.y1,a.x2-a.x1);
    ctx.beginPath();
    ctx.moveTo(a.x2,a.y2);
    ctx.lineTo(a.x2-head*Math.cos(ang-Math.PI/6), a.y2-head*Math.sin(ang-Math.PI/6));
    ctx.lineTo(a.x2-head*Math.cos(ang+Math.PI/6), a.y2-head*Math.sin(ang+Math.PI/6));
    ctx.fillStyle="white";
    ctx.fill();
}

function drawKickArrow(a){
    // Crear el punto de control del arco
    const mx = (a.x1 + a.x2) / 2;
    const my = (a.y1 + a.y2) / 2 - kickArcHeight;

    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 3;

    // Curva del arco
    ctx.beginPath();
    ctx.moveTo(a.x1, a.y1);
    ctx.quadraticCurveTo(mx, my, a.x2, a.y2);
    ctx.stroke();

    // Calcular punto de orientación para la punta
    const t = 0.9;
    const qx = (1 - t)*(1 - t)*a.x1 + 2*(1 - t)*t*mx + t*t*a.x2;
    const qy = (1 - t)*(1 - t)*a.y1 + 2*(1 - t)*t*my + t*t*a.y2;

    const ang = Math.atan2(a.y2 - qy, a.x2 - qx);
    const head = 14;

    // PUNTA DE LA FLECHA
    ctx.beginPath();
    ctx.moveTo(a.x2, a.y2);
    ctx.lineTo(
        a.x2 - head * Math.cos(ang - Math.PI/6),
        a.y2 - head * Math.sin(ang - Math.PI/6)
    );
    ctx.lineTo(
        a.x2 - head * Math.cos(ang + Math.PI/6),
        a.y2 - head * Math.sin(ang + Math.PI/6)
    );
    ctx.closePath();
    ctx.fillStyle = "yellow";
    ctx.fill();
}




// ==============================
// TEXTOS
// ==============================
function drawTexts(f){
    f.texts.forEach(t=>{
        ctx.font="16px Arial";
        const w=ctx.measureText(t.text).width;
        const h=18, px=6, py=4;

        ctx.fillStyle="rgba(0,0,0,0.65)";
        ctx.fillRect(t.x-w/2-px, t.y-py, w+px*2, h+py*2);

        ctx.strokeStyle="white";
        ctx.strokeRect(t.x-w/2-px, t.y-py, w+px*2, h+py*2);

        ctx.fillStyle="white";
        ctx.textAlign="center";
        ctx.textBaseline="top";
        ctx.fillText(t.text,t.x,t.y);
    });
}

function findTextAt(x,y){
    const f=getCurrentFrame();
    ctx.font="16px Arial";
    for(let t of f.texts){
        const w=ctx.measureText(t.text).width, h=18, px=6, py=4;
        const x1=t.x-w/2-px, y1=t.y-py;
        const x2=x1+w+px*2, y2=y1+h+py*2;
        if(x>=x1 && x<=x2 && y>=y1 && y<=y2) return t;
    }
    return null;
}


// ==============================
// DIBUJAR FRAME
// ==============================
function drawFrame() {
    drawPitch();
    const f = getCurrentFrame();

    // Trail persistente
    f.trailLines.forEach(tl=>{
        ctx.strokeStyle = tl.team==="A" ? "#7fb9ff" : "#ff7a7a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tl.x1, tl.y1);
        ctx.lineTo(tl.x2, tl.y2);
        ctx.stroke();
    });

    // Flechas finales
    f.arrows.forEach(a=>{
        if(a.type==="kick") drawKickArrow(a);
        else drawNormalArrow(a);
    });

    // Flecha preview
    if(previewArrow){
        if(previewArrow.type==="kick") drawKickArrow(previewArrow);
        else drawNormalArrow(previewArrow);
    }

    // Textos
    drawTexts(f);

    // Rastro activo mientras arrastras
    if(dragTarget && dragTarget.type==="players"){
        ctx.lineWidth=2;
        dragTarget.players.forEach((pl,i)=>{
            const st=dragTarget.startPositions[i];
            ctx.strokeStyle=pl.team==="A"?"#7fb9ff":"#ff7a7a";
            ctx.beginPath();
            ctx.moveTo(st.x,st.y);
            ctx.lineTo(pl.x,pl.y);
            ctx.stroke();
        });
    }

    // Jugadores
    f.players.forEach(p=>{
        if(!p.visible) return;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
        ctx.fillStyle=p.team==="A"?"#1e88ff":"#ff3333";
        ctx.fill();

        if(selectedPlayers.has(p)){
            ctx.strokeStyle="white";
            ctx.lineWidth=3;
            ctx.stroke();
        }

        ctx.fillStyle="white";
        ctx.font="bold 14px Arial";
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillText(p.number,p.x,p.y);
    });

    drawRugbyBall(f.ball);

    // Selección rectangular
    if(selectingBox && selectBoxStart && selectBoxEnd){
        ctx.setLineDash([6,4]);
        ctx.strokeStyle="white";
        ctx.lineWidth=1.5;
        const x=Math.min(selectBoxStart.x,selectBoxEnd.x);
        const y=Math.min(selectBoxStart.y,selectBoxEnd.y);
        const w=Math.abs(selectBoxEnd.x-selectBoxStart.x);
        const h=Math.abs(selectBoxEnd.y-selectBoxStart.y);
        ctx.strokeRect(x,y,w,h);
        ctx.setLineDash([]);
    }
}


// ==============================
// FRAME INTERPOLADO
// ==============================
function drawInterpolatedFrame(a,b,t){
    drawPitch();

    // Jugadores
    for(let i=0;i<a.players.length;i++){
        const p1=a.players[i], p2=b.players[i];
        if(!(p1.visible||p2.visible)) continue;

        let x,y;
        if(p1.visible && p2.visible){
            x=p1.x+(p2.x-p1.x)*t;
            y=p1.y+(p2.y-p1.y)*t;
        }else if(p1.visible){ x=p1.x; y=p1.y; }
        else { x=p2.x; y=p2.y; }

        ctx.beginPath();
        ctx.arc(x,y,p1.radius,0,Math.PI*2);
        ctx.fillStyle=p1.team==="A"?"#1e88ff":"#ff3333";
        ctx.fill();

        ctx.fillStyle="white";
        ctx.font="bold 14px Arial";
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillText(p1.number,x,y);
    }

    // Flechas y textos del frame destino
    b.arrows.forEach(a=>{
        if(a.type==="kick") drawKickArrow(a);
        else drawNormalArrow(a);
    });
    drawTexts(b);

    // Balón
    const bl1=a.ball, bl2=b.ball;
    let bx,by;
    if(bl1.visible && bl2.visible){
        bx=bl1.x+(bl2.x-bl1.x)*t;
        by=bl1.y+(bl2.y-bl1.y)*t;
    } else if(bl1.visible){ bx=bl1.x; by=bl1.y; }
    else { bx=bl2.x; by=bl2.y; }

    drawRugbyBall({x:bx,y:by,rx:bl1.rx,ry:bl1.ry,visible:true});
}


// ==============================
// HERRAMIENTAS INTERNAS
// ==============================
function canvasPos(e){
    const r=canvas.getBoundingClientRect();
    return {x:e.clientX-r.left,y:e.clientY-r.top};
}

function findPlayerAt(pos){
    const f=getCurrentFrame();
    for(let p of f.players){
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


// ==============================
// MELÉ
// ==============================
function placeScrumWithPrompt(x,y){
    const choice=(prompt("Equipo para melé: A, B, AB","AB")||"AB").toUpperCase();
    const f=getCurrentFrame();

    const spacingY=40;
    const rowX=32;
    const pack=35;

    function set(team,num,px,py){
        const p=f.players.find(a=>a.team===team && a.number===num);
        if(!p)return;
        p.visible=true;
        p.x=px; p.y=py;
    }

    if(choice==="A"||choice==="AB"){
        const bx=x-pack, cy=y;
        set("A",1,bx,cy-spacingY);
        set("A",2,bx,cy);
        set("A",3,bx,cy+spacingY);
        set("A",6,bx-rowX,cy-spacingY*1.5);
        set("A",4,bx-rowX,cy-spacingY*0.5);
        set("A",5,bx-rowX,cy+spacingY*0.5);
        set("A",7,bx-rowX,cy+spacingY*1.5);
        set("A",8,bx-rowX*2,cy);
    }

    if(choice==="B"||choice==="AB"){
        const bx=x+pack, cy=y;
        set("B",3,bx,cy-spacingY);
        set("B",2,bx,cy);
        set("B",1,bx,cy+spacingY);
        set("B",7,bx+rowX,cy-spacingY*1.5);
        set("B",5,bx+rowX,cy-spacingY*0.5);
        set("B",4,bx+rowX,cy+spacingY*0.5);
        set("B",6,bx+rowX,cy+spacingY*1.5);
        set("B",8,bx+rowX*2,cy);
    }

    syncPlayerToggles();
    drawFrame();
}


// ==============================
// EVENTOS RATÓN
// ==============================
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
            }else{
                if(!selectedPlayers.has(p)||selectedPlayers.size>1){
                    selectedPlayers.clear();
                    selectedPlayers.add(p);
                }
            }
            dragTarget={
                type:"players",
                players:Array.from(selectedPlayers),
                startPositions:Array.from(selectedPlayers).map(a=>({x:a.x,y:a.y})),
                startMouse:pos
            };
            drawFrame();
            return;
        }

        if(ballHitTest(pos)){
            dragTarget={type:"ball",obj:f.ball};
            dragOffsetX=pos.x-f.ball.x;
            dragOffsetY=pos.y-f.ball.y;
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
        const tx=prompt("Texto:");
        if(tx && tx.trim()!==""){
            f.texts.push({x:pos.x,y:pos.y,text:tx.trim()});
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

if ((mode === "draw" || mode === "kick") && arrowStart) {

    // ALTURA AJUSTABLE — SHIFT pulsado
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
            if(p.x>=x1 && p.x<=x2 && p.y>=y1 && p.y<=y2) selectedPlayers.add(p);
        });

        drawFrame();
    }
});


canvas.addEventListener("mouseup",()=>{
    if(dragTarget && dragTarget.type==="players"){
        const f=getCurrentFrame();
        dragTarget.players.forEach((pl,i)=>{
            const st=dragTarget.startPositions[i];
            f.trailLines.push({
                x1:st.x,
                y1:st.y,
                x2:pl.x,
                y2:pl.y,
                team:pl.team
            });
        });
    }

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
    const tx=prompt("Editar texto (vacío para borrar):",t.text);
    if(tx===null) return;
    const f=getCurrentFrame();
    if(tx.trim()===""){
        f.texts=f.texts.filter(x=>x!==t);
    } else {
        t.text=tx.trim();
    }
    drawFrame();
});


window.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
        selectedPlayers.clear();
        drawFrame();
    }
});


// ==============================
// PANEL DE JUGADORES
// ==============================
function showTeam(team) {
    const f = getCurrentFrame();
    const { fieldWidth, fieldHeight } = fieldDims();

    // Ajuste lateral (misma lógica que ya usamos para colocar jugadores)
    const xSide = team === "A"
        ? marginX + fieldWidth * 0.15
        : marginX + fieldWidth * 0.85;

    const spacing = 45;
    const yTop = marginY + 40;

    // Activar todos los jugadores del equipo
    for (let n = 1; n <= NUM_PLAYERS; n++) {
        const p = f.players.find(pl => pl.team === team && pl.number === n);

        p.visible = true;
        p.x = xSide;
        p.y = yTop + (n - 1) * spacing;
    }

    syncPlayerToggles();
    drawFrame();
}

function loadPlayerPanels() {
    const blueGrid = document.getElementById("players-blue");
    const redGrid = document.getElementById("players-red");

    for (let i = 1; i <= NUM_PLAYERS; i++) {

        // Cuadrado azul
        const a = document.createElement("div");
        a.className = "player-toggle";
        a.textContent = i;
        a.dataset.team = "A";
        a.dataset.number = i;
        a.onclick = togglePlayer;
        blueGrid.appendChild(a);

        // Cuadrado rojo
        const b = document.createElement("div");
        b.className = "player-toggle red";
        b.textContent = i;
        b.dataset.team = "B";
        b.dataset.number = i;
        b.onclick = togglePlayer;
        redGrid.appendChild(b);
    }
}


function togglePlayer(e){
    const team=e.target.dataset.team;
    const num=parseInt(e.target.dataset.number);
    togglePlayerByTeamNumber(team,num);
}

function togglePlayerByTeamNumber(team, num){
    const f=getCurrentFrame();
    const p=f.players.find(x=>x.team===team && x.number===num);
    p.visible=!p.visible;
    if(p.visible && p.x===null){
        const {fieldWidth,fieldHeight}=fieldDims();

const xSide = team === "A"
    ? marginX + fieldWidth * 0.15    // lado izquierdo
    : marginX + fieldWidth * 0.85;   // lado derecho

// Espaciado vertical
const spacing = 45;

// Posición arriba del todo
const yTop = marginY + 40;

// CADA jugador ocupa una posición vertical según su dorsal
p.x = xSide;
p.y = yTop + (num - 1) * spacing;

    }

    const selector=`.player-toggle[data-team="${team}"][data-number="${num}"]`;
    const div=document.querySelector(selector);
    if(div) div.classList.toggle("active", p.visible);

    drawFrame();
}

function syncPlayerToggles(){
    const f=getCurrentFrame();
    document.querySelectorAll(".player-toggle").forEach(div=>{
        const team=div.dataset.team;
        const num=parseInt(div.dataset.number);
        const p=f.players.find(x=>x.team===team && x.number===num);
        div.classList.toggle("active", p.visible);
    });
}


// ==============================
// MODOS
// ==============================
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
document.getElementById("show-team-a").onclick = () => {
    showTeam("A");
};

document.getElementById("show-team-b").onclick = () => {
    showTeam("B");
};

// ==============================
// FRAMES
// ==============================
function updateFrameUI(){
    document.getElementById("current-frame-index").textContent=currentFrameIndex+1;
    document.getElementById("total-frames").textContent=frames.length;
}

document.getElementById("add-frame").onclick=()=>{
    const nf=cloneFrame(getCurrentFrame());
    frames.splice(currentFrameIndex+1,0,nf);
    currentFrameIndex++;
    getCurrentFrame().trailLines=[]; // limpiar trails al cambiar frame
    updateFrameUI();
    drawFrame();
};

document.getElementById("delete-frame").onclick=()=>{
    if(frames.length>1){
        frames.splice(currentFrameIndex,1);
        currentFrameIndex=Math.max(0,currentFrameIndex-1);
        getCurrentFrame().trailLines=[];
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

document.getElementById("next-frame").onclick=()=>{
    if(currentFrameIndex<frames.length-1){
        currentFrameIndex++;
        getCurrentFrame().trailLines=[];
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};

document.getElementById("prev-frame").onclick=()=>{
    if(currentFrameIndex>0){
        currentFrameIndex--;
        getCurrentFrame().trailLines=[];
        updateFrameUI();
        drawFrame();
        syncPlayerToggles();
    }
};


// ==============================
// PLAY / STOP
// ==============================
async function playSmooth(){
    if(isPlaying||frames.length<2) return;
    isPlaying=true;
    cancelPlay=false;

    for(let i=0;i<frames.length-1;i++){
        if(cancelPlay) break;

        const a=frames[i], b=frames[i+1];
        for(let s=0;s<=INTERP_STEPS;s++){
            if(cancelPlay) break;
            drawInterpolatedFrame(a,b,s/INTERP_STEPS);
            await new Promise(r=>setTimeout(r,INTERP_DURATION/INTERP_STEPS));
        }

        currentFrameIndex=i+1;
        updateFrameUI();
    }

    drawFrame();
    isPlaying=false;
    cancelPlay=false;
}

document.getElementById("play-animation").onclick=()=>playSmooth();
document.getElementById("stop-animation").onclick=()=>{cancelPlay=true;};


// ==============================
// CLEAR ARROWS
// ==============================
document.getElementById("clear-arrows").onclick=()=>{
    getCurrentFrame().arrows=[];
    drawFrame();
};
document.getElementById("clear-board").onclick = () => {
    const f = getCurrentFrame();

    // Reset jugadores
    f.players.forEach(p => {
        p.visible = false;
        p.x = null;
        p.y = null;
    });

    // Reset flechas
    f.arrows = [];
    // Reset textos
    f.texts = [];
    // Reset trails
    f.trailLines = [];
    // Reset balón
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
document.getElementById("toggle-ball").onclick=()=>{
    const f=getCurrentFrame();
    f.ball.visible=!f.ball.visible;
    drawFrame();
};


// ==============================
// EXPORTAR WEBM HD
// ==============================
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
        for(let s=0;s<=INTERP_STEPS;s++){
            drawInterpolatedFrame(a,b,s/INTERP_STEPS);
            await new Promise(r=>setTimeout(r,INTERP_DURATION/INTERP_STEPS));
        }
    }

    currentFrameIndex=frames.length-1;
    updateFrameUI();
    drawFrame();
    await new Promise(r=>setTimeout(r,500));

    rec.stop();
};


// ==============================
// BOTONES DE MODO
// ==============================
document.getElementById("mode-move").onclick=()=>setMode("move");
document.getElementById("mode-draw").onclick=()=>setMode("draw");
document.getElementById("mode-kick").onclick=()=>setMode("kick");
document.getElementById("mode-text").onclick=()=>setMode("text");
document.getElementById("mode-scrum").onclick=()=>setMode("scrum");


// ==============================
// INICIALIZAR
// ==============================
frames.push(createFrame());
loadPlayerPanels();
updateFrameUI();
drawFrame();
syncPlayerToggles();
