# Finance API

Backend de gestão financeira com integração a Open Finance, construído com NestJS
seguindo arquitetura hexagonal (ports & adapters) para aplicar Inversão de
Dependência: o domínio depende apenas da interface `OpenFinanceProvider`,
nunca de um provedor específico. Trocar de provedor (ex: Pluggy → Belvo) é
só trocar qual adapter é injetado — nada no domínio muda.

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Copie o `.env.example` para `.env` e ajuste `DATABASE_URL` para apontar
   pro seu PostgreSQL (local, Docker, Supabase, Neon, etc.):
   ```bash
   cp .env.example .env
   ```

3. Gere o Prisma Client e rode a primeira migration:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. Suba a API:
   ```bash
   npm run start:dev
   ```

A API sobe em `http://localhost:3000` usando o `MockOpenFinanceAdapter` por
padrão (`OPEN_FINANCE_PROVIDER=mock` no `.env`), então você já consegue
testar os endpoints abaixo sem nenhuma credencial de banco real.

## Endpoints disponíveis

| Método | Rota                          | Descrição                                   |
|--------|-------------------------------|----------------------------------------------|
| GET    | `/income?month=2026-08`       | Ganhos do mês, com a fonte de cada um        |
| GET    | `/expenses/grouped?month=2026-08` | Gastos agrupados por categoria           |
| GET    | `/investments`                | Investimentos consolidados por tipo          |
| GET    | `/statements/2026-08`         | Extrato/timeline do mês (ganhos e gastos)    |

Esses endpoints leem do banco de dados. Para popular o banco a partir do
provider de Open Finance, use os use cases `SyncAccountsUseCase` e
`SyncTransactionsUseCase` (ainda não expostos como endpoint — próximo passo
natural é criar um `POST /connections/:id/sync` que os chama).

## Estrutura

```
src/
├── modules/
│   ├── open-finance/     ← domínio, porta (interface) e adapters (mock/pluggy)
│   ├── transactions/     ← consultas de ganhos e gastos agrupados
│   ├── investments/      ← consolidação de investimentos
│   └── statements/       ← extrato mensal / timeline
└── shared/prisma/        ← PrismaService compartilhado entre módulos
```

## Trocando de provedor de Open Finance

No `.env`, mude:
```
OPEN_FINANCE_PROVIDER=pluggy
```
e implemente os métodos em
`src/modules/open-finance/infrastructure/adapters/pluggy/pluggy.adapter.ts`
(estão como placeholder `throw new Error('Not implemented')`).
Nenhum outro arquivo do projeto precisa mudar.

## Próximos passos sugeridos

- Autenticação (JWT) e substituir o `userId` fixo (`'demo-user'`) nos
  controllers pelo usuário autenticado.
- Endpoint `POST /connections` para iniciar a conexão Open Finance e
  disparar `SyncAccountsUseCase` / `SyncTransactionsUseCase`.
- Testes unitários dos use cases usando `MockOpenFinanceAdapter`.
- Criptografia de credenciais de conexão bancária em repouso.
