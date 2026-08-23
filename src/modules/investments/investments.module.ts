import { Module } from '@nestjs/common';
import { InvestmentsController } from './interface/investments.controller';
import { GetInvestmentsUseCase } from './application/use-cases/get-investments.use-case';

@Module({
  controllers: [InvestmentsController],
  providers: [GetInvestmentsUseCase],
})
export class InvestmentsModule {}
