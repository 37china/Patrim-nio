// Instalação nova: tem de abrir vazia, sem contas, objetivos, orçamento nem valores inventados.
// E a duração dos depósitos a prazo. Corre: node testes/limpo.js
const path=require("path");
const {chromium}=require(process.env.PLAYWRIGHT||'/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js');
const FICHEIRO=process.argv[2]||path.join(__dirname,"..","index.html");
let falhas=0, feitos=0;
const ok=(n,c,x)=>{ feitos++; if(!c){ falhas++; console.log("  FALHA  "+n+(x!==undefined?"  -> "+JSON.stringify(x):"")); } };
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const pg=await b.newPage({viewport:{width:390,height:900},hasTouch:true,isMobile:true,timezoneId:"Europe/Lisbon",locale:"pt-PT"});
  pg.on("pageerror",e=>{ falhas++; console.log("  ERRO JS: "+e.message); });
  await pg.goto("file://"+path.resolve(FICHEIRO)); await pg.waitForTimeout(400);
  const S0=await pg.evaluate(()=>({contas:S.contas.length,obj:objetivos().length,potes:S.potes.map(p=>p.n),fixas:S.fixas.length,rend:S.rendimento,movs:S.movs.length,mig:S.mig10}));
  ok("sem contas, objetivos, despesas nem rendimento", S0.contas===0&&S0.obj===0&&S0.fixas===0&&S0.rend===0&&S0.movs===0, S0);
  ok("só existe o sítio onde se descontam os gastos, que não é um objetivo", S0.potes.length===1&&S0.potes[0]==="Gastos do mês", S0);
  ok("nasce com as migrações dadas como feitas", S0.mig===2, S0);
  // cada separador abre e não mostra nenhum valor diferente de zero
  for(const v of ["orc","potes","contas","patrim","import","config"]){
    await pg.evaluate(x=>go(x),v); await pg.waitForTimeout(250);
    const nz=await pg.evaluate(()=>[...document.querySelectorAll("section:not(.hide) *")].filter(e=>!e.children.length)
      .map(e=>(e.value!==undefined&&e.tagName==="INPUT")?e.value:e.textContent).filter(t=>/[1-9]\d*,\d\d\s?€|^[1-9]\d*([.,]\d+)?$/.test(String(t).trim())));
    ok(v+": nada preenchido", nz.length===0||(v==="orc"&&nz.every(t=>/^1$/.test(t))), nz);
    await pg.screenshot({path:"/tmp/limpo-"+v+".png"});
  }
  ok("Contas: diz que não há contas", /Ainda não tens contas|Adiciona/i.test(await pg.evaluate(()=>{go("contas");return E("hubList").textContent;})));
  // recarregar não volta a criar nada
  await pg.reload(); await pg.waitForTimeout(400);
  ok("depois de recarregar continua vazio", await pg.evaluate(()=>S.contas.length===0&&objetivos().length===0));
  // duração dos depósitos
  const D=await pg.evaluate(()=>[somaDuracao("2026-01-31","m1")||"", somaDuracao("2026-01-31","m6"), somaDuracao("2026-11-17","d30"), somaDuracao("2026-11-17","m12"), duracaoDe("2026-11-17","2027-05-17"), duracaoDe("2026-11-17","2027-01-01")].join("|"));
  ok("durações: 6 meses a 31/01 → 31/07; 30 dias; 1 ano; reconhece 6 meses; outra", D==="2026-02-28|2026-07-31|2026-12-17|2027-11-17|m6|outra", D);
  await pg.evaluate(()=>{ go("patrim"); sheetAtivo(null,"prazo"); }); await pg.waitForTimeout(300);
  await pg.fill("#aN","Depósito 6 meses"); await pg.fill("#aCap","1000"); await pg.fill("#aTx","2");
  await pg.fill("#aIni","2026-11-01"); await pg.dispatchEvent("#aIni","change");
  await pg.selectOption("#aDur","m6"); await pg.waitForTimeout(150);
  ok("escolher 6 meses põe o vencimento", await pg.$eval("#aVence",e=>e.value)==="2027-05-01", await pg.$eval("#aVence",e=>e.value));
  await pg.fill("#aIni","2026-10-01"); await pg.dispatchEvent("#aIni","change"); await pg.waitForTimeout(100);
  ok("mudar a constituição mantém a duração", await pg.$eval("#aVence",e=>e.value)==="2027-04-01");
  await pg.fill("#aVence","2027-03-10"); await pg.dispatchEvent("#aVence","change"); await pg.waitForTimeout(100);
  ok("vencimento à mão passa a 'Outra'", await pg.$eval("#aDur",e=>e.value)==="outra");
  await pg.selectOption("#aDur","d90"); await pg.waitForTimeout(100);
  await pg.tap("#aOk"); await pg.waitForTimeout(350);
  await pg.tap("#prazoHdr"); await pg.waitForTimeout(200);
  const pz=await pg.$eval("#prazoBody",e=>e.textContent);
  ok("gravado e a duração aparece no Património", /90 dias · Vence a 30\/12\/2026/.test(pz), pz.slice(0,200));
  await b.close();
  console.log(falhas?"LIMPO: "+falhas+" FALHAS em "+feitos:"LIMPO: "+feitos+" verificações certas");
  process.exit(falhas?1:0);
})();
