import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async updateAvatar(userId: string, file: Express.Multer.File): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.avatarPublicId) {
      await this.cloudinaryService.deleteFile(user.avatarPublicId);
    }

    const result = await this.cloudinaryService.uploadFile(file, 'avatars');

    user.avatarUrl = result.secure_url;
    user.avatarPublicId = result.public_id;
    
    await this.userRepository.save(user);
    const { passwordHash, ...userResult } = user;
    return userResult as User;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    
    user.name = updateProfileDto.name;
    return this.userRepository.save(user);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isMatch = await bcrypt.compare(changePasswordDto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(changePasswordDto.newPassword, salt);
    
    user.passwordHash = newHash;
    await this.userRepository.save(user);

    return { message: 'Contraseña actualizada exitosamente' };
  }

  // --- Sysadmin Methods ---

  async findAll(page: number = 1, limit: number = 10) {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC', id: 'ASC' },
      withDeleted: true,
    });

    return {
      data: users.map(user => {
        const { passwordHash, ...result } = user;
        return result;
      }),
      total,
      page,
      limit,
    };
  }

  async updateRole(userId: string, role: UserRole) {
    const user = await this.userRepository.findOne({ where: { id: userId }, withDeleted: true });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    user.role = role;
    await this.userRepository.save(user);
    const { passwordHash, ...result } = user;
    return result;
  }

  async adminResetPassword(userId: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, withDeleted: true });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await this.userRepository.save(user);

    return { message: 'Contraseña del usuario actualizada por sysadmin' };
  }

  async deactivateUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado o ya desactivado');
    await this.userRepository.softRemove(user);
    return { message: 'Usuario dado de baja exitosamente' };
  }

  async reactivateUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, withDeleted: true });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.userRepository.recover(user);
    return { message: 'Usuario reactivado exitosamente' };
  }
}
