import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { monthRange } from '../../../transactions/application/use-cases/get-income.use-case';

@Injectable()
export class GetMonthlyStatementUseCase {
  constructor(private readonly prisma: PrismaService) {}

  // Extrato do mes: todas as transacoes (ganhos e gastos) em ordem
  // cronologica, tipo um extrato de cartao/timeline.
  async execute(userId: string, month: string) {
    const { start, end } = monthRange(month);

    const transactions = await this.prisma.transaction.findMany({
      where: { date: { gte: start, lt: end }, account: { userId } },
      orderBy: { date: 'asc' },
    });

    const totalIncome = transactions
      .filter((t) => t.direction === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.direction === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      month,
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      timeline: transactions,
    };
  }
}
