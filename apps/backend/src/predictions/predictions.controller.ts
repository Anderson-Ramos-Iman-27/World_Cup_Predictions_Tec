import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { PredictionsService } from './predictions.service';

@Controller('predictions')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createPredictionDto: CreatePredictionDto,
  ) {
    return this.predictionsService.create(user.id, createPredictionDto);
  }

  @Get('my')
  findMyPredictions(@CurrentUser() user: AuthenticatedUser) {
    return this.predictionsService.findMyPredictions(user.id);
  }

  @Get('room/:roomId')
  findRoomPredictions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId') roomId: string,
  ) {
    return this.predictionsService.findRoomPredictions(roomId, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') predictionId: string,
    @Body() updatePredictionDto: UpdatePredictionDto,
  ) {
    return this.predictionsService.update(predictionId, user.id, updatePredictionDto);
  }
}
