import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserRole } from '../../database/entities/user.entity';

export class ProfileResponseDto {
  @Expose()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User unique identifier',
  })
  id: string;

  @Expose()
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  email: string;

  @Expose()
  @ApiProperty({
    enum: UserRole,
    example: 'FARMER',
    description: 'User role in the system',
  })
  role: UserRole;

  @Expose()
  @ApiProperty({
    example: 'John',
    description: 'First name of the user',
  })
  first_name: string | null;

  @Expose()
  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the user',
  })
  last_name: string | null;

  @Expose()
  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  phone: string | null;

  @Expose()
  @ApiProperty({
    example: '123 Farm Road, Agriculture City, AC 12345',
    description: 'Physical address',
    required: false,
  })
  address: string | null;

  @Expose()
  @ApiProperty({
    example: 'https://example.com/profile-image.jpg',
    description: 'URL to profile image',
    required: false,
  })
  profile_image_url: string | null;

  @Expose()
  @ApiProperty({
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    description: 'Stellar blockchain address',
    required: false,
  })
  stellar_address: string | null;

  @Expose()
  @ApiProperty({
    example: true,
    description: 'Whether the user account is active',
  })
  is_active: boolean;

  @Expose()
  @ApiProperty({
    example: '2023-12-01T10:30:00Z',
    description: 'Last login timestamp',
    required: false,
  })
  last_login: Date | null;

  @Expose()
  @ApiProperty({
    example: '2023-01-01T00:00:00Z',
    description: 'Account creation timestamp',
  })
  created_at: Date;

  @Expose()
  @ApiProperty({
    example: '2023-12-01T10:30:00Z',
    description: 'Last update timestamp',
  })
  updated_at: Date;
}
