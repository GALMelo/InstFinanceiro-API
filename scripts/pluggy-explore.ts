import 'dotenv/config';
import { PluggyClient } from 'pluggy-sdk';

// Preencha aqui ou passe o itemId como argumento: npx ts-node scripts/pluggy-explore.ts <ITEM_ID>
const ITEM_ID = '';

// ---------------------------------------------------------------------------
// Validação de ambiente
// ---------------------------------------------------------------------------

const clientId = process.env.PLUGGY_CLIENT_ID;
const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    '[ERRO] PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET devem estar definidos no .env\n' +
      'Copie .env.example para .env e preencha as credenciais da Pluggy sandbox.',
  );
  process.exit(1);
}

const itemId = process.argv[2] ?? ITEM_ID;

if (!itemId) {
  console.error(
    '[ERRO] itemId não fornecido.\n' +
      'Use: npx ts-node scripts/pluggy-explore.ts <ITEM_ID>\n' +
      'Ou defina a constante ITEM_ID no topo deste arquivo.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Cliente Pluggy
// ---------------------------------------------------------------------------

const client = new PluggyClient({ clientId, clientSecret });

// ---------------------------------------------------------------------------
// Helpers de output
// ---------------------------------------------------------------------------

function printJson(label: string, data: unknown): void {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(data, null, 2));
}

function printFieldSummary(label: string, tx: Record<string, unknown>): void {
  console.log(`  [${label}]`);
  console.log(`    amount:     ${tx['amount']}`);
  console.log(`    type:       ${tx['type']}`);
  console.log(`    category:   ${tx['category'] ?? '(ausente)'}`);
  console.log(`    categoryId: ${tx['categoryId'] ?? '(ausente)'}`);
}

// ---------------------------------------------------------------------------
// Exploração principal
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PLUGGY EXPLORER — itemId: ${itemId}`);
  console.log(`${'='.repeat(60)}`);

  // --- Contas ---------------------------------------------------------------

  let accounts: Record<string, unknown>[] = [];

  try {
    const response = await client.fetchAccounts(itemId);
    // fetchAccounts retorna PageResponse<Account> — .results contém o array
    accounts = (response.results ?? []) as Record<string, unknown>[];
    console.log(`\n=== CONTAS (${accounts.length}) ===`);
    printJson('Todas as contas', accounts);
  } catch (err) {
    console.error('[ERRO] Falha ao buscar contas:', err);
    return;
  }

  // --- Transações por conta -------------------------------------------------

  for (const account of accounts) {
    const accountId = account['id'] as string;
    const accountName = account['name'] ?? accountId;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== TRANSAÇÕES — conta: ${accountName} (${accountId}) ===`);

    try {
      const transactions = await client.fetchAllTransactions(accountId);
      const txList = transactions as Record<string, unknown>[];

      console.log(`Total de transações: ${txList.length}`);

      const sample = txList.slice(0, 3);

      sample.forEach((tx, i) => {
        printJson(`Transação ${i + 1} (JSON completo)`, tx);
      });

      console.log('\n  --- Resumo de campos-chave (primeiras 3 transações) ---');
      sample.forEach((tx, i) => printFieldSummary(`tx${i + 1}`, tx));
    } catch (err) {
      console.error(`[ERRO] Falha ao buscar transações da conta ${accountId}:`, err);
    }
  }

  // --- Investimentos --------------------------------------------------------

  console.log(`\n${'='.repeat(60)}`);
  console.log('=== INVESTIMENTOS ===');

  const clientAny = client as unknown as Record<string, unknown>;

  if (typeof clientAny['fetchInvestments'] !== 'function') {
    console.warn('[investments] método fetchInvestments não disponível nesta versão do SDK');
    return;
  }

  try {
    const fetchInvestments = clientAny['fetchInvestments'] as (
      itemId: string,
    ) => Promise<{ results?: unknown[] } | unknown[]>;

    const response = await fetchInvestments(itemId);
    const investments = Array.isArray(response)
      ? (response as unknown[])
      : ((response as { results?: unknown[] }).results ?? []);

    console.log(`Total de investimentos: ${investments.length}`);

    if (investments.length > 0) {
      printJson('Primeiro investimento (JSON completo)', investments[0]);
    } else {
      console.log('(nenhum investimento retornado para este item)');
    }
  } catch (err) {
    console.error('[ERRO] Falha ao buscar investimentos:', err);
  }
}

main().catch((err) => {
  console.error('[ERRO FATAL]', err);
  process.exit(1);
});
