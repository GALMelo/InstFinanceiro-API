import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../auth/current-user.decorator';
import { GetInvestmentsUseCase } from '../application/use-cases/get-investments.use-case';
import { GetInvestmentHistoryUseCase } from '../application/use-cases/get-investment-history.use-case';
import { InvestmentHistoryDto, InvestmentHistoryQueryDto, InvestmentPortfolioDto } from '../dto/investment-response.dto';
import { ErrorResponseDto } from '../../../shared/dto/error-response.dto';

@ApiTags('Investimentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(
    private readonly getInvestments: GetInvestmentsUseCase,
    private readonly getInvestmentHistory: GetInvestmentHistoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Carteira de investimentos', description: 'Retorna os investimentos agrupados por tipo (CDB, ACOES, FII, etc.) com valor total.' })
  @ApiResponse({ status: 200, type: InvestmentPortfolioDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.getInvestments.execute(user.userId);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Get('history')
  @ApiOperation({
    summary: 'Histórico mensal de investimentos',
    description: 'Retorna o total investido agregado por mês nos últimos N meses. Os valores são baseados em snapshots diários capturados automaticamente a cada sincronização.',
  })
  @ApiQuery({ name: 'months', required: false, type: Number, example: 6, description: 'Quantidade de meses a retornar (1–24). Padrão: 6.' })
  @ApiResponse({ status: 200, type: InvestmentHistoryDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Token ausente ou inválido' })
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InvestmentHistoryQueryDto,
  ) {
    const result = await this.getInvestmentHistory.execute(user.userId, query.months);
    if (result.isErr()) throw result.error;
    return { history: result.value };
  }
}
