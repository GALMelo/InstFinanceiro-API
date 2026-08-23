import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetInvestmentsUseCase } from '../application/use-cases/get-investments.use-case';

@ApiTags('Investimentos')
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly getInvestments: GetInvestmentsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Carteira de investimentos', description: 'Retorna os investimentos agrupados por tipo (CDB, ACOES, FII, etc.) com valor total.' })
  list() {
    return this.getInvestments.execute('demo-user');
  }
}
