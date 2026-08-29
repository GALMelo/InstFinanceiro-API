# Quickstart: Pluggy Adapter Data Exploration Spike

## Pré-requisitos

- Node.js e npm instalados (mesmas versões do projeto)
- Credenciais Pluggy sandbox configuradas no `.env` local:
  ```
  PLUGGY_CLIENT_ID=seu_client_id
  PLUGGY_CLIENT_SECRET=seu_client_secret
  ```
- Um `itemId` válido de uma conexão de teste ativa no Pluggy sandbox
- `pluggy-sdk` instalado (ver abaixo)

## Setup

### 1. Verificar se pluggy-sdk já está instalado

```bash
cat package.json | grep pluggy-sdk
```

Se não estiver, instalar:

```bash
npm install pluggy-sdk
```

### 2. Confirmar que ts-node está disponível

```bash
npx ts-node --version
```

Deve retornar `v10.x.x` ou superior.

## Execução

O projeto usa `module: "commonjs"` no `tsconfig.json`. Use as flags abaixo para rodar o script
sem precisar compilar o projeto inteiro:

### Passando itemId como argumento (recomendado)

```bash
npx ts-node --skip-project --compiler-options '{"module":"commonjs","target":"ES2021","esModuleInterop":true,"skipLibCheck":true}' scripts/pluggy-explore.ts <SEU_ITEM_ID>
```

### Usando constante no arquivo

Edite `scripts/pluggy-explore.ts` e preencha a constante `ITEM_ID` no topo do arquivo,
depois execute sem argumento:

```bash
npx ts-node --skip-project --compiler-options '{"module":"commonjs","target":"ES2021","esModuleInterop":true,"skipLibCheck":true}' scripts/pluggy-explore.ts
```

## Saída esperada

O script imprime sequencialmente:

1. **Contas do item** — total e JSON completo de cada conta
2. **Transações por conta** — total, primeiras 3 em JSON completo, e resumo com campos
   `amount`, `type`, `category`, `categoryId`
3. **Investimentos do item** — primeiro investimento em JSON completo, ou aviso se o método
   não estiver disponível na versão do SDK instalada

Exemplo de saída esperada (valores fictícios):

```
=== CONTAS (2) ===
[{ "id": "abc123", "name": "Conta Corrente", "type": "BANK", ... }]

=== TRANSAÇÕES — conta abc123 (47 transações) ===
--- Transação 1 ---
{ "id": "tx1", "amount": -150.00, "type": "DEBIT", "category": "Alimentação", ... }
--- Resumo de campos-chave ---
  amount: -150
  type: DEBIT
  category: Alimentação
  categoryId: undefined

=== INVESTIMENTOS ===
{ "id": "inv1", "type": "FIXED_INCOME", "amount": 5000.00, ... }
```

## Validação de sucesso

O script foi executado com sucesso quando:

- [ ] Nenhuma exceção não tratada foi lançada
- [ ] Output de contas aparece no console com pelo menos uma conta
- [ ] Output de transações aparece para ao menos uma conta
- [ ] Seção de investimentos aparece (com dados ou com aviso de indisponibilidade)
- [ ] Nenhuma query INSERT/UPDATE/DELETE foi disparada (verificável nos logs do PostgreSQL
  ou simplesmente pela ausência de qualquer import de Prisma no script)

## Próximo passo após a execução

Criar `specs/002-pluggy-adapter-spike/findings.md` preenchendo o template definido em
`plan.md` com base nos dados reais observados no output do script.
