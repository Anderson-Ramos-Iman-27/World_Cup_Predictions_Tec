import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 8)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'El codigo debe contener solo letras y numeros',
  })
  code!: string;
}
