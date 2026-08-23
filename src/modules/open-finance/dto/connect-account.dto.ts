import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class ConnectAccountDto {
  @ApiProperty({
    description: 'Credenciais do banco (formato depende do provedor)',
    example: { bankId: 'itau', cpf: '000.000.000-00', password: 'senha' },
  })
  @IsObject()
  credentials: Record<string, unknown>;
}
