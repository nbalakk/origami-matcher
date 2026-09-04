/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 2c · Camps — справочник кампаний

   Снимок того, что Оригами отдавало на дату сверки: у какой кампании какой
   аккаунт, размещение, автостратегия и какие цели подключены.

   Справочник НЕ используется для сборки строк. Строку берём только из
   выгрузки, которую загрузили сейчас: снимок может устареть, а Оригами
   отбивает весь файл при расхождении с фактической автостратегией.

   Он нужен для другого:
     • сказать, что вообще известно про кампанию, которой нет в выгрузке —
       из какого она аккаунта, что за размещение, какие цели;
     • поймать дрейф: сменилась стратегия, размещение, аккаунт или набор
       целей — это ровно то, из-за чего заливка отбивается.

   Пересобирается из свежих выгрузок:
       python tools/bank.py <goal_values.csv> <weekly_budgets.csv>
   Руками не правится — только генератором.
   ══════════════════════════════════════════════════════════════════════════ */
var Camps=(function(){
  var UPDATED="__UPDATED__";

  var ACCOUNTS={
    __ACCOUNTS__
  };

  var STRATS=[
    __STRATS__
  ];

  var GOALS=[
    __GOALS__
  ];

  /* «аккаунт,размещение,стратегия,цели|название»; размещение 0 — поиск, 1 — сети */
  var C={
__CAMPAIGNS__
  };

  var ACC_IDS=Object.keys(ACCOUNTS);

  function get(cid){
    var raw=C[String(cid==null?"":cid).trim()];
    if(!raw)return null;
    var cut=raw.indexOf("|"),head=raw.slice(0,cut),name=raw.slice(cut+1);
    var p=head.split(","),acc=ACC_IDS[+p[0]];
    return {cid:String(cid),account:acc,login:ACCOUNTS[acc],
            place:(+p[1])?"сети":"поиск",strategy:STRATS[+p[2]],
            goals:p[3]?p[3].split(".").map(function(i){return GOALS[+i];}):[],
            name:name};
  }

  /* Одной строкой — для списка на ручную работу и подсказок. */
  function describe(cid){
    var c=get(cid);
    if(!c)return "";
    return c.login+" · "+c.place+" · "+c.strategy+
      (c.goals.length?" · целей "+c.goals.length:" · целевых строк нет");
  }

  /* Сверка снимка со свежей выгрузкой. Ничего не меняет — только показывает,
     что разошлось. Цели сверяются лишь по выгрузке ставок: в бюджетной их нет. */
  function check(exp){
    if(!exp||!exp.rows)return null;
    var seen={},changed=[],added=[],bids=exp.mode==="bids";
    var now={};
    exp.rows.forEach(function(r){
      var f=r.f||Fmt.parseLine(r.line);
      var cur=now[r.cid]||(now[r.cid]={acc:Fmt.digits(f[exp.C.acc]||""),
        login:String(f[exp.C.accName]||"").trim(),
        place:/^сет/i.test(String(f[exp.C.place]||"").trim())?"сети":"поиск",
        strategy:String(f[exp.C.strat]||"").trim(),goals:{}});
      if(bids&&exp.C.goal>=0){var g=Fmt.digits(f[exp.C.goal]||"");if(g)cur.goals[g]=1;}
    });
    Object.keys(now).forEach(function(cid){
      seen[cid]=1;
      var was=get(cid),cur=now[cid];
      if(!was){ added.push({cid:cid,login:cur.login,strategy:cur.strategy}); return; }
      if(was.account!==cur.acc)changed.push({cid:cid,что:"аккаунт",было:was.login+" "+was.account,стало:cur.login+" "+cur.acc});
      if(was.place!==cur.place)changed.push({cid:cid,что:"размещение",было:was.place,стало:cur.place});
      if(was.strategy!==cur.strategy)changed.push({cid:cid,что:"стратегия",было:was.strategy,стало:cur.strategy});
      if(bids){
        var a=was.goals.slice().sort().join(","),b=Object.keys(cur.goals).sort().join(",");
        if(a!==b)changed.push({cid:cid,что:"цели",было:a||"нет",стало:b||"нет"});
      }
    });
    var gone=Object.keys(C).filter(function(c){return !seen[c];});
    return {updated:UPDATED,total:Object.keys(C).length,
            seen:Object.keys(seen).length,added:added,changed:changed,gone:gone,
            ok:!added.length&&!changed.length};
  }

  return {updated:UPDATED,get:get,describe:describe,check:check,
          size:Object.keys(C).length,
          strategies:STRATS.slice(),goals:GOALS.slice(),
          accounts:ACCOUNTS};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Camps;
