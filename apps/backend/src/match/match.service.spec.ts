import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MatchService Rotation Logic', () => {
  let service: MatchService;
  let prisma: PrismaService;

  const mockPrismaService = {
    event: {
      findUnique: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    team: {
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MatchService>(MatchService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shuffleArray helper', () => {
    it('should return a shuffled copy of the array of the same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = (service as any).shuffleArray(arr);
      expect(shuffled.length).toBe(arr.length);
      expect(shuffled).toContain(1);
      expect(shuffled).toContain(5);
    });
  });
});
