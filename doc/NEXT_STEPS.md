# Próximos Passos

Itens organizados por prioridade e impacto. Os marcados com 🔴 bloqueiam uso em produção;
🟡 são melhorias relevantes; 🟢 são evoluções de produto.

---

## 🔴 Crítico — necessário antes de produção

### 1. Endpoint de Connect Token + fluxo via widget

**Problema:** a API aceita credenciais bancárias diretamente no `POST /connections`. Isso
funciona no sandbox da Pluggy, mas **quebra com bancos reais** que exigem MFA, OAuth ou
fluxo via widget — e cria risco de segurança (sua API nunca deveria tocar credenciais reais).

O fluxo correto com qualquer provedor de Open Finance é:
1. Backend gera um token de sessão curta (`POST /connect-token`)
2. Frontend abre o widget do provedor com esse token
3. O usuário autentica direto no widget (sem que o backend veja as credenciais)
4. O widget devolve um `itemId`/`connectionId` ao frontend em `onSuccess`
5. Frontend envia apenas o `connectionId` ao backend para iniciar sync

**O que fazer:**
- Adicionar `generateConnectToken(userId: string): Promise<string>` à porta `OpenFinanceProvider`
- Implementar em `PluggyAdapter` via `POST /connect_token` da Pluggy
- Criar `GET /connect-token` na API (autenticado) que devolve `{ token: string }`
- Alterar `POST /connections` para aceitar `{ connectionId: string }` (só o ID devolvido pelo widget)
  em vez de `{ credentials: { connectorId, parameters } }`
- Remover `credentialsEnc` da tabela `Connection` (migration) — sem widget, não há credencial a guardar
- Adicionar implementação no `MockOpenFinanceAdapter` para não quebrar testes

**Por que isso garante trocar de provedor facilmente:**
A porta `OpenFinanceProvider` já isola o domínio do provedor. Ao mover a lógica de conexão
para `generateConnectToken`, o domínio passa a não conhecer nenhum campo específico de
fornecedor (como `connectorId` da Pluggy). Trocar para Belvo ou outro provedor exige
apenas uma nova implementação da porta — zero mudança nos use-cases ou controllers.

---

### 2. Global Exception Filter

**Problema:** erros não tratados expõem stack traces na resposta HTTP.

**O que fazer:**
- Criar `src/shared/filters/http-exception.filter.ts` implementando `ExceptionFilter`
- Padronizar todas as respostas de erro em `{ statusCode, message, error, timestamp }`
- Registrar globalmente em `main.ts` via `app.useGlobalFilters()`
- Logar erros 5xx com o stack trace (sem expor ao cliente)

---

### 3. Paginação nos endpoints de leitura

**Problema:** `/income`, `/investments` e `/statements/:yearMonth` retornam todos os
registros sem limite — inviável com dados reais de meses cheios.

**O que fazer:**
- Criar `PaginationQueryDto` com `page: number` e `limit: number` (default 20, máx 100)
- Aplicar `.skip()` / `.take()` no Prisma
- Retornar envelope `{ data, total, page, totalPages }` em todos os endpoints afetados
- Atualizar testes e2e para validar o envelope

---

### 4. Refresh token

**Problema:** o JWT tem validade de 7 dias sem possibilidade de revogação ou renovação
silenciosa — qualquer token roubado é válido por 7 dias.

**O que fazer:**
- Reduzir `accessToken` para 15 minutos
- Emitir `refreshToken` de longa duração (30 dias) salvo na tabela `RefreshToken` (com hash)
- Criar `POST /auth/refresh` que valida o refresh token e emite um novo par
- Criar `POST /auth/logout` que invalida o refresh token no banco

---

### 5. ~~Tratamento de status PENDING na Pluggy~~ ✅ Implementado

`GET /connections/:id/status` (polling), `POST /connections/webhook` (callback Pluggy),
`HandleWebhookUseCase` (sync automático ao receber `UPDATED`). Ver `doc/CONECTAR_BANCO.md`.

---

### 5b. ~~Fixes de conformidade com a API da Pluggy~~ ✅ Aplicados (Pluggy Doctor)

- `toConnectionStatus`: mapeamento correto de `UPDATED` → `CONNECTED`, `LOGIN_ERROR`/`OUTDATED` → `FAILED`
- Parâmetro de data em transações: `dateFrom` → `from`
- Cursor de paginação: `cursor` → `after`, com parse correto do campo `next`
- `clientUserId` enviado na criação do Item
- Payload do webhook tipado com `eventId`, `triggeredBy`, `clientUserId`
- `item/error` não dispara sync

---

### 5c. Configuração de WEBHOOK_BASE_URL em produção

**Problema:** o webhook da Pluggy exige uma URL pública permanente. Em desenvolvimento
ngrok resolve; em produção precisa de uma URL estável.

**O que fazer:**
- Preencher `WEBHOOK_BASE_URL` no ambiente de produção com o domínio da API
- Documentar no `.env.example` (a ser criado)
- Verificar se o endpoint `/connections/webhook` está acessível sem autenticação de rede
- Registrar o webhook também no dashboard da Pluggy como fallback caso a URL mude

---

### 5d. Re-autenticação quando conexão expira (`LOGIN_ERROR` / `OUTDATED`)

**Problema:** conexões bancárias expiram ou ficam com credenciais inválidas. O sistema
agora detecta (`LOGIN_ERROR` → `FAILED`, `OUTDATED` → `FAILED`) mas não avisa o usuário.

**O que fazer:**
- Ao receber webhook com status `FAILED`, notificar o usuário (e-mail ou push)
- Criar `PUT /connections/:id/reconnect` que gera um novo connect token para o widget
  reautenticar o mesmo item (Pluggy suporta atualização de item via widget)
- Alternativa simples: deixar o usuário deletar e reconectar via widget

---

## 🟡 Importante — qualidade e operação

### 6. Corrigir cast frágil de enums

**Problema:** `PrismaExpenseCategory[tx.category as unknown as keyof typeof ...]` em
`SyncTransactionsUseCase` falha silenciosamente se a categoria vier fora do mapeamento.

**O que fazer:**
- Extrair função `toPrismaCategory(domain: ExpenseCategory | undefined): PrismaExpenseCategory | null`
- Cobrir com switch explícito + default `null`
- Aplicar o mesmo padrão em `SyncInvestmentsUseCase`

---

### 7. Sincronização agendada (cron)

**Problema:** hoje o usuário precisa chamar `/sync` manualmente toda vez.

**O que fazer:**
- Instalar `@nestjs/schedule`
- Criar `SyncAllConnectionsJob` que busca todas as `Connection` com `status=CONNECTED` e
  chama `SyncTransactionsUseCase` + `SyncInvestmentsUseCase` para cada uma
- Configurar via cron expression no `.env` (ex: `SYNC_CRON=0 6 * * *` — todo dia às 6h)

---

### 8. Rate limiting

**O que fazer:**
- Instalar `@nestjs/throttler`
- Limites: autenticação (5 req/min), sync (10 req/hora), leitura (60 req/min)
- Aplicar `ThrottlerGuard` globalmente + override por endpoint

---

### 9. Observabilidade

**O que fazer:**
- Substituir `Logger` do NestJS por `pino` (via `nestjs-pino`) com saída JSON
- Adicionar `requestId` (UUID) por request e propagá-lo nos logs
- Logar duração de chamadas à API do provedor e ao banco
- Criar `GET /health` retornando status do banco e do provider

---

### 10. Docker Compose para desenvolvimento

**O que fazer:**
- Criar `docker-compose.yml` com serviços `postgres` e `api`
- Configurar `depends_on` + healthcheck no banco
- Adicionar `npm run compose:up` / `compose:down` no `package.json`

---

### 11. Mapeamento de investimentos por conta

**Problema:** `fetchInvestments` associa todos os investimentos à primeira conta do item
porque a Pluggy não retorna `accountId` por investimento.

**O que fazer:**
- Criar conta virtual `tipo=INVESTMENT` por item e associar investimentos a ela
- Atualizar schema e adaptar `GetInvestmentsUseCase`

---

## 🟢 Evolução de produto

### 12. ~~`GET /connections` — listar conexões~~ ✅ Implementado

### 12b. `GET /connections` — incluir nome da instituição

**O que fazer:**
- Salvar `connectorName` na tabela `Connection` (migration) ao conectar
- Retornar no `GET /connections` para evitar chamadas extras ao frontend

---

### 13. `DELETE /connections/:id` — desconectar banco

Revogar o item no provedor e apagar os dados locais. Obrigatório para LGPD.

---

### 14. Mapeamento fino de tipos de investimento

Hoje `FIXED_INCOME` mapeia tudo para `CDB`. Distinguir via `subtype`/`name` da Pluggy:
- Tesouro Direto → `TESOURO_DIRETO`
- Poupança → `POUPANCA`
- FII → `FII`
- LCI/LCA → `OUTROS`

---

### 15. Dashboard de resumo (`GET /summary`)

Endpoint único que agrega para o mês corrente: receitas, gastos por categoria, saldo,
valor investido e variação vs mês anterior.

---

### 16. Alertas de gastos

Notificar quando gasto por categoria ultrapassa limite configurável ou transação acima
de valor mínimo é sincronizada. Requer model `Alert` ou `UserPreferences` no banco.

---

### 17. CI/CD com GitHub Actions

- PR: `npm test` + `npm run test:e2e` (com PostgreSQL via `services`) + type-check + lint
- Merge na main: build Docker + push para registry

---

## Resumo por ordem de execução sugerida

```
✅  Status PENDING / webhook Pluggy     (feito)
✅  GET /connectors                     (feito)
✅  GET /connections                    (feito)
✅  GET /connections/:id/status         (feito)
✅  Fixes de conformidade Pluggy Doctor (feito)

— Para conectar bancos reais —
1  → Connect Token + widget flow        (meio dia — desbloqueante para produção)
2  → WEBHOOK_BASE_URL em produção       (1h — infra/deploy)
3  → Re-autenticação OUTDATED/LOGIN_ERROR (meio dia)
4  → DELETE /connections/:id            (2h + LGPD)
5  → connectorName na Connection        (1h + migration)

— Qualidade e operação —
6  → Global Exception Filter            (1-2h)
7  → Corrigir cast de enums             (1h)
8  → Paginação                          (meio dia)
9  → Rate limiting                      (2h)
10 → Refresh token                      (meio dia)
11 → Sync agendado                      (2h)
12 → Observabilidade                    (1 dia)
13 → Docker Compose                     (2h)
14 → CI/CD                              (meio dia)

— Produto —
15 → Dashboard /summary                 (2h)
16 → Mapeamento fino de investimentos   (2h)
17 → Alertas de gastos                  (1-2 dias)
```

---

## Nota sobre independência de provedor

A porta `OpenFinanceProvider` já garante que os use-cases e controllers não dependem de
nenhum SDK ou detalhe da Pluggy. Para trocar de provedor:

1. Criar `src/modules/open-finance/infrastructure/adapters/<novo-provedor>/<novo>.adapter.ts`
   implementando `OpenFinanceProvider`
2. Alterar `open-finance.module.ts` para injetar o novo adapter no token `OPEN_FINANCE_PROVIDER`
3. Zero mudança em use-cases, controllers ou domínio

O único acoplamento atual que ainda precisa ser removido é o `ConnectAccountDto`
com `connectorId`/`parameters` (específico da Pluggy) — o item 1 acima resolve isso
ao mover a conexão para o fluxo de widget.
