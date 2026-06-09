import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'world-cup-prediction-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
