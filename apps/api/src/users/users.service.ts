import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role, ROLE } from './entities/role.entity';
import { CreateUserDto, UpdateProfileDto, UpdateUserDto } from './dto/user.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Role) private roles: Repository<Role>,
  ) {}

  async list(page = 1, limit = 20, role?: string, status?: string) {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (role) qb.andWhere('r.name = :role', { role });
    if (status) qb.andWhere('u.status = :status', { status });
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Admins create USER accounts. Only SUPER_ADMIN may create ADMIN accounts.
   * Public registration does not exist — this is the only creation path.
   */
  async create(dto: CreateUserDto, actor: AuthUser) {
    if (dto.role === ROLE.ADMIN && !actor.roles.includes(ROLE.SUPER_ADMIN)) {
      throw new ForbiddenException('Only a Super Admin can create administrators');
    }
    const exists = await this.users.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (exists) throw new ConflictException('Email or username already in use');

    const role = await this.roles.findOne({ where: { name: dto.role } });
    if (!role) throw new BadRequestException('Unknown role');

    const user = this.users.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName ?? dto.username,
      passwordHash: await bcrypt.hash(dto.password, 12),
      roles: [role],
      createdBy: actor.id,
      status: 'active',
    });
    const saved = await this.users.save(user);
    return this.sanitize(saved);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, dto);
    return this.sanitize(await this.users.save(user));
  }

  async remove(id: string, actor: AuthUser) {
    if (id === actor.id) throw new BadRequestException('You cannot delete yourself');
    const user = await this.users.findOne({ where: { id }, relations: ['roles'] });
    if (!user) throw new NotFoundException('User not found');
    if (user.roles.some((r) => r.name === ROLE.SUPER_ADMIN)) {
      throw new ForbiddenException('Super Admin cannot be deleted');
    }
    await this.users.remove(user);
    return { ok: true };
  }

  async me(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    return this.sanitize(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    Object.assign(user, dto);
    return this.sanitize(await this.users.save(user));
  }

  async publicProfile(username: string) {
    const user = await this.users.findOne({ where: { username } });
    if (!user) throw new NotFoundException('Profile not found');
    return this.sanitize(user);
  }

  private sanitize(u: User) {
    const { passwordHash, ...rest } = u as User & { passwordHash?: string };
    return { ...rest, roles: (u.roles ?? []).map((r) => r.name) };
  }
}
