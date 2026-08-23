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

### 4. Tratamento de status PENDING na Pluggy

**Problema:** `connectAccount` pode retornar `status: 'PENDING'` quando a instituição
exige MFA ou está processando. Hoje o sistema não tem como notificar quando vira `CONNECTED`.

**O que fazer:**
- Criar endpoint `GET /connections/:id` que relê o status do item na Pluggy
- Criar `POST /connections/:id/webhook` para receber callbacks da Pluggy quando o status muda
- Atualizar a tabela `Connection` ao receber o webhook e disparar a sincronização automaticamente

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

### 11. `GET /connections` — listar conexões do usuário

Retornar as conexões ativas do usuário com `connectionId`, `status`, e `institution`.
Útil para o front saber quais bancos estão conectados e se precisam de re-autenticação.

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
1  → Global Exception Filter          (1-2h, isolado)
2  → Corrigir cast de enums           (1h, isolado)
3  → Paginação                        (meio dia)
4  → Rate limiting                    (2h)
5  → Refresh token                    (meio dia)
6  → GET /connections                 (1h)
7  → DELETE /connections/:id          (2h + LGPD)
8  → Status PENDING / webhook Pluggy  (1 dia)
9  → Sync agendado                    (2h, depende de #8)
10 → Observabilidade                  (1 dia)
11 → Docker Compose                   (2h)
12 → CI/CD                            (meio dia)
13 → Dashboard /summary               (2h)
14 → Mapeamento fino de investimentos (2h)
15 → Alertas de gastos                (1-2 dias)
```
