import { Controller, Get, Query, Req } from '@nestjs/common';
import { GetIncomeUseCase } from '../application/use-cases/get-income.use-case';
import { GetExpensesGroupedUseCase } from '../application/use-cases/get-expenses-grouped.use-case';

@Controller()
export class TransactionsController {
  constructor(
    private readonly getIncome: GetIncomeUseCase,
    private readonly getExpensesGrouped: GetExpensesGroupedUseCase,
  ) {}

  // TODO: substituir userId fixo por dado vindo da autenticacao (JWT)
  @Get('income')
  income(@Query('month') month: string) {
    return this.getIncome.execute('demo-user', month);
  }

  @Get('expenses/grouped')
  expensesGrouped(@Query('month') month: string) {
    return this.getExpensesGrouped.execute('demo-user', month);
  }
}
