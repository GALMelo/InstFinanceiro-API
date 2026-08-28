import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ExpenseHistoryQueryDto {
  @ApiProperty({ example: 6, description: 'Quantidade de meses a retornar (1–24)', default: 6, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months: number = 6;
}

export class MonthlyExpenseDto {
  @ApiProperty({ example: '2026-02', description: 'Mês no formato YYYY-MM' })
  month: string;

  @ApiProperty({ example: 3240.75, description: 'Total de despesas no mês' })
  total: number;
}

export class ExpenseHistoryDto {
  @ApiProperty({ type: [MonthlyExpenseDto] })
  history: MonthlyExpenseDto[];
}

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
