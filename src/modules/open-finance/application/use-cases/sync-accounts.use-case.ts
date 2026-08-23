import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';

@Injectable()
export class SyncAccountsUseCase {
  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string, connectionId: string): Promise<void> {
    const accounts = await this.provider.fetchAccounts(connectionId);

    for (const account of accounts) {
      await this.prisma.account.upsert({
        where: { id: account.externalId },
        update: { institution: account.institution, name: account.name },
        create: {
          id: account.externalId,
          userId,
          connectionId,
          institution: account.institution,
          name: account.name,
        },
      });
    }
  }
}
