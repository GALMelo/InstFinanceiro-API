import { Body, Controller, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../auth/current-user.decorator';
import { ConnectAccountDto } from '../dto/connect-account.dto';
import { ConnectAccountUseCase } from '../application/use-cases/connect-account.use-case';
import { SyncAccountsUseCase } from '../application/use-cases/sync-accounts.use-case';
import { SyncInvestmentsUseCase } from '../application/use-cases/sync-investments.use-case';
import { SyncTransactionsUseCase } from '../application/use-cases/sync-transactions.use-case';

@ApiTags('Open Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connections')
export class OpenFinanceController {
  constructor(
    private readonly connectAccount: ConnectAccountUseCase,
    private readonly syncAccounts: SyncAccountsUseCase,
    private readonly syncInvestments: SyncInvestmentsUseCase,
    private readonly syncTransactions: SyncTransactionsUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Conecta uma conta bancária',
    description: 'Chama o provedor Open Finance, obtém o connectionId e persiste as credenciais criptografadas (AES-256-GCM) em repouso.',
  })
  connect(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConnectAccountDto) {
    return this.connectAccount.execute(user.userId, dto.credentials);
  }

  @Post(':connectionId/sync')
  @ApiOperation({
    summary: 'Sincroniza contas e transações',
    description: 'Busca contas e transações do provedor Open Finance e persiste no banco. Contas são sincronizadas primeiro, depois as transações.',
  })
  @ApiParam({ name: 'connectionId', example: 'mock-conn-demo-user' })
  @ApiQuery({ name: 'since', required: false, example: '2026-01-01', description: 'Data de corte para transações (ISO 8601). Padrão: 30 dias atrás.' })
  async sync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('connectionId') connectionId: string,
    @Query('since') since?: string,
  ) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await this.syncAccounts.execute(user.userId, connectionId);
    const [transactions, investments] = await Promise.all([
      this.syncTransactions.execute(connectionId, sinceDate),
      this.syncInvestments.execute(connectionId),
    ]);

    return {
      connectionId,
      syncedAt: new Date().toISOString(),
      transactions,
      investments,
    };
  }
}
