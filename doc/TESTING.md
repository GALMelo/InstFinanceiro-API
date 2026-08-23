# Testes

## Visão Geral

| Tipo | Comando | Requer banco? | Requer rede? |
|---|---|---|---|
| Unitários | `npm test` | Não | Não |
| E2E | `npm run test:e2e` | Sim | Não |

---

## Testes Unitários

Testam os use cases de forma completamente isolada. O `PrismaService` é substituído por um
objeto com `jest.fn()` e o `OpenFinanceProvider` é o `MockOpenFinanceAdapter` instanciado
diretamente — sem NestJS DI, sem banco, sem rede.

```bash
npm test
# ou em modo watch
npm run test:watch
```

### Cobertura atual

#### `SyncTransactionsUseCase`

| Caso | O que verifica |
|---|---|
| Caso feliz | Contagem retornada = 3 (mock semeia 3 transações) |
| Campos do upsert | `id`, `direction`, `amount`, `sourceLabel` da transação INCOME |
| Mapeamento de categoria | ALIMENTACAO e TRANSPORTE mapeados corretamente |
| Provider vazio | Retorna 0, nunca chama `upsert` |

#### `GetIncomeUseCase`

| Caso | O que verifica |
|---|---|
| Caso feliz | Repassa as rows do Prisma sem transformação |
| Filtros passados ao Prisma | `direction=INCOME`, `userId`, intervalo de datas |
| Mês vazio | Retorna `[]` |
| Virada de ano | `month=2026-12` → intervalo `[2026-12-01, 2027-01-01)` |

#### `GetExpensesGroupedUseCase`

| Caso | O que verifica |
|---|---|
| Caso feliz | Shape `{ category, total, count }` |
| Filtros passados ao `groupBy` | `direction=EXPENSE`, `userId`, intervalo |
| Mês vazio | Retorna `[]` |
| `category: null` | Aparece como `"OUTROS"` no resultado |

#### `CryptoService`

| Caso | O que verifica |
|---|---|
| Roundtrip | `decrypt(encrypt(x)) === x` |
| IV aleatório | Mesmo plaintext gera ciphertexts distintos |
| Chave inválida | Lança erro ao inicializar com chave de tamanho errado |
| Adulteração detectada | GCM lança erro ao decriptar dado modificado |
| Formato do output | `iv:authTag:ciphertext` — comprimentos corretos em hex |

---

## Testes E2E

Testam o stack HTTP completo: NestJS + Prisma + PostgreSQL real, via Supertest.

### Pré-requisito

O banco deve estar rodando:

```bash
npm run db:up
```

### Execução

```bash
npm run test:e2e
```

### Estratégia de seed

O `beforeAll` executa o fluxo real via HTTP:
1. `POST /auth/register` → obtém JWT
2. `POST /connections` → conecta via `MockOpenFinanceAdapter`
3. `POST /connections/:id/sync` → popula banco com dados determinísticos

O `afterAll` limpa todas as tabelas na ordem correta das FKs.

### Cobertura atual

#### `GET /income`
- `401` sem token
- `400` com formato inválido (`08-2026`)
- `400` com mês inexistente (`2026-13`)
- `200` com receita de R$ 5.200 (salário do mock)
- `200` lista vazia no mês anterior

#### `GET /expenses/grouped`
- `401` sem token
- `400` com formato inválido
- `200` com ALIMENTACAO (R$ 89,90) e TRANSPORTE (R$ 42,50)
- `200` lista vazia no mês anterior

#### `GET /investments`
- `401` sem token
- `200` com `total: 4500`, `byType: { CDB: 3000, ACOES: 1500 }`, `items.length: 2`

#### `GET /statements/:yearMonth`
- `401` sem token
- `400` com formato inválido (`agosto-2026`)
- `200` com `totalIncome: 5200`, `totalExpense: 132.40`, `balance: 5067.60`, `timeline.length: 3`
- `200` extrato vazio no mês anterior (`totalIncome: 0`, `balance: 0`)
- `200` timeline em ordem cronológica crescente

---

## Dados do MockOpenFinanceAdapter

O mock semeia sempre os mesmos dados com `new Date()` como data das transações
(ou seja, o mês corrente). Os testes e2e calculam o mês dinamicamente:

```typescript
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
```

| Entidade | Dados |
|---|---|
| Account | `Banco Fake S.A.` — Conta Corrente |
| Transaction 1 | INCOME R$ 5.200 — `Empresa X - Salario` |
| Transaction 2 | EXPENSE R$ 89,90 — `Supermercado Extra` — ALIMENTACAO |
| Transaction 3 | EXPENSE R$ 42,50 — `99 Taxi` — TRANSPORTE |
| Investment 1 | CDB R$ 3.000 — `Banco Fake S.A.` |
| Investment 2 | ACOES R$ 1.500 — `Corretora Fake` |
