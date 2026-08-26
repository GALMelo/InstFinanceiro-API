import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'CONNECTION_NOT_FOUND' })
  code: string;

  @ApiProperty({ example: 'Conexão não encontrada' })
  message: string;
}

export class ValidationErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: ['email must be an email', 'password is too short'], type: [String] })
  message: string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
