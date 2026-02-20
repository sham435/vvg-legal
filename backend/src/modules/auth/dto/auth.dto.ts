import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ description: "User email address", example: "admin@example.com" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @ApiProperty({ description: "User password", example: "SecureP@ssw0rd123" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: "User email address", example: "admin@example.com" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @ApiProperty({ description: "User password", example: "SecureP@ssw0rd123" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;

  @ApiProperty({ description: "User full name", example: "John Doe" })
  @IsString()
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  @IsOptional()
  name?: string;
}
