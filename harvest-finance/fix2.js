const fs = require('fs');
let authController = fs.readFileSync('backend/src/auth/auth.controller.ts', 'utf8');
if (!authController.includes("Query } from '@nestjs/common'")) {
    authController = authController.replace("Req } from '@nestjs/common'", "Req, Query } from '@nestjs/common'");
}
if (!authController.includes("Query } from '@nestjs/common'")) {
    // If it still doesn't include it, maybe Req is not there
    authController = authController.replace("Request } from '@nestjs/common'", "Request, Query } from '@nestjs/common'");
}
fs.writeFileSync('backend/src/auth/auth.controller.ts', authController);
console.log("Fixed Query import");
