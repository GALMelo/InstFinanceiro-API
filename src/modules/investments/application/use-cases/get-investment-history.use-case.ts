import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

export interface MonthlySnapshot {
  month: string;   // "YYYY-MM"
  total: number;
}

@Injectable()
export class GetInvestmentHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, months: number): Promise<Result<MonthlySnapshot[], DomainError>> {
    try {
      const since = new Date();
      since.setDate(1);
      since.setHours(0, 0, 0, 0);
      since.setMonth(since.getMonth() - (months - 1));

      const snapshots = await this.prisma.investmentSnapshot.findMany({
        where: { userId, capturedAt: { gte: since } },
        orderBy: { capturedAt: 'asc' },
      });

      // Group by YYYY-MM, keep the latest snapshot per month
      const byMonth = new Map<string, number>();
      for (const snap of snapshots) {
        const key = snap.capturedAt.toISOString().slice(0, 7);
        byMonth.set(key, Number(snap.totalValue));
      }

      // Build the full month range with zeros for months without snapshots
      const result: MonthlySnapshot[] = [];
      const cursor = new Date(since);
      const now = new Date();
      while (cursor <= now) {
        const key = cursor.toISOString().slice(0, 7);
        result.push({ month: key, total: byMonth.get(key) ?? 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      return ok(result);
    } catch (e) {
      return err(toUnexpected(e));
    }
  }
}
