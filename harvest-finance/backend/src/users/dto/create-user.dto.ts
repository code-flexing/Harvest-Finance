import { IsString, IsEmail, IsNumber, IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  age: number;

  // Handles nested object validation and transformation
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto) 
  address?: AddressDto;
}