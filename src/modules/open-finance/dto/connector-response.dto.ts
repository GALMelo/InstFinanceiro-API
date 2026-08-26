import { ApiProperty } from '@nestjs/swagger';

export class ConnectorResponseDto {
  @ApiProperty({ example: 212 })
  id: number;

  @ApiProperty({ example: 'Nubank' })
  name: string;

  @ApiProperty({ example: 'PERSONAL_BANK' })
  type: string;

  @ApiProperty({ example: 'BR' })
  country: string;
}
