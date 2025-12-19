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
let spriteRatio = 1.4;
let playerSprite = new Image(50, 50);
playerSprite.src = "assets\\player.png"
let enemySprite = new Image(50, 50);
enemySprite.src = "assets\\enemy.png"
let archerSprite = new Image(50, 50);
archerSprite.src = "assets\\enemy2.png";

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
    constructor(x, y, theta, color, speed, owner, dmg, scale) {
        this.bx = x;
        this.by = y;
        this.length = 10 * scale;
        this.x = this.bx + Math.cos(theta)*this.length;
        this.y = this.by + Math.sin(theta)*this.length;
        this.vx = speed * Math.cos(theta);
        this.vy = speed * Math.sin(theta);
        this.color = color;
        this.owner = owner;
        this.theta = theta;
        this.dmg = dmg;
        this.scale = scale;
    }

    draw() {
        ctx.lineWidth = 6 * this.scale;
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

        this.wallCollision();

        if(this.x > width || this.x < 0 || this.y < offset || this.y > height + offset) {
            projectiles.splice(projectiles.indexOf(this), 1);
        }
    }

    wallCollision() {
        for(let wall of walls) {
            if(wall.pCollision(this.x, this.y)) {
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

class FireBall extends Projectile {

    wallCollision() {
        for(let wall of walls) {
            if(wall.pCollision(this.x, this.y)) {
                this.explode()
                projectiles.splice(projectiles.indexOf(this), 1);
            }
        }
    }

    hasCollided(entity) {
        if(Math.sqrt((this.x-entity.x)**2 + (this.y-entity.y)**2) < entity.r && entity !== this.owner) {
            entity.hit(this.theta, this.dmg);
            this.explode();
            projectiles.splice(projectiles.indexOf(this), 1);
        }
    }

    explode() {
        if(pythag(player.x-this.x, player.y-this.y) <= 70) {
            player.hit(player.theta + Math.PI, 1);
        }
        for(let enemy of enemies) {
            let dist = pythag(enemy.x-this.x, enemy.y-this.y) - standardRadius/2
            if(dist <= 70) {
                let verticalScale = 8; //decrease for more damage
                let damageAmount = Math.floor(Math.pow(10-dist/13, 2)/verticalScale - 1);
                enemy.hp -= damageAmount
                console.log(dist + " " + damageAmount);
            }
        }
        effects.push(new Effect(this.x, this.y, 70, "#c6620a"));
    }
}

class Effect {
    constructor(x, y, r, color) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.color = color;
        this.time = 0;
        this.ir = r / 2;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.ir, this.ir, 0, 0, 2*Math.PI, false);
        ctx.fill();
    }

    update() {
        this.time += 1;
        this.ir += this.r/2/30;
        if(this.time > 30) {
            effects.splice(effects.indexOf(this), 1);
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
        this.dmg = 1.5;
        this.xp = 0;
        this.level = 1;
        this.levelXp = 150;
        this.luck = 0;
        this.spell1Delay = 0;
        this.spell1Cooldown = 400;
        this.hasSpell1 = false;
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


        if(keyStats['Space'] && this.shootDelay <= 0) {projectiles.push(new Projectile(this.x, this.y, this.theta, "blue", 4, this, this.dmg, 1.0)); this.shootDelay = 40;}
        this.shootDelay -= 1;
        if(keyStats['KeyQ'] && this.spell1Delay <= 0 && player.hasSpell1) {projectiles.push(new FireBall(this.x, this.y, this.theta, "#c6620a", 4, this, 1.0, 2.0)); this.spell1Delay = this.spell1Cooldown;}
        this.spell1Delay -= 1;

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
        this.levelXp *= 1.3;
        this.i += 50;
        this.level += 1;
        if(this.hp < 4) {
            this.hp += 1;
        }

        simulating = false;
        overlay = levelUp;

        if(player.level >= 10) {
            startRoom.resolved = false;
        }
    }



}

class Enemy extends Entity {
    constructor(x, y, r, speed, sprite, hp) {
        super(x, y, r, speed, sprite);
        this.hp = hp;
    }

    update() {
        if(this.x == NaN) {
            //enemies.splice(enemies.indexOf(this), 1);
        }

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

        for(let e of enemies) {

            if(e != this && pythag(e.x-this.x, e.y-this.y) < this.r + e.r) {
                let theta = Math.atan((e.y-this.y)/(e.x-this.x));
                if(e.x < this.x) {
                    theta += Math.PI;
                }
                let distance = this.r + e.r - pythag(e.x-this.x, e.y-this.y);
                let dx = distance*Math.cos(theta);
                let dy = distance*Math.sin(theta);
                this.x -= dx;
                this.y -= dy;
                
                break;
            }

        }

        if(this.hp <= 0) {
            enemies.splice(enemies.indexOf(this), 1);
            player.xp += 25;
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

        this.x -= 4*this.vx;
        this.y -= 4*this.vy;
        
    }

    draw() {
        this.theta += Math.PI;
        super.draw();
        this.theta -= Math.PI;
    }
}

class Archer extends Enemy {
    constructor(x, y, r, speed, sprite, hp) {
        super(x, y, r, speed, sprite, hp);
        this.shootTime = 0;
        this.strafe = true;
        this.shootTimer = 250;
    }

    update() {
        super.update();
        if(this.strafe) {
            this.x -= this.vx/2;
            this.y -= this.vy/2;
            if(Math.abs(this.vx) < Math.abs(this.vy)) {
                this.x -= this.vx;
            }
            else {
                this.y -= this.vy;
            }
        }

        for(let c of collidables) {
            c.circleCollision(this);
        }

        this.shootTime += 1;
        if(this.shootTime >= this.shootTimer) {
            projectiles.push(new Projectile(this.x, this.y, this.theta, "rgba(80, 49, 2, 1)", 7, this, 1, 1.8));
            if(!this.strafe) {
                projectiles.push(new Projectile(this.x, this.y, this.theta + Math.PI/12, "rgba(80, 49, 2, 1)", 7, this, 1, 1.8));
                projectiles.push(new Projectile(this.x, this.y, this.theta - Math.PI/12, "rgba(80, 49, 2, 1)", 7, this, 1, 1.8));
            }
            this.shootTime = 0;
        }
    }


}

class Wall {
    constructor(x, y, w, h, color, show=true, block=true) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
        this.show = show;
        this.block = block;
    }

    draw() {
        if(this.show) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
        
        

    }

    pCollision(x, y) {
        return this.block && (x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h && this.show);
    }

    circleCollision(entity) {
        if(!this.show) {
            return;
        }
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

class Bar {
    constructor(x1, y1, x2, y2, num) {
        let segs = num*2+1;
        this.parts = [];
        this.show = false;
        //Horizontal
        if(x2-x1 > y2-y1) {
            let size = (x2-x1)/segs;
            let top = (y2-y1)/2 - size/2;
            for(let i=0; i<num; i++) {
                this.parts.push(new Wall(x1 + size + i*size*2, y1 + top, size, size, wallColor));
            }
        }
        //Vertical
        else {
            let size = (y2-y1)/segs;
            let left = (x2-x1)/2 - size/2;
            for(let i=0; i<num; i++) {
                this.parts.push(new Wall(x1 + left, y1 + size + i*size*2, size, size, wallColor));
            }
        }
        walls.push(...this.parts);
    }

    update() {
        for(let part of this.parts) {
            part.show = this.show;
        }
    
    }
}

class GameMap {
    constructor() {

    }

    getRoom(x, y) {
        return this[x.toString() + y.toString()];
    }

    load(parent, direction) {
        parent.unload();
        if(direction == "left") {if(this.getRoom(parent.x+1, parent.y) == undefined) {this[(parent.x+1).toString() + parent.y.toString()] = new Room(parent, direction)} currentRoom = this.getRoom(parent.x+1, parent.y);}
        if(direction == "right") {if(this.getRoom(parent.x-1, parent.y) == undefined) {this[(parent.x-1).toString() + parent.y.toString()] = new Room(parent, direction)} currentRoom = this.getRoom(parent.x-1, parent.y);}
        if(direction == "up") {if(this.getRoom(parent.x, parent.y-1) == undefined) {this[parent.x.toString() + (parent.y-1).toString()] = new Room(parent, direction)} currentRoom = this.getRoom(parent.x, parent.y-1);}
        if(direction == "down") {if(this.getRoom(parent.x, parent.y+1) == undefined) {this[parent.x.toString() + (parent.y+1).toString()] = new Room(parent, direction)} currentRoom = this.getRoom(parent.x, parent.y+1);}
    }
}

class Room {
    constructor(parent, direction) {
        this.setpiece = "";
        this.triggered = false;
        this.resolved = false;
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
        if(direction == "right") {
            this.x = parent.x - 1;
            this.y = parent.y;
            this.right = true;
            if(Math.random() < 0.4) {
                this.up = true;
            }
            if(Math.random() < 0.4) {
                this.down = true;
            }
            if(Math.random() < 0.4) {
                this.left = true;
            }
        }
        if(direction == "left") {
            this.x = parent.x + 1;
            this.y = parent.y;
            this.left = true;
            if(Math.random() < 0.4) {
                this.up = true;
            }
            if(Math.random() < 0.4) {
                this.down = true;
            }
            if(Math.random() < 0.4) {
                this.right = true;
            }
        }
        if(direction == "down") {
            this.x = parent.x;
            this.y = parent.y + 1;
            this.down = true;
            if(Math.random() < 0.4) {
                this.up = true;
            }
            if(Math.random() < 0.4) {
                this.right = true;
            }
            if(Math.random() < 0.4) {
                this.left = true;
            }
        }
        if(direction == "up") {
            this.x = parent.x;
            this.y = parent.y - 1;
            this.up = true;
            if(Math.random() < 0.4) {
                this.right = true;
            }
            if(Math.random() < 0.4) {
                this.down = true;
            }
            if(Math.random() < 0.4) {
                this.left = true;
            }
        }
        if(gameMap.getRoom(this.x+1, this.y) != undefined) {
            this.right = gameMap.getRoom(this.x+1, this.y).left
        }
        if(gameMap.getRoom(this.x, this.y - 1) != undefined) {
            this.down =  gameMap.getRoom(this.x, this.y - 1).up;
        }
        if(gameMap.getRoom(this.x-1, this.y) != undefined) {
            this.left = gameMap.getRoom(this.x-1, this.y).right;
        }
        if(gameMap.getRoom(this.x, this.y + 1) != undefined) {
            this.up = gameMap.getRoom(this.x, this.y + 1).down;
        }
        gameMap[this.x.toString() + this.y.toString()] = this;

        if(this.left && this.right && !this.up && !this.down && !waterSP && Math.random() < 0.26) {
            this.setpiece = "water";
            waterSP = true;
        }
        if(!spell1SP && player.level > 1 && (this.left && !this.right && !this.up && !this.down || !this.left && this.right && !this.up && !this.down || !this.left && !this.right && this.up && !this.down || !this.left && !this.right && !this.up && this.down)) {
            this.setpiece = "spell1";
            spell1SP = true;
            this.resolved = true;
        }



    }

    update() {
        leftEntrance.show = !this.left;
        rightEntrance.show = !this.right;
        upEntrance.show = !this.up;
        downEntrance.show = !this.down;

        if(this.setpiece == "water") {
            water1.show = true;
            water2.show = true;
        }
        if(this.setpiece == "spell1" && !player.hasSpell1) {
            spell1.show = true;
        }

        if(player.x < -2) {
            gameMap.load(this, "right");
            player.x = width-2;
            currentRoom.update();
        }
        if(player.x > width + 2) {
            gameMap.load(this, "left");
            player.x = -2;
            currentRoom.update();
        }
        if(player.y < -2 + offset) {
            gameMap.load(this, "down");
            player.y = offset + height - 2;
            currentRoom.update();
        }
        if(player.y > height + offset + 2) {
            gameMap.load(this, "up");
            player.y = offset + 2;
            currentRoom.update();
        }
        if(!this.triggered && !this.resolved && player.x < width - wallThickness && player.x > wallThickness && player.y > offset + wallThickness && player.y < height + offset - wallThickness) {
            this.triggered = true;
            for(let bar of bars) {
                bar.show = true;
            }
            spawnTimer = 900;
            spawnTime = 100;
        }
        if(this.triggered && this != startRoom) {
            spawn();
            if(spawnTimer < 300 && enemies.length == 0) {
                this.triggered = false;
                this.resolved = true;
                for(let bar of bars) {
                    bar.show = false;
                }
            }
        } else if(this.triggered && this == startRoom) {
            if(!bossSpawned) {
                enemies.push(boss);
                bossSpawned = true;
            }
            if(enemies.length == 0) {
                simulating = false;
                overlay = victory;
            }

        }
    }
    unload() {
        if(this.setpiece == "water") {
            water1.show = false;
            water2.show = false;
        }
        if(this.setpiece == "spell1") {
            spell1.show = false;
        }
    }
}

class PickUp {
    constructor(x, y, color, callback) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.show = false;
        this.callback = callback;
    }

    draw() {
        if(this.show) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x-15, this.y-15, 30, 30);
        }

    }

    update() {
        if(pythag(player.x-this.x, player.y-this.y) < standardRadius && this.show) {
            this.show = false;
            this.callback();
            effects.splice(effects.indexOf(this, 1));
        }
    }
}

let waterSP = false;
let spell1SP = false;

let player = new Player(800, 450, standardRadius, 2, playerSprite);
let gameMap = new GameMap();
let parent = {};
parent.x = 0;
parent.y = -1;
let startRoom = new Room(parent, "up");
startRoom.up = true;
startRoom.down = true;
startRoom.left = true;
startRoom.right = true;
startRoom.resolved = true;
startRoom.setpiece = "";
let currentRoom = startRoom;

waterSP = false;
spell1SP = false;




let wallColor = "#383838ff";
let doorColor = "#383838ff";//"#453103ff";
let walls = [];
let wallThickness = 70;
let doorSize = 200;
let wallWidth = (width-doorSize)/2;
let wallHeight = (height-doorSize)/2;

let upEntrance = new Wall(wallWidth-5, 0 + offset, doorSize+10, wallThickness, doorColor, false); //top
let leftEntrance = new Wall(0, 0 + offset + wallHeight-5, wallThickness, wallHeight+5, doorColor, false); //left
let rightEntrance = new Wall(width-wallThickness, 0 + offset + wallHeight-5, wallThickness, wallHeight+5, doorColor, false); //right
let downEntrance = new Wall(wallWidth-5, height-wallThickness + offset, doorSize+5, wallThickness, doorColor, false); //bottom

walls.push(upEntrance);
walls.push(leftEntrance);
walls.push(rightEntrance);
walls.push(downEntrance);


walls.push(new Wall(0, 0 + offset, wallThickness, wallHeight, wallColor)); //top left left
walls.push(new Wall(0, wallHeight+doorSize + offset, wallThickness, wallHeight, wallColor)); //bottom left left
walls.push(new Wall(width-wallThickness, 0 + offset, wallThickness, wallHeight, wallColor)); //top right right
walls.push(new Wall(width-wallThickness, wallHeight+doorSize + offset, wallThickness, wallHeight, wallColor)); //bottom right right
walls.push(new Wall(0, 0 + offset, wallWidth, wallThickness, wallColor)); //top left top
walls.push(new Wall(wallWidth+doorSize, 0 + offset, wallWidth, wallThickness, wallColor)); //top right top
walls.push(new Wall(wallWidth+doorSize, height-wallThickness + offset, wallWidth, wallThickness, wallColor)); //bottom right bottom
walls.push(new Wall(0, height-wallThickness + offset, wallWidth, wallThickness, wallColor)); //bottom left bottom

let water1 = new Wall(width/2 - 220, wallThickness + offset, 440, wallHeight-wallThickness, "#084b93ff", false, false);
let water2 = new Wall(width/2 - 220, height-wallHeight+offset, 440, wallHeight-wallThickness, "#084b93ff", false, false)
walls.push(water1);
walls.push(water2);


let bars = [];
topBar = new Bar(wallWidth, offset, wallWidth + doorSize, offset + wallThickness, 5);
leftBar = new Bar(0, offset + wallHeight, wallThickness, offset + wallHeight + doorSize, 5);
rightBar = new Bar(width-wallThickness, offset + wallHeight, width, offset + wallHeight + doorSize, 5);
downBar = new Bar(wallWidth, height-wallThickness + offset, wallWidth + doorSize, offset + height, 5);
bars.push(topBar);
bars.push(leftBar);
bars.push(rightBar);
bars.push(downBar);


let projectiles = [];
let enemies = [];

let wasArcher = true;



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

let boss = new Archer(width/2, height/2+offset, standardRadius*1.7, 1, archerSprite, 300);
boss.strafe = false;

bossSpawned = false;


let effects = []
let spell1 = new PickUp(width/2, height/2 + offset, "#c6620a", () => {player.hasSpell1 = true});
effects.push(spell1);
//spell1.show = true;

setInterval(() => {
    
    
    drawScreen();
    
    
    //console.log(mouse.x + " " + mouse.y);
    //angleRect(mouse.x, mouse.y, 20, 0, enemySprite);
    
    if(simulating) {
        if(doSpawning) {
            //spawn();
        }
        
        player.update();
        currentRoom.update();
        for(let bar of bars) {
            bar.update();
        }
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

        for(let effect of effects) {
            effect.update();
            effect.draw();
        }

        drawUI();


    }
    else {
        for(let bar of bars) {
            bar.update();
        }
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

        for(let effect of effects) {
            effect.draw();
        }
        drawOverlay(overlay);
        if(overlay == guide) {
            if(keyStats['Space']) {
                overlay = gameOver;
                simulating = true;
            }
        }
        if(overlay == levelUp) {
            if(keyStats['Digit1']) {
                player.dmg += 0.5;
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

        drawUI();
    }

}, 10);

document.addEventListener('keydown', (e) => {keyStats[e.code] = true});
document.addEventListener('keyup', (e) => {keyStats[e.code] = false});
document.addEventListener('mousemove', (e) => {mouse.x = (e.x - canvas.getBoundingClientRect().left)/scaleFactor; mouse.y = (e.y - canvas.getBoundingClientRect().top)/scaleFactor});

function spawn() {
    spawnTime -= 1;
    if(spawnTimer < 300) {
        if(enemies.length == 0) {
            //simulating = false;
            //overlay = victory;
        }
    }
    else if(spawnTime <= 0) {
        spawnTimer *= 0.9;
        spawnTime = spawnTimer;

        if(player.level > 3 && Math.random() < 0.3) {
            wasArcher = false;
        }
        
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

        if(player.level < 8) {
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
        }


        if(spawns[0]) {
            place(150, 250)
        }
        if(spawns[1]) {
            place(width-150, 250);
        }
        if(spawns[2]) {
            place(150, height + offset - 150);
        }
        if(spawns[3]) {
            place(width - 150, height + offset - 150);
        }

    }
}

function place(x, y) {
    if(wasArcher) {
        enemies.push(new Enemy(x, y, standardRadius, 1.5, enemySprite, 10));
    }
    else {
        wasArcher = true;
        enemies.push(new Archer(x, y, standardRadius*1.2, 1.4, archerSprite, 10));
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

    if(startRoom == currentRoom) {
        ctx.fillStyle = "#520f0fff";
        ctx.fillRect(250, 150 + offset, width-500, 75);
        ctx.fillRect(250, height + offset - 250, width-500, 75);
        ctx.fillRect(250, 150 + offset, 75, 350);
        ctx.fillRect(width-575+250, 150 + offset, 75, 350);
    }
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
    ctx.fillText(player.level, width-50, 40);


    if(player.level >= 10) {
        ctx.font = "bold 30px system-ui";
        ctx.fillText("Return to the start ...if you dare", width-850, 40);
    }

    ctx.fillStyle= "grey";
    ctx.fillRect(width - 260, 10, 200, 30);

    ctx.fillStyle = "yellow";
    ctx.fillRect(width - 260, 10, 200*(player.xp/player.levelXp), 30);

    if(player.hasSpell1) {
        ctx.fillStyle = "#c6620a";
        ctx.fillRect(width-50, offset + 20, 30, 30);
        ctx.fillStyle = "white";
        ctx.font = "bold 20px system-ui";
        ctx.fillText("Q", width-60, offset + 60);

        ctx.fillStyle = "#9494946e";
        ctx.beginPath();
        ctx.ellipse(width-35, offset + 35, 30, 30, 0, 0, 2 * Math.PI * (higherOf(0, player.spell1Delay)/player.spell1Cooldown), false);
        ctx.lineTo(width-35, offset+35);
        ctx.lineTo(width-5, offset +35);
        ctx.fill();
    }

}


function higherOf(a, b) {
    if(a > b) { return a; } else { return b; }
}