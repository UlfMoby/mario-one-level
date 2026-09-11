const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const context=new Proxy({}, {get:()=>()=>{}});
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{getContext:()=>context,focus(){},setAttribute(){},hidden:false,textContent:'',innerHTML:''});return elements.get(id);}
const sandbox={document:{querySelector:element,querySelectorAll:()=>[]},addEventListener(){},requestAnimationFrame(){},performance:{now:()=>0},assert};
vm.createContext(sandbox);
vm.runInContext(readFileSync(__dirname+'/game.js','utf8'),sandbox);
vm.runInContext(`
start();
for(let i=0;i<5;i++)tick();
assert.equal(player.y,GROUND-player.h,'player lands on ground');
player.jumpBuffer=8;tick();assert.ok(player.vy<0,'jump lifts player');
player.x=16*T;player.y=12*T;player.vy=-7;move(player,true);
assert.equal(blocks.find(b=>b.x===16*T).type,'used','question block is spent');
assert.equal(coins.collected,1,'question block awards coin');
const savedScore=score;hitBlock(blocks.find(b=>b.x===16*T));assert.equal(score,savedScore,'coin awarded once');
player.x=28*T-player.w-1;player.y=GROUND-player.h;player.vx=3;player.vy=0;move(player,true);
assert.equal(player.x,28*T-player.w,'pipe blocks horizontal movement');
player.x=69*T+3;player.y=GROUND-player.h;player.vx=0;player.vy=0;
for(let i=0;i<40;i++)tick();assert.equal(player.dead,true,'falling into a gap kills player');
for(let i=0;i<120;i++)tick();assert.equal(lives,2);assert.equal(player.dead,false);assert.equal(coins.collected,1,'coin total survives respawn');
player.x=198*T+1;player.y=GROUND-player.h;tick();assert.equal(state,'won','flag finishes level');
start();assert.equal(lives,3);assert.equal(score,0);assert.equal(coins.collected,0);
pause();const x=player.x;tick();assert.equal(player.x,x);assert.equal(state,'paused');pause();assert.equal(state,'playing');
draw();
`,sandbox);
console.log('Passed: ground, jumping, blocks, coins, pipes, pits, respawn, finish, restart, pause, rendering smoke test.');
