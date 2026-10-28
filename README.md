# Obra 360 - Gestão de Obras

🔗 **App:** https://joaogarraio-ai.github.io/gestao-obras-360/

Sistema simples para controlar, no celular, tudo que hoje é anotado no papel:

- **Dias trabalhados** de cada trabalhador (servente, pedreiro, mestre de obra...), por obra e por dia da semana, considerando o horário 07:00–12:00 e 13:00–17:00.
- **Materiais comprados** (notas fiscais): fornecedor, obra, descrição, valor.
- **Despesas** da semana: gasolina, frete de carro, outros.
- **Relatório semanal** consolidado (segunda a sábado), separando pagamentos em **PIX** e **Dinheiro**, pronto para entregar/enviar toda sexta-feira de manhã.

Já vem com as obras (Fazenda Paraíso, Fazenda Alto do Cruzeiro, Casa, Fazenda de Seu Jorge) e fornecedores (Canteiro de Obras, Gabriel Material de Construção, Outlet das Tintas, Cerqueira Alves) cadastrados de fábrica — dá pra editar tudo em **Cadastros**.

Todos os dados ficam salvos no próprio celular/navegador (localStorage), sem precisar de internet para usar no dia a dia. O app pode ser adicionado à tela inicial do celular (PWA) e funciona offline depois do primeiro carregamento.

## Gestão completa da obra (módulos 🏗️ Obras e 💰 Financeiro)

Inspirado nos ERPs de construção (orçamento, cronograma, compras, medições e financeiro), cada obra agora tem:

- **Orçamento com BDI**: planilha por etapas com código (ex: SINAPI), unidade, quantidade, custo unitário e categoria. O BDI é calculado pela fórmula do TCU (administração central, seguro/garantia, risco, despesas financeiras, lucro e tributos) e dá o preço de venda.
- **Curva ABC** dos itens do orçamento (A até 80% do custo, B até 95%, C o restante).
- **Cronograma**: Gantt das etapas com % concluído, linha de hoje e etapas atrasadas em vermelho, e o **cronograma físico-financeiro** mês a mês com % acumulado.
- **Compras com aprovação**: a obra pede o material, alguém aprova ou rejeita, e ao registrar a compra a nota entra sozinha em Materiais e no financeiro.
- **Medições de empreiteiros**: contratos de empreitada com retenção técnica, medições por % executado, aprovação e pagamento.
- **Diário de obra (RDO)**: clima de manhã e de tarde, efetivo (puxa quem foi lançado em Dias), atividades, ocorrências e até 4 fotos por dia, com impressão.
- **Resumo da obra**: contrato, orçamento, gasto, resultado de caixa, avanço físico real x previsto e **orçado x realizado** por categoria e por etapa.
- **Financeiro**: fluxo de caixa mensal (realizado e previsto) por obra ou geral, contas a pagar e a receber com baixa, juntando diárias, tarefas, materiais, despesas, medições e compras aprovadas.

Em **Obras** há o botão **Criar obra de exemplo** para ver tudo preenchido.

## Como usar no dia a dia

1. **Cadastros** (ícone ⚙️ no topo): cadastrar trabalhadores (nome, função, valor da diária, forma de pagamento PIX/Dinheiro), conferir obras e fornecedores.
2. **Lançar dias**: toda vez que visitar uma obra, escolher a obra e marcar no calendário da semana quem trabalhou (dia completo, meio dia ou falta).
3. **Materiais**: sempre que comprar material, lançar a nota (fornecedor, obra, descrição, valor).
4. **Despesas**: lançar gasolina, frete etc. da semana.
5. **Relatório**: na sexta de manhã, abrir o relatório da semana, conferir os totais e usar **Compartilhar** (manda o resumo pronto pra colar no WhatsApp) ou **Imprimir/PDF**.

## Instalar no celular

Abra https://joaogarraio-ai.github.io/gestao-obras-360/ no navegador do celular e use a opção "Adicionar à tela inicial" (Chrome/Safari). Ele passa a abrir como um aplicativo normal.

## Publicação (GitHub Pages)

Todo push na branch `main` publica automaticamente em https://joaogarraio-ai.github.io/gestao-obras-360/ via GitHub Actions (`.github/workflows/deploy.yml`). Na primeira vez, é preciso habilitar em **Settings > Pages > Build and deployment > Source: GitHub Actions** no repositório.

## Desenvolvimento

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # gera a versão de produção em dist/
npm run preview  # testa a versão de produção localmente
```

Stack: React + TypeScript + Vite + Tailwind CSS v4, com dados persistidos em `localStorage` (sem backend) e suporte a PWA via `vite-plugin-pwa`.
