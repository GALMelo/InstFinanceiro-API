import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export const YEAR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR_MONTH_MSG = 'month deve estar no formato YYYY-MM (ex: 2026-08)';

export class MonthQueryDto {
  @ApiProperty({ example: '2026-08', description: 'Mês no formato YYYY-MM' })
  @Matches(YEAR_MONTH_REGEX, { message: YEAR_MONTH_MSG })
  month: string;
}
