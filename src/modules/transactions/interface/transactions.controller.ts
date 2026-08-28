import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../auth/current-user.decorator';
import { MonthQueryDto } from '../../../shared/dto/month-query.dto';
import { GetIncomeUseCase } from '../application/use-cases/get-income.use-case';
import { GetExpensesGroupedUseCase } from '../application/use-cases/get-expenses-grouped.use-case';
import { GetExpenseHistoryUseCase } from '../application/use-cases/get-expense-history.use-case';
import { ExpenseGroupDto, ExpenseHistoryDto, ExpenseHistoryQueryDto, IncomeItemDto } from '../dto/transaction-response.dto';
import { ErrorResponseDto, ValidationErrorResponseDto } from '../../../shared/dto/error-response.dto';

@ApiTags('Transações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TransactionsController {
  constructor(
    private readonly getIncome: GetIncomeUseCase,
    private readonly getExpensesGrouped: GetExpensesGroupedUseCase,
    private readonly getExpenseHistory: GetExpenseHistoryUseCase,
  ) {}

  @Get('income')
  @ApiOperation({ summary: 'Lista receitas do mês', description: 'Retorna todas as transações de entrada (INCOME) do período informado.' })
  @ApiResponse({ status: 200, type: [IncomeItemDto] })
  @ApiResponse({ status: 400, type: ValidationErrorResponseDto, description: 'month inválido (deve ser YYYY-MM)' })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  async income(@CurrentUser() user: AuthenticatedUser, @Query() { month }: MonthQueryDto) {
    const result = await this.getIncome.execute(user.userId, month);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Get('expenses/grouped')
  @ApiOperation({ summary: 'Gastos agrupados por categoria', description: 'Retorna o total gasto em cada categoria (ALIMENTACAO, TRANSPORTE, etc.) no mês.' })
  @ApiResponse({ status: 200, type: [ExpenseGroupDto] })
  @ApiResponse({ status: 400, type: ValidationErrorResponseDto, description: 'month inválido (deve ser YYYY-MM)' })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  async expensesGrouped(@CurrentUser() user: AuthenticatedUser, @Query() { month }: MonthQueryDto) {
    const result = await this.getExpensesGrouped.execute(user.userId, month);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Get('expenses/history')
  @ApiOperation({
    summary: 'Histórico mensal de despesas',
    description: 'Retorna o total de despesas por mês nos últimos N meses. Os valores são baseados em snapshots recalculados a cada sincronização.',
  })
  @ApiQuery({ name: 'months', required: false, type: Number, example: 6, description: 'Quantidade de meses a retornar (1–24). Padrão: 6.' })
  @ApiResponse({ status: 200, type: ExpenseHistoryDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  async expensesHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExpenseHistoryQueryDto,
  ) {
    const result = await this.getExpenseHistory.execute(user.userId, query.months);
    if (result.isErr()) throw result.error;
    return { history: result.value };
  }
}
