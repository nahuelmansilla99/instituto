import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is missing');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido o usuario no encontrado');
    }

    // Process role simulation if request header is present
    const simulatedRole = req.headers['x-simulated-role'];
    if (simulatedRole) {
      const hasSysadminSim = user.role === UserRole.SYSADMIN && (simulatedRole === UserRole.ADMIN || simulatedRole === UserRole.STUDENT);
      const hasAdminSim = user.role === UserRole.ADMIN && simulatedRole === UserRole.STUDENT;

      if (hasSysadminSim || hasAdminSim) {
        user.role = simulatedRole as UserRole;
      }
    }

    return user;
  }
}
