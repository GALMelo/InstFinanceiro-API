import { Injectable } from '@nestjs/common';
import { TransactionDirection } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

@Injectable()
export class RecordExpenseSnapshotUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<Result<void, DomainError>> {
    try {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

      const agg = await this.prisma.transaction.aggregate({
        where: {
          direction: TransactionDirection.EXPENSE,
          date: { gte: monthStart, lt: monthEnd },
          account: { userId },
        },
        _sum: { amount: true },
      });

      const total = Number(agg._sum.amount ?? 0);

      await this.prisma.expenseSnapshot.upsert({
        where: { userId_month: { userId, month: monthStart } },
        update: { totalValue: total },
        create: { userId, totalValue: total, month: monthStart },
      });

      return ok(undefined);
    } catch (e) {
      return err(toUnexpected(e));
    }
  }
}
