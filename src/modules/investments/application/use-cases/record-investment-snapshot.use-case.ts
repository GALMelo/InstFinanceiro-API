import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Result, ok, err } from '../../../../shared/result/result';
import { DomainError, toUnexpected } from '../../../../shared/errors/domain.errors';

@Injectable()
export class RecordInvestmentSnapshotUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<Result<void, DomainError>> {
    try {
      const investments = await this.prisma.investment.findMany({
        where: { account: { userId } },
      });

      const total = investments.reduce((sum, inv) => sum + Number(inv.currentValue), 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.investmentSnapshot.upsert({
        where: { userId_capturedAt: { userId, capturedAt: today } },
        update: { totalValue: total },
        create: { userId, totalValue: total, capturedAt: today },
      });

      return ok(undefined);
    } catch (e) {
      return err(toUnexpected(e));
    }
  }
}
