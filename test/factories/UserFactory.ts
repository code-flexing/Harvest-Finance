import { faker } from '@faker-js/faker';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO timestamp
  role?: 'user' | 'admin';
}

export class UserFactory {
  /**
   * Create a realistic UserDTO. Pass overrides to customize fields.
   */
  static create(overrides: Partial<UserDTO> = {}): UserDTO {
    const user: UserDTO = {
      id: overrides.id ?? faker.string.uuid(),
      name: overrides.name ?? faker.person.fullName(),
      email: overrides.email ?? faker.internet.email(),
      createdAt: overrides.createdAt ?? new Date(faker.date.recent({ days: 30 })).toISOString(),
      role: overrides.role ?? 'user',
    };

    return { ...user, ...overrides };
  }
}
