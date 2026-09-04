"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 1 · Fmt — формат CSV и чисел
   ══════════════════════════════════════════════════════════════════════════ */
var Fmt=(function(){
  function parseLine(line){
    var out=[],cur="",q=false;
    for(var i=0;i<line.length;i++){var c=line[i];
      if(q){ if(c==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
      else { if(c==='"')q=true; else if(c===';'){out.push(cur);cur="";} else cur+=c; }
    } out.push(cur); return out;
  }
  function field(v){ v=String(v==null?"":v); return /[\s;",]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
  function idField(v){ return field('="'+v+'"'); }
  /* Excel хранит большие числа как "6.022736E7". Разворачиваем строкой, без
     float — иначе ID кампании превращается в мусор. */
  function plain(s){
    s=String(s==null?"":s).trim();
    var m=/^([+-]?)(\d*)(?:\.(\d*))?[eE]([+-]?\d+)$/.exec(s);
    if(!m)return s;
    var sign=m[1]==="-"?"-":"",ds=(m[2]||"")+(m[3]||""),pt=(m[2]||"").length+parseInt(m[4],10),out;
    if(pt<=0)out="0."+new Array(1-pt).join("0")+ds;
    else if(pt>=ds.length)out=ds+new Array(pt-ds.length+1).join("0");
    else out=ds.slice(0,pt)+"."+ds.slice(pt);
    if(out.indexOf(".")>=0)out=out.replace(/0+$/,"").replace(/\.$/,"");
    out=out.replace(/^0+(?=\d)/,"");
    return sign+out;
  }
  function digits(s){ var m=plain(s).match(/\d+/g); return m?m.join(""):""; }
  function num(s){
    if(s===null||s===undefined)return null;
    if(typeof s==="number")return isFinite(s)?s:null;
    s=String(s).replace(/ /g,"").replace(/\s/g,"").replace(",",".");
    if(s===""||s==="#REF!"||s==="-"||s==="#ДЕЛ/0!")return null;
    var v=parseFloat(s); return isFinite(v)?v:null;
  }
  function roundHalfUp(x){ return x<0?-Math.round(-x):Math.round(x); }
  function out(x,round){
    if(round)return String(roundHalfUp(x));
    if(Number.isInteger(x))return String(x);
    return (Math.round(x*100)/100).toFixed(2).replace(/0+$/,"").replace(/\.$/,"").replace(".",",");
  }
  function splitVal(line){ var i=line.lastIndexOf(";"); return {prefix:line.slice(0,i),value:line.slice(i+1)}; }
  return {parseLine:parseLine,field:field,idField:idField,digits:digits,plain:plain,num:num,
          roundHalfUp:roundHalfUp,out:out,splitVal:splitVal};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Fmt;
