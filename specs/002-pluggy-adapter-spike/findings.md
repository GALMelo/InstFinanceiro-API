# Pluggy SDK — Achados de Exploração

**Data**: 2026-08-28
**SDK version**: pluggy-sdk (instalado via npm install pluggy-sdk — verificar com `cat node_modules/pluggy-sdk/package.json | grep '"version"'`)
**itemId testado**: [redacted — Santander, conta corrente + cartão de crédito + 32 investimentos]

---

## 1. Identificação de receita vs. despesa

**Campo observado**: `type`

**Valores possíveis encontrados**: `"CREDIT"` | `"DEBIT"`

**Comportamento do `amount`**:
- Conta corrente (BANK): `amount` é **assinado** — negativo para DEBIT, positivo para CREDIT
  - `amount: 6.08` + `type: CREDIT` → receita
  - `amount: -130` + `type: DEBIT` → despesa
- Cartão de crédito (CREDIT): `amount` é **sempre positivo** independentemente do tipo
  - `amount: 74.7` + `type: DEBIT` → compra (despesa)
  - O sinal do `amount` não é confiável para cartão

**Suposição atual do PluggyAdapter**:
```typescript
// pluggy.adapter.ts:73
function toDirection(pluggyType: 'CREDIT' | 'DEBIT'): TransactionDirection {
  return pluggyType === 'CREDIT' ? TransactionDirection.INCOME : TransactionDirection.EXPENSE;
}
// Usa o campo `type` com valores CREDIT/DEBIT para determinar direção
```

**Status**: ✅ CONFIRMADA

**Observações**: A lógica de usar `type` é correta. O `amount` poderia ser usado como
sinal auxiliar para conta corrente, mas para cartão de crédito o `type` é o único campo
confiável. A suposição atual está correta para ambos os tipos de conta.

---

## 2. Campo de categoria

**Campo observado**: `category` (string) + `categoryId` (string numérica hierárquica)

**Formato do `category`**: texto em **inglês** (não português), aparentemente de um vocabulário
controlado mas não documentado como enum fixo

**Formato do `categoryId`**: string numérica de 8 dígitos com estrutura hierárquica
- `"03010000"` → Automatic investment
- `"05070000"` → Transfer - PIX
- `"10000000"` → Groceries (nível pai)
- `"11010000"` → Eating out
- `"19010000"` → Taxi and ride-hailing

**Valores de exemplo reais**:
| category | categoryId |
|----------|------------|
| `"Automatic investment"` | `"03010000"` |
| `"Transfer - PIX"` | `"05070000"` |
| `"Eating out"` | `"11010000"` |
| `"Taxi and ride-hailing"` | `"19010000"` |
| `"Groceries"` | `"10000000"` |

**Suposição atual do PluggyAdapter**:
```typescript
// pluggy.adapter.ts:77
function toCategory(pluggyCategory?: string): ExpenseCategory | undefined {
  const c = pluggyCategory.toUpperCase();
  if (/ALIMENT|FOOD|RESTAUR|SUPERMERCADO|GROCERY/.test(c)) return ExpenseCategory.ALIMENTACAO;
  if (/TRANSPORT|TAXI|UBER|COMBUSTIVEL|FUEL|BUS|METRO/.test(c)) return ExpenseCategory.TRANSPORTE;
  if (/LAZER|ENTRET|ENTERTAIN|CINEMA|SPORT|HOBBY/.test(c)) return ExpenseCategory.LAZER;
  if (/MORADIA|ALUGUEL|HOUSING|CONDOMIN|IPTU/.test(c)) return ExpenseCategory.MORADIA;
  if (/SAUDE|HEALTH|MEDIC|FARMAC|HOSPITAL/.test(c)) return ExpenseCategory.SAUDE;
  return ExpenseCategory.OUTROS;
}
// Usa o campo `category` com regex matching; ignora `categoryId`
```

**Status**: ⚠️ INCORRETA (parcialmente)

**Divergências encontradas**:

1. **`"Eating out"` não é mapeado** → cai em `OUTROS`, deveria ser `ALIMENTACAO`.
   O regex `/ALIMENT|FOOD|RESTAUR|SUPERMERCADO|GROCERY/` não captura `"EATING OUT"`.

2. **`"Groceries"` funciona acidentalmente** → `GROCERY` é substring de `GROCERIES`, o regex
   captura por coincidência. Mas depende de substring match frágil.

3. **`categoryId` é ignorado** mas oferece mapeamento hierárquico mais estável que texto livre.
   Os primeiros 2 dígitos indicam a categoria pai (ex: `11` = alimentação, `19` = transporte).

4. **Português nos regex é inútil** — a Pluggy retorna categorias em inglês. Padrões como
   `ALIMENT`, `SUPERMERCADO`, `LAZER`, `MORADIA`, `SAUDE` nunca vão ter match.

---

## 3. Relação investimento ↔ conta

**Campo observado no JSON do investimento**: `itemId` presente, `accountId` **ausente**

```json
{
  "id": "deaf84f2-...",
  "itemId": "b543f9a5-...",
  // accountId: não existe neste objeto
  "type": "FIXED_INCOME",
  "subtype": "CDB",
  ...
}
```

**Comportamento encontrado**: Investimentos têm referência ao `itemId` (item/conexão), mas
**não têm referência a nenhuma conta específica** dentro do item. A associação investimento →
conta não existe na API.

**Suposição atual do PluggyAdapter**:
```
// Limitação conhecida: associa todos os investimentos à primeira conta do item
// porque a Pluggy supostamente não retorna accountId por investimento
```

**Status**: ✅ CONFIRMADA

**Observações**: A limitação é real. Com 32 investimentos e 2 contas (corrente + cartão),
não há como determinar automaticamente qual investimento pertence a qual conta. O workaround
de associar à primeira conta é a única opção viável sem lógica adicional de negócio.

---

## 4. Outros campos não mapeados encontrados

| Campo | Tipo | Descrição observada | Relevância |
|-------|------|---------------------|-----------|
| `operationType` | string | `"PIX"`, `"RESGATE_APLIC_FINANCEIRA"`, `null` | Alto — distingue tipo de operação dentro de DEBIT/CREDIT |
| `status` | string | `"POSTED"`, `"PENDING"` | Alto — transações PENDING ainda não foram efetivadas |
| `paymentData` | objeto | dados do pagador/recebedor, método de pagamento | Médio — útil para detalhamento de PIX |
| `creditCardMetadata` | objeto | número do cartão, MCC, data da fatura | Médio — útil para agrupamento por fatura |
| `merchant` | objeto | `{ cnpj, name, businessName }` | Médio — pode enriquecer descrição da transação |
| `subtype` (conta) | string | `"CHECKING_ACCOUNT"`, `"CREDIT_CARD"` | Alto — o adapter precisa diferenciar conta corrente de cartão |
| `subtype` (investimento) | string | `"CDB"`, etc. | Médio — mais granular que `type` |
| `rateType` + `rate` | string + number | `"CDI"`, `100` → CDB 100% CDI | Médio — útil para display de investimentos |
| `status` (investimento) | string | `"TOTAL_WITHDRAWAL"` | Alto — investimento resgatado com `balance: 0` |
| `taxNumber` (conta) | string | CPF do titular | Baixo — já identificado pelo userId |

---

## 5. Divergências que requerem correção no PluggyAdapter

| # | Divergência | Comportamento atual | Correção necessária |
|---|-------------|---------------------|---------------------|
| 1 | Mapeamento de categoria incompleto | `"Eating out"` → `OUTROS` | Adicionar `EATING` ou mapear via `categoryId` hierárquico |
| 2 | Regex em português inútil | Padrões PT nunca têm match | Remover ou substituir por equivalentes em inglês |
| 3 | `categoryId` ignorado | Usa apenas texto livre | Considerar mapeamento primário por `categoryId` (prefixo de 2 dígitos) |
| 4 | `status` da transação ignorado | Não distingue POSTED vs PENDING | Transações PENDING deveriam ser tratadas diferentemente ou filtradas |
| 5 | `subtype` da conta não usado | Não diferencia CHECKING_ACCOUNT de CREDIT_CARD na lógica | Pode ser necessário para lógica específica de cartão |

> **Próximo passo**: Abrir spec separada para corrigir `toCategory` (item 1-3) e avaliar
> tratamento de transações PENDING (item 4). Itens 3 e 5 são melhorias, não bugs críticos.
