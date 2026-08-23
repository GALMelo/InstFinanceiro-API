import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetIncomeUseCase } from '../application/use-cases/get-income.use-case';
import { GetExpensesGroupedUseCase } from '../application/use-cases/get-expenses-grouped.use-case';

@ApiTags('Transações')
@Controller()
export class TransactionsController {
  constructor(
    private readonly getIncome: GetIncomeUseCase,
    private readonly getExpensesGrouped: GetExpensesGroupedUseCase,
  ) {}

  // TODO: substituir userId fixo por dado vindo da autenticacao (JWT)
  @Get('income')
  @ApiOperation({ summary: 'Lista receitas do mês', description: 'Retorna todas as transações de entrada (INCOME) do período informado.' })
  @ApiQuery({ name: 'month', example: '2026-08', description: 'Mês no formato YYYY-MM' })
  income(@Query('month') month: string) {
    return this.getIncome.execute('demo-user', month);
  }

  @Get('expenses/grouped')
  @ApiOperation({ summary: 'Gastos agrupados por categoria', description: 'Retorna o total gasto em cada categoria (ALIMENTACAO, TRANSPORTE, etc.) no mês.' })
  @ApiQuery({ name: 'month', example: '2026-08', description: 'Mês no formato YYYY-MM' })
  expensesGrouped(@Query('month') month: string) {
    return this.getExpensesGrouped.execute('demo-user', month);
  }
}
