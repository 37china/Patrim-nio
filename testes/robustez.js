// estados estranhos: campos em falta, datas vazias, tipos antigos. Nada pode rebentar.
const path=require("path");
const {chromium}=require(process.env.PLAYWRIGHT||'/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js');
const FICHEIRO=process.argv[2]||path.join(__dirname,"..","index.html");
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:390,height:900},hasTouch:true,isMobile:true,timezoneId:"Europe/Lisbon"});
  let erros=0; pg.on("pageerror",e=>{ erros++; console.log("  ERRO JS:",e.message.slice(0,160)); });
  await pg.goto("file://"+path.resolve(FICHEIRO)); await pg.waitForTimeout(350);
  const r=await pg.evaluate(async()=>{
    const out=[];
    const estranhas=[
      {id:"e1",n:"Sem nada",tipo:"remunerada"},
      {id:"e2",n:"Subs vazias",tipo:"remunerada",subs:[],taxas:[]},
      {id:"e3",n:"Datas nulas",tipo:"remunerada",subs:[{id:"a",valor:100,data:null}],taxas:[{data:null,v:2}]},
      {id:"e4",n:"Futuro",tipo:"remunerada",freq:"diaria",subs:[{id:"a",valor:100,data:"2099-01-01"}],taxas:[{data:"2099-01-01",v:2}]},
      {id:"e5",n:"Levantou tudo",tipo:"remunerada",freq:"mensal",diaJuro:31,irs:28,retencao:true,subs:[{id:"a",valor:100,data:"2026-01-01"},{id:"b",valor:-100,data:"2026-02-01"}],taxas:[{data:"2026-01-01",v:2}]},
      {id:"e6",n:"Prazo sem nada",tipo:"prazo"},
      {id:"e7",n:"Prazo sem fim",tipo:"prazo",subs:[{id:"a",valor:1000,data:"2026-01-01"}],taxas:[{data:"2026-01-01",v:3}]},
      {id:"e8",n:"Prazo fim antes do início",tipo:"prazo",vence:"2025-01-01",subs:[{id:"a",valor:1000,data:"2026-01-01"}],taxas:[{data:"2026-01-01",v:3}]},
      {id:"e9",n:"Prazo antigo",tipo:"prazo",freq:"vencimento",vence:"2027-01-01",subs:[],taxas:[]},
      {id:"e10",n:"Prazo mensal 31",tipo:"prazo",vence:"2027-01-31",periodoMeses:1,irs:28,retencao:true,subs:[{id:"a",valor:1000,data:"2026-01-31"}],taxas:[{data:"2026-01-31",v:3}]},
      {id:"e11",n:"Aforro vazio",tipo:"aforro"},
      {id:"e12",n:"Aforro resgatado",tipo:"aforro",irs:28,subs:[{id:"a",valor:500,data:"2025-01-10"},{id:"b",valor:-500,data:"2025-08-10"}],taxas:[{data:"2025-01-10",v:2.5}]},
      {id:"e13",n:"Carteira vazia",tipo:"investimento"},
      {id:"e14",n:"Carteira antiga",tipo:"investimento",valor:500,investido:400,data:"2026-01-01"},
      {id:"e15",n:"Posição sem preço",tipo:"investimento",posicoes:[{id:"p",n:"",cat:"etf",un:"",pr:null,prData:null,custo:undefined}]},
      {id:"e16",n:"Privado vazio",tipo:"privado"},
      {id:"e17",n:"<b>Nome com HTML</b> & aspas \"'",tipo:"ordem",saldo:"abc",data:"não é data"},
      {id:"e18",n:"Ordem secundária",tipo:"ordem",saldo:10,data:"2026-11-01",secundaria:true}
    ];
    estranhas.forEach(c=>S.contas.push(c));
    S.potes[0].conta="e7"; S.potes[1].conta="e13"; S.potes[2].conta="não existe";
    save();
    const tenta=(nome,fn)=>{ try{ fn(); }catch(e){ out.push(nome+" -> "+e.message); } };
    ["orc","potes","contas","patrim","mes","import","config"].forEach(v=>tenta("go "+v,()=>go(v)));
    go("patrim"); LONGO_ABERTO=true; TOTAL_ABERTO=true; tenta("pintaPatrim aberto",()=>pintaPatrim());
    S.contas.forEach(c=>{ tenta("estado "+c.id,()=>{ const e=estado(c,new Date()); if(!isFinite(e.valor)) throw new Error("valor não é número: "+e.valor); });
                          tenta("estado futuro "+c.id,()=>estado(c,new Date("2099-06-01T12:00:00"))); });
    tenta("patrimonio",()=>{ const p=patrimonio(new Date()); Object.keys(p).forEach(k=>{ if(!isFinite(p[k])) throw new Error(k+" não é número"); }); });
    for(const c of S.contas.slice()){
      tenta("sheetAtivo "+c.id,()=>{ sheetAtivo(c.id); });
      tenta("guardar "+c.id,()=>{ const bt=document.getElementById("aOk")||document.getElementById("kOk"); if(bt) bt.click(); });
      closeSheet();
      tenta("sheetConta "+c.id,()=>{ sheetConta(c.id); }); closeSheet();
    }
    ["remunerada","prazo","aforro","investimento","privado","tipo que não existe"].forEach(t=>{ tenta("novo "+t,()=>sheetAtivo(null,t)); closeSheet(); });
    S.potes.forEach(p=>{ tenta("ajuste "+p.id,()=>sheetAjuste(p.id)); closeSheet(); tenta("pote "+p.id,()=>sheetPote(p.id)); closeSheet(); });
    tenta("sheetVencido e8",()=>sheetVencido("e8")); closeSheet();
    tenta("sheetPrecos",()=>sheetPrecos()); closeSheet();
    ["orc","potes","contas","patrim"].forEach(v=>tenta("go de novo "+v,()=>go(v)));
    S.ocPotes=S.ocContas=S.ocOrc=true; PAT_CHAVES.forEach(k=>S[k]=true); S.contas.forEach(c=>{c.ocultarValor=c.ocultarJuro=true;});
    ["orc","potes","contas","patrim"].forEach(v=>tenta("escondido "+v,()=>go(v)));
    out.push("html escapado: "+(!document.querySelector("#v-patrim b b, #hubList b b")));
    return out;
  });
  await pg.waitForTimeout(2500);   // dois tiques com este estado
  r.forEach(x=>console.log("  "+x));
  console.log(erros||r.length>1?"ROBUSTEZ: há problemas":"ROBUSTEZ: nada rebentou");
  await b.close();
})();
