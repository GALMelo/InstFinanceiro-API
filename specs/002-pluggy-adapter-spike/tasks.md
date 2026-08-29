# Tasks: Pluggy Adapter Data Exploration Spike

**Input**: Design documents from `specs/002-pluggy-adapter-spike/`

**Prerequisites**: plan.md ✓ | spec.md ✓ | quickstart.md ✓

**Tests**: Não aplicável — spike descartável, sem testes automatizados (explicitamente fora de escopo na spec).

**Organization**: Tasks organizadas por user story. US1 (script) é independente de US2 (findings template).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2)

---

## Phase 1: Setup

**Purpose**: Instalar dependência nova e criar estrutura de diretório.

- [x] T001 Verificar se `pluggy-sdk` já é dependência em `package.json`; se não estiver, instalar com `npm install pluggy-sdk` na raiz do projeto
- [x] T002 Criar diretório `scripts/` na raiz do projeto (fora de `src/`)

**Checkpoint**: `pluggy-sdk` presente no `node_modules/` e `scripts/` criado.

---

## Phase 2: User Story 1 — Script de exploração isolado (Priority: P1) 🎯 MVP

**Goal**: Um script TypeScript standalone que autentica na Pluggy, consulta contas, transações
e investimentos de um `itemId` de teste, e imprime o JSON completo em console sem nenhum
efeito colateral.

**Independent Test**: Executar `npx ts-node scripts/pluggy-explore.ts <ITEM_ID>` com credenciais
válidas no `.env`. O script deve completar sem exceções não tratadas e imprimir contas e
transações. Verificar que nenhuma query ao banco foi disparada.

### Implementation for User Story 1

- [x] T003 [US1] Criar `scripts/pluggy-explore.ts` com: `import 'dotenv/config'` no topo; constante `ITEM_ID` vazia com comentário de uso; leitura de `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` de `process.env`; encerramento imediato com mensagem clara se qualquer uma das credenciais estiver ausente; leitura de `process.argv[2]` como itemId com fallback para a constante `ITEM_ID`; instanciação de `PluggyClient` com as credenciais lidas

- [x] T004 [US1] Adicionar em `scripts/pluggy-explore.ts`: chamada a `client.fetchAccounts(itemId)`; normalização da resposta para lidar com array direto (`T[]`) ou objeto paginado (`{ results: T[] }`); impressão do total de contas e do JSON completo de todas as contas via `console.log`

- [x] T005 [US1] Adicionar em `scripts/pluggy-explore.ts`: loop sobre cada conta retornada; para cada conta, chamar `client.fetchAllTransactions(account.id)` dentro de `try/catch` individual (erro em uma conta não deve interromper as outras); normalizar resposta com o mesmo padrão de T004; imprimir total de transações, JSON completo das primeiras 3, e resumo linha a linha destacando os campos `amount`, `type`, `category` e `categoryId` de cada uma das 3 transações

- [x] T006 [US1] Adicionar em `scripts/pluggy-explore.ts`: verificação em runtime de `typeof (client as any).fetchInvestments === 'function'`; se disponível, chamar `client.fetchInvestments(itemId)` dentro de try/catch, normalizar resposta, e imprimir o JSON completo do primeiro investimento retornado; se indisponível, imprimir `console.warn('[investments] método não disponível nesta versão do SDK')` e encerrar sem erro fatal

**Checkpoint**: `npx ts-node scripts/pluggy-explore.ts <ITEM_ID>` roda do início ao fim sem
exceção não tratada; output contém seções de contas, transações e investimentos.

---

## Phase 3: User Story 2 — Documento de achados (Priority: P2)

**Goal**: Template de `findings.md` preenchível para documentar os achados da execução real
do script — comparando campos observados com suposições atuais do `PluggyAdapter`.

**Independent Test**: `specs/002-pluggy-adapter-spike/findings.md` existe com as seções do
template definido em `plan.md`. Após execução manual do script, o documento é preenchido e
responde às 3 perguntas-chave com status explícito (CONFIRMADA / INCORRETA / INDEFINIDA).

### Implementation for User Story 2

- [x] T007 [US2] Criar `specs/002-pluggy-adapter-spike/findings.md` com o template completo
  definido na seção "Estrutura do findings.md" do `plan.md`: cabeçalho com data/versão SDK/itemId;
  seções 1 (receita vs. despesa), 2 (campo de categoria), 3 (relação investimento↔conta),
  4 (outros campos não mapeados) e 5 (divergências que requerem correção); cada seção com campos
  "Campo observado", "Suposição atual do PluggyAdapter", "Status" e "Observações" em branco
  para preenchimento manual pós-execução

**Checkpoint**: `findings.md` existe com todas as seções; campos de conteúdo estão marcados
como `[a preencher após execução]` aguardando observações reais.

---

## Phase 4: Polish & Validação

**Purpose**: Executar o script contra dados reais e validar os artefatos produzidos.

- [ ] T008 Seguir `quickstart.md` para executar `scripts/pluggy-explore.ts` contra um `itemId` real; confirmar que todos os itens do checklist de validação do quickstart passam; anotar a versão do `pluggy-sdk` instalada para incluir no findings.md

- [ ] T009 Preencher `specs/002-pluggy-adapter-spike/findings.md` com os dados reais observados na execução de T008; atribuir status CONFIRMADA / INCORRETA / INDEFINIDA a cada suposição do `PluggyAdapter`; listar na seção 5 qualquer divergência que requeira correção futura

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — começar imediatamente
- **User Story 1 (Phase 2)**: Depende de T001 e T002 (Setup concluído)
  - T003 → T004 → T005 → T006 (sequencial — mesmo arquivo)
- **User Story 2 (Phase 3)**: Independente de US1 — pode rodar em paralelo com Phase 2
  - T007 é autocontido
- **Polish (Phase 4)**: Depende de T003–T006 (script funcional) e T007 (template pronto)
  - T008 depende de Phase 2 completa
  - T009 depende de T008 e T007

### Parallel Opportunities

- T007 [US2] pode rodar em paralelo com qualquer task de Phase 2
- T001 e T002 podem rodar em paralelo entre si

---

## Parallel Example: User Story 1 + User Story 2

```bash
# Após T001 e T002 concluídos, rodar em paralelo:
Task A: T003 → T004 → T005 → T006  (scripts/pluggy-explore.ts, sequencial)
Task B: T007                         (specs/002-pluggy-adapter-spike/findings.md, paralelo)
```

---

## Implementation Strategy

### MVP (User Story 1 apenas)

1. Concluir Phase 1: Setup (T001, T002)
2. Concluir Phase 2: US1 (T003 → T004 → T005 → T006)
3. **PARAR e VALIDAR**: rodar o script e confirmar output
4. Se funcionar: proceder para US2 e Polish

### Execução completa

1. Setup (T001, T002)
2. US1 (T003–T006) + US2 (T007) em paralelo
3. Polish: T008 (execução real) → T009 (findings preenchido)

---

## Notes

- Nenhum arquivo em `src/` deve ser modificado por qualquer task desta feature
- `scripts/pluggy-explore.ts` não deve importar nada de `src/` nem do NestJS
- T009 é executado manualmente pelo desenvolvedor — não é geração automática de código
- O script é uma ferramenta descartável: não precisa ser commitado em `main`/`master`
- Verificar `pluggy-sdk` no `package.json` antes de instalar (T001) — pode já existir se
  o `PluggyAdapter` em `src/infrastructure/` já o declara como dependência direta
