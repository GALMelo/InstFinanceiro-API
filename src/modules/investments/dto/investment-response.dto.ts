import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class InvestmentHistoryQueryDto {
  @ApiProperty({ example: 6, description: 'Quantidade de meses a retornar (1–24)', default: 6, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months: number = 6;
}

export class MonthlySnapshotDto {
  @ApiProperty({ example: '2026-02', description: 'Mês no formato YYYY-MM' })
  month: string;

  @ApiProperty({ example: 35000.5, description: 'Total investido no mês (último snapshot do mês)' })
  total: number;
}

export class InvestmentHistoryDto {
  @ApiProperty({ type: [MonthlySnapshotDto] })
  history: MonthlySnapshotDto[];
}

export class InvestmentItemDto {
  @ApiProperty({ example: 'inv-uuid-...' })
  id: string;

  @ApiProperty({ example: 'acc-uuid-...' })
  accountId: string;

  @ApiProperty({
    enum: ['POUPANCA', 'CDB', 'ACOES', 'FII', 'TESOURO_DIRETO', 'OUTROS'],
    example: 'CDB',
  })
  type: string;

  @ApiProperty({ example: 'Nubank' })
  institution: string;

  @ApiProperty({ example: '10500.00', description: 'Valor atual em string (Decimal do banco)' })
  currentValue: string;
}

export class InvestmentPortfolioDto {
  @ApiProperty({ example: 35000.5, description: 'Valor total consolidado' })
  total: number;

  @ApiProperty({
    example: { CDB: 15000, ACOES: 10000.5, FII: 10000 },
    description: 'Total por tipo de investimento',
  })
  byType: Record<string, number>;

  @ApiProperty({ type: [InvestmentItemDto] })
  items: InvestmentItemDto[];
}
