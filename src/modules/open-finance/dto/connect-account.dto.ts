import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class ConnectAccountDto {
  @ApiProperty({
    description: 'Credenciais do banco. Obtenha o connectorId em GET /connectors e os campos de parameters no campo credentials[] do conector.',
    example: {
      connectorId: 212,
      parameters: { cpf: '000.000.000-00', password: 'senha' },
    },
  })
  @IsObject()
  credentials: Record<string, unknown>;
}
