import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../../auth/current-user.decorator';
import { GetInvestmentsUseCase } from '../application/use-cases/get-investments.use-case';

@ApiTags('Investimentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly getInvestments: GetInvestmentsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Carteira de investimentos', description: 'Retorna os investimentos agrupados por tipo (CDB, ACOES, FII, etc.) com valor total.' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.getInvestments.execute(user.userId);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}
