import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';
import { SyncAccountsUseCase } from './sync-accounts.use-case';
import { SyncTransactionsUseCase } from './sync-transactions.use-case';
import { SyncInvestmentsUseCase } from './sync-investments.use-case';

// Sincroniza transações dos últimos 90 dias ao conectar um banco novo
const INITIAL_SYNC_DAYS = 90;

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly prisma: PrismaService,
    private readonly syncAccounts: SyncAccountsUseCase,
    private readonly syncTransactions: SyncTransactionsUseCase,
    private readonly syncInvestments: SyncInvestmentsUseCase,
  ) {}

  async execute(itemId: string): Promise<void> {
    const connection = await this.prisma.connection.findUnique({
      where: { connectionId: itemId },
    });

    if (!connection) {
      this.logger.warn(`Webhook recebido para item desconhecido: ${itemId}`);
      return;
    }

    // Busca status atualizado direto no provider
    const result = await this.provider.getConnectionStatus(itemId);
    this.logger.log(`Webhook: item ${itemId} → ${result.status}`);

    await this.prisma.connection.update({
      where: { connectionId: itemId },
      data: { status: result.status },
    });

    if (result.status === 'CONNECTED') {
      const since = new Date(Date.now() - INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000);
      await this.syncAccounts.execute(connection.userId, itemId);
      await Promise.all([
        this.syncTransactions.execute(itemId, since),
        this.syncInvestments.execute(itemId),
      ]);
      this.logger.log(`Sync automático concluído para item ${itemId}`);
    }
  }
}
