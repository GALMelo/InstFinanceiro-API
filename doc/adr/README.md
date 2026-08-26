# Architecture Decision Records (ADR)

Decisões arquiteturais do projeto finance-api, organizadas cronologicamente.

> **O que é um ADR?** Um registro curto que documenta uma decisão de design significativa: o contexto que levou à decisão, o que foi decidido, e as consequências esperadas. O objetivo é que um novo colaborador entenda o *porquê* das escolhas, não apenas o *o quê*.

---

| # | Título | Status | Data |
|---|--------|--------|------|
| [001](./001-result-pattern.md) | Padrão Result (Either) para tratamento de erros | Aceito | 2026-08-25 |
| [002](./002-domain-errors.md) | Hierarquia de erros de domínio | Aceito | 2026-08-25 |
| [003](./003-structured-logging.md) | Logging estruturado via filtro global de exceções | Aceito | 2026-08-25 |

---

## Como adicionar um ADR

1. Crie um arquivo `NNN-titulo-curto.md` (próximo número sequencial).
2. Use a estrutura: **Contexto → Decisão → Consequências**.
3. Adicione uma linha na tabela acima.
4. Status possíveis: `Proposto`, `Aceito`, `Depreciado`, `Substituído por ADR-NNN`.
