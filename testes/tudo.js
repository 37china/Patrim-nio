// Bateria completa da app, com dados inventados. Corre: node testes/tudo.js [caminho do index.html]
// Precisa do Playwright e do Chrome; o caminho do Playwright pode vir em PLAYWRIGHT.
const path=require("path");
const {chromium}=require(process.env.PLAYWRIGHT||'/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright/index.js');
const FICHEIRO=process.argv[2]||path.join(__dirname,"..","index.html");
const ALVO="file://"+path.resolve(FICHEIRO);
let falhas=0, feitos=0;
const ok=(nome,cond,extra)=>{ feitos++; if(!cond){ falhas++; console.log("  FALHA  "+nome+(extra!==undefined?"  -> "+JSON.stringify(extra):"")); } };
const sec=t=>console.log("\n"+t);

(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
  const nova=async()=>{
    const pg=await b.newPage({viewport:{width:390,height:1000},hasTouch:true,isMobile:true,timezoneId:"Europe/Lisbon",locale:"pt-PT"});
    pg.on("pageerror",e=>{ falhas++; console.log("  ERRO JS: "+e.message); });
    await pg.goto(ALVO); await pg.waitForTimeout(350);
    return pg;
  };
  const semear=pg=>pg.evaluate(()=>{
    const h="2026-05-02", d5=new Date(Date.now()-5*864e5).toISOString().slice(0,10), hoje=hojeStr();
    conta("t212").subs=[{id:"a",valor:7654.32,data:h}];conta("t212").taxas=[{data:h,v:2.5}];conta("t212").tanb=2.5;
    conta("tr").subs=[{id:"b",valor:1200,data:h}];conta("tr").taxas=[{data:h,v:2.25}];conta("tr").tanb=2.25;
    conta("aforro").subs=[{id:"c",valor:600,data:h}];conta("aforro").taxas=[{data:h,v:2.5}];
    conta("cgd").saldo=437.6;conta("cgd").data=d5;conta("cgd").esperado="auto";
    conta("revolut").saldo=212.45;conta("revolut").data=d5;conta("revolut").esperado=300;
    conta("trinv").posicoes=[{id:"p1",n:"VWCE",cat:"etf",un:12.4,pr:128.4,prData:hoje,custo:1420}];
    S.contas.push({id:"dp",n:"DP CGD",tipo:"prazo",vence:"2099-01-01",periodoMeses:0,irs:28,retencao:true,
                   subs:[{id:"s",valor:5000,data:h}],taxas:[{data:h,v:3}]});
    S.contas.push({id:"pm",n:"Fundo PE",tipo:"privado",valor:2500,investido:2000,data:d5,secundaria:true});
    S.fixas=[{n:"Renda",v:420,f:true},{n:"Net",v:35,f:false}]; S.rendimento=760;
    S.potes.find(p=>p.fix).conta="cgd"; pote("gastar").conta="revolut"; pote("investir").conta="tr";
    S.potes.forEach(p=>{ if(!p.fix) p.obj=1000; });
    aplicarMes(mesKey(new Date()));
    save(); render();
  });
  // montantes à vista num separador: texto visível com cara de euros
  const montantes=pg=>pg.evaluate(()=>{
    const out=[], re=/\d[\d  .]*,\d{2,}\s*€/;
    document.querySelectorAll("section:not(.hide) *").forEach(el=>{
      if(el.children.length||el.tagName==="OPTION"||el.tagName==="SELECT") return;
      const t=(el.textContent||"").trim(); if(!t||!re.test(t)) return;
      const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;
      out.push(t.slice(0,48));
    });
    return out;
  });
  const mascaras=pg=>pg.evaluate(()=>document.querySelectorAll("section:not(.hide) .msk").length);
  const noHtml=(pg,sel,txt)=>pg.evaluate(([s,t])=>document.querySelector(s).innerHTML.includes(t),[sel,txt]);

  /* ================= A. OCULTAR ================= */
  sec("A. Ocultar");
  let pg=await nova(); await semear(pg);

  // A1 cada olho: tudo ou nada
  for(const [v,olho] of [["potes","#olhoPotes"],["contas","#olhoContas"],["orc","#olhoOrc"]]){
    await pg.evaluate(x=>go(x),v); await pg.waitForTimeout(250);
    ok(v+": começa sem máscaras", await mascaras(pg)===0);
    ok(v+": começa com montantes à vista", (await montantes(pg)).length>0 || v==="orc");
    await pg.tap(olho); await pg.waitForTimeout(250);
    const m=await montantes(pg);
    ok(v+": olho fechado não deixa montantes", m.length===0, m);
    ok(v+": olho fechado põe máscaras", await mascaras(pg)>0);
    await pg.tap(olho); await pg.waitForTimeout(250);
    ok(v+": olho aberto tira todas as máscaras", await mascaras(pg)===0);
  }
  // A2 Contas no modo "Por mês"
  await pg.evaluate(()=>{go("contas");S.hubModo="mensal";save();rHub();}); await pg.waitForTimeout(200);
  await pg.tap("#olhoContas"); await pg.waitForTimeout(200);
  let m=await montantes(pg); ok("contas/por mês: nada à vista", m.length===0, m);
  await pg.tap("#olhoContas"); await pg.evaluate(()=>{S.hubModo="total";save();rHub();});

  // A3 o caso que falhou em produção: esconder no Património não mexe nas Contas
  await pg.evaluate(()=>go("patrim")); await pg.waitForTimeout(300);
  await pg.tap('[data-ocl="tr"]'); await pg.waitForTimeout(250);
  const a3=await pg.evaluate(()=>{
    const bloco=document.querySelector('[data-ce="tr"]').closest("div[style*='border-bottom']");
    const fora=[...document.querySelectorAll("#v-patrim .msk")].filter(m=>!bloco.contains(m)).length;
    return {dentro:bloco.querySelectorAll(".msk").length, fora, texto:bloco.textContent};
  });
  ok("patrim: toque no valor da TR esconde o saldo e a linha 'Na conta'", a3.dentro===2 && !/1\s?20\d,\d\d/.test(a3.texto), a3);
  ok("patrim: e não esconde mais nada", a3.fora===0, a3);
  ok("patrim: o juro da TR continua à vista (esconde-se à parte)", /Juro líquido/.test(a3.texto) && /\d,\d\d\s?€/.test(a3.texto), a3.texto);
  await pg.evaluate(()=>go("contas")); await pg.waitForTimeout(300);
  ok("contas: olho aberto mostra TUDO mesmo com a TR escondida no Património", await mascaras(pg)===0, await mascaras(pg));
  await pg.tap("#olhoContas"); await pg.waitForTimeout(200);
  m=await montantes(pg); ok("contas: olho fechado esconde tudo", m.length===0, m);
  await pg.tap("#olhoContas"); await pg.waitForTimeout(200);
  ok("contas: olho aberto volta a mostrar tudo", await mascaras(pg)===0);
  await pg.evaluate(()=>go("potes")); await pg.waitForTimeout(250);
  ok("potes: não foi contaminado", await mascaras(pg)===0);

  // A4 Património: olho = esconder tudo; se já está tudo, mostrar tudo
  await pg.evaluate(()=>go("patrim")); await pg.waitForTimeout(300);
  await pg.tap("#longoHdr"); await pg.tap("#totHdr"); await pg.waitForTimeout(250);
  // nenhum saldo nem montante posto pode existir no HTML, nem em atributos
  // (procura-se o montante inteiro, "212,45": só "212" apanhava o nome "Trading 212")
  const proibidos=await pg.evaluate(()=>{ const o=new Set(); S.contas.forEach(c=>{ const e=estado(c,new Date());
    [e.valor,e.investido].forEach(v=>{ if(v>0) o.add(fmt(v).replace(/\s*€$/,"")); }); }); return [...o]; });
  ok("patrim: há saldos para procurar", proibidos.length>=6, proibidos);
  // controlo: antes de esconder, o detetor tem de os encontrar; um detetor cego passava sempre
  let achados=0; for(const n of proibidos) if(await noHtml(pg,"#v-patrim",n)) achados++;
  ok("controlo: com tudo à vista, o detetor encontra os saldos", achados>=6, {achados,proibidos});
  ok("controlo: com tudo à vista, há montantes legíveis", (await montantes(pg)).length>=15, (await montantes(pg)).length);
  await pg.tap("#patOlho"); await pg.waitForTimeout(250);
  m=await montantes(pg); ok("patrim: olho esconde tudo (com abas abertas)", m.length===0, m);
  for(const n of proibidos)
    ok("patrim: '"+n+"' não existe na página", !(await noHtml(pg,"#v-patrim",n)));
  await pg.waitForTimeout(1300); m=await montantes(pg); ok("patrim: continua escondido ao fim de 1,3 s", m.length===0, m);
  await pg.waitForTimeout(1300); m=await montantes(pg); ok("patrim: continua escondido ao fim de 2,6 s", m.length===0, m);
  ok("patrim: ícone do olho riscado", await pg.$eval("#patOlho",e=>e.innerHTML.includes("M3 3l18 18")));
  await pg.tap("#patOlho"); await pg.waitForTimeout(250);
  ok("patrim: segundo toque no olho mostra tudo", await mascaras(pg)===0, await mascaras(pg));
  ok("patrim: ícone do olho aberto", await pg.$eval("#patOlho",e=>!e.innerHTML.includes("M3 3l18 18")));
  // toque individual e volta
  await pg.tap("#patTotal"); await pg.waitForTimeout(200);
  ok("patrim: toque no total esconde-o", await pg.$eval("#patTotal",e=>!!e.querySelector(".msk")));
  await pg.waitForTimeout(1300);
  ok("patrim: total continua escondido depois do tique", await pg.$eval("#patTotal",e=>!!e.querySelector(".msk")&&!/\d/.test(e.textContent)));
  await pg.tap("#patTotal"); await pg.waitForTimeout(200);
  ok("patrim: novo toque mostra-o", await pg.$eval("#patTotal",e=>/\d/.test(e.textContent)));

  await pg.tap('[data-ocl="t212"]'); await pg.waitForTimeout(200);
  ok("patrim: valor da T212 escondido ao toque", await pg.$eval('[data-ocl="t212"]',e=>!!e.querySelector(".msk")&&!/\d/.test(e.textContent)));
  await pg.tap('[data-ocl="t212"] .msk'); await pg.waitForTimeout(200);
  ok("patrim: tocar na máscara volta a mostrar", await pg.$eval('[data-ocl="t212"]',e=>/\d/.test(e.textContent)));
  await pg.tap('[data-oc="ocTotT"]'); await pg.waitForTimeout(200);
  ok("patrim: 'Tudo somado' esconde-se sozinho", await pg.$eval('[data-oc="ocTotT"]',e=>!!e.querySelector(".msk")));
  await pg.tap('[data-oc="ocTotT"]'); await pg.waitForTimeout(200);
  // esconder tudo, destapar um: o olho passa a "esconder tudo" outra vez
  await pg.tap("#patOlho"); await pg.waitForTimeout(200); await pg.tap("#patTotal"); await pg.waitForTimeout(200);
  ok("patrim: com um só valor destapado o olho fica aberto", await pg.$eval("#patOlho",e=>!e.innerHTML.includes("M3 3l18 18")));
  await pg.tap("#patOlho"); await pg.waitForTimeout(200);
  ok("patrim: e um toque volta a esconder tudo", (await montantes(pg)).length===0 && await pg.$eval("#patOlho",e=>e.innerHTML.includes("M3 3l18 18")));
  await pg.tap("#patOlho"); await pg.waitForTimeout(200);
  ok("patrim: outro toque mostra tudo", await mascaras(pg)===0);

  // A5 Orçamento: editar com o olho fechado não destapa os totais
  await pg.evaluate(()=>go("orc")); await pg.waitForTimeout(250);
  await pg.tap("#olhoOrc"); await pg.waitForTimeout(200);
  await pg.fill("#cfRend","800"); await pg.waitForTimeout(200);
  await pg.fill('[data-fv="0"]',"430"); await pg.waitForTimeout(250);
  m=await montantes(pg); ok("orc: totais tapados depois de editar", m.length===0, m);
  ok("orc: campos marcados para mascarar", await pg.$$eval("#v-orc input.oculto",e=>e.length)>=3);
  await pg.evaluate(()=>document.activeElement&&document.activeElement.blur()); await pg.waitForTimeout(120);
  const campo=await pg.$$eval("#v-orc input.oculto",els=>els.map(el=>{ const c=getComputedStyle(el);
    return {fill:c.webkitTextFillColor,cor:c.color,fundo:c.backgroundImage.slice(0,24),largura:c.backgroundSize}; }));
  ok("orc: o texto dos campos escondidos não é desenhado", campo.every(c=>/rgba\(0, 0, 0, 0\)|transparent/.test(c.fill)&&c.fundo.startsWith('url("data:image/svg')), campo);
  ok("orc: a marca é igual em todos os campos (não revela o tamanho do número)", new Set(campo.map(c=>c.fundo+c.largura)).size===1, campo);
  await pg.focus('[data-fv="0"]'); await pg.waitForTimeout(120);
  const foco=await pg.$eval('[data-fv="0"]',el=>{ const c=getComputedStyle(el); return {fill:c.webkitTextFillColor,fundo:c.backgroundImage}; });
  ok("orc: ao tocar num campo escondido, esse campo mostra o valor para editar", !/rgba\(0, 0, 0, 0\)|transparent/.test(foco.fill)&&foco.fundo==="none", foco);
  await pg.evaluate(()=>document.activeElement.blur());
  await pg.tap("#olhoOrc"); await pg.waitForTimeout(200);
  ok("orc: reabrir mostra o total certo", (await pg.$eval("#totOrc",e=>e.textContent)).includes("465,00"), await pg.$eval("#totOrc",e=>e.textContent));

  // A6 escolha do aspecto nas Definições
  await pg.evaluate(()=>go("config")); await pg.waitForTimeout(250);
  ok("definições: por omissão desfocado", await pg.$eval("#cfOcEx",e=>!!e.querySelector(".msk-b")));
  await pg.selectOption("#cfOcEstilo","pontos"); await pg.waitForTimeout(150);
  ok("definições: exemplo passa a pontos", await pg.$eval("#cfOcEx",e=>e.textContent.includes("•")));
  ok("definições: a escolha chega aos campos (classe no corpo da página)", await pg.evaluate(()=>document.body.classList.contains("oc-pontos")));
  await pg.evaluate(()=>go("contas")); await pg.waitForTimeout(250); await pg.tap("#olhoContas"); await pg.waitForTimeout(200);
  ok("contas: máscaras em pontos", await pg.$$eval("#hubList .msk-p",e=>e.length)>0 && await pg.$$eval("#hubList .msk-b",e=>e.length)===0);
  await pg.evaluate(()=>{S.ocEstilo="blur";save();rHub();}); await pg.waitForTimeout(150);
  ok("contas: máscaras desfocadas sem texto", await pg.$$eval("#hubList .msk-b",e=>e.length>0&&e.every(x=>x.textContent==="")));
  // A7 persiste a recarregar
  await pg.reload(); await pg.waitForTimeout(450); await pg.evaluate(()=>go("contas")); await pg.waitForTimeout(250);
  m=await montantes(pg); ok("contas: escondido depois de recarregar", m.length===0, m);
  await pg.close();

  /* ================= B. CONTAS SÓ BANCÁRIAS ================= */
  sec("B. Contas");
  pg=await nova(); await semear(pg);
  await pg.evaluate(()=>go("contas")); await pg.waitForTimeout(300);
  let nomes=await pg.$$eval("#hubList .nm > span:first-child",e=>e.map(x=>x.textContent));
  ok("só contas bancárias", nomes.length===4 && !nomes.some(x=>/carteira|DP CGD|Fundo|Aforro/i.test(x)), nomes);
  await pg.tap("#ordConta"); await pg.waitForTimeout(200);
  const antes=await pg.$$eval("#hubList .nm > span:first-child",e=>e.map(x=>x.textContent));
  await pg.tap("#hubList [data-cd]"); await pg.waitForTimeout(200);
  const dep=await pg.$$eval("#hubList .nm > span:first-child",e=>e.map(x=>x.textContent));
  ok("reordenar troca as duas primeiras", dep[0]===antes[1]&&dep[1]===antes[0], {antes,dep});
  ok("reordenar não usa botões dentro de botões", await pg.$$eval("#hubList button button",e=>e.length)===0);
  await pg.tap("#ordConta"); await pg.waitForTimeout(200);
  // editor das Contas: só o que é da conta enquanto sítio
  await pg.tap('[data-hc="cgd"]'); await pg.waitForTimeout(300);
  let campos=await pg.$$eval("#sheetIn label.f > span",e=>e.map(x=>x.textContent.trim()));
  ok("editor da conta: tem finalidade, pote e esperado", ["Nome","Esta conta paga juros?","Pote que vive aqui","Quanto devia lá estar"].every(x=>campos.includes(x)), campos);
  ok("editor da conta: sem taxa, IRS nem movimentos", !campos.some(x=>/TANB|IRS|Série|Vence|Pagamento/i.test(x)), campos);
  await pg.evaluate(()=>closeSheet());
  // conta nova que rende: guarda e abre o registo do rendimento
  await pg.tap("#addConta"); await pg.waitForTimeout(300);
  await pg.fill("#kN","Banco Novo"); await pg.selectOption("#kT","remunerada"); await pg.waitForTimeout(250);
  await pg.fill("#kN","Banco Novo"); await pg.tap("#kOk"); await pg.waitForTimeout(450);
  ok("conta nova com juros: abre o formulário do rendimento", await pg.$eval("#sheetIn h2",e=>e.textContent)==="Banco Novo" && !!(await pg.$("#aSubs")));
  campos=await pg.$$eval("#sheetIn label.f > span",e=>e.map(x=>x.textContent.trim()));
  ok("formulário do rendimento: sem finalidade nem pote", !campos.some(x=>/Finalidade|Pote que vive|Quanto devia/i.test(x)), campos);
  await pg.evaluate(()=>closeSheet());
  ok("conta nova ficou guardada como remunerada", await pg.evaluate(()=>S.contas.some(c=>c.n==="Banco Novo"&&c.tipo==="remunerada"&&c.subs.length===1)));
  await pg.close();

  /* ================= C. ADICIONAR AO PATRIMÓNIO ================= */
  sec("C. Editores por tipo");
  pg=await nova(); await semear(pg);
  await pg.evaluate(()=>go("patrim")); await pg.waitForTimeout(300);
  await pg.tap("#addPat"); await pg.waitForTimeout(300);
  const tipos=await pg.$$eval("[data-nt]",e=>e.map(x=>x.dataset.nt));
  ok("menu: cinco tipos, sem 'conta que não rende'", tipos.join()==="remunerada,prazo,aforro,investimento,privado", tipos);
  await pg.tap('[data-nt="prazo"]'); await pg.waitForTimeout(350);
  ok("menu: escolher 'depósito a prazo' abre o formulário de depósito", await pg.$eval("#sheetIn h2",e=>e.textContent)==="Novo depósito a prazo" && !!(await pg.$("#aVence")) && !(await pg.$("#kT")));
  await pg.evaluate(()=>closeSheet());
  const formas={};
  for(const t of ["remunerada","prazo","aforro","investimento","privado"]){
    await pg.evaluate(x=>sheetAtivo(null,x),t); await pg.waitForTimeout(300);
    formas[t]={titulo:await pg.$eval("#sheetIn h2",e=>e.textContent),
               seccoes:await pg.$$eval("#sheetIn .sec, #sheetIn h4",e=>e.map(x=>x.textContent.trim())),
               campos:await pg.$$eval("#sheetIn label.f > span",e=>e.map(x=>x.textContent.trim()))};
    ok(t+": não pergunta 'paga juros', finalidade nem pote", !formas[t].campos.some(x=>/Paga juros|paga juros|Finalidade|Pote que vive|Quanto devia/.test(x)), formas[t].campos);
    await pg.evaluate(()=>closeSheet());
  }
  const assin=Object.values(formas).map(f=>f.campos.join("|"));
  ok("os cinco formulários são diferentes entre si", new Set(assin).size===5, formas);
  ok("prazo: montante, constituição, vencimento, taxa fixa, quando é pago",
     ["Montante (€)","Constituído em","Vence em","Base de cálculo dos juros","Quando é pago"].every(x=>formas.prazo.campos.includes(x)), formas.prazo.campos);
  ok("prazo: não tem histórico de taxas nem movimentos", !formas.prazo.campos.some(x=>/TANB \(% ao ano\)$|Ponto de partida/.test(x)), formas.prazo.campos);
  ok("conta com juros: ponto de partida, taxa, pagamento", ["Ponto de partida","TANB (% ao ano)","Pagamento de juros"].every(x=>formas.remunerada.campos.includes(x)), formas.remunerada.campos);
  ok("aforro: série, prémio e imposto", ["Série","Prémio de permanência (p.p.)","Taxa base (%)","IRS descontado em cada capitalização (%)"].every(x=>formas.aforro.campos.includes(x)), formas.aforro.campos);
  ok("private market: investido", formas.privado.campos.some(x=>/investi ao todo/.test(x)), formas.privado.campos);
  console.log("  títulos:", Object.values(formas).map(f=>f.titulo).join(" · "));

  // criar um depósito a prazo pela interface
  await pg.evaluate(()=>sheetAtivo(null,"prazo")); await pg.waitForTimeout(300);
  await pg.fill("#aN","DP Teste"); await pg.fill("#aCap","3000"); await pg.fill("#aTx","3.5");
  await pg.tap("#aOk"); await pg.waitForTimeout(300);
  ok("prazo sem vencimento não grava", !!(await pg.$("#sheetIn")) && !(await pg.evaluate(()=>S.contas.some(c=>c.n==="DP Teste"))));
  const no0=await pg.evaluateHandle(()=>document.getElementById("aVence"));
  await pg.fill("#aIni","2026-06-01"); await pg.fill("#aVence","2027-06-01"); await pg.waitForTimeout(200);
  ok("mexer nas datas não refaz a folha (o seletor do iOS fechava)", await pg.evaluate(el=>el===document.getElementById("aVence")&&document.contains(el),no0));
  const fim=await pg.$eval("#rFim",e=>e.textContent);
  ok("prazo: no vencimento recebes 3076,65 (base 360)", /3\s?076,65/.test(fim), fim);
  await pg.selectOption("#aBase","365"); await pg.waitForTimeout(200);
  ok("prazo: base 365 dá 3075,60, sem refazer a folha", /3\s?075,60/.test(await pg.$eval("#rFim",e=>e.textContent)) && await pg.evaluate(el=>el===document.getElementById("aVence"),no0), await pg.$eval("#rFim",e=>e.textContent));
  await pg.selectOption("#aBase","360"); await pg.waitForTimeout(200);
  await pg.selectOption("#aPer","3"); await pg.waitForTimeout(250);
  ok("prazo trimestral: juro líquido até ao fim 76,65", (await pg.$eval("#rFim",e=>e.textContent)).includes("76,65"), await pg.$eval("#rFim",e=>e.textContent));
  ok("prazo trimestral: explica que o juro sai do depósito", /pago para a conta à ordem/.test(await pg.$eval("#sheetIn",e=>e.textContent)));
  await pg.selectOption("#aPer","0"); await pg.waitForTimeout(250);
  await pg.tap("#aOk"); await pg.waitForTimeout(400);
  ok("prazo gravado", await pg.evaluate(()=>S.contas.some(c=>c.n==="DP Teste"&&c.tipo==="prazo"&&c.vence==="2027-06-01"&&c.subs[0].valor===3000&&c.taxas[0].v===3.5&&c.base===360&&c.irs===28&&c.retencao===true)));
  const txt=await pg.$eval("#rendeList",e=>e.textContent);
  ok("prazo aparece em 'A render agora' com o vencimento", /DP Teste/.test(txt)&&/Vence a 01\/06\/2027/.test(txt)&&/No vencimento recebes/.test(txt), txt.slice(0,400));
  // tocar no nome abre o formulário do tipo certo
  const idDp=await pg.evaluate(()=>S.contas.find(c=>c.n==="DP Teste").id);
  await pg.tap('[data-ce="'+idDp+'"]'); await pg.waitForTimeout(300);
  ok("tocar no depósito abre o formulário de depósito", await pg.$eval("#sheetIn h2",e=>e.textContent)==="DP Teste" && !!(await pg.$("#aVence")) && !(await pg.$("#aSubs")));
  await pg.evaluate(()=>closeSheet());
  await pg.tap('[data-ce="tr"]'); await pg.waitForTimeout(300);
  ok("tocar na TR abre o formulário de conta com juros", !!(await pg.$("#aSubs")) && !!(await pg.$("#cTaxas")) && !(await pg.$("#aVence")));
  await pg.evaluate(()=>closeSheet());
  // carteira: editar posição atualiza as contas no sítio
  await pg.tap('[data-ce="trinv"]'); await pg.waitForTimeout(300);
  await pg.fill('[data-pp="0"]',"130"); await pg.waitForTimeout(150);
  ok("carteira: 'Vale agora' acompanha o preço", (await pg.$eval("#rValor",e=>e.textContent)).includes("1612,00"), await pg.$eval("#rValor",e=>e.textContent));
  await pg.tap("#aOk"); await pg.waitForTimeout(300);
  ok("carteira gravada", await pg.evaluate(()=>conta("trinv").posicoes[0].pr===130));
  // apagar com confirmação e cancelar volta ao formulário certo
  await pg.tap('[data-ce="'+idDp+'"]'); await pg.waitForTimeout(250);
  await pg.tap("#aDel"); await pg.waitForTimeout(250); await pg.tap("#xDelNo"); await pg.waitForTimeout(300);
  ok("cancelar o apagar volta ao formulário do depósito", !!(await pg.$("#aVence")));
  await pg.tap("#aDel"); await pg.waitForTimeout(250); await pg.tap("#xDelOk"); await pg.waitForTimeout(300);
  ok("apagar remove o depósito", !(await pg.evaluate(()=>S.contas.some(c=>c.n==="DP Teste"))));
  await pg.close();

  /* ================= D. DEPÓSITO VENCIDO ================= */
  sec("D. Depósito vencido");
  pg=await nova(); await semear(pg);
  await pg.evaluate(()=>{ const d=conta("dp"); d.subs=[{id:"s",valor:5000,data:"2026-01-01"}]; d.taxas=[{data:"2026-01-01",v:3}]; d.vence="2026-07-01"; save(); go("patrim"); });
  await pg.waitForTimeout(350);
  let t2=await pg.$eval("#rendeList",e=>e.textContent);
  ok("vencido: diz que venceu e mostra o valor final", /Venceu a 01\/07\/2026/.test(t2)&&/5\s?054,30/.test(t2), t2.slice(-420));
  const cgd0=await pg.evaluate(()=>conta("cgd").saldo);
  await pg.tap('[data-venc="dp"]'); await pg.waitForTimeout(300);
  await pg.selectOption("#vnDest","cgd"); await pg.tap("#vnOk"); await pg.waitForTimeout(350);
  const r=await pg.evaluate(()=>({existe:!!conta("dp"),cgd:conta("cgd").saldo}));
  ok("vencido: o depósito sai e o dinheiro entra na conta", !r.existe && Math.abs(r.cgd-cgd0-5054.30)<0.0001, {cgd0,r});
  await pg.close();

  /* ================= E. TIQUE SEM REDESENHAR, TAXA CONFIRMADA ================= */
  sec("E. Tique e taxa");
  pg=await nova(); await semear(pg);
  await pg.evaluate(()=>go("patrim")); await pg.waitForTimeout(350);
  const no1=await pg.evaluateHandle(()=>document.querySelector('[data-ce="t212"]'));
  const j1=await pg.$eval('[data-tk="jb:t212"]',e=>e.textContent);
  await pg.waitForTimeout(2300);
  const j2=await pg.$eval('[data-tk="jb:t212"]',e=>e.textContent);
  ok("o juro mexe sozinho", j1!==j2, {j1,j2});
  ok("a lista não é refeita a cada segundo", await pg.evaluate(el=>document.contains(el),no1));
  // taxa velha: caixa de confirmação funciona
  await pg.evaluate(()=>{ conta("tr").taxas=[{data:"2025-01-01",v:2.25}]; conta("tr").subs=[{id:"b",valor:1200,data:"2025-01-01"}]; delete conta("tr").taxaVistaEm; save(); pintaPatrim(); });
  await pg.waitForTimeout(200);
  ok("taxa antiga mostra a caixa de confirmação", !!(await pg.$('[data-vt="tr"]')));
  await pg.tap('[data-vt="tr"]'); await pg.waitForTimeout(300);
  ok("confirmar a taxa guarda a data e tira a caixa", await pg.evaluate(()=>conta("tr").taxaVistaEm===hojeStr()) && !(await pg.$('[data-vt="tr"]')));
  await pg.close();

  /* ================= F. TOTAIS, POTES E CÓPIA ================= */
  sec("F. Totais, potes, cópia");
  pg=await nova(); await semear(pg);
  const P=await pg.evaluate(()=>{ const p=patrimonio(new Date()); const s=id=>estado(conta(id),new Date()).valor;
    return {rende:p.rende,invest:p.invest,ordem:p.ordem,longo:p.longo,valor:p.valor,total:p.total,
            esperadoRende:s("tr")+s("t212")+s("dp"), esperadoInv:s("trinv"), esperadoOrd:s("cgd")+s("revolut"), esperadoLongo:s("aforro")+s("pm")}; });
  const eq=(a,b)=>Math.abs(a-b)<0.005;
  ok("total: parcelas certas", eq(P.rende,P.esperadoRende)&&eq(P.invest,P.esperadoInv)&&eq(P.ordem,P.esperadoOrd)&&eq(P.longo,P.esperadoLongo), P);
  ok("total: hero = tudo menos longo prazo; total = tudo", eq(P.valor,P.rende+P.invest+P.ordem)&&eq(P.total,P.valor+P.longo), P);
  await pg.evaluate(()=>go("patrim")); await pg.waitForTimeout(300); await pg.tap("#totHdr"); await pg.waitForTimeout(250);
  const linhas=await pg.$$eval("#totBody .k",e=>e.map(x=>x.textContent));
  ok("aba do total mostra as parcelas", ["A render","Investido","Contas que não rendem","Longo prazo","Tudo somado"].every(x=>linhas.includes(x)), linhas);
  // pote que espelha um depósito a prazo: o ± explica em vez de fingir
  await pg.evaluate(()=>{ pote("investir").conta="dp"; pote("investir").espelho=true; save(); go("potes"); }); await pg.waitForTimeout(250);
  await pg.tap('[data-pd="investir"]'); await pg.waitForTimeout(300);
  ok("pote sobre um depósito: o ± remete para o Património", !!(await pg.$("#ajAbre")));
  await pg.evaluate(()=>closeSheet());
  ok("cópia de segurança: exportar e importar existem", await pg.evaluate(()=>!!E("expJson")&&!!E("impBtn")&&typeof bindBackup==="function"));
  const ida=await pg.evaluate(()=>{ const j=JSON.stringify(S); const o=JSON.parse(j); return o.contas.length===S.contas.length&&o.potes.length===S.potes.length; });
  ok("estado serializa e volta inteiro", ida);
  await pg.close();

  /* ================= G. INSTALAÇÃO ANTIGA ================= */
  sec("G. Migração de dados antigos");
  pg=await nova();
  await pg.evaluate(()=>{
    // estado como o do telemóvel dele antes desta versão
    const h="2026-11-09";
    conta("t212").subs=[{id:"a",valor:7654.32,data:h}];conta("t212").taxas=[{data:h,v:2.5}];
    conta("tr").subs=[{id:"b",valor:1200,data:h}];conta("tr").taxas=[{data:h,v:2.25}];
    conta("tr").ocultarValor=true; S.ocHub=true; S.ocTotA=true; delete conta("aforro").irs; delete conta("aforro").retencao;
    S.contas.push({id:"old",n:"DP antigo",tipo:"prazo",freq:"vencimento",vence:"2027-01-01",irs:28,retencao:true,subs:[{id:"s",valor:1000,data:h}],taxas:[{data:h,v:3}]});
    delete S.mig10; save();
  });
  await pg.reload(); await pg.waitForTimeout(450);
  const mg=await pg.evaluate(()=>({mig:S.mig10,hub:S.ocHub,dp:conta("old").periodoMeses,freq:conta("old").freq,base:conta("old").base,valor:estado(conta("old"),new Date()).valor,irsAf:conta("aforro").irs,irsT212:conta("t212").irs,irsTr:conta("tr").irs}));
  ok("migração 10 correu e limpou o estado antigo", mg.mig===2&&mg.hub===undefined&&mg.dp===0&&mg.freq===undefined&&mg.valor===1000, mg);
  ok("migração 10: não presume nada nos dados que já existiam (aforro sem IRS, depósito a 365 dias, T212 e TR iguais)",
     mg.irsAf===undefined&&mg.base===365&&mg.irsT212===null&&mg.irsTr===28, mg);
  // quem apanhou a versão das 18:35, que presumiu 28% no aforro: volta ao que era
  await pg.evaluate(()=>{ S.mig10=1; conta("aforro").irs=28; conta("aforro").retencao=true;
    conta("aforro").subs=[{id:"c",valor:600,data:"2026-05-02"}]; conta("aforro").taxas=[{data:"2026-05-02",v:2.5}]; save(); });
  const comIrs=await pg.evaluate(()=>estado(conta("aforro"),new Date("2026-11-15T12:00:00")).valor);
  await pg.reload(); await pg.waitForTimeout(450);
  const semIrs=await pg.evaluate(()=>({mig:S.mig10,irs:conta("aforro").irs,valor:estado(conta("aforro"),new Date("2026-11-15T12:00:00")).valor}));
  ok("quem apanhou a versão das 18:35: o aforro volta a ser calculado como era", semIrs.mig===2&&semIrs.irs===null&&semIrs.valor>comIrs, {comIrs,semIrs});
  await pg.evaluate(()=>go("contas")); await pg.waitForTimeout(300);
  ok("depois de migrar, as Contas mostram tudo com o olho aberto", await mascaras(pg)===0, await mascaras(pg));
  await pg.close();

  /* ================= H. CÓPIA DE SEGURANÇA ================= */
  sec("H. Cópia de segurança");
  pg=await nova(); await semear(pg);
  const antesJson=await pg.evaluate(()=>JSON.stringify(S));
  const visivel=()=>pg.evaluate(()=>({vistas:[...document.querySelectorAll("section[id^='v-']:not(.hide)")].map(x=>x.id),titulo:document.getElementById("viewTitle").textContent}));
  // apagar tudo
  await pg.evaluate(()=>go("config")); await pg.waitForTimeout(250);
  await pg.tap("#wipe"); await pg.waitForTimeout(250); await pg.tap("#wYes"); await pg.waitForTimeout(400);
  let vz=await visivel();
  ok("apagar tudo: a app fica num separador que existe", vz.vistas.length===1&&vz.titulo==="Orçamento", vz);
  ok("apagar tudo: estado de fábrica, já migrado", await pg.evaluate(()=>S.mig10===2&&S.contas.length===6&&conta("aforro").irs===28&&!S.contas.some(c=>c.id==="dp")));
  // importar a cópia de antes
  await pg.evaluate(()=>go("config")); await pg.waitForTimeout(250);
  await pg.setInputFiles("#impFile",{name:"mesada.json",mimeType:"application/json",buffer:Buffer.from(antesJson)});
  await pg.waitForTimeout(350); await pg.tap("#iYes"); await pg.waitForTimeout(450);
  vz=await visivel();
  ok("importar: a app fica num separador que existe", vz.vistas.length===1&&vz.titulo==="Orçamento", vz);
  const igual=await pg.evaluate(a=>{ const x=JSON.parse(a), y=JSON.parse(JSON.stringify(S));
    return {contas:JSON.stringify(x.contas)===JSON.stringify(y.contas),potes:JSON.stringify(x.potes)===JSON.stringify(y.potes),
            movs:JSON.stringify(x.movs)===JSON.stringify(y.movs),fixas:JSON.stringify(x.fixas)===JSON.stringify(y.fixas),rend:x.rendimento===y.rendimento}; },antesJson);
  ok("importar: contas, potes, movimentos e orçamento voltam iguais", Object.values(igual).every(Boolean), igual);
  ok("importar: ficou gravado no telemóvel", await pg.evaluate(()=>JSON.parse(localStorage.getItem("mesada.v1")).contas.some(c=>c.id==="dp")));
  // importar uma cópia antiga, de antes desta versão: tem de ser migrada na hora
  const antiga=await pg.evaluate(a=>{ const x=JSON.parse(a); delete x.mig10; x.ocHub=true;
    x.contas.forEach(c=>{ if(c.tipo==="aforro"){ delete c.irs; delete c.retencao; } if(c.tipo==="prazo"){ delete c.base; delete c.periodoMeses; c.freq="vencimento"; } });
    return JSON.stringify(x); },antesJson);
  await pg.evaluate(()=>go("config")); await pg.waitForTimeout(250);
  await pg.setInputFiles("#impFile",{name:"antiga.json",mimeType:"application/json",buffer:Buffer.from(antiga)});
  await pg.waitForTimeout(350); await pg.tap("#iYes"); await pg.waitForTimeout(450);
  ok("importar cópia antiga: migrada sem ser preciso reabrir a app", await pg.evaluate(()=>S.mig10===2&&S.ocHub===undefined&&conta("aforro").irs===undefined&&conta("dp").base===365&&conta("dp").periodoMeses===0&&conta("dp").freq===undefined));
  // ficheiro que não é uma cópia
  await pg.evaluate(()=>go("config")); await pg.waitForTimeout(200);
  await pg.setInputFiles("#impFile",{name:"lixo.json",mimeType:"application/json",buffer:Buffer.from('{"ola":1}')});
  await pg.waitForTimeout(350);
  ok("importar ficheiro errado: recusa e não mexe em nada", !(await pg.$("#iYes")) && await pg.evaluate(()=>S.contas.some(c=>c.id==="dp")));
  await pg.close();

  await b.close();
  console.log("\n"+(falhas?("RESULTADO: "+falhas+" FALHAS em "+feitos+" verificações"):("RESULTADO: "+feitos+" verificações, todas certas")));
  process.exit(falhas?1:0);
})();
