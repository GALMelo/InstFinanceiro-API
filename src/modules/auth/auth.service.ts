import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import { Result, ok, err } from '../../shared/result/result';
import {
  DomainError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  toUnexpected,
} from '../../shared/errors/domain.errors';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: AuthDto): Promise<Result<{ accessToken: string }, DomainError>> {
    try {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) return err(new EmailAlreadyExistsError('E-mail já cadastrado'));

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const user = await this.prisma.user.create({
        data: { email: dto.email, passwordHash },
      });

      return ok(this.sign(user.id, user.email));
    } catch (e) {
      return err(toUnexpected(e));
    }
  }

  async login(dto: AuthDto): Promise<Result<{ accessToken: string }, DomainError>> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (!user) return err(new InvalidCredentialsError('Credenciais inválidas'));

      const valid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!valid) return err(new InvalidCredentialsError('Credenciais inválidas'));

      return ok(this.sign(user.id, user.email));
    } catch (e) {
      return err(toUnexpected(e));
    }
  }

  private sign(userId: string, email: string) {
    const token = this.jwt.sign({ sub: userId, email });
    return { accessToken: token };
  }
}
