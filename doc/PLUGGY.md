# Integração com a Pluggy

## O que é a Pluggy

A [Pluggy](https://pluggy.ai) é um agregador de Open Finance brasileiro que fornece uma API
unificada para conectar-se a contas bancárias, obter transações e investimentos de múltiplas
instituições financeiras.

No projeto, ela é implementada como um **adapter** da porta `OpenFinanceProvider`. Trocar
de provedor não exige mudar nada no domínio — apenas a variável de ambiente.

---

## Configuração

### 1. Conta sandbox

Crie uma conta gratuita em **https://pluggy.ai** e obtenha as credenciais no painel.

### 2. Variáveis de ambiente

```env
OPEN_FINANCE_PROVIDER=pluggy
PLUGGY_CLIENT_ID=seu-client-id
PLUGGY_CLIENT_SECRET=seu-client-secret
```

### 3. Reiniciar o servidor

```bash
npm run start:dev
```

---

## Credenciais de teste (sandbox)

A Pluggy disponibiliza um conector de sandbox (`connectorId: 2`) com credenciais fixas:

| Campo | Valor |
|---|---|
| `connectorId` | `2` |
| `user` | `user-ok` |
| `password` | `password-ok` |

Use `user-bad` / `password-bad` para testar o fluxo de conexão com falha.

---

## Fluxo de uso

### Autenticação

```bash
# 1. Criar conta (ou usar /auth/login se já tiver)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"eu@exemplo.com","password":"senha123"}'
# → { "accessToken": "eyJ..." }
```

### Conectar ao banco

```bash
curl -X POST http://localhost:3000/connections \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "connectorId": 2,
      "parameters": {
        "user": "user-ok",
        "password": "password-ok"
      }
    }
  }'
# → { "connectionId": "<uuid>", "status": "CONNECTED" }
```

> As credenciais são criptografadas com **AES-256-GCM** antes de serem salvas.
> O banco armazena apenas `iv:authTag:ciphertext` em hex — nunca o plaintext.

### Sincronizar dados

```bash
curl -X POST http://localhost:3000/connections/<connectionId>/sync \
  -H "Authorization: Bearer <TOKEN>"
# → { "connectionId": "...", "syncedAt": "...", "transactions": N, "investments": N }

# Sincronizar a partir de uma data específica
curl -X POST "http://localhost:3000/connections/<connectionId>/sync?since=2026-01-01" \
  -H "Authorization: Bearer <TOKEN>"
```

### Consultar dados

```bash
TOKEN="Bearer <TOKEN>"
MONTH="2026-08"

curl "http://localhost:3000/income?month=$MONTH"           -H "$TOKEN"
curl "http://localhost:3000/expenses/grouped?month=$MONTH" -H "$TOKEN"
curl "http://localhost:3000/investments"                    -H "$TOKEN"
curl "http://localhost:3000/statements/$MONTH"             -H "$TOKEN"
```

---

## Detalhes de implementação do PluggyAdapter

### Autenticação e cache de token

```
POST https://api.pluggy.ai/auth
{ "clientId": "...", "clientSecret": "..." }
→ { "apiKey": "..." }   # válido por 2 horas
```

O adapter armazena o token em memória e o renova automaticamente 10 minutos antes de
expirar (TTL configurado para 1h50m). Nenhum request precisa lidar com renovação.

### Endpoints utilizados

| Método | Endpoint Pluggy | Usado em |
|---|---|---|
| `POST /items` | Criar conexão com banco | `connectAccount` |
| `GET /items/:id` | Buscar nome da instituição | `fetchAccounts` |
| `GET /accounts?itemId=` | Listar contas do item | `fetchAccounts`, `fetchInvestments` |
| `GET /transactions?itemId=&from=` | Listar transações com paginação cursor | `fetchTransactions` |
| `GET /investments?itemId=` | Listar investimentos | `fetchInvestments` |

### Paginação de transações

Transações usam paginação por cursor (`next`). O adapter busca todas as páginas em loop:

```
GET /transactions?itemId=<id>&from=2026-01-01&pageSize=500
→ { results: [...], next: "<cursor>" }

GET /transactions?itemId=<id>&from=2026-01-01&pageSize=500&cursor=<cursor>
→ { results: [...], next: null }   ← fim
```

### Mapeamento de tipos

**Direção da transação:**

| Pluggy `type` | Domínio |
|---|---|
| `CREDIT` | `INCOME` |
| `DEBIT` | `EXPENSE` |

**Categoria (mapeamento por regex):**

| Padrão detectado | Categoria |
|---|---|
| `ALIMENT`, `FOOD`, `RESTAUR`, `GROCERY` | `ALIMENTACAO` |
| `TRANSPORT`, `TAXI`, `UBER`, `COMBUSTIVEL` | `TRANSPORTE` |
| `LAZER`, `ENTERT`, `CINEMA`, `SPORT` | `LAZER` |
| `MORADIA`, `ALUGUEL`, `CONDOMIN`, `IPTU` | `MORADIA` |
| `SAUDE`, `HEALTH`, `MEDIC`, `FARMAC` | `SAUDE` |
| Qualquer outro | `OUTROS` |

**Tipo de investimento:**

| Pluggy `type` | Domínio |
|---|---|
| `EQUITY` | `ACOES` |
| `FIXED_INCOME` | `CDB` |
| `ETF`, `MUTUAL_FUND`, `COE`, `SECURITY`, `OTHER` | `OUTROS` |

---

## Limitações conhecidas

- Investimentos da Pluggy não retornam `accountId` — todos são associados à primeira
  conta do item.
- Status `PENDING` / `UPDATING` retornados por `connectAccount` não têm tratamento de
  retry ou webhook implementado. Aguardar e chamar `/sync` novamente é o workaround atual.
- Sem mapeamento para `POUPANCA`, `FII` e `TESOURO_DIRETO` — esses tipos da Pluggy
  (`FIXED_INCOME` cobre CDB e Tesouro sem distinção).
