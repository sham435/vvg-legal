
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VideoService } from '../src/modules/video/video.service';
import { AiService } from '../src/modules/ai/ai.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Wan 2.1 Integration Verification', () => {
    let videoService: VideoService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VideoService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: (key: string) => {
                            if (key === 'WAN_ENDPOINT') return 'http://localhost:8080';
                            if (key === 'VIDEO_ENGINE_PRIORITY') return 'wan-1.3b';
                            return null;
                        }
                    }
                },
                {
                    provide: AiService,
                    useValue: {}
                }
            ],
        }).compile();

        videoService = module.get<VideoService>(VideoService);
    });

    it('should construct correct official payload for Wan 1.3B', async () => {
        // Mock successful response
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                video_url: 'http://localhost:8080/outputs/test.mp4',
                local_path: '/tmp/test.mp4'
            }
        });

        // Act
        const result = await videoService.generateWithWan('A cyberpunk cat', 5);

        // Assert
        expect(mockedAxios.post).toHaveBeenCalledWith(
            'http://localhost:8080/generate',
            expect.objectContaining({
                prompt: 'A cyberpunk cat',
                task: 't2v-1.3b',
                size: '832*480',       // CRITICAL: Official Quickstart Spec
                sample_guide_scale: 6, // CRITICAL: Official Quickstart Spec
                offload_model: true,   // CRITICAL: for 8GB VRAM
                t5_cpu: true           // CRITICAL: for 8GB VRAM
            }),
            expect.any(Object)
        );

        console.log('✅ Payload Verification Passed: Correctly targeting 480p/Optimize params');
        console.log('Result:', result);
    });
});
