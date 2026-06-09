import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CarouselService } from './carousel.service';
import { CreateCarouselSlideDto } from './dto/create-carousel-slide.dto';
import { UpdateCarouselSlideDto } from './dto/update-carousel-slide.dto';

@Controller()
export class CarouselController {
  constructor(private readonly carouselService: CarouselService) {}

  @Get('carousel-slides')
  findPublicSlides() {
    return this.carouselService.findPublicSlides();
  }

  @Get('admin/carousel-slides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAdminSlides() {
    return this.carouselService.findAdminSlides();
  }

  @Post('admin/carousel-slides')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCarouselSlideDto) {
    return this.carouselService.create(dto);
  }

  @Patch('admin/carousel-slides/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') slideId: string, @Body() dto: UpdateCarouselSlideDto) {
    return this.carouselService.update(slideId, dto);
  }

  @Delete('admin/carousel-slides/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  delete(@Param('id') slideId: string) {
    return this.carouselService.delete(slideId);
  }
}
