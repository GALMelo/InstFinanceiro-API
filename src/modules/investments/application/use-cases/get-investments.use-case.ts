import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

@Injectable()
export class GetInvestmentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  // Investimentos consolidados por tipo: Poupanca, CDB, Acoes, FIIs...
  async execute(userId: string): Promise<Result<unknown, DomainError>> {
    try {
      const investments = await this.prisma.investment.findMany({
        where: { account: { userId } },
      });

      const byType = investments.reduce<Record<string, number>>((acc, inv) => {
        const key = inv.type;
        acc[key] = (acc[key] ?? 0) + Number(inv.currentValue);
        return acc;
      }, {});

      const total = Object.values(byType).reduce((sum, v) => sum + v, 0);

      return ok({ total, byType, items: investments });
    } catch (e) {
      return err(toUnexpected(e));
    }
  }
}
