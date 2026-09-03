/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 9 · UI
   ══════════════════════════════════════════════════════════════════════════ */
var VERSION="v3.0";
var S={exp:null,csvName:"",sources:[],rules:[],scenario:"update",result:null,audit:null,addMissing:false,
        v1:null,v2:null,v2name:""};
var $=function(i){return document.getElementById(i);};
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function show(id,on){ $(id).classList.toggle("off",!on); }
$("ver").textContent=VERSION;

document.querySelectorAll(".tab").forEach(function(t){
  t.addEventListener("click",function(){
    document.querySelectorAll(".tab").forEach(function(x){x.classList.toggle("on",x===t);});
    ["build","verify","help"].forEach(function(n){ $("tab-"+n).classList.toggle("hide",n!==t.dataset.tab); });
  });
});
function wireDrop(dropId,inputId,cb){
  var d=$(dropId),f=$(inputId);
  d.addEventListener("click",function(){f.click();});
  ["dragenter","dragover"].forEach(function(e){d.addEventListener(e,function(ev){ev.preventDefault();d.classList.add("hot");});});
  ["dragleave","drop"].forEach(function(e){d.addEventListener(e,function(ev){ev.preventDefault();d.classList.remove("hot");});});
  d.addEventListener("drop",function(ev){ev.preventDefault();cb(ev.dataTransfer.files);});
  f.addEventListener("change",function(){cb(f.files);f.value="";});
}
function readText(file,cb){ var r=new FileReader(); r.onload=function(){cb(r.result);}; r.readAsText(file,"utf-8"); }

/* ---------- шаг 1 ---------- */
wireDrop("dropCsv","fileCsv",function(files){
  var file=files[0]; if(!file)return; S.csvName=file.name;
  readText(file,function(txt){
    var e=Exp.parse(txt);
    if(!e.ok){ $("csvInfo").innerHTML='<div class="box err">Нет колонки <b>CampaignID</b> — это точно заливочный из Оригами?</div>'; return; }
    S.exp=e; S.rules=[];
    $("csvInfo").innerHTML='<div class="box ok"><b>'+esc(file.name)+'</b><br><span class="pill">'+
      (e.mode==="bids"?"Ставки по целям":"Недельные бюджеты")+'</span> · строк <b>'+e.rows.length+'</b> · кампаний <b>'+
      Object.keys(e.campaigns).length+'</b>'+(e.mode==="bids"?' · целей <b>'+e.goals.length+'</b>':'')+
      ' · аккаунтов <b>'+Object.keys(e.accounts).length+'</b></div>';
    show("c2",true); show("c3",true); show("c4",true); show("c5",true);
    if(S.sources.length&&!S.rules.length)addRule();
    renderRules(); renderMiss(); ready();
  });
});


/* ---------- шаг 2 ---------- */
wireDrop("dropSrc","fileSrc",function(files){ Array.prototype.forEach.call(files,loadSrc); });
/* ---------- загрузка мастер-файла ----------
   Большой xlsx (десятки листов) читается в два приёма: сначала только
   оглавление, потом — выбранные листы, с прогрессом и без подвисаний. */
var pane=function(){ return $("srcPane"); };
function paneShow(html){ pane().innerHTML=html; pane().classList.remove("hide"); }
function paneHide(){ pane().classList.add("hide"); pane().innerHTML=""; }
var breathe=function(){ return new Promise(function(r){ setTimeout(r,0); }); };

function loadSrc(file){
  var n=file.name.toLowerCase();
  if(n.endsWith(".csv")){
    paneShow('<div class="box info small">Читаю <b>'+esc(file.name)+'</b>…</div>');
    readText(file,function(t){ paneHide(); addSheet(file.name,file.name,Sheet.parseCsvGrid(t)); });
    return;
  }
  paneShow('<div class="box info small">Открываю <b>'+esc(file.name)+'</b>…</div>');
  var r=new FileReader();
  r.onerror=function(){ paneShow('<div class="box err small">Не удалось прочитать файл.</div>'); };
  r.onload=async function(){
    try{
      var wb=await Xlsx.open(r.result);
      pickSheets(file.name,wb);
    }catch(e){
      paneShow('<div class="box err small">Не удалось прочитать xlsx: '+esc(e.message)+
               '<br>Сохрани нужный лист как CSV и загрузи его.</div>');
    }
  };
  r.readAsArrayBuffer(file);
}

/* выбор листов */
function pickSheets(fileName,wb){
  var loaded={};
  S.sources.forEach(function(s){ if(s.file===fileName)loaded[s.name]=1; });
  var h='<div class="pick"><div class="ph"><b>'+esc(fileName)+'</b>'+
        '<span class="muted small">листов: '+wb.sheets.length+'</span></div>'+
        '<input type="text" id="pickFilter" placeholder="фильтр по названию листа" style="margin-bottom:8px">'+
        '<div class="plist" id="pickList">';
  wb.sheets.forEach(function(name,i){
    var was=loaded[name];
    h+='<label class="pitem'+(was?' used':'')+'" data-name="'+esc(name.toLowerCase())+'">'+
       '<input type="checkbox" value="'+i+'"'+(was?' disabled':'')+'> <span>'+esc(name)+
       (was?' <span class="muted small">— уже загружен</span>':'')+'</span></label>';
  });
  h+='</div><div class="pf"><button id="pickGo" class="btn mini" disabled>Загрузить</button>'+
     '<button id="pickCancel" class="btn sec mini">Отмена</button>'+
     '<span class="muted small" id="pickCount">ничего не выбрано</span></div></div>';
  paneShow(h);

  var list=$("pickList"), go=$("pickGo");
  function sync(){
    var n=list.querySelectorAll("input:checked").length;
    go.disabled=!n;
    $("pickCount").textContent=n?("выбрано: "+n):"ничего не выбрано";
  }
  list.addEventListener("change",sync);
  $("pickFilter").addEventListener("input",function(){
    var q=this.value.trim().toLowerCase();
    list.querySelectorAll(".pitem").forEach(function(el){
      el.classList.toggle("hide", q && el.dataset.name.indexOf(q)<0);
    });
  });
  $("pickCancel").addEventListener("click",paneHide);
  go.addEventListener("click",async function(){
    var picked=[].map.call(list.querySelectorAll("input:checked"),function(c){return {i:+c.value,name:wb.sheets[+c.value]};});
    for(var k=0;k<picked.length;k++){
      paneShow('<div class="box info small"><b>Читаю листы…</b> '+(k+1)+' из '+picked.length+
               ' · <span class="muted">'+esc(picked[k].name)+'</span>'+
               '<div class="bar"><i style="width:'+Math.round(k/picked.length*100)+'%"></i></div></div>');
      await breathe();
      try{
        var rows=await wb.sheet(picked[k].i);
        if(rows.length>1)addSheet(fileName,picked[k].name,rows);
      }catch(e){ /* пропускаем нечитаемый лист */ }
    }
    paneHide();
  });
}
function addSheet(file,name,rows){
  S.sources.push(Sheet.describe(file,name,rows));
  renderFiles();
  if(S.exp&&!S.rules.length)addRule();
  renderRules(); renderMiss(); ready();
}
function renderFiles(){
  $("files").innerHTML=S.sources.map(function(s,i){
    return '<div class="fitem"><span>📄 <b>'+esc(s.name)+'</b> <span class="muted">· '+Math.max(0,s.rows.length-s.headerRow-1)+' строк · '+esc(s.file)+'</span></span><button class="rmv" data-i="'+i+'">убрать ✕</button></div>';
  }).join("");
  $("files").querySelectorAll("[data-i]").forEach(function(b){b.addEventListener("click",function(){
    var i=+b.dataset.i; S.sources.splice(i,1);
    S.rules=S.rules.filter(function(r){return r.sheet!==i;}).map(function(r){ if(r.sheet>i)r.sheet--; return r; });
    renderFiles(); renderRules(); renderMiss(); ready();
  });});
}

/* ---------- шаг 3: правила ---------- */
$("addRule").addEventListener("click",function(){ addRule(); renderRules(); ready(); });
function addRule(){
  if(!S.exp||!S.sources.length)return;
  var si=Math.min(S.rules.length,S.sources.length-1);
  var r={name:S.sources[si].name,sheet:si,useScope:false,scopeIds:[],map:{}};
  autoMapRule(r); S.rules.push(r);
}
function autoMapRule(r){
  var sh=S.sources[r.sheet]; if(!sh)return; var h=sh.rows[sh.headerRow]||[];
  r.map={};
  if(S.exp.mode==="bids") S.exp.goals.forEach(function(g){ var c=Sheet.guessGoalCol(h,g.id); if(c>=0)r.map[g.id]=c; });
  else { var c=Sheet.guessBudgetCol(h); if(c>=0)r.map.BUDGET=c; }
}
function colOptions(si,sel){
  var s=S.sources[si]; if(!s)return '<option value="-1">—</option>';
  var h=s.rows[s.headerRow]||[],cols=0; s.rows.forEach(function(r){if(r.length>cols)cols=r.length;});
  var o='<option value="-1">— не заливать —</option>';
  for(var i=0;i<cols;i++){
    var nm=(h[i]!==undefined&&String(h[i]).trim()!=="")?String(h[i]):("столбец "+Xlsx.colLetter(i));
    o+='<option value="'+i+'"'+(sel===i?' selected':'')+'>'+esc(nm)+'  ['+Xlsx.colLetter(i)+']</option>';
  }
  return o;
}
/* Сколько кампаний правила реально есть в заливочном — сразу видно,
   если перепутаны файлы, дата выгрузки или столбец ID. */
function ruleMatch(r){
  var sh=S.sources[r.sheet]; if(!sh||!S.exp)return null;
  var scope=null;
  if(r.useScope&&r.scopeIds.length){ scope={}; r.scopeIds.forEach(function(i){scope[i]=1;}); }
  var total=0,inExp=0,withVal=0,valIn=0;
  var cols=[]; for(var k in r.map){ if(r.map[k]>=0)cols.push(r.map[k]); }
  for(var i=sh.headerRow+1;i<sh.rows.length;i++){
    var row=sh.rows[i]; if(!row)continue;
    var cid=Fmt.digits(row[sh.idCol]||""); if(!cid)continue;
    if(scope&&!scope[cid])continue;
    total++;
    var has=cols.some(function(c){ var v=Fmt.num(row[c]); return v!==null&&v>0&&Fmt.roundHalfUp(v)>0; });
    if(has)withVal++;
    if(S.exp.campaigns[cid]){ inExp++; if(has)valIn++; }
  }
  return {total:total,inExp:inExp,withVal:withVal,valIn:valIn};
}
function addMissingOn(){ return !!S.addMissing; }
/* если лист правила не совпал — ищем среди загруженных тот, что совпадает лучше всех */
function bestSheet(exceptIdx){
  if(!S.exp)return null;
  var best=null;
  S.sources.forEach(function(sh,i){
    if(i===exceptIdx)return;
    var hit=0;
    for(var r=sh.headerRow+1;r<sh.rows.length;r++){
      var row=sh.rows[r]; if(!row)continue;
      var cid=Fmt.digits(row[sh.idCol]||"");
      if(cid&&S.exp.campaigns[cid])hit++;
    }
    if(hit>0&&(!best||hit>best.hit))best={name:sh.name,hit:hit,i:i};
  });
  return best;
}
function matchInfo(r){
  var m=ruleMatch(r);
  if(!m)return '<span class="muted small">—</span>';
  var addable = S.exp && S.exp.mode==="budget";
  var cls = (m.withVal===0) ? "warn"
          : (m.valIn===m.withVal) ? "ok"
          : (addable ? (addMissingOn()?"ok":"warn") : (m.valIn===0?"err":"warn"));
  var txt='кампаний в правиле: <b>'+m.total+'</b> · со значением: <b>'+m.withVal+
          '</b> · <b>из них есть в заливочном: '+m.valIn+'</b>';
  var canAdd = S.exp && S.exp.mode==="budget";        // строки можно собрать заново только для бюджетов
  var absent = m.withVal-m.valIn;
  if(m.valIn===0){
    if(canAdd){
      txt+='<br>В заливочном этих кампаний нет — <b>'+m.withVal+'</b> строк будут собраны заново'+
           (addMissingOn()?'.':', если включить «Добавлять кампании, которых нет в заливочном» ниже.');
    }else{
      txt+='<br>Ни одна кампания со значением не найдена в заливочном.';
      var better=bestSheet(r.sheet);
      if(better) txt+=' <b>Похоже, нужен лист «'+esc(better.name)+'»</b> — его кампании есть в заливочном ('+better.hit+' шт.).';
      else txt+=' Проверь: тот ли заливочный (дата, аккаунты), тот ли лист и правильный ли столбец ID в «Настройках листов».';
    }
  }
  else if(absent>0){
    txt+='<br>'+absent+' кампаний нет в заливочном — '+
         (canAdd
           ? (addMissingOn()?'будут добавлены новыми строками.':'включи «Добавлять кампании…» ниже, иначе они не попадут в файл.')
           : 'для них значения не попадут в файл.');
  }
  return '<div class="box '+cls+' small" style="margin:0">'+txt+'</div>';
}

function renderRules(){
  var host=$("rules"); if(!S.exp){host.innerHTML="";return;}
  if(!S.sources.length){ host.innerHTML='<p class="muted small">Сначала загрузи мастер-файл (шаг 2).</p>'; return; }
  host.innerHTML=S.rules.map(function(r,ri){
    var keys=S.exp.mode==="bids"?S.exp.goals:[{id:"BUDGET",label:"Недельный бюджет"}];
    var h='<div class="rule"><div class="rh"><b>Правило '+(ri+1)+'</b>'+
      '<button class="rmv" data-rm="'+ri+'">удалить ✕</button></div>';
    h+='<table class="t"><tr><th style="width:26%">Лист</th><td><select data-sheet="'+ri+'">'+
      S.sources.map(function(s,i){return '<option value="'+i+'"'+(i===r.sheet?' selected':'')+'>'+esc(s.name)+'</option>';}).join("")+
      '</select></td></tr>'+
      '<tr><th>Охват</th><td><label class="opt small" style="padding:2px 0"><input type="radio" name="sc'+ri+'" data-scope="'+ri+'" value="all"'+(r.useScope?'':' checked')+'> все РК из листа</label>'+
      '<label class="opt small" style="padding:2px 0"><input type="radio" name="sc'+ri+'" data-scope="'+ri+'" value="ids"'+(r.useScope?' checked':'')+'> только по списку ID</label>'+
      '<textarea data-ids="'+ri+'" class="'+(r.useScope?'':'hide')+'" placeholder="вставь столбец ID из Excel">'+esc(r.scopeIds.join("\n"))+'</textarea>'+
      '<div class="small muted" data-idsinfo="'+ri+'"></div></td></tr>'+
      '<tr><th>Совпадение</th><td>'+matchInfo(r)+'</td></tr></table>';
    h+='<table class="t" style="margin-top:6px"><tr><th style="width:40%">'+(S.exp.mode==="bids"?"Цель в заливочном":"Значение")+'</th><th>Столбец листа</th></tr>';
    keys.forEach(function(g){
      h+='<tr><td class="k">'+esc(g.label)+'</td><td><select data-col="'+ri+'|'+g.id+'">'+colOptions(r.sheet,r.map[g.id]!==undefined?r.map[g.id]:-1)+'</select></td></tr>';
    });
    h+='</table></div>';
    return h;
  }).join("");

  host.querySelectorAll("[data-rm]").forEach(function(b){b.addEventListener("click",function(){
    S.rules.splice(+b.dataset.rm,1); renderRules(); renderMiss(); ready(); });});
  host.querySelectorAll("[data-sheet]").forEach(function(s){s.addEventListener("change",function(){
    var r=S.rules[+s.dataset.sheet]; r.sheet=+s.value; r.name=S.sources[r.sheet].name; autoMapRule(r);
    renderRules(); renderMiss(); ready(); });});
  host.querySelectorAll("[data-scope]").forEach(function(el){el.addEventListener("change",function(){
    var r=S.rules[+el.dataset.scope]; r.useScope=(el.value==="ids");
    host.querySelector('[data-ids="'+el.dataset.scope+'"]').classList.toggle("hide",!r.useScope);
    renderMiss(); ready(); });});
  host.querySelectorAll("[data-ids]").forEach(function(t){t.addEventListener("input",function(){
    var ri=+t.dataset.ids,r=S.rules[ri]; r.scopeIds=Sheet.parseIdList(t.value);
    var inExp=r.scopeIds.filter(function(i){return S.exp.campaigns[i];}).length;
    host.querySelector('[data-idsinfo="'+ri+'"]').innerHTML=r.scopeIds.length?
      ('ID: <b>'+r.scopeIds.length+'</b> · есть в заливочном: <b>'+inExp+'</b> · нет: <b>'+(r.scopeIds.length-inExp)+'</b>'):'';
    renderMiss(); ready(); });});
  host.querySelectorAll("[data-col]").forEach(function(s){s.addEventListener("change",function(){
    var p=s.dataset.col.split("|"),r=S.rules[+p[0]],v=+s.value;
    if(v<0)delete r.map[p[1]]; else r.map[p[1]]=v;
    renderMiss(); ready(); });});
  // проставить info по ID
  S.rules.forEach(function(r,ri){
    var el=host.querySelector('[data-idsinfo="'+ri+'"]'); if(!el||!r.scopeIds.length)return;
    var inExp=r.scopeIds.filter(function(i){return S.exp.campaigns[i];}).length;
    el.innerHTML='ID: <b>'+r.scopeIds.length+'</b> · есть в заливочном: <b>'+inExp+'</b> · нет: <b>'+(r.scopeIds.length-inExp)+'</b>';
  });
}

/* ---------- шаг 4 ---------- */
document.querySelectorAll('input[name=scn]').forEach(function(r){r.addEventListener("change",function(){
  S.scenario=r.value;
  document.querySelectorAll('#tab-build .radio').forEach(function(l){l.classList.toggle("on",l.querySelector("input").checked);});
  $("newOpts").classList.toggle("hide",S.scenario!=="new"); renderMiss(); ready(); });});
["roundNew","roundAll","onlyChanged"].forEach(function(id){$(id).addEventListener("change",function(){renderMiss();ready();});});

function plan(){
  return {exp:S.exp,sources:S.sources,rules:S.rules,scenario:S.scenario,
    onlyChanged:$("onlyChanged").checked,roundNew:$("roundNew").checked,roundAll:$("roundAll").checked,
    addMissing:!!S.addMissing,
    accountOverrides:(function(){var o={};document.querySelectorAll("[data-ovr]").forEach(function(i){var v=Fmt.digits(i.value);if(v)o[i.dataset.ovr]=v;});return o;})(),
    strategyFor:$("stratSel")?$("stratSel").value:(S.exp?S.exp.strategyTop:"")};
}
function renderMiss(){
  var el=$("missBlock"); if(!S.exp||!S.rules.length){el.innerHTML="";return;}
  var R=Rules.resolve(S.exp,S.sources,S.rules,{roundNew:$("roundNew").checked});
  var missing=R.campaigns.filter(function(c){return !S.exp.campaigns[c]&&Object.keys(R.lut).some(function(k){return k.indexOf(c+"|")===0;});});
  if(!missing.length){ el.innerHTML=''; return; }
  if(S.exp.mode==="bids"){
    el.innerHTML='<div class="box err small" style="margin-top:12px"><b>'+missing.length+' кампаний нет в заливочном.</b> Для ставок строки им не создаются — цели кампании неизвестны, Оригами отбил бы весь файл. После сборки покажу список: их нужно добрать перевыгрузкой.</div>';
    return;
  }
  var h='<hr class="sep"><label class="opt"><input type="checkbox" id="addMissing"'+(S.addMissing?' checked':'')+'><span><b>Добавлять кампании, которых нет в заливочном</b><span class="t2">'+missing.length+' РК. Строки соберутся заново: аккаунт по логину, размещение по названию.</span></span></label><div id="missCfg"></div>';
  el.innerHTML=h;
  $("addMissing").addEventListener("change",function(){ S.addMissing=this.checked; renderMissCfg(missing,R); renderRules(); ready(); });
  renderMissCfg(missing,R);
}
function renderMissCfg(missing,R){
  var box=$("missCfg"); if(!box)return;
  if(!S.addMissing){ box.innerHTML=""; return; }
  var unknown={};
  missing.forEach(function(c){ var lg=(R.meta[c]||{}).login||""; if(!S.exp.accounts[lg])unknown[lg]=(unknown[lg]||0)+1; });
  var h='<table class="t"><tr><th style="width:40%">Стратегия для новых строк</th><td><select id="stratSel">'+
    S.exp.strategies.map(function(s){return '<option value="'+esc(s)+'">'+esc(s)+'</option>';}).join("")+'</select></td></tr></table>';
  var uk=Object.keys(unknown);
  if(uk.length){
    h+='<div class="box err small"><b>Нужен AccountID</b> — этих аккаунтов нет в заливочном, без номера строки не создадутся.</div><table class="t">'+
      uk.map(function(lg){return '<tr><td class="k">'+esc(lg||"(логин не указан)")+' <span class="muted small">· '+unknown[lg]+' РК</span></td><td style="width:38%"><input type="text" data-ovr="'+esc(lg)+'" placeholder="например 900102"></td></tr>';}).join("")+'</table>';
  }
  box.innerHTML=h;
  box.querySelectorAll("[data-ovr]").forEach(function(i){i.addEventListener("input",function(){
    ready();
  });});
}

/* ---------- шаг 5 ---------- */
function ready(){
  var ok=S.exp&&S.rules.length&&S.rules.some(function(r){return Object.keys(r.map).length>0;});
  $("go").disabled=!ok; $("dl").classList.add("hide"); $("dlRep").classList.add("hide"); $("status").textContent="";
}
$("go").addEventListener("click",function(){
  var p=plan(),res=Build.run(p);
  var audit=Audit.check(res.text,S.exp,res.lut,p);
  S.result=res; S.audit=audit;
  var st=res.stats,bids=S.exp.mode==="bids",fail=audit.filter(function(a){return !a.ok&&a.lvl==="f";}).length;

  var h='<div class="stats">'+
    '<div class="stat"><div class="n">'+st.rowsOut+'</div><div class="l">строк в файле</div></div>'+
    '<div class="stat"><div class="n">'+st.campaigns+'</div><div class="l">кампаний</div></div>'+
    '<div class="stat"><div class="n">'+st.inserted+'</div><div class="l">значений подставлено</div></div>'+
    '<div class="stat"><div class="n">'+st.changed+'</div><div class="l">реально изменилось</div></div>'+
    (st.constructed?'<div class="stat"><div class="n">'+st.constructed+'</div><div class="l">строк добавлено</div></div>':'')+
    (st.rounded?'<div class="stat"><div class="n">'+st.rounded+'</div><div class="l">округлено прочих</div></div>':'')+'</div>';

  h+='<div class="box '+(fail?'err':'ok')+'" style="margin-top:12px"><b>Пред-полётная проверка: '+
     (fail?('провалено пунктов — '+fail+'. Файл лучше не заливать.'):'все пункты пройдены — файл безопасен для заливки')+'</b></div>';
  h+='<div style="margin-top:6px">'+audit.map(function(a){
      return '<div class="chk '+(a.ok?"p":(a.lvl==="w"?"w":"f"))+'"><span class="ic">'+(a.ok?"✓":(a.lvl==="w"?"!":"✕"))+'</span><span>'+esc(a.title)+
        (a.detail&&!a.ok?'<div class="maxh">'+esc(a.detail)+'</div>':'')+'</span></div>';}).join("")+'</div>';
  $("report").innerHTML=h;

  res.issues.forEach(function(is){
    var d=document.createElement("div");
    d.className="box "+(is.lvl==="err"?"err":is.lvl==="warn"?"warn":"info");
    d.innerHTML='<b>'+esc(is.title)+'</b><br><span class="small">'+esc(is.note)+'</span>'+
      (is.items&&is.items.length?'<details><summary>показать список</summary><div class="maxh">'+is.items.map(esc).join("\n")+'</div></details>':'');
    $("report").appendChild(d);
  });
  if(res.preview.length){
    var d2=document.createElement("details");
    d2.innerHTML='<summary>Предпросмотр изменений ('+res.preview.length+(res.preview.length>=80?"+":"")+')</summary>';
    var w=document.createElement("div"); w.className="prevwrap";
    w.innerHTML='<table><tr><th>CampaignID</th><th>Кампания</th><th>'+(bids?"Цель":"")+'</th><th>было</th><th>стало</th></tr>'+
      res.preview.map(function(p){return '<tr class="'+p.kind+'"><td>'+esc(p.cid)+'</td><td>'+esc(String(p.name).slice(0,42))+'</td><td>'+esc(String(p.goal).slice(0,28))+'</td><td>'+esc(p.was)+'</td><td><b>'+esc(p.now)+'</b></td></tr>';}).join("")+'</table>';
    d2.appendChild(w); $("report").appendChild(d2);
  }
  S.fileName=S.csvName.replace(/\.csv$/i,"")+(bids?"_СТАВКИ":"_БЮДЖЕТ")+(S.scenario==="new"?"_НОВЫЙ":"")+".csv";
  $("dl").classList.remove("hide"); $("dlRep").classList.remove("hide");
  $("status").textContent=fail?"⚠ есть провалы проверки":"Готово · "+S.fileName;
});
function download(text,name){
  var a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
  a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href);},2000);
}
$("dl").addEventListener("click",function(){ if(S.result)download(S.result.text,S.fileName); });
$("dlRep").addEventListener("click",function(){
  if(!S.result)return;
  var st=S.result.stats,L=[];
  L.push("ОТЧЁТ О СБОРКЕ ЗАЛИВОЧНОГО ФАЙЛА  ("+VERSION+")");
  L.push("шаблон: "+S.csvName);
  L.push("режим: "+(S.exp.mode==="bids"?"ставки":"бюджеты")+" · сценарий: "+(S.scenario==="new"?"новый файл":"дополнение"));
  L.push("");
  L.push("строк в файле: "+st.rowsOut+" · кампаний: "+st.campaigns);
  L.push("значений подставлено: "+st.inserted+" · реально изменилось: "+st.changed);
  if(st.constructed)L.push("строк добавлено: "+st.constructed);
  if(st.rounded)L.push("округлено прочих строк: "+st.rounded);
  L.push("");L.push("ПРАВИЛА:");
  S.rules.forEach(function(r,i){
    L.push(" "+(i+1)+") лист «"+r.name+"» · охват: "+(r.useScope?("список из "+r.scopeIds.length+" ID"):"все РК листа"));
    Object.keys(r.map).forEach(function(k){
      var lb=k==="BUDGET"?"бюджет":((S.exp.goals.filter(function(g){return g.id===k;})[0]||{}).label||k);
      var sh=S.sources[r.sheet],hd=(sh.rows[sh.headerRow]||[])[r.map[k]];
      L.push("     "+lb+"  ←  "+(hd||("столбец "+Xlsx.colLetter(r.map[k])))+" ["+Xlsx.colLetter(r.map[k])+"]");
    });
  });
  L.push("");L.push("ПРОВЕРКА:");
  S.audit.forEach(function(a){ L.push(" "+(a.ok?"[ok]":"[!!]")+" "+a.title+(a.detail&&!a.ok?("\n      "+a.detail.replace(/\n/g,"\n      ")):"")); });
  if(S.result.issues.length){ L.push("");L.push("ЗАМЕЧАНИЯ:");
    S.result.issues.forEach(function(is){ L.push(" ["+is.lvl+"] "+is.title); L.push("     "+is.note);
      (is.items||[]).forEach(function(x){L.push("       - "+x);}); }); }
  download(L.join("\n"),S.fileName.replace(/\.csv$/,"")+"_отчёт.txt");
});

/* ---------- вкладка «Проверка заливки» ---------- */
wireDrop("dropV1","fileV1",function(f){ if(!f[0])return; readText(f[0],function(t){
  var e=Exp.parse(t);
  if(!e.ok){$("v1info").innerHTML='<div class="box err">Не похоже на заливочный из Оригами.</div>';return;}
  S.v1=e; $("v1info").innerHTML='<div class="box ok small"><b>'+esc(f[0].name)+'</b> · строк '+e.rows.length+' · кампаний '+Object.keys(e.campaigns).length+'</div>';
  $("goV").disabled=!(S.v1&&S.v2); }); });
wireDrop("dropV2","fileV2",function(f){ if(!f[0])return; S.v2name=f[0].name; readText(f[0],function(t){
  S.v2=t; var n=t.split(/\r?\n/).filter(function(l){return l!=="";}).length-1;
  $("v2info").innerHTML='<div class="box ok small"><b>'+esc(f[0].name)+'</b> · строк '+n+'</div>';
  $("goV").disabled=!(S.v1&&S.v2); }); });
$("goV").addEventListener("click",function(){
  var r=Verify.compare(S.v1,S.v2);
  var pct=r.total?Math.round(r.ok/r.total*100):0;
  var h='<div class="stats" style="margin-top:10px">'+
    '<div class="stat"><div class="n">'+r.total+'</div><div class="l">строк в залитом файле</div></div>'+
    '<div class="stat"><div class="n">'+r.ok+'</div><div class="l">совпало со свежей выгрузкой</div></div>'+
    '<div class="stat"><div class="n">'+r.bad.length+'</div><div class="l">НЕ встало</div></div>'+
    '<div class="stat"><div class="n">'+r.absent.length+'</div><div class="l">нет в свежей выгрузке</div></div>'+
    '<div class="stat"><div class="n">'+pct+'%</div><div class="l">применилось</div></div></div>';
  h+='<div class="box '+(r.bad.length?'warn':'ok')+'"><b>'+(r.bad.length?
      ('Не применилось строк: '+r.bad.length+'. Разбор ниже.'):'Все значения из файла совпадают со свежей выгрузкой — заливка прошла полностью.')+'</b></div>';
  if(r.bad.length){
    h+='<div class="prevwrap"><table><tr><th>Аккаунт</th><th>CampaignID</th><th>Кампания</th><th>Цель</th><th>заливали</th><th>сейчас</th></tr>'+
      r.bad.slice(0,300).map(function(x){return '<tr class="chg"><td>'+esc(x.acc)+'</td><td>'+esc(x.cid)+'</td><td>'+esc(String(x.name).slice(0,38))+'</td><td>'+esc(String(x.goal).slice(0,26))+'</td><td>'+esc(x.want)+'</td><td><b>'+esc(x.got)+'</b></td></tr>';}).join("")+'</table></div>';
  }
  if(r.absent.length){
    h+='<div class="box info small"><b>Нет в свежей выгрузке: '+r.absent.length+'</b><br>Такие строки нельзя проверить — кампания или цель отсутствует в новом экспорте.'+
      '<details><summary>показать</summary><div class="maxh">'+r.absent.slice(0,200).map(function(x){return x.cid+" · "+x.goal+" (заливали "+x.want+")";}).map(esc).join("\n")+'</div></details></div>';
  }
  var accs=Object.keys(r.byAcc).sort();
  h+='<details><summary>по аккаунтам</summary><table class="t"><tr><th>Аккаунт</th><th>совпало</th><th>не встало</th><th>нет в выгрузке</th></tr>'+
    accs.map(function(a){var x=r.byAcc[a];return '<tr><td class="k">'+esc(a)+'</td><td>'+x.ok+'</td><td>'+x.bad+'</td><td>'+x.absent+'</td></tr>';}).join("")+'</table></details>';
  $("vreport").innerHTML=h;
});

/* самопроверка ядра из подвала (набор — tests/suite.js) */
var _rt=document.getElementById("runTests");
if(_rt)_rt.addEventListener("click",async function(ev){
  ev.preventDefault();
  _rt.disabled=true; _rt.className="st"; _rt.textContent="проверяю…";
  try{
    var r=await Suite.run();
    _rt.className="st "+(r.ok?"ok":"bad");
    _rt.textContent=(r.ok?"✓ ядро исправно · ":"✕ есть падения · ")+r.count+" проверок";
    _rt.title="Нажми ещё раз, чтобы посмотреть отчёт";
    _rt.onclick=function(e){ e.preventDefault(); alert(r.log); };
  }catch(e){
    _rt.className="st bad"; _rt.textContent="✕ ошибка запуска";
    _rt.onclick=function(e2){ e2.preventDefault(); alert(String(e&&e.message||e)); };
  }
  _rt.disabled=false;
});
