import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SequelizeModuleOptions } from '@nestjs/sequelize/dist/interfaces/sequelize-options.interface';
import { Company } from '../db/models/Company';
import { Ticket } from '../db/models/Ticket';
import { User } from '../db/models/User';
import dbConfig from '../db/config/config.json';
import { Task } from 'db/models/Task';

const devConfig = dbConfig.development as SequelizeModuleOptions;
const testConfig = dbConfig.test as SequelizeModuleOptions;

const config = process.env.NODE_ENV === 'test' ? testConfig : devConfig;

@Module({
  imports: [
    SequelizeModule.forRoot({
      ...config,
      logging: process.env.NODE_ENV === 'test' ? false : console.log,
      models: [Company, User, Ticket, Task],
    }),
  ],
})
export class DbModule {}
