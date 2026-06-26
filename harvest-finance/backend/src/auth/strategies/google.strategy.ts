import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'google-client-id-placeholder',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'google-client-secret-placeholder',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails } = profile;
    const email = emails && emails[0] ? emails[0].value : null;
    const firstName = name && name.givenName ? name.givenName : undefined;
    const lastName = name && name.familyName ? name.familyName : undefined;

    if (!email) {
      return done(new Error('No email found from Google profile'), false);
    }

    try {
      const user = await this.authService.validateOrCreateOAuthUser(
        'google',
        id,
        email,
        firstName,
        lastName,
      );
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
}
