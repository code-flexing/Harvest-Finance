import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInMonths, startOfMonth } from 'date-fns';
import { Achievement, AchievementType } from '../database/entities/achievement.entity';
import { Deposit, DepositStatus } from '../database/entities/deposit.entity';
import { Vault } from '../database/entities/vault.entity';
import { AchievementResponseDto, ACHIEVEMENT_META } from './dto/achievement-response.dto';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement) private achievementRepo: Repository<Achievement>,
    @InjectRepository(Deposit) private depositRepo: Repository<Deposit>,
    @InjectRepository(Vault) private vaultRepo: Repository<Vault>,
  ) {}

  async evaluateAndUnlock(userId: string): Promise<AchievementResponseDto[]> {
    const existing = await this.achievementRepo.find({ where: { userId } });
    const existingTypes = new Set(existing.map((a) => a.type));
    const newlyUnlocked: AchievementResponseDto[] = [];

    const deposits = await this.depositRepo.find({
      where: { userId, status: DepositStatus.CONFIRMED },
      order: { createdAt: 'ASC' },
    });

    // FIRST_DEPOSIT
    if (!existingTypes.has(AchievementType.FIRST_DEPOSIT) && deposits.length >= 1) {
      newlyUnlocked.push(await this.unlock(userId, AchievementType.FIRST_DEPOSIT));
    }

    // MILESTONE_MASTER — $1,000+ total
    const totalSavings = deposits.reduce((s, d) => s + Number(d.amount), 0);
    if (!existingTypes.has(AchievementType.MILESTONE_MASTER) && totalSavings >= 1000) {
      newlyUnlocked.push(await this.unlock(userId, AchievementType.MILESTONE_MASTER, { total: totalSavings }));
    }

    // CONSISTENT_SAVER — deposits in 3+ consecutive months
    if (!existingTypes.has(AchievementType.CONSISTENT_SAVER) && deposits.length >= 3) {
      const months = deposits.map((d) => startOfMonth(d.createdAt).getTime());
      const uniqueMonths = [...new Set(months)].sort((a, b) => a - b);
      let consecutive = 1;
      for (let i = 1; i < uniqueMonths.length; i++) {
        const diff = differenceInMonths(new Date(uniqueMonths[i]), new Date(uniqueMonths[i - 1]));
        if (diff === 1) {
          consecutive++;
          if (consecutive >= 3) {
            newlyUnlocked.push(await this.unlock(userId, AchievementType.CONSISTENT_SAVER));
            break;
          }
        } else {
          consecutive = 1;
        }
      }
    }

    // LONG_TERM_PLANNER — vault active 6+ months
    if (!existingTypes.has(AchievementType.LONG_TERM_PLANNER)) {
      const vaults = await this.vaultRepo.find({ where: { ownerId: userId } });
      const now = new Date();
      const longRunning = vaults.find((v) => differenceInMonths(now, v.createdAt) >= 6);
      if (longRunning) {
        newlyUnlocked.push(
          await this.unlock(userId, AchievementType.LONG_TERM_PLANNER, { vaultId: longRunning.id }),
        );
      }
    }

    return newlyUnlocked;
  }

  async getUserAchievements(userId: string): Promise<AchievementResponseDto[]> {
    const achievements = await this.achievementRepo.find({
      where: { userId },
      order: { unlockedAt: 'DESC' },
    });
    return achievements.map((a) => this.toDto(a));
  }

  private async unlock(
    userId: string,
    type: AchievementType,
    metaData: Record<string, unknown> = {},
  ): Promise<AchievementResponseDto> {
    const achievement = this.achievementRepo.create({ userId, type, unlockedAt: new Date(), metaData });
    const saved = await this.achievementRepo.save(achievement);
    return this.toDto(saved);
  }

  private toDto(a: Achievement): AchievementResponseDto {
    const meta = ACHIEVEMENT_META[a.type];
    return { id: a.id, type: a.type, label: meta.label, description: meta.description, icon: meta.icon, unlockedAt: a.unlockedAt };
  }
}
