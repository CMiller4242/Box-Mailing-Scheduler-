import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiProperty({ example: 'jane.smith@positivepromotions.com' })
  @IsEmail()
  @Matches(/@positivepromotions\.com$/, {
    message: 'Email must end with @positivepromotions.com',
  })
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least 1 uppercase letter' })
  @Matches(/[^a-zA-Z0-9]/, { message: 'Password must contain at least 1 special character' })
  password: string;
}
