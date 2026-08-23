import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CryptoModule } from '../../shared/crypto/crypto.module';
import { OPEN_FINANCE_PROVIDER } from './domain/ports/open-finance-provider.port';
import { MockOpenFinanceAdapter } from './infrastructure/adapters/mock/mock-open-finance.adapter';
import { PluggyAdapter } from './infrastructure/adapters/pluggy/pluggy.adapter';
import { ConnectAccountUseCase } from './application/use-cases/connect-account.use-case';
import { SyncAccountsUseCase } from './application/use-cases/sync-accounts.use-case';
import { SyncInvestmentsUseCase } from './application/use-cases/sync-investments.use-case';
import { SyncTransactionsUseCase } from './application/use-cases/sync-transactions.use-case';
import { OpenFinanceController } from './interface/open-finance.controller';

@Module({
  imports: [ConfigModule, CryptoModule],
  controllers: [OpenFinanceController],
  providers: [ConnectAccountUseCase, SyncInvestmentsUseCase,
    MockOpenFinanceAdapter,
    PluggyAdapter,
    {
      // Aqui e onde a Inversao de Dependencia vira decisao de runtime:
      // o token OPEN_FINANCE_PROVIDER e resolvido para uma classe concreta
      // com base numa variavel de ambiente. Nenhum outro arquivo do projeto
      // sabe (ou deveria saber) que essa escolha existe.
      provide: OPEN_FINANCE_PROVIDER,
      useFactory: (config: ConfigService, mock: MockOpenFinanceAdapter, pluggy: PluggyAdapter) => {
        const provider = config.get<string>('OPEN_FINANCE_PROVIDER', 'mock');
        return provider === 'pluggy' ? pluggy : mock;
      },
      inject: [ConfigService, MockOpenFinanceAdapter, PluggyAdapter],
    },
    SyncAccountsUseCase,
    SyncTransactionsUseCase,
  ],
  exports: [OPEN_FINANCE_PROVIDER, SyncAccountsUseCase, SyncTransactionsUseCase],
})
export class OpenFinanceModule {}
