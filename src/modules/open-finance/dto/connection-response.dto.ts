import { ApiProperty } from '@nestjs/swagger';

export class ConnectionStatusDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-...' })
  connectionId: string;

  @ApiProperty({ enum: ['CONNECTED', 'PENDING', 'FAILED'], example: 'CONNECTED' })
  status: 'CONNECTED' | 'PENDING' | 'FAILED';
}

export class ConnectionListItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-...' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-...' })
  connectionId: string;

  @ApiProperty({ enum: ['CONNECTED', 'PENDING', 'FAILED'], example: 'CONNECTED' })
  status: string;

  @ApiProperty({ example: '2026-08-25T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-08-25T12:00:00.000Z' })
  updatedAt: string;
}

export class SyncResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-...' })
  connectionId: string;

  @ApiProperty({ example: '2026-08-25T12:00:00.000Z' })
  syncedAt: string;

  @ApiProperty({ example: 42, description: 'Número de transações sincronizadas' })
  transactions: number;

  @ApiProperty({ example: 5, description: 'Número de investimentos sincronizados' })
  investments: number;
}
