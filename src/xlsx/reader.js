/* ══════════════════════════════════════════════════════════════════════════
   МОДУЛЬ 2 · Xlsx — чтение xlsx без библиотек (zip + xml)
   ══════════════════════════════════════════════════════════════════════════ */
var Xlsx=(function(){
  function colToIdx(l){var n=0;for(var i=0;i<l.length;i++)n=n*26+(l.charCodeAt(i)-64);return n-1;}
  function colLetter(i){var s="";i++;while(i>0){var m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}
  async function unzip(buf){
    var dv=new DataView(buf),u8=new Uint8Array(buf),eo=-1;
    for(var i=buf.byteLength-22;i>=0;i--)if(dv.getUint32(i,true)===0x06054b50){eo=i;break;}
    if(eo<0)throw new Error("файл не похож на xlsx");
    var cnt=dv.getUint16(eo+10,true),off=dv.getUint32(eo+16,true),files={};
    for(var n=0;n<cnt;n++){
      if(dv.getUint32(off,true)!==0x02014b50)throw new Error("повреждённый архив");
      var m=dv.getUint16(off+10,true),cs=dv.getUint32(off+20,true);
      var fn=dv.getUint16(off+28,true),ex=dv.getUint16(off+30,true),cm=dv.getUint16(off+32,true),lho=dv.getUint32(off+42,true);
      var name=new TextDecoder().decode(u8.subarray(off+46,off+46+fn));
      var lfn=dv.getUint16(lho+26,true),lex=dv.getUint16(lho+28,true),st=lho+30+lfn+lex;
      files[name]={m:m,d:u8.subarray(st,st+cs)}; off+=46+fn+ex+cm;
    }
    return {get:async function(n){
      var f=files[n]; if(!f)return null;
      if(f.m===0)return f.d.slice();
      var ds=new DecompressionStream("deflate-raw");
      return new Uint8Array(await new Response(new Blob([f.d]).stream().pipeThrough(ds)).arrayBuffer());
    }};
  }
  function grid(doc,sst){
    var rows=doc.getElementsByTagName("row"),tmp=[],maxC=0;
    for(var i=0;i<rows.length;i++){
      var row=rows[i],ri=parseInt(row.getAttribute("r"),10)-1; if(isNaN(ri))ri=i;
      var cs=row.getElementsByTagName("c"),arr=[];
      for(var j=0;j<cs.length;j++){
        var c=cs[j],ref=(c.getAttribute("r")||"").replace(/[0-9]/g,""),col=ref?colToIdx(ref):j,t=c.getAttribute("t"),v="";
        if(t==="inlineStr"){var is=c.getElementsByTagName("t");v=is.length?is[0].textContent:"";}
        else{var vv=c.getElementsByTagName("v");if(vv.length){var raw=vv[0].textContent;v=(t==="s")?(sst[+raw]||""):raw;}}
        arr[col]=v; if(col+1>maxC)maxC=col+1;
      }
      tmp[ri]=arr;
    }
    var out=[];
    for(var k=0;k<tmp.length;k++){var a=tmp[k]||[],r=[];for(var c2=0;c2<maxC;c2++)r.push(a[c2]!==undefined?a[c2]:"");out.push(r);}
    return out;
  }
  /* Открывает книгу: разбирает только оглавление (быстро, даже для больших файлов).
     Листы читаются по требованию — иначе на отчёте с 25 листами интерфейс замирает. */
  async function open(buf){
    var zip=await unzip(buf),dec=new TextDecoder("utf-8");
    var P=function(t){return new DOMParser().parseFromString(t,"application/xml");};
    var wbx=P(dec.decode(await zip.get("xl/workbook.xml")));
    var rels=P(dec.decode(await zip.get("xl/_rels/workbook.xml.rels"))),map={},rl=rels.getElementsByTagName("Relationship");
    for(var k=0;k<rl.length;k++)map[rl[k].getAttribute("Id")]=rl[k].getAttribute("Target");
    var sh=wbx.getElementsByTagName("sheet"),list=[];
    for(var s=0;s<sh.length;s++){
      var el=sh[s],rid=el.getAttribute("r:id");
      if(!rid)for(var a=0;a<el.attributes.length;a++){var at=el.attributes[a];if(at.localName==="id"){rid=at.value;break;}}
      var tgt=map[rid]||"";
      list.push({name:el.getAttribute("name"),path:tgt.charAt(0)==="/"?tgt.slice(1):("xl/"+tgt),tgt:tgt});
    }
    var sst=null;
    async function strings(){
      if(sst)return sst;
      sst=[];
      var ss=await zip.get("xl/sharedStrings.xml");
      if(ss){
        var d=P(dec.decode(ss)),si=d.getElementsByTagName("si");
        for(var i=0;i<si.length;i++){
          var ts=si[i].getElementsByTagName("t"),str="";
          for(var j=0;j<ts.length;j++)str+=ts[j].textContent;
          sst.push(str);
        }
      }
      return sst;
    }
    return {
      sheets:list.map(function(x){return x.name;}),
      /* rows выбранного листа */
      sheet:async function(i){
        var it=list[i]; if(!it)return [];
        var tbl=await strings();
        var sb=await zip.get(it.path)||await zip.get("xl/"+it.tgt.replace(/^\//,""));
        return sb?grid(P(dec.decode(sb)),tbl):[];
      }
    };
  }
  /* Прочитать книгу целиком — используется в тестах ядра. */
  async function read(buf){
    var wb=await open(buf),out=[];
    for(var i=0;i<wb.sheets.length;i++)out.push({name:wb.sheets[i],rows:await wb.sheet(i)});
    return out;
  }
  return {open:open,read:read,colToIdx:colToIdx,colLetter:colLetter};
})();

/* работает и в браузере, и в Node — ядро не зависит от DOM */
if (typeof module !== "undefined" && module.exports) module.exports = Xlsx;
