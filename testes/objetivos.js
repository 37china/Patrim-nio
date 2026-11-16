// Objetivos e Orçamento, com contas feitas à mão. Corre: node testes/objetivos.js
const path=require("path");
const {chromium}=require(process.env.PLAYWRIGHT||'/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js');
const FICHEIRO=process.argv[2]||path.join(__dirname,"..","index.html");
let falhas=0, feitos=0;
const ok=(n,c,x)=>{ feitos++; if(!c){ falhas++; console.log("  FALHA  "+n+(x!==undefined?"  -> "+JSON.stringify(x):"")); } };
const perto=(a,b)=>Math.abs(a-b)<0.005;
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:390,height:1100},hasTouch:true,isMobile:true,timezoneId:"Europe/Lisbon",locale:"pt-PT"});
  pg.on("pageerror",e=>{ falhas++; console.log("  ERRO JS: "+e.message); });
  await pg.clock.setFixedTime(new Date("2026-11-16T12:00:00"));
  await pg.goto("file://"+path.resolve(FICHEIRO)); await pg.waitForTimeout(350);
  await pg.evaluate(()=>{
    S.rendimento=760; S.fixas=[{n:"Renda",v:420,f:true},{n:"Comida",v:150,f:false}];
    S.potes=S.potes.filter(p=>p.fix);
    S.potes.push({id:"a",n:"Portátil",c:"var(--ac)",obj:1200,prazo:"2027-05-31",aloc:100,saldo:300,acum:true,conta:null});
    S.potes.push({id:"b",n:"Viagem",c:"var(--inv)",obj:600,parte:50,aloc:120,saldo:0,acum:true,conta:null});
    S.potes.push({id:"c",n:"Fundo de emergência",c:"var(--obj)",metaMeses:3,aloc:50,saldo:0,acum:true,conta:null});
    S.mesAtivo="2026-11"; S.movs=[]; save();
  });
  // repartição: sobram 760 − 570 = 190
  let R=await pg.evaluate(()=>{ const r=reparticao(); return {a:r.r.a.dado,b:r.r.b.dado,c:r.r.c.dado,pedido:r.pedido,falta:r.falta,gastar:r.gastar}; });
  ok("pedem 270; sobram 190: Portátil 100, Viagem 90, Fundo 0", R.a===100&&R.b===90&&R.c===0&&R.pedido===270&&perto(R.falta,80), R);
  ok("para gastar = 760 − 420 fixas − 190 = 150", perto(R.gastar,150), R);
  const A=await pg.evaluate(()=>{ const r=reparticao(); return estadoObj(pote("a"),r.r.a); });
  ok("Portátil: faltam 900 em 6 meses → 150/mês, atrasado", A.precisa===150&&A.nivel==="mal"&&/Atrasado/.test(A.txt), A);
  ok("Portátil: a 100/mês chegas em ago 2027", /ago 2027/.test(A.txt), A.txt);
  const B=await pg.evaluate(()=>({alvo:alvoDe(pote("b")),c:alvoDe(pote("c"))}));
  ok("Viagem a meias: meta 300; Fundo: 3 × 570 = 1710", B.alvo===300&&B.c===1710, B);
  // separador
  await pg.evaluate(()=>go("potes")); await pg.waitForTimeout(300);
  const nomes=await pg.$$eval("#potesTudo button[data-pe] > span:first-child",e=>e.map(x=>x.textContent));
  ok("Objetivos: só os três, sem o pote das despesas", nomes.join("|")==="Portátil|Viagem|Fundo de emergência", nomes);
  ok("título e separador dizem Objetivos", await pg.evaluate(()=>E("viewTitle").textContent==="Objetivos"&&/Objetivos/.test(document.querySelector('nav [data-v="potes"]').textContent)));
  ok("resumo avisa que faltam 80", /faltam/.test(await pg.$eval("#objResumo",e=>e.textContent)));
  // prioridade: subir o Fundo para o topo
  await pg.tap("#ordPote"); await pg.waitForTimeout(150);
  await pg.tap('[data-pu="c"]'); await pg.waitForTimeout(100); await pg.tap('[data-pu="c"]'); await pg.waitForTimeout(100);
  await pg.tap("#ordPote"); await pg.waitForTimeout(150);
  R=await pg.evaluate(()=>{ const r=reparticao(); return {a:r.r.a.dado,b:r.r.b.dado,c:r.r.c.dado}; });
  ok("Fundo no topo: Fundo 50, Portátil 100, Viagem 40", R.c===50&&R.a===100&&R.b===40, R);
  // Orçamento
  await pg.evaluate(()=>go("orc")); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{ S.movs.push({id:1,d:"2026-11-10",v:30,cat:"Alimentação",pote:"correntes"}); save(); rPlano(); });
  const g=await pg.$eval("#orcGastar",e=>e.textContent);
  ok("Para gastar: ainda 120 e 8,00 por dia nos 15 dias", /120,00/.test(g)&&/8,00/.test(g)&&/15 dias/.test(g), g);
  await pg.fill('[data-oa="b"]',"60"); await pg.waitForTimeout(150);
  ok("mudar o valor no Orçamento muda o objetivo", await pg.evaluate(()=>pote("b").aloc===60));
  ok("objetivo atrasado mostra quanto precisa", /Para chegar a tempo/.test(await pg.$eval('[data-oh="a"]',e=>e.textContent)));
  // distribuir o mês seguinte
  await pg.clock.setFixedTime(new Date("2026-12-02T12:00:00"));
  await pg.evaluate(()=>render()); await pg.waitForTimeout(200);
  ok("dezembro: aviso para distribuir", /Distribuir a mesada/.test(await pg.$eval("#rolloverBanner",e=>e.textContent)));
  await pg.tap("#doRoll_orc"); await pg.waitForTimeout(250);
  const sal=await pg.evaluate(()=>({a:pote("a").saldo,b:pote("b").saldo,c:pote("c").saldo}));
  ok("dezembro: Portátil 300+100, Viagem 0+40, Fundo 0+50", sal.a===400&&sal.b===40&&sal.c===50, sal);
  // criar pelo formulário
  await pg.evaluate(()=>go("potes")); await pg.waitForTimeout(250);
  await pg.tap("#addPote"); await pg.waitForTimeout(300);
  await pg.fill("#pN","Bicicleta"); await pg.fill("#pO","500"); await pg.fill("#pPrazo","2027-06-30"); await pg.fill("#pA","20");
  await pg.waitForTimeout(150);
  ok("formulário diz quanto é preciso por mês", /por mês/.test(await pg.$eval("#pPlano",e=>e.textContent)), await pg.$eval("#pPlano",e=>e.textContent));
  await pg.fill("#pNota","Loja https://www.exemplo.pt/bici");
  await pg.tap("#pOk"); await pg.waitForTimeout(300);
  ok("objetivo novo gravado no fim da prioridade", await pg.evaluate(()=>objetivos().slice(-1)[0].n==="Bicicleta"&&objetivos().slice(-1)[0].obj===500));
  ok("a ligação aparece com o nome do site", /exemplo\.pt/.test(await pg.$eval("#potesTudo",e=>e.textContent)));
  // comprei, com o dinheiro a sair da TR
  await pg.evaluate(()=>{ conta("tr").subs=[{id:"s",valor:2000,data:"2026-11-01"}]; conta("tr").taxas=[{data:"2026-11-01",v:0}]; pote("a").conta="tr"; save(); rPotes(); });
  await pg.tap('[data-pe="a"]'); await pg.waitForTimeout(250); await pg.tap("#pComp"); await pg.waitForTimeout(250);
  await pg.fill("#cV","1150"); await pg.tap("#cOk"); await pg.waitForTimeout(300);
  const cp=await pg.evaluate(()=>({estado:pote("a").estado,v:pote("a").comprado.v,tr:estado(conta("tr"),new Date()).valor,nos:objetivos().map(p=>p.id)}));
  ok("comprei: sai dos objetivos, a TR perde 1150", cp.estado==="comprado"&&cp.v===1150&&perto(cp.tr,850)&&!cp.nos.includes("a"), cp);
  ok("aparece em Comprados", await pg.$eval("#cardComprados",e=>!e.classList.contains("hide")));
  await pg.tap("#compHdr"); await pg.waitForTimeout(150); await pg.tap('[data-cp="a"]'); await pg.waitForTimeout(250);
  await pg.tap("#cRep"); await pg.waitForTimeout(250);
  ok("voltar a pôr nos objetivos", await pg.evaluate(()=>objetivos().some(p=>p.id==="a")));
  // escondido
  await pg.tap("#olhoPotes"); await pg.waitForTimeout(200);
  const vis=await pg.evaluate(()=>[...document.querySelectorAll("#v-potes *")].filter(e=>!e.children.length&&/\d,\d\d\s?€/.test(e.textContent)).map(e=>e.textContent));
  ok("olho fechado: nenhum valor nos Objetivos", vis.length===0, vis);
  await pg.evaluate(()=>{ S.ocOrc=true; save(); go("orc"); }); await pg.waitForTimeout(250);
  const vo=await pg.evaluate(()=>[...document.querySelectorAll("#orcObj *, #orcGastar *")].filter(e=>!e.children.length&&/\d,\d\d\s?€/.test(e.textContent)).map(e=>e.textContent));
  ok("olho fechado no Orçamento: nada nos dois cartões novos", vo.length===0, vo);
  await b.close();
  console.log(falhas?"OBJETIVOS: "+falhas+" FALHAS em "+feitos:"OBJETIVOS: "+feitos+" verificações certas");
  process.exit(falhas?1:0);
})();
