import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarouselSlideDto } from './dto/create-carousel-slide.dto';
import { UpdateCarouselSlideDto } from './dto/update-carousel-slide.dto';

@Injectable()
export class CarouselService {
  constructor(private readonly prisma: PrismaService) {}

  findPublicSlides() {
    return this.prisma.carouselSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findAdminSlides() {
    return this.prisma.carouselSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(dto: CreateCarouselSlideDto) {
    return this.prisma.carouselSlide.create({
      data: {
        title: dto.title.trim(),
        subtitle: dto.subtitle.trim(),
        imageUrl: dto.imageUrl.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(slideId: string, dto: UpdateCarouselSlideDto) {
    await this.findSlideOrThrow(slideId);

    return this.prisma.carouselSlide.update({
      where: { id: slideId },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.subtitle ? { subtitle: dto.subtitle.trim() } : {}),
        ...(dto.imageUrl ? { imageUrl: dto.imageUrl.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async delete(slideId: string) {
    await this.findSlideOrThrow(slideId);
    await this.prisma.carouselSlide.delete({
      where: { id: slideId },
    });

    return { message: 'Diapositiva eliminada correctamente.' };
  }

  private async findSlideOrThrow(slideId: string) {
    const slide = await this.prisma.carouselSlide.findUnique({
      where: { id: slideId },
    });

    if (!slide) {
      throw new NotFoundException('Slide de carrusel no encontrado');
    }

    return slide;
  }
}
