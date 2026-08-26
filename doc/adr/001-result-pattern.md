# ADR-001 — Padrão Result (Either) para tratamento de erros

**Status:** Aceito  
**Data:** 2026-08-25  
**Contexto:** finance-api

---

## Contexto

Antes dessa decisão, os casos de uso lançavam exceções NestJS (`NotFoundException`, `ConflictException`, etc.) diretamente. Isso criava dois problemas:

1. **Vazamento de camada**: o domínio conhecia tipos de HTTP, violando a separação hexagonal.
2. **Contratos implícitos**: não havia como saber, apenas pela assinatura do método, quais erros um caso de uso poderia produzir. O chamador precisava ler a implementação ou contar com documentação fora do código.

---

## Decisão

Adotamos o padrão **Result** (também chamado de Either) em todos os casos de uso e serviços de domínio.

### Implementação

```typescript
// src/shared/result/result.ts
export type Result<T, E = any> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly ok = true as const;
  constructor(readonly value: T) {}
  isOk(): this is Ok<T> { return true; }
  isErr(): this is Err<never> { return false; }
}

export class Err<E> {
  readonly ok = false as const;
  constructor(readonly error: E) {}
  isOk(): this is Ok<never> { return false; }
  isErr(): this is Err<E> { return true; }
}

export const ok = <T>(value: T): Ok<T> => new Ok(value);
export const err = <E>(error: E): Err<E> => new Err(error);
```

### Convenções de uso

**Caso de uso** — sempre retorna `Result`:
```typescript
async execute(userId: string): Promise<Result<{ accessToken: string }, DomainError>> {
  try {
    // lógica
    return ok({ accessToken: token });
  } catch (e) {
    if (e instanceof DomainError) return err(e);
    return err(toUnexpected(e));
  }
}
```

**Controller** — desempacota e relança o erro (capturado pelo filtro global):
```typescript
async login(@Body() dto: AuthDto) {
  const result = await this.auth.login(dto);
  if (result.isErr()) throw result.error;
  return result.value;
}
```

**Operações fire-and-forget** (ex: webhook) — inspecionam o Result e logam erros, sem relançar:
```typescript
const r = await this.syncAccounts.execute(userId, itemId);
if (r.isErr()) {
  this.logger.error({ event: 'sync_failed', code: r.error.code, message: r.error.message });
}
```

---

## Consequências

**Positivas:**
- A assinatura do método é o contrato. Sem efeitos colaterais escondidos.
- Erros de domínio ficam no domínio. Controllers e filtros fazem a tradução para HTTP.
- Operações concorrentes podem verificar cada resultado individualmente (ex: sync paralelo de transações + investimentos).
- TypeScript força o chamador a lidar com o caso de erro (narrowing via `isOk()`/`isErr()`).

**Negativas / trade-offs:**
- Adiciona verbosidade nos casos de uso (try/catch + return err).
- Testes precisam desempacotar o Result (`result.isOk()`, `result.value`).
- Não usamos biblioteca externa (ex: `neverthrow`) para manter zero dependências novas. Se a codebase crescer, vale reavaliar.
