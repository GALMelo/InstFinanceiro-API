import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { TransactionDirection } from '@prisma/client';
import { monthRange } from './get-income.use-case';

@Injectable()
export class GetExpensesGroupedUseCase {
  constructor(private readonly prisma: PrismaService) {}

  // Gastos agrupados por categoria: Alimentacao, Transporte, Lazer, Outros...
  async execute(userId: string, month: string) {
    const { start, end } = monthRange(month);

    const grouped = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: {
        direction: TransactionDirection.EXPENSE,
        date: { gte: start, lt: end },
        account: { userId },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return grouped.map((g) => ({
      category: g.category ?? 'OUTROS',
      total: g._sum.amount,
      count: g._count._all,
    }));
  }
}
