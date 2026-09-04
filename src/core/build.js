/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 6 · Build — сборка файла
   ══════════════════════════════════════════════════════════════════════════ */
var Build=(function(){
  function run(plan){
    var exp=plan.exp,R=Rules.resolve(exp,plan.sources,plan.rules,plan),lut=R.lut;
    var issues=[],preview=[],manual=[],out=[exp.header];
    var glabel=function(g){ var l=(exp.goals.filter(function(x){return x.id===g;})[0]||{}).label;
      return typeof Bank!=='undefined'?Bank.goal(g,l):(l||g); };
    var mrow=function(cid,target,value,reason){ var m=R.meta[cid]||{};
      var known=typeof Camps!=='undefined'?Camps.get(cid):null;
      manual.push({cid:cid,login:m.login||(known?known.login:''),name:m.name||(known?known.name:''),
        target:target,value:value,reason:reason,
        known:known?(known.login+' · '+known.place+' · '+known.strategy+
          (known.goals.length?' · целей '+known.goals.length:' · целевых строк нет')):''}); };
    /* Заливочный — это список правок, и ничего кроме.
       Строка идёт в файл, только если правило дало ей значение И оно
       отличается от текущего. Оригами отбивает весь файл из-за одной плохой
       строки, поэтому строка, которая ничего не меняет, — чистый риск без
       выгоды: сервис всё равно засчитывает только реальные изменения.
       Совпавшие показываем отдельным списком, чтобы ничего не пропадало молча. */
    var roundNew=plan.roundNew!==false;
    var scope={}; R.campaigns.forEach(function(c){scope[c]=1;});
    var inScope=function(c){ return scope[c]===1; };
    var applied={},pairsDone={},nIns=0,same=[];

    exp.rows.forEach(function(r){
      var key=r.cid+"|"+(exp.mode==="bids"?r.gid:"BUDGET");
      var nv=lut[key];
      if(nv===undefined)return;
      pairsDone[key]=1;
      var sv=Fmt.splitVal(r.line),val=Fmt.out(nv,roundNew);
      if(val===sv.value){
        same.push(r.cid+(exp.mode==="bids"?("  ·  "+glabel(r.gid)):"")+"  =  "+val);
        return;
      }
      out.push(sv.prefix+";"+val); nIns++; applied[r.cid]=1;
      if(preview.length<80)preview.push({cid:r.cid,name:r.f[exp.C.campName],
        goal:exp.C.goalName>=0?glabel(r.gid):"бюджет",was:sv.value,now:val,kind:"chg"});
    });

    /* ---- кампании, которых нет в заливочном ----------------------------
       Строка собирается ТОЛЬКО из настоящей выгрузки: основной либо любой
       другой, загруженной как запасная. Ни аккаунт, ни размещение, ни
       стратегия не выводятся из названия — Оригами сверяет каждую строку
       с фактической автостратегией и отбивает файл целиком при расхождении.
       Чего нет ни в одной выгрузке — уходит в список на ручную работу. */
    var missing=R.campaigns.filter(function(c){ return !exp.campaigns[c] && Object.keys(lut).some(function(k){return k.indexOf(c+"|")===0;}); });
    var constructed=0,blocked=[],fromSpare=[];
    function spareRow(cid,gid){
      var list=plan.spares||[];
      for(var i=0;i<list.length;i++){
        var sp=list[i]; if(!sp||sp.mode!==exp.mode)continue;
        var hit=null;
        sp.rows.forEach(function(r){
          if(hit)return;
          if(r.cid!==cid)return;
          if(exp.mode==="bids"&&String(r.gid)!==String(gid))return;
          hit=r;
        });
        if(hit)return {row:hit,name:sp.name||("выгрузка "+(i+1))};
      }
      return null;
    }
    if(missing.length){
      missing.forEach(function(cid){
        var keys=Object.keys(lut).filter(function(k){return k.indexOf(cid+"|")===0;});
        var got=0;
        if(plan.addMissing){
          keys.forEach(function(k){
            var gid=k.split("|")[1];
            var sp=spareRow(cid,exp.mode==="bids"?gid:null);
            if(!sp)return;
            var sv=Fmt.splitVal(sp.row.line);
            out.push(sv.prefix+";"+Fmt.out(lut[k],roundNew));
            constructed++; got++; applied[cid]=1; pairsDone[k]=1;
            if(fromSpare.indexOf(sp.name)<0)fromSpare.push(sp.name);
            if(preview.length<80)preview.push({cid:cid,name:(R.meta[cid]||{}).name||"",
              goal:exp.mode==="bids"?glabel(gid):"бюджет",was:"—",now:Fmt.out(lut[k],roundNew),kind:"new"});
          });
        }
        if(got===keys.length)return;
        blocked.push(cid+"  "+((R.meta[cid]||{}).login||"")+"  "+((R.meta[cid]||{}).name||""));
        keys.forEach(function(k){
          if(pairsDone[k])return;
          mrow(cid,exp.mode==="bids"?glabel(k.split("|")[1]):"бюджет",lut[k],
               plan.addMissing?"нет ни в одной загруженной выгрузке":"кампании нет в заливочном");
        });
      });
      if(constructed)issues.push({lvl:"warn",title:"Строки взяты из запасной выгрузки: "+constructed,
        note:"Аккаунт, размещение и стратегия у них настоящие — из "+fromSpare.join(", ")+
             ". Но эта выгрузка может быть старше основной: если у кампании с тех пор сменили автостратегию, Оригами отобьёт весь файл. Надёжнее перевыгрузить заливочный так, чтобы эти кампании попали в него сами.",items:[]});
      if(blocked.length){
        var acc={};
        missing.forEach(function(c){ var lg=(R.meta[c]||{}).login||""; if(lg)acc[lg]=1; });
        var hint=Object.keys(acc).map(function(lg){
          var f=typeof Bank!=="undefined"?Bank.find(lg,exp,plan.accountBook):null;
          return lg+(f?" ("+f.id+")":"");}).join(", ");
        issues.push({lvl:"err",title:"Нет в заливочном: "+blocked.length+" РК — значения НЕ попадут в файл",
          note:(exp.mode==="bids"
            ? "Строки целей таким кампаниям не создаются: какие цели подключены — из мастер-файла не известно, а Оригами отбивает весь файл при несовпадении с автостратегией. "
            : "Строка не собирается: аккаунт, размещение и стратегия кампании из мастер-файла не известны, а угаданные Оригами отобьёт. ")+
            "Нужна перевыгрузка"+(hint?" по аккаунтам: "+hint:"")+" — либо загрузи запасную выгрузку, где эти кампании есть.",
          items:blocked});
      }
    }

    /* ---- значение есть, а строки-цели у существующей РК нет ---- */
    if(exp.mode==="bids"){
      var noRow=[];
      Object.keys(lut).forEach(function(k){
        var p=k.split("|"),cid=p[0],gid=p[1];
        if(!exp.campaigns[cid]||!inScope(cid)||pairsDone[k])return;
        var lb=glabel(gid);
        noRow.push(cid+"  ·  "+lb+" = "+lut[k]);
        mrow(cid,lb,lut[k],"у кампании нет такой цели в заливочном");
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
    /* ---- что уже стоит как надо ---- */
    if(same.length)issues.push({lvl:"info",
      title:"Уже стоит нужное значение: "+same.length+(exp.mode==="bids"?" строк":" кампаний"),
      note:"В файл не пошли — менять нечего. Оригами засчитывает только реальные изменения, "+
           "а лишняя строка может уронить всю заливку.",items:same.slice(0,400)});

    /* ---- ничего не собралось: чаще всего перепутаны файлы ---- */
    if(out.length-1===0){
      var inExp=R.campaigns.filter(function(c){return exp.campaigns[c];}).length;
      issues.push({lvl:same.length?"warn":"err",
        title:same.length?"Менять нечего — всё уже стоит как в мастер-файле":"В файл не попало ни одной строки",
        note: same.length
          ? ("Совпало "+same.length+" значений, и все они уже такие в заливочном. Файл заливать не нужно.")
          : (exp.blank
            ? ("Кампаний в правилах: "+R.campaigns.length+". Ни одной строки собрать не удалось — "+
               "проверь выбранный столбец со значениями.")
            : "Кампаний в правилах: "+R.campaigns.length+", из них есть в заливочном: "+inExp+"."+
              (inExp===0
                ? " Совпадений нет вообще — почти наверняка загружены несовместимые файлы: другой заливочный (другая дата или аккаунты), не тот лист, либо неверно определён столбец ID (проверь «Настройки листов»)."
                : " Проверь выбранный столбец со значениями.")),items:[]});
    }
    (R.zeros||[]).forEach(function(z){ if(inScope(z.cid))
      mrow(z.cid,z.key==="BUDGET"?"бюджет":glabel(z.key),z.raw,"округляется в 0 — целым не поставить"); });
    if(R.skippedZero)issues.push({lvl:"info",title:"Пропущено значений, округляющихся в 0: "+R.skippedZero,
      note:"Например 0,38 → 0. Такие значения не проставляются — строка остаётся с прежним.",items:[]});

    var text="﻿"+out.join(exp.eol)+exp.eol;
    var campSet={}; out.slice(1).forEach(function(l){ campSet[Fmt.digits(Fmt.parseLine(l)[exp.C.camp]||"")]=1; });
    return {text:text,issues:issues,preview:preview,manual:manual,lut:lut,meta:R.meta,
      stats:{rowsIn:exp.rows.length,rowsOut:out.length-1,campaigns:Object.keys(campSet).length,
        edits:out.length-1,same:same.length,constructed:constructed,
        sourceCampaigns:R.campaigns.length,missing:missing.length}};
  }
  return {run:run};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Build;
