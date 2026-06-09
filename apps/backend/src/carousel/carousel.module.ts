import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { CarouselController } from './carousel.controller';
import { CarouselService } from './carousel.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [CarouselController],
  providers: [CarouselService],
})
export class CarouselModule {}
