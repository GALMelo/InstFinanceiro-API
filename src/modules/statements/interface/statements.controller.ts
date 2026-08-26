import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../auth/current-user.decorator';
import { ParseMonthPipe } from '../../../shared/pipes/parse-month.pipe';
import { GetMonthlyStatementUseCase } from '../application/use-cases/get-monthly-statement.use-case';
import { MonthlyStatementDto } from '../dto/statement-response.dto';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';

@ApiTags('Extrato')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statements')
export class StatementsController {
  constructor(private readonly getMonthlyStatement: GetMonthlyStatementUseCase) {}

  @Get(':yearMonth')
  @ApiOperation({ summary: 'Extrato mensal', description: 'Retorna todas as transações do mês com totalIncome, totalExpense e balance.' })
  @ApiParam({ name: 'yearMonth', example: '2026-08', description: 'Mês no formato YYYY-MM' })
  @ApiResponse({ status: 200, type: MonthlyStatementDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto, description: 'yearMonth inválido (deve ser YYYY-MM)' })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  async monthly(
    @CurrentUser() user: AuthenticatedUser,
    @Param('yearMonth', ParseMonthPipe) yearMonth: string,
  ) {
    const result = await this.getMonthlyStatement.execute(user.userId, yearMonth);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}
