import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  OPEN_FINANCE_PROVIDER,
  OpenFinanceProvider,
} from '../../domain/ports/open-finance-provider.port';
import { SyncAccountsUseCase } from './sync-accounts.use-case';
import { SyncTransactionsUseCase } from './sync-transactions.use-case';
import { SyncInvestmentsUseCase } from './sync-investments.use-case';
import { DomainError } from '../../../../shared/errors/domain.errors';

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

  async execute(itemId: string, event: string): Promise<void> {
    const connection = await this.prisma.connection.findUnique({
      where: { connectionId: itemId },
    });

    if (!connection) {
      this.logger.warn({ event: 'webhook_unknown_item', itemId });
      return;
    }

    let status: string;
    try {
      const result = await this.provider.getConnectionStatus(itemId);
      status = result.status;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error({ event: 'webhook_status_fetch_failed', itemId, message });
      return;
    }

    this.logger.log({ event: 'webhook_status_updated', itemId, status });

    await this.prisma.connection.update({
      where: { connectionId: itemId },
      data: { status },
    });

    if (status !== 'CONNECTED' || event === 'item/error') return;

    const since = new Date(Date.now() - INITIAL_SYNC_DAYS * 24 * 60 * 60 * 1000);

    const accountsResult = await this.syncAccounts.execute(connection.userId, itemId);
    if (accountsResult.isErr()) {
      const e = accountsResult.error;
      this.logger.error({
        event: 'webhook_sync_accounts_failed',
        itemId,
        code: e instanceof DomainError ? e.code : 'UNKNOWN',
        message: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    const [txResult, invResult] = await Promise.all([
      this.syncTransactions.execute(itemId, since),
      this.syncInvestments.execute(itemId),
    ]);

    if (txResult.isErr()) {
      const e = txResult.error;
      this.logger.error({
        event: 'webhook_sync_transactions_failed',
        itemId,
        code: e instanceof DomainError ? e.code : 'UNKNOWN',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    if (invResult.isErr()) {
      const e = invResult.error;
      this.logger.error({
        event: 'webhook_sync_investments_failed',
        itemId,
        code: e instanceof DomainError ? e.code : 'UNKNOWN',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    if (txResult.isOk() && invResult.isOk()) {
      this.logger.log({
        event: 'webhook_sync_completed',
        itemId,
        transactions: txResult.value,
        investments: invResult.value,
      });
    }
  }
}
