import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cria uma conta e retorna o JWT' })
  async register(@Body() dto: AuthDto) {
    const result = await this.auth.register(dto);
    if (result.isErr()) throw result.error;
    return result.value;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autentica e retorna o JWT' })
  async login(@Body() dto: AuthDto) {
    const result = await this.auth.login(dto);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}
