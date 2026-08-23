import { Module } from '@nestjs/common';
import { StatementsController } from './interface/statements.controller';
import { GetMonthlyStatementUseCase } from './application/use-cases/get-monthly-statement.use-case';

@Module({
  controllers: [StatementsController],
  providers: [GetMonthlyStatementUseCase],
})
export class StatementsModule {}
