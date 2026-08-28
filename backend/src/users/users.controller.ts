import { Controller, Get, Patch, Post, Body, UseGuards, Query, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  uploadAvatar(@GetUser() user: User, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.updateAvatar(user.id, file);
  }

  @Get('me')
  getMe(@GetUser() user: User) {
    // Return user without passwordHash
    const { passwordHash, ...result } = user;
    return result;
  }

  @Patch('profile')
  async updateProfile(
    @GetUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedUser = await this.usersService.updateProfile(user.id, updateProfileDto);
    const { passwordHash, ...result } = updatedUser;
    return result;
  }

  @Post('change-password')
  changePassword(
    @GetUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  // --- Sysadmin Endpoints ---

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSADMIN)
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.usersService.findAll(Number(page) || 1, Number(limit) || 10);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSADMIN)
  updateRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.usersService.updateRole(id, role);
  }

  @Patch(':id/password')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSADMIN)
  adminResetPassword(@Param('id') id: string, @Body('password') password: string) {
    return this.usersService.adminResetPassword(id, password);
  }

  @Post(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSADMIN)
  deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Post(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSADMIN)
  reactivateUser(@Param('id') id: string) {
    return this.usersService.reactivateUser(id);
  }
}
