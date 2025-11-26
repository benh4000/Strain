let canvas = document.querySelector("canvas");
let width = 1280;
let height = 720;
let offset = 70;
canvas.width = width;
canvas.height = height + offset;
let ctx = canvas.getContext("2d");

let baseWindowWidth = 1536;
let baseWindowHeight = 730;
let keyStats = {};
let mouse = {};
mouse.x = 0;
mouse.y = 0;
let showHitboxes = false;
let doSpawning = true;
let standardRadius = 35;
let spriteRatio = 1.3;
let playerSprite = new Image(50, 50);
playerSprite.src = "assets\\player.png"
let enemySprite = new Image(50, 50);
enemySprite.src = "assets\\enemy.png"

let gameOver = new Image();
gameOver.src = "assets\\game_over.png"
let victory = new Image();
victory.src = "assets\\victory.png"
let levelUp = new Image();
levelUp.src = "assets\\level_up.png"
let guide = new Image();
guide.src = "assets\\guide.png";


let scaleFactor = window.innerHeight/baseWindowHeight;
if(scaleFactor > window.innerWidth/baseWindowWidth) {
    //console.log("height factor: " + scaleFactor);
    scaleFactor = window.innerWidth/baseWindowWidth;
}
//console.log(scaleFactor);
scaleFactor *= 0.9;
canvas.width = canvas.width * scaleFactor;
canvas.height = canvas.height * scaleFactor;
ctx.scale(scaleFactor, scaleFactor);

function pythag(a, b) {
    return Math.sqrt(a**2 + b**2);
}

function angleRect(x, y, r, theta, sprite) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(theta);
    ctx.translate(-x, -y);
    ctx.drawImage(sprite, x-r/Math.sqrt(2), y-r/Math.sqrt(2), r/Math.sqrt(2)*2, r/Math.sqrt(2)*2);
    ctx.restore();
}


class Projectile {
    constructor(x, y, theta, color, speed, owner, dmg) {
        this.bx = x;
        this.by = y;
        this.length = 10;
        this.x = this.bx + Math.cos(theta)*this.length;
        this.y = this.by + Math.sin(theta)*this.length;
        this.vx = speed * Math.cos(theta);
        this.vy = speed * Math.sin(theta);
        this.color = color;
        this.owner = owner;
        this.theta = theta;
        this.dmg = dmg;
    }

    draw() {
        ctx.lineWidth = 6;
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.bx, this.by);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();


    }

    update() {
        this.x += this.vx;
        this.bx += this.vx;
        this.y += this.vy;
        this.by += this.vy;

        for(let wall of walls) {
            if(wall.collision(this.x, this.y)) {
                projectiles.splice(projectiles.indexOf(this), 1);
            }
        }
    }

    hasCollided(entity) {


        if(Math.sqrt((this.x-entity.x)**2 + (this.y-entity.y)**2) < entity.r && entity !== this.owner) {
            entity.hit(this.theta, this.dmg);
            projectiles.splice(projectiles.indexOf(this), 1);
        }
    }

    
}


class Entity {
    constructor(x=0, y=0, r=25, speed=2, sprite) {
        this.x = x;
        this.y = y;
        this.sprite = sprite;
        this.r = r;
        this.theta = 0;
        this.speed = speed;
        this.shootDelay = 0;
    }

    draw() {
        angleRect(this.x, this.y, this.r*spriteRatio, this.theta+Math.PI/2, this.sprite);

        if(showHitboxes) {
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.r, this.r, 0, Math.PI*2, false);
            ctx.strokeStyle = "green"
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
    }

    update() {

    }

    collision(x, y) {
        return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
    }
}

class Player extends Entity {
    constructor(x, y, r, speed, sprite) {
        super(x, y, r, speed, sprite);
        this.px = 0;
        this.py = 0;
        this.i = 0;
        this.hp = 4;
        this.dmg = 1;
        this.xp = 0;
        this.level = 1;
        this.levelXp = 100;
        this.luck = 0;
    }

    update() {
        if(this.xp >= this.levelXp) {
            this.levelUp();
        }

        this.i -= 1;
        this.px = this.x;
        this.py = this.y;
        if(keyStats['KeyW']) {this.y -= this.speed;}
        if(keyStats['KeyD']) {this.x += this.speed;}
        if(keyStats['KeyA']) {this.x -= this.speed;}
        if(keyStats['KeyS']) {this.y += this.speed;}
        if(Math.abs(this.px-this.x) > 0 && Math.abs(this.py-this.y) > 0) {
            this.x = this.px + (this.x-this.px)/Math.sqrt(2);
            this.y = this.py + (this.y-this.py)/Math.sqrt(2);
        }


        if(keyStats['Space'] && this.shootDelay <= 0) {projectiles.push(new Projectile(this.x, this.y, this.theta, "blue", 4, this, this.dmg)); this.shootDelay = 40;}
        this.shootDelay -= 1;

        this.theta = Math.atan((mouse.y-this.y)/(mouse.x-this.x));
        if(mouse.x < this.x) {
            this.theta += Math.PI;
        }
        //console.log(mouse.x + " " + mouse.y + " " + this.x + " " + this.y);
        //console.log(canvas.getBoundingClientRect().top + " " + mouse.y);

        for(let c of collidables) {
            c.circleCollision(this);
        }

        for(let p of projectiles) {
            p.hasCollided(this);
        }
    }

    hit(theta, dmg) {
        if(this.i < 1) {
            this.x += 20*Math.cos(theta);
            this.y += 20*Math.sin(theta);
            this.i = 40 + this.luck;
            this.hp -= 1;
            if(this.hp <= 0) {
                this.x = 10000;
                simulating = false;
                overlay = gameOver;
            }
        }
        
    }

    levelUp() {
        this.xp -= this.levelXp;
        this.levelXp *= 1.5;
        this.i += 50;
        this.level += 1;

        simulating = false;
        overlay = levelUp;
    }


}

class Enemy extends Entity {
    constructor(x, y, r, speed, sprite, hp) {
        super(x, y, r, speed, sprite);
        this.hp = hp;
    }

    update() {
        this.theta = Math.atan((player.y-this.y)/(player.x-this.x));
        if(player.x < this.x) {
            this.theta += Math.PI;
        }
        this.vx = this.speed*Math.cos(this.theta);
        this.vy = this.speed*Math.sin(this.theta);
        this.x += this.vx;
        this.y += this.vy;

        for(let c of collidables) {
            c.circleCollision(this);
        }

        for(let p of projectiles) {
            p.hasCollided(this);
        }

        if(pythag(player.x-this.x, player.y-this.y) < this.r + player.r) {
            player.hit(this.theta);
        }
    }

    hit(theta, dmg) {
        this.hp -= dmg;
        if(player.luck > 0) {
            let num = Math.random();
            num = Math.trunc(num*100);
            if(Math.floor(num/player.luck) == 0) {
                this.hp = 0;
                
            }

        }
        if(this.hp <= 0) {
            enemies.splice(enemies.indexOf(this), 1);
            player.xp += 25;
        }
        this.x -= 4*this.vx;
        this.y -= 4*this.vy;
        
    }

    draw() {
        this.theta += Math.PI;
        super.draw();
        this.theta -= Math.PI;
    }
}

class Wall {
    constructor(x, y, w, h, color) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        

    }

    collision(x, y) {
        return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
    }

    circleCollision(entity) {

        let lineY = 0;
        if(entity.y < this.y) {
            lineY = this.y;
        }
        else if(entity.y < this.y + this.h) {
            lineY = entity.y;
        }
        else {
            lineY = this.y + this.h;
        }
        let lineX = 0;
        if(entity.x < this.x) {
            lineX = this.x;
        }
        else if(entity.x < this.x + this.w) {
            lineX = entity.x;
        }
        else {
            lineX = this.x + this.w;
        }

        let theta = Math.atan((entity.y-lineY)/(entity.x-lineX));
        if(entity.x < lineX) {
            theta += Math.PI;
        }
        let distance = Math.sqrt((entity.y-lineY)**2 + (entity.x-lineX)**2)-entity.r;
        let dx = distance*Math.cos(theta);
        let dy = distance*Math.sin(theta);
        if(distance < 0) {
            entity.x -= dx;
            entity.y -= dy;
        }
    }
}

let player = new Player(800, 450, standardRadius, 2, playerSprite);
let wallColor = "#383838ff";
let doorColor = "#383838ff";//"#453103ff";
let walls = [];
let wallThickness = 70;
let doorSize = 200;
let wallWidth = (width-doorSize)/2;
let wallHeight = (height-doorSize)/2;

walls.push(new Wall(wallWidth, 0 + offset, doorSize, wallThickness, doorColor)); //top
walls.push(new Wall(0, 0 + offset + wallHeight, wallThickness, wallHeight, doorColor)); //left
walls.push(new Wall(width-wallThickness, 0 + offset + wallHeight, wallThickness, wallHeight, doorColor)); //right
walls.push(new Wall(wallWidth, height-wallThickness + offset, doorSize, wallThickness, doorColor)); //bottom

walls.push(new Wall(0, 0 + offset, wallThickness, wallHeight, wallColor)); //top left left
walls.push(new Wall(0, wallHeight+doorSize + offset, wallThickness, wallHeight, wallColor)); //bottom left left
walls.push(new Wall(width-wallThickness, 0 + offset, wallThickness, wallHeight, wallColor)); //top right right
walls.push(new Wall(width-wallThickness, wallHeight+doorSize + offset, wallThickness, wallHeight, wallColor)); //bottom right right
walls.push(new Wall(0, 0 + offset, wallWidth, wallThickness, wallColor)); //top left top
walls.push(new Wall(wallWidth+doorSize, 0 + offset, wallWidth, wallThickness, wallColor)); //top right top
walls.push(new Wall(wallWidth+doorSize, height-wallThickness + offset, wallWidth, wallThickness, wallColor)); //bottom right bottom
walls.push(new Wall(0, height-wallThickness + offset, wallWidth, wallThickness, wallColor)); //bottom left bottom



let projectiles = [];
let enemies = [];
enemies.push(new Enemy(300, 300, standardRadius, 1.5, enemySprite, 10));


let collidables = [];
for(let wall of walls) {
    collidables.push(wall);
}
for(let enemy of enemies) {
    //collidables.push(enemy);
}

let simulating = false;
let overlay = guide;
let spawnTimer = 1000;
let spawnTime = spawnTimer

setInterval(() => {
    
    
    drawScreen();
    drawUI();
    
    //console.log(mouse.x + " " + mouse.y);
    //angleRect(mouse.x, mouse.y, 20, 0, enemySprite);
    
    if(simulating) {
        if(doSpawning) {
            spawn();
        }
        
        player.update();
        for(let wall of walls) {
            wall.draw();
        }
        for(let projectile of projectiles) {
            projectile.update();
            projectile.draw();
        }
        for(let enemy of enemies) {
            enemy.update();
            enemy.draw();
        }
        
        player.draw();


    }
    else {
        for(let wall of walls) {
            wall.draw();
        }
        for(let projectile of projectiles) {

            projectile.draw();
        }
        for(let enemy of enemies) {

            enemy.draw();
        }
        
        player.draw();
        drawOverlay(overlay);
        if(overlay == guide) {
            if(keyStats['Space']) {
                overlay = gameOver;
                simulating = true;
            }
        }
        if(overlay == levelUp) {
            if(keyStats['Digit1']) {
                player.dmg += 1;
                overlay = gameOver;
                simulating = true;
            }
            else if(keyStats['Digit2']) {
                player.speed += 1;
                overlay = gameOver;
                simulating = true;
            }
            else if(keyStats['Digit3']) {
                player.luck += 5;
                overlay = gameOver;
                simulating = true;
            }
        }
    }

}, 10);

document.addEventListener('keydown', (e) => {keyStats[e.code] = true});
document.addEventListener('keyup', (e) => {keyStats[e.code] = false});
document.addEventListener('mousemove', (e) => {mouse.x = (e.x - canvas.getBoundingClientRect().left)/scaleFactor; mouse.y = (e.y - canvas.getBoundingClientRect().top)/scaleFactor});

function spawn() {
    spawnTime -= 1;
    if(spawnTimer < 200) {
        if(enemies.length == 0) {
            simulating = false;
            overlay = victory;
        }
    }
    else if(spawnTime <= 0) {
        spawnTimer *= 0.9;
        spawnTime = spawnTimer;
        
        //console.log(spawnTimer);
        let spawns = [true, true, true, true];
        if(player.x < width/2 && player.y < height/2) {
            spawns[0] = false;
        }
        if(player.x > width/2 && player.y < height/2) {
            spawns[1] = false;
        }
        if(player.x < width/2 && player.y > height/2) {
            spawns[2] = false;
        }
        if(player.x > width/2 && player.y > height/2) {
            spawns[3] = false;
        }
        num = Math.random();
        choice = 2;
        if(num < 0.3) {
            choice = 0;
        }
        else if(num < 0.65) {
            choice = 1;
        }
        if(spawns[choice] == false) {
            spawns[choice+1] = false;
        }
        else {
            spawns[choice] = false;
        }
        if(spawns[0]) {
            enemies.push(new Enemy(150, 250, standardRadius, 1.5, enemySprite, 10));
        }
        if(spawns[1]) {
            enemies.push(new Enemy(width-150, 250, standardRadius, 1.5, enemySprite, 10));
        }
        if(spawns[2]) {
            enemies.push(new Enemy(150, height + offset - 150, standardRadius, 1.5, enemySprite, 10));
        }
        if(spawns[3]) {
            enemies.push(new Enemy(width - 150, height + offset - 150, standardRadius, 1.5, enemySprite, 10));
        }

    }
}

function drawOverlay(overlay) {
    ctx.drawImage(overlay, (width-overlay.width)/2, (height-overlay.height)/2+offset);
}

function drawScreen() {
    ctx.fillStyle = "grey";
    ctx.fillRect(0, offset, width, height);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, offset);
}

function drawUI() {
    ctx.fillStyle = "red";

    if(player.hp > 0) {
        ctx.fillRect(20, 20, 50, 30);
    }
    if(player.hp > 1) {
        ctx.fillRect(100, 20, 50, 30);
    }
    if(player.hp > 2) {
        ctx.fillRect(180, 20, 50, 30);
    }
    if(player.hp > 3) {
        ctx.fillRect(260, 20, 50, 30);
    }

    ctx.fillStyle = "white";
    ctx.font = "bold 48px system-ui";
    ctx.fillText(player.level, width-40, 40);

    ctx.fillStyle= "grey";
    ctx.fillRect(width - 250, 10, 200, 30);

    ctx.fillStyle = "yellow";
    ctx.fillRect(width - 250, 10, 200*(player.xp/player.levelXp), 30);

}
