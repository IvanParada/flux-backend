import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  rut: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

}