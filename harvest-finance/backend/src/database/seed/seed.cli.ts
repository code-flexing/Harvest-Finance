import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AppDataSource } from '../index';
import { SeedService } from './seed.service';

// Load environment variables
config();

/**
 * Seed CLI
 * 
 * Command-line tool for seeding the database with test data.
 * 
 * Usage:
 * npm run seed           - Seed the database
 * npm run seed:clear     - Clear seed data
 * npm run seed:reset     - Reset database (clear + seed)
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'seed';

  console.log('🚀 Starting Seed CLI...\n');

  try {
    // Initialize database connection
    const dataSource: DataSource = await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    const seedService = new SeedService(dataSource);

    switch (command) {
      case 'seed':
        await seedService.seed();
        break;
      case 'clear':
        await seedService.clear();
        break;
      case 'reset':
        await seedService.reset();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: seed, clear, reset');
        process.exit(1);
    }

    // Close database connection
    await dataSource.destroy();
    console.log('\n✅ Seed CLI completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed CLI failed:', error);
    process.exit(1);
  }
}

main();
