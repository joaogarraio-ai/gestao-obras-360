# Obra 360 - Gestão de Obras

🔗 **App:** https://joaogarraio-ai.github.io/gestao-obras-360/

Sistema simples para controlar, no celular, tudo que hoje é anotado no papel:

- **Dias trabalhados** de cada trabalhador (servente, pedreiro, mestre de obra...), por obra e por dia da semana, considerando o horário 07:00–12:00 e 13:00–17:00.
- **Materiais comprados** (notas fiscais): fornecedor, obra, descrição, valor.
- **Despesas** da semana: gasolina, frete de carro, outros.
- **Relatório semanal** consolidado (segunda a sábado), separando pagamentos em **PIX** e **Dinheiro**, pronto para entregar/enviar toda sexta-feira de manhã.

Já vem com as obras (Fazenda Paraíso, Fazenda Alto do Cruzeiro, Casa, Fazenda de Seu Jorge) e fornecedores (Canteiro de Obras, Gabriel Material de Construção, Outlet das Tintas, Cerqueira Alves) cadastrados de fábrica — dá pra editar tudo em **Cadastros**.

Os dados ficam salvos no próprio celular/navegador (localStorage), sem precisar de internet para usar no dia a dia. Com o Supabase ligado (veja abaixo), também ficam na nuvem e são compartilhados com a equipe. O app pode ser adicionado à tela inicial do celular (PWA) e funciona offline depois do primeiro carregamento.

## Gestão completa da obra (módulos 🏗️ Obras e 💰 Financeiro)

Inspirado nos ERPs de construção (orçamento, cronograma, compras, medições e financeiro), cada obra agora tem:

- **Orçamento com BDI**: planilha por etapas com código (ex: SINAPI), unidade, quantidade, custo unitário e categoria. O BDI é calculado pela fórmula do TCU (administração central, seguro/garantia, risco, despesas financeiras, lucro e tributos) e dá o preço de venda.
- **Curva ABC** dos itens do orçamento (A até 80% do custo, B até 95%, C o restante).
- **Cronograma**: Gantt das etapas com % concluído, linha de hoje e etapas atrasadas em vermelho, e o **cronograma físico-financeiro** mês a mês com % acumulado.
- **Compras com aprovação**: a obra pede o material, alguém aprova ou rejeita, e ao registrar a compra a nota entra sozinha em Materiais e no financeiro.
- **Medições de empreiteiros**: contratos de empreitada com retenção técnica, medições por % executado, aprovação e pagamento.
- **Estoque / almoxarifado** por obra: entradas (com custo), saídas por etapa, transferências entre obras, saldo, custo médio e aviso de estoque mínimo. Ao registrar uma compra aprovada, dá para lançar a entrada no estoque na hora.
- **Diário de obra (RDO)**: clima de manhã e de tarde, efetivo (puxa quem foi lançado em Dias), atividades, ocorrências e até 4 fotos por dia, com impressão.
- **Resumo da obra**: contrato, orçamento, gasto, resultado de caixa, avanço físico real x previsto e **orçado x realizado** por categoria e por etapa.
- **Financeiro**: fluxo de caixa mensal (realizado e previsto) por obra ou geral, contas a pagar e a receber com baixa, juntando diárias, tarefas, materiais, despesas, medições e compras aprovadas.

Em ☁️ (topo) há **Backup**: exportar todos os dados num arquivo `.json` e importar de volta.

Em **Obras** há o botão **Criar obra de exemplo** para ver tudo preenchido.

## Equipe na nuvem (login e dados compartilhados)

Com o Supabase ligado, o app pede login e cada pessoa entra numa **empresa**. Todos da mesma empresa veem e lançam nas mesmas obras, e as mudanças aparecem nos outros aparelhos em tempo real. Sem internet o app continua funcionando e envia o que ficou pendente quando a conexão volta (ícone ☁️ no topo; 📴 quando está offline).

- Quem cria a empresa vira admin e recebe um **código de convite** (em ☁️ > Enviar convite). Os outros criam a conta e entram com esse código.
- Na primeira vez, ao criar a empresa, os dados que já estavam no aparelho são enviados para ela.
- A segurança é feita no banco (Row Level Security): ninguém lê nem altera dados de outra empresa.

### Como ligar (uma vez só)

1. Crie uma conta grátis em https://supabase.com e um projeto novo (região São Paulo).
2. No projeto, abra **SQL Editor > New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication > URL Configuration**, coloque `https://joaogarraio-ai.github.io/gestao-obras-360/` em **Site URL** (é para onde o link de confirmação do e-mail leva). Se não quiser confirmação por e-mail, desligue **Confirm email** em **Authentication > Sign In / Providers > Email**.
4. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.
5. No GitHub, em **Settings > Secrets and variables > Actions > New repository secret**, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com esses valores.
6. Rode de novo o deploy (aba **Actions > Deploy no GitHub Pages > Run workflow**) ou faça qualquer push na `main`.

Para desenvolver localmente com a nuvem, copie `.env.example` para `.env.local` e preencha as mesmas chaves.

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

Stack: React + TypeScript + Vite + Tailwind CSS v4, com dados em `localStorage` e sincronização opcional com Supabase (Postgres, login e tempo real) e suporte a PWA via `vite-plugin-pwa`.
