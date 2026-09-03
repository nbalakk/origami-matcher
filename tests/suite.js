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
    return {Fmt: g.Fmt, Exp: g.Exp, Sheet: g.Sheet, Rules: g.Rules,
            Build: g.Build, Audit: g.Audit, Verify: g.Verify, Xlsx: g.Xlsx};
  }

  async function run(opts) {
    opts = opts || {};
    var withXlsx = opts.xlsx !== false && typeof CompressionStream !== "undefined";
    var M = mods();
    var Fmt = M.Fmt, Exp = M.Exp, Sheet = M.Sheet, Rules = M.Rules,
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
    scenario:"update",onlyChanged:false,roundNew:true,roundAll:true,addMissing:false,accountOverrides:{},strategyFor:""};
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

  /* только изменённые */
  var r3=Build.run(Object.assign({},base,{scenario:"new",onlyChanged:true}));
  eq("только изменённые: 2 строки",r3.stats.rowsOut,2);

  /* два правила = два пула в один файл (ТОП-50 + B2C) */
  var shA=Sheet.describe("f","ТОП-50",[["Id кампании","Название","Логин","Новая ставка б2б"],["800000001","camp_a","acc-media","500"]]);
  var shB=Sheet.describe("f","B2C",[["Id кампании","Название","Логин","Ставка CPA НОВАЯ"],["800000002","b2c_dsa_x","demo-account-b2c","250"]]);
  var r4=Build.run({exp:e,sources:[shA,shB],
    rules:[{name:"ТОП-50",sheet:0,useScope:false,scopeIds:[],map:{"357428649":3}},
           {name:"B2C",sheet:1,useScope:false,scopeIds:[],map:{"3000601598":3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:false,accountOverrides:{},strategyFor:""});
  eq("два правила: 2 кампании",r4.stats.campaigns,2);
  eq("два правила: b2b из листа А",r4.text.slice(1).split("\r\n")[1].split(";").pop(),"500");
  eq("два правила: ecom из листа Б",r4.text.slice(1).split("\r\n").filter(function(l){return l.indexOf("800000002")>=0;})[0].split(";").pop(),"250");

  /* конфликт правил */
  var shC=Sheet.describe("f","Дубль",[["Id кампании","Название","Логин","Новая ставка б2б"],["800000001","camp_a","acc-media","999"]]);
  var r5=Build.run({exp:e,sources:[shA,shC],
    rules:[{name:"A",sheet:0,useScope:false,scopeIds:[],map:{"357428649":3}},
           {name:"B",sheet:1,useScope:false,scopeIds:[],map:{"357428649":3}}],
    scenario:"update",onlyChanged:false,roundNew:true,roundAll:true,addMissing:false,accountOverrides:{},strategyFor:""});
  eq("конфликт обнаружен",r5.issues.some(function(i){return /Конфликт правил/.test(i.title);}),true);

  /* КЛЮЧЕВОЕ: для ставок строки отсутствующим РК НЕ создаются */
  var shM=Sheet.describe("f","B2C",[["Id кампании","Название","Логин","Ставка CPA НОВАЯ"],
    ["800000013","b2c_dsa_new","demo-account-b2c","108"]]);
  var r6=Build.run({exp:e,sources:[shM],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{"3000601598":3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,accountOverrides:{},strategyFor:""});
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
    scenario:"new",onlyChanged:true,roundNew:true,roundAll:true,addMissing:false,accountOverrides:{},strategyFor:""});
  eq("бюджет: только изменённые = 1",rb.stats.rowsOut,1);
  eq("бюджет: 20000→30000",rb.text.slice(1).split("\r\n")[1].split(";").pop(),"30000");
  eq("«без изменений» не попал",rb.text.indexOf("800000012"),-1);

  /* бюджет: достройка отсутствующей РК */
  var bs3=Sheet.describe("f","B2C",[["Id кампании","Название","Логин","Бюджет"],
    ["800000014","b2c_dsa_new","demo-account-b2c","14300"],["800000016","smart_net","demo-account-b2c","5000"]]);
  var rb2=Build.run({exp:be,sources:[bs3],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,accountOverrides:{},strategyFor:"Средняя цена конверсии"});
  eq("бюджет: добавлено 2 строки",rb2.stats.constructed,2);
  var added=rb2.text.slice(1).split("\r\n").filter(function(l){return l.indexOf("800000014")>=0;})[0];
  eq("бюджет: 7 полей",Fmt.parseLine(added).length,7);
  eq("бюджет: AccountID",Fmt.parseLine(added)[0],'="900102"');
  eq("бюджет: размещение поиск",Fmt.parseLine(added)[4],"поиск");
  var addedNet=rb2.text.slice(1).split("\r\n").filter(function(l){return l.indexOf("800000016")>=0;})[0];
  eq("бюджет: smart_ → сети",Fmt.parseLine(addedNet)[4],"сети");

  /* бюджет: неизвестный аккаунт (кейс autokat) */
  var bs4=Sheet.describe("f","S",[["Id кампании","Название","Логин","Бюджет"],["800000015","dsa_x","demo-account-new","22000"]]);
  var rb3=Build.run({exp:be,sources:[bs4],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,accountOverrides:{},strategyFor:""});
  eq("не добавлено без AccountID",rb3.stats.constructed,0);
  eq("ошибка про AccountID",rb3.issues.some(function(i){return i.lvl==="err"&&/AccountID/.test(i.title);}),true);
  var rb4=Build.run({exp:be,sources:[bs4],rules:[{name:"R",sheet:0,useScope:false,scopeIds:[],map:{BUDGET:3}}],
    scenario:"new",onlyChanged:false,roundNew:true,roundAll:true,addMissing:true,
    accountOverrides:{"demo-account-new":"900104"},strategyFor:""});
  eq("с ручным AccountID — добавлено",rb4.stats.constructed,1);

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
