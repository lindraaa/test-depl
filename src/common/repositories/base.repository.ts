import {
  DeepPartial,
  FindOptionsWhere,
  QueryDeepPartialEntity,
  Repository,
} from 'typeorm';
import { PaginationDto } from '../dto/paginated.dto';

export abstract class BaseRepository<T extends { id: string }> {
  constructor(protected readonly repository: Repository<T>) {}

  findAll(): Promise<T[]> {
    return this.repository.find();
  }

  findAllPaginated(pagination: PaginationDto): Promise<[T[], number]> {
    return this.repository.findAndCount({
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  findById(id: string): Promise<T | null> {
    const where = {
      id,
    } as FindOptionsWhere<T>;

    return this.repository.findOne({ where });
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);

    return this.repository.save(entity);
  }

  async update(id: string, data: QueryDeepPartialEntity<T>): Promise<T | null> {
    await this.repository.update(id, data);

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
