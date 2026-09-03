/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 4 · Sheet — разметка листа мастер-отчёта
   ══════════════════════════════════════════════════════════════════════════ */
var Sheet=(function(){
  var KW={"357428649":["b2b","б2б"],"357428736":["b2c","б2с"],
          "3000601598":["ecom","еком","cpa","покуп"],
          "1900001695":["андроид","aos","android"],"1900018239":["айос","ios"],
          "354427177":["первый"]};
  function parseCsvGrid(raw){
    raw=raw.replace(/^﻿/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n").replace(/\n+$/,"");
    if(raw==="")return [];
    var lines=raw.split("\n");
    var d=lines[0].indexOf("\t")>=0?"\t":(lines[0].indexOf(";")>=0?";":",");
    return lines.map(function(l){ return d===";"?Fmt.parseLine(l):l.split(d); });
  }
  function colByName(h,re){ for(var i=0;i<h.length;i++) if(re.test(String(h[i]||""))) return i; return -1; }
  function findHeaderRow(rows){
    for(var i=0;i<Math.min(rows.length,25);i++){
      var r=rows[i]||[];
      for(var j=0;j<r.length;j++){
        var s=String(r[j]||"").trim().toLowerCase();
        if(s==="id кампании"||s==="id"||s==="campaignid"||s==="id кампаний")return i;
      }
    } return 0;
  }
  function findIdCol(rows,hr){
    var h=rows[hr]||[],byName=colByName(h,/^\s*(id кампании|id|campaignid)\s*$/i);
    if(byName>=0)return byName;
    var cols=0; rows.forEach(function(r){if(r.length>cols)cols=r.length;});
    var best=0,bs=-1;
    for(var c=0;c<cols;c++){var sc=0;
      for(var r=hr+1;r<Math.min(rows.length,hr+50);r++) if(rows[r]&&Fmt.digits(rows[r][c]||"").length>=7)sc++;
      if(sc>bs){bs=sc;best=c;}}
    return best;
  }
  function describe(file,name,rows){
    var hr=findHeaderRow(rows),h=rows[hr]||[];
    return {file:file,name:name,rows:rows,headerRow:hr,idCol:findIdCol(rows,hr),
      loginCol:colByName(h,/логин|аккаунт/i),nameCol:colByName(h,/название/i),stratCol:colByName(h,/стратег/i)};
  }
  /* приоритет: «НОВАЯ»/«Итоговая» ≫ «тек.»/«по чеку»/«Ветка»/«кэф»/«Δ» */
  function parseIdList(raw){
    var seen={},out=[];
    (String(raw||"").match(/\d{5,}/g)||[]).forEach(function(id){ if(!seen[id]){seen[id]=1;out.push(id);} });
    return out;
  }
  return {parseCsvGrid:parseCsvGrid,describe:describe,findHeaderRow:findHeaderRow,findIdCol:findIdCol,
          colByName:colByName,parseIdList:parseIdList};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Sheet;
