"use client";
import { useEffect, useRef, useState } from "react";

type RGB = { r:number; g:number; b:number };
const hr  = (h:string): RGB => ({ r:parseInt(h.slice(1,3),16), g:parseInt(h.slice(3,5),16), b:parseInt(h.slice(5,7),16) });
const rga = (c:RGB|string, a=1) => { const x=typeof c==="string"?hr(c):c; return `rgba(${x.r},${x.g},${x.b},${a})`; };
const lit = (c:RGB, n:number): RGB => ({ r:Math.min(255,c.r+n), g:Math.min(255,c.g+n), b:Math.min(255,c.b+n) });
const drk = (c:RGB, n:number): RGB => ({ r:Math.max(0,c.r-n),   g:Math.max(0,c.g-n),   b:Math.max(0,c.b-n) });
const mix = (a:string, b:string, t:number) => {
  const A=hr(a), B=hr(b);
  const r=Math.round(A.r+(B.r-A.r)*t), g=Math.round(A.g+(B.g-A.g)*t), bl=Math.round(A.b+(B.b-A.b)*t);
  return `#${[r,g,bl].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
};
const smoothstep = (min:number, max:number, value:number) => {
  const x = Math.max(0, Math.min(1, (value-min)/(max-min)));
  return x*x*(3-2*x);
};

function skinFromT(t:number) {
  const stops = [
    { hi:"#fff8f2", base:"#fce8d8", mid:"#f8d0b8", dark:"#e8b090", shadow:"#c08060" },
    { hi:"#feeee0", base:"#fad8c0", mid:"#f0b890", dark:"#d8946a", shadow:"#a86030" },
    { hi:"#feeadb", base:"#f5c9a8", mid:"#e0a070", dark:"#b87040", shadow:"#7a3c18" },
    { hi:"#f0c090", base:"#d4956e", mid:"#b06840", dark:"#885030", shadow:"#502810" },
    { hi:"#c89068", base:"#a06840", mid:"#906028", dark:"#784830", shadow:"#3c2010" },
    { hi:"#a07050", base:"#785030", mid:"#604020", dark:"#502818", shadow:"#281408" },
  ];
  const n=stops.length-1, i=Math.min(n-1,Math.floor(t*n)), s=t*n-i;
  const A=stops[i], B=stops[i+1];
  const lp=(a:string,b:string)=>mix(a,b,s);
  return { hi:lp(A.hi,B.hi), base:lp(A.base,B.base), mid:lp(A.mid,B.mid), dark:lp(A.dark,B.dark), shadow:lp(A.shadow,B.shadow) };
}
type Skin = ReturnType<typeof skinFromT>;

function facePath(ctx:CanvasRenderingContext2D, cx:number, ty:number, fw:number, fH:number, mH:number, cH:number, eraW:number, chinW:number) {
  const midBottomY = ty+fH+mH, by = midBottomY+cH;
  const era = Math.max(-0.5, Math.min(0.4, eraW));
  const foreheadX = fw*0.92, eraX = fw*(0.92+era);
  ctx.moveTo(cx, ty);
  ctx.bezierCurveTo(cx-fw*0.5, ty, cx-foreheadX*0.9, ty+fH*0.5, cx-foreheadX, ty+fH);
  ctx.bezierCurveTo(cx-foreheadX, ty+fH+mH*0.4, cx-eraX, ty+fH+mH*0.6, cx-eraX, midBottomY);
  ctx.bezierCurveTo(cx-eraX, midBottomY+cH*0.5, cx-chinW, by-2, cx, by);
  ctx.bezierCurveTo(cx+chinW, by-2, cx+eraX, midBottomY+cH*0.5, cx+eraX, midBottomY);
  ctx.bezierCurveTo(cx+eraX, ty+fH+mH*0.6, cx+foreheadX, ty+fH+mH*0.4, cx+foreheadX, ty+fH);
  ctx.bezierCurveTo(cx+foreheadX*0.9, ty+fH*0.5, cx+fw*0.5, ty, cx, ty);
  ctx.closePath();
}

function drawFaceShadow(ctx:CanvasRenderingContext2D, cx:number, ty:number, fw:number, fH:number, mH:number, cH:number, eraW:number, chinW:number, sk:Skin, intensity:number) {
  const a=intensity*0.24, sR=hr(sk.shadow);
  ctx.save();
  ctx.beginPath(); facePath(ctx,cx,ty,fw,fH,mH,cH,eraW,chinW); ctx.clip();
  const by=ty+fH+mH+cH, fullH=fH+mH+cH;
  const lG=ctx.createLinearGradient(cx-fw,ty+55,cx-fw*0.14,ty+55);
  lG.addColorStop(0,rga(sR,a)); lG.addColorStop(1,rga(sR,0));
  ctx.fillStyle=lG; ctx.fillRect(cx-fw-4,ty-20,fw*0.9,fullH+40);
  const rG=ctx.createLinearGradient(cx+fw,ty+55,cx+fw*0.14,ty+55);
  rG.addColorStop(0,rga(sR,a)); rG.addColorStop(1,rga(sR,0));
  ctx.fillStyle=rG; ctx.fillRect(cx+fw*0.1,ty-20,fw*0.94,fullH+40);
  const cG=ctx.createLinearGradient(cx,by-26,cx,by+2);
  cG.addColorStop(0,rga(sR,0)); cG.addColorStop(1,rga(sR,a*0.7));
  ctx.fillStyle=cG; ctx.fillRect(cx-fw,by-26,fw*2,30);
  ctx.restore();
}

function drawEars(ctx:CanvasRenderingContext2D, cx:number, ty:number, fw:number, mH:number, sk:Skin, earSize:number, earY:number, eraW:number, faceW:number, fH:number) {
  const earH=22*earSize, earW=8*earSize;
  const finalEarY=ty+fH+mH*0.4+earY;
  const era=Math.max(-0.5,Math.min(0.4,eraW));
  const foreheadX=fw*0.92, eraX=fw*(0.92+era);
  let t=(finalEarY-(ty+fH))/mH; t=Math.max(0,Math.min(1,t));
  const currentX=foreheadX*(1-t)+eraX*t;
  const rotationAngle=0.08-(era*0.45);
  const earScale=0.4+(faceW*0.6);
  for (const s of [-1,1] as const) {
    ctx.save();
    ctx.translate(cx+s*currentX, finalEarY);
    ctx.rotate(s*rotationAngle);
    ctx.translate(s*earW*0.15, 0);
    ctx.scale(s*earScale, 1);
    const skBase=hr(sk.base), skMid=hr(sk.mid), skDark=hr(sk.dark), skSh=hr(sk.shadow);
    const earG=ctx.createLinearGradient(-earW,0,earW,0);
    earG.addColorStop(0,rga(skDark)); earG.addColorStop(0.45,rga(skMid)); earG.addColorStop(1,rga(skBase));
    ctx.fillStyle=earG;
    ctx.beginPath();
    ctx.moveTo(0,-earH*0.52);
    ctx.bezierCurveTo(earW*0.9,-earH*0.52,earW,-earH*0.25,earW,0);
    ctx.bezierCurveTo(earW,earH*0.35,earW*0.85,earH*0.52,0,earH*0.52);
    ctx.bezierCurveTo(-earW*0.3,earH*0.52,-earW*0.4,earH*0.3,-earW*0.4,0);
    ctx.bezierCurveTo(-earW*0.4,-earH*0.3,-earW*0.3,-earH*0.52,0,-earH*0.52);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle=rga(skDark,0.45); ctx.lineWidth=0.9;
    ctx.beginPath(); ctx.moveTo(-earW*0.05,-earH*0.44);
    ctx.bezierCurveTo(earW*0.72,-earH*0.44,earW*0.78,-earH*0.1,earW*0.75,earH*0.2); ctx.stroke();
    ctx.fillStyle=rga(skSh,0.18);
    ctx.beginPath(); ctx.ellipse(earW*0.22,earH*0.05,earW*0.38,earH*0.32,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

function drawHairBack(ctx:CanvasRenderingContext2D, cx:number, ty:number, fw:number, style:number, vol:number, mainColor:string) {
  const sr=fw*vol*1.10, hy=ty-80;
  const hc=hr(mainColor), hcD=drk(hc,38), hcL=lit(hc,14), hcM=drk(hc,18);
  const fillHair=()=>{
    const g=ctx.createLinearGradient(cx-sr*0.7,hy,cx+sr*0.7,hy+80);
    g.addColorStop(0,rga(hcD)); g.addColorStop(0.3,rga(hcM)); g.addColorStop(0.55,rga(hcL)); g.addColorStop(0.75,rga(hcM)); g.addColorStop(1,rga(hcD));
    ctx.fillStyle=g; ctx.fill();
  };
  const shortHead=()=>{
    ctx.beginPath(); ctx.moveTo(cx,hy-6);
    ctx.bezierCurveTo(cx-sr*0.42,hy-8,cx-sr*0.88,hy+10,cx-sr*0.94,ty+28);
    ctx.bezierCurveTo(cx-sr*0.98,ty+52,cx-sr*0.96,ty+72,cx-sr*0.84,ty+90);
    ctx.bezierCurveTo(cx-sr*0.60,ty+102,cx-sr*0.28,ty+108,cx,ty+108);
    ctx.bezierCurveTo(cx+sr*0.28,ty+108,cx+sr*0.60,ty+102,cx+sr*0.84,ty+90);
    ctx.bezierCurveTo(cx+sr*0.96,ty+72,cx+sr*0.98,ty+52,cx+sr*0.94,ty+28);
    ctx.bezierCurveTo(cx+sr*0.88,hy+10,cx+sr*0.42,hy-8,cx,hy-6);
    ctx.closePath(); fillHair();
  };
  if (style===0) { shortHead(); }
  else if (style===1) {
    ctx.beginPath(); ctx.moveTo(cx,hy-6);
    ctx.bezierCurveTo(cx-sr*0.42,hy-8,cx-sr*0.88,hy+10,cx-sr*0.95,ty+30);
    ctx.bezierCurveTo(cx-sr*1.00,ty+58,cx-sr*1.04,ty+88,cx-sr*1.02,ty+112);
    ctx.bezierCurveTo(cx-sr*0.98,ty+132,cx-sr*0.82,ty+148,cx-sr*0.58,ty+152);
    ctx.bezierCurveTo(cx-sr*0.28,ty+155,cx,ty+156,cx,ty+156);
    ctx.bezierCurveTo(cx,ty+156,cx+sr*0.28,ty+155,cx+sr*0.58,ty+152);
    ctx.bezierCurveTo(cx+sr*0.82,ty+148,cx+sr*0.98,ty+132,cx+sr*1.02,ty+112);
    ctx.bezierCurveTo(cx+sr*1.04,ty+88,cx+sr*1.00,ty+58,cx+sr*0.95,ty+30);
    ctx.bezierCurveTo(cx+sr*0.88,hy+10,cx+sr*0.42,hy-8,cx,hy-6);
    ctx.closePath(); fillHair();
  } else if (style===2) {
    ctx.beginPath(); ctx.moveTo(cx,hy-6);
    ctx.bezierCurveTo(cx-sr*0.42,hy-8,cx-sr*0.88,hy+10,cx-sr*0.95,ty+30);
    ctx.bezierCurveTo(cx-sr*1.02,ty+62,cx-sr*1.06,ty+105,cx-sr*1.06,ty+148);
    ctx.bezierCurveTo(cx-sr*1.04,ty+195,cx-sr*0.94,ty+248,cx-sr*0.72,ty+278);
    ctx.bezierCurveTo(cx-sr*0.46,ty+300,cx-sr*0.18,ty+308,cx,ty+308);
    ctx.bezierCurveTo(cx+sr*0.18,ty+308,cx+sr*0.46,ty+300,cx+sr*0.72,ty+278);
    ctx.bezierCurveTo(cx+sr*0.94,ty+248,cx+sr*1.04,ty+195,cx+sr*1.06,ty+148);
    ctx.bezierCurveTo(cx+sr*1.06,ty+105,cx+sr*1.02,ty+62,cx+sr*0.95,ty+30);
    ctx.bezierCurveTo(cx+sr*0.88,hy+10,cx+sr*0.42,hy-8,cx,hy-6);
    ctx.closePath(); fillHair();
  } else if (style===3) {
    shortHead();
    ctx.beginPath(); ctx.moveTo(cx-sr*0.24,ty+104);
    ctx.bezierCurveTo(cx-sr*0.30,ty+145,cx-sr*0.34,ty+205,cx-sr*0.16,ty+268);
    ctx.bezierCurveTo(cx-sr*0.04,ty+295,cx+sr*0.04,ty+295,cx+sr*0.16,ty+268);
    ctx.bezierCurveTo(cx+sr*0.34,ty+205,cx+sr*0.30,ty+145,cx+sr*0.24,ty+104);
    ctx.closePath(); fillHair();
  } else if (style===4) {
    ctx.beginPath(); ctx.moveTo(cx,hy-4);
    ctx.bezierCurveTo(cx-sr*0.40,hy-6,cx-sr*0.84,hy+8,cx-sr*0.90,ty+20);
    ctx.bezierCurveTo(cx-sr*0.92,ty+40,cx-sr*0.90,ty+58,cx-sr*0.80,ty+72);
    ctx.bezierCurveTo(cx-sr*0.58,ty+82,cx-sr*0.26,ty+86,cx,ty+86);
    ctx.bezierCurveTo(cx+sr*0.26,ty+86,cx+sr*0.58,ty+82,cx+sr*0.80,ty+72);
    ctx.bezierCurveTo(cx+sr*0.90,ty+58,cx+sr*0.92,ty+40,cx+sr*0.90,ty+20);
    ctx.bezierCurveTo(cx+sr*0.84,hy+8,cx+sr*0.40,hy-6,cx,hy-4);
    ctx.closePath(); fillHair();
  } else if (style===5) { shortHead(); }
  else if (style===6) {
    shortHead();
    for (const s of [-1,1] as const) {
      ctx.beginPath(); ctx.moveTo(cx+s*sr*0.60,ty+90);
      ctx.bezierCurveTo(cx+s*sr*0.88,ty+105,cx+s*sr*1.08,ty+155,cx+s*sr*1.02,ty+218);
      ctx.bezierCurveTo(cx+s*sr*0.96,ty+258,cx+s*sr*0.80,ty+278,cx+s*sr*0.64,ty+282);
      ctx.bezierCurveTo(cx+s*sr*0.44,ty+278,cx+s*sr*0.36,ty+258,cx+s*sr*0.40,ty+218);
      ctx.bezierCurveTo(cx+s*sr*0.44,ty+155,cx+s*sr*0.50,ty+105,cx+s*sr*0.40,ty+90);
      ctx.closePath(); fillHair();
    }
  } else {
    shortHead();
    ctx.beginPath(); ctx.moveTo(cx-sr*0.24,ty+104);
    ctx.bezierCurveTo(cx-sr*0.30,ty+145,cx-sr*0.34,ty+205,cx-sr*0.16,ty+268);
    ctx.bezierCurveTo(cx-sr*0.04,ty+295,cx+sr*0.04,ty+295,cx+sr*0.16,ty+268);
    ctx.bezierCurveTo(cx+sr*0.34,ty+205,cx+sr*0.30,ty+145,cx+sr*0.24,ty+104);
    ctx.closePath(); fillHair();
  }
  ctx.save();
  ctx.strokeStyle=rga(hcD,0.18); ctx.lineCap="round";
  const nLines=style<=0?3:style<=2?5:4;
  for (let i=0;i<nLines;i++) {
    const t=(i+0.8)/(nLines+0.5), bx=cx-sr*0.62+t*sr*1.24;
    const endY=style===0?ty+88:style===1?ty+145:style===2?ty+260:ty+100;
    ctx.lineWidth=1.0+i%2*0.4;
    ctx.beginPath(); ctx.moveTo(bx,hy+20); ctx.bezierCurveTo(bx+sr*0.03,ty+40,bx-sr*0.02,ty+70,bx+sr*0.01,endY); ctx.stroke();
  }
  const shine=ctx.createRadialGradient(cx-sr*0.10,hy+16,2,cx,hy+28,sr*0.48);
  shine.addColorStop(0,"rgba(255,255,255,0.24)"); shine.addColorStop(0.5,"rgba(255,255,255,0.07)"); shine.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=shine; ctx.beginPath(); ctx.ellipse(cx-sr*0.06,hy+24,sr*0.36,20,0.12,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawBangs(ctx:CanvasRenderingContext2D, cx:number, ty:number, fw:number, vol:number, bangStyle:number, mainColor:string) {
  if (bangStyle===0) return;
  const sr=fw*vol*1.08;
  const hc=hr(mainColor), hcD=drk(hc,32), hcM=drk(hc,18);
  const g=ctx.createLinearGradient(cx,ty-20,cx,ty+38);
  g.addColorStop(0,rga(hcD)); g.addColorStop(0.45,rga(hcM)); g.addColorStop(1,rga(hcD,0.55));
  ctx.fillStyle=g;
  const addStrands=(n:number,x0:number,x1:number)=>{
    ctx.save(); ctx.strokeStyle=rga(hcD,0.18); ctx.lineWidth=1.1; ctx.lineCap="round";
    for (let i=0;i<n;i++) {
      const t=(i+0.5)/n, bx=x0+t*(x1-x0);
      ctx.beginPath(); ctx.moveTo(bx,ty-10); ctx.bezierCurveTo(bx,ty+5,bx+sr*0.01,ty+18,bx,ty+26); ctx.stroke();
    }
    ctx.restore();
  };
  if (bangStyle===1) {
    ctx.beginPath(); ctx.moveTo(cx-sr*0.90,ty-7);
    ctx.bezierCurveTo(cx-sr*0.62,ty+3,cx-sr*0.28,ty+26,cx,ty+26);
    ctx.bezierCurveTo(cx+sr*0.28,ty+26,cx+sr*0.62,ty+3,cx+sr*0.90,ty-7);
    ctx.lineTo(cx+sr*0.90,ty-24); ctx.lineTo(cx-sr*0.90,ty-24); ctx.closePath(); ctx.fill(); addStrands(5,cx-sr*0.82,cx+sr*0.82);
  } else if (bangStyle===2) {
    ctx.beginPath(); ctx.moveTo(cx-sr*0.88,ty-6);
    ctx.bezierCurveTo(cx-sr*0.55,ty+5,cx-sr*0.12,ty+24,cx+sr*0.18,ty+18);
    ctx.bezierCurveTo(cx+sr*0.50,ty+10,cx+sr*0.82,ty-2,cx+sr*0.90,ty-8);
    ctx.lineTo(cx+sr*0.90,ty-24); ctx.lineTo(cx-sr*0.88,ty-24); ctx.closePath(); ctx.fill(); addStrands(4,cx-sr*0.80,cx+sr*0.82);
  } else if (bangStyle===3) {
    for (const s of [-1,1] as const) {
      ctx.beginPath(); ctx.moveTo(cx+s*sr*0.88,ty-6);
      ctx.bezierCurveTo(cx+s*sr*0.62,ty-1,cx+s*sr*0.36,ty+18,cx+s*sr*0.18,ty+14);
      ctx.bezierCurveTo(cx+s*sr*0.08,ty+8,cx+s*2,ty+2,cx,ty-1);
      ctx.lineTo(cx,ty-24); ctx.lineTo(cx+s*sr*0.88,ty-24); ctx.closePath(); ctx.fill(); addStrands(3,cx,cx+s*sr*0.82);
    }
  } else if (bangStyle===4) {
    ctx.beginPath(); ctx.moveTo(cx-sr*0.90,ty-6);
    ctx.bezierCurveTo(cx-sr*0.62,ty+8,cx-sr*0.18,ty+32,cx+sr*0.10,ty+28);
    ctx.bezierCurveTo(cx+sr*0.40,ty+22,cx+sr*0.74,ty+6,cx+sr*0.90,ty-5);
    ctx.lineTo(cx+sr*0.90,ty-24); ctx.lineTo(cx-sr*0.90,ty-24); ctx.closePath(); ctx.fill(); addStrands(4,cx-sr*0.82,cx+sr*0.82);
  } else if (bangStyle===5) {
    ctx.save(); ctx.globalAlpha=0.70;
    ctx.beginPath(); ctx.moveTo(cx-sr*0.82,ty-5);
    ctx.bezierCurveTo(cx-sr*0.55,ty+5,cx-sr*0.22,ty+20,cx,ty+20);
    ctx.bezierCurveTo(cx+sr*0.22,ty+20,cx+sr*0.55,ty+5,cx+sr*0.82,ty-5);
    ctx.lineTo(cx+sr*0.82,ty-22); ctx.lineTo(cx-sr*0.82,ty-22); ctx.closePath(); ctx.fill(); ctx.restore(); addStrands(6,cx-sr*0.75,cx+sr*0.75);
  } else {
    ctx.save(); ctx.globalAlpha=0.80;
    ctx.beginPath(); ctx.moveTo(cx-sr*0.48,ty-4);
    ctx.bezierCurveTo(cx-sr*0.32,ty+10,cx-sr*0.12,ty+22,cx,ty+22);
    ctx.bezierCurveTo(cx+sr*0.12,ty+22,cx+sr*0.32,ty+10,cx+sr*0.48,ty-4);
    ctx.lineTo(cx+sr*0.48,ty-22); ctx.lineTo(cx-sr*0.48,ty-22); ctx.closePath(); ctx.fill(); ctx.restore(); addStrands(3,cx-sr*0.42,cx+sr*0.42);
  }
}

function drawEyebrow(ctx:CanvasRenderingContext2D, bx:number, side:number, baseY:number, bW:number, targetAngle:number, bT:number, bDens:number, bShape:number, browColor:string) {
  const hc=hr(browColor), hw=19*bW, archD=bShape===0?bT*2.2:bT*0.2;
  ctx.save(); ctx.translate(bx,baseY); ctx.scale(side,1); ctx.lineCap="round";
  const layers=[{count:32,alpha:0.18,thick:0.6,len:1.15},{count:18,alpha:0.60,thick:1.0,len:0.9}];
  layers.forEach((ly,lIdx)=>{
    const hairCount=Math.round(ly.count*bW*bDens);
    for (let i=0;i<hairCount;i++) {
      const t=i/(hairCount-1);
      const rx=-hw+t*hw*2, ry=-archD*Math.sin(t*Math.PI)*0.9+(t*targetAngle*5.0);
      const sleepT=Math.pow(t,0.4);
      const baseAng=(-Math.PI*0.45)*(1-sleepT);
      const currentAng=baseAng+(targetAngle*0.2);
      const shake=Math.sin(i*0.5+lIdx*10), taperFactor=1.0-(t*0.7);
      const headFade=0.6+0.4*smoothstep(0,0.2,t), opacityFade=0.7+0.3*smoothstep(0,0.15,t);
      const thick=bT*ly.thick*taperFactor, len=bT*ly.len*taperFactor*(3.5+shake*0.4)*headFade;
      ctx.strokeStyle=rga(hc,bDens*ly.alpha*taperFactor*opacityFade); ctx.lineWidth=thick;
      ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx+Math.cos(currentAng)*len,ry+Math.sin(currentAng)*len*0.4); ctx.stroke();
    }
  });
  ctx.restore();
}

function drawNose(ctx:CanvasRenderingContext2D, cx:number, ny:number, noseLen:number, noseWide:number, alaeSize:number, bridge:number, sk:Skin, intensity:number) {
  const nHH=26*noseLen, nW=10*noseWide*0.9, aS=Math.max(0.01,alaeSize)*0.7;
  const cBase=hr(sk.base), cMid=hr(sk.mid), cDark=hr(sk.dark);
  const topRGB=lit(cBase,40);
  const topHex=`#${[topRGB.r,topRGB.g,topRGB.b].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
  const edgeHex=sk.base, shadowAlpha=0.1+intensity*0.2, shadowStroke=rga(cDark,shadowAlpha);
  ctx.save(); ctx.lineCap="round"; ctx.lineJoin="round";
  if (bridge>0.1) {
    const bridgeW=1.8+bridge*4.0;
    ctx.strokeStyle=shadowStroke; ctx.lineWidth=0.8;
    for (const s of [-1,1] as const) {
      ctx.beginPath(); ctx.moveTo(cx+s*(bridgeW*0.8),ny-nHH*0.85);
      ctx.bezierCurveTo(cx+s*(bridgeW*0.5),ny-nHH*0.4,cx+s*(nW*0.7),ny-4,cx+s*(nW*0.9),ny+2); ctx.stroke();
    }
    const bridgeG=ctx.createLinearGradient(cx,ny-nHH*0.85,cx,ny+2);
    bridgeG.addColorStop(0,rga(topHex,bridge*0.35)); bridgeG.addColorStop(0.5,rga(topHex,bridge*0.15)); bridgeG.addColorStop(1,rga(topHex,bridge*0.45));
    ctx.fillStyle=bridgeG;
    ctx.beginPath(); ctx.moveTo(cx-bridgeW*0.3,ny-nHH*0.85);
    ctx.bezierCurveTo(cx-bridgeW*0.2,ny-nHH*0.4,cx-bridgeW*0.1,ny-5,cx,ny+1.2);
    ctx.bezierCurveTo(cx+bridgeW*0.1,ny-5,cx+bridgeW*0.2,ny-nHH*0.4,cx+bridgeW*0.3,ny-nHH*0.85);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle=rga(cDark,shadowAlpha*1.2); ctx.lineWidth=1.0;
  ctx.beginPath(); ctx.arc(cx,ny+1.2,3.5*aS,0.2*Math.PI,0.8*Math.PI); ctx.stroke();
  for (const s of [-1,1] as const) {
    const ax=cx+s*nW, ay=ny+3;
    ctx.strokeStyle=rga(cDark,shadowAlpha*0.6);
    ctx.beginPath(); ctx.ellipse(ax,ay,nW*0.45*aS,6*aS,s*-0.15,0.2*Math.PI,1.2*Math.PI); ctx.stroke();
    const alG=ctx.createRadialGradient(ax,ay,0.5*aS,ax,ay,nW*0.45*aS);
    alG.addColorStop(0,rga(cMid,0.25)); alG.addColorStop(1,rga(cDark,0));
    ctx.fillStyle=alG; ctx.fill();
  }
  for (const s of [-1,1] as const) {
    const hx=cx+s*nW*0.75, hy2=ny+5.0;
    const shadowHole=drk(cDark,50);
    const holeG=ctx.createRadialGradient(hx,hy2,0.5*aS,hx,hy2,3*aS);
    holeG.addColorStop(0,rga(shadowHole,0.75)); holeG.addColorStop(1,rga(cDark,0));
    ctx.fillStyle=holeG; ctx.beginPath(); ctx.ellipse(hx,hy2,2.8*aS,1.8*aS,s*0.1,0,Math.PI*2); ctx.fill();
  }
  const shineG=ctx.createRadialGradient(cx,ny,0.5,cx,ny,3.5);
  shineG.addColorStop(0,rga(topHex,bridge*0.5)); shineG.addColorStop(1,rga(edgeHex,0));
  ctx.fillStyle=shineG; ctx.beginPath(); ctx.arc(cx,ny,3,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawMouth(ctx:CanvasRenderingContext2D, cx:number, my:number, mw:number, upperT:number, lowerT:number, cornerLift:number, lipColor:string) {
  const MW=21*mw, uH=6.0*upperT, lH=8.5*lowerT, cY=-cornerLift*2.5;
  const lC=hr(lipColor), lCL=lit(lC,20), lCD=drk(lC,32), lCM=drk(lC,10);
  const upper=(close=false)=>{
    ctx.moveTo(cx-MW,my+1.8+cY);
    ctx.bezierCurveTo(cx-MW*0.54,my-uH*0.22+cY*0.5,cx-MW*0.22,my-uH,cx-MW*0.09,my-uH*1.2);
    ctx.bezierCurveTo(cx,my-uH*0.5,cx+MW*0.09,my-uH*1.2,cx+MW*0.22,my-uH);
    ctx.bezierCurveTo(cx+MW*0.54,my-uH*0.22+cY*0.5,cx+MW,my+1.8+cY,cx+MW,my+1.8+cY);
    if (close) { ctx.bezierCurveTo(cx+MW*0.56,my+lH*1.18,cx-MW*0.56,my+lH*1.18,cx-MW,my+1.8+cY); ctx.closePath(); }
  };
  ctx.save(); ctx.beginPath(); upper(true); ctx.clip();
  const uG=ctx.createLinearGradient(cx,my-uH,cx,my+2);
  uG.addColorStop(0,rga(lCD)); uG.addColorStop(0.4,rga(lC)); uG.addColorStop(1,rga(lCM));
  ctx.fillStyle=uG; ctx.fillRect(cx-MW-1,my-uH-1,MW*2+2,uH+3);
  const lG=ctx.createLinearGradient(cx,my,cx,my+lH);
  lG.addColorStop(0,rga(lCM)); lG.addColorStop(0.4,rga(lCL)); lG.addColorStop(0.7,rga(lC)); lG.addColorStop(1,rga(lCD));
  ctx.fillStyle=lG; ctx.fillRect(cx-MW-1,my,MW*2+2,lH+2);
  const lhG=ctx.createRadialGradient(cx,my+lH*0.44,1.5,cx,my+lH*0.44,MW*0.36);
  lhG.addColorStop(0,"rgba(255,200,178,0.42)"); lhG.addColorStop(0.6,"rgba(255,200,178,0.11)"); lhG.addColorStop(1,"rgba(255,200,178,0)");
  ctx.fillStyle=lhG; ctx.beginPath(); ctx.ellipse(cx,my+lH*0.44,MW*0.35,lH*0.32,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle=rga(lCD,0.6); ctx.lineWidth=0.92; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(cx-MW,my+1.8+cY); ctx.bezierCurveTo(cx-MW*0.24,my-0.4, cx + MW*0.24,my-0.4,cx+MW,my+1.8+cY); ctx.stroke();
  ctx.strokeStyle=rga(lCD,0.33); ctx.lineWidth=0.6; ctx.beginPath(); upper(false); ctx.stroke();
  for (const s of [-1,1] as const) {
    const cG=ctx.createRadialGradient(cx+s*(MW-1),my+1.8+cY,0.5,cx+s*(MW-1),my+1.8+cY,4.2);
    cG.addColorStop(0,rga(lCD,0.48)); cG.addColorStop(1,rga(lCD,0));
    ctx.fillStyle=cG; ctx.beginPath(); ctx.ellipse(cx+s*(MW-1),my+1.8+cY,4.2,3.2,0,0,Math.PI*2); ctx.fill();
  }
}

type FaceState = {
  faceW:number; faceH:number; foreheadH:number; eraW:number; chinLen:number; chinW:number;
  eyeW:number; eyeH:number; irisColor:string; irisR:number; pupilR:number;
  eyeDist:number; eyeVert:number; tailAng:number; headAng:number;
  dblType:number; dblDepth:number; dblWidth:number;
  lashLenI:number; lashLenC:number; lashLenO:number;
  lashDensI:number; lashDensC:number; lashDensO:number;
  eyeShadowW:number; eyeShadowH:number; eyeShadowColor:string;
  tearBag:number; tearBagSize:number; tearBagAlpha:number; tearBagColor:string; tearBagColorAlpha: number;
  browY:number; browDist:number; browW:number; browAngle:number; browT:number; browDens:number; browShape:number; browColor:string;
  noseBr:number; noseLen:number; noseWide:number; alaeSize:number;
  mouthW:number; upperLipT:number; lowerLipT:number; mouthVert:number; cornerLift:number; lipColor:string;
  hairBack:number; hairBang:number; hairVol:number; hairMain:string;
  earSize:number; earY:number;
  skinT:number; shadow:number;
  cheekSize:number; cheekX:number; cheekY:number; cheekColor:string;
};

const DEFAULT_STATE: FaceState = {
  faceW:0.9, faceH:0.70, foreheadH:60, eraW:-0.10, chinLen:15, chinW:20,
  earSize:1.10, earY:17,
  eyeW:1.0, eyeH:1.0, irisColor:"#3d2a10", irisR:6.2, pupilR:3.0,
  eyeDist:-10, eyeVert:-5, tailAng:-0.60, headAng:3.40,
  dblType:1, dblDepth:4.05, dblWidth:0.35,
  lashLenI:1.50, lashLenC:0.70, lashLenO:0.70,
  lashDensI:1.10, lashDensC:1.00, lashDensO:1.00,
  eyeShadowW:0, eyeShadowH:0, eyeShadowColor:"#a06040",
  tearBag:1, tearBagSize:3.5, tearBagAlpha:0.3, tearBagColor:"skin", tearBagColorAlpha: 0.5,
  browY:2.50, browDist:-7, browW:0.80, browAngle:-0.60, browT:2.00, browDens:1.50, browShape:1, browColor:"#1a0f06",
  noseBr:1.2, noseLen:1.0, noseWide:1.0, alaeSize:1.0,
  mouthW:0.7, upperLipT:1.0, lowerLipT:1.0, mouthVert:15, cornerLift:1.0, lipColor:"#c05858",
  hairBack:1, hairBang:0, hairVol:1.0, hairMain:"#1a0f06",
  skinT:0.50, shadow:0.50,
  cheekSize:0.6, cheekX:10, cheekY:10, cheekColor:"#e08870",
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [st, setSt] = useState<FaceState>(DEFAULT_STATE);
  const [prev, setPrev] = useState<FaceState|null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showBigImage, setShowBigImage] = useState(false);
  useEffect(()=>{setIsMounted(true);},[]);
  const s=st;
  const set=<K extends keyof FaceState>(k:K,v:FaceState[K])=>{setPrev(st);setSt(s=>({...s,[k]:v}));};
  const undo=()=>{if(prev){setSt(prev);setPrev(null);}};
  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "portrait.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(()=>{
    if(!isMounted) return;
    const canvas=canvasRef.current, ctx=canvas?.getContext("2d");
    if(!ctx||!canvas) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    const {faceW,faceH,foreheadH,eraW,chinLen,chinW,skinT,shadow}=st;
    const sk=skinFromT(skinT);
    const cx=150, fw=80*faceW;
    const fH=foreheadH, mH=100*faceH, cH=35+chinLen;
    const ty=210-(fH+mH+cH)/2;
    const midStart=ty+fH, midEnd=midStart+mH;

    drawHairBack(ctx,cx,ty,fw,st.hairBack,st.hairVol,st.hairMain);

    const faceMidY=ty+(fH+mH+cH)*0.5;
    const g=ctx.createRadialGradient(cx,faceMidY,4,cx,faceMidY,fw*1.5);
    g.addColorStop(0,sk.hi); g.addColorStop(0.28,sk.base); g.addColorStop(0.70,sk.mid); g.addColorStop(1,sk.dark);
    ctx.fillStyle=g; ctx.beginPath(); facePath(ctx,cx,ty,fw,fH,mH,cH,eraW,chinW); ctx.fill();

    const cColor=hr(st.cheekColor);
    ctx.save(); ctx.beginPath(); facePath(ctx,cx,ty,fw,fH,mH,cH,eraW,chinW); ctx.clip();
    for (const sv of [-1,1] as const) {
      const chX=cx+sv*(fw*0.42+st.cheekX);
      const chY=midStart+mH*0.6+st.cheekY;
      const r=fw*0.48*st.cheekSize;
      const gCheek=ctx.createRadialGradient(chX,chY,0,chX,chY,r);
      gCheek.addColorStop(0,rga(cColor,0.28)); gCheek.addColorStop(1,rga(cColor,0));
      ctx.fillStyle=gCheek; ctx.beginPath(); ctx.ellipse(chX,chY,r,r*0.65,0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    drawFaceShadow(ctx,cx,ty,fw,fH,mH,cH,eraW,chinW,sk,shadow);
    drawEars(ctx,cx,ty,fw,mH,sk,st.earSize,st.earY,eraW,faceW,fH);

    const lex=cx-40-st.eyeDist, rex=cx+40+st.eyeDist;
    const lbx=cx-40-st.browDist, rbx=cx+40+st.browDist;
    const browBaseY=midStart+mH*0.1+st.browY;
    const eyeY_abs=midStart+mH*0.38-st.eyeVert;
    const noseY_abs=midStart+mH*0.82;
    const mouthY_abs=midEnd+st.mouthVert;

    const sColor=hr(st.eyeShadowColor);
    for (const xs of [-1,1] as const) {
      const ex=cx+xs*40+xs*st.eyeDist, ew=13.5*st.eyeW, eh=5.8*st.eyeH;
      ctx.save(); ctx.beginPath(); ctx.rect(ex-ew*1.5,eyeY_abs-eh*5,ew*3,eh*5); ctx.clip();
      const shadowW=ew*st.eyeShadowW;
      const shadowH=4+st.eyeShadowH*14;
      const centerY=eyeY_abs-shadowH*0.35;
      const esG=ctx.createRadialGradient(ex,centerY,0,ex,centerY,Math.max(shadowW,shadowH));
      esG.addColorStop(0,rga(sColor,0.42)); esG.addColorStop(1,rga(sColor,0));
      ctx.fillStyle=esG; ctx.beginPath(); ctx.ellipse(ex,centerY,shadowW,shadowH,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    drawEyebrow(ctx,lbx,-1,browBaseY,st.browW,st.browAngle,st.browT,st.browDens,st.browShape,st.browColor);
    drawEyebrow(ctx,rbx, 1,browBaseY,st.browW,st.browAngle,st.browT,st.browDens,st.browShape,st.browColor);

    for (const sv of [-1,1] as const) {
      const ex=cx+sv*40+sv*st.eyeDist, ew=13.5*st.eyeW, eh=5.8*st.eyeH;
      const innerY=sv===-1?-st.headAng:-st.tailAng;
      const outerY=sv===-1?-st.tailAng:-st.headAng;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ex-ew,eyeY_abs+innerY*0.5);
      ctx.bezierCurveTo(ex-ew*0.42,eyeY_abs-eh*1.12,ex+ew*0.3,eyeY_abs-eh*1.26,ex+ew,eyeY_abs+outerY*0.5);
      ctx.bezierCurveTo(ex+ew*0.38,eyeY_abs+eh*0.76,ex-ew*0.18,eyeY_abs+eh*0.76,ex-ew,eyeY_abs+innerY*0.5);
      ctx.closePath(); ctx.clip();
      const sG=ctx.createRadialGradient(ex,eyeY_abs-1,1,ex,eyeY_abs,ew*1.05);
      sG.addColorStop(0,"#faf7f3"); sG.addColorStop(1,"#e8e2d8");
      ctx.fillStyle=sG; ctx.fill();
      const iC=hr(st.irisColor), iCD=drk(iC,40), iCL=lit(iC,22);
      const iG=ctx.createRadialGradient(ex,eyeY_abs-st.irisR*0.2,st.irisR*0.05,ex,eyeY_abs,st.irisR);
      iG.addColorStop(0,rga(iCL,0.88)); iG.addColorStop(0.3,rga(iC)); iG.addColorStop(0.72,rga(iCD)); iG.addColorStop(1,rga(drk(iC,60)));
      ctx.fillStyle=iG; ctx.beginPath(); ctx.ellipse(ex,eyeY_abs,st.irisR*0.84,st.irisR,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(0,0,0,0.12)"; ctx.lineWidth=0.4;
      for (let i=0;i<12;i++) { const a=(i/12)*Math.PI*2; ctx.beginPath(); ctx.moveTo(ex+Math.cos(a)*st.irisR*0.2,eyeY_abs+Math.sin(a)*st.irisR*0.2); ctx.lineTo(ex+Math.cos(a)*st.irisR*0.82,eyeY_abs+Math.sin(a)*st.irisR*0.82); ctx.stroke(); }
      ctx.strokeStyle=rga(drk(iC,65),0.5); ctx.lineWidth=1.1;
      ctx.beginPath(); ctx.ellipse(ex,eyeY_abs,st.irisR*0.84,st.irisR,0,0,Math.PI*2); ctx.stroke();
      const pG=ctx.createRadialGradient(ex,eyeY_abs,0,ex,eyeY_abs,st.pupilR);
      pG.addColorStop(0,"#000"); pG.addColorStop(0.78,"#040201"); pG.addColorStop(1,"rgba(4,2,1,0)");
      ctx.fillStyle=pG; ctx.beginPath(); ctx.ellipse(ex,eyeY_abs,st.pupilR,st.pupilR*1.06,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.ellipse(ex-st.irisR*0.3,eyeY_abs-st.irisR*0.34,st.irisR*0.21,st.irisR*0.16,-0.3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.42)"; ctx.beginPath(); ctx.ellipse(ex+st.irisR*0.22,eyeY_abs+st.irisR*0.19,st.irisR*0.1,st.irisR*0.08,0.3,0,Math.PI*2); ctx.fill();
      ctx.restore();

      ctx.strokeStyle="rgba(14,6,3,0.88)"; ctx.lineWidth=1.7; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(ex-ew,eyeY_abs+innerY*0.5); ctx.bezierCurveTo(ex-ew*0.42,eyeY_abs-eh*1.12,ex+ew*0.3,eyeY_abs-eh*1.26,ex+ew,eyeY_abs+outerY*0.5); ctx.stroke();
      ctx.strokeStyle="rgba(14,6,3,0.22)"; ctx.lineWidth=0.62;
      ctx.beginPath(); ctx.moveTo(ex+ew,eyeY_abs+outerY*0.5); ctx.bezierCurveTo(ex+ew*0.38,eyeY_abs+eh*0.76,ex-ew*0.18,eyeY_abs+eh*0.76,ex-ew,eyeY_abs+innerY*0.5); ctx.stroke();

      if (st.dblType>0&&st.dblDepth>0) {
        const alpha=0.18+st.dblDepth*0.45;
        ctx.strokeStyle=`rgba(28,10,4,${alpha})`; ctx.lineWidth=0.8+st.dblDepth*0.45; ctx.lineCap="round";
        const gd=st.dblWidth;
        ctx.beginPath();
        if (st.dblType===2) {
          ctx.moveTo(ex-ew,eyeY_abs+innerY*0.5-gd); ctx.bezierCurveTo(ex-ew*0.42,eyeY_abs-eh*1.12-gd,ex+ew*0.3,eyeY_abs-eh*1.26-gd,ex+ew,eyeY_abs+outerY*0.5-gd);
        } else {
          const gL=sv===-1?gd:0, gR=sv===-1?0:gd;
          ctx.moveTo(ex-ew,eyeY_abs+innerY*0.5-gL); ctx.bezierCurveTo(ex-ew*0.42,eyeY_abs-eh*1.12-(gL*0.7+gR*0.3),ex+ew*0.3,eyeY_abs-eh*1.26-(gL*0.3+gR*0.7),ex+ew,eyeY_abs+outerY*0.5-gR);
        }
        ctx.stroke();
      }

if (st.tearBag>0&&st.tearBagSize>0) {
        if (st.tearBagColor !== "skin") {
          const tbC = hr(st.tearBagColor);
          const tbSize = st.tearBagSize;
          const tbAlpha = st.tearBagColorAlpha;
          
          ctx.save();
          ctx.beginPath();
          
          const startX = ex + ew; // 目尻
          const startY = eyeY_abs + outerY * 0.5;
          const endX = ex - ew;   // 目頭
          const endY = eyeY_abs + innerY * 0.5;

          // ① 目の下のライン
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(ex+ew*0.38, eyeY_abs+eh*0.76, ex-ew*0.18, eyeY_abs+eh*0.76, endX, endY);
          
          // ② 【ここが重要！】目頭の「縦の隙間」を強制的に埋める
          // 目頭の端っこで、目のラインから真下の涙袋の線まで「垂直に」線を引く
          ctx.lineTo(endX, endY + tbSize); 

          // ③ 涙袋の膨らみライン（下側）
          // 制御点を調整して、目頭側のボリュームを維持したまま目尻へ繋ぐ
          ctx.bezierCurveTo(ex-ew*0.18, eyeY_abs+eh*0.76+tbSize*1.6, ex+ew*0.38, eyeY_abs+eh*0.76+tbSize*1.6, startX, startY+tbSize*1.0);
          ctx.closePath();
          
          // グラデーション（下から上へ）
          const gradStartY = eyeY_abs + eh*0.76 + tbSize*1.2;
          const gradEndY = eyeY_abs + eh*0.3; // 目の際までしっかり色が届くように調整
          
          const tbG = ctx.createLinearGradient(ex, gradStartY, ex, gradEndY);
          tbG.addColorStop(0, rga(tbC, tbAlpha)); 
          tbG.addColorStop(1, rga(tbC, 0)); 

          ctx.fillStyle = tbG;
          ctx.fill();
          ctx.restore();
        }

        // --- 影の線 ---
        ctx.strokeStyle=`rgba(28,10,4,${st.tearBagAlpha})`;
        ctx.lineWidth=0.5+st.tearBagAlpha*0.7; ctx.lineCap="round";
        ctx.beginPath();
        ctx.moveTo(ex+ew, eyeY_abs+outerY*0.5+st.tearBagSize*0.8);
        ctx.bezierCurveTo(ex+ew*0.38, eyeY_abs+eh*0.76+st.tearBagSize, ex-ew*0.18, eyeY_abs+eh*0.76+st.tearBagSize, ex-ew, eyeY_abs+innerY*0.5+st.tearBagSize);
        ctx.stroke();
      }
    }

    drawNose(ctx,cx,noseY_abs,st.noseLen,st.noseWide,st.alaeSize,st.noseBr,sk,shadow);
    drawMouth(ctx,cx,mouthY_abs,st.mouthW,st.upperLipT,st.lowerLipT,st.cornerLift,st.lipColor);
    drawBangs(ctx,cx,ty,fw,st.hairVol,st.hairBang,st.hairMain);

    const lightColor=mix("#ffffff",sk.base,skinT*0.5);
    ctx.save(); ctx.beginPath(); facePath(ctx,cx,ty,fw,fH,mH,cH,eraW,chinW); ctx.clip();
    const foreheadG=ctx.createRadialGradient(cx,ty-fH*0.3,5,cx,ty-fH*0.3,fw*0.8);
    foreheadG.addColorStop(0,rga(lightColor,st.noseBr*0.3)); foreheadG.addColorStop(1,rga(lightColor,0));
    ctx.fillStyle=foreheadG; ctx.fillRect(cx-fw*0.8,ty-fH,fw*1.6,fH*1.5); ctx.restore();

  },[st,isMounted]);

return (
    <div style={{
      display: "flex",
      flexDirection: (isMounted && window.innerWidth < 768) ? "column" : "row",
      height: "100vh",
      overflow: "hidden", // 全体は固定して、中身だけスクロールさせる
      background: "#edeae5",
      fontFamily: "'Georgia',serif"
    }}>
      {/* 【上】：キャンバスエリア（スマホの時は高さを抑える） */}
      <div style={{
        flex: (isMounted && window.innerWidth < 768) ? "0 0 auto" : "1", // スマホなら中身に合わせる
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: (isMounted && window.innerWidth < 768) ? "10px 20px" : "32px 20px", // スマホなら上下の隙間を削る
        background: "#f9f6f2",
        borderBottom: "1px solid #ddd"
      }}>
        <div style={{fontSize:"8px",letterSpacing:"3px",color:"#ccc",textTransform:"uppercase",marginBottom:"6px"}}>Preview</div>
        
        {/* キャンバスの設定 */}
<canvas 
  ref={canvasRef} 
  width={300} 
  height={420} 
  onClick={() => setShowBigImage(true)} // ★クリックしたらモーダルを開く
  style={{
    borderRadius:"6px",
    background:"#f9f6f2",
    boxShadow:"0 5px 25px rgba(0,0,0,0.1)",
    maxWidth: (isMounted && window.innerWidth < 768) ? "65%" : "100%", 
    height: "auto",
    cursor: "zoom-in" // ★カーソルを虫眼鏡マークに
}} />

        <div style={{display:"flex",gap:"10px",marginTop:"10px",minHeight:"37px"}}>
          {isMounted && (
            <>
              <button onClick={undo} disabled={!prev} style={{padding:"6px 16px",fontSize:"10px",borderRadius:"20px",border:"none",cursor:prev?"pointer":"default",background:prev?"#c8a97e":"#2a2520",color:prev?"#18150f":"#3a3530",fontWeight:"bold"}}>↩ 戻る</button>
              <button onClick={saveImage} style={{padding:"6px 16px",fontSize:"10px",borderRadius:"20px",border:"none",cursor:"pointer",background:"#c8a97e",color:"#18150f",fontWeight:"bold"}}>💾 保存</button>
            </>
          )}
        </div>
      </div>

      {/* 【下】：操作パネルエリア（ここを広げる！） */}
      <div style={{
        flex: "1", // 残りのスペースを全部使う
        background: "#0d0b09",
        color: "#e2d9cc",
        padding: "20px",
        overflowY: "auto", // ここだけスクロールさせる
        WebkitOverflowScrolling: "touch"
      }}>
        <div style={{marginBottom:"15px",paddingLeft:"12px"}}>
          <h2 style={{fontSize:"13px",letterSpacing:"4px",color:"#c8a97e",margin:0}}>DESIGNER</h2>
        </div>
        
        <div style={{display:"flex",flexDirection:"column",gap:"8px",maxWidth:"480px"}}>

          <Sec title="顔">
            <Sld label="横幅"       v={s.faceW}     mn={0.72} mx={1.3}  st={0.02} fn={v=>set("faceW",v)} />
            <Sld label="縦幅"       v={s.faceH}     mn={0.5}  mx={1.6}  st={0.02} fn={v=>set("faceH",v)} />
            <Sld label="額の高さ"   v={s.foreheadH} mn={20}   mx={100}  st={1}    fn={v=>set("foreheadH",v)} />
            <Sld label="エラの張り" v={s.eraW}      mn={-0.3} mx={0.4}  st={0.03} fn={v=>set("eraW",v)} />
            <Sld label="顎の長さ"   v={s.chinLen}   mn={0}    mx={60}   st={1}    fn={v=>set("chinLen",v)} />
            <Sld label="顎の太さ"   v={s.chinW}     mn={0}    mx={65}   st={1}    fn={v=>set("chinW",v)} />
          </Sec>

          <Sec title="耳">
            <Sld label="大きさ" v={s.earSize} mn={0.3} mx={2.0} st={0.05} fn={v=>set("earSize",v)} />
            <Sld label="高さ"   v={s.earY}   mn={-30} mx={30}  st={1}    fn={v=>set("earY",v)} />
          </Sec>

          <Sec title="目">
            <Sld label="横幅"      v={s.eyeW}    mn={0}   mx={1.75} st={0.05} fn={v=>set("eyeW",v)} />
            <Sld label="縦幅"      v={s.eyeH}    mn={0}   mx={1.75} st={0.05} fn={v=>set("eyeH",v)} />
            <ColorSwatch label="瞳の色" v={s.irisColor} fn={v=>set("irisColor",v)} list={IRIS_COLORS} />
            <Sld label="瞳の大きさ" v={s.irisR}   mn={0}   mx={10.0} st={0.2}  fn={v=>set("irisR",v)} />
            <Sld label="瞳孔"      v={s.pupilR}  mn={0}   mx={10.0} st={0.1}  fn={v=>set("pupilR",v)} />
            <Sld label="目の間隔"  v={s.eyeDist} mn={-25} mx={12}   st={1}    fn={v=>set("eyeDist",v)} />
            <Sld label="目の高さ"  v={s.eyeVert} mn={-15} mx={25}   st={1}    fn={v=>set("eyeVert",v)} leftLabel="低" rightLabel="高" />
            <Sld label="目頭角度"  v={s.tailAng} mn={-6}  mx={6}    st={0.2}  fn={v=>set("tailAng",v)} />
            <Sld label="目尻角度"  v={s.headAng} mn={-6}  mx={6}    st={0.2}  fn={v=>set("headAng",v)} />
            <Tabs label="二重" v={s.dblType} opts={["なし","末広","並行"]} fn={v=>set("dblType",v)} />
            {s.dblType>0&&<Ind>
              <Sld label="二重の幅"  v={s.dblWidth} mn={1.0} mx={8.0} st={0.2}  fn={v=>set("dblWidth",v)} />
              <Sld label="二重の濃さ" v={s.dblDepth} mn={0.1} mx={1.0} st={0.05} fn={v=>set("dblDepth",v)} />
            </Ind>}
            <Sep />
            <Sld label="シャドウ横幅" v={s.eyeShadowW} mn={0} mx={2.0} st={0.05} fn={v=>set("eyeShadowW",v)} />
            <Sld label="シャドウ縦幅" v={s.eyeShadowH} mn={0} mx={2.0} st={0.05} fn={v=>set("eyeShadowH",v)} />
            <ColorSwatch label="シャドウ色" v={s.eyeShadowColor} fn={v=>set("eyeShadowColor",v)} list={MAKEUP_COLORS} />
            <Tabs label="涙袋" v={s.tearBag} opts={["なし","あり"]} fn={v=>set("tearBag",v)} />
            {s.tearBag>0&&<Ind>
              <Sld label="涙袋の幅" v={s.tearBagSize}  mn={0.1} mx={8.0} st={0.1}  fn={v=>set("tearBagSize",v)} />
              <Sld label="涙袋の濃さ" v={s.tearBagAlpha} mn={0.02} mx={0.8} st={0.02} fn={v=>set("tearBagAlpha",v)} />
              <TearBagColorSwatch label="カラー" v={s.tearBagColor} fn={v=>set("tearBagColor",v)} />
              {s.tearBagColor !== "skin" && (
  <Sld label="カラーの濃さ" v={s.tearBagColorAlpha} mn={0} mx={1.0} st={0.05} fn={v=>set("tearBagColorAlpha",v)} />
)}
  </Ind>}
          </Sec>

          <Sec title="まつ毛">
            <Sub label="長さ（目尻 / 中央 / 目頭）" />
            <Ind>
              <Sld label="目尻" v={s.lashLenI} mn={0} mx={3.0} st={0.05} fn={v=>set("lashLenI",v)} />
              <Sld label="中央" v={s.lashLenC} mn={0} mx={1.8} st={0.05} fn={v=>set("lashLenC",v)} />
              <Sld label="目頭" v={s.lashLenO} mn={0} mx={3.0} st={0.05} fn={v=>set("lashLenO",v)} />
            </Ind>
            <Sub label="密度（目尻 / 中央 / 目頭）" />
            <Ind>
              <Sld label="目尻" v={s.lashDensI} mn={0} mx={1.75} st={0.05} fn={v=>set("lashDensI",v)} />
              <Sld label="中央" v={s.lashDensC} mn={0} mx={1.75} st={0.05} fn={v=>set("lashDensC",v)} />
              <Sld label="目頭" v={s.lashDensO} mn={0} mx={1.75} st={0.05} fn={v=>set("lashDensO",v)} />
            </Ind>
          </Sec>

          <Sec title="眉毛">
            <Sld label="高さ"  v={s.browY}     mn={-20} mx={20}  st={0.5}  fn={v=>set("browY",v)} />
            <Sld label="間隔"  v={s.browDist}  mn={-15} mx={15}  st={1}    fn={v=>set("browDist",v)} />
            <Sld label="長さ"  v={s.browW}     mn={0}   mx={1.8} st={0.05} fn={v=>set("browW",v)} />
            <Sld label="角度"  v={s.browAngle} mn={-6}  mx={6}   st={0.3}  fn={v=>set("browAngle",v)} />
            <Sld label="太さ"  v={s.browT}     mn={0.3} mx={2}   st={0.05} fn={v=>set("browT",v)} />
            <Sld label="濃さ"  v={s.browDens}  mn={0}   mx={1.5} st={0.05} fn={v=>set("browDens",v)} />
            <Tabs label="形"   v={s.browShape} opts={["アーチ","並行"]} fn={v=>set("browShape",v)} />
            <ColorSwatch label="色" v={s.browColor} fn={v=>set("browColor",v)} list={BROW_COLORS} />
          </Sec>

          <Sec title="鼻">
            <Sld label="鼻筋光沢"    v={s.noseBr}   mn={0}   mx={2}   st={0.05} fn={v=>set("noseBr",v)} />
            <Sld label="縦幅"        v={s.noseLen}  mn={0}   mx={2}   st={0.05} fn={v=>set("noseLen",v)} />
            <Sld label="横幅"        v={s.noseWide} mn={0.2} mx={2.5} st={0.05} fn={v=>set("noseWide",v)} />
            <Sld label="小鼻"        v={s.alaeSize} mn={0}   mx={2.0} st={0.05} fn={v=>set("alaeSize",v)} />
          </Sec>

          <Sec title="口">
            <Sld label="横幅"      v={s.mouthW}     mn={0}   mx={1.8} st={0.05} fn={v=>set("mouthW",v)} />
            <Sld label="上唇の厚さ" v={s.upperLipT}  mn={0.3} mx={3}   st={0.05} fn={v=>set("upperLipT",v)} />
            <Sld label="下唇の厚さ" v={s.lowerLipT}  mn={0.3} mx={5}   st={0.05} fn={v=>set("lowerLipT",v)} />
            <Sld label="高さ"      v={s.mouthVert}  mn={-15} mx={20}  st={1}    fn={v=>set("mouthVert",v)} />
            <Sld label="口角"      v={s.cornerLift} mn={-3}  mx={3}   st={0.1}  fn={v=>set("cornerLift",v)} />
            <ColorSwatch label="唇の色" v={s.lipColor} fn={v=>set("lipColor",v)} list={LIP_COLORS} />
          </Sec>

          <Sec title="髪">
            <Tabs label="後ろ"       v={s.hairBack} opts={["ショート","ボブ","ロング","ポニー","刈上げ","マッシュ","ツイン","その他"]} fn={v=>set("hairBack",v)} />
            <Tabs label="前髪"       v={s.hairBang} opts={["なし","ぱっつん","斜め","センター","流し","シースルー","ウィスプ"]} fn={v=>set("hairBang",v)} />
            <Sld  label="ボリューム" v={s.hairVol}  mn={0}   mx={1.5} st={0.04} fn={v=>set("hairVol",v)} />
            <ColorSwatch label="髪色" v={s.hairMain} fn={v=>set("hairMain",v)} list={HAIR_COLORS} />
          </Sec>

          <Sec title="肌・メイク">
            <Sld label="肌色" v={s.skinT}  mn={0}   mx={1}   st={0.01} fn={v=>set("skinT",v)} leftLabel="白" rightLabel="暗" />
            <Sld label="陰影" v={s.shadow} mn={0.1} mx={1.0} st={0.05} fn={v=>set("shadow",v)} />
            <Sep />
            <Sld label="チーク範囲"  v={s.cheekSize} mn={0.1} mx={2.0} st={0.05} fn={v=>set("cheekSize",v)} />
            <Sld label="チーク横移動" v={s.cheekX}    mn={-30} mx={30}  st={1}    fn={v=>set("cheekX",v)} />
            <Sld label="チーク縦移動" v={s.cheekY}    mn={-30} mx={30}  st={1}    fn={v=>set("cheekY",v)} />
            <ColorSwatch label="チーク色" v={s.cheekColor} fn={v=>set("cheekColor",v)} list={CHEEK_COLORS} />
          </Sec>

        </div>
      </div>
    </div>
  );
  
}

const HAIR_COLORS = [
  "#060402","#0e0804","#160c04","#1e1006","#2c1608","#3c1e0c",
  "#3c3028","#102040","#102818","#301848","#502810","#643218",
  "#7a4020","#8e5028","#a06030","#b07838","#c09050","#D4AF37",
  "#d0a868","#e0c088","#F3E5AB","#ecd8a8","#f8ecd0","#6a5a48",
  "#9a8a78","#c0b0a0","#BDC3C7","#7F8C8D","#d8d0c8","#f0ece8",
  "#601818","#8a2420","#a02030","#a03028","#c84040","#c84838",
  "#d86040","#e06060","#e08858","#c84878","#e060a0","#f080c0",
  "#f8a8d8","#ffd0e8","#502878","#7040a8","#9060c8","#b080e0",
  "#c8a0f0","#183060","#1e4888","#2868b8","#4090d8","#87CEEB",
  "#70b8f0","#184830","#206840","#308858","#40a870","#2ECC71","#68c898",
];
const BROW_COLORS = [
  "#060402","#0e0804","#1e1006","#3c1e0c","#502810","#643218",
  "#7a4020","#a06030","#c09050","#d0a868","#e0c088","#f8ecd0",
  "#3c3028","#6a5a48","#9a8a78","#c0b0a0","#7F8C8D","#d8d0c8",
  "#601818","#8a2420","#c84040","#c84878","#e060a0",
  "#102040","#1e4888","#2868b8","#4090d8",
  "#102818","#206840","#308858","#40a870",
  "#301848","#7040a8","#9060c8","#b080e0",
];
const IRIS_COLORS = [
  "#100804","#1e1008","#2c1a0c","#402410","#543018","#6a4020",
  "#183040","#1e4060","#285888","#3870b0","#4890d8","#68a8e8",
  "#102820","#184030","#206048","#308860","#40a878","#58c890",
  "#301028","#502040","#703060","#904888","#b068a8",
  "#282010","#403018","#584228","#705840","#8a7058",
  "#181818","#303030","#484848","#606060",
];
const LIP_COLORS = [
  "#fce8e4","#f8d0c8","#f0b8b0","#e89888","#d87868","#c85858",
  "#c04848","#a83838","#903030","#7a2828","#602020",
  "#e8789a","#d85880","#c03868","#a82050","#901838",
  "#e89078","#d07058","#b85040","#a04030","#883028",
  "#f0c0a8","#e8a890","#d88870","#c07050","#a85838",
  "#4a1828","#6a2038","#8a2848","#a83058",
  "#302028","#503040","#704050","#905060",
];
const MAKEUP_COLORS = [
  "#a06040","#c05858","#e08870","#f0a0a0","#d07090","#8a3a2a",
  "#b06080","#e080b0","#f0c0e0","#8040a0","#60208a",
];
const CHEEK_COLORS = [
  "#f0a0a0","#e08870","#d07090","#c05858","#a06040","#f8c0c0",
  "#ffd0e8","#e8a0c0","#d080a0","#f0d0b0","#e0b090",
];
const TEARBAG_COLORS = [
  "skin",
  "#f0a0a0","#f8b8b8","#ffc8d0","#ffb0c8","#f090b0",
  "#e8789a","#d85880","#c03868",
  "#f0c0e0","#e8a0c8","#d080b0",
  "#f0d0b0","#e8b890","#d09070",
  "#c8e0f8","#a8c8f0","#88b0e8",
];

function Sec({title,children}:{title:string;children:React.ReactNode}) {
  return (
    <div style={{background:"#1a1714",borderRadius:"6px",padding:"10px 12px",border:"1px solid #252018"}}>
      <div style={{fontSize:"10px",fontWeight:"bold",letterSpacing:"2px",color:"#c8a97e",borderLeft:"3px solid #c8a97e",paddingLeft:"8px",marginBottom:"10px",textTransform:"uppercase"}}>{title}</div>
      <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>{children}</div>
    </div>
  );
}
function Sep() {
  return <div style={{borderTop:"1px solid #252018",margin:"2px 0"}} />;
}
function Sub({label}:{label:string}) {
  return <div style={{fontSize:"10px",color:"#6a6258",marginTop:"2px"}}>{label}</div>;
}
function Ind({children}:{children:React.ReactNode}) {
  return <div style={{display:"flex",flexDirection:"column",gap:"5px",paddingLeft:"8px",borderLeft:"2px solid #252018"}}>{children}</div>;
}
function Sld({label,v,mn,mx,st,fn,leftLabel,rightLabel}:{label:string;v:number;mn:number;mx:number;st:number;fn:(n:number)=>void;leftLabel?:string;rightLabel?:string;}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
      <div style={{width:"78px",fontSize:"10px",color:"#9e9286",flexShrink:0}}>{label}</div>
      {leftLabel&&<span style={{fontSize:"9px",color:"#6a6258"}}>{leftLabel}</span>}
      <input type="range" min={mn} max={mx} step={st} value={v} onChange={e=>fn(Number(e.target.value))} style={{flex:1,accentColor:"#c8a97e",cursor:"pointer"}} />
      {rightLabel&&<span style={{fontSize:"9px",color:"#6a6258"}}>{rightLabel}</span>}
      <div style={{width:"28px",fontSize:"9px",color:"#6e6258",textAlign:"right"}}>{Math.abs(v)<10&&st<1?v.toFixed(2):Math.round(v)}</div>
    </div>
  );
}
function Tabs({label,v,opts,fn}:{label:string;v:number;opts:string[];fn:(n:number)=>void}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
      <div style={{width:"78px",fontSize:"10px",color:"#9e9286",flexShrink:0}}>{label}</div>
      <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
        {opts.map((o,i)=>(
          <button key={i} onClick={()=>fn(i)} style={{padding:"2px 7px",fontSize:"9px",borderRadius:"10px",border:"none",cursor:"pointer",background:v===i?"#c8a97e":"#2a2520",color:v===i?"#18150f":"#5a5248"}}>{o}</button>
        ))}
      </div>
    </div>
  );
}
function ColorSwatch({label,v,list,fn}:{label:string;v:string;list:string[];fn:(s:string)=>void}) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:"6px"}}>
      <div style={{width:"78px",fontSize:"10px",color:"#9e9286",flexShrink:0,paddingTop:"2px"}}>{label}</div>
      <div style={{display:"flex",gap:"3px",flexWrap:"wrap",maxWidth:"220px"}}>
        {list.map(c=>(
          <div key={c} onClick={()=>fn(c)} title={c} style={{width:"15px",height:"15px",borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${v===c?"#c8a97e":"transparent"}`,boxSizing:"border-box",flexShrink:0}} />
        ))}
      </div>
    </div>
  );
}
function TearBagColorSwatch({label,v,fn}:{label:string;v:string;fn:(s:string)=>void}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
      <div style={{width:"78px",fontSize:"10px",color:"#9e9286",flexShrink:0}}>{label}</div>
      <div style={{display:"flex",gap:"3px",flexWrap:"wrap",maxWidth:"220px"}}>
        <div onClick={()=>fn("skin")} title="スキン（なし）"
          style={{width:"15px",height:"15px",borderRadius:"50%",cursor:"pointer",
            border:`2px solid ${v==="skin"?"#c8a97e":"#3a3530"}`,boxSizing:"border-box",flexShrink:0,
            background:"linear-gradient(135deg,#f0c0a0 50%,#1a1714 50%)"}} />
        {TEARBAG_COLORS.filter(c=>c!=="skin").map(c=>(
          <div key={c} onClick={()=>fn(c)} title={c}
            style={{width:"15px",height:"15px",borderRadius:"50%",background:c,cursor:"pointer",
              border:`2px solid ${v===c?"#c8a97e":"transparent"}`,boxSizing:"border-box",flexShrink:0}} />
        ))}
      </div>
    </div>
  );

  {isMounted && showBigImage && (
      <div 
        onClick={() => setShowBigImage(false)} // 画面のどこをクリックしても閉じる
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.9)", // 真っ黒背景
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999, // 一番手前に出す
          cursor: "zoom-out"
        }}
      >
        <img 
          src={canvasRef.current?.toDataURL("image/png")} // キャンバスの中身を画像化して表示
          alt="Preview Big" 
          style={{
            maxWidth: "95%",
            maxHeight: "95%",
            objectFit: "contain",
            boxShadow: "0 10px 100px rgba(0,0,0,0.5)",
            borderRadius: "6px"
          }}
        />
      </div>
    )}
}