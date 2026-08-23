# Finance API

Backend de gestão financeira pessoal com integração Open Finance via **Pluggy** (ou mock para
desenvolvimento), construído com NestJS seguindo arquitetura hexagonal (ports & adapters).

## Como rodar

### Pré-requisitos

- Node.js 20+
- Podman **ou** Docker

### Início rápido

```bash
npm install
npm run db:up                          # sobe PostgreSQL via Podman/Docker
npx prisma migrate dev --name init    # aplica migrations (só na primeira vez)
npm run start:dev                      # API em :3000, Swagger em :3000/docs
```

### Variáveis de ambiente (`.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/finance?schema=public` | PostgreSQL |
| `OPEN_FINANCE_PROVIDER` | `mock` | `mock` (sem credenciais) ou `pluggy` |
| `JWT_SECRET` | `troque-em-producao` | Segredo para assinar tokens JWT |
| `ENCRYPTION_KEY` | (gerada) | Chave AES-256-GCM em hex (64 chars) |
| `PLUGGY_CLIENT_ID` | — | Só quando `OPEN_FINANCE_PROVIDER=pluggy` |
| `PLUGGY_CLIENT_SECRET` | — | Só quando `OPEN_FINANCE_PROVIDER=pluggy` |

Para gerar uma `ENCRYPTION_KEY`:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Endpoints

Todos os endpoints de dados exigem `Authorization: Bearer <JWT>`.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cria conta e retorna JWT |
| `POST` | `/auth/login` | Autentica e retorna JWT |
| `POST` | `/connections` | Conecta ao banco via Open Finance |
| `POST` | `/connections/:id/sync` | Sincroniza contas, transações e investimentos |
| `GET` | `/income?month=YYYY-MM` | Receitas do mês |
| `GET` | `/expenses/grouped?month=YYYY-MM` | Gastos por categoria |
| `GET` | `/investments` | Carteira consolidada |
| `GET` | `/statements/YYYY-MM` | Extrato mensal completo |

## Testes

```bash
npm test              # unitários (sem banco)
npm run test:e2e      # e2e com banco real (requer db:up)
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [`doc/PROJECT_OVERVIEW.md`](doc/PROJECT_OVERVIEW.md) | Visão geral, arquitetura, fluxos, decisões técnicas, status |
| [`doc/TESTING.md`](doc/TESTING.md) | Guia completo de testes unitários e e2e |
| [`doc/PLUGGY.md`](doc/PLUGGY.md) | Integração com a Pluggy: setup, credenciais sandbox, mapeamentos |
| `http://localhost:3000/docs` | Swagger UI interativo (com instrução de uso embutida) |
