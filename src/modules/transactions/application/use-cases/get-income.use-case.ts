import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { TransactionDirection } from '@prisma/client';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

@Injectable()
export class GetIncomeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  // Ganhos individuais com a fonte de cada um (ex: salario, freelas, etc.)
  async execute(userId: string, month: string): Promise<Result<unknown[], DomainError>> {
    try {
      const { start, end } = monthRange(month);

      const rows = await this.prisma.transaction.findMany({
        where: {
          direction: TransactionDirection.INCOME,
          date: { gte: start, lt: end },
          account: { userId },
        },
        orderBy: { date: 'desc' },
        select: { id: true, amount: true, sourceLabel: true, date: true },
      });

      return ok(rows);
    } catch (e) {
      return err(toUnexpected(e));
    }
  }
}

export function monthRange(month: string) {
  // month no formato "2026-08"
  const [year, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  return { start, end };
}
