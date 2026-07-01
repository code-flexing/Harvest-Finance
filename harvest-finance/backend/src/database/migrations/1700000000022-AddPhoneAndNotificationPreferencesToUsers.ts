import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPhoneAndNotificationPreferencesToUsers1700000000022
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone_number',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone_verified_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'notification_preferences',
        type: 'jsonb',
        isNullable: true,
        default: `'{
          "depositConfirmed": {"email": true, "sms": false, "push": true, "inApp": true},
          "withdrawalCompleted": {"email": true, "sms": false, "push": true, "inApp": true},
          "vaultPaused": {"email": true, "sms": true, "push": true, "inApp": true},
          "securityAlert": {"email": true, "sms": true, "push": true, "inApp": true},
          "yieldMilestone": {"email": true, "sms": false, "push": true, "inApp": true}
        }'::jsonb`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'notification_preferences');
    await queryRunner.dropColumn('users', 'phone_verified_at');
    await queryRunner.dropColumn('users', 'phone_number');
  }
}
