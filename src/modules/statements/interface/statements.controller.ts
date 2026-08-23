import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetMonthlyStatementUseCase } from '../application/use-cases/get-monthly-statement.use-case';

@ApiTags('Extrato')
@Controller('statements')
export class StatementsController {
  constructor(private readonly getMonthlyStatement: GetMonthlyStatementUseCase) {}

  @Get(':yearMonth')
  @ApiOperation({ summary: 'Extrato mensal', description: 'Retorna todas as transações do mês com totalIncome, totalExpense e balance.' })
  @ApiParam({ name: 'yearMonth', example: '2026-08', description: 'Mês no formato YYYY-MM' })
  monthly(@Param('yearMonth') yearMonth: string) {
    return this.getMonthlyStatement.execute('demo-user', yearMonth);
  }
}
