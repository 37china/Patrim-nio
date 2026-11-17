// Procura fugas do ocultar com sequências ao acaso de toques, trocas de separador, abas,
// folhas e esperas. Depois de cada passo verifica: onde o estado diz "escondido", não há
// número nenhum à vista. Corre: node testes/fuzz_ocultar.js [index.html] [passos] [semente]
const path=require("path");
const {chromium}=require(process.env.PLAYWRIGHT||'/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js');
const {comExemplo}=require("./exemplo.js");
const FICHEIRO=process.argv[2]||path.join(__dirname,"..","index.html");
const PASSOS=+process.argv[3]||250; let semente=+process.argv[4]||Date.now()%100000;
const rnd=()=>{ semente=(semente*16807)%2147483647; return (semente-1)/2147483646; };
const um=a=>a[Math.floor(rnd()*a.length)];
(async()=>{
  console.log("semente",semente);
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:390,height:900},hasTouch:true,isMobile:true,timezoneId:"Europe/Lisbon",locale:"pt-PT"});
  const erros=[]; pg.on("pageerror",e=>erros.push(e.message));
  await comExemplo(pg);
  await pg.goto("file://"+path.resolve(FICHEIRO)); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{
    const h="2026-05-02";
    conta("t212").subs=[{id:"a",valor:7654.32,data:h}];conta("t212").taxas=[{data:h,v:2.5}];
    conta("tr").subs=[{id:"b",valor:1200,data:h}];conta("tr").taxas=[{data:h,v:2.25}];
    conta("aforro").subs=[{id:"c",valor:600,data:h}];conta("aforro").taxas=[{data:h,v:2.5}];
    conta("cgd").saldo=437.6;conta("cgd").data="2026-11-10";conta("cgd").esperado="auto";
    conta("revolut").saldo=212.45;conta("revolut").data="2026-11-10";conta("revolut").esperado=300;
    conta("trinv").posicoes=[{id:"v",n:"VWCE",cat:"etf",un:12,pr:128,prData:"2026-11-01",custo:1400,
      plano:{modo:"eur",qtd:50,per:"mes",inicio:"2026-10-02",origem:"tr",comissao:0,precoAuto:true}}];
    S.contas.push({id:"dp",n:"DP",tipo:"prazo",vence:"2027-05-01",periodoMeses:0,base:360,irs:28,retencao:true,subs:[{id:"s",valor:5000,data:"2026-05-01"}],taxas:[{data:"2026-05-01",v:3}]});
    S.contas.push({id:"pm",n:"Fundo PE",tipo:"privado",valor:2500,investido:2000,data:"2026-10-01",secundaria:true});
    S.fixas=[{n:"Renda",v:420,f:true},{n:"Comida",v:150,f:false}]; S.rendimento=760;
    pote("investir").obj=1500; pote("investir").prazo="2027-06-30"; pote("investir").conta="tr";
    pote("gastar").conta="revolut";
    S.movs=[{id:1,d:hojeStr(),v:30,cat:"Alimentação",pote:"correntes"}];
    aplicarMes(mesKey(new Date())); save(); render();
  });
  const ACOES=[
    ["vai",async()=>{ await pg.evaluate(v=>go(v),um(["orc","potes","contas","patrim"])); }],
    ["olho",async()=>{ const v=await pg.evaluate(()=>view); const id={orc:"#olhoOrc",potes:"#olhoPotes",contas:"#olhoContas",patrim:"#patOlho"}[v]; if(id&&await pg.$(id)) await pg.tap(id); }],
    ["toque",async()=>{ const els=await pg.$$("section:not(.hide) [data-oc], section:not(.hide) [data-ocl], section:not(.hide) [data-ocj], section:not(.hide) #patTotal"); if(els.length){ const e=um(els); if(await e.isVisible()) await e.tap().catch(()=>{}); } }],
    ["aba",async()=>{ for(const id of ["#longoHdr","#totHdr","#invHdr","#prazoHdr","#compHdr"].sort(()=>rnd()-.5).slice(0,1)) if(await pg.$(id)&&await pg.isVisible(id)) await pg.tap(id).catch(()=>{}); }],
    ["espera",async()=>{ await pg.waitForTimeout(1100+Math.floor(rnd()*1200)); }],
    ["modo",async()=>{ await pg.evaluate(()=>{ S.hubModo=S.hubModo==="mensal"?"total":"mensal"; save(); if(view==="contas") rHub(); }); }],
    ["estilo",async()=>{ await pg.evaluate(()=>{ S.ocEstilo=S.ocEstilo==="pontos"?"blur":"pontos"; save(); render(); }); }],
    ["edita",async()=>{ if(await pg.evaluate(()=>view)==="orc"){ const ins=await pg.$$('#v-orc input[type=number]'); if(ins.length){ const i=um(ins); await i.fill(String(Math.round(rnd()*900))).catch(()=>{}); await pg.evaluate(()=>document.activeElement&&document.activeElement.blur()); } } }],
    ["recarrega",async()=>{ if(rnd()<.3){ await pg.reload(); await pg.waitForTimeout(400); } }],
    ["desliza",async()=>{ const x=rnd()<.5?60:330; await pg.evaluate(async([x])=>{
        const t=(type,cx)=>document.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==="touchend"?[]:[new Touch({identifier:1,target:document.body,clientX:cx,clientY:400})],changedTouches:[new Touch({identifier:1,target:document.body,clientX:cx,clientY:400})]}));
        t("touchstart",x); for(let i=1;i<=6;i++){ t("touchmove",x+(x<200?1:-1)*i*35); await new Promise(r=>setTimeout(r,16)); } t("touchend",x+(x<200?1:-1)*210);
      },[x]); await pg.waitForTimeout(450); }]
  ];
  // invariantes
  const verifica=()=>pg.evaluate(()=>{
    // montantes, não taxas: "2,25%" não conta
    const re={test:t=>/\d,\d\d/.test(String(t).replace(/[\d.,]+\s*%/g,""))};
    const vis=el=>{ const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; };
    const txt=el=>[...el.querySelectorAll("*")].filter(e=>!e.children.length&&!e.closest(".msk")&&vis(e)&&re.test(e.textContent)).map(e=>e.textContent.trim().slice(0,40));
    const sec=document.querySelector("section:not(.hide)"); if(!sec) return [];
    const mal=[];
    const tudo={"v-potes":S.ocPotes,"v-contas":S.ocContas,"v-orc":S.ocOrc}[sec.id];
    if(tudo){ const t=txt(sec).filter(x=>!(sec.id==="v-orc"&&/Distribuir|mesada/.test(x))); if(t.length) mal.push(sec.id+" olho fechado: "+t.join(" | ")); }
    if(sec.id==="v-orc"&&S.ocOrc){ sec.querySelectorAll("input[type=number]").forEach(i=>{ if(i.id!=="cfDia"&&i!==document.activeElement&&!i.classList.contains("oculto")) mal.push("campo sem máscara: "+(i.id||i.dataset.oa||i.dataset.fv)); }); }
    if(sec.id==="v-patrim"){
      if(patTudoOculto()){ const t=txt(sec); if(t.length) mal.push("patrim tudo oculto: "+t.join(" | ")); }
      sec.querySelectorAll("[data-oc]").forEach(el=>{ if(S[el.dataset.oc]&&vis(el)&&re.test(el.textContent)) mal.push("data-oc "+el.dataset.oc+": "+el.textContent.trim().slice(0,30)); });
      sec.querySelectorAll("[data-ocl]").forEach(el=>{ const c=conta(el.dataset.ocl); if(c&&c.ocultarValor&&vis(el)&&re.test(el.textContent)) mal.push("valor "+c.id+": "+el.textContent.trim().slice(0,30)); });
      sec.querySelectorAll("[data-ocj]").forEach(el=>{ const c=conta(el.dataset.ocj); if(c&&c.ocultarJuro&&vis(el)&&re.test(el.textContent)) mal.push("juro "+c.id+": "+el.textContent.trim().slice(0,30)); });
      if(S.patOculto&&re.test(E("patTotal").textContent)) mal.push("número grande");
    }
    // vista vizinha deixada à vista depois de deslizar
    const outras=[...document.querySelectorAll("section[id^='v-']")].filter(x=>x!==sec&&vis(x)&&x.getBoundingClientRect().left<380&&x.getBoundingClientRect().right>10);
    if(outras.length) mal.push("outra vista à vista: "+outras.map(x=>x.id).join(","));
    return mal;
  });
  let falhas=0; const log=[];
  for(let i=0;i<PASSOS;i++){
    const [n,f]=um(ACOES); log.push(n);
    try{ await f(); }catch(e){ log.push("(erro: "+e.message.slice(0,60)+")"); }
    await pg.waitForTimeout(80);
    const m=await verifica();
    if(m.length){ falhas++; console.log("FUGA no passo "+i+" depois de ["+log.slice(-6).join(" > ")+"]"); m.slice(0,4).forEach(x=>console.log("   "+x)); if(falhas>=6) break; }
  }
  if(erros.length) console.log("ERROS JS:",[...new Set(erros)].slice(0,5));
  console.log(falhas?"FUZZ: "+falhas+" fugas":"FUZZ: "+PASSOS+" passos sem fugas");
  await b.close();
})();
