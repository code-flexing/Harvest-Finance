import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vault } from './entities/vault.entity';

@Injectable()
export class VaultRepository {
  constructor(
    @InjectRepository(Vault)
    private readonly repository: Repository<Vault>,
  ) {}

  async findAll(): Promise<Vault[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Vault | null> {
    return this.repository.findOne({ where: { id } });
  }

  async save(vault: Vault): Promise<Vault> {
    return this.repository.save(vault);
  }

  async findLeaderboard(): Promise<Vault[]> {
    return this.repository.find({
      order: { tvlAtHighWatermark: 'DESC' },
    });
  }
}
