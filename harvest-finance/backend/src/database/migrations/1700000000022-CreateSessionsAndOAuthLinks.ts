import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Creates the `sessions` and `user_oauth_links` tables.
 *
 * `sessions` persists refresh-token records enriched with device metadata so
 * users can view and revoke individual active sessions.
 *
 * `user_oauth_links` stores per-provider OAuth identity links for a user.
 */
export class CreateSessionsAndOAuthLinks1700000000022
  implements MigrationInterface
{
  name = 'CreateSessionsAndOAuthLinks1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── user_oauth_links ─────────────────────────────────────────────────────
    const oauthTableExists = await queryRunner.hasTable('user_oauth_links');
    if (!oauthTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'user_oauth_links',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'user_id', type: 'uuid' },
            { name: 'oauth_provider', type: 'varchar' },
            { name: 'oauth_id', type: 'varchar' },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'user_oauth_links',
        new TableIndex({
          name: 'idx_user_oauth_links_provider_id',
          columnNames: ['oauth_provider', 'oauth_id'],
          isUnique: true,
        }),
      );
      await queryRunner.createIndex(
        'user_oauth_links',
        new TableIndex({
          name: 'idx_user_oauth_links_user_id',
          columnNames: ['user_id'],
        }),
      );
      await queryRunner.createForeignKey(
        'user_oauth_links',
        new TableForeignKey({
          name: 'fk_oauth_links_user',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    // ── sessions ─────────────────────────────────────────────────────────────
    const sessionsTableExists = await queryRunner.hasTable('sessions');
    if (!sessionsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'sessions',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'uuid_generate_v4()',
            },
            { name: 'user_id', type: 'uuid' },
            { name: 'refresh_token', type: 'varchar' },
            { name: 'user_agent', type: 'varchar', isNullable: true },
            { name: 'ip_address', type: 'varchar', isNullable: true },
            { name: 'device_name', type: 'varchar', isNullable: true },
            { name: 'last_used_at', type: 'timestamp', default: 'now()' },
            {
              name: 'expires_at',
              type: 'timestamp',
              // 7 days from creation by default
              default: "now() + interval '7 days'",
            },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' },
          ],
        }),
        true,
      );

      await queryRunner.createIndex(
        'sessions',
        new TableIndex({
          name: 'idx_sessions_user_id',
          columnNames: ['user_id'],
        }),
      );
      await queryRunner.createIndex(
        'sessions',
        new TableIndex({
          name: 'idx_sessions_expires_at',
          columnNames: ['expires_at'],
        }),
      );
      await queryRunner.createForeignKey(
        'sessions',
        new TableForeignKey({
          name: 'fk_sessions_user',
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const sessionsExists = await queryRunner.hasTable('sessions');
    if (sessionsExists) {
      await queryRunner.dropForeignKey('sessions', 'fk_sessions_user');
      await queryRunner.dropTable('sessions');
    }

    const oauthExists = await queryRunner.hasTable('user_oauth_links');
    if (oauthExists) {
      await queryRunner.dropForeignKey('user_oauth_links', 'fk_oauth_links_user');
      await queryRunner.dropTable('user_oauth_links');
    }
  }
}
