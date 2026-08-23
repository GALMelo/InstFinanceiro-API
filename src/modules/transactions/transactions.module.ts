import { Module } from '@nestjs/common';
import { TransactionsController } from './interface/transactions.controller';
import { GetIncomeUseCase } from './application/use-cases/get-income.use-case';
import { GetExpensesGroupedUseCase } from './application/use-cases/get-expenses-grouped.use-case';

@Module({
  controllers: [TransactionsController],
  providers: [GetIncomeUseCase, GetExpensesGroupedUseCase],
})
export class TransactionsModule {}
