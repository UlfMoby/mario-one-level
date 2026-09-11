'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const W=768,H=432,T=24,GROUND=360,END=211*T;
const keys=new Set();
let player,blocks,enemies,coins,particles,camera,score,lives,time,state='ready',last=0,acc=0,muted=true,audio;
const overlay=document.querySelector('#overlay');
function tone(freq=440,duration=.09,type='square'){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
const holes=[[69,71],[86,89],[153,155]];
function floorAt(x){return !holes.some(([a,b])=>x>=a*T&&x<b*T);}
function makeLevel(){const collected=coins?.collected??0;blocks=[];enemies=[];coins=[];coins.collected=collected;particles=[];
  function block(x,y,type='brick'){blocks.push({x:x*T,y:y*T,w:T,h:T,type,bump:0});}
  block(16,11,'question');for(let x=20;x<=24;x++)block(x,11,x%2?'question':'brick');block(22,7,'question');
  for(const [x,h]of [[28,2],[38,3],[46,4],[57,4],[163,2],[179,2]])blocks.push({x:x*T,y:GROUND-h*T,w:2*T,h:h*T,type:'pipe'});
  for(const x of [77,78,79])block(x,11,x===78?'question':'brick');for(let x=80;x<=87;x++)block(x,7);
  for(let x=91;x<=93;x++)block(x,7);block(94,7,'question');block(94,11);for(const x of [100,101])block(x,11);for(const x of [106,109,112])block(x,11,'question');block(109,7,'question');block(118,11);for(let x=121;x<=123;x++)block(x,7);for(let x=128;x<=131;x++)block(x,7,x===129||x===130?'question':'brick');for(const x of [129,130])block(x,11);
  function stair(start,n,reverse=false){for(let i=0;i<n;i++)for(let y=0;y<(reverse?n-i:i+1);y++)block(start+i,14-y,'stone');}
  stair(134,4);stair(140,4,true);stair(148,4);stair(155,4,true);for(let x=168;x<=171;x++)block(x,11,x===169?'question':'brick');stair(181,8);stair(189,1);
  for(const x of [22,40,51,53,80,82,97,99,107,111,124,127,169,173])enemies.push({x:x*T,y:GROUND-22,w:22,h:22,vx:-.65,vy:0,dead:0});
}
function spawn(){player={x:3*T,y:GROUND-26,w:19,h:26,vx:0,vy:0,grounded:false,coyote:0,jumpBuffer:0,facing:1,dead:false};camera=0;}
function reset(){makeLevel();spawn();score=0;coins.collected=0;lives=3;time=400;}
function show(title,text,label,button){overlay.hidden=false;document.querySelector('#overlay-title').textContent=title;document.querySelector('#overlay-text').textContent=text;document.querySelector('#overlay-label').textContent=label;document.querySelector('#play').innerHTML=button+' <span>→</span>';}
function start(){if(state==='paused'){state='playing';}else{reset();state='playing';}overlay.hidden=true;canvas.focus();tone(660);}
document.querySelector('#play').onclick=start;
document.querySelector('#restart').onclick=()=>{reset();state='playing';overlay.hidden=true;canvas.focus();};
document.querySelector('#sound').onclick=e=>{muted=!muted;e.currentTarget.textContent=muted?'SOUND OFF':'SOUND ON';e.currentTarget.setAttribute('aria-pressed',String(!muted));tone(600);};
function pause(){if(state==='playing'){state='paused';keys.clear();show('TAKE A BREATHER','Your adventure will be right here.','PAUSED','RESUME');}else if(state==='paused')start();}
const jumpKeys=['Space','ArrowUp','KeyW'];
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)&&e.target.tagName!=='BUTTON')e.preventDefault();if(e.repeat)return;if(e.code==='KeyP')pause();if(e.code==='Enter'&&state!=='playing')start();keys.add(e.code);if(jumpKeys.includes(e.code)&&player)player.jumpBuffer=8;});
addEventListener('keyup',e=>{keys.delete(e.code);if(jumpKeys.includes(e.code)&&player?.vy<-4)player.vy=-4;});
addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);if(b.dataset.key==='Space')player.jumpBuffer=8;};const release=()=>{keys.delete(b.dataset.key);if(b.dataset.key==='Space'&&player.vy<-4)player.vy=-4;};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;});
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function solids(a){const result=blocks.filter(b=>Math.abs(b.x-a.x)<250);const tile=Math.floor(a.x/T);for(let i=tile-2;i<tile+4;i++)if(i>=0&&floorAt(i*T))result.push({x:i*T,y:GROUND,w:T,h:72,type:'floor'});return result;}
function hitBlock(b){if(b.type==='question'){b.type='used';score+=200;coins.collected++;coins.push({x:b.x+12,y:b.y-8,vy:-5,life:32});tone(1000,.12);}if(b.type==='brick'||b.type==='used')b.bump=8;}
function move(a,isPlayer=false){a.x+=a.vx;for(const b of solids(a))if(overlap(a,b)){a.x=a.vx>0?b.x-a.w:b.x+b.w;a.vx=isPlayer?0:-a.vx;break;}a.vy=Math.min(a.vy+.42,10);a.y+=a.vy;a.grounded=false;for(const b of solids(a))if(overlap(a,b)){if(a.vy>=0){a.y=b.y-a.h;a.grounded=true;}else{a.y=b.y+b.h;if(isPlayer)hitBlock(b);}a.vy=0;break;}}
function die(){if(player.dead||state!=='playing')return;player.dead=true;player.vy=-8;player.vx=0;lives--;tone(160,.4);}
function tick(){if(state!=='playing')return;time-=1/60;if(time<=0)die();for(const b of blocks)b.bump=Math.max(0,b.bump-1);
  if(player.dead){player.vy+=.35;player.y+=player.vy;if(player.y>H+90){if(lives>0){makeLevel();spawn();time=400;}else{state='over';show('ONE MORE TRY?','Every great run starts with another jump.','GAME OVER · SCORE '+String(score).padStart(6,'0'),'PLAY AGAIN');}}return;}
  const direction=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),max=keys.has('ShiftLeft')||keys.has('ShiftRight')?4.1:2.7;
  player.vx=direction?Math.max(-max,Math.min(max,player.vx+direction*.35)):player.vx*.78;if(direction)player.facing=direction;
  player.coyote=player.grounded?6:Math.max(0,player.coyote-1);if(player.jumpBuffer>0)player.jumpBuffer--;if(player.jumpBuffer>0&&player.coyote>0){player.vy=-9.7;player.grounded=false;player.coyote=0;player.jumpBuffer=0;tone(420,.13);}
  const oldBottom=player.y+player.h;move(player,true);player.x=Math.max(0,player.x);if(player.y>H+10)die();
  for(const e of enemies){if(e.dead){e.dead--;continue;}if(e.x>camera+W+40||e.y>H)continue;move(e);if(overlap(player,e)){if(player.vy>0&&oldBottom<=e.y+10){e.dead=30;e.y+=12;e.h=10;player.vy=-6.3;score+=100;tone(240,.08);}else die();}}
  enemies=enemies.filter(e=>!(e.h===10&&e.dead===0));for(const c of coins){c.y+=c.vy;c.vy+=.3;c.life--;}coins=Object.assign(coins.filter(c=>c.life>0),{collected:coins.collected});
  camera=Math.max(0,Math.min(END-W,player.x-W*.36));
  if(player.x>198*T){state='won';score+=Math.max(0,Math.floor(time))*10;tone(880,.4);show('COURSE CLEAR!','You made it! Score '+String(score).padStart(6,'0')+' · Coins '+coins.collected,'WORLD 1—1 COMPLETE','PLAY AGAIN');}
  document.querySelector('#status').textContent=player.dead?'HERE WE GO AGAIN…':'KEEP GOING. THE FLAG IS WAITING.';
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function cloud(x,y){rect(x,y,64,17,'#fff9ef');rect(x+10,y-10,20,14,'#fff9ef');rect(x+28,y-16,20,20,'#fff9ef');rect(x+49,y-5,12,10,'#fff9ef');rect(x+8,y+17,48,3,'#c6d8fe');}
function hill(x,y,w,h){ctx.fillStyle='#229e37';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.3,y-h*.75);ctx.lineTo(x+w*.42,y-h);ctx.lineTo(x+w*.59,y-h);ctx.lineTo(x+w,y);ctx.fill();rect(x+w*.45,y-h+20,5,12,'#146c2c');rect(x+w*.65,y-h+40,5,9,'#146c2c');}
function brick(x,y,color='#c77335'){rect(x,y,24,24,'#3b2119');rect(x+1,y+1,22,10,color);rect(x+1,y+13,10,10,color);rect(x+13,y+13,10,10,color);rect(x+1,y+1,22,2,'#efad74');}
function text(s,x,y,size=16,align='left'){ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.fillStyle='#fff7e9';ctx.fillText(s,x,y);}
const sprite=[ '.....RRRRR......','....RRRRRRRRR...','....BBBSSBS.....','...BSBSSSBS SS..','...BSBBSSSBS SS.','....BSSSSBBBB...','.....SSSSSSS....','....RRBRRR......','...RRRBRRBRRR...','..RRRRBBBBRRRR..','..SSRBYYBYBRSS..','..SSSBBBBBBSSS..','....BBBBBBBB....','....BBB..BBB....','...BBB....BBB...','..BBBB....BBBB..'];
function mario(){ctx.save();ctx.translate(Math.round(player.x+player.w/2),Math.round(player.y));ctx.scale(player.facing,1);const palette={R:'#ed3b20',B:'#773417',S:'#ffb576',Y:'#ffd348'};const step=player.grounded&&Math.abs(player.vx)>.4?Math.sin(performance.now()/70)*1.5:0;for(let y=0;y<sprite.length;y++)for(let x=0;x<16;x++){const c=palette[sprite[y][x]];if(c)rect((x-8)*1.65+(y>12?step*(x<8?1:-1):0),y*1.65,2,2,c);}ctx.restore();}
function goomba(e){const x=e.x,y=e.y;if(e.dead){rect(x,y+3,22,7,'#963d15');rect(x+3,y,16,4,'#d48a42');return;}rect(x+5,y,12,4,'#9c431c');rect(x+2,y+4,18,5,'#9c431c');rect(x,y+9,22,8,'#9c431c');rect(x+4,y+6,5,7,'#fff0c3');rect(x+13,y+6,5,7,'#fff0c3');rect(x+7,y+8,2,5,'#21150e');rect(x+13,y+8,2,5,'#21150e');rect(x+5,y+17,12,3,'#e9b778');const step=Math.sin(performance.now()/110)>0?2:0;rect(x-step,y+20,9,3,'#3e2315');rect(x+13+step,y+20,9,3,'#3e2315');}
function draw(){rect(0,0,W,H,'#638bea');ctx.save();ctx.translate(-Math.round(camera),0);
  for(let i=0;i<12;i++){const base=i*480;cloud(base+180,85);cloud(base+370,118);hill(base+5,GROUND,160,68);hill(base+300,GROUND,80,36);for(let j=0;j<3;j++){rect(base+205+j*20,GROUND-20-j%2*7,28,20+j%2*7,'#36b92d');rect(base+211+j*20,GROUND-24-j%2*7,16,5,'#36b92d');}}
  for(let i=Math.max(0,Math.floor(camera/T));i<Math.ceil((camera+W)/T);i++)if(floorAt(i*T))for(let y=GROUND;y<H;y+=T){brick(i*T,y,'#bc682f');rect(i*T+3,y+3,4,3,'#f6b080');}
  for(const b of blocks){if(b.x+b.w<camera||b.x>camera+W)continue;const x=b.x,y=b.y-Math.sin(b.bump/8*Math.PI)*5;if(b.type==='pipe'){rect(x+3,y+12,b.w-6,b.h-12,'#145c14');rect(x+7,y+12,30,b.h-12,'#4dbb16');rect(x+10,y+12,6,b.h-12,'#a5e535');rect(x,y,b.w,16,'#163c12');rect(x+2,y+2,b.w-4,11,'#5fc51a');rect(x+6,y+2,7,11,'#b1ee45');rect(x+b.w-8,y+2,4,11,'#2c8a12');}else if(b.type==='brick')brick(x,y);else if(b.type==='stone'){rect(x,y,T,T,'#4a2b18');rect(x+1,y+1,22,22,'#d88e47');rect(x+3,y+3,18,3,'#f7c28c');rect(x+3,y+6,3,15,'#f7c28c');rect(x+18,y+8,3,13,'#a5572e');}else{rect(x,y,T,T,'#6a3618');rect(x+1,y+1,22,22,b.type==='used'?'#a9612d':'#f8b72e');rect(x+2,y+2,20,2,'#ffe098');for(const dx of [3,19])for(const dy of [4,19])rect(x+dx,y+dy,2,2,'#713913');if(b.type==='question'){ctx.fillStyle='#814314';ctx.font='bold 21px monospace';ctx.textAlign='center';ctx.fillText('?',x+12,y+20);}}}
  const flag=198*T;rect(flag,GROUND-240,3,240,'#e8f5b2');rect(flag-3,GROUND-247,9,9,'#66bd36');ctx.fillStyle='#fcf7e9';ctx.beginPath();ctx.moveTo(flag,GROUND-235);ctx.lineTo(flag-32,GROUND-235);ctx.lineTo(flag,GROUND-211);ctx.fill();rect(flag-12,GROUND-231,5,6,'#44a641');
  const castle=202*T;for(let row=0;row<3;row++)for(let col=0;col<5;col++)brick(castle+col*T,GROUND-72+row*T);for(let col=0;col<5;col+=2)brick(castle+col*T,GROUND-96);rect(castle+48,GROUND-35,24,35,'#221c24');rect(castle+53,GROUND-42,14,8,'#221c24');
  for(const e of enemies)if(e.x>camera-30&&e.x<camera+W+30)goomba(e);for(const c of coins){rect(c.x-4,c.y,8,14,'#ffdc43');rect(c.x-1,c.y+2,2,10,'#b6771e');}mario();ctx.restore();
  text('MARIO',28,30);text(String(score).padStart(6,'0'),28,49);text('× '+String(coins.collected).padStart(2,'0'),235,49);rect(219,35,8,13,'#ffdc43');text('WORLD',W/2+35,30,16,'center');text('1-1',W/2+35,49,16,'center');text('LIVES',580,30,16,'center');text(String(lives),580,49,16,'center');text('TIME',W-28,30,16,'right');text(String(Math.max(0,Math.ceil(time))).padStart(3,'0'),W-28,49,16,'right');
}
function frame(now){acc+=Math.min((now-last)/1000,.1);last=now;while(acc>=1/60){tick();acc-=1/60;}draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
