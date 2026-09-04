/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 8 · Verify — сверка: что реально встало после заливки
   ══════════════════════════════════════════════════════════════════════════ */
var Verify=(function(){
  function compare(freshExp,uploadedText){
    var live=Exp.valueIndex(freshExp);
    var bom=uploadedText.charCodeAt(0)===0xFEFF,body=bom?uploadedText.slice(1):uploadedText;
    var eol=body.indexOf("\r\n")>=0?"\r\n":"\n";
    var lines=body.split(eol).filter(function(l){return l!=="";});
    var head=Fmt.parseLine(lines[0]);
    var C={camp:head.indexOf("CampaignID"),goal:head.indexOf("GoalID"),campName:head.indexOf("CampaignName"),
           goalName:head.indexOf("Цели автостратегии"),acc:head.indexOf("AccountID")};
    var okRows=[],bad=[],absent=[],byAcc={};
    for(var i=1;i<lines.length;i++){
      var f=Fmt.parseLine(lines[i]),sv=Fmt.splitVal(lines[i]);
      var cid=Fmt.digits(f[C.camp]||""),gid=C.goal>=0?Fmt.digits(f[C.goal]||""):"";
      var acc=Fmt.digits(f[C.acc]||"");
      var k=cid+"|"+gid, cur=live[k];
      var rec={cid:cid,gid:gid,name:f[C.campName],goal:C.goalName>=0?(typeof Bank!=="undefined"?Bank.goal(gid,f[C.goalName]):f[C.goalName]):"бюджет",want:sv.value,got:cur,acc:acc};
      byAcc[acc]=byAcc[acc]||{ok:0,bad:0,absent:0};
      if(cur===undefined){ absent.push(rec); byAcc[acc].absent++; }
      else if(Fmt.num(cur)===Fmt.num(sv.value)){ okRows.push(rec); byAcc[acc].ok++; }
      else { bad.push(rec); byAcc[acc].bad++; }
    }
    return {total:lines.length-1,ok:okRows.length,bad:bad,absent:absent,byAcc:byAcc};
  }
  return {compare:compare};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Verify;
