export class ResetPasswordDto {
  resetToken: string;
  newPassword: string;
  confirmNewPassword: string;
}
