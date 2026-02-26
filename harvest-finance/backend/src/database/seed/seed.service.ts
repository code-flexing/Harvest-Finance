import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { generateSeedData, clearSeedData } from './seed.data';

/**
 * Seed Service
 * 
 * Handles database seeding operations for development and testing.
 * 
 * Usage:
 * - Run migrations first: npm run migration:run
 * - Then seed data: npm run seed
 * 
 * Or programmatically:
 * - SeedService.seed() - populates database with test data
 * - SeedService.clear() - removes all seeded data
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    // Auto-seed on module init if in development mode
    // Remove this if you don't want auto-seeding
  }

  /**
   * Seed the database with test data
   * 
   * Creates sample users, orders, transactions, verifications, and credit scores
   */
  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');
    
    try {
      // Clear existing seed data first
      await clearSeedData(this.dataSource);
      
      // Generate new seed data
      await generateSeedData(this.dataSource);
      
      this.logger.log('Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('Error seeding database:', error);
      throw error;
    }
  }

  /**
   * Clear all seed data from the database
   */
  async clear(): Promise<void> {
    this.logger.log('Clearing seed data...');
    
    try {
      await clearSeedData(this.dataSource);
      this.logger.log('Seed data cleared successfully!');
    } catch (error) {
      this.logger.error('Error clearing seed data:', error);
      throw error;
    }
  }

  /**
   * Reset the database (clear + seed)
   */
  async reset(): Promise<void> {
    this.logger.log('Resetting database...');
    await this.clear();
    await this.seed();
    this.logger.log('Database reset completed!');
  }
}
