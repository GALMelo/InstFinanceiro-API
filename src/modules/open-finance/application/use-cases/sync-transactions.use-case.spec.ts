import { SyncTransactionsUseCase } from './sync-transactions.use-case';
import { MockOpenFinanceAdapter } from '../../infrastructure/adapters/mock/mock-open-finance.adapter';

const makePrisma = () => ({
  transaction: {
    upsert: jest.fn().mockResolvedValue({}),
  },
});

describe('SyncTransactionsUseCase', () => {
  let useCase: SyncTransactionsUseCase;
  let provider: MockOpenFinanceAdapter;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    provider = new MockOpenFinanceAdapter();
    prisma = makePrisma();
    useCase = new SyncTransactionsUseCase(provider as any, prisma as any);
  });

  it('persiste todas as transações retornadas pelo provider e devolve a contagem', async () => {
    const result = await useCase.execute('conn-1', new Date('2026-01-01'));

    expect(result.isOk()).toBe(true);
    // O mock retorna 3 transações fixas
    if (result.isOk()) expect(result.value).toBe(3);
    expect(prisma.transaction.upsert).toHaveBeenCalledTimes(3);
  });

  it('chama upsert com os campos corretos para uma transação de INCOME', async () => {
    await useCase.execute('conn-1', new Date('2026-01-01'));

    const firstCall = prisma.transaction.upsert.mock.calls[0][0];
    expect(firstCall.where.id).toBe('conn-1-tx-1');
    expect(firstCall.create.direction).toBe('INCOME');
    expect(firstCall.create.amount).toBe(5200);
    expect(firstCall.create.sourceLabel).toBe('Empresa X - Salario');
  });

  it('chama upsert com categoria mapeada para transações de EXPENSE', async () => {
    await useCase.execute('conn-1', new Date('2026-01-01'));

    const alimentacao = prisma.transaction.upsert.mock.calls[1][0];
    expect(alimentacao.create.direction).toBe('EXPENSE');
    expect(alimentacao.create.category).toBe('ALIMENTACAO');

    const transporte = prisma.transaction.upsert.mock.calls[2][0];
    expect(transporte.create.category).toBe('TRANSPORTE');
  });

  it('retorna 0 e não chama upsert quando o provider não retorna transações', async () => {
    jest.spyOn(provider, 'fetchTransactions').mockResolvedValue([]);

    const result = await useCase.execute('conn-vazia', new Date('2026-01-01'));

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toBe(0);
    expect(prisma.transaction.upsert).not.toHaveBeenCalled();
  });
});
