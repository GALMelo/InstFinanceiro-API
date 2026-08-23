import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../auth/current-user.decorator';
import { MonthQueryDto } from '../../../shared/dto/month-query.dto';
import { GetIncomeUseCase } from '../application/use-cases/get-income.use-case';
import { GetExpensesGroupedUseCase } from '../application/use-cases/get-expenses-grouped.use-case';

@ApiTags('Transações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TransactionsController {
  constructor(
    private readonly getIncome: GetIncomeUseCase,
    private readonly getExpensesGrouped: GetExpensesGroupedUseCase,
  ) {}

  @Get('income')
  @ApiOperation({ summary: 'Lista receitas do mês', description: 'Retorna todas as transações de entrada (INCOME) do período informado.' })
  income(@CurrentUser() user: AuthenticatedUser, @Query() { month }: MonthQueryDto) {
    return this.getIncome.execute(user.userId, month);
  }

  @Get('expenses/grouped')
  @ApiOperation({ summary: 'Gastos agrupados por categoria', description: 'Retorna o total gasto em cada categoria (ALIMENTACAO, TRANSPORTE, etc.) no mês.' })
  expensesGrouped(@CurrentUser() user: AuthenticatedUser, @Query() { month }: MonthQueryDto) {
    return this.getExpensesGrouped.execute(user.userId, month);
  }
}
