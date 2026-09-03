/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 5 · Rules — правила → карта значений (с источником и конфликтами)
   ══════════════════════════════════════════════════════════════════════════ */
var Rules=(function(){
  /* rule = {name, sheet:idx, scopeIds:[], useScope:bool, map:{goalId|BUDGET:col}} */
  function resolve(exp,sources,rules,opts){
    var lut={},src={},meta={},conflicts=[],skippedZero=0,scopeAll={},seenIds={};
    rules.forEach(function(rule,ri){
      var sh=sources[rule.sheet]; if(!sh)return;
      var scope=null;
      if(rule.useScope&&rule.scopeIds.length){ scope={}; rule.scopeIds.forEach(function(i){scope[i]=1;}); }
      for(var i=sh.headerRow+1;i<sh.rows.length;i++){
        var row=sh.rows[i]; if(!row)continue;
        var cid=Fmt.digits(row[sh.idCol]||""); if(!cid)continue;
        if(scope&&!scope[cid])continue;
        seenIds[cid]=1; scopeAll[cid]=1;
        if(!meta[cid])meta[cid]={
          name:sh.nameCol>=0?String(row[sh.nameCol]||""):"",
          login:sh.loginCol>=0?String(row[sh.loginCol]||"").trim():"",
          strat:sh.stratCol>=0?String(row[sh.stratCol]||"").trim():"",
          rule:rule.name};
        Object.keys(rule.map).forEach(function(key){
          var col=rule.map[key]; if(col===undefined||col<0)return;
          var raw=Fmt.num(row[col]); if(raw===null||raw<=0)return;
          var val=opts.roundNew?Fmt.roundHalfUp(raw):raw;
          if(val<=0){skippedZero++;return;}
          var k=cid+"|"+key,prev=lut[k];
          if(prev!==undefined&&prev!==val)
            conflicts.push({cid:cid,key:key,a:prev,aRule:src[k],b:val,bRule:rule.name});
          lut[k]=val; src[k]=rule.name;
        });
      }
      // ID из списка, которых нет на листе
      if(scope){
        rule.scopeIds.forEach(function(id){ if(!seenIds[id]) (rule.notOnSheet=rule.notOnSheet||[]).push(id); });
      }
    });
    return {lut:lut,src:src,meta:meta,conflicts:conflicts,skippedZero:skippedZero,
            campaigns:Object.keys(scopeAll)};
  }
  return {resolve:resolve};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Rules;
