import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';
import { InvestmentType as PrismaInvestmentType } from '@prisma/client';
import { InvestmentType as DomainInvestmentType } from '../../domain/entities/investment.entity';

@Injectable()
export class SyncInvestmentsUseCase {
  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly prisma: PrismaService,
  ) {}

  async execute(connectionId: string): Promise<number> {
    const investments = await this.provider.fetchInvestments(connectionId);

    for (const inv of investments) {
      await this.prisma.investment.upsert({
        where: { id: inv.externalId },
        update: { currentValue: inv.currentValue, institution: inv.institution },
        create: {
          id: inv.externalId,
          accountId: inv.accountExternalId,
          type: PrismaInvestmentType[inv.type as keyof typeof DomainInvestmentType],
          institution: inv.institution,
          currentValue: inv.currentValue,
        },
      });
    }

    return investments.length;
  }
}
