import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OpenFinanceModule } from './modules/open-finance/open-finance.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { InvestmentsModule } from './modules/investments/investments.module';
import { StatementsModule } from './modules/statements/statements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OpenFinanceModule,
    TransactionsModule,
    InvestmentsModule,
    StatementsModule,
  ],
})
export class AppModule {}
