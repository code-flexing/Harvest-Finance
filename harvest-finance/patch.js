const fs = require('fs');
const path = require('path');

const userEntityPath = path.join(__dirname, 'backend/src/database/entities/user.entity.ts');
let userEntity = fs.readFileSync(userEntityPath, 'utf8');

// Replace refreshToken with emailVerifiedAt and emailVerificationToken
userEntity = userEntity.replace(
  "@Column({ name: 'refresh_token', select: false, nullable: true })\n  @Exclude()\n  refreshToken: string | null;",
  `@Column({ name: 'email_verified_at', nullable: true })\n  emailVerifiedAt: Date | null;\n\n  @Column({ name: 'email_verification_token', nullable: true })\n  @Exclude()\n  emailVerificationToken: string | null;\n\n  @OneToMany(() => Session, (session) => session.user)\n  sessions: Session[];`
);

// Add Session import to user.entity.ts
userEntity = userEntity.replace(
  "import { UserOAuthLink } from './user-oauth-link.entity';",
  "import { UserOAuthLink } from './user-oauth-link.entity';\nimport { Session } from './session.entity';"
);
fs.writeFileSync(userEntityPath, userEntity);


const vaultEntityPath = path.join(__dirname, 'backend/src/database/entities/vault.entity.ts');
let vaultEntity = fs.readFileSync(vaultEntityPath, 'utf8');
if (!vaultEntity.includes('strategyScore')) {
    vaultEntity = vaultEntity.replace(
      "} from 'typeorm';",
      "} from 'typeorm';"
    );
    // Find the class definition and add strategyScore
    vaultEntity = vaultEntity.replace(
        "export class Vault {",
        "export class Vault {\n  @Column({ name: 'strategy_score', type: 'float', default: 0, nullable: true })\n  strategyScore: number | null;"
    );
    fs.writeFileSync(vaultEntityPath, vaultEntity);
}

console.log("Patched entities");
