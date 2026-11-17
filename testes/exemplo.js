// Dados de exemplo para os testes. Uma instalação nova da app nasce vazia; os testes
// precisam de contas e objetivos com que trabalhar, por isso começam com estes (inventados).
const EXEMPLO={
  v:1, rendimento:550,
  fixas:[{n:"Contas de casa",v:75,f:true},{n:"Alimentação",v:0,f:false},{n:"Transportes",v:0,f:false},{n:"Saídas e restaurantes",v:0,f:false}],
  potes:[
    {id:"correntes",n:"Despesas Correntes",c:"var(--cor)",aloc:0,obj:null,saldo:0,acum:false,fix:true},
    {id:"gastar",n:"Poupança",c:"var(--ac)",aloc:0,obj:null,saldo:0,acum:true,semRep:true},
    {id:"investir",n:"Investimentos",c:"var(--inv)",aloc:50,obj:null,saldo:0,acum:true}
  ],
  movs:[], mesAtivo:null, pin:null, hist:[], dia:1, regras:[], imp:[], heroPote:"correntes", patLock:"off",
  contas:[
    {id:"revolut",n:"Revolut",tipo:"ordem",saldo:0,data:null},
    {id:"cgd",n:"CGD",tipo:"ordem",saldo:0,data:null},
    {id:"tr",n:"Trade Republic — à ordem",tipo:"remunerada",subs:[],tanb:0,freq:"mensal",diaJuro:1,irs:28,retencao:true},
    {id:"t212",n:"Trading 212 — à ordem",tipo:"remunerada",subs:[],tanb:0,freq:"diaria",horaJuro:"02:08",retencao:false,irs:null},
    {id:"aforro",n:"Certificados de Aforro",tipo:"aforro",serie:"F",subs:[],tanb:2.5,premio:0,irs:28,retencao:true,secundaria:true},
    {id:"trinv",n:"Trade Republic — carteira",tipo:"investimento",valor:0,investido:0,data:null}
  ]
};
// Põe o exemplo logo a seguir à primeira abertura da página (cada página de teste tem o seu
// armazenamento novo). Não se usa um script de arranque: corria também ao recarregar e, se o
// armazenamento do file:// ainda não estivesse escrito em disco, apagava o estado do teste.
async function comExemplo(pg){
  const goto=pg.goto.bind(pg); let feito=false;
  pg.goto=async(...a)=>{
    const r=await goto(...a);
    if(!feito){ feito=true;
      await pg.evaluate(j=>{ localStorage.setItem("mesada.v1",j); load(); render(); }, JSON.stringify(EXEMPLO)); }
    return r;
  };
}
module.exports={EXEMPLO,comExemplo};
