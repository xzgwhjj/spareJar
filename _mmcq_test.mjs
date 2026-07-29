// 临时验证：内联 MMCQ，合成人像像素，检查主色/色板
const SIGBITS = 5, RSHIFT = 8 - SIGBITS, MAX_ITERATIONS = 1e3, FRACT = 0.75, HISTO_SIZE = 1 << (3 * SIGBITS);
const idx = (r, g, b) => (r << (2 * SIGBITS)) + (g << SIGBITS) + b;
class VBox {
  constructor(r1,r2,g1,g2,b1,b2,h){this.r1=r1;this.r2=r2;this.g1=g1;this.g2=g2;this.b1=b1;this.b2=b2;this.histo=h;}
  volume(f=false){if(this._v===void 0||f)this._v=(this.r2-this.r1+1)*(this.g2-this.g1+1)*(this.b2-this.b1+1);return this._v;}
  count(f=false){if(this._c===void 0||f){let n=0;for(let i=this.r1;i<=this.r2;i++)for(let j=this.g1;j<=this.g2;j++)for(let k=this.b1;k<=this.b2;k++)n+=this.histo[idx(i,j,k)]||0;this._c=n;}return this._c;}
  copy(){return new VBox(this.r1,this.r2,this.g1,this.g2,this.b1,this.b2,this.histo);}
  avg(f=false){if(this._a===void 0||f){const m=1<<RSHIFT;if(this.r1===this.r2&&this.g1===this.g2&&this.b1===this.b2){this._a=[this.r1<<RSHIFT,this.g1<<RSHIFT,this.b1<<RSHIFT];}else{let nt=0,rs=0,gs=0,bs=0;for(let i=this.r1;i<=this.r2;i++)for(let j=this.g1;j<=this.g2;j++)for(let k=this.b1;k<=this.b2;k++){const hv=this.histo[idx(i,j,k)]||0;nt+=hv;rs+=hv*(i+0.5)*m;gs+=hv*(j+0.5)*m;bs+=hv*(k+0.5)*m;}this._a=nt?[~~(rs/nt),~~(gs/nt),~~(bs/nt)]:[~~(m*(this.r1+this.r2+1)/2),~~(m*(this.g1+this.g2+1)/2),~~(m*(this.b1+this.b2+1)/2)];}}return this._a;}
}
class PQ{constructor(c){this.c=c;this.k=[];this.s=false;}sort(){this.k.sort(this.c);this.s=true;}push(i){this.k.push(i);this.s=false;}pop(){if(!this.s)this.sort();return this.k.pop();}size(){return this.k.length;}}
function getHisto(p){const h=new Uint32Array(HISTO_SIZE);for(const px of p)h[idx(px[0]>>RSHIFT,px[1]>>RSHIFT,px[2]>>RSHIFT)]++;return h;}
function vboxFrom(p,h){let rmin=1e6,rmax=0,gmin=1e6,gmax=0,bmin=1e6,bmax=0;for(const px of p){const r=px[0]>>RSHIFT,g=px[1]>>RSHIFT,b=px[2]>>RSHIFT;if(r<rmin)rmin=r;else if(r>rmax)rmax=r;if(g<gmin)gmin=g;else if(g>gmax)gmax=g;if(b<bmin)bmin=b;else if(b>bmax)bmax=b;}return new VBox(rmin,rmax,gmin,gmax,bmin,bmax,h);}
function doCutAt(h,v,color,total,ps,la){const d1=color+'1',d2=color+'2';for(let i=v[d1];i<=v[d2];i++){if(ps[i]>total/2){const v1=v.copy(),v2=v.copy();const left=i-v[d1],right=v[d2]-i;let d2x=left<=right?Math.min(v[d2]-1,~~(i+right/2)):Math.max(v[d1],~~(i-1-left/2));while(!ps[d2x])d2x++;let c2=la[d2x];while(!c2&&ps[d2x-1])c2=la[--d2x];v1[d2]=d2x;v2[d1]=v1[d2]+1;return [v1,v2];}}return void 0;}
function medianCutApply(h,v){if(!v.count())return void 0;if(v.count()===1)return [v.copy(),null];const rw=v.r2-v.r1+1,gw=v.g2-v.g1+1,bw=v.b2-v.b1+1,mw=Math.max(rw,gw,bw);let total=0;const ps=[],la=[];if(mw===rw){for(let i=v.r1;i<=v.r2;i++){let s=0;for(let j=v.g1;j<=v.g2;j++)for(let k=v.b1;k<=v.b2;k++)s+=h[idx(i,j,k)]||0;total+=s;ps[i]=total;}}else if(mw===gw){for(let i=v.g1;i<=v.g2;i++){let s=0;for(let j=v.r1;j<=v.r2;j++)for(let k=v.b1;k<=v.b2;k++)s+=h[idx(j,i,k)]||0;total+=s;ps[i]=total;}}else{for(let i=v.b1;i<=v.b2;i++){let s=0;for(let j=v.r1;j<=v.r2;j++)for(let k=v.g1;k<=v.g2;k++)s+=h[idx(j,k,i)]||0;total+=s;ps[i]=total;}}ps.forEach((d,i)=>{la[i]=total-d;});if(mw===rw)return doCutAt(h,v,'r',total,ps,la);if(mw===gw)return doCutAt(h,v,'g',total,ps,la);return doCutAt(h,v,'b',total,ps,la);}
function iterate(pq,target,h){let n=pq.size(),it=0;while(it<MAX_ITERATIONS){if(n>=target)return;it++;const v=pq.pop();if(!v.count()){pq.push(v);continue;}const r=medianCutApply(h,v);if(!r||!r[0])return;pq.push(r[0]);if(r[1]){pq.push(r[1]);n++;}}}
function quantize(p,max){if(!p.length||max<2||max>256)return [];const h=getHisto(p);const v=vboxFrom(p,h);const pq=new PQ((a,b)=>a.count()-b.count());pq.push(v);iterate(pq,FRACT*max,h);const pq2=new PQ((a,b)=>a.count()*a.volume()-b.count()*b.volume());while(pq.size())pq2.push(pq.pop());iterate(pq2,max,h);const res=[];while(pq2.size()){const b=pq2.pop();res.push({color:b.avg(),population:b.count()});}return res;}

// 合成人像像素
const px=[];
function add(rgb,n){for(let i=0;i<n;i++)px.push(rgb);}
add([58,120,194],2000);   // 海蓝背景
add([170,205,235],800);   // 浅蓝衣服
add([232,181,138],700);   // 肤色
add([245,245,245],400);   // 白船
add([43,43,43],196);      // 黑发
const boxes=quantize(px,16);
boxes.sort((a,b)=>b.population-a.population);
console.log('== median-cut 色板（按 population 降序）==');
for(const b of boxes) console.log(`#${b.color.map(x=>x.toString(16).padStart(2,'0')).join('')}  pop=${b.population}`);
// 主色评分：权重=population，差异奖励=与均值距离
const mean={r:px.reduce((s,p)=>s+p[0],0)/px.length,g:px.reduce((s,p)=>s+p[1],0)/px.length,b:px.reduce((s,p)=>s+p[2],0)/px.length};
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d>0){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}const s=mx===0?0:d/mx;return{h,s,v:mx};}
function score(c){const{h,s,v}=rgbToHsv(c.color[0],c.color[1],c.color[2]);let bf=1;if(v>0.96)bf=0.45;else if(v<0.06)bf=0.45;const sal=0.8+0.4*Math.min(s,1);const dist=Math.sqrt((c.color[0]-mean.r)**2+(c.color[1]-mean.g)**2+(c.color[2]-mean.b)**2);const dist2=1+Math.min(dist,255)/128;return c.population*bf*sal*dist2;}
boxes.sort((a,b)=>score(b)-score(a));
console.log('== 评分最高（主色候选）==');
const top=boxes[0];
console.log(`#${top.color.map(x=>x.toString(16).padStart(2,'0')).join('')} score=${score(top).toFixed(1)}`);
