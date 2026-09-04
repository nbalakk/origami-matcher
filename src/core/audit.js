/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 7 · Audit — независимая пред-полётная проверка готового файла
   ══════════════════════════════════════════════════════════════════════════ */
var Audit=(function(){
  function check(text,exp,lut,plan){
    plan=plan||{};
    var roundNew=plan.roundNew!==false;   /* округление обязательное, галки больше нет */
    var res=[],bom=text.charCodeAt(0)===0xFEFF;
    var body=bom?text.slice(1):text;
    var eol=body.indexOf("\r\n")>=0?"\r\n":"\n";
    var lines=body.split(eol).filter(function(l){return l!=="";});
    function add(ok,lvl,title,detail){ res.push({ok:ok,lvl:ok?"p":(lvl||"f"),title:title,detail:detail||""}); }

    add(bom,"f","BOM на месте","Оригами требует UTF-8 с BOM");
    add(exp.eol==="\r\n"?text.slice(-2)==="\r\n":true,"f","Файл заканчивается переводом строки");
    add(lines[0]===exp.header,"f","Заголовок не изменён");

    /* Настоящими считаются строки основного заливочного И запасных выгрузок:
       из запасных строку можно взять целиком, но выдумать её нельзя ниоткуда. */
    var origPrefix={},sparePrefix={},origPairs=exp.pairs;
    exp.rows.forEach(function(r){ origPrefix[Fmt.splitVal(r.line).prefix]=1; });
    ((plan&&plan.spares)||[]).forEach(function(sp){
      if(!sp||!sp.rows)return;
      sp.rows.forEach(function(r){ sparePrefix[Fmt.splitVal(r.line).prefix]=1; });
    });

    var fromSpare=0,invented=[],badCols=[],nonInt=[],zeros=[],dup={},dups=[],mismatch=[],outOfScope=[];
    for(var i=1;i<lines.length;i++){
      var l=lines[i],f=Fmt.parseLine(l),sv=Fmt.splitVal(l);
      var cid=Fmt.digits(f[exp.C.camp]||""),gid=exp.C.goal>=0?Fmt.digits(f[exp.C.goal]||""):"";
      if(f.length!==exp.cols)badCols.push("стр "+(i+1)+": полей "+f.length+" вместо "+exp.cols);
      var k=cid+"|"+gid;
      if(dup[k])dups.push("стр "+(i+1)+": "+cid+(gid?(" · цель "+gid):"")); dup[k]=1;
      if(roundNew&&!/^-?\d+$/.test(sv.value))nonInt.push("стр "+(i+1)+": "+sv.value);
      if(sv.value==="0")zeros.push("стр "+(i+1)+": "+cid);
      var isOrig=!!origPrefix[sv.prefix];
      if(!isOrig&&sparePrefix[sv.prefix]){ isOrig=true; fromSpare++; }
      if(!isOrig)invented.push("стр "+(i+1)+": "+cid+(gid?(" · цель "+gid):"")+
        " — такой строки нет ни в заливочном, ни в запасных выгрузках");
      var want=lut[cid+"|"+(exp.mode==="bids"?gid:"BUDGET")];
      if(want!==undefined&&sv.value!==Fmt.out(want,roundNew))
        mismatch.push("стр "+(i+1)+": "+cid+" = "+sv.value+", ожидалось "+Fmt.out(want,roundNew));
    }
    add(invented.length===0,"f","Нет выдуманных строк"+(invented.length?": "+invented.length:""),invented.slice(0,15).join("\n"));
    add(badCols.length===0,"f","Во всех строках правильное число колонок",badCols.slice(0,10).join("\n"));
    add(dups.length===0,"f","Нет дублей"+(exp.mode==="bids"?" «кампания + цель»":" кампаний"),dups.slice(0,10).join("\n"));
    add(mismatch.length===0,"f","Все значения совпадают с мастер-файлом",mismatch.slice(0,15).join("\n"));
    add(roundNew?nonInt.length===0:true,"f","Все значения целые",nonInt.slice(0,10).join("\n"));
    add(zeros.length===0,"w","Нет значений «0»",zeros.slice(0,10).join("\n"));
    add(lines.length-1>0,"f","В файле есть строки ("+(lines.length-1)+")");
    if(fromSpare)add(true,"w","Строк из запасных выгрузок: "+fromSpare,
      "Аккаунт, размещение и стратегия у них настоящие, но запасная выгрузка может быть старше основной.");
    return res;
  }
  return {check:check};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Audit;
