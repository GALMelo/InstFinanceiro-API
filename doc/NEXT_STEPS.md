# Próximos Passos

Itens organizados por prioridade e impacto. Os marcados com 🔴 bloqueiam uso em produção;
🟡 são melhorias relevantes; 🟢 são evoluções de produto.

---

## 🔴 Crítico — necessário antes de produção

### 1. Global Exception Filter

**Problema:** erros não tratados expõem stack traces na resposta HTTP.

**O que fazer:**
- Criar `src/shared/filters/http-exception.filter.ts` implementando `ExceptionFilter`
- Padronizar todas as respostas de erro em `{ statusCode, message, error, timestamp }`
- Registrar globalmente em `main.ts` via `app.useGlobalFilters()`
- Logar erros 5xx com o stack trace (sem expor ao cliente)

---

### 2. Paginação nos endpoints de leitura

**Problema:** `/income`, `/investments` e `/statements/:yearMonth` retornam todos os
registros sem limite — inviável com dados reais de meses cheios.

**O que fazer:**
- Criar `PaginationQueryDto` com `page: number` e `limit: number` (default 20, máx 100)
- Aplicar `.skip()` / `.take()` no Prisma
- Retornar envelope `{ data, total, page, totalPages }` em todos os endpoints afetados
- Atualizar testes e2e para validar o envelope

---

### 3. Refresh token

**Problema:** o JWT tem validade de 7 dias sem possibilidade de revogação ou renovação
silenciosa — qualquer token roubado é válido por 7 dias.

**O que fazer:**
- Reduzir `accessToken` para 15 minutos
- Emitir `refreshToken` de longa duração (30 dias) salvo na tabela `RefreshToken` (com hash)
- Criar `POST /auth/refresh` que valida o refresh token e emite um novo par
- Criar `POST /auth/logout` que invalida o refresh token no banco

---

### 4. ~~Tratamento de status PENDING na Pluggy~~ ✅ Implementado

`GET /connections/:id/status` (polling), `POST /connections/webhook` (callback Pluggy),
`HandleWebhookUseCase` (sync automático ao receber CONNECTED). Ver `doc/CONECTAR_BANCO.md`.

---

### 4b. Configuração de WEBHOOK_BASE_URL em produção

**Problema:** o webhook da Pluggy exige uma URL pública permanente. Em desenvolvimento
ngrok resolve; em produção precisa de uma URL estável.

**O que fazer:**
- Preencher `WEBHOOK_BASE_URL` no ambiente de produção com o domínio da API
- Documentar no `.env.example` (a ser criado)
- Verificar se o endpoint `/connections/webhook` está acessível sem autenticação de rede (sem VPN/firewall bloqueando)
- Registrar o webhook também no dashboard da Pluggy como fallback caso a URL mude

---

### 4c. Re-autenticação quando conexão expira (`OUTDATED`)

**Problema:** conexões bancárias expiram (sessão no banco vence). Hoje o usuário
precisa saber que precisa reconectar, e o sistema não o avisa.

**O que fazer:**
- Webhook da Pluggy envia `item/error` ou `item/updated` com `status: OUTDATED`
- `HandleWebhookUseCase` já captura o status — adicionar lógica para notificar (e-mail, push)
- Criar `PUT /connections/:id/reconnect` que aceita novas credenciais e reativa o item na Pluggy
- Alternativa simples: deixar o usuário deletar e reconectar via `POST /connections`

---

## 🟡 Importante — qualidade e operação

### 5. Corrigir cast frágil de enums em `SyncTransactionsUseCase`

**Problema:** `PrismaExpenseCategory[tx.category as unknown as keyof typeof ...]` falha
silenciosamente se a Pluggy retornar uma categoria fora do mapeamento.

**O que fazer:**
- Extrair função `toPrismaCategory(domain: ExpenseCategory | undefined): PrismaExpenseCategory | null`
- Cobrir com switch explícito + default `null`
- Aplicar o mesmo padrão em `SyncInvestmentsUseCase`

---

### 6. Sincronização agendada (cron)

**Problema:** hoje o usuário precisa chamar `/sync` manualmente toda vez que quiser dados
atualizados.

**O que fazer:**
- Instalar `@nestjs/schedule`
- Criar `SyncAllConnectionsJob` que busca todas as `Connection` com `status=CONNECTED` e
  chama `SyncTransactionsUseCase` + `SyncInvestmentsUseCase` para cada uma
- Configurar via cron expression no `.env` (ex: `SYNC_CRON=0 6 * * *` — todo dia às 6h)
- Registrar no módulo com `@Cron(process.env.SYNC_CRON)`

---

### 7. Rate limiting

**Problema:** endpoints públicos (`/auth/register`, `/auth/login`) e privados estão sem
proteção contra força bruta ou scraping.

**O que fazer:**
- Instalar `@nestjs/throttler`
- Configurar limites diferentes: autenticação (5 req/min), sync (10 req/hora), leitura (60 req/min)
- Aplicar `ThrottlerGuard` globalmente + override por endpoint onde necessário

---

### 8. Observabilidade

**Problema:** sem logs estruturados ou métricas, diagnosticar problemas em produção é difícil.

**O que fazer:**
- Substituir `Logger` do NestJS por `pino` (via `nestjs-pino`) com saída JSON
- Adicionar `requestId` (UUID) em cada request via middleware e propagá-lo nos logs
- Logar duração de chamadas à API da Pluggy e ao banco
- Criar endpoint `GET /health` retornando status do banco e do provider

---

### 9. Docker Compose para desenvolvimento

**Problema:** setup de dev depende de Podman/Docker com comandos manuais.

**O que fazer:**
- Criar `docker-compose.yml` com serviços `postgres` e `api`
- Configurar `depends_on` + healthcheck no banco
- Adicionar `npm run compose:up` / `compose:down` no `package.json`
- Atualizar `doc/` com as novas instruções de setup

---

### 10. Mapeamento de investimentos da Pluggy por conta

**Problema:** `fetchInvestments` associa todos os investimentos à primeira conta do item
porque a Pluggy não retorna `accountId` por investimento.

**O que fazer:**
- Investigar se a Pluggy tem endpoint `/investments/:id` com `accountId`
- Alternativa: criar uma conta virtual `tipo=INVESTMENT` por item e associar lá
- Atualizar o schema se necessário e adaptar `GetInvestmentsUseCase`

---

## 🟢 Evolução de produto

### 11. ~~`GET /connections` — listar conexões do usuário~~ ✅ Implementado

`GET /connections` retorna todas as conexões do usuário com `connectionId`, `status`, `createdAt`, `updatedAt`.

---

### 11b. `GET /connections` — incluir nome da instituição

**Problema:** a listagem retorna o `connectionId` mas não o nome do banco, forçando
o front a cruzar com `GET /connectors`.

**O que fazer:**
- Salvar `connectorName` na tabela `Connection` (nova migration) ao conectar
- Retornar no `GET /connections` para evitar chamadas extras

---

### 12. `DELETE /connections/:id` — desconectar banco

Revogar o item na Pluggy (se suportado) e apagar os dados locais associados.
Importante para LGPD — o usuário deve poder remover seus dados.

---

### 13. Mapeamento fino de tipos de investimento

Hoje `FIXED_INCOME` da Pluggy mapeia tudo para `CDB`. Distinguir:
- Tesouro Direto → `TESOURO_DIRETO`
- LCI / LCA → novo enum ou `OUTROS`
- Poupança → `POUPANCA`
- FII → `FII`

Exige consultar campos adicionais da resposta da Pluggy (`subtype`, `name`).

---

### 14. Dashboard de resumo (`GET /summary`)

Endpoint único que agrega para o mês corrente:
- Total de receitas
- Total de gastos por categoria
- Saldo
- Valor total investido
- Variação vs mês anterior

Evita que o front precise fazer 3 chamadas separadas.

---

### 15. Alertas de gastos

Notificar (via e-mail ou webhook) quando:
- Gastos em uma categoria ultrapassam um limite configurável
- Uma transação acima de um valor mínimo é sincronizada
- O saldo do mês fica negativo

Requer um `UserPreferences` ou `Alert` model no banco.

---

### 16. CI/CD com GitHub Actions

- Pipeline de PR: `npm test` + `npm run test:e2e` (com PostgreSQL via `services`)
- Pipeline de merge na main: build Docker + push para registry
- Verificação de type-check e lint no PR

---

## Resumo por ordem de execução sugerida

```
✅  Status PENDING / webhook Pluggy   (feito)
✅  GET /connectors                   (feito)
✅  GET /connections                  (feito)
✅  GET /connections/:id/status       (feito)

— Para fechar o fluxo de conexão —
1  → WEBHOOK_BASE_URL em produção     (1h — infra/deploy)
2  → Re-autenticação OUTDATED         (meio dia)
3  → DELETE /connections/:id          (2h + LGPD)
4  → connectorName na Connection      (1h + migration)

— Qualidade e operação —
5  → Global Exception Filter          (1-2h, isolado)
6  → Corrigir cast de enums           (1h, isolado)
7  → Paginação                        (meio dia)
8  → Rate limiting                    (2h)
9  → Refresh token                    (meio dia)
10 → Sync agendado                    (2h)
11 → Observabilidade                  (1 dia)
12 → Docker Compose                   (2h)
13 → CI/CD                            (meio dia)

— Produto —
14 → Dashboard /summary               (2h)
15 → Mapeamento fino de investimentos (2h)
16 → Alertas de gastos                (1-2 dias)
```
