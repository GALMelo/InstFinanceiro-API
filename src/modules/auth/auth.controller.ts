import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ErrorResponseDto, ValidationErrorResponseDto } from '../../shared/dto/error-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cria uma conta e retorna o JWT' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 400, type: ValidationErrorResponseDto, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, type: ErrorResponseDto, description: 'E-mail já cadastrado' })
  async register(@Body() dto: AuthDto) {
    const result = await this.auth.register(dto);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autentica e retorna o JWT' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, type: ValidationErrorResponseDto, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: 'Credenciais inválidas' })
  async login(@Body() dto: AuthDto) {
    const result = await this.auth.login(dto);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}
