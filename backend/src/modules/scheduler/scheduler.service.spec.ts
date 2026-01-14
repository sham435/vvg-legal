import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TrendsService } from '../trends/trends.service';
import { AiService } from '../ai/ai.service';
import { VideoService } from '../video/video.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { PublishService } from '../publish/publish.service';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

describe('SchedulerService', () => {
  let service: SchedulerService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {};
  const mockTrendsService = {};
  const mockAiService = {};
  const mockVideoService = {};
  const mockNotificationsService = {};
  const mockSchedulerRegistry = {
    getCronJob: jest.fn(),
  };
  const mockPipelineService = {};
  const mockPublishService = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TrendsService, useValue: mockTrendsService },
        { provide: AiService, useValue: mockAiService },
        { provide: VideoService, useValue: mockVideoService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
        { provide: PipelineService, useValue: mockPipelineService },
        { provide: PublishService, useValue: mockPublishService },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should prioritize environment variables over settings.json', () => {
    // Setup environment variable to be true
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'ENABLE_AUTO_GENERATION') return 'true';
      if (key === 'REQUIRE_MANUAL_APPROVAL') return 'false';
      return undefined;
    });

    // Mock settings.json content (where it is disabled)
    const mockSettings = {
      enableAutoGeneration: false,
      requireManualApproval: true,
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSettings));

    // Call loadSettings (triggered via onModuleInit or manually here)
    (service as any).loadSettings();

    const settings = service.getSettings();
    expect(settings.enableAutoGeneration).toBe(true);
    expect(settings.requireManualApproval).toBe(false);
  });

  it('should use settings.json if environment variables are not set', () => {
    // Setup environment variables to be undefined
    mockConfigService.get.mockImplementation(() => undefined);

    // Mock settings.json content (where it is enabled)
    const mockSettings = {
      enableAutoGeneration: true,
      requireManualApproval: false,
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockSettings));

    (service as any).loadSettings();

    const settings = service.getSettings();
    expect(settings.enableAutoGeneration).toBe(true);
    expect(settings.requireManualApproval).toBe(false);
  });
});
