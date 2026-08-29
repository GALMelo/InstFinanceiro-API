# Pluggy SDK — Achados de Exploração

**Data**: [a preencher após execução]
**SDK version**: [a preencher — verificar com `cat node_modules/pluggy-sdk/package.json | grep '"version"'`]
**itemId testado**: [redacted — não commitar o itemId real]

---

## 1. Identificação de receita vs. despesa

**Campo observado**: [a preencher após execução — candidatos: `type`, `amount`]

**Valores possíveis**: [a preencher com valores reais encontrados, ex: `CREDIT`, `DEBIT`]

**Suposição atual do PluggyAdapter**:
```
// pluggy.adapter.ts:73
function toDirection(pluggyType: 'CREDIT' | 'DEBIT'): TransactionDirection {
  return pluggyType === 'CREDIT' ? TransactionDirection.INCOME : TransactionDirection.EXPENSE;
}
// Usa o campo `type` com valores CREDIT/DEBIT para determinar direção
```

**Status**: [ ] CONFIRMADA / [ ] INCORRETA / [ ] INDEFINIDA

**Observações**: [evidência dos dados — colar trecho do JSON real]

---

## 2. Campo de categoria

**Campo observado**: [a preencher — candidatos: `category`, `categoryId`]

**Formato**: [ ] texto livre / [ ] enum fixo / [ ] ID numérico / [ ] objeto aninhado

**Valores de exemplo**: [a preencher com valores reais, ex: `"Alimentação"`, `"FOOD"`, `42`]

**Suposição atual do PluggyAdapter**:
```
// pluggy.adapter.ts:77
function toCategory(pluggyCategory?: string): ExpenseCategory | undefined {
  if (!pluggyCategory) return undefined;
  const c = pluggyCategory.toUpperCase();
  if (/ALIMENT|FOOD|RESTAUR|SUPERMERCADO|GROCERY/.test(c)) return ExpenseCategory.ALIMENTACAO;
  // ... regex matching sobre string de texto livre
}
// Assume `category` é string de texto livre; faz regex matching
// Não usa `categoryId`
```

**Status**: [ ] CONFIRMADA / [ ] INCORRETA / [ ] INDEFINIDA

**Observações**: [evidência dos dados]

---

## 3. Relação investimento ↔ conta

**Campo observado**: [a preencher — procurar por `accountId` ou campo similar no JSON de investimento]

**Comportamento encontrado**: [a preencher — o investimento tem referência à conta? Qual campo?]

**Suposição atual do PluggyAdapter**:
```
// pluggy.adapter.ts (fetchInvestments)
// Limitação conhecida: associa todos os investimentos à primeira conta do item
// porque a Pluggy supostamente não retorna accountId por investimento
```

**Status**: [ ] CONFIRMADA (Pluggy realmente não retorna accountId)
           / [ ] INCORRETA (existe um campo que o adapter ignora)
           / [ ] INDEFINIDA (dados insuficientes)

**Observações**: [evidência dos dados — JSON completo do primeiro investimento]

---

## 4. Outros campos não mapeados encontrados

[Listar campos presentes no JSON real que o PluggyAdapter não mapeia atualmente]

| Campo | Tipo | Descrição observada | Relevância para o adapter |
|-------|------|--------------------|-----------------------------|
| [campo] | [tipo] | [o que parece ser] | [alto/médio/baixo] |

---

## 5. Divergências que requerem correção no PluggyAdapter

[Listar apenas os itens com status INCORRETA das seções acima]

| # | Seção | Comportamento atual do adapter | Comportamento correto observado |
|---|-------|-------------------------------|--------------------------------|
| 1 | [ref] | [o que o adapter faz] | [o que deveria fazer] |

> **Nota**: Este documento é o insumo para uma spec futura de correção do PluggyAdapter.
> Não implementar correções diretamente aqui.
