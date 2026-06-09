import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'node:https';
import {
  FootballDataMatchesResponse,
  FootballDataStandingsResponse,
} from './types/football-data-match.type';

@Injectable()
export class FootballDataClient {
  constructor(private readonly configService: ConfigService) {}

  async getMatches() {
    return this.getFromFootballData<FootballDataMatchesResponse>('matches');
  }

  async getStandings() {
    return this.getFromFootballData<FootballDataStandingsResponse>('standings');
  }

  private async getFromFootballData<TResponse>(resource: 'matches' | 'standings') {
    const apiKey = this.configService.get<string>('FOOTBALL_DATA_API_KEY');
    const baseUrl = this.configService.get<string>(
      'FOOTBALL_DATA_API_URL',
      'https://api.football-data.org/v4',
    );
    const competition = this.configService.get<string>(
      'FOOTBALL_DATA_COMPETITION',
      'WC',
    );

    if (!apiKey || apiKey === 'replace_with_api_key') {
      throw new ServiceUnavailableException(
        'La API key de Football-Data.org no esta configurada. Actualiza FOOTBALL_DATA_API_KEY en el archivo .env del backend.',
      );
    }

    const allowInsecureTls =
      this.configService.get<string>('FOOTBALL_DATA_ALLOW_INSECURE_TLS') === 'true';
    const url = new URL(`${baseUrl}/competitions/${competition}/${resource}`);

    try {
      return await this.requestJson<TResponse>(url, apiKey, allowInsecureTls);
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error
          ? `No se pudo consultar Football-Data.org: ${error.message}`
          : 'No se pudo consultar Football-Data.org',
      );
    }
  }

  private requestJson<TResponse>(
    url: URL,
    apiKey: string,
    allowInsecureTls: boolean,
  ) {
    return new Promise<TResponse>((resolve, reject) => {
      const requestInstance = request(
        url,
        {
          headers: {
            'X-Auth-Token': apiKey,
          },
          rejectUnauthorized: !allowInsecureTls,
        },
        (response) => {
          let body = '';

          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            body += chunk;
          });
          response.on('end', () => {
            if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
              reject(
                new Error(
                  `Football-Data.org respondio con estado ${response.statusCode ?? 'desconocido'}`,
                ),
              );
              return;
            }

            try {
              resolve(JSON.parse(body) as TResponse);
            } catch {
              reject(new Error('Football-Data.org respondio con JSON invalido'));
            }
          });
        },
      );

      requestInstance.on('error', reject);
      requestInstance.end();
    });
  }
}
