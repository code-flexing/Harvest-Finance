import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || 'github-client-id-placeholder',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || 'github-client-secret-placeholder',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || 'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { id, emails, displayName, username } = profile;
    const email = emails && emails[0] ? emails[0].value : null;

    if (!email) {
      return done(new Error('No email found from Github profile. Ensure your email is public on Github.'), false);
    }

    let firstName: string | undefined = undefined;
    let lastName: string | undefined = undefined;
    if (displayName) {
      const nameParts = displayName.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
    } else if (username) {
      firstName = username;
    }

    try {
      const user = await this.authService.validateOrCreateOAuthUser(
        'github',
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
