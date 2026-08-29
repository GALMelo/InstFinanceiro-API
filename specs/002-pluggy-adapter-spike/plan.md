# Implementation Plan: Pluggy Adapter Data Exploration Spike

**Branch**: `002-pluggy-adapter-spike` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-pluggy-adapter-spike/spec.md`

## Summary

Script standalone de exploração em TypeScript (`scripts/pluggy-explore.ts`) que se autentica na
Pluggy SDK, consulta contas, transações e investimentos de um `itemId` de teste, e imprime os
dados completos em console — sem efeitos colaterais no banco de dados. O artefato final é o
script mais um documento de achados (`findings.md`) escrito manualmente após rodar o script
contra dados reais.

## Technical Context

**Language/Version**: TypeScript (consistente com o projeto; versão do tsconfig existente)

**Primary Dependencies**:
- `pluggy-sdk` — cliente oficial Pluggy; **NOVO**, precisa ser instalado
- `ts-node` v10.9.2 — já é `devDependency`; nenhuma instalação adicional
- `dotenv` — disponível como dependência transitiva do projeto; utilizável via `import 'dotenv/config'` sem instalação adicional

**Storage**: N/A — nenhuma interação com banco de dados em nenhum ponto

**Testing**: N/A — spike descartável, sem testes automatizados

**Target Platform**: Node.js (mesmo ambiente do projeto existente)

**Project Type**: Script standalone de investigação — explicitamente fora da aplicação NestJS

**Performance Goals**: N/A — ferramenta de uso único, volume de dados de sandbox

**Constraints**:
- Nenhuma escrita em banco de dados (bloqueante)
- Nenhum import de `src/` no script (o script não pode acionar o bootstrap do NestJS)
- Nenhuma alteração em `src/` como parte desta feature

**Scale/Scope**: Um único arquivo (`scripts/pluggy-explore.ts`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Princípio I — Hexagonal Architecture & Vendor Independence

**Status**: EXCEÇÃO EXPLÍCITA E JUSTIFICADA

A constituição diz que o Pluggy SDK MUST NEVER be referenced directly outside of
`infrastructure/`. Este script intencionalmente viola a letra dessa regra porque:

1. Ele vive em `scripts/` — fora de `src/` — e nunca será importado por nenhum módulo da
   aplicação. A regra de isolamento visa proteger o código de produto de acoplamento ao
   vendedor; um script de investigação descartável não é código de produto.
2. O próprio objetivo do spike é inspecionar o contrato real do SDK, o que é impossível
   sem acessá-lo diretamente.
3. O script não introduz nem altera nenhuma suposição na camada `infrastructure/` — pelo
   contrário, seus achados informarão correções futuras no `PluggyAdapter`.

**Mitigação**: O script é marcado claramente como temporário. Não deve ser commitado em
`main`/`master` — seu ciclo de vida termina quando os achados forem documentados.

### Princípios II, III, IV, V

**Status**: PASS — não aplicáveis a este spike
- Não há use cases, controllers, DTOs nem queries.
- Sem dados de usuário, sem multi-tenancy, sem escrita em banco.

## Project Structure

### Documentation (this feature)

```text
specs/002-pluggy-adapter-spike/
├── plan.md              # Este arquivo
├── research.md          # N/A — nenhuma incerteza técnica pendente
├── quickstart.md        # Instruções de execução do script
├── findings.md          # Artefato manual pós-execução: achados documentados
└── tasks.md             # Gerado por /speckit-tasks
```

### Source Code (repository root)

```text
scripts/                 # NOVO — pasta isolada, fora de src/
└── pluggy-explore.ts    # Script de exploração (único arquivo desta feature)
```

**Structure Decision**: Pasta `scripts/` na raiz do projeto, separada de `src/`. Esta
convenção já é comum em projetos Node/NestJS para scripts utilitários que não fazem parte
do bundle de produção. O arquivo não é referenciado por nenhum módulo do framework.

## Implementation Notes

### Dependência nova

`pluggy-sdk` deve ser instalado como dependência de produção:

```
npm install pluggy-sdk
```

Não há razão para `--save-dev` pois o SDK já é usado em `src/infrastructure/` pelo
`PluggyAdapter` existente — verificar se já está no `package.json` antes de instalar.

### Execução do script

```bash
npx ts-node scripts/pluggy-explore.ts <ITEM_ID>
```

Ou, se o `itemId` for definido como constante no topo do arquivo:

```bash
npx ts-node scripts/pluggy-explore.ts
```

### Lógica de normalização de resposta da Pluggy

A Pluggy SDK pode retornar respostas paginadas como `{ results: T[], total: number }` ou
como array direto `T[]`, dependendo da versão e do método. O script deve tratar os dois
formatos:

```typescript
const accounts = Array.isArray(response) ? response : response.results ?? [];
```

### Verificação de método em runtime

Antes de chamar `fetchInvestments`, verificar existência em runtime:

```typescript
if (typeof (client as any).fetchInvestments === 'function') {
  // chamar e inspecionar
} else {
  console.warn('[investments] método não disponível nesta versão do SDK');
}
```

### Campos de interesse para o resumo por transação

Ao iterar transações, o resumo linha a linha deve destacar:

| Campo | Relevância |
|-------|-----------|
| `amount` | Valor da transação (positivo/negativo pode indicar tipo) |
| `type` | Possível discriminador receita vs. despesa |
| `category` | Categoria em texto livre ou enum |
| `categoryId` | Identificador de categoria (se existir) |

### Estrutura do findings.md (template para preenchimento manual)

Após rodar o script, o desenvolvedor deve criar `specs/002-pluggy-adapter-spike/findings.md`
com a seguinte estrutura:

```markdown
# Pluggy SDK — Achados de Exploração

**Data**: [data da execução]
**SDK version**: [versão do pluggy-sdk instalada]
**itemId testado**: [redacted ou referência]

## 1. Identificação de receita vs. despesa

**Campo observado**: `[nome do campo]`
**Valores possíveis**: `[lista de valores encontrados]`
**Suposição atual do PluggyAdapter**: [copiar trecho relevante]
**Status**: CONFIRMADA / INCORRETA / INDEFINIDA
**Observações**: [evidência dos dados]

## 2. Campo de categoria

**Campo observado**: `[nome do campo]`
**Formato**: texto livre / enum / ID numérico
**Valores de exemplo**: [lista de exemplos reais]
**Suposição atual do PluggyAdapter**: [copiar trecho relevante]
**Status**: CONFIRMADA / INCORRETA / INDEFINIDA

## 3. Relação investimento ↔ conta

**Campo observado**: `[nome do campo, ou "ausente"]`
**Comportamento encontrado**: [descrição]
**Suposição atual do PluggyAdapter**: fetchInvestments associa todos à primeira conta
**Status**: CONFIRMADA / INCORRETA / INDEFINIDA

## 4. Outros campos não mapeados encontrados

[Lista livre de campos inesperados ou relevantes encontrados no JSON raw]

## 5. Divergências que requerem correção no PluggyAdapter

[Lista de divergências INCORRETAS — insumo para spec futura]
```

## Complexity Tracking

| Exceção | Justificativa | Alternativa Rejeitada |
|---------|---------------|----------------------|
| Pluggy SDK em `scripts/` (viola Princípio I) | O spike não pode investigar o contrato do SDK sem acessá-lo diretamente; `scripts/` é explicitamente fora do código de produto | Ler docs da Pluggy sem dados reais — insuficiente para validar suposições do adapter existente |
