import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { InvestmentsModule } from '../investments/investments.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { OPEN_FINANCE_PROVIDER } from './domain/ports/open-finance-provider.port';
import { MockOpenFinanceAdapter } from './infrastructure/adapters/mock/mock-open-finance.adapter';
import { PluggyAdapter } from './infrastructure/adapters/pluggy/pluggy.adapter';
import { ConnectAccountUseCase } from './application/use-cases/connect-account.use-case';
import { GetConnectionStatusUseCase } from './application/use-cases/get-connection-status.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { ListConnectionsUseCase } from './application/use-cases/list-connections.use-case';
import { SyncAccountsUseCase } from './application/use-cases/sync-accounts.use-case';
import { SyncInvestmentsUseCase } from './application/use-cases/sync-investments.use-case';
import { SyncTransactionsUseCase } from './application/use-cases/sync-transactions.use-case';
import { OpenFinanceController } from './interface/open-finance.controller';
import { OpenFinanceWebhookController } from './interface/open-finance-webhook.controller';

@Module({
  imports: [ConfigModule, CryptoModule, InvestmentsModule, TransactionsModule],
  controllers: [OpenFinanceController, OpenFinanceWebhookController],
  providers: [
    ConnectAccountUseCase,
    ListConnectionsUseCase,
    GetConnectionStatusUseCase,
    HandleWebhookUseCase,
    SyncAccountsUseCase,
    SyncInvestmentsUseCase,
    SyncTransactionsUseCase,
    MockOpenFinanceAdapter,
    PluggyAdapter,
    {
      // DI runtime: OPEN_FINANCE_PROVIDER resolvido pela variavel de ambiente.
      // Nenhum outro arquivo do projeto conhece essa decisao.
      provide: OPEN_FINANCE_PROVIDER,
      useFactory: (config: ConfigService, mock: MockOpenFinanceAdapter, pluggy: PluggyAdapter) => {
        const provider = config.get<string>('OPEN_FINANCE_PROVIDER', 'mock');
        return provider === 'pluggy' ? pluggy : mock;
      },
      inject: [ConfigService, MockOpenFinanceAdapter, PluggyAdapter],
    },
  ],
  exports: [OPEN_FINANCE_PROVIDER, SyncAccountsUseCase, SyncTransactionsUseCase],
})
export class OpenFinanceModule {}
