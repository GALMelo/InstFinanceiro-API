import { Module } from '@nestjs/common';
import { TransactionsController } from './interface/transactions.controller';
import { GetIncomeUseCase } from './application/use-cases/get-income.use-case';
import { GetExpensesGroupedUseCase } from './application/use-cases/get-expenses-grouped.use-case';
import { GetExpenseHistoryUseCase } from './application/use-cases/get-expense-history.use-case';
import { RecordExpenseSnapshotUseCase } from './application/use-cases/record-expense-snapshot.use-case';

@Module({
  controllers: [TransactionsController],
  providers: [GetIncomeUseCase, GetExpensesGroupedUseCase, GetExpenseHistoryUseCase, RecordExpenseSnapshotUseCase],
  exports: [RecordExpenseSnapshotUseCase],
})
export class TransactionsModule {}
