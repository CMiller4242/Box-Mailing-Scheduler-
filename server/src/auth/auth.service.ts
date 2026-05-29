import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const name = `${dto.firstName} ${dto.lastName}`;

    const user = await this.prisma.user.create({
      data: { firstName: dto.firstName, lastName: dto.lastName, name, email: dto.email, passwordHash },
    });

    return { token: this.issueToken(user, false), user: this.safeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    return { token: this.issueToken(user, dto.rememberMe ?? false), user: this.safeUser(user) };
  }

  private issueToken(user: { id: string; email: string; role: string }, rememberMe: boolean) {
    const expiresIn = rememberMe ? '7d' : (process.env.JWT_EXPIRES_IN ?? '8h');
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn });
  }

  private safeUser(user: {
    id: string; name: string; firstName: string; lastName: string;
    email: string; role: string; managerId?: string | null;
  }) {
    const { id, name, firstName, lastName, email, role, managerId } = user;
    return { id, name, firstName, lastName, email, role, managerId: managerId ?? null };
  }
}
