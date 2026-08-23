import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { TransactionDirection } from '@prisma/client';

@Injectable()
export class GetIncomeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  // Ganhos individuais com a fonte de cada um (ex: salario, freelas, etc.)
  async execute(userId: string, month: string) {
    const { start, end } = monthRange(month);

    return this.prisma.transaction.findMany({
      where: {
        direction: TransactionDirection.INCOME,
        date: { gte: start, lt: end },
        account: { userId },
      },
      orderBy: { date: 'desc' },
      select: { id: true, amount: true, sourceLabel: true, date: true },
    });
  }
}

export function monthRange(month: string) {
  // month no formato "2026-08"
  const [year, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  return { start, end };
}
