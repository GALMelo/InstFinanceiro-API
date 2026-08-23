# Guia: Conectar um banco real via Pluggy

Este guia descreve o processo completo para conectar uma conta bancária real usando a integração com a Pluggy.

---

## Pré-requisitos

- Credenciais da Pluggy no `.env` (`PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`)
- API rodando (`npm run start:dev`)
- Usuário registrado e token JWT em mãos
- Para receber webhooks em desenvolvimento: ngrok ou similar instalado

---

## Passo 1 — Ativar o provider real

No `.env`, troque o provider:

```env
OPEN_FINANCE_PROVIDER=pluggy
```

Reinicie o servidor. O watch mode não relê o `.env` automaticamente.

---

## Passo 2 — Encontrar o ID do seu banco

```http
GET /connectors?search=Nubank
Authorization: Bearer <token>
```

Resposta:
```json
[
  { "id": 212, "name": "Nubank", "type": "PERSONAL_BANK", "country": "BR" }
]
```

Anote o `id` — ele é o `connectorId` usado na conexão.

Você também pode listar todos sem filtro:
```http
GET /connectors
```

---

## Passo 3 — Conectar

```http
POST /connections
Authorization: Bearer <token>
Content-Type: application/json

{
  "credentials": {
    "connectorId": 212,
    "parameters": {
      "cpf": "000.000.000-00",
      "password": "sua-senha-bancaria"
    }
  }
}
```

Os parâmetros variam por conector. A Pluggy documenta os campos obrigatórios de cada banco em seu dashboard.

### Resposta — conexão imediata (rara)

```json
{ "connectionId": "item-uuid", "status": "CONNECTED" }
```

Vá direto ao [Passo 5](#passo-5--sincronizar-dados).

### Resposta — aguardando MFA ou aprovação no app (comum)

```json
{ "connectionId": "item-uuid", "status": "PENDING" }
```

Guarde o `connectionId` e siga o [Passo 4](#passo-4--lidar-com-status-pending).

---

## Passo 4 — Lidar com status PENDING

O banco pode exigir uma etapa extra: código SMS, token físico, ou aprovação no app do banco. Há duas formas de saber quando a conexão for aprovada:

### Opção A — Webhook (recomendada)

A Pluggy chama `POST /connections/webhook` automaticamente quando o status muda. Ao receber `CONNECTED`, o sistema já dispara a sincronização sozinho.

**Configurar o webhook:**

1. Exponha a API localmente com ngrok:
   ```bash
   ngrok http 3000
   ```
   Copie a URL gerada, ex: `https://abc123.ngrok-free.app`

2. No `.env`, preencha:
   ```env
   WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
   ```

3. Reinicie o servidor. O campo `webhookUrl` será enviado automaticamente à Pluggy no próximo `POST /connections`.

Quando a conexão for aprovada, você verá nos logs:
```
[HandleWebhookUseCase] Webhook: item <id> → CONNECTED
[HandleWebhookUseCase] Sync automático concluído para item <id>
```

### Opção B — Polling manual

Chame periodicamente (ex: a cada 5 segundos) até receber `CONNECTED`:

```http
GET /connections/<connectionId>/status
Authorization: Bearer <token>
```

Resposta enquanto aguarda:
```json
{ "connectionId": "item-uuid", "status": "PENDING" }
```

Resposta ao ser aprovado:
```json
{ "connectionId": "item-uuid", "status": "CONNECTED" }
```

Quando virar `CONNECTED`, chame o sync manualmente (Passo 5).

---

## Passo 5 — Sincronizar dados

```http
POST /connections/<connectionId>/sync
Authorization: Bearer <token>
```

Busca transações dos últimos 30 dias por padrão. Para um período diferente:

```http
POST /connections/<connectionId>/sync?since=2026-01-01
```

Resposta:
```json
{
  "connectionId": "item-uuid",
  "syncedAt": "2026-08-23T14:30:00.000Z",
  "transactions": 143,
  "investments": 5
}
```

O sync é idempotente — pode ser chamado várias vezes sem duplicar dados.

---

## Passo 6 — Consultar dados

Com os dados sincronizados, use os endpoints de consulta normalmente:

```http
# Receitas do mês
GET /income?month=2026-08

# Gastos por categoria
GET /expenses/grouped?month=2026-08

# Extrato detalhado
GET /statements/2026-08

# Investimentos
GET /investments
```

---

## Listar conexões ativas

```http
GET /connections
Authorization: Bearer <token>
```

Retorna todas as conexões do usuário com status atual.

---

## Fluxo resumido

```
POST /connections          →  CONNECTED?  →  POST /sync  →  GET /income, /expenses, ...
                           ↘  PENDING?    →  aguardar webhook  ou  polling GET /status
                                          →  POST /sync (se polling)
```

---

## Erros comuns

| Situação | Causa provável | Solução |
|---|---|---|
| `status: FAILED` | Credenciais incorretas ou banco indisponível | Verifique usuário/senha e tente novamente |
| `status: OUTDATED` | Sessão expirou no banco | Reconecte: novo `POST /connections` com as mesmas credenciais |
| Sync retorna 0 transações | Conta sem movimentação no período | Aumente o período com `?since=` |
| Webhook não chega | `WEBHOOK_BASE_URL` vazio ou ngrok desatualizado | Confirme a URL pública e reinicie o servidor |
| `401 Unauthorized` | Token JWT expirado (validade 7 dias) | Faça login novamente: `POST /auth/login` |

---

## Sandbox da Pluggy (testes sem banco real)

Para testar sem expor credenciais bancárias reais, use o conector sandbox da Pluggy:

```json
{
  "credentials": {
    "connectorId": 2,
    "parameters": {
      "user": "user-ok",
      "password": "password-ok"
    }
  }
}
```

O sandbox retorna dados fictícios mas passa pelo mesmo fluxo do banco real, incluindo o estado PENDING se usar o usuário `user-mfa`.
