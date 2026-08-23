import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { YEAR_MONTH_REGEX } from '../dto/month-query.dto';

@Injectable()
export class ParseMonthPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!YEAR_MONTH_REGEX.test(value)) {
      throw new BadRequestException('yearMonth deve estar no formato YYYY-MM (ex: 2026-08)');
    }
    return value;
  }
}
