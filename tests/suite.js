/* ══════════════════════════════════════════════════════════════════════════
   Набор проверок ядра — все кейсы из реальной практики.

   Запускается в двух средах:
     • Node   — tests/core.test.js (без xlsx: нужен браузерный API)
     • браузер — кнопка «самопроверка» в подвале приложения (полный набор)
   ══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Suite = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {

  /* модули берём из окружения: в Node их подкладывает раннер, в браузере — глобальные */
  function mods() {
    var g = (typeof globalThis !== "undefined" ? globalThis : this);
    return {Fmt: g.Fmt, Exp: g.Exp, Bank: g.Bank, Camps: g.Camps, Sheet: g.Sheet, Rules: g.Rules,
            Build: g.Build, Audit: g.Audit, Verify: g.Verify, Xlsx: g.Xlsx};
  }

  async function run(opts) {
    opts = opts || {};
    var withXlsx = opts.xlsx !== false && typeof CompressionStream !== "undefined";
    var M = mods();
    var Fmt = M.Fmt, Exp = M.Exp, Bank = M.Bank, Accounts = M.Bank, Camps = M.Camps, Sheet = M.Sheet, Rules = M.Rules,
        Build = M.Build, Audit = M.Audit, Verify = M.Verify, Xlsx = M.Xlsx;

  var L=[],ok=true,n=0;
  var cases=[];
  function eq(t,a,b){n++;var p=(a===b);if(!p)ok=false;cases.push({name:t,ok:p,got:a,want:b});L.push((p?"✓ ":"✗ ")+t+(p?"":"   получено="+a+" ожидалось="+b));}
  var BOM="﻿";
  var HDR='AccountID;AccountName;CampaignID;CampaignName;Размещение;"Название стратегии";GoalID;"Цели автостратегии";Value';
  function row(acc,an,cid,nm,pl,st,gid,gn,v){return '"=""'+acc+'""";'+an+';"=""'+cid+'""";'+nm+';'+pl+';"'+st+'";"=""'+gid+'""";"'+gn+'";'+v;}
  var EXPT=BOM+HDR+"\r\n"+
    row("900101","acc-media","800000001","camp_a","Поиск","Оптимизация конверсий, множественные цели","357428649","B2B заказ (полный доход)","227")+"\r\n"+
    row("900101","acc-media","800000001","camp_a","Поиск","Оптимизация конверсий, множественные цели","357428736","B2C и прочее заказ (полный доход)","68")+"\r\n"+
    row("900101","acc-media","800000001","camp_a","Поиск","Оптимизация конверсий, множественные цели","3000601598","Ecommerce: покупка","80,04")+"\r\n"+
    row("900102","demo-account-b2c","800000002","b2c_dsa_x","Поиск","Средняя цена конверсии","3000601598","Ecommerce: покупка","114,4")+"\r\n"+
    row("900103","acc-dsa","800000003","dsa_listing","Поиск","Оптимизация конверсий, множественные цели","13","Цель 13","6")+"\r\n";

  /* формат */
  eq("округление 0,5 вверх",Fmt.roundHalfUp(280.5),281);
  eq("округление 280,4",Fmt.roundHalfUp(280.4),280);
  eq("запятая",Fmt.num("294,03"),294.03);
  eq("неразрывный пробел",Fmt.num("1 500"),1500);
  eq("«без изменений»",Fmt.num("без изменений"),null);
  eq("#REF!",Fmt.num("#REF!"),null);
  eq("кавычки: пробел",Fmt.field("Ecommerce: покупка"),'"Ecommerce: покупка"');
  eq("кавычки: простое",Fmt.field("Поиск"),"Поиск");
  eq("кавычки: запятая",Fmt.field("Оптимизация конверсий, множественные цели"),'"Оптимизация конверсий, множественные цели"');
  eq("id-поле",Fmt.idField("900101"),'"=""900101"""');

  /* Excel пишет большие числа как "6.022736E7". Раньше digits() выкидывал точку
     и ID кампании превращался в 60227367 — правило не находило ни одной РК. */
  eq("экспонента: ID кампании",Fmt.digits("6.022736E7"),"60227360");
  eq("экспонента: длинный ID",Fmt.digits("1.09943306E8"),"109943306");
  eq("экспонента: дробь",Fmt.plain("2.9403E2"),"294.03");
  eq("экспонента: мелкое число",Fmt.plain("1.5E-3"),"0.0015");
  eq("экспонента: число как значение",Fmt.num("6.022736E7"),60227360);
  eq("обычный ID не тронут",Fmt.digits("60227360"),"60227360");
  eq("поле заливочного не тронуто",Fmt.digits('="336591"'),"336591");
  eq("запятая не тронута",Fmt.plain("294,03"),"294,03");

  /* заливочный */
  var e=Exp.parse(EXPT);
  eq("режим ставок",e.mode,"bids");
  eq("строк",e.rows.length,5);
  eq("целей из файла",e.goals.length,4);
  eq("подпись цели",e.goals[0].label,"B2B заказ (полный доход)");
  eq("аккаунт по логину",e.accounts["demo-account-b2c"],"900102");
  eq("размещение",e.place.search,"Поиск");

  /* подбор столбцов */
  var H=["Id кампании","Ставка b2b тек.","Ставка по чеку b2b","Ставка b2b НОВАЯ","Ветка b2b","Ср. чек b2b","Новая ставка Еком","Файл сейчас: b2b"];
  eq("заголовок в 3-й строке",Sheet.findHeaderRow([["x"],["y"],["Id кампании","z"],["1","2"]]),2);
  eq("список ID",Sheet.parseIdList("800000021\n800000022\t97172495, 800000021").join(","),"800000021,800000022,97172495");

  /* сценарий «дополнить» */
  var sh=Sheet.describe("f","Остальные",[["Id кампании","Название","Логин","Ставка b2b НОВАЯ","Ставка b2c НОВАЯ"],
    ["800000001","camp_a","acc-media","102","27,4"]]);
  var base={exp:e,sources:[sh],rules:[{name:"R1",sheet:0,useScope:false,scopeIds:[],map:{"357428649":3,"357428736":4}}],
    scenario:"update",onlyChanged:false,roundNew:true,roundAll:true,addMissing:false};
  var r1=Build.run(base),l1=r1.text.slice(1).split("\r\n");
  eq("BOM",r1.text.charCodeAt(0),0xFEFF);
  eq("дополнить: все строки",r1.stats.rowsOut,5);
  eq("b2b 227→102",l1[1].split(";").pop(),"102");
  eq("b2c 68→27",l1[2].split(";").pop(),"27");
  eq("еком 80,04→80",l1[3].split(";").pop(),"80");
  eq("префикс не тронут",l1[1].slice(0,l1[1].lastIndexOf(";")),EXPT.slice(1).split("\r\n")[1].replace(/;227$/,""));
  var a1=Audit.check(r1.text,e,r1.lut,base);
  eq("аудит: без провалов",a1.filter(function(x){return !x.ok&&x.lvl==="f";}).length,0);

  /* «новый файл» + список ID */
  var b2=Object.assign({},base,{scenario:"new",rules:[{name:"R1",sheet:0,useScope:true,scopeIds:["800000001"],map:{"357428649":3}}]});
  var r2=Build.run(b2);
  eq("новый: 1 кампания",r2.stats.campaigns,1);
  eq("новый: 3 строки",r2.stats.rowsOut,3);

  /* resolve() зовётся и при отрисовке: список «нет на листе» не должен копиться */
  var acc={name:"R",sheet:0,useScope:true,scopeIds:["800000001","999999999"],map:{"357428649":3}};
  Rules.resolve(e,[sh],[acc],{roundNew:true});
  Rules.resolve(e,[sh],[acc],{roundNew:true});
  Rules.resolve(e,[sh],[acc],{roundNew:true});
  eq("нет на листе: без накопления",(acc.notOnSheet||[]).join(","),"999999999");

  /* ID из экспоненциальной записи находится на листе */
  var shE=Sheet.describe("f","Экспонента",[["Id кампании","Название","Логин","Ставка"],
    ["8.00000001E8","camp_a","acc-media","102"]]);
  var rE=Rules.resolve(e,[shE],[{name:"R",sheet:0,useScope:true,scopeIds:["800000001"],map:{"357428649":3}}],{roundNew:true});
  eq("экспонента: ID совпал",rE.campaigns.join(","),"800000001");

  /* только изменённые */
  var r3=Build.run(Object.assign({},base,{scenario:"new",onlyChanged:true}));
  eq("только изменённые: 2 строки",r3.stats.rowsOut,2);

  /* два правила = два пула в один файл (ТОП-50 + B2C) */
  var shA=Sheet.describe("f","ТОП-50",[["Id кампании","Название","Логин","Новая ставка б2б"],["800000001","camp_a","acc-media","500"]]);
  var shB=Sheet.describe("f","B2C",[["Id кампании","Название","Логин","Ставка CPA НОВАЯ"],["800000002","b2c_dsa_x","demo-account-b2c","250"]]);
  var r4=Build.run({exp:e,sources:[shA,shB],
    rules:[{name:"ТОП-50",sheet:0,useScope:false,scopeIds:[],map:{"357428649":3}},
           {name:"B2C",sheet:1,useScope:false,scopeIds:[],map:{"3000601598":3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:false});
  eq("два правила: 2 кампании",r4.stats.campaigns,2);
  eq("два правила: b2b из листа А",r4.text.slice(1).split("\r\n")[1].split(";").pop(),"500");
  eq("два правила: ecom из листа Б",r4.text.slice(1).split("\r\n").filter(function(l){return l.indexOf("800000002")>=0;})[0].split(";").pop(),"250");

  /* конфликт правил */
  var shC=Sheet.describe("f","Дубль",[["Id кампании","Название","Логин","Новая ставка б2б"],["800000001","camp_a","acc-media","999"]]);
  var r5=Build.run({exp:e,sources:[shA,shC],
    rules:[{name:"A",sheet:0,useScope:false,scopeIds:[],map:{"357428649":3}},
           {name:"B",sheet:1,useScope:false,scopeIds:[],map:{"357428649":3}}],
    scenario:"update",onlyChanged:false,roundNew:true,roundAll:true,addMissing:false});
  eq("конфликт обнаружен",r5.issues.some(function(i){return /Конфликт правил/.test(i.title);}),true);

  /* КЛЮЧЕВОЕ: для ставок строки отсутствующим РК НЕ создаются */
  var shM=Sheet.describe("f","B2C",[["Id кампании","Название","Логин","Ставка CPA НОВАЯ"],
    ["800000013","b2c_dsa_new","demo-account-b2c","108"]]);
  var r6=Build.run({exp:e,sources:[shM],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{"3000601598":3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true});
  eq("ставки: строки НЕ созданы",r6.text.indexOf("800000013"),-1);
  eq("ставки: есть ошибка о перевыгрузке",r6.issues.some(function(i){return i.lvl==="err"&&/Нет в заливочном/.test(i.title);}),true);
  var a6=Audit.check(r6.text,e,r6.lut,{roundNew:true,addMissing:true});
  eq("аудит: выдуманных строк нет",a6.filter(function(x){return /выдуманных/.test(x.title)&&!x.ok;}).length,0);

  /* ставка есть, а цели у РК нет (кейс 800000003) */
  var shG=Sheet.describe("f","S",[["Id кампании","Название","Логин","Новая ставка апп-андроид"],
    ["800000003","dsa_listing","acc-dsa","102"]]);
  var r7=Build.run(Object.assign({},base,{sources:[shG],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{"1900001695":3}}]}));
  eq("предупреждение «нет такой цели»",r7.issues.some(function(i){return /нет такой цели/.test(i.title);}),true);
  eq("ничего не подставлено",r7.stats.inserted,0);

  /* значение, округляющееся в 0 */
  var shZ=Sheet.describe("f","S",[["Id кампании","Название","Логин","Новая ставка Еком"],["800000001","camp_a","acc-media","0,38"]]);
  var r8=Build.run(Object.assign({},base,{sources:[shZ],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{"3000601598":3}}]}));
  eq("ноль не проставлен",r8.stats.inserted,0);
  eq("пометка о пропуске",r8.issues.some(function(i){return /округляющихся в 0/.test(i.title);}),true);

  /* бюджеты */
  var BH='AccountID;AccountName;CampaignID;CampaignName;Размещение;"Название стратегии";Value';
  var BE=BOM+BH+"\r\n"+
    '"=""900103""";acc-dsa;"=""800000011""";dsa_a;поиск;"Оптимизация конверсий, множественные цели";20000'+"\r\n"+
    '"=""900102""";demo-account-b2c;"=""800000012""";b2c_b;поиск;"Средняя цена конверсии";7000'+"\r\n";
  var be=Exp.parse(BE);
  eq("режим бюджета",be.mode,"budget");
  eq("бюджет: размещение строчное",be.place.search,"поиск");
  var bs1=Sheet.describe("f","Остальные",[["Id кампании","Название","Логин","Бюджет (не меняем)"],
    ["800000011","dsa_a","acc-dsa","30000"],["999999999","x","acc-dsa","без изменений"]]);
  var bs2=Sheet.describe("f","B2C",[["Id кампании","Название","Логин","Бюджет (не меняем)"],
    ["800000012","b2c_b","demo-account-b2c","без изменений"]]);
  var rb=Build.run({exp:be,sources:[bs1,bs2],
    rules:[{name:"A",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}},{name:"B",sheet:1,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:true,roundNew:true,roundAll:true,addMissing:false});
  eq("бюджет: только изменённые = 1",rb.stats.rowsOut,1);
  eq("бюджет: 20000→30000",rb.text.slice(1).split("\r\n")[1].split(";").pop(),"30000");
  eq("«без изменений» не попал",rb.text.indexOf("800000012"),-1);

  /* Достройка отсутствующей РК. Строку берём ТОЛЬКО из настоящей выгрузки:
     аккаунт, размещение и стратегию из мастер-файла не вывести, а угаданную
     строку Оригами отбивает вместе со всем файлом. */
  var CL=String.fromCharCode(13,10);
  function brow(acc,an,cid,nm,pl,st,v){
    return '"=""'+acc+'""";'+an+';"=""'+cid+'""";'+nm+';'+pl+';"'+st+'";'+v; }
  var bs3=Sheet.describe("f","B2C",[["Id кампании","Название","Логин","Бюджет"],
    ["800000014","b2c_dsa_new","demo-account-b2c","14300"],["800000016","smart_net","demo-account-b2c","5000"]]);
  var planNo={exp:be,sources:[bs3],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,spares:[]};
  var rb2=Build.run(planNo);
  eq("без запасной выгрузки ничего не достроено",rb2.stats.constructed,0);
  eq("без запасной: ошибка о перевыгрузке",rb2.issues.some(function(i){return i.lvl==="err"&&/Нет в заливочном/.test(i.title);}),true);
  eq("без запасной: обе РК ушли на руки",rb2.manual.length,2);

  /* запасная выгрузка: настоящие строки тех же кампаний */
  var SPARE=BOM+BH+CL+
    brow("900102","demo-account-b2c","800000014","b2c_dsa_new","поиск","Средняя цена конверсии","9000")+CL+
    brow("900102","demo-account-b2c","800000016","smart_net","сети","Оптимизация конверсий, множественные цели","4000")+CL;
  var spare=Exp.parse(SPARE); spare.name="выгрузка от 31.08";
  var rb2b=Build.run(Object.assign({},planNo,{spares:[spare]}));
  eq("из запасной достроено 2",rb2b.stats.constructed,2);
  eq("из запасной: ничего не ушло на руки",rb2b.manual.length,0);
  var addedS=rb2b.text.slice(1).split(CL).filter(function(l){return l.indexOf("800000014")>=0;})[0];
  eq("из запасной: 7 полей",Fmt.parseLine(addedS).length,7);
  eq("из запасной: AccountID настоящий",Fmt.parseLine(addedS)[0],'="900102"');
  eq("из запасной: стратегия настоящая",Fmt.parseLine(addedS)[5],"Средняя цена конверсии");
  eq("из запасной: новое значение",Fmt.parseLine(addedS)[6],"14300");
  var addedN=rb2b.text.slice(1).split(CL).filter(function(l){return l.indexOf("800000016")>=0;})[0];
  eq("из запасной: размещение не угадано",Fmt.parseLine(addedN)[4],"сети");
  eq("из запасной: предупреждение о свежести",rb2b.issues.some(function(i){return /запасной выгрузки/.test(i.title);}),true);

  /* кампании нет вообще нигде — строку не выдумываем */
  var bs4=Sheet.describe("f","S",[["Id кампании","Название","Логин","Бюджет"],["800000015","dsa_x","demo-account-new","22000"]]);
  var rb3=Build.run({exp:be,sources:[bs4],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,spares:[spare]});
  eq("нет нигде — не достроено",rb3.stats.constructed,0);
  eq("нет нигде — выдуманных строк нет",rb3.text.indexOf("800000015"),-1);
  eq("нет нигде — ушло на руки",rb3.manual.length,1);

  /* ставки: строка цели из запасной выгрузки — настоящая, не выдуманная */
  var SPB=BOM+HDR+CL+
    row("900102","demo-account-b2c","800000013","b2c_dsa_new","Поиск","Средняя цена конверсии","3000601598","Ecommerce: покупка","95")+CL;
  var spb=Exp.parse(SPB); spb.name="старая выгрузка ставок";
  var r6b=Build.run({exp:e,sources:[shM],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{"3000601598":3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,spares:[spb]});
  eq("ставки: строка взята из запасной",r6b.stats.constructed,1);
  eq("ставки: цель не выдумана",Fmt.parseLine(r6b.text.slice(1).split(CL)[1])[6],'="3000601598"');

  /* справочник аккаунтов: подсказка, а не источник правды */
  eq("справочник: аккаунты заполнены",Bank.accounts>10,true);
  eq("справочник: цели заполнены",Bank.goals>10,true);
  eq("справочник: по логину",(Bank.find("pro-vseinstrumenti-b2b",null,null)||{}).id,"336594");
  eq("справочник: регистр не важен",(Bank.find("PRO-VseInstrumenti-DSA",null,null)||{}).id,"336585");
  eq("справочник: незнакомый логин",Bank.find("нет-такого-логина",null,null),null);
  eq("справочник: заливочный важнее",(Bank.find("acc-dsa",be,null)||{}).src,"exp");
  eq("справочник: выученное важнее книги",(Bank.find("pro-vseinstrumenti-b2b",null,{"pro-vseinstrumenti-b2b":"111"})||{}).id,"111");
  eq("справочник: пары из заливочного",Bank.harvest(be)["acc-dsa"],"900103");

  /* имена целей: выгрузка часто отдаёт безымянное «Цель N» */
  eq("цель: имя из выгрузки важнее",Bank.goal("3000601598","Ecommerce: покупка"),"Ecommerce: покупка");
  eq("цель: безымянную дополняем",Bank.goal("1900001695","Цель 1900001695"),"апп-андроид");
  eq("цель: пустую дополняем",Bank.goal("1900018239",""),"апп-айос");
  eq("цель: незнакомую не выдумываем",Bank.goal("999999999","Цель 999999999"),"Цель 999999999");
  eq("цель: имя из выгрузки для незнакомой",Bank.goal("999999999","Моя цель"),"Моя цель");

  /* еженедельная сверка справочника со свежей выгрузкой */
  var chk=Bank.check(e);
  eq("сверка: незнакомые аккаунты видны",chk.newAccounts.length>0,true);
  eq("сверка: ничего не меняет молча",typeof chk.okAccounts,"boolean");
  var chkSelf=Bank.check({accounts:{"pro-vseinstrumenti-b2b":"336594"},
    goals:[{id:"3000601598",label:"Ecommerce: покупка"}]});
  eq("сверка: знакомое не всплывает",chkSelf.newAccounts.length+chkSelf.newGoals.length,0);
  eq("сверка: знакомое без расхождений",chkSelf.okAccounts&&chkSelf.okGoals,true);
  var chkBad=Bank.check({accounts:{"pro-vseinstrumenti-b2b":"999999"},
    goals:[{id:"3000601598",label:"Другое имя"}]});
  eq("сверка: сменившийся AccountID замечен",chkBad.changedAccounts.length,1);
  eq("сверка: переименованная цель замечена",chkBad.changedGoals.length,1);

  /* ── справочник кампаний ── */
  eq("кампании: справочник заполнен",Camps.size>1000,true);
  eq("кампании: незнакомую не выдумываем",Camps.get("999999999999"),null);
  var anyCid=Object.keys(Camps.accounts).length&&"60227360";
  var known=Camps.get(anyCid);
  eq("кампании: запись читается",!!known,true);
  eq("кампании: логин на месте",/^pro-vseinstrumenti/.test(known.login),true);
  eq("кампании: размещение из двух вариантов",known.place==="поиск"||known.place==="сети",true);
  eq("кампании: стратегия не пустая",known.strategy.length>5,true);
  eq("кампании: цели массивом",Array.isArray(known.goals),true);
  eq("кампании: описание одной строкой",Camps.describe(anyCid).indexOf(known.login),0);
  eq("кампании: описание пустое для незнакомой",Camps.describe("999999999999"),"");

  /* сверка снимка с выгрузкой */
  var cmpSame=Camps.check(e);
  eq("сверка кампаний: чужие РК видны как новые",cmpSame.added.length>0,true);
  eq("сверка кампаний: ничего не правит молча",typeof cmpSame.ok,"boolean");
  var oneLine=BOM+HDR+CL+
    row(known.account,known.login,anyCid,known.name,known.place==="сети"?"Сеть":"Поиск",
        known.strategy,known.goals[0]||"3000601598","Ecommerce: покупка","100")+CL;
  var cmpOk=Camps.check(Exp.parse(oneLine));
  eq("сверка кампаний: знакомая РК без расхождений по стратегии",
     cmpOk.changed.filter(function(x){return x["что"]==="стратегия";}).length,0);
  eq("сверка кампаний: знакомая РК без расхождений по размещению",
     cmpOk.changed.filter(function(x){return x["что"]==="размещение";}).length,0);
  var drift=BOM+HDR+CL+
    row(known.account,known.login,anyCid,known.name,known.place==="сети"?"Поиск":"Сеть",
        "Средняя цена клика","3000601598","Ecommerce: покупка","100")+CL;
  var cmpBad=Camps.check(Exp.parse(drift));
  eq("сверка кампаний: смена стратегии замечена",
     cmpBad.changed.filter(function(x){return x["что"]==="стратегия";}).length,1);
  eq("сверка кампаний: смена размещения замечена",
     cmpBad.changed.filter(function(x){return x["что"]==="размещение";}).length,1);

  /* справочник кампаний НЕ участвует в сборке строк */
  var shKnown=Sheet.describe("f","S",[["Id кампании","Название","Логин","Бюджет"],[anyCid,"x","y","12345"]]);
  var rKnown=Build.run({exp:be,sources:[shKnown],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,spares:[]});
  eq("справочник кампаний не строит строк",rKnown.stats.constructed,0);
  eq("справочник кампаний: РК ушла на руки",rKnown.manual.length,1);
  eq("на руки: подсказка из справочника заполнена",rKnown.manual[0].known.length>10,true);

  /* имя цели доезжает до списка на ручную работу */
  eq("на руки: цель названа, а не «Цель N»",/^Цель\s/.test(r7.manual[0].target),false);

  /* ── злые случаи: то, что ломает файл, если не поймать ── */

  /* один и тот же ID дважды на листе — в файл идёт одна строка */
  var shDup=Sheet.describe("f","Дубли",[["Id кампании","Название","Логин","Бюджет"],
    ["800000011","dsa_a","acc-dsa","30000"],["800000011","dsa_a","acc-dsa","40000"]]);
  var rDup=Build.run({exp:be,sources:[shDup],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:true,roundNew:true,roundAll:true,addMissing:false,spares:[]});
  eq("дубль ID: одна строка",rDup.stats.rowsOut,1);
  eq("дубль ID: победило последнее",rDup.text.slice(1).split(CL)[1].split(";").pop(),"40000");

  /* мусор в списке ID не роняет сборку */
  var rTrash=Build.run({exp:be,sources:[bs1],
    rules:[{name:"R",sheet:0,useScope:true,scopeIds:["800000011","","abc","   ","0"],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:true,roundNew:true,roundAll:true,addMissing:false,spares:[]});
  eq("мусор в списке ID: собралось",rTrash.stats.rowsOut,1);

  /* запасная выгрузка чужого типа игнорируется */
  var rWrong=Build.run({exp:be,sources:[bs4],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,spares:[e]});
  eq("запасная чужого типа: ничего не достроено",rWrong.stats.constructed,0);
  eq("запасная чужого типа: ушло на руки",rWrong.manual.length,1);

  /* пустая запасная выгрузка */
  var spEmpty=Exp.parse(BOM+BH+CL); spEmpty.name="пустая";
  var rEmpty=Build.run({exp:be,sources:[bs4],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,spares:[spEmpty]});
  eq("пустая запасная: ничего не достроено",rEmpty.stats.constructed,0);

  /* столбец «не выбрано» (-1) ничего не подставляет */
  var rNoCol=Build.run({exp:be,sources:[bs1],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:-1}}],
    scenario:"new",onlyChanged:true,roundNew:true,roundAll:true,addMissing:false,spares:[]});
  eq("столбец не выбран: значений нет",rNoCol.stats.inserted,0);

  /* аудит знает про запасные и не считает их строки выдуманными */
  var aSpare=Audit.check(rb2b.text,be,rb2b.lut,Object.assign({},planNo,{spares:[spare]}));
  eq("аудит: строки из запасной не выдуманные",aSpare.filter(function(x){return !x.ok&&x.lvl==="f";}).length,0);
  eq("аудит: помечает, сколько взято из запасных",aSpare.some(function(x){return /из запасных выгрузок/.test(x.title);}),true);
  var aNoSpare=Audit.check(rb2b.text,be,rb2b.lut,Object.assign({},planNo,{spares:[]}));
  eq("аудит: без запасных те же строки — выдуманные",aNoSpare.filter(function(x){return !x.ok&&x.lvl==="f";}).length>0,true);

  /* «только строки с новым значением» работает и в сценарии «дополнить» */
  var rOc=Build.run(Object.assign({},base,{onlyChanged:true}));
  eq("дополнить + только новые: строк",rOc.stats.rowsOut,2);
  eq("дополнить + только новые: ничего не сохранено",rOc.stats.kept,0);
  eq("дополнить + только новые: подставлено",rOc.stats.inserted,2);

  /* список «сделать руками» — то, что заливочным не решается */
  eq("на руки: пусто, когда всё легло",r1.manual.length,0);
  eq("на руки: кампании нет ни в одной выгрузке",r6.manual.filter(function(x){return /ни в одной/.test(x.reason);}).length,1);
  eq("на руки: значение сохранено",r6.manual[0].value,108);
  eq("на руки: логин сохранён",r6.manual[0].login,"demo-account-b2c");
  eq("на руки: нет такой цели",r7.manual.filter(function(x){return /нет такой цели/.test(x.reason);}).length,1);
  eq("на руки: округляется в 0",r8.manual.filter(function(x){return /в 0/.test(x.reason);}).length,1);
  eq("на руки: нет ни в одной выгрузке",rb3.manual.filter(function(x){return /ни в одной/.test(x.reason);}).length,1);
  eq("на руки: цель названа по-человечески",r7.manual[0].target.length>4,true);

  /* сверка заливки */
  var fresh=Exp.parse(BOM+HDR+"\r\n"+
    row("900101","acc-media","800000001","camp_a","Поиск","strat","357428649","B2B","102")+"\r\n"+
    row("900101","acc-media","800000001","camp_a","Поиск","strat","357428736","B2C","68")+"\r\n");
  var uploaded=BOM+HDR+"\r\n"+
    row("900101","acc-media","800000001","camp_a","Поиск","strat","357428649","B2B","102")+"\r\n"+
    row("900101","acc-media","800000001","camp_a","Поиск","strat","357428736","B2C","27")+"\r\n"+
    row("900101","acc-media","999999999","camp_z","Поиск","strat","357428649","B2B","55")+"\r\n";
  var v=Verify.compare(fresh,uploaded);
  eq("сверка: совпало 1",v.ok,1);
  eq("сверка: не встало 1",v.bad.length,1);
  eq("сверка: нет в выгрузке 1",v.absent.length,1);
  eq("сверка: показано что заливали",v.bad[0].want,"27");
  eq("сверка: показано что сейчас",v.bad[0].got,"68");

  /* xlsx round-trip */
  if (withXlsx) {
    var crcT=(function(){var t=[];for(var n2=0;n2<256;n2++){var c=n2;for(var k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n2]=c>>>0;}return t;})();
    function crc32(b){var c=0xFFFFFFFF;for(var i=0;i<b.length;i++)c=crcT[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
    async function defl(b){var cs=new CompressionStream("deflate-raw");return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(cs)).arrayBuffer());}
    async function mk(entries){
      var enc=new TextEncoder(),parts=[],cen=[],off=0;
      for(var name in entries){
        var data=enc.encode(entries[name]),c=await defl(data),crc=crc32(data);
        var lh=new Uint8Array(30+name.length),dv=new DataView(lh.buffer);
        dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(8,8,true);
        dv.setUint32(14,crc,true);dv.setUint32(18,c.length,true);dv.setUint32(22,data.length,true);dv.setUint16(26,name.length,true);
        lh.set(enc.encode(name),30);parts.push(lh,c);
        var ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);
        cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(10,8,true);
        cv.setUint32(16,crc,true);cv.setUint32(20,c.length,true);cv.setUint32(24,data.length,true);
        cv.setUint16(28,name.length,true);cv.setUint32(42,off,true);ch.set(enc.encode(name),46);
        cen.push(ch);off+=lh.length+c.length;
      }
      var cd=0;cen.forEach(function(x){cd+=x.length;});
      var eo=new Uint8Array(22),ev=new DataView(eo.buffer);
      ev.setUint32(0,0x06054b50,true);ev.setUint16(8,cen.length,true);ev.setUint16(10,cen.length,true);
      ev.setUint32(12,cd,true);ev.setUint32(16,off,true);
      return await new Blob(parts.concat(cen,[eo])).arrayBuffer();
    }
    var NS='xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    var sheets=await Xlsx.read(await mk({
      "xl/sharedStrings.xml":'<?xml version="1.0"?><sst '+NS+'><si><t>Id кампании</t></si><si><t>Новая ставка б2б</t></si></sst>',
      "xl/workbook.xml":'<?xml version="1.0"?><workbook '+NS+' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="ТОП-50" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels":'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/worksheets/sheet1.xml":'<?xml version="1.0"?><worksheet '+NS+'><sheetData>'+
        '<row r="1"><c r="A1" t="str"><v>шапка</v></c></row><row r="2"><c r="A2" t="str"><v>период</v></c></row>'+
        '<row r="3"><c r="A3" t="s"><v>0</v></c><c r="B3" t="s"><v>1</v></c></row>'+
        '<row r="4"><c r="A4"><v>800000001</v></c><c r="B4"><v>735</v></c></row></sheetData></worksheet>'}));
    eq("xlsx: лист прочитан",sheets[0].name,"ТОП-50");
    var d=Sheet.describe("x",sheets[0].name,sheets[0].rows);
    eq("xlsx: заголовок в 3-й строке",d.headerRow,2);
    eq("xlsx: столбец ID",d.idCol,0);
    var r9=Build.run(Object.assign({},base,{sources:[d],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{"357428649":1}}]}));
    eq("xlsx: ставка подставлена",r9.text.slice(1).split("\r\n")[1].split(";").pop(),"735");
  }

    return {ok: ok, count: n, log: L.join("\n"), cases: cases};
  }

  return {run: run};
});
