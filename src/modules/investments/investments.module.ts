import { Module } from '@nestjs/common';
import { InvestmentsController } from './interface/investments.controller';
import { GetInvestmentsUseCase } from './application/use-cases/get-investments.use-case';
import { GetInvestmentHistoryUseCase } from './application/use-cases/get-investment-history.use-case';
import { RecordInvestmentSnapshotUseCase } from './application/use-cases/record-investment-snapshot.use-case';

@Module({
  controllers: [InvestmentsController],
  providers: [GetInvestmentsUseCase, GetInvestmentHistoryUseCase, RecordInvestmentSnapshotUseCase],
  exports: [RecordInvestmentSnapshotUseCase],
})
export class InvestmentsModule {}
