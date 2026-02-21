import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { VyroService } from "./vyro.service";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("VyroService", () => {
  let service: VyroService;
  const mockConfig = {
    get: jest.fn(),
  } as unknown as ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VyroService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<VyroService>(VyroService);
    (mockConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === "IMAGINE_TOKEN") return "Bearer test-token";
      return null;
    });
  });

  it("should generate image", async () => {
    const mockResponse = {
      data: { image_url: "http://example.com/image.png" },
    };
    mockedAxios.post.mockResolvedValueOnce(mockResponse as any);
    const result = await service.generateImage("test prompt");
    expect(result).toEqual(mockResponse.data);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://api.vyro.ai/v2/image/generations",
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });
});
