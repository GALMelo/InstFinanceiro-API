import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

export interface MonthlyExpense {
  month: string; // "YYYY-MM"
  total: number;
}

@Injectable()
export class GetExpenseHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, months: number): Promise<Result<MonthlyExpense[], DomainError>> {
    try {
      const now = new Date();
      const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

      const snapshots = await this.prisma.expenseSnapshot.findMany({
        where: { userId, month: { gte: since } },
        orderBy: { month: 'asc' },
      });

      const byMonth = new Map(
        snapshots.map((s) => [s.month.toISOString().slice(0, 7), Number(s.totalValue)]),
      );

      // Garante todos os meses no range, mesmo os sem snapshot
      const result: MonthlyExpense[] = [];
      const cursor = new Date(since);
      while (cursor <= now) {
        const key = cursor.toISOString().slice(0, 7);
        result.push({ month: key, total: byMonth.get(key) ?? 0 });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }

      return ok(result);
    } catch (e) {
      return err(toUnexpected(e));
    }
  }
}
