import { ApiProperty } from '@nestjs/swagger';

export class IncomeItemDto {
  @ApiProperty({ example: 'tx-uuid-...' })
  id: string;

  @ApiProperty({ example: '5200.00', description: 'Valor em string (Decimal do banco)' })
  amount: string;

  @ApiProperty({ example: 'Empresa X - Salario' })
  sourceLabel: string;

  @ApiProperty({ example: '2026-08-05T00:00:00.000Z' })
  date: string;
}

export class ExpenseGroupDto {
  @ApiProperty({
    enum: ['ALIMENTACAO', 'TRANSPORTE', 'LAZER', 'MORADIA', 'SAUDE', 'OUTROS'],
    example: 'ALIMENTACAO',
  })
  category: string;

  @ApiProperty({ example: '250.50', description: 'Total gasto na categoria (Decimal do banco)' })
  total: string | null;

  @ApiProperty({ example: 3, description: 'Número de transações na categoria' })
  count: number;
}
