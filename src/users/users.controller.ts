import {
  Get,
  Post,
  Patch,
  Body,
  Controller,
  Param,
  HttpCode,
  UseGuards,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Notification, User } from '@prisma/client';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id';
import { AtGuard } from 'src/common/guard/at.guard';
import { UpdateUserDto, UpdateUserImageDto } from './dto/update-user.dto';
import { FilterType, UserPaginationType } from 'types';
import { Public } from 'src/common/decorator/public.decorator';
import { GetCurrentUser } from 'src/common/decorator/get-current-user';

@Controller('users')
@UseGuards(AtGuard)
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  getCurrentUser(@GetCurrentUserId() userId: string): Promise<User> {
    return this.userService.getCurrentUser(userId);
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterDto): Promise<User> {
    return this.userService.createUser(body);
  }

  @Get('other-users')
  @HttpCode(HttpStatus.OK)
  getOtherUsers(
    @GetCurrentUser('email') email: string,
    @Query() params: FilterType,
  ): Promise<UserPaginationType> {
    return this.userService.getOtherUsers(params, email);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  getUserById(@Param('id') userId: string): Promise<User> {
    return this.userService.getUserById(userId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateUser(
    @Param('id') userId: string,
    @Body() data: UpdateUserDto,
    @GetCurrentUserId() currentUserId: string,
  ): Promise<User> {
    return this.userService.updateUser(userId, data, currentUserId);
  }

  @Patch('images/:id')
  @HttpCode(HttpStatus.OK)
  updateProfileImage(
    @Param('id') userId: string,
    @Body() data: UpdateUserImageDto,
    @GetCurrentUserId() currentUserId: string,
  ): Promise<User> {
    return this.userService.updateUserImage(userId, currentUserId, data);
  }

  @Post('follow/:userId')
  @HttpCode(HttpStatus.CREATED)
  followUser(
    @Param('userId') userId: string,
    @GetCurrentUserId() currentUserId: string,
  ) {
    return this.userService.followUser(userId, currentUserId);
  }

  @Patch('unfollow/:userId')
  @HttpCode(HttpStatus.OK)
  unfollowUser(
    @Param('userId') userId: string,
    @GetCurrentUserId() currentUserId: string,
  ) {
    return this.userService.unfollowUser(userId, currentUserId);
  }

  @Get('followers/:userId')
  @HttpCode(HttpStatus.OK)
  getFollowerUsers(@Param('userId') userId: string) {
    return this.userService.getFollowers(userId);
  }

  @Get('followings/:userId')
  @HttpCode(HttpStatus.OK)
  getFollowingUsers(@Param('userId') userId: string) {
    return this.userService.getFollowings(userId);
  }

  @Get('notifications/:userId')
  @HttpCode(HttpStatus.OK)
  getNotifications(
    @GetCurrentUserId() currentUserId: string,
  ): Promise<Notification[]> {
    return this.userService.getNotifications(currentUserId);
  }

  @Patch('notifications/:notiId')
  @HttpCode(HttpStatus.OK)
  updateNotification(
    @GetCurrentUserId() currentUserId: string,
    @Param('notiId') notiId: string,
  ) {
    return this.userService.updateNotification(currentUserId, notiId);
  }
}
