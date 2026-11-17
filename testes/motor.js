// Contas do motor de juros verificadas à mão. Corre: node testes/motor.js   (FUSO=Europe/Lisbon para outro fuso)
const path=require("path");
const {chromium}=require(process.env.PLAYWRIGHT||'/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js');
const {comExemplo}=require("./exemplo.js");
const FICHEIRO=process.argv[2]||path.join(__dirname,"..","index.html");
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const pg=await b.newPage(process.env.FUSO?{timezoneId:process.env.FUSO}:{}); pg.on("pageerror",e=>console.log("ERRO:",e.message));
  await comExemplo(pg);
  await pg.goto("file://"+path.resolve(FICHEIRO)); await pg.waitForTimeout(400);
  const r=await pg.evaluate(()=>{
    const f=x=>Math.round(x*10000)/10000;
    const out={};
    // A: prazo, juro no vencimento
    const A={id:"a",tipo:"prazo",vence:"2026-07-01",periodoMeses:0,irs:28,retencao:true,
             subs:[{id:"s",valor:5000,data:"2026-01-01"}],taxas:[{data:"2026-01-01",v:3}]};
    let e=estado(A,new Date("2026-04-01T00:00:00"));
    out.A_meio={valor:f(e.valor),pendBruto:f(e.pendBruto),pendLiq:f(e.pendLiq),vencido:e.vencido,prox:e.proxima&&(e.proxima.getFullYear()+"-"+String(e.proxima.getMonth()+1).padStart(2,"0")+"-"+String(e.proxima.getDate()).padStart(2,"0"))};
    e=estado(A,new Date("2026-08-01T00:00:00"));
    out.A_depois={valor:f(e.valor),pend:f(e.pendLiq),liquido:f(e.liquido),vencido:e.vencido};
    // B: prazo, trimestral pago para fora
    const B={id:"b",tipo:"prazo",vence:"2027-01-01",periodoMeses:3,irs:28,retencao:true,
             subs:[{id:"s",valor:6000,data:"2026-01-01"}],taxas:[{data:"2026-01-01",v:4}]};
    e=estado(B,new Date("2026-08-15T00:00:00"));
    out.B_meio={valor:f(e.valor),pagoFora:f(e.pagoFora),pendBruto:f(e.pendBruto),pendLiq:f(e.pendLiq),prox:e.proxima&&(e.proxima.getFullYear()+"-"+String(e.proxima.getMonth()+1).padStart(2,"0")+"-"+String(e.proxima.getDate()).padStart(2,"0"))};
    e=estado(B,new Date("2027-02-01T00:00:00"));
    out.B_depois={valor:f(e.valor),pagoFora:f(e.pagoFora),bruto:f(e.bruto),pend:f(e.pendLiq),vencido:e.vencido};
    out.A365={valor:f(estado(Object.assign({},A,{base:365}),new Date("2026-08-01T00:00:00")).valor)};
    // E: aforro com e sem imposto
    const af=irs=>({id:"e",tipo:"aforro",serie:"F",premio:0,irs:irs,subs:[{id:"s",valor:1000,data:"2026-01-10"}],taxas:[{data:"2026-01-10",v:2.5}]});
    let e0=estado(af(null),new Date("2026-07-10T12:00:00")), e28=estado(af(28),new Date("2026-07-10T12:00:00"));
    out.E0={valor:f(e0.valor)}; out.E28={valor:f(e28.valor),imp:f(e28.impostoPago)};
    // C: regressão da remunerada mensal
    const mk=t=>({id:"z",tipo:"remunerada",freq:"mensal",diaJuro:1,irs:28,retencao:true,
      subs:[{id:"s",valor:1200,data:"2026-08-01"}],taxas:t});
    const q=new Date("2026-11-09T00:00:00");
    out.C={so225:f(estado(mk([{data:"2026-08-01",v:2.25}]),q).valor), so3:f(estado(mk([{data:"2026-08-01",v:3}]),q).valor)};
    // D: diária com partida hoje
    const hoje=hojeStr();
    e=estado({id:"y",tipo:"remunerada",freq:"diaria",horaJuro:"02:08",irs:null,
      subs:[{id:"s",valor:7654.32,data:hoje}],taxas:[{data:hoje,v:2.5}]},new Date());
    out.D={valor:f(e.valor)};
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  const perto=(a,b,t)=>Math.abs(a-b)<=(t||0.0006);
  const ok=[
    // A: 5000 a 3%, 01/01 a 01/07 (181 dias), base 360
    ["A meio: valor 5000",            r.A_meio.valor===5000],
    ["A meio: bruto 37,50",           perto(r.A_meio.pendBruto,37.5)],          // 5000*3%*90/360
    ["A meio: líquido 27,00",         perto(r.A_meio.pendLiq,27)],
    ["A depois: 5054,30",             perto(r.A_depois.valor,5054.30,0.00001)], // 75,42 - 21,12
    ["A depois: juro líquido 54,30",  perto(r.A_depois.liquido,54.30,0.00001)],
    ["A depois: nada por entrar",     r.A_depois.pend===0 && r.A_depois.vencido===true],
    ["A base 365: 5053,55",           perto(r.A365.valor,5053.55,0.00001)],     // 74,38 - 20,83
    // B: 6000 a 4%, trimestral pago para fora, base 360
    ["B meio: capital intacto",       r.B_meio.valor===6000],
    ["B meio: pago fora 86,88",       perto(r.B_meio.pagoFora,86.88,0.00001)],  // 43,20 + 43,68
    ["B meio: por entrar 21,60",      perto(r.B_meio.pendLiq,21.6)],            // 45 dias: 30,00 bruto
    ["B meio: próxima 2026-10-01",    r.B_meio.prox==="2026-10-01"],
    ["B depois: bruto 243,33",        perto(r.B_depois.bruto,243.33,0.00001)],  // 60 + 60,67 + 61,33 + 61,33
    ["B depois: pago fora 175,20",    perto(r.B_depois.pagoFora,175.20,0.00001)],
    ["B depois: capital 6000, parado",r.B_depois.valor===6000 && r.B_depois.pend===0],
    ["C: sem regressão",              perto(r.C.so225,1204.91,0.006) && perto(r.C.so3,1206.55,0.006)],
    ["D: partida hoje = 7654,32",     r.D.valor===7654.32],
    // E: aforro, 1000 a 2,5%, dois trimestres, com e sem IRS
    ["E sem IRS: 1012,5391",          perto(r.E0.valor,1012.5391)],             // 1000*1,00625^2
    ["E com 28%: 1009,0203",          perto(r.E28.valor,1009.0203)],            // 1000*1,0045^2
    ["E com 28%: imposto 3,5078",     perto(r.E28.imp,3.5078)]
  ];
  let falhas=0; ok.forEach(([n,v])=>{ if(!v){falhas++; console.log("FALHA:",n);} });
  console.log(falhas?("MOTOR: "+falhas+" FALHAS"):"MOTOR: "+ok.length+" verificações certas");
  await b.close(); process.exit(falhas?1:0);
})();
