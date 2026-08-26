# ADR-002 — Hierarquia de erros de domínio

**Status:** Aceito  
**Data:** 2026-08-25  
**Contexto:** finance-api

---

## Contexto

Antes dessa decisão, erros eram representados por exceções NestJS (`NotFoundException`, `InternalServerErrorException`) ou por `Error` genérico. O resultado era:

- Não havia como distinguir "conexão não encontrada" de "falha na API do banco" sem inspecionar a mensagem.
- O código HTTP era definido implicitamente pelo tipo de exceção NestJS, acoplando o domínio ao protocolo HTTP.
- Logs não tinham um `code` estruturado para correlacionar e alertar.

---

## Decisão

Criamos uma hierarquia de erros em `src/shared/errors/domain.errors.ts`:

```
DomainError (abstract)
├── Auth
│   ├── EmailAlreadyExistsError   → 409
│   └── InvalidCredentialsError   → 401
├── Open Finance
│   ├── ConnectionNotFoundError   → 404
│   ├── BankProviderError         → 502
│   └── SyncError                 → 500
└── Generic
    └── UnexpectedError           → 500
```

### Estrutura da classe base

```typescript
export abstract class DomainError extends Error {
  abstract readonly code: string;    // constante de máquina, ex: "CONNECTION_NOT_FOUND"
  abstract readonly httpStatus: number;
  constructor(message: string, readonly cause?: unknown) { ... }
}
```

### Regras

1. **Adaptadores de infraestrutura** (ex: `PluggyAdapter`) lançam `DomainError` quando o provider externo falha. Nunca lançam `HttpException`.
2. **Casos de uso** capturam `DomainError` da infraestrutura e os propagam como `err(e)`. Erros não esperados são envolvidos em `toUnexpected(e)`.
3. **Controllers** relançam o `DomainError` recebido. O filtro global (`AllExceptionsFilter`) converte para resposta HTTP.
4. **O `httpStatus` é a única fonte de verdade** para o código HTTP de um erro. Não há mapeamentos espalhados pelo código.

### Resposta HTTP padronizada

Todo erro de domínio retorna:
```json
{
  "statusCode": 404,
  "code": "CONNECTION_NOT_FOUND",
  "message": "Conexão não encontrada"
}
```

O campo `code` é estável e pode ser usado por clientes para tratar erros programaticamente.

---

## Consequências

**Positivas:**
- Um único lugar para adicionar novos erros.
- Logs estruturados com `code` permitem alertas precisos (ex: alerta se `BANK_PROVIDER_ERROR` > N/min).
- Mensagens de erro são consistentes entre desenvolvimento e produção.

**Negativas / trade-offs:**
- Exige adicionar uma nova classe para cada novo tipo de erro (pequena fricção).
- `502 Bad Gateway` para falhas do provider externo pode surpreender quem espera `500`. É a semântica correta (o gateway falhou), mas vale documentar.
