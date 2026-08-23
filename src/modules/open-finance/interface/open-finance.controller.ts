import { Controller, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SyncAccountsUseCase } from '../application/use-cases/sync-accounts.use-case';
import { SyncTransactionsUseCase } from '../application/use-cases/sync-transactions.use-case';

@ApiTags('Open Finance')
@Controller('connections')
export class OpenFinanceController {
  constructor(
    private readonly syncAccounts: SyncAccountsUseCase,
    private readonly syncTransactions: SyncTransactionsUseCase,
  ) {}

  @Post(':connectionId/sync')
  @ApiOperation({
    summary: 'Sincroniza contas e transações',
    description: 'Busca contas e transações do provedor Open Finance e persiste no banco. Contas são sincronizadas primeiro, depois as transações.',
  })
  @ApiParam({ name: 'connectionId', example: 'mock-conn-demo-user' })
  @ApiQuery({ name: 'since', required: false, example: '2026-01-01', description: 'Data de corte para transações (ISO 8601). Padrão: 30 dias atrás.' })
  async sync(
    @Param('connectionId') connectionId: string,
    @Query('since') since?: string,
  ) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await this.syncAccounts.execute('demo-user', connectionId);
    const transactionCount = await this.syncTransactions.execute(connectionId, sinceDate);

    return {
      connectionId,
      syncedAt: new Date().toISOString(),
      transactions: transactionCount,
    };
  }
}
