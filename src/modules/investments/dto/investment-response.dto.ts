import { ApiProperty } from '@nestjs/swagger';

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
