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
  function digits(s){ var m=String(s==null?"":s).match(/\d+/g); return m?m.join(""):""; }
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
  return {parseLine:parseLine,field:field,idField:idField,digits:digits,num:num,
          roundHalfUp:roundHalfUp,out:out,splitVal:splitVal};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Fmt;
