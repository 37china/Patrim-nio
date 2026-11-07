const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
const js=html.slice(html.indexOf("<script>")+8, html.lastIndexOf("</script>"));
function novoEl(){
  const o={innerHTML:"",textContent:"",value:"",className:"",disabled:false,files:[],
    style:new Proxy({},{get:()=>"",set:()=>true}), dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    querySelectorAll:()=>[], querySelector:()=>null, appendChild(){}, remove(){},
    select(){}, focus(){}, click(){}, addEventListener(){}, setAttribute(){}, getAttribute:()=>null};
  return o;
}
const doc={getElementById:()=>novoEl(), querySelectorAll:()=>[], querySelector:()=>null,
  createElement:()=>novoEl(), addEventListener(){}, body:novoEl()};
const store={};
const sandbox={document:doc, window:{addEventListener(){},open:()=>null,claude:undefined,scrollTo(){},matchMedia:()=>({matches:false,addEventListener(){}})},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}},
  navigator:{}, location:{href:"https://exemplo/",hostname:"exemplo"},
  setInterval:()=>0, clearInterval(){}, setTimeout:(f)=>0, crypto:{getRandomValues:a=>a},
  Blob:function(){}, URL:{createObjectURL:()=>"",revokeObjectURL(){}}, FileReader:function(){},
  btoa:s=>Buffer.from(s,"binary").toString("base64"), atob:s=>Buffer.from(s,"base64").toString("binary"),
  console};
sandbox.window.document=doc; sandbox.self=sandbox.window;
const vm=require("vm"); vm.createContext(sandbox);
try{ vm.runInContext(js,sandbox,{filename:"app.js"}); }
catch(e){ console.log("ARRANQUE FALHOU:",e.message); process.exit(1); }
let maus=0;
for(const f of ["rInicio","rPotes","rOrc","rPlano","rReconc","rMes","rCats","rConfig","rImport","pintaPatrim","rPatrim"]){
  try{
    const fn=sandbox[f]; if(typeof fn!=="function"){console.log("  ausente:",f);maus++;continue;}
    f==="rInicio" ? fn({novo:false,k:"2026-11"}) : fn();
    console.log("  ok    ",f);
  }catch(e){ console.log("  FALHA ",f,"->",e.constructor.name+":",e.message); maus++; }
}
process.exit(maus?1:0);
