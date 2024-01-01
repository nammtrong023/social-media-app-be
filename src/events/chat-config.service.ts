import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';

@Injectable()
export class ChatConfigService {
  constructor(private configService: ConfigService) {}

  isValidAuthHeader(authorization: string) {
    const token: string = authorization.split(' ')[1];

    if (!token) throw new HttpException('Unauthorized', 401);

    const payload = verify(token, this.configService.get('AT_SECRET'));

    return payload;
  }
}
