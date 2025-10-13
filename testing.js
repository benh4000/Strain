let canvas = document.querySelector("canvas");
canvas.width = 1600;
canvas.height = 900;
let ctx = canvas.getContext("2d");
let keyStats = {};

let x = 0;
let y = 0;
let r = 30;
let player = {};
player.x = 0;
player.y = 0;
player.r = 30;

let wallX = 200;
let wallY = 200;
let wallWidth = 100;
let wallHeight = 400;
let movement = 4;

let wall = {};
wall.x = 200;
wall.y = 200;
wall.w = 100;
wall.h = 400;

function updateStuff(entity) {
    if(keyStats['KeyW']) {entity.y -= movement;}
    if(keyStats['KeyD']) {entity.x += movement;}
    if(keyStats['KeyA']) {entity.x -= movement;}
    if(keyStats['KeyS']) {entity.y += movement;}
    

    let lineY = 0;
    if(entity.y < wall.y) {
        lineY = wall.y;
    }
    else if(entity.y < wall.y + wall.h) {
        lineY = entity.y;
    }
    else {
        lineY = wall.y + wall.h;
    }
    let lineX = 0;
    if(entity.x < wall.x) {
        lineX = wall.x;
    }
    else if(entity.x < wall.x + wall.w) {
        lineX = entity.x;
    }
    else {
        lineX = wall.x + wall.w;
    }

    let theta = Math.atan((entity.y-lineY)/(entity.x-lineX));
    if(entity.x < lineX) {
        theta += Math.PI;
    }
    let speed = Math.sqrt((entity.y-lineY)**2 + (entity.x-lineX)**2)-r;
    let dx = speed*Math.cos(theta);
    let dy = speed*Math.sin(theta);
    if(speed < 0) {
        entity.x -= dx;
        entity.y -= dy;
    }
    
    // if(keyStats['KeyF']) {
    //     //console.log(theta/Math.PI*180);
    //     console.log(speed);
    //     x -= dx;
    //     y -= dy;
    // }
    



    ctx.fillStyle = "black"
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.ellipse(entity.x, entity.y, entity.r, entity.r, 0, Math.PI*2, false);
    ctx.fill();

    ctx.strokeStyle = "green";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(entity.x, entity.y);
    ctx.lineTo(lineX, lineY);
    ctx.stroke();



}



setInterval(() => {
    ctx.fillStyle = "grey";
    ctx.fillRect(0, 0, 1600, 900);
    updateStuff(player);

}, 10);

document.addEventListener('keydown', (e) => {keyStats[e.code] = true});
document.addEventListener('keyup', (e) => {keyStats[e.code] = false});