/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 2b · Accounts — справочник «логин → AccountID»

   Нужен ровно для одного случая: собрать строку бюджета кампании, которой
   нет в заливочном. Номер аккаунта не выводится из названия и не угадывается
   по похожести — он либо есть в заливочном, либо в справочнике, либо его
   вписывают руками. Иначе Оригами отобьёт файл.

   Справочник ниже — то, что уже встречалось в выгрузках. Он не заменяет
   заливочный, а только подставляет значение в поле: видно, откуда оно взято,
   и его всегда можно перебить.
   ══════════════════════════════════════════════════════════════════════════ */
var Accounts=(function(){
  var BOOK={
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

  function norm(s){ return String(s==null?"":s).trim().toLowerCase(); }

  /* Ищем номер аккаунта. Порядок важен: заливочный — источник правды,
     всё остальное лишь подсказка. learned — пары, выученные из ранее
     загруженных заливочных (их подкладывает интерфейс). */
  function find(login,exp,learned){
    var lg=norm(login);
    if(!lg)return null;
    var byExp=exp&&exp.accounts?exp.accounts[String(login).trim()]:null;
    if(byExp)return {id:byExp,src:"exp",note:"из заливочного"};
    if(learned&&learned[lg])return {id:learned[lg],src:"learned",note:"из прошлых заливочных"};
    if(BOOK[lg])return {id:BOOK[lg],src:"book",note:"из справочника"};
    return null;
  }

  /* Пары «логин → AccountID» из заливочного — чтобы запомнить их на будущее. */
  function harvest(exp){
    var out={};
    if(exp&&exp.accounts)for(var k in exp.accounts){
      var id=exp.accounts[k],lg=norm(k);
      if(lg&&id)out[lg]=id;
    }
    return out;
  }

  function merge(a,b){
    var out={},k;
    for(k in (a||{}))out[k]=a[k];
    for(k in (b||{}))out[k]=b[k];
    return out;
  }

  function list(){
    return Object.keys(BOOK).sort().map(function(k){return {login:k,id:BOOK[k]};});
  }

  return {find:find,harvest:harvest,merge:merge,list:list,size:Object.keys(BOOK).length};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Accounts;
