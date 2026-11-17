// Planos de investimento periódico, com contas feitas à mão. Corre: node testes/plano.js
const path=require("path");
const {chromium}=require(process.env.PLAYWRIGHT||'/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js');
const {comExemplo}=require("./exemplo.js");
const FICHEIRO=process.argv[2]||path.join(__dirname,"..","index.html");
let falhas=0, feitos=0;
const ok=(n,c,x)=>{ feitos++; if(!c){ falhas++; console.log("  FALHA  "+n+(x!==undefined?"  -> "+JSON.stringify(x):"")); } };
const perto=(a,b,t)=>Math.abs(a-b)<(t||0.0005);
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:390,height:1000},hasTouch:true,isMobile:true,timezoneId:"Europe/Lisbon",locale:"pt-PT"});
  pg.on("pageerror",e=>{ falhas++; console.log("  ERRO JS: "+e.message); });
  await pg.clock.setFixedTime(new Date("2026-11-15T12:00:00"));
  await comExemplo(pg);
  await pg.goto("file://"+path.resolve(FICHEIRO)); await pg.waitForTimeout(350);
  await pg.evaluate(()=>{
    conta("tr").subs=[{id:"b",valor:1200,data:"2026-05-02"}]; conta("tr").taxas=[{data:"2026-05-02",v:2.25}];
    conta("cgd").saldo=437.6; conta("cgd").data="2026-10-10";
    conta("trinv").posicoes=[{id:"v",n:"VWCE",cat:"etf",un:10,pr:100,prData:"2026-08-01",custo:1000,
      plano:{modo:"eur",qtd:50,per:"mes",inicio:"2026-09-02",fim:"",origem:"tr",comissao:1,precoAuto:true}}];
    save();
  });
  const E0=await pg.evaluate(()=>{ const q=posEf(conta("trinv").posicoes[0]); return {un:q.un,custo:q.custo,pend:q.pend,pr:q.pr}; });
  ok("3 compras por preencher: 02/09, 02/10, 02/11", E0.pend.join()==="2026-09-02,2026-10-02,2026-11-02", E0);
  ok("estimadas a 100 €: 11,5 unidades, 1153 € pagos (3 × 51)", perto(E0.un,11.5)&&perto(E0.custo,1153), E0);
  let tr=await pg.evaluate(()=>estado(conta("tr"),new Date()).investido);
  ok("a TR à ordem perde 153 € (3 compras × 51)", perto(tr,1047), tr);
  let cgd=await pg.evaluate(()=>{ const t=conta("trinv").posicoes[0]; t.plano.origem="cgd"; return estado(conta("cgd"),new Date()).valor; });
  ok("da CGD só sai a compra depois do saldo de 10/10: 437,60 − 51 = 386,60", perto(cgd,386.6), cgd);
  await pg.evaluate(()=>{ conta("trinv").posicoes[0].plano.origem="tr"; save(); });

  // pela caixa do Património
  await pg.evaluate(()=>go("patrim")); await pg.waitForTimeout(350);
  ok("cartão de compras por preencher com 3 caixas", await pg.$$eval("#pendList [data-pi]",e=>e.length)===3);
  ok("a aba Investido avisa", (await pg.$eval("#invPend",e=>e.textContent)).includes("3 por preencher"));
  await pg.fill('[data-pi="trinv|v|2026-09-02"]',"0.4"); await pg.tap('[data-pf="trinv|v|2026-09-02"]'); await pg.waitForTimeout(300);
  const E1=await pg.evaluate(()=>{ const q=posEf(conta("trinv").posicoes[0]); return {un:q.un,custo:q.custo,pr:q.pr,prData:q.prData,pend:q.pend.length}; });
  ok("0,4 unidades por 50 €: o preço passa a 125 €", perto(E1.pr,125)&&E1.prData==="2026-09-02", E1);
  ok("as outras duas estimadas a 125: 10 + 0,4 + 0,8 = 11,2 unidades", perto(E1.un,11.2)&&perto(E1.custo,1153)&&E1.pend===2, E1);
  ok("ficam 2 caixas", await pg.$$eval("#pendList [data-pi]",e=>e.length)===2);
  // preço manual mais recente ganha ao da compra
  const E2=await pg.evaluate(()=>{ const x=conta("trinv").posicoes[0]; x.pr=130; x.prData="2026-11-10"; return posEf(x).pr; });
  ok("preço registado à mão depois da compra fica", E2===130, E2);
  const E3=await pg.evaluate(()=>{ const x=conta("trinv").posicoes[0]; x.plano.precoAuto=false; x.prData="2026-08-01"; x.pr=100; const r=posEf(x).pr; x.plano.precoAuto=true; return r; });
  ok("sem 'usar o preço de cada compra', o preço fica o registado", E3===100, E3);

  // modo unidades e dia 31
  const U=await pg.evaluate(()=>{ const x={un:0,custo:0,pr:100,prData:"2026-01-01",plano:{modo:"un",qtd:1,per:"mes",inicio:"2026-01-31",fim:"2026-04-30",comissao:0,precoAuto:true},
    compras:{"2026-02-28":{un:1,eur:130}}}; const q=posEf(x,"2026-11-15"); return {d:q.compras.map(k=>k.d),un:q.un,custo:q.custo,pr:q.pr}; });
  ok("dia 31: 31/01, 28/02, 31/03, 30/04 e pára no fim", U.d.join()==="2026-01-31,2026-02-28,2026-03-31,2026-04-30", U);
  ok("1 ação por mês: 4 unidades; paga 130 em fevereiro e as outras estimadas a 130", U.un===4&&perto(U.custo,520)&&U.pr===130, U);
  const Q=await pg.evaluate(()=>datasPlano({per:"quinzena",inicio:"2026-10-20"},"2026-11-20").join()+" | "+datasPlano({per:"trimestre",inicio:"2026-05-15"},"2026-11-20").join());
  ok("quinzenal e trimestral", Q==="2026-10-20,2026-11-03,2026-11-17 | 2026-05-15,2026-08-15,2026-11-15", Q);

  // criar um plano pelo formulário
  await pg.tap("#invHdr"); await pg.waitForTimeout(250);
  await pg.tap('[data-plano="trinv|"]'); await pg.waitForTimeout(300);
  await pg.fill("#pN","BTC"); await pg.selectOption("#pCat","cripto");
  await pg.fill("#pU","0,002".replace(",",".")); await pg.fill("#pC","150"); await pg.fill("#pP","80000");
  await pg.selectOption("#pModo","eur"); await pg.fill("#pQ","20"); await pg.selectOption("#pPer","semana");
  await pg.fill("#pIni","2026-11-01"); await pg.selectOption("#pOr",""); await pg.waitForTimeout(150);
  const res=await pg.evaluate(()=>({un:E("rUn").textContent,cst:E("rCst").textContent,pend:E("rPend").textContent}));
  ok("formulário: 01/11, 08/11, 15/11 → 3 por preencher, 210 € pagos", res.pend==="3"&&/210,00/.test(res.cst), res);
  await pg.tap("#pOk"); await pg.waitForTimeout(350);
  const novo=await pg.evaluate(()=>{ const x=conta("trinv").posicoes.find(p=>p.n==="BTC"); return x&&{cat:x.cat,un:x.un,plano:x.plano}; });
  ok("plano gravado numa posição nova", novo&&novo.cat==="cripto"&&novo.un===0.002&&novo.plano.per==="semana"&&novo.plano.origem==="", novo);
  ok("a aba Investido continua aberta", await pg.$eval("#invBody",e=>!e.classList.contains("hide")));
  ok("plano não mexe na TR quando o dinheiro vem de fora", perto(await pg.evaluate(()=>estado(conta("tr"),new Date()).investido),1047));
  // editar: apagar uma compra preenchida volta a pô-la por preencher
  await pg.tap('[data-plano="trinv|v"]'); await pg.waitForTimeout(300);
  await pg.tap('[data-pcx="2026-09-02"]'); await pg.waitForTimeout(150); await pg.tap("#pOk"); await pg.waitForTimeout(300);
  ok("compra apagada volta a ficar por preencher", await pg.evaluate(()=>posEf(conta("trinv").posicoes.find(p=>p.id==="v")).pend.length===3));
  // terminar
  await pg.tap('[data-plano="trinv|v"]'); await pg.waitForTimeout(300); await pg.tap("#pFimHoje"); await pg.waitForTimeout(300);
  ok("terminar o plano hoje", await pg.evaluate(()=>conta("trinv").posicoes.find(p=>p.id==="v").plano.fim==="2026-11-15"));
  // escondido: a caixa não mostra o valor
  await pg.evaluate(()=>{ conta("trinv").ocultarValor=true; save(); pintaPatrim(); });
  const vis=await pg.$eval("#pendList",e=>e.textContent);
  ok("carteira escondida: as caixas não mostram valores", !/\d+,\d\d\s?€/.test(vis), vis.slice(0,200));
  await b.close();
  console.log(falhas?"PLANO: "+falhas+" FALHAS em "+feitos:"PLANO: "+feitos+" verificações certas");
  process.exit(falhas?1:0);
})();
