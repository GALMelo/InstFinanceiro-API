import { GetExpensesGroupedUseCase } from './get-expenses-grouped.use-case';
import { TransactionDirection } from '@prisma/client';

const GROUPED_ROWS = [
  { category: 'ALIMENTACAO', _sum: { amount: '250.50' }, _count: { _all: 3 } },
  { category: 'TRANSPORTE', _sum: { amount: '120.00' }, _count: { _all: 2 } },
];

const makePrisma = (rows: object[] = GROUPED_ROWS) => ({
  transaction: {
    groupBy: jest.fn().mockResolvedValue(rows),
  },
});

describe('GetExpensesGroupedUseCase', () => {
  it('retorna gastos agrupados por categoria com total e contagem', async () => {
    const prisma = makePrisma();
    const useCase = new GetExpensesGroupedUseCase(prisma as any);

    const result = await useCase.execute('user-1', '2026-08');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([
        { category: 'ALIMENTACAO', total: '250.50', count: 3 },
        { category: 'TRANSPORTE', total: '120.00', count: 2 },
      ]);
    }
  });

  it('filtra apenas EXPENSE do userId e do intervalo correto', async () => {
    const prisma = makePrisma();
    const useCase = new GetExpensesGroupedUseCase(prisma as any);

    await useCase.execute('user-1', '2026-08');

    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['category'],
        where: expect.objectContaining({
          direction: TransactionDirection.EXPENSE,
          account: { userId: 'user-1' },
          date: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lt: new Date('2026-09-01T00:00:00.000Z'),
          },
        }),
      }),
    );
  });

  it('retorna lista vazia quando não há gastos no mês', async () => {
    const prisma = makePrisma([]);
    const useCase = new GetExpensesGroupedUseCase(prisma as any);

    const result = await useCase.execute('user-1', '2026-08');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toEqual([]);
  });

  it('usa "OUTROS" quando a categoria é null', async () => {
    const prisma = makePrisma([
      { category: null, _sum: { amount: '50.00' }, _count: { _all: 1 } },
    ]);
    const useCase = new GetExpensesGroupedUseCase(prisma as any);

    const result = await useCase.execute('user-1', '2026-08');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const rows = result.value as Array<{ category: string }>;
      expect(rows[0].category).toBe('OUTROS');
    }
  });
});
