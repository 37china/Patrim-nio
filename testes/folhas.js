// Folhas abertas com os valores escondidos: nenhum montante à vista. Corre: node testes/folhas.js
const path=require("path");
const {chromium}=require(process.env.PLAYWRIGHT||'/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js');
const {comExemplo}=require("./exemplo.js");
(async()=>{ const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:390,height:900},hasTouch:true,isMobile:true,timezoneId:"Europe/Lisbon"});
  pg.on("pageerror",e=>console.log("ERRO",e.message));
  await comExemplo(pg); await pg.goto("file://"+path.resolve(process.argv[2]||path.join(__dirname,"..","index.html"))); await pg.waitForTimeout(300);
  const r=await pg.evaluate(()=>{
    const h="2026-05-02";
    conta("t212").subs=[{id:"a",valor:7654.32,data:h}];conta("t212").taxas=[{data:h,v:2.5}];
    conta("tr").subs=[{id:"b",valor:1200,data:h}];conta("tr").taxas=[{data:h,v:2.25}];
    conta("aforro").subs=[{id:"c",valor:600,data:h}];conta("aforro").taxas=[{data:h,v:2.5}];
    conta("cgd").saldo=437.6;conta("cgd").data="2026-11-10";
    conta("trinv").posicoes=[{id:"v",n:"VWCE",cat:"etf",un:12,pr:128,prData:"2026-11-01",custo:1400,plano:{modo:"eur",qtd:50,per:"mes",inicio:"2026-10-02",origem:"tr",comissao:0,precoAuto:true}}];
    S.contas.push({id:"dp",n:"DP",tipo:"prazo",vence:"2026-07-01",periodoMeses:0,base:360,irs:28,retencao:true,subs:[{id:"s",valor:5000,data:"2026-01-01"}],taxas:[{data:"2026-01-01",v:3}]});
    S.contas.push({id:"pm",n:"Fundo PE",tipo:"privado",valor:2500,investido:2000,data:"2026-10-01",secundaria:true});
    S.fixas=[{n:"Renda",v:420,f:true}]; S.rendimento=760; pote("investir").obj=1500; pote("investir").saldo=321.5;
    S.ocPotes=S.ocContas=S.ocOrc=true; PAT_CHAVES.forEach(k=>S[k]=true); S.contas.forEach(c=>{c.ocultarValor=c.ocultarJuro=true;}); save();
    const re=t=>/\d,\d\d/.test(String(t).replace(/[\d.,]+\s*%/g,""));
    const fugas=[];
    const ver=nome=>{ const si=E("sheetIn"); if(!si){ fugas.push(nome+": sem folha"); return; }
      if(!si.classList.contains("oc-folha")) fugas.push(nome+": folha sem máscara");
      [...si.querySelectorAll("*")].filter(e=>!e.children.length&&e.tagName!=="OPTION"&&re(e.textContent)&&!e.closest(".tnum,.row2 .v,.disp")).forEach(e=>fugas.push(nome+": "+e.textContent.trim().slice(0,60)));
      closeSheet(); };
    const casos=[["potes",()=>sheetPote("investir"),"objetivo"],["potes",()=>sheetAjuste("investir"),"±"],
      ["contas",()=>sheetConta("cgd"),"conta cgd"],["contas",()=>sheetConta("tr"),"conta tr"],
      ["patrim",()=>{OC_PROX=true;sheetAtivo("tr")},"ativo tr"],["patrim",()=>{OC_PROX=true;sheetAtivo("t212")},"ativo t212"],
      ["patrim",()=>{OC_PROX=true;sheetAtivo("dp")},"ativo dp"],["patrim",()=>{OC_PROX=true;sheetAtivo("aforro")},"ativo aforro"],
      ["patrim",()=>{OC_PROX=true;sheetAtivo("trinv")},"ativo carteira"],["patrim",()=>{OC_PROX=true;sheetAtivo("pm")},"ativo pm"],
      ["patrim",()=>{OC_PROX=true;sheetPlano("trinv","v")},"plano"],["patrim",()=>{OC_PROX=true;sheetPrecos()},"preços"],
      ["patrim",()=>{OC_PROX=true;sheetVencido("dp")},"vencido"],["potes",()=>sheetComprei("investir"),"comprei"]];
    for(const [v,f,n] of casos){ go(v); try{ f(); }catch(e){ fugas.push(n+": ERRO "+e.message); continue; } ver(n); }
    return fugas;
  });
  console.log(r.length?r.join("\n")+"\nFOLHAS: "+r.length+" fugas":"FOLHAS: 14 folhas sem fugas"); await b.close(); process.exit(r.length?1:0); })();
