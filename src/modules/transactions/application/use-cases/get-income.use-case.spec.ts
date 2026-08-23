import { GetIncomeUseCase } from './get-income.use-case';
import { TransactionDirection } from '@prisma/client';

const INCOME_ROW = {
  id: 'tx-1',
  amount: '5200',
  sourceLabel: 'Empresa X - Salario',
  date: new Date('2026-08-05'),
};

const makePrisma = (rows: object[] = [INCOME_ROW]) => ({
  transaction: {
    findMany: jest.fn().mockResolvedValue(rows),
  },
});

describe('GetIncomeUseCase', () => {
  it('retorna as transações de INCOME do mês filtradas pelo userId', async () => {
    const prisma = makePrisma();
    const useCase = new GetIncomeUseCase(prisma as any);

    const result = await useCase.execute('user-1', '2026-08');

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          direction: TransactionDirection.INCOME,
          account: { userId: 'user-1' },
          date: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lt: new Date('2026-09-01T00:00:00.000Z'),
          },
        }),
      }),
    );
    expect(result).toEqual([INCOME_ROW]);
  });

  it('retorna lista vazia quando não há receitas no mês', async () => {
    const prisma = makePrisma([]);
    const useCase = new GetIncomeUseCase(prisma as any);

    const result = await useCase.execute('user-1', '2026-08');

    expect(result).toEqual([]);
  });

  it('passa o intervalo correto para um mês de virada de ano', async () => {
    const prisma = makePrisma([]);
    const useCase = new GetIncomeUseCase(prisma as any);

    await useCase.execute('user-1', '2026-12');

    const { date } = prisma.transaction.findMany.mock.calls[0][0].where;
    expect(date.gte).toEqual(new Date('2026-12-01T00:00:00.000Z'));
    expect(date.lt).toEqual(new Date('2027-01-01T00:00:00.000Z'));
  });
});
