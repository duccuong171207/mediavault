import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private repo: Repository<Category>) {}

  list() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  create(data: { name: string; slug: string; parentId?: number }) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<Category>) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException();
    Object.assign(c, data);
    return this.repo.save(c);
  }

  async remove(id: number) {
    await this.repo.delete(id);
    return { ok: true };
  }
}
