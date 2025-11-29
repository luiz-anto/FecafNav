var sprites = {
 ship: { sx: 0, sy: 0, w: 37, h: 42, frames: 1 },
 missile: { sx: 0, sy: 30, w: 2, h: 10, frames: 1 },
 enemy_purple: { sx: 37, sy: 0, w: 42, h: 43, frames: 1 },
 explosion: { sx: 0, sy: 64, w: 64, h: 64, frames: 12 },
 enemy_missile: { sx: 9, sy: 42, w: 3, h: 20, frame: 1 }
};

// --- GERADOR X ALEATÓRIO ---
function randX(spriteWidth) {
  return Math.floor(Math.random() * (Game.width - spriteWidth));
}

// --- NOVOS INIMIGOS (COM X ALEATÓRIO + ZIG ZAG) ---
var enemies = {

  // Movimento reto direita → esquerda
  move_right_to_left: { 
    x: function(){ return randX(sprites.enemy_purple.w); },
    y: -50, 
    sprite: 'enemy_purple',
    health: 10,
    A: -120,
    E: 40
  },

  // Movimento reto esquerda → direita
  move_left_to_right: { 
    x: function(){ return randX(sprites.enemy_purple.w); },
    y: -50,
    sprite: 'enemy_purple',
    health: 10,
    A: 120,
    E: 40
  },

  // Entra por cima rápido em queda
  move_down: {
    x: function(){ return randX(sprites.enemy_purple.w); },
    y: -50,
    sprite: 'enemy_purple',
    health: 10,
    A: 0,
    E: 120
  },

  // 👇 INIMIGO EM ZIG-ZAG (NOVO)
  zigzag_slow: {
    x: function(){ return randX(sprites.enemy_purple.w); },
    y: -50,
    sprite: 'enemy_purple',
    health: 15,
    A: 0,
    B: 150,  // intensidade horizontal
    C: 2,    // frequência
    D: 0,
    E: 60,   // descida
  },

  zigzag_fast: {
    x: function(){ return randX(sprites.enemy_purple.w); },
    y: -50,
    sprite: 'enemy_purple',
    health: 20,
    A: 0,
    B: 250,
    C: 4,
    D: 1,
    E: 90
  }
};

// --- TYPES ---
var OBJECT_PLAYER = 1,
    OBJECT_PLAYER_PROJECTILE = 2,
    OBJECT_ENEMY = 4,
    OBJECT_ENEMY_PROJECTILE = 8;

var startGame = function() {
  var ua = navigator.userAgent.toLowerCase();

  if(ua.match(/android/)) {
    Game.setBoard(0,new Starfield(50,0.6,100,true));
  } else {
    Game.setBoard(0,new Starfield(20,0.4,100,true));
    Game.setBoard(1,new Starfield(50,0.6,100));
    Game.setBoard(2,new Starfield(100,1.0,50));
  }  
  Game.setBoard(3,new TitleScreen("Fecaf Vs Anhanguera", 
                                  "Começar a jogar!",
                                  playGame));
};

// --- LEVEL INFINITO COM ONDAS DIFERENTES ---
var level1 = [
  // tStart | tEnd | freq | enemyType

  [ 0,        9999999,  800, "move_right_to_left" ],
  [ 0,        9999999, 1000, "move_left_to_right" ],
  [ 0,        9999999, 1200, "move_down" ],

  // ONDA 1 – ZIG ZAG LENTO
  [ 5000,     9999999, 1300, "zigzag_slow" ],

  // ONDA 2 – ZIG ZAG RÁPIDO
  [ 12000,    9999999, 1500, "zigzag_fast" ]
];

var playGame = function() {
  var board = new GameBoard();
  board.add(new PlayerShip());

  board.add(new Level(level1, function() {}));
  Game.setBoard(3,board);
  Game.setBoard(5,new GamePoints(0));
};

var loseGame = function() {
  Game.setBoard(3,new TitleScreen("Perdeu!", 
                                  "Muito ruim!",
                                  playGame));
};


var Starfield = function(speed,opacity,numStars,clear) {
  var stars = document.createElement("canvas");
  stars.width = Game.width; 
  stars.height = Game.height;
  var starCtx = stars.getContext("2d");

  var offset = 0;

  if(clear) {
    starCtx.fillStyle = "#000";
    starCtx.fillRect(0,0,stars.width,stars.height);
  }

  starCtx.fillStyle = "#FFF";
  starCtx.globalAlpha = opacity;
  for(var i=0;i<numStars;i++) {
    starCtx.fillRect(Math.floor(Math.random()*stars.width),
                     Math.floor(Math.random()*stars.height),
                     2,2);
  }

  this.draw = function(ctx) {
    var intOffset = Math.floor(offset);
    var remaining = stars.height - intOffset;

    if(intOffset > 0) {
      ctx.drawImage(stars,
                0, remaining,
                stars.width, intOffset,
                0, 0,
                stars.width, intOffset);
    }

    if(remaining > 0) {
      ctx.drawImage(stars,
              0, 0,
              stars.width, remaining,
              0, intOffset,
              stars.width, remaining);
    }
  };

  this.step = function(dt) {
    offset += dt * speed;
    offset = offset % stars.height;
  };
};

// --- PLAYER ---
var PlayerShip = function() { 
  this.setup('ship', { vx: 0, reloadTime: 0.25, maxVel: 200 });

  this.reload = this.reloadTime;
  this.x = Game.width/2 - this.w / 2;
  this.y = Game.height - Game.playerOffset - this.h;

  this.step = function(dt) {
    if(Game.keys['left']) { this.vx = -this.maxVel; }
    else if(Game.keys['right']) { this.vx = this.maxVel; }
    else { this.vx = 0; }

    this.x += this.vx * dt;

    if(this.x < 0) { this.x = 0; }
    else if(this.x > Game.width - this.w) { 
      this.x = Game.width - this.w;
    }

    this.reload-=dt;
    if(Game.keys['fire'] && this.reload < 0) {
      Game.keys['fire'] = false;
      this.reload = this.reloadTime;

      this.board.add(new PlayerMissile(this.x,this.y+this.h/2));
      this.board.add(new PlayerMissile(this.x+this.w,this.y+this.h/2));
    }
  };
};

PlayerShip.prototype = new Sprite();
PlayerShip.prototype.type = OBJECT_PLAYER;

PlayerShip.prototype.hit = function(damage) {
  if(this.board.remove(this)) {
    loseGame();
  }
};


// --- MISSIL PLAYER ---
var PlayerMissile = function(x,y) {
  this.setup('missile',{ vy: -700, damage: 10 });
  this.x = x - this.w/2;
  this.y = y - this.h; 
};

PlayerMissile.prototype = new Sprite();
PlayerMissile.prototype.type = OBJECT_PLAYER_PROJECTILE;

PlayerMissile.prototype.step = function(dt)  {
  this.y += this.vy * dt;
  var collision = this.board.collide(this,OBJECT_ENEMY);
  if(collision) {
    collision.hit(this.damage);
    this.board.remove(this);
  } else if(this.y < -this.h) { 
      this.board.remove(this); 
  }
};


// --- ENEMY ---
var Enemy = function(blueprint,override) {
  this.merge(this.baseParameters);
  this.setup(blueprint.sprite,blueprint);

  // Permite X aleatório via função
  if (typeof this.x === "function") this.x = this.x();

  this.merge(override);
};

Enemy.prototype = new Sprite();
Enemy.prototype.type = OBJECT_ENEMY;

Enemy.prototype.baseParameters = { 
  A: 0, B: 0, C: 0, D: 0, 
  E: 0, F: 0, G: 0, H: 0,
  t: 0, reloadTime: 0.75, 
  reload: 0 
};

Enemy.prototype.step = function(dt) {
  this.t += dt;

  this.vx = this.A + this.B * Math.sin(this.C * this.t + this.D);
  this.vy = this.E + this.F * Math.sin(this.G * this.t + this.H);

  this.x += this.vx * dt;
  this.y += this.vy * dt;

  if(this.y > 0 && this.y < Game.height && Math.random() < 0.01 && this.reload <= 0) {
    this.reload = this.reloadTime;
    this.board.add(new EnemyMissile(this.x+this.w/2,this.y+this.h));
  }
  this.reload-=dt;

  if(this.y > Game.height ||
     this.x < -this.w ||
     this.x > Game.width) {
       this.board.remove(this);
  }
};

Enemy.prototype.hit = function(damage) {
  this.health -= damage;
  if(this.health <=0) {
    if(this.board.remove(this)) {
      Game.points += this.points || 100;
      this.board.add(new Explosion(this.x + this.w/2, 
                                   this.y + this.h/2));
    }
  }
};

var EnemyMissile = function(x,y) {
  this.setup('enemy_missile',{ vy: 200, damage: 10 });
  this.x = x - this.w/2;
  this.y = y;
};

EnemyMissile.prototype = new Sprite();
EnemyMissile.prototype.type = OBJECT_ENEMY_PROJECTILE;

EnemyMissile.prototype.step = function(dt)  {
  this.y += this.vy * dt;
  var collision = this.board.collide(this,OBJECT_PLAYER)
  if(collision) {
    collision.hit(this.damage);
    this.board.remove(this);
  } else if(this.y > Game.height) {
      this.board.remove(this); 
  }
};


var Explosion = function(centerX,centerY) {
  this.setup('explosion', { frame: 0 });
  this.x = centerX - this.w/2;
  this.y = centerY - this.h/2;
};

Explosion.prototype = new Sprite();

Explosion.prototype.step = function(dt) {
  this.frame++;
  if(this.frame >= 12) {
    this.board.remove(this);
  }
};


window.addEventListener("load", function() {
  Game.initialize("game",sprites,startGame);
});
