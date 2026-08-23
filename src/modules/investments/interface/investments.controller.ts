import { Controller, Get } from '@nestjs/common';
import { GetInvestmentsUseCase } from '../application/use-cases/get-investments.use-case';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly getInvestments: GetInvestmentsUseCase) {}

  @Get()
  list() {
    return this.getInvestments.execute('demo-user');
  }
}
