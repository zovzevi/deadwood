/*jshint esversion: 6 */

// ═══════════════════════════════════════════════════════════════
//  ENTITY
// ═══════════════════════════════════════════════════════════════
class Entity {
  constructor(image, x, y, w, h, step = 2.3, radiusView = 8) {
    this.entityImg = new Image();
    this.entityImg.src = image;
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.g = 0; this.jumping = false; this.step = step;
    this.dir = 1; this.stop = true;
    this.name = "ent" + Entity.count;
    this.goTo = -1; this.radiusView = radiusView;
    this.collecting = false; this.died = false;
    this.diedTimer = 0;   // для анимации смерти
    Entity.count += 1;
  }
  draw(ctx, backZonePlayer) {
    let dx = this.x - this.w/2 - backZonePlayer;
    let dy = this.y - this.h;
    if (this.frames && this.frames.length > 0) {
      let img;
      if (this.died) {
        img = this.frames[this.frames.length - 1];
      } else if (this.stop) {
        img = this.frames[0];
      } else {
        let walkFrames = this.frames.length - 1;
        img = this.frames[1 + Math.floor(this.x / 22) % walkFrames];
      }
      if (!img || !img.complete) return;
      ctx.save();
      if (this.died) ctx.globalAlpha = Math.max(0, 1 - this.diedTimer/3000);
      if (this.dir === -1) {
        ctx.translate(dx + this.w/2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -this.w/2, dy, this.w, this.h);
      } else {
        ctx.drawImage(img, dx, dy, this.w, this.h);
      }
      ctx.restore();
    } else {
      ctx.beginPath();
      if (!this.died) {
        if (this.stop)
          ctx.drawImage(this.entityImg, 0, 100*(this.dir==1?0:1), 80, 100, dx, dy, 51, 64);
        else {
          let cadr = Math.floor(this.x/20);
          ctx.drawImage(this.entityImg, 80*(cadr%4), 100*(this.dir==1?0:1), 80, 100, dx, dy, 51, 64);
        }
      } else {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - this.diedTimer/3000);
        ctx.drawImage(this.entityImg, 0, 200, 80, 100, dx, dy, 51, 64);
        ctx.restore();
      }
      ctx.stroke();
    }
  }
  gravity(relief, ms) {
    let h = relief[Math.floor(this.x/64)];
    if (this.y != h) {
      this.jumping = true;
      this.g += Math.floor(1*ms/25);
      let dy = Math.floor(this.g*ms/25);
      if (this.y < h) this.y += dy;
      if (this.y > h) { this.y = h; this.g = 0; }
    } else { this.jumping = false; }
  }
  jump() { this.y--; this.g = -11; this.jumping = true; }
}
Entity.count = -1;

// ═══════════════════════════════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════════════════════════════
class Player extends Entity {
  setVars(point) {
    this.point = point; this.load = 0;
    this.backZone = 0; this.food = 10;
    delete this.goTo; delete this.radiusView;
  }
  draw(ctx) {
    let dx = this.x - this.w/2;
    let dy = this.y - this.h;
    if (this.frames && this.frames.length > 0) {
      let img;
      if (this.stop) {
        img = this.frames[0];
      } else {
        let walkFrames = this.frames.length - 1;
        img = this.frames[1 + Math.floor((this.x + this.backZone) / 22) % walkFrames];
      }
      if (img && img.complete) {
        ctx.save();
        if (this.dir === -1) {
          ctx.translate(dx + this.w/2, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, -this.w/2, dy, this.w, this.h);
        } else {
          ctx.drawImage(img, dx, dy, this.w, this.h);
        }
        ctx.restore();
      }
    } else {
      ctx.beginPath();
      if (this.stop)
        ctx.drawImage(this.entityImg, 0, 100*(this.dir==1?0:1), 80, 100, dx, dy, 51, 64);
      else {
        let cadr = Math.floor((this.x+this.backZone)/20);
        ctx.drawImage(this.entityImg, 80*(cadr%4), 100*(this.dir==1?0:1), 80, 100, dx, dy, 51, 64);
      }
      ctx.stroke();
    }
    if (this.load != 0) this.drawColl(ctx);
  }
  woodCollection() { this.point += Math.round(Math.random()*9+1); }
  drawColl(ctx) {
    let state = this.load;
    ctx.fillStyle = 'white';
    ctx.fillRect(this.x-16, this.y-74, 2*state, 2);
    state = 16-state;
    if (state != 0) { ctx.fillStyle='gray'; ctx.fillRect(this.x+16, this.y-74, -2*state, 2); }
  }
  moving(relief, ms) {
    let dx = this.dir * Math.floor(this.step*(ms/25));
    if (relief[Math.floor(((this.x+this.backZone)+this.dir*(this.step+6))/64)] >= this.y)
      this.x += dx;
    if (this.x < 0) this.x = 0;
    if (this.x > 320) { this.backZone += this.x-320; this.x = 320; }
  }
  gravity(relief, ms) {
    let h = relief[Math.floor((this.x+this.backZone)/64)];
    if (this.y != h) {
      this.jumping = true;
      this.g += Math.floor(1*ms/25);
      let dy = Math.floor(this.g*ms/25);
      if (this.y < h) this.y += dy;
      if (this.y > h) { this.y = h; this.g = 0; }
    } else { this.jumping = false; }
  }
}

// ═══════════════════════════════════════════════════════════════
//  RIVAL
// ═══════════════════════════════════════════════════════════════
class Rival extends Entity {
  AI(obj, relief, dwood, ms) {
    // анимация смерти — ждём пока исчезнет
    if (this.died) { this.diedTimer += ms; return; }
    if (this.goTo == -1) {
      if (!this.died) this.searchDwood(dwood);
      if (this.goTo == -1 && !this.died) this.dying(obj);
    } else {
      if (Math.abs(this.x-this.goTo) > 3) { this.stop=false; this.moving(relief,ms); }
      else if (!this.collecting && dwood.isWood(this.x)) { this.stop=true; this.collecting=true; this.woodCollection(obj,dwood); }
      else this.goTo = -1;
    }
  }
  searchDwood(dwood) {
    if (dwood.isWood(this.x)) this.goTo = this.x;
    else {
      for (let i=1; i<=this.radiusView; i++) {
        let l=-32*i+this.x, r=32*i+this.x;
        if (dwood.isWood(r)) { this.goTo=r; break; }
        if (dwood.isWood(l)) { this.goTo=l; break; }
      }
    }
    if (this.goTo<8||this.goTo>6394) this.goTo=-1;
    if (this.goTo!=-1) this.dir = this.x<this.goTo?1:-1;
  }
  woodCollection(obj, dwood) {
    setTimeout(function(obj,dwood){ dwood.collection(obj.x); obj.collecting=false; obj.goTo=-1; }, 1000, obj, dwood);
  }
  moving(relief, ms) {
    let dx = this.dir*Math.floor(this.step*(ms/25));
    if (relief[Math.floor((this.x+this.dir*(this.step+6))/64)] >= this.y) this.x += dx;
    else if (!this.jumping) this.jump();
    if (this.x<0) this.x=0;
  }
  dying(obj) { this.died=true; this.diedTimer=0; }
}

// ═══════════════════════════════════════════════════════════════
//  RESOURCES
// ═══════════════════════════════════════════════════════════════
class Resources {
  constructor(relief) {
    this.resImg = new Image(); this.resImg.src = '../img/dwood.png';
    this.berryImg = new Image(); this.berryImg.src = '../img/berry.png';
    this.location = []; this.types = [];  // 0=empty 1=wood 2=berries
    let length = relief.length*2;
    for (var i=0; i<length; i++) {
      let roll = Math.random();
      if (roll > 0.5) {
        this.location[i] = relief[Math.floor(i/2)]-36;
        this.types[i] = Math.random() > 0.85 ? 2 : 1;  // 15% ягоды
      } else {
        this.location[i] = 0; this.types[i] = 0;
      }
    }
  }
  draw(ctx, backZone) {
    let l=Math.floor(backZone/32), r=Math.min(l+21,this.location.length);
    for (var i=l; i<r; i++) {
      if (this.location[i]!=0) {
        ctx.beginPath();
        if (this.types[i]===2) {
          if (this.berryImg.complete && this.berryImg.naturalWidth > 0) {
            ctx.drawImage(this.berryImg, i*32-backZone+3, this.location[i]+8, 26, 26);
          } else {
            ctx.fillStyle='rgba(180,40,40,0.9)';
            ctx.arc(i*32-backZone+12, this.location[i]+10, 5, 0, Math.PI*2);
            ctx.fill();
          }
        } else {
          ctx.drawImage(this.resImg, i*32-backZone-2, this.location[i], 34, 34);
        }
        ctx.stroke();
      }
    }
  }
  collection(x) { this.location[Math.floor(x/32)]=0; this.types[Math.floor(x/32)]=0; }
  isWood(x) { let a=Math.floor(x/32); if(a<0||a>this.location.length) return false; return this.location[a]!=0; }
  isBerry(x) { let a=Math.floor(x/32); if(a<0||a>this.location.length) return false; return this.types[a]===2; }
}

// ═══════════════════════════════════════════════════════════════
//  BACKGROUND
// ═══════════════════════════════════════════════════════════════
class Background {
  constructor() {
    this.woodImg=new Image(); this.woodImg.src='../img/front.png';
    this.back=new Image(); this.back.src='../img/back.png';
  }
  _drawParallax(ctx, img, worldX, speed, blendMode) {
    let iW = img.naturalWidth || 640;
    let iH = img.naturalHeight || 400;
    let scaledW = Math.round(iW * (400 / iH));
    let scroll = (worldX / speed) % scaledW;
    if (scroll < 0) scroll += scaledW;
    let startX = -scroll;
    if (blendMode) ctx.globalCompositeOperation = blendMode;
    for (let ox = startX; ox < 640; ox += scaledW) {
      ctx.drawImage(img, ox, 0, scaledW, 400);
    }
    if (blendMode) ctx.globalCompositeOperation = 'source-over';
  }
  draw(ctx, player) {
    ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,640,400);
    let x = player.x + player.backZone;
    this._drawParallax(ctx, this.back, x, 4);
    this._drawParallax(ctx, this.woodImg, x, 2, 'screen');
  }
}

// ═══════════════════════════════════════════════════════════════
//  GROUND
// ═══════════════════════════════════════════════════════════════
class Ground {
  constructor(image, length) {
    this.relief=[]; this.grassImg=new Image(); this.grassImg.src=image;
    this.soilImg=new Image(); this.soilImg.src='../img/soil.png';
    for (var i=0; i<length; i++)
      this.relief[i]=400-(Math.floor(Math.random()*(3-1))+1)*32;
    [50,51,52,93,94,95,96].forEach(i=>this.relief[i]=336);
  }
  draw(ctx, backZone) {
    let l=Math.floor(backZone/64), r=Math.min(l+12,this.relief.length);

    const buildPath = () => {
      ctx.beginPath();
      ctx.moveTo(l*64-backZone, 400);
      for (let i=l; i<r; i++) {
        ctx.lineTo(i*64-backZone, this.relief[i]);
        ctx.lineTo((i+1)*64-backZone, this.relief[i]);
      }
      ctx.lineTo(r*64-backZone, 400);
      ctx.closePath();
    };

    // Base fill
    buildPath();
    let earthGrad=ctx.createLinearGradient(0,310,0,400);
    earthGrad.addColorStop(0,'#3d2b15');
    earthGrad.addColorStop(0.5,'#261a09');
    earthGrad.addColorStop(1,'#110805');
    ctx.fillStyle=earthGrad; ctx.fill();

    // Soil texture + top edge shadow, clipped to terrain
    ctx.save();
    buildPath(); ctx.clip();
    let minY=Math.min(...this.relief.slice(l,Math.min(r,this.relief.length)));
    if(this.soilImg.complete&&this.soilImg.naturalWidth>0){
      let sW=this.soilImg.naturalWidth, sH=this.soilImg.naturalHeight;
      let ts=96;
      ctx.globalAlpha=0.18;
      for(let ty=minY;ty<400;ty+=ts)
        for(let tx=l*64-backZone;tx<(r+1)*64-backZone;tx+=ts)
          ctx.drawImage(this.soilImg,0,0,sW,sH,tx,ty,ts,ts);
      ctx.globalAlpha=1;
    }
    let edgeGrad=ctx.createLinearGradient(0,minY,0,minY+32);
    edgeGrad.addColorStop(0,'rgba(0,0,0,0.45)');
    edgeGrad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=edgeGrad;
    ctx.fillRect(l*64-backZone,minY,(r-l+1)*64,32);
    ctx.restore();

    // Grass strip on top surface
    let iW=this.grassImg.naturalWidth||2176, iH=this.grassImg.naturalHeight||189;
    let grassH=30;
    for (let i=l; i<r; i++) {
      let gy=this.relief[i]-12;
      let srcX=(i*64)%iW, srcW=Math.min(64,iW-srcX);
      ctx.drawImage(this.grassImg, srcX,0,srcW,iH, i*64-backZone,gy,srcW,grassH);
      if (srcW<64) ctx.drawImage(this.grassImg, 0,0,64-srcW,iH, i*64-backZone+srcW,gy,64-srcW,grassH);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  SHOP
// ═══════════════════════════════════════════════════════════════
class Shop {
  constructor(image, x) {
    this.img=new Image(); this.img.src=image; this.x=x; this.y=144;
    this.glowPhase=Math.random()*Math.PI*2;
  }
  draw(ctx, backZone, playerWorldX, playerWood, glbuy) {
    ctx.beginPath(); ctx.drawImage(this.img,this.x-backZone,this.y); ctx.stroke();
    let dist=Math.abs(playerWorldX-this.x);
    if (dist < 200) {
      this.glowPhase+=0.08;
      let intensity=(Math.sin(this.glowPhase)*0.5+0.5)*(1-dist/200)*0.5;
      let gx=this.x-backZone+64, gy=this.y+60;
      let g=ctx.createRadialGradient(gx,gy,0,gx,gy,80);
      g.addColorStop(0,`rgba(255,200,50,${intensity})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(gx-80,gy-80,160,160);
      // подсказка — сколько еды получишь
      if (dist < 120 && playerWood > 0 && glbuy > 0) {
        let foodGain = Math.floor(playerWood/glbuy);
        if (foodGain > 0) {
          ctx.font='bold 11px "Courier New",monospace';
          ctx.fillStyle='rgba(255,220,80,0.85)';
          let hint=`+${foodGain} 🍖`;
          ctx.fillText(hint, this.x-backZone+64-ctx.measureText(hint).width/2, this.y-8);
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  INTERFACE — HUD
// ═══════════════════════════════════════════════════════════════
class Interface {
  constructor() {
    this.icoFood=new Image(); this.icoFood.src='../img/icons/icon_food.png';
    this.icoWood=new Image(); this.icoWood.src='../img/icons/icon_axe.png';
    this.icoCost=new Image(); this.icoCost.src='../img/icons/icon_price.png';
  }
  _plank(ctx, cx, y, w, h) {
    let x=cx-w/2;
    ctx.save();
    // shadow
    ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=8; ctx.shadowOffsetY=3;
    // wood fill
    let bg=ctx.createLinearGradient(x,y,x,y+h);
    bg.addColorStop(0,'#2a1c0a'); bg.addColorStop(0.5,'#1e1407'); bg.addColorStop(1,'#120d04');
    ctx.fillStyle=bg;
    ctx.beginPath(); ctx.roundRect(x,y,w,h,4); ctx.fill();
    ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    // grain
    ctx.save(); ctx.beginPath(); ctx.roundRect(x,y,w,h,4); ctx.clip();
    ctx.strokeStyle='rgba(255,190,80,0.04)'; ctx.lineWidth=1;
    for(let gy=y+5;gy<y+h;gy+=7){ ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x+w,gy+1);ctx.stroke(); }
    ctx.restore();
    // border
    ctx.strokeStyle='rgba(180,120,40,0.3)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(x,y,w,h,4); ctx.stroke();
    // top shine
    ctx.strokeStyle='rgba(255,210,100,0.1)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x+4,y+1); ctx.lineTo(x+w-4,y+1); ctx.stroke();
    ctx.restore();
  }
  _section(ctx, cx, y, ico, label, value, valueColor) {
    this._plank(ctx, cx, y, 116, 44);
    let x=cx-58;
    // icon
    if(ico&&ico.complete&&ico.naturalWidth>0)
      ctx.drawImage(ico, x+6, y+6, 28, 28);
    else {
      ctx.fillStyle='rgba(200,160,80,0.3)';
      ctx.fillRect(x+6,y+6,28,28);
    }
    // label
    ctx.font='bold 8px "Courier New",monospace';
    ctx.fillStyle='rgba(200,160,70,0.4)';
    ctx.fillText(label, x+42, y+16);
    // value
    ctx.font='bold 18px "Courier New",monospace';
    ctx.fillStyle=valueColor;
    ctx.fillText(String(value), x+42, y+36);
  }
  draw(ctx, x, food, wood, buy, ms, runNum) {
    // тонкая тёмная полоса вверху
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,640,54);
    ctx.fillStyle='rgba(180,120,40,0.12)'; ctx.fillRect(0,53,640,1);

    let foodColor=food>5?'#7ecb7e':food>2?'#f0c060':'#e05555';
    this._section(ctx,  88, 5, this.icoFood, 'ЕДА',    food, foodColor);
    this._section(ctx, 320, 5, this.icoWood, 'ДЕРЕВО', wood, '#c8a96e');
    this._section(ctx, 552, 5, this.icoCost, 'ЦЕНА',   buy,  '#a0a0cc');

    if(runNum>1){
      ctx.font='8px "Courier New",monospace';
      ctx.fillStyle='rgba(180,120,40,0.25)';
      let rt=`забег ${runNum}`; ctx.fillText(rt,320-ctx.measureText(rt).width/2,62);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  FIRE
// ═══════════════════════════════════════════════════════════════
class Fire {
  constructor(image, w, h) { this.w=w; this.h=h; this.image=new Image(); this.image.src=image; }
  draw(ctx, x, y) { ctx.beginPath(); ctx.drawImage(this.image,x-this.w/2,y-this.h/2); ctx.stroke(); }
}

// ═══════════════════════════════════════════════════════════════
//  LIGHTING
// ═══════════════════════════════════════════════════════════════
class Lighting {
  constructor() { this.flicker=0; this.flickerDir=1; this.flickerSpeed=0.08; }
  update(ms) {
    this.flicker+=this.flickerDir*this.flickerSpeed*(ms/25);
    if(this.flicker>1){this.flicker=1;this.flickerDir=-1;}
    if(this.flicker<0){this.flicker=0;this.flickerDir=1;}
    if(Math.random()<0.04) this.flickerDir*=-1;
  }
  draw(ctx, torchX, torchY) {
    let baseRadius=290+this.flicker*20;
    let grad=ctx.createRadialGradient(torchX,torchY,0,torchX,torchY,baseRadius);
    grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(0.45,'rgba(0,0,0,0.05)');
    grad.addColorStop(0.72,'rgba(0,0,0,0.38)'); grad.addColorStop(0.88,'rgba(0,0,0,0.68)');
    grad.addColorStop(1,'rgba(0,0,0,0.88)');
    ctx.fillStyle=grad; ctx.fillRect(0,0,640,400);
    ctx.fillStyle='rgba(0,0,0,0.88)';
    ctx.beginPath(); ctx.rect(0,0,640,400);
    ctx.arc(torchX,torchY,baseRadius,0,Math.PI*2,true); ctx.fill('evenodd');
    ctx.save(); ctx.globalCompositeOperation='lighter';
    let glow=ctx.createRadialGradient(torchX,torchY,0,torchX,torchY,110);
    let alpha=0.13+this.flicker*0.07;
    glow.addColorStop(0,`rgba(255,160,40,${alpha})`);
    glow.addColorStop(0.6,`rgba(255,90,10,${alpha*0.35})`);
    glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(torchX,torchY,110,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════════════
class Particles {
  constructor() { this.list=[]; }
  spawn(px, py, type, count=6) {
    for (let i=0; i<count; i++) {
      let angle=Math.random()*Math.PI*2;
      let speed=type==='wood'?1.5+Math.random()*2.5:2+Math.random()*3.5;
      this.list.push({
        x:px,y:py,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-(type==='wood'?2:3),
        life:1,decay:type==='wood'?0.025+Math.random()*0.02:0.04+Math.random()*0.03,
        size:type==='wood'?2+Math.random()*2:1.5,type,
        color:type==='wood'?`hsl(${28+Math.random()*20},60%,${30+Math.random()*20}%)`:
          type==='berry'?`hsl(${0+Math.random()*20},80%,${45+Math.random()*20}%)`:
          `hsl(${30+Math.random()*30},100%,${60+Math.random()*30}%)`,
      });
    }
  }
  update(ms) {
    let dt=ms/25; this.list=this.list.filter(p=>p.life>0);
    for (let p of this.list) { p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=0.18*dt; p.life-=p.decay*dt; }
  }
  draw(ctx, backZone) {
    for (let p of this.list) {
      ctx.save(); ctx.globalAlpha=Math.max(0,p.life); ctx.fillStyle=p.color;
      if(p.type==='spark') ctx.globalCompositeOperation='lighter';
      ctx.fillRect(p.x-backZone-p.size/2,p.y-p.size/2,p.size,p.size); ctx.restore();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  WEATHER
// ═══════════════════════════════════════════════════════════════
class Weather {
  constructor() {
    this.type='none'; this.drops=[]; this.fogAlpha=0; this.fogTarget=0;
    this.timer=0; this.interval=18000+Math.random()*12000; this._initDrops();
  }
  _initDrops() {
    this.drops=[];
    for(let i=0;i<120;i++) this.drops.push({x:Math.random()*640,y:Math.random()*400,len:8+Math.random()*10,speed:6+Math.random()*5,alpha:0.2+Math.random()*0.3});
  }
  update(ms) {
    this.timer+=ms;
    if(this.timer>=this.interval){
      this.timer=0; this.interval=18000+Math.random()*12000;
      let roll=Math.random();
      if(roll<0.35) this.type='rain';
      else if(roll<0.55) this.type='fog';
      else this.type='none';
      this.fogTarget=this.type==='fog'?0.18+Math.random()*0.12:0;
    }
    this.fogAlpha+=(this.fogTarget-this.fogAlpha)*0.02*(ms/25);
    if(this.type==='rain') {
      for(let d of this.drops){
        d.y+=d.speed*(ms/25); d.x-=0.5*(ms/25);
        if(d.y>400){d.y=-10;d.x=Math.random()*640;}
        if(d.x<0) d.x=640;
      }
    }
  }
  draw(ctx) {
    if(this.fogAlpha>0.005){ctx.fillStyle=`rgba(180,190,200,${this.fogAlpha})`;ctx.fillRect(0,48,640,352);}
    if(this.type==='rain'){
      ctx.save(); ctx.strokeStyle='rgba(180,210,255,0.35)'; ctx.lineWidth=0.8;
      for(let d of this.drops){ctx.globalAlpha=d.alpha;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-2,d.y+d.len);ctx.stroke();}
      ctx.restore();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  MINIMAP
// ═══════════════════════════════════════════════════════════════
class Minimap {
  constructor(mapLength) { this.worldWidth=mapLength*64; this.shops=[3200,6000]; }
  draw(ctx, playerWorldX, rivals, dwood) {
    let CW = 640;
    let W=Math.floor(CW*0.31), H=10, X=Math.floor(CW*0.34), Y=Math.floor(400*0.965);
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(X-2,Y-2,W+4,H+4);
    ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(X,Y,W,H);
    let toMap=wx=>X+(wx/this.worldWidth)*W;
    for(let sx of this.shops){ctx.fillStyle='rgba(255,200,50,0.7)';ctx.fillRect(toMap(sx)-1,Y,2,H);}
    ctx.fillStyle='rgba(160,120,60,0.5)';
    for(let i=0;i<dwood.location.length;i++) if(dwood.location[i]!==0) ctx.fillRect(toMap(i*32),Y+3,1,H-6);
    if(rivals&&rivals.first){let node=rivals.first;while(node){if(!node.data.died){ctx.fillStyle='rgba(220,60,60,0.8)';ctx.fillRect(toMap(node.data.x)-1,Y+1,2,H-2);}node=node.next;}}
    ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.fillRect(toMap(playerWorldX)-2,Y,3,H);
    ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1; ctx.strokeRect(X,Y,W,H);
    ctx.font='8px "Courier New",monospace'; ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillText('MAP',X-26,Y+8);
  }
}

// ═══════════════════════════════════════════════════════════════
//  FOOTPRINTS
// ═══════════════════════════════════════════════════════════════
class Footprints {
  constructor() { this.list=[]; this.stepTimer=0; }
  update(player, ms) {
    this.stepTimer+=ms;
    if(!player.stop&&this.stepTimer>280){
      this.stepTimer=0;
      this.list.push({x:player.x+player.backZone,y:player.y+2,alpha:0.45,dir:player.dir});
      if(this.list.length>30) this.list.shift();
    }
    for(let f of this.list) f.alpha-=0.003*(ms/25);
    this.list=this.list.filter(f=>f.alpha>0);
  }
  draw(ctx, backZone) {
    for(let f of this.list){
      ctx.save(); ctx.globalAlpha=f.alpha; ctx.fillStyle='#3a2a1a';
      let sx=f.x-backZone; ctx.fillRect(sx-3,f.y,3,2); ctx.fillRect(sx+1,f.y,3,2); ctx.restore();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  WOOD INDICATOR
// ═══════════════════════════════════════════════════════════════
class WoodIndicator {
  constructor() { this.phase=0; }
  draw(ctx, player, dwood) {
    let wx=player.x+player.backZone;
    if(!dwood.isWood(wx)||player.collecting||player.jumping) return;
    this.phase+=0.12;
    let pulse=Math.sin(this.phase)*0.5+0.5;
    let area=Math.floor(wx/32);
    let drawX=area*32-player.backZone, drawY=dwood.location[area];
    let isBerry=dwood.types[area]===2;
    ctx.save();
    ctx.globalAlpha=0.3+pulse*0.4;
    ctx.strokeStyle=isBerry?'rgba(255,80,80,1)':'rgba(255,220,80,1)';
    ctx.lineWidth=1.5; ctx.strokeRect(drawX+1,drawY+1,28,22);
    ctx.font='bold 9px "Courier New",monospace';
    ctx.fillStyle=isBerry?`rgba(255,100,100,${0.5+pulse*0.5})`:`rgba(255,220,80,${0.5+pulse*0.5})`;
    ctx.fillText('[S]',drawX+8,drawY-3);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════
//  RECORDS
// ═══════════════════════════════════════════════════════════════
class Records {
  static load() { try{return JSON.parse(localStorage.getItem('dw_records')||'{}');}catch(e){return {};} }
  static save(rec) { try{localStorage.setItem('dw_records',JSON.stringify(rec));}catch(e){} }
  static update(score, timeMs) {
    let r=Records.load();
    r.bestScore=Math.max(r.bestScore||0,score);
    r.bestTime=Math.max(r.bestTime||0,timeMs);
    r.attempts=(r.attempts||0)+1;
    Records.save(r); return r;
  }
  static drawOnCanvas(ctx) {
    let r=Records.load(); if(!r.attempts) return;
    ctx.font='9px "Courier New",monospace'; ctx.fillStyle='#2a2a2a';
    let sec=Math.floor((r.bestTime||0)/1000),min=Math.floor(sec/60);
    let timeStr=min>0?`${min}m${sec%60}s`:`${sec}s`;
    let lines=[`best wood: ${r.bestScore||0}`,`best time: ${timeStr}`,`attempts:  ${r.attempts||0}`];
    lines.forEach((l,i)=>{ ctx.fillText(l,320-ctx.measureText(l).width/2,310+i*14); });
  }
}

// ═══════════════════════════════════════════════════════════════
//  AUDIO — синтетические звуки через Web Audio API
// ═══════════════════════════════════════════════════════════════
class Audio {
  constructor() {
    try {
      this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      this.enabled = true;
    } catch(e) { this.enabled=false; }
  }
  _play(freq, type, duration, vol=0.15, freqEnd) {
    if(!this.enabled) return;
    try {
      let o=this.ctx.createOscillator();
      let g=this.ctx.createGain();
      o.connect(g); g.connect(this.ctx.destination);
      o.type=type; o.frequency.setValueAtTime(freq,this.ctx.currentTime);
      if(freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd,this.ctx.currentTime+duration);
      g.gain.setValueAtTime(vol,this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+duration);
      o.start(); o.stop(this.ctx.currentTime+duration);
    } catch(e){}
  }
  chop()   { this._play(180,'sawtooth',0.08,0.12,80); }   // рубка дерева
  jump()   { this._play(220,'sine',0.15,0.08,440); }       // прыжок
  shop()   { this._play(440,'sine',0.2,0.1,880); this._play(660,'sine',0.3,0.08,880); }  // магазин
  berry()  { this._play(520,'sine',0.12,0.1,780); }        // ягоды
  die()    { this._play(220,'sawtooth',0.4,0.15,55); }     // смерть
  step()   { this._play(60,'sine',0.04,0.04); }            // шаг (тихий)
  levelUp(){ this._play(330,'sine',0.1,0.12,660); setTimeout(()=>this._play(440,'sine',0.15,0.12,880),100); setTimeout(()=>this._play(660,'sine',0.2,0.15,990),220); }
}

// ═══════════════════════════════════════════════════════════════
//  UPGRADE SCREEN
// ═══════════════════════════════════════════════════════════════
class UpgradeScreen {
  constructor() {
    this.visible=false; this.cards=[]; this.hovered=-1; this.onPick=null;
    this.runScore=0; this.runTime=0; this.runNum=1;
    this.upgrades={startFood:0,speed:0,collectTime:0,inflateSlow:0,eatSlow:0};
    this._icons={};
    const map={startFood:'food',speed:'speed',collectTime:'axe',inflateSlow:'price',eatSlow:'hunger'};
    for(let id in map){
      let img=new Image(); img.src='../img/icons/icon_'+map[id]+'.png';
      this._icons[id]=img;
    }
  }
  static ALL_UPGRADES() {
    return [
      {id:'startFood',  name:'Запас еды',    desc:'+2 еды на старт',       color:'#8ecf7e'},
      {id:'speed',      name:'Скорость',      desc:'Бег быстрее',           color:'#6ec6e8'},
      {id:'collectTime',name:'Острый топор',  desc:'Рубка быстрее',         color:'#c8a96e'},
      {id:'inflateSlow',name:'Заморозка цен', desc:'Инфляция медленнее',    color:'#a0a0cc'},
      {id:'eatSlow',    name:'Аскет',         desc:'Голод наступает позже', color:'#e8a06e'},
    ];
  }
  show(score, timeMs, runNum, callback) {
    this.visible=true; this.runScore=score; this.runTime=timeMs;
    this.runNum=runNum; this.onPick=callback; this.hovered=-1;
    let all=UpgradeScreen.ALL_UPGRADES();
    for(let i=all.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[all[i],all[j]]=[all[j],all[i]];}
    this.cards=all.slice(0,3);
  }
  hide() { this.visible=false; }
  onMouseMove(cx,cy) {
    if(!this.visible) return; this.hovered=-1;
    this.cards.forEach((c,i)=>{let r=this._cardRect(i);if(cx>=r.x&&cx<=r.x+r.w&&cy>=r.y&&cy<=r.y+r.h)this.hovered=i;});
  }
  onClick(cx,cy) {
    if(!this.visible) return false;
    for(let i=0;i<this.cards.length;i++){
      let r=this._cardRect(i);
      if(cx>=r.x&&cx<=r.x+r.w&&cy>=r.y&&cy<=r.y+r.h){
        this.upgrades[this.cards[i].id]++;
        this.hide(); if(this.onPick) this.onPick(this.cards[i]); return true;
      }
    }
    return false;
  }
  _cardRect(i){let cW=162,cH=148,gap=14,total=3*cW+2*gap,sX=(640-total)/2;return{x:sX+i*(cW+gap),y:210,w:cW,h:cH};}
  _woodCard(ctx,x,y,w,h,hov,color) {
    // shadow
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,0.7)'; ctx.shadowBlur=hov?20:10; ctx.shadowOffsetY=4;
    // base fill — dark wood
    this._roundRect(ctx,x,y,w,h,5);
    let bg=ctx.createLinearGradient(x,y,x,y+h);
    bg.addColorStop(0, hov?'#2e1e0e':'#221508');
    bg.addColorStop(0.5, hov?'#251a0b':'#1a1006');
    bg.addColorStop(1,'#0e0804');
    ctx.fillStyle=bg; ctx.fill();
    ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    // wood grain lines
    ctx.save(); this._roundRect(ctx,x,y,w,h,5); ctx.clip();
    ctx.strokeStyle='rgba(255,200,100,0.04)'; ctx.lineWidth=1;
    for(let gy=y+8;gy<y+h;gy+=12){
      ctx.beginPath(); ctx.moveTo(x,gy); ctx.lineTo(x+w,gy+2); ctx.stroke();
    }
    ctx.restore();
    // border
    this._roundRect(ctx,x,y,w,h,5);
    if(hov){
      ctx.strokeStyle=color; ctx.lineWidth=1.5;
      ctx.shadowColor=color; ctx.shadowBlur=12;
    } else {
      ctx.strokeStyle='rgba(180,120,50,0.25)'; ctx.lineWidth=1;
    }
    ctx.stroke(); ctx.shadowBlur=0;
    // top highlight line
    ctx.beginPath();
    ctx.moveTo(x+5,y+1); ctx.lineTo(x+w-5,y+1);
    ctx.strokeStyle='rgba(255,200,100,0.12)'; ctx.lineWidth=1; ctx.stroke();
    ctx.restore();
  }
  draw(ctx) {
    if(!this.visible) return;

    // background — очень тёмный с виньеткой
    ctx.fillStyle='rgba(4,2,6,0.96)'; ctx.fillRect(0,0,640,400);
    let vig=ctx.createRadialGradient(320,200,60,320,200,360);
    vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.7)');
    ctx.fillStyle=vig; ctx.fillRect(0,0,640,400);

    // декоративные линии по краям
    ctx.strokeStyle='rgba(180,120,40,0.15)'; ctx.lineWidth=1;
    ctx.strokeRect(14,14,612,372);
    ctx.strokeStyle='rgba(180,120,40,0.07)';
    ctx.strokeRect(18,18,604,364);

    // заголовок
    let hdr=this.runNum>1?`— ЗАБЕГ ${this.runNum} —`:'— ИТОГ ЗАБЕГА —';
    ctx.font='bold 10px "Courier New",monospace';
    ctx.fillStyle='rgba(180,120,40,0.5)';
    ctx.fillText(hdr,320-ctx.measureText(hdr).width/2,36);

    // статистика
    let sec=Math.floor(this.runTime/1000),min=Math.floor(sec/60);
    let timeStr=min>0?`${min}m ${sec%60}s`:`${sec}s`;
    ctx.font='bold 22px "Courier New",monospace';
    let grad=ctx.createLinearGradient(0,50,0,78);
    grad.addColorStop(0,'#e8d4a0'); grad.addColorStop(1,'#c8a96e');
    ctx.fillStyle=grad;
    let statStr=`${this.runScore} дерева  ·  ${timeStr}`;
    ctx.fillText(statStr,320-ctx.measureText(statStr).width/2,68);

    // разделитель
    ctx.fillStyle='rgba(180,120,40,0.2)'; ctx.fillRect(80,82,480,1);

    // подзаголовок карточек
    ctx.font='9px "Courier New",monospace';
    ctx.fillStyle='rgba(200,160,80,0.35)';
    let sub='ВЫБЕРИ УЛУЧШЕНИЕ'; ctx.fillText(sub,320-ctx.measureText(sub).width/2,100);

    // активные апгрейды (иконки маленькие)
    let acquired=UpgradeScreen.ALL_UPGRADES().filter(u=>this.upgrades[u.id]>0);
    if(acquired.length>0){
      let totalW=acquired.length*22+(acquired.length-1)*4;
      let sx=320-totalW/2;
      acquired.forEach((u,i)=>{
        let ico=this._icons[u.id];
        if(ico&&ico.complete&&ico.naturalWidth>0)
          ctx.drawImage(ico,sx+i*26,108,18,18);
        else {
          ctx.fillStyle=u.color; ctx.fillRect(sx+i*26,108,18,18);
        }
        if(this.upgrades[u.id]>1){
          ctx.font='7px "Courier New",monospace'; ctx.fillStyle=u.color;
          ctx.fillText('×'+this.upgrades[u.id],sx+i*26+13,124);
        }
      });
    }

    // карточки
    this.cards.forEach((card,i)=>{
      let r=this._cardRect(i), hov=this.hovered===i;
      this._woodCard(ctx,r.x,r.y,r.w,r.h,hov,card.color);

      // иконка
      let ico=this._icons[card.id];
      let icoSize=52, icoX=r.x+r.w/2-icoSize/2, icoY=r.y+14;
      if(ico&&ico.complete&&ico.naturalWidth>0){
        ctx.drawImage(ico,icoX,icoY,icoSize,icoSize);
      }

      // название
      ctx.font='bold 11px "Courier New",monospace';
      ctx.fillStyle=hov?card.color:'#c8b88a';
      let nm=card.name;
      ctx.fillText(nm,r.x+r.w/2-ctx.measureText(nm).width/2,r.y+82);

      // разделитель под именем
      ctx.fillStyle='rgba(180,120,40,0.2)';
      ctx.fillRect(r.x+16,r.y+88,r.w-32,1);

      // описание
      ctx.font='9px "Courier New",monospace';
      ctx.fillStyle=hov?'rgba(220,190,120,0.8)':'rgba(160,130,80,0.6)';
      let dc=card.desc;
      ctx.fillText(dc,r.x+r.w/2-ctx.measureText(dc).width/2,r.y+103);

      // уровень
      let lvl=this.upgrades[card.id];
      if(lvl>0){
        ctx.font='8px "Courier New",monospace';
        ctx.fillStyle=card.color;
        let lt=`LVL ${lvl}  →  ${lvl+1}`;
        ctx.fillText(lt,r.x+r.w/2-ctx.measureText(lt).width/2,r.y+134);
      } else if(hov) {
        ctx.font='8px "Courier New",monospace';
        ctx.fillStyle='rgba(180,140,60,0.4)';
        let nt='[ новое ]'; ctx.fillText(nt,r.x+r.w/2-ctx.measureText(nt).width/2,r.y+134);
      }
    });

    // подсказка внизу
    ctx.font='8px "Courier New",monospace';
    ctx.fillStyle='rgba(180,120,40,0.2)';
    let hint='нажми на карточку чтобы продолжить';
    ctx.fillText(hint,320-ctx.measureText(hint).width/2,386);
  }
  _roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
  }
}

// ═══════════════════════════════════════════════════════════════
//  DWFuncs
// ═══════════════════════════════════════════════════════════════
class DWFuncs {
  static collManager(player, dwood, particles, audio) {
    let position=Math.floor(player.x/32);
    let wx=player.x+player.backZone;
    if(dwood.isWood(wx)&&!player.jumping){
      let isBerry=dwood.isBerry(wx);
      player.collecting=true;
      let collectMs=isBerry?400:850;  // ягоды собираются быстрее
      let i=0, loading=setInterval(function(){i++;player.load=i;},50);
      if(audio) audio.chop();
      setTimeout(function(){
        if(dwood.isWood(player.x+player.backZone)&&position==Math.floor(player.x/32)&&!player.jumping){
          if(isBerry){
            // ягоды — прямо дают еду
            player.food+=2;
            if(particles) particles.spawn(player.x+player.backZone,player.y-20,'berry',6);
            if(audio) audio.berry();
          } else {
            player.woodCollection();
            if(particles) particles.spawn(player.x+player.backZone,player.y-20,'wood',8);
          }
          dwood.collection(player.x+player.backZone);
        }
        clearInterval(loading); player.load=0; player.collecting=false;
      }, collectMs);
    }
  }
  static movingManager(player, ground, dwood, ms, firstLaunch=false) {
    if(firstLaunch){
      addEventListener("keydown",function(e){
        if(player.stop){
          if(e.keyCode==68){player.dir=1;player.stop=false;}
          else if(e.keyCode==65){player.dir=-1;player.stop=false;}
        } else if(e.keyCode==16&&!player.jumping){
          player.jump();
          if(window._audio) window._audio.jump();
        }
        if(!player.collecting&&e.keyCode==83) DWFuncs.collManager(player,dwood,window._particles,window._audio);
        if(e.keyCode==27){if(window._pauseToggle)window._pauseToggle();}
      });
      addEventListener("keyup",function(e){if(e.keyCode==68||e.keyCode==65)player.stop=true;});
    }
    if(!player.stop) player.moving(ground.relief,ms);
  }
  static rivalForeach(node,ctx,backZonePlayer,relief,dwood,ms){
    function inside(node){
      if(node!=null){
        node.data.AI(node.data,relief,dwood,ms);
        node.data.gravity(relief,ms);
        node.data.draw(ctx,backZonePlayer);
        // удаляем только после 3сек анимации
        if(node.next!=null) inside(node.next);
      }
    }
    inside(node);
  }
  static collector(...list){
    for(let i=0;i<list.length;i++)
      list[i].removeAllByCond(b=>b.data.died==true&&b.data.diedTimer>3000);
  }
  static newRival(list,player,location,mapLength,runNum){
    let position=player.x+player.backZone+600;
    // с каждым забегом боты немного быстрее
    if(position<mapLength*64&&DWFuncs.checkRivalSpawn(location,Math.floor(position/32))){
      let speedBonus=Math.min((runNum-1)*0.15, 1.0);
      let rival=new Rival('../img/rival2.png',position,300,51,64);
      rival.step=2.3+speedBonus;
      if(window._enemyFrames&&window._enemyFrames.length>0) rival.frames=window._enemyFrames;
      list.add(rival);
    }
  }
  static checkRivalSpawn(location,chunk,visibility=7){
    let flag=false,from=Math.max(0,chunk-visibility),to=Math.min(location.length,chunk+visibility);
    for(from;from<to;from++){if(location[from]!=0){flag=true;break;}} return flag;
  }
  static diedWindow(ctx,ms){
    let W=640, H=400;
    ctx.fillStyle='rgba(10,0,0,0.92)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(180,30,30,0.6)'; ctx.fillRect(0,0,W,3);
    let sec=Math.floor(ms/1000),min=Math.floor(sec/60);
    let timeStr=min>0?`${min} min ${sec%60} sec`:`${sec} sec`;
    ctx.font='bold 42px "Courier New",monospace'; ctx.fillStyle='#cc2222';
    let t1='YOU DIED'; ctx.fillText(t1,W/2-ctx.measureText(t1).width/2,H*0.44);
    ctx.fillStyle='rgba(180,30,30,0.3)'; ctx.fillRect(W/2-120,H*0.47,240,1);
    ctx.font='14px "Courier New",monospace'; ctx.fillStyle='#666';
    ctx.fillText('survived',W/2-ctx.measureText('survived').width/2,H*0.54);
    ctx.font='bold 22px "Courier New",monospace'; ctx.fillStyle='#aaa';
    ctx.fillText(timeStr,W/2-ctx.measureText(timeStr).width/2,H*0.61);
    ctx.font='11px "Courier New",monospace'; ctx.fillStyle='#444';
    ctx.fillText('press START to try again',W/2-ctx.measureText('press START to try again').width/2,H*0.73);
  }
}
