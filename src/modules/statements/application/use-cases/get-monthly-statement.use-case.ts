import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { monthRange } from '../../../transactions/application/use-cases/get-income.use-case';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

@Injectable()
export class GetMonthlyStatementUseCase {
  constructor(private readonly prisma: PrismaService) {}

  // Extrato do mes: todas as transacoes (ganhos e gastos) em ordem
  // cronologica, tipo um extrato de cartao/timeline.
  async execute(userId: string, month: string): Promise<Result<unknown, DomainError>> {
    try {
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

      return ok({
        month,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        timeline: transactions,
      });
    } catch (e) {
      return err(toUnexpected(e));
    }
  }
}
