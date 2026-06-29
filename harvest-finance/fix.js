const fs = require('fs');

let scoring = fs.readFileSync('backend/src/analytics/scoring.service.ts', 'utf8');
scoring = scoring.replace('const currentApy = vault.apy || 0;', 'const currentApy = (vault as any).apy || 0;');
fs.writeFileSync('backend/src/analytics/scoring.service.ts', scoring);

let authService = fs.readFileSync('backend/src/auth/auth.service.ts', 'utf8');
authService = authService.replace("import * as zxcvbn from 'zxcvbn';", "const zxcvbn = require('zxcvbn');");
fs.writeFileSync('backend/src/auth/auth.service.ts', authService);

let authController = fs.readFileSync('backend/src/auth/auth.controller.ts', 'utf8');
authController = authController.replace("@Request() req", "@Req() req");
if (!authController.includes("Query } from '@nestjs/common'")) {
    authController = authController.replace("Req } from '@nestjs/common'", "Req, Query } from '@nestjs/common'");
}
fs.writeFileSync('backend/src/auth/auth.controller.ts', authController);

console.log("Fixed my files");
