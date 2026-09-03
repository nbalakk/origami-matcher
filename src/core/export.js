/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 3 · Exp — разбор заливочного (истина о том, что можно менять)
   ══════════════════════════════════════════════════════════════════════════ */
var Exp=(function(){
  function parse(text){
    var bom=text.charCodeAt(0)===0xFEFF; if(bom)text=text.slice(1);
    var eol=text.indexOf("\r\n")>=0?"\r\n":"\n";
    var lines=text.split(eol),head=Fmt.parseLine(lines[0]);
    var C={acc:head.indexOf("AccountID"),accName:head.indexOf("AccountName"),camp:head.indexOf("CampaignID"),
      campName:head.indexOf("CampaignName"),place:head.indexOf("Размещение"),strat:head.indexOf("Название стратегии"),
      goal:head.indexOf("GoalID"),goalName:head.indexOf("Цели автостратегии"),val:head.length-1};
    var mode=C.goal>=0?"bids":"budget";
    var rows=[],goals=[],gSeen={},accounts={},places={},strats={},camps={},pairs={};
    for(var i=1;i<lines.length;i++){
      if(lines[i]==="")continue;
      var f=Fmt.parseLine(lines[i]);
      var cid=Fmt.digits(f[C.camp]||""),gid=C.goal>=0?Fmt.digits(f[C.goal]||""):"";
      rows.push({line:lines[i],cid:cid,gid:gid,f:f});
      camps[cid]=(camps[cid]||0)+1; pairs[cid+"|"+gid]=1;
      if(gid&&!gSeen[gid]){gSeen[gid]=1;goals.push({id:gid,label:(C.goalName>=0?f[C.goalName]:"")||("Цель "+gid)});}
      var an=f[C.accName]; if(an&&!accounts[an])accounts[an]=Fmt.digits(f[C.acc]||"");
      var p=f[C.place]; if(p)places[p]=(places[p]||0)+1;
      var s=f[C.strat]; if(s)strats[s]=(strats[s]||0)+1;
    }
    var search=null,net=null;
    Object.keys(places).forEach(function(p){ if(/поиск/i.test(p))search=p; if(/сет/i.test(p))net=p; });
    // если одного из вариантов в файле нет — берём регистр по имеющемуся
    var lower=function(s){ return s&&s[0]===s[0].toLowerCase(); };
    if(!net)  net  = lower(search)? "сети"  : "Сеть";
    if(!search)search= lower(net)  ? "поиск" : "Поиск";
    var stratList=Object.keys(strats).sort(function(a,b){return strats[b]-strats[a];});
    return {ok:C.camp>=0,bom:bom,eol:eol,header:lines[0],cols:head.length,C:C,mode:mode,rows:rows,goals:goals,
      campaigns:camps,pairs:pairs,accounts:accounts,place:{search:search,net:net},
      strategies:stratList,strategyTop:stratList[0]||""};
  }
  // индекс значений: campaign|goal -> value (для режима сверки)
  function valueIndex(e){
    var m={};
    e.rows.forEach(function(r){ m[r.cid+"|"+r.gid]=Fmt.splitVal(r.line).value; });
    return m;
  }
  return {parse:parse,valueIndex:valueIndex};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Exp;
