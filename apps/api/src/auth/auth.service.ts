import {
  Injectable, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID, createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../common/redis/redis.service';
import { JwtPayload } from './jwt.strategy';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
  ) {}

  private flatten(user: User): JwtPayload {
    const roles = (user.roles ?? []).map((r) => r.name);
    const permissions = Array.from(
      new Set((user.roles ?? []).flatMap((r) => (r.permissions ?? []).map((p) => p.key))),
    );
    return { sub: user.id, email: user.email, username: user.username, roles, permissions };
  }

  private async signTokens(payload: JwtPayload, family: string): Promise<Tokens> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.config.get('JWT_ACCESS_TTL', 900)),
    });
    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { ...payload, family, jti },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: Number(this.config.get('JWT_REFRESH_TTL', 604800)),
      },
    );
    // store hash of current jti for this family → enables rotation + reuse detection
    await this.redis.set(
      `refresh:${family}`,
      createHash('sha256').update(jti).digest('hex'),
      Number(this.config.get('JWT_REFRESH_TTL', 604800)),
    );
    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.roles', 'r')
      .leftJoinAndSelect('r.permissions', 'p')
      .where('u.email = :email', { email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'suspended') throw new ForbiddenException('Account suspended');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload = this.flatten(user);
    const family = randomUUID();
    const tokens = await this.signTokens(payload, family);
    return { ...tokens, user: { ...payload, displayName: user.displayName, avatarUrl: user.avatarUrl } };
  }

  /** Rotating refresh: validates, detects reuse, issues a new pair in same family. */
  async refresh(refreshToken: string) {
    let decoded: JwtPayload & { family: string; jti: string };
    try {
      decoded = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.redis.get<string>(`refresh:${decoded.family}`);
    const presented = createHash('sha256').update(decoded.jti).digest('hex');
    if (!stored || stored !== presented) {
      // reuse or unknown → revoke entire family
      await this.redis.del(`refresh:${decoded.family}`);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const payload: JwtPayload = {
      sub: decoded.sub, email: decoded.email, username: decoded.username,
      roles: decoded.roles, permissions: decoded.permissions,
    };
    return this.signTokens(payload, decoded.family);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const decoded = await this.jwt.verifyAsync<{ family: string }>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
      await this.redis.del(`refresh:${decoded.family}`);
    } catch {
      /* ignore */
    }
  }
}
