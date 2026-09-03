/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 6 · Build — сборка файла
   ══════════════════════════════════════════════════════════════════════════ */
var Build=(function(){
  function run(plan){
    var exp=plan.exp,R=Rules.resolve(exp,plan.sources,plan.rules,plan),lut=R.lut;
    var issues=[],preview=[],out=[exp.header];
    var scope=null;
    if(plan.scenario==="new"){ scope={}; R.campaigns.forEach(function(c){scope[c]=1;}); }
    var inScope=function(c){ return !scope||scope[c]===1; };
    var applied={},pairsDone={},nIns=0,nChg=0,nRnd=0,nKeep=0;

    exp.rows.forEach(function(r){
      if(!inScope(r.cid))return;
      var key=r.cid+"|"+(exp.mode==="bids"?r.gid:"BUDGET");
      var nv=lut[key];
      var sv=Fmt.splitVal(r.line);
      if(nv!==undefined){
        var s=Fmt.out(nv,plan.roundNew);
        out.push(sv.prefix+";"+s); nIns++; applied[r.cid]=1; pairsDone[key]=1;
        if(s!==sv.value){ nChg++; if(preview.length<80)preview.push({cid:r.cid,name:r.f[exp.C.campName],
          goal:exp.C.goalName>=0?r.f[exp.C.goalName]:"бюджет",was:sv.value,now:s,kind:"chg"}); }
      }else{
        if(plan.scenario==="new"&&plan.onlyChanged)return;
        var keep=sv.value;
        if(plan.roundAll){ var ov=Fmt.num(sv.value); if(ov!==null){ var rs=String(Fmt.roundHalfUp(ov)); if(rs!==sv.value)nRnd++; keep=rs; } }
        out.push(sv.prefix+";"+keep); nKeep++;
      }
    });

    /* ---- кампании, которых нет в заливочном ---- */
    var missing=R.campaigns.filter(function(c){ return !exp.campaigns[c] && Object.keys(lut).some(function(k){return k.indexOf(c+"|")===0;}); });
    var constructed=0,blocked=[];
    if(missing.length){
      if(exp.mode==="bids"){
        // НИКОГДА не создаём строки целей — цели кампании неизвестны
        issues.push({lvl:"err",title:"Нет в заливочном: "+missing.length+" РК — значения НЕ попадут в файл",
          note:"Для ставок строки таким кампаниям не создаются: какие цели у кампании — из отчёта не известно, а Оригами отбивает весь файл («цель не найдена в актуальной автостратегии»). Нужна перевыгрузка заливочного, чтобы эти РК в него попали.",
          items:missing.map(function(c){
            var vals=Object.keys(lut).filter(function(k){return k.indexOf(c+"|")===0;})
              .map(function(k){var g=k.split("|")[1];var lb=(exp.goals.filter(function(x){return x.id===g;})[0]||{}).label||g;return lb+"="+lut[k];});
            return c+"  "+((R.meta[c]||{}).name||"")+"   ["+vals.join("; ")+"]";})});
      }else if(plan.addMissing){
        missing.forEach(function(cid){
          var m=R.meta[cid]||{},login=m.login||"";
          var acc=(plan.accountOverrides&&plan.accountOverrides[login])||exp.accounts[login]||"";
          if(!acc){ blocked.push(cid+"  ("+(login||"логин не указан")+")  "+(m.name||"")); return; }
          var name=m.name||("Кампания "+cid);
          var place=/^(smart_|rsya_)/i.test(name)?exp.place.net:exp.place.search;
          var strat=plan.strategyFor||exp.strategyTop;
          var f=[Fmt.idField(acc),Fmt.field(login),Fmt.idField(cid),Fmt.field(name),Fmt.field(place),Fmt.field(strat),
                 Fmt.out(lut[cid+"|BUDGET"],plan.roundNew)];
          out.push(f.join(";")); constructed++; applied[cid]=1;
          if(preview.length<80)preview.push({cid:cid,name:name,goal:"бюджет",was:"—",now:f[6],kind:"new"});
        });
        if(blocked.length)issues.push({lvl:"err",title:"Не добавлены — неизвестен AccountID: "+blocked.length+" РК",
          note:"Аккаунта нет в заливочном. Впиши числовой ID в шаге 4 или перевыгрузи заливочный с этим аккаунтом.",items:blocked});
      }else{
        issues.push({lvl:"warn",title:"Нет в заливочном: "+missing.length+" РК",
          note:"Включи «Добавлять кампании, которых нет в заливочном», чтобы собрать для них строки.",
          items:missing.map(function(c){return c+"  "+((R.meta[c]||{}).name||"");})});
      }
    }

    /* ---- значение есть, а строки-цели у существующей РК нет ---- */
    if(exp.mode==="bids"){
      var noRow=[];
      Object.keys(lut).forEach(function(k){
        var p=k.split("|"),cid=p[0],gid=p[1];
        if(!exp.campaigns[cid]||!inScope(cid)||pairsDone[k])return;
        var lb=(exp.goals.filter(function(x){return x.id===gid;})[0]||{}).label||gid;
        noRow.push(cid+"  ·  "+lb+" = "+lut[k]);
      });
      if(noRow.length)issues.push({lvl:"warn",title:"У кампании нет такой цели в заливочном: "+noRow.length+" значений",
        note:"Строки для этих целей в заливочном отсутствуют — ставку положить некуда. Так бывает, когда цель не подключена к автостратегии кампании.",items:noRow});
    }
    /* ---- конфликты правил ---- */
    if(R.conflicts.length)issues.push({lvl:"err",title:"Конфликт правил: "+R.conflicts.length,
      note:"Одна и та же кампания и цель получают разные значения из разных правил. Победило последнее — проверь охват правил.",
      items:R.conflicts.map(function(c){return c.cid+" · цель "+c.key+": «"+c.aRule+"» дал "+c.a+", «"+c.bRule+"» дал "+c.b;})});
    /* ---- ID из списков, которых нет на листе ---- */
    plan.rules.forEach(function(r){
      if(r.notOnSheet&&r.notOnSheet.length)issues.push({lvl:"warn",title:"Правило «"+r.name+"»: ID нет на листе — "+r.notOnSheet.length,
        note:"Эти ID есть в твоём списке, но их нет в выбранном листе мастер-файла.",items:r.notOnSheet});
      r.notOnSheet=null;
    });
    /* ---- ничего не собралось: чаще всего перепутаны файлы ---- */
    if(out.length-1===0){
      var inExp=R.campaigns.filter(function(c){return exp.campaigns[c];}).length;
      issues.push({lvl:"err",title:"В файл не попало ни одной строки",
        note: exp.blank
          ? ("Кампаний в правилах: "+R.campaigns.length+". Ни одной строки собрать не удалось — "+
             "проверь выбранный столбец со значениями и заполни AccountID для аккаунтов из списка выше.")
          : "Кампаний в правилах: "+R.campaigns.length+", из них есть в заливочном: "+inExp+"."+
             (inExp===0
               ? " Совпадений нет вообще — почти наверняка загружены несовместимые файлы: другой заливочный (другая дата или аккаунты), не тот лист, либо неверно определён столбец ID (проверь «Настройки листов»)."
               : (plan.onlyChanged
                   ? " Совпадения есть, но ни у одной кампании нет нового значения — выключи «Только строки с новым значением» или проверь выбранный столбец."
                   : " Проверь выбранный столбец со значениями.")),items:[]});
    }
    if(R.skippedZero)issues.push({lvl:"info",title:"Пропущено значений, округляющихся в 0: "+R.skippedZero,
      note:"Например 0,38 → 0. Такие значения не проставляются — строка остаётся с прежним.",items:[]});

    var text="﻿"+out.join(exp.eol)+exp.eol;
    var campSet={}; out.slice(1).forEach(function(l){ campSet[Fmt.digits(Fmt.parseLine(l)[exp.C.camp]||"")]=1; });
    return {text:text,issues:issues,preview:preview,lut:lut,meta:R.meta,
      stats:{rowsIn:exp.rows.length,rowsOut:out.length-1,campaigns:Object.keys(campSet).length,
        inserted:nIns,changed:nChg,kept:nKeep,rounded:nRnd,constructed:constructed,
        sourceCampaigns:R.campaigns.length,missing:missing.length}};
  }
  return {run:run};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Build;
