# Mesada

App de gestão de finanças pessoais. Uma página, sem servidor, sem dependências.

## O que faz

- **Orçamento mensal** repartido por potes configuráveis (acumulam ou reiniciam, com objetivos e barras de progresso)
- **Registo de gastos** com teclado-calculadora (`+ − × ÷`)
- **Importação de extratos** em CSV — deteta separador, cabeçalho e colunas sozinha; testada contra Revolut, CGD (débito/crédito, vírgula decimal), Trading 212 e ficheiros sem cabeçalho
- **Categorização automática** com ~100 regras para comerciantes portugueses, e regras próprias que aprende com as correções
- **Património** com simulação de juro ao segundo: contas à ordem remuneradas (juro diário ou mensal em dia definido) e Certificados de Aforro Série E/F (capitalização trimestral por tranche, retenção de 28%, taxa histórica por período)
- **Dois eixos**: potes (para que serve o dinheiro) sobre contas (onde está), com reconciliação
- **Face ID ou código** à entrada do Património

## Privacidade

Não há servidor, base de dados nem telemetria. O `index.html` não faz **uma única** chamada de rede — o único `fetch` do projeto está no `sw.js` e serve para a app abrir sem internet. Extratos importados são lidos pelo `FileReader` do navegador e nunca saem do dispositivo. Os dados ficam em `localStorage`.

Cópias de segurança: exportar JSON pela app (Mais → Ajustes). Guardar fora deste repositório — ver `.gitignore`.

## Instalação

Alojamento estático com HTTPS, ficheiros na raiz. No iPhone: abrir no Safari → Partilhar → Adicionar ao Ecrã Principal.
