import { Controller, Get, Param } from '@nestjs/common';
import { GetMonthlyStatementUseCase } from '../application/use-cases/get-monthly-statement.use-case';

@Controller('statements')
export class StatementsController {
  constructor(private readonly getMonthlyStatement: GetMonthlyStatementUseCase) {}

  @Get(':yearMonth')
  monthly(@Param('yearMonth') yearMonth: string) {
    return this.getMonthlyStatement.execute('demo-user', yearMonth);
  }
}
