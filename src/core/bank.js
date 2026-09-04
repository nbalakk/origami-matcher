/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 2b · Bank — справочник аккаунтов и целей

   Две вещи, которые из мастер-файла не выводятся, а знать их надо:

   • AccountID по логину — нужен, чтобы подсказать, какой аккаунт
     перевыгружать, когда кампании нет в заливочном;
   • имя цели — выгрузка часто отдаёт «Цель 1900001695» без названия,
     и специалисту непонятно, что это апп-андроид.

   Справочник — подсказка, а не источник правды: заливочный всегда важнее.
   Сверяется раз в неделю по свежей выгрузке через Bank.check().
   ══════════════════════════════════════════════════════════════════════════ */
var Bank=(function(){
  var UPDATED="2026-09-04";

  var ACCOUNTS={
    "pro-vseinstrumenti":"336570",
    "pro-vseinstrumenti-ank":"336596",
    "pro-vseinstrumenti-auto":"336576",
    "pro-vseinstrumenti-auto-2":"336587",
    "pro-vseinstrumenti-auto-rsya":"336577",
    "pro-vseinstrumenti-b2b":"336594",
    "pro-vseinstrumenti-b2c":"336595",
    "pro-vseinstrumenti-centr":"336571",
    "pro-vseinstrumenti-dsa":"336585",
    "pro-vseinstrumenti-media":"336591",
    "pro-vseinstrumenti-postavshik2":"336582",
    "pro-vseinstrumenti-postavshik3":"336583",
    "pro-vseinstrumenti-postavshiki":"336578",
    "pro-vseinstrumenti-rivals":"336589",
    "pro-vseinstrumenti-rsya2":"336581",
    "pro-vseinstrumenti-sz":"336575",
    "pro-vseinstrumenti-yug":"336572"
  };

  /* label — как цель называется в выгрузке; name — рабочее имя, если
     выгрузка отдаёт безымянное «Цель N». Имена не выдумываем: они
     проставлены только там, где известны из мастер-файла. */
  var GOALS={
    "3000601598":{label:"Ecommerce: покупка"},
    "357428649":{label:"B2B заказ (полный доход)"},
    "357428736":{label:"B2C и прочее заказ (полный доход)"},
    "354427177":{label:"Первый заказ b2b"},
    "453443948":{label:"Первый заказ b2c"},
    "349784738":{label:"B2B заказ (скорр. доход)"},
    "194353513":{label:"Ecommerce: добавление в корзину"},
    "139518":{label:"Корзина"},
    "1107811":{label:"Корзина"},
    "77426224":{label:"Клик на позвонить - ВсеИнструменты.ру"},
    "562652790":{label:"B2B заказ 2h"},
    "562653386":{label:"B2C и прочее заказ 2h"},
    "562653860":{label:"B2B заказ 7d"},
    "562654489":{label:"B2C и прочее заказ 7d"},
    "546708703":{label:"purchase_aov_10"},
    "546708530":{label:"purchase_aov_5"},
    "564535328":{label:"Яндекс форма отправить"},
    "44209046":{label:"Ценность_3"},
    /* встречаются в выгрузках, но выгрузка не отдаёт им имени —
       пока не назовём, показываются как «Цель N» */
    "13":{label:""},
    "1420261":{label:""},
    "1900000449":{label:""},
    "1900001695":{label:"",name:"апп-андроид"},
    "1900018239":{label:"",name:"апп-айос"}
  };

  function norm(s){ return String(s==null?"":s).trim().toLowerCase(); }
  function noName(s){ return !s||/^Цель\s+\d+$/i.test(String(s).trim()); }

  /* Номер аккаунта. Заливочный важнее всего, дальше — выученное, дальше книга. */
  function find(login,exp,learned){
    var lg=norm(login);
    if(!lg)return null;
    var byExp=exp&&exp.accounts?exp.accounts[String(login).trim()]:null;
    if(byExp)return {id:byExp,src:"exp",note:"из заливочного"};
    if(learned&&learned[lg])return {id:learned[lg],src:"learned",note:"из прошлых заливочных"};
    if(ACCOUNTS[lg])return {id:ACCOUNTS[lg],src:"book",note:"из справочника"};
    return null;
  }

  /* Человеческое имя цели: из выгрузки, если оно там есть, иначе из справочника. */
  function goal(id,fromExport){
    var g=GOALS[String(id)];
    if(!noName(fromExport))return String(fromExport);
    if(g&&g.name)return g.name;
    if(g&&g.label)return g.label;
    return fromExport||("цель "+id);
  }

  function harvest(exp){
    var out={};
    if(exp&&exp.accounts)for(var k in exp.accounts){
      var id=exp.accounts[k],lg=norm(k);
      if(lg&&id)out[lg]=id;
    }
    return out;
  }

  function merge(a,b){ var o={},k;
    for(k in (a||{}))o[k]=a[k];
    for(k in (b||{}))o[k]=b[k];
    return o; }

  /* Еженедельная сверка со свежей выгрузкой. Ничего не меняет — только
     показывает расхождения, чтобы справочник поправили руками. */
  function check(exp){
    var newAcc=[],changedAcc=[],newGoal=[],changedGoal=[],seenAcc={},seenGoal={};
    if(exp&&exp.accounts)Object.keys(exp.accounts).forEach(function(lg){
      var id=exp.accounts[lg],k=norm(lg); if(!k||!id)return;
      seenAcc[k]=1;
      if(!ACCOUNTS[k])newAcc.push({login:lg,id:id});
      else if(ACCOUNTS[k]!==id)changedAcc.push({login:lg,was:ACCOUNTS[k],now:id});
    });
    (exp&&exp.goals?exp.goals:[]).forEach(function(g){
      var id=String(g.id); if(!id)return;
      seenGoal[id]=1;
      var b=GOALS[id];
      if(!b){ newGoal.push({id:id,label:g.label}); return; }
      if(!noName(g.label)&&b.label&&b.label!==g.label)
        changedGoal.push({id:id,was:b.label,now:g.label});
    });
    return {updated:UPDATED,
      newAccounts:newAcc,changedAccounts:changedAcc,
      newGoals:newGoal,changedGoals:changedGoal,
      unseenAccounts:Object.keys(ACCOUNTS).filter(function(k){return !seenAcc[k];}),
      unseenGoals:Object.keys(GOALS).filter(function(k){return !seenGoal[k];}),
      okAccounts:!newAcc.length&&!changedAcc.length,
      okGoals:!newGoal.length&&!changedGoal.length};
  }

  function accountList(){ return Object.keys(ACCOUNTS).sort().map(function(k){return {login:k,id:ACCOUNTS[k]};}); }
  function goalList(){ return Object.keys(GOALS).map(function(k){
    return {id:k,label:GOALS[k].label,name:GOALS[k].name||""};}); }

  return {updated:UPDATED,find:find,goal:goal,harvest:harvest,merge:merge,check:check,
          accountList:accountList,goalList:goalList,
          accounts:Object.keys(ACCOUNTS).length,goals:Object.keys(GOALS).length};
})();

/* совместимость: справочник раньше назывался Accounts */
var Accounts=Bank;

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Bank;
