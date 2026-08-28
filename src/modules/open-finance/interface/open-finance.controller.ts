import { Body, Controller, Get, Param, Post, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../auth/current-user.decorator';
import { ConnectAccountDto } from '../dto/connect-account.dto';
import { ConnectorResponseDto } from '../dto/connector-response.dto';
import { ConnectionListItemDto, ConnectionStatusDto, SyncResponseDto } from '../dto/connection-response.dto';
import { ConnectAccountUseCase } from '../application/use-cases/connect-account.use-case';
import { GetConnectionStatusUseCase } from '../application/use-cases/get-connection-status.use-case';
import { ListConnectionsUseCase } from '../application/use-cases/list-connections.use-case';
import { SyncAccountsUseCase } from '../application/use-cases/sync-accounts.use-case';
import { SyncInvestmentsUseCase } from '../application/use-cases/sync-investments.use-case';
import { SyncTransactionsUseCase } from '../application/use-cases/sync-transactions.use-case';
import { RecordInvestmentSnapshotUseCase } from '../../investments/application/use-cases/record-investment-snapshot.use-case';
import { RecordExpenseSnapshotUseCase } from '../../transactions/application/use-cases/record-expense-snapshot.use-case';
import { OPEN_FINANCE_PROVIDER, OpenFinanceProvider } from '../domain/ports/open-finance-provider.port';
import { DomainError, toUnexpected } from '../../../shared/errors/domain.errors';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';

@ApiTags('Open Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OpenFinanceController {
  constructor(
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
    private readonly connectAccount: ConnectAccountUseCase,
    private readonly listConnections: ListConnectionsUseCase,
    private readonly getConnectionStatus: GetConnectionStatusUseCase,
    private readonly syncAccounts: SyncAccountsUseCase,
    private readonly syncInvestments: SyncInvestmentsUseCase,
    private readonly syncTransactions: SyncTransactionsUseCase,
    private readonly recordSnapshot: RecordInvestmentSnapshotUseCase,
    private readonly recordExpenseSnapshot: RecordExpenseSnapshotUseCase,
  ) {}

  // ── Conectores ─────────────────────────────────────────────────────────────

  @Get('connectors')
  @ApiOperation({
    summary: 'Lista conectores disponíveis',
    description: 'Busca as instituições financeiras suportadas pelo provider. Use o `id` retornado como `connectorId` em POST /connections.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Filtro por nome da instituição', example: 'Nubank' })
  @ApiResponse({ status: 200, type: [ConnectorResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  @ApiResponse({ status: 502, type: ErrorResponseDto, description: 'Falha ao comunicar com o provider bancário' })
  async listConnectors(@Query('search') search?: string) {
    try {
      return await this.provider.listConnectors(search);
    } catch (e) {
      if (e instanceof DomainError) throw e;
      throw toUnexpected(e);
    }
  }

  // ── Conexões ───────────────────────────────────────────────────────────────

  @Get('connections')
  @ApiOperation({ summary: 'Lista suas conexões bancárias' })
  @ApiResponse({ status: 200, type: [ConnectionListItemDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.listConnections.execute(user.userId);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Post('connections')
  @ApiOperation({
    summary: 'Conecta uma conta bancária',
    description: `Inicia a conexão com um banco via Open Finance.

**Com mock:** passe qualquer objeto em \`credentials\`.

**Com Pluggy (sandbox):**
\`\`\`json
{
  "credentials": {
    "connectorId": 2,
    "parameters": { "user": "user-ok", "password": "password-ok" }
  }
}
\`\`\`

**Com banco real:** obtenha o \`connectorId\` em \`GET /connectors\` e use suas credenciais bancárias.
Se o banco exigir MFA, o status retornado será \`PENDING\` — aguarde o webhook ou use \`GET /connections/:id/status\` para verificar quando virar \`CONNECTED\`.

As credenciais são criptografadas com AES-256-GCM antes de serem salvas.`,
  })
  @ApiResponse({ status: 201, type: ConnectionStatusDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  @ApiResponse({ status: 502, type: ErrorResponseDto, description: 'Falha ao comunicar com o provider bancário' })
  async connect(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConnectAccountDto) {
    const result = await this.connectAccount.execute(user.userId, dto.credentials);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Get('connections/:connectionId/status')
  @ApiOperation({
    summary: 'Verifica status atual da conexão',
    description: 'Consulta o provider em tempo real e atualiza o status no banco. Use para verificar se uma conexão PENDING já foi aprovada pelo banco.',
  })
  @ApiParam({ name: 'connectionId', description: 'ID da conexão retornado em POST /connections' })
  @ApiResponse({ status: 200, type: ConnectionStatusDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: 'Conexão não encontrada' })
  @ApiResponse({ status: 502, type: ErrorResponseDto, description: 'Falha ao comunicar com o provider bancário' })
  async status(@CurrentUser() user: AuthenticatedUser, @Param('connectionId') connectionId: string) {
    const result = await this.getConnectionStatus.execute(user.userId, connectionId);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Post('connections/:connectionId/sync')
  @ApiOperation({
    summary: 'Sincroniza contas, transações e investimentos',
    description: 'Busca dados do provider e persiste no banco. Idempotente — pode ser chamado mais de uma vez sem duplicar dados.',
  })
  @ApiParam({ name: 'connectionId', description: 'ID da conexão retornado em POST /connections' })
  @ApiQuery({ name: 'since', required: false, example: '2026-01-01', description: 'Data de corte para transações (ISO 8601). Padrão: 30 dias atrás.' })
  @ApiResponse({ status: 201, type: SyncResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  @ApiResponse({ status: 500, type: ErrorResponseDto, description: 'Falha ao sincronizar dados' })
  @ApiResponse({ status: 502, type: ErrorResponseDto, description: 'Falha ao comunicar com o provider bancário' })
  async sync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('connectionId') connectionId: string,
    @Query('since') since?: string,
  ) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const accountsResult = await this.syncAccounts.execute(user.userId, connectionId);
    if (accountsResult.isErr()) throw accountsResult.error;

    const [txResult, invResult] = await Promise.all([
      this.syncTransactions.execute(connectionId, sinceDate),
      this.syncInvestments.execute(connectionId),
    ]);

    if (txResult.isErr()) throw txResult.error;
    if (invResult.isErr()) throw invResult.error;

    await Promise.all([
      this.recordSnapshot.execute(user.userId),
      this.recordExpenseSnapshot.execute(user.userId),
    ]);

    return {
      connectionId,
      syncedAt: new Date().toISOString(),
      transactions: txResult.value,
      investments: invResult.value,
    };
  }
}
