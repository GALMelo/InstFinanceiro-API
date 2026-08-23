# Finance API

Backend de gestão financeira com integração a Open Finance, construído com NestJS
seguindo arquitetura hexagonal (ports & adapters) para aplicar Inversão de
Dependência: o domínio depende apenas da interface `OpenFinanceProvider`,
nunca de um provedor específico. Trocar de provedor (ex: Pluggy → Belvo) é
só trocar qual adapter é injetado — nada no domínio muda.

## Como rodar

### Pré-requisitos

- Node.js 20+
- Podman **ou** Docker

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure o ambiente

```bash
cp .env.example .env
```

Ajuste `DATABASE_URL` se necessário (o padrão já funciona com o banco local descrito abaixo).

### 3. Suba o banco de dados

```bash
npm run db:up
```

Isso sobe um container PostgreSQL com Podman (ou Docker) na porta `5432`. Na primeira vez, o container é criado; nas seguintes, apenas reiniciado.

Para parar o banco:
```bash
npm run db:down
```

### 4. Rode as migrations (apenas na primeira vez)

```bash
npx prisma migrate dev --name init
```

### 5. Suba a API

```bash
npm run start:dev
```

A API sobe em `http://localhost:3000` usando o `MockOpenFinanceAdapter` por
padrão (`OPEN_FINANCE_PROVIDER=mock` no `.env`), então você já consegue
testar os endpoints sem nenhuma credencial de banco real.

A documentação Swagger fica disponível em `http://localhost:3000/docs`.

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
