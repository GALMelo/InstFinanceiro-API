# ADR-003 — Logging estruturado via filtro global de exceções

**Status:** Aceito  
**Data:** 2026-08-25  
**Contexto:** finance-api

---

## Contexto

Antes dessa decisão:
- Logs eram strings simples (`this.logger.error('Erro ao processar webhook: ' + err.message)`).
- Erros não capturados chegavam ao usuário com stack trace completo (risco de segurança).
- Não havia um ponto único para observar falhas — cada caso de uso logava do seu jeito.
- Erros de validação (400) e erros internos (500) pareciam iguais no log.

---

## Decisão

Implementamos um **filtro global de exceções** em `src/shared/filters/all-exceptions.filter.ts` que centraliza todo o tratamento e logging de erros.

### Fluxo

```
Request → Controller → throws DomainError / HttpException / Error
                              ↓
                    AllExceptionsFilter.catch()
                              ↓
              ┌───────────────┼──────────────────┐
         DomainError    HttpException         Unknown Error
              ↓               ↓                    ↓
         logger.warn      logger.warn          logger.error
         status from       status from          status 500
         error.httpStatus  exception           stack trace
              ↓               ↓                    ↓
         JSON response   JSON response        JSON response
         { statusCode,   (NestJS default)     { statusCode: 500,
           code,                               code: UNEXPECTED_ERROR,
           message }                           message: genérico }
```

### Campos de log por tipo

**DomainError** (esperado, warn):
```json
{
  "event": "domain_error",
  "code": "CONNECTION_NOT_FOUND",
  "message": "Conexão não encontrada",
  "method": "GET",
  "url": "/connections/abc/status",
  "userId": "user-123",
  "statusCode": 404
}
```

**HttpException** (validação, warn):
```json
{
  "event": "http_exception",
  "message": "Bad Request Exception",
  "method": "POST",
  "url": "/auth/register",
  "statusCode": 400
}
```

**Erro inesperado** (error):
```json
{
  "event": "unexpected_error",
  "message": "Cannot read properties of undefined",
  "method": "GET",
  "url": "/income",
  "userId": "user-123",
  "stack": "TypeError: ..."
}
```

### Princípios

1. **Stack traces nunca chegam ao cliente** — apenas ao log. O cliente recebe uma mensagem genérica.
2. **`userId` é extraído do JWT** quando disponível, para correlacionar erros com usuários.
3. **Erros esperados são `warn`**, erros inesperados são `error`. Isso facilita configurar alertas por nível.
4. **O filtro é registrado globalmente em `main.ts`** — não via decorador, para garantir que cubra todos os módulos incluindo exceções no bootstrap de guards.

---

## Futuro

Quando o volume de logs justificar:
- Adicionar um `requestId` (correlation ID) via middleware e propagá-lo nos logs.
- Integrar com um transporte estruturado (ex: Pino, Winston com JSON transport) para enviar para Datadog/Loki/CloudWatch.
- A estrutura de log atual (`event`, `code`, `userId`) já é compatível com indexação JSON nesses sistemas.
