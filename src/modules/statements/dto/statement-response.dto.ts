import { ApiProperty } from '@nestjs/swagger';

export class TransactionTimelineItemDto {
  @ApiProperty({ example: 'tx-uuid-...' })
  id: string;

  @ApiProperty({ example: 'acc-uuid-...' })
  accountId: string;

  @ApiProperty({ example: '250.50', description: 'Valor em string (Decimal do banco)' })
  amount: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'], example: 'EXPENSE' })
  direction: string;

  @ApiProperty({ example: 'iFood' })
  sourceLabel: string;

  @ApiProperty({
    enum: ['ALIMENTACAO', 'TRANSPORTE', 'LAZER', 'MORADIA', 'SAUDE', 'OUTROS'],
    nullable: true,
    example: 'ALIMENTACAO',
  })
  category: string | null;

  @ApiProperty({ example: '2026-08-15T00:00:00.000Z' })
  date: string;
}

export class MonthlyStatementDto {
  @ApiProperty({ example: '2026-08' })
  month: string;

  @ApiProperty({ example: 5200, description: 'Total de receitas do mês' })
  totalIncome: number;

  @ApiProperty({ example: 1850.5, description: 'Total de gastos do mês' })
  totalExpense: number;

  @ApiProperty({ example: 3349.5, description: 'Saldo (totalIncome - totalExpense)' })
  balance: number;

  @ApiProperty({ type: [TransactionTimelineItemDto] })
  timeline: TransactionTimelineItemDto[];
}
