import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { isPostgresUniqueViolation } from '../../database/postgres-errors';
import { normalizeEmail } from './email.util';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { UserStatus } from './enums/user-status.enum';

export interface CreateAdminInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface CreateDomainUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export type CreateTrainerUserInput = CreateDomainUserInput;
export type CreateClientUserInput = CreateDomainUserInput;

export interface UpdateUserIdentityInput {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export type SafeUser = Pick<
  User,
  'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'status' | 'lastLoginAt'
>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async findByIdWithManager(
    manager: EntityManager,
    id: string,
  ): Promise<User | null> {
    return manager.getRepository(User).findOne({ where: { id } });
  }

  async findActiveById(id: string): Promise<User | null> {
    return this.users.findOne({
      where: { id, status: UserStatus.ACTIVE },
    });
  }

  async createTrainerUser(
    manager: EntityManager,
    input: CreateTrainerUserInput,
  ): Promise<User> {
    return this.persistDomainUser(manager, input, UserRole.TRAINER);
  }

  async createClientUser(
    manager: EntityManager,
    input: CreateClientUserInput,
  ): Promise<User> {
    return this.persistDomainUser(manager, input, UserRole.CLIENT);
  }

  async updateIdentity(
    manager: EntityManager,
    userId: string,
    input: UpdateUserIdentityInput,
  ): Promise<User> {
    const users = manager.getRepository(User);
    const user = await users.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.email !== undefined) {
      user.email = normalizeEmail(input.email);
    }
    if (input.firstName !== undefined) {
      user.firstName = input.firstName.trim();
    }
    if (input.lastName !== undefined) {
      user.lastName = input.lastName.trim();
    }

    return users.save(user);
  }

  async updateStatus(
    manager: EntityManager,
    userId: string,
    status: UserStatus,
  ): Promise<User> {
    const users = manager.getRepository(User);
    const user = await users.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = status;
    return users.save(user);
  }

  async createAdminIfAbsent(
    input: CreateAdminInput,
  ): Promise<'created' | 'exists'> {
    const email = normalizeEmail(input.email);
    const existing = await this.users.findOne({ where: { email } });

    if (existing) {
      return 'exists';
    }

    const user = this.users.create({
      email,
      passwordHash: input.passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    try {
      await this.users.save(user);
      return 'created';
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        return 'exists';
      }

      throw error;
    }
  }

  private async persistDomainUser(
    manager: EntityManager,
    input: CreateDomainUserInput,
    role: UserRole.TRAINER | UserRole.CLIENT,
  ): Promise<User> {
    const users = manager.getRepository(User);
    const user = users.create({
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role,
      status: UserStatus.ACTIVE,
    });
    return users.save(user);
  }

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
