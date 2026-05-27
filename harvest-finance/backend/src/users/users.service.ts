import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUserToProfileResponse(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it's already taken
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new BadRequestException('Email is already taken');
      }
    }

    // Update user fields
    const updatedUser = {
      ...user,
      ...updateProfileDto,
      updatedAt: new Date(),
    };

    // Handle name fields separately
    if (updateProfileDto.first_name !== undefined) {
      updatedUser.firstName = updateProfileDto.first_name;
    }
    if (updateProfileDto.last_name !== undefined) {
      updatedUser.lastName = updateProfileDto.last_name;
    }

    await this.userRepository.save(updatedUser);

    return this.mapUserToProfileResponse(updatedUser);
  }

  /**
   * Delete user account
   */
  async deleteAccount(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.remove(user);

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  /**
   * Map user entity to profile response DTO
   */
  private mapUserToProfileResponse(user: User): ProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      address: user.address,
      profile_image_url: user.profileImageUrl,
      stellar_address: user.stellarAddress,
      is_active: user.isActive,
      last_login: user.lastLogin,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}
