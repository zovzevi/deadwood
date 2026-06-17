/*jshint esversion: 6 */

let player        = new Player('../img/player2.png', 16, 300, 51, 64, 3.4);
    player.setVars(0);
let gameIsRunning = false;
let paused        = false;
let game, rivalCycle, collectorCycle, buyCycle, eatCycle;
let glbuy    = 18;
let lifetime;
let runNum   = 1;  // счётчик забегов

let upgradeScreen = new UpgradeScreen();
window._particles = null;
window._audio     = null;
window._pauseToggle = null;

// Preload player frames
let _playerFrames = [];
(function(){for(let i=1;i<=8;i++){let img=new Image();img.src='../img/player/'+i+'.png';_playerFrames.push(img);}})();

// Preload enemy frames
let _enemyFrames = [];
(function(){for(let i=1;i<=5;i++){let img=new Image();img.src='../img/enemy/enemy'+i+'.png';_enemyFrames.push(img);}})();
window._enemyFrames = _enemyFrames;

function applyUpgrades(ups) { player.step = 3.4 + ups.speed * 0.3; }
function getInflateInterval(ups) { return 12000 + ups.inflateSlow * 2000; }
function getEatInterval(ups)     { return 11000 + ups.eatSlow * 1000; }

// ─── MAIN ────────────────────────────────────────────────────
function main() {
  gameIsRunning = true; paused = false;

  let screen    = document.getElementById('screen');
  let ctx       = screen.getContext('2d');
  let time      = new Date();
  let ms        = 20;
  let mapLength = 100;
  let buy       = glbuy;
  let ups       = upgradeScreen.upgrades;

  player.frames  = _playerFrames;

  let wood       = new Background();
  let ground     = new Ground('../img/grass.png', mapLength);
  let dwood      = new Resources(ground.relief);
  let scores     = new Interface();
  let torch      = new Fire('../img/fireInTheDark.png', 1400, 875);
  let rivals     = new LinkedList();
  let shop       = new Shop('../img/shop.png', 6000);
  let mshop      = new Shop('../img/shop.png', 3200);
  let lighting   = new Lighting();
  let particles  = new Particles();
  let weather    = new Weather();
  let minimap    = new Minimap(mapLength);
  let footprints = new Footprints();
  let woodInd    = new WoodIndicator();
  let audio      = new Audio();

  window._particles = particles;
  window._audio     = audio;

  applyUpgrades(ups);
  player.food = 10 + ups.startFood * 2;

  // разблокируем AudioContext после первого взаимодействия
  document.addEventListener('keydown', function unlock() {
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    document.removeEventListener('keydown', unlock);
  }, {once:true});

  window._pauseToggle = function() {
    if(!gameIsRunning||upgradeScreen.visible) return;
    paused=!paused; if(!paused) time=new Date();
  };

  screen.addEventListener('mousemove', function(e) {
    let rect=screen.getBoundingClientRect();
    upgradeScreen.onMouseMove((e.clientX-rect.left)*(640/rect.width),(e.clientY-rect.top)*(400/rect.height));
  });
  screen.addEventListener('click', function(e) {
    if(!upgradeScreen.visible) return;
    let rect=screen.getBoundingClientRect();
    upgradeScreen.onClick((e.clientX-rect.left)*(640/rect.width),(e.clientY-rect.top)*(400/rect.height));
  });

  if (ctx) { DWFuncs.movingManager(player,ground,dwood,ms,true); game=setInterval(render,25); }

  let stepSoundTimer = 0;

  function drawPause(ctx) {
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,640,400);
    ctx.font='bold 32px "Courier New",monospace'; ctx.fillStyle='#aaa';
    let t='PAUSED'; ctx.fillText(t,320-ctx.measureText(t).width/2,195);
    ctx.font='12px "Courier New",monospace'; ctx.fillStyle='#444';
    let s='ESC to resume'; ctx.fillText(s,320-ctx.measureText(s).width/2,225);
  }

  function render() {
    ctx.setTransform(2,0,0,2,0,0);
    if(upgradeScreen.visible){ctx.clearRect(0,0,640,400);upgradeScreen.draw(ctx);return;}
    if(paused){drawPause(ctx);return;}

    ms=new Date()-time; time=new Date();

    DWFuncs.movingManager(player,ground,dwood,ms);
    player.gravity(ground.relief,ms);
    if(player.backZone>5760) stop();

    particles.update(ms);
    lighting.update(ms);
    weather.update(ms);
    footprints.update(player,ms);

    // звук шагов
    stepSoundTimer+=ms;
    if(!player.stop&&!player.jumping&&stepSoundTimer>320){
      stepSoundTimer=0; audio.step();
    }

    ctx.clearRect(0,0,640,400);
    wood.draw(ctx,player);
    weather.draw(ctx);
    ground.draw(ctx,player.backZone);
    let playerWX=player.x+player.backZone;
    shop.draw(ctx,player.backZone,playerWX,player.point,glbuy);
    mshop.draw(ctx,player.backZone,playerWX,player.point,glbuy);
    dwood.draw(ctx,player.backZone);
    footprints.draw(ctx,player.backZone);
    DWFuncs.rivalForeach(rivals.first,ctx,player.backZone,ground.relief,dwood,ms);
    woodInd.draw(ctx,player,dwood);
    player.draw(ctx);
    torch.draw(ctx,player.x+(player.dir==1?20:-20),player.y-40);
    if(weather.type==='rain') weather.draw(ctx);
    particles.draw(ctx,player.backZone);
    lighting.draw(ctx,player.x+(player.dir==1?20:-20),player.y-55);
    scores.draw(ctx,playerWX,player.food,player.point,buy,ms,runNum);
    minimap.draw(ctx,playerWX,rivals,dwood);

    if(player.food<=0){
      let lived=new Date()-lifetime;
      DWFuncs.diedWindow(ctx,lived);
      audio.die();
      for(var i=0;i<dwood.location.length;i++) dwood.location[i]=0;
      stop();
    }

    // магазин — звук при входе в зону
    if(playerWX>3200&&playerWX<3264){
      let gained=Math.floor(player.point/glbuy);
      if(gained>0) audio.shop();
      player.food+=gained;
      player.point=player.point%glbuy;
    }
  }

  collectorCycle = setInterval(DWFuncs.collector, 20000, rivals);
  rivalCycle     = setInterval(DWFuncs.newRival, Math.max(5000, 10000-runNum*500), rivals, player, dwood.location, mapLength, runNum);
  buyCycle       = setInterval(function(){let up=Math.floor(glbuy/10);glbuy+=up;buy+=up;}, getInflateInterval(ups));
  eatCycle       = setInterval(function(){player.food-=1;}, getEatInterval(ups));
}

// ─── стартовый экран ─────────────────────────────────────────
function drawStartScreen() {
  let screen=document.getElementById('screen');
  let ctx=screen.getContext('2d');
  ctx.setTransform(2,0,0,2,0,0);
  ctx.fillStyle='#060606'; ctx.fillRect(0,0,640,400);
  let vignette=ctx.createRadialGradient(320,200,80,320,200,360);
  vignette.addColorStop(0,'rgba(0,0,0,0)'); vignette.addColorStop(1,'rgba(0,0,0,0.85)');
  ctx.fillStyle=vignette; ctx.fillRect(0,0,640,400);
  ctx.fillStyle='rgba(255,255,255,0.018)';
  for(let y=0;y<400;y+=4) ctx.fillRect(0,y,640,1);
  ctx.font='bold 58px "Courier New",monospace'; ctx.fillStyle='#ffffff'; ctx.globalAlpha=0.9;
  let title='DEADWOOD'; ctx.fillText(title,320-ctx.measureText(title).width/2,160);
  ctx.globalAlpha=1;
  ctx.font='12px "Courier New",monospace'; ctx.fillStyle='#555';
  let sub='a survival platformer'; ctx.fillText(sub,320-ctx.measureText(sub).width/2,182);
  ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(220,198,200,1);
  let hints=[['A / D','move'],['SHIFT','jump'],['S','collect / eat berries'],['ESC','pause']];
  ctx.font='11px "Courier New",monospace'; let hintY=222;
  hints.forEach(([key,action])=>{
    ctx.fillStyle='#777'; ctx.fillText(key,235,hintY);
    ctx.fillStyle='#3a3a3a'; ctx.fillText('—',288,hintY);
    ctx.fillStyle='#4a4a4a'; ctx.fillText(action,303,hintY);
    hintY+=16;
  });
  Records.drawOnCanvas(ctx);
  ctx.font='10px "Courier New",monospace'; ctx.fillStyle='#333';
  let ps='▼  press start  ▼'; ctx.fillText(ps,320-ctx.measureText(ps).width/2,360);
}
window.addEventListener('load', function() {
  drawStartScreen();
  let bgm = new window.Audio('../audio/darkwood.mp3');
  bgm.loop = true;
  bgm.volume = 0.22;
  document.addEventListener('keydown', function startBgm() {
    bgm.play().catch(()=>{});
    document.removeEventListener('keydown', startBgm);
  }, {once: true});
  window._bgm = bgm;
});

// ─── отдельный цикл для экрана апгрейдов ─────────────────────
function _runUpgradeLoop() {
  let screen=document.getElementById('screen');
  let ctx=screen.getContext('2d');
  let loop=setInterval(function(){
    if(!upgradeScreen.visible){clearInterval(loop);return;}
    ctx.setTransform(2,0,0,2,0,0);
    ctx.clearRect(0,0,640,400); upgradeScreen.draw(ctx);
  },25);
}

function start() { if(!gameIsRunning) restart(); }

function stop() {
  gameIsRunning=false; paused=false;
  clearInterval(game); clearInterval(rivalCycle);
  clearInterval(collectorCycle); clearInterval(buyCycle); clearInterval(eatCycle);

  let lived=new Date()-lifetime;
  let score=player.point;
  Records.update(score,lived);

  player.x=16; player.backZone=0;
  let nextRunNum=runNum+1;

  if(player.food>0){
    player.food+=Math.floor(player.point/glbuy);
    player.point=player.point%glbuy;
    if(window._audio) window._audio.levelUp();
    setTimeout(()=>{
      upgradeScreen.show(score,lived,nextRunNum,function(chosen){
        runNum=nextRunNum; glbuy=18;
        player.x=16; player.backZone=0;
        lifetime=new Date(); main();
      });
      _runUpgradeLoop();
    },800);
  } else {
    setTimeout(()=>{
      upgradeScreen.show(score,lived,nextRunNum,function(chosen){
        runNum=nextRunNum; glbuy=18;
        player.x=16; player.backZone=0;
        player.food=10; player.point=0;
        lifetime=new Date(); main();
      });
      _runUpgradeLoop();
    },1800);
  }
}

function restart() {
  player.x=16; player.backZone=0; player.food=10; player.point=0;
  glbuy=18; runNum=1;
  upgradeScreen.upgrades={startFood:0,speed:0,collectTime:0,inflateSlow:0,eatSlow:0};
  lifetime=new Date(); main();
}
