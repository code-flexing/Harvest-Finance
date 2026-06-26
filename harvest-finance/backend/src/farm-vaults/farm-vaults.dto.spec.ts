import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { IsNumber, Min } from 'class-validator';

class TestAmountDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}

describe('FarmVaultsController DTO validation (amount)', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    transformOptions: { enableImplicitConversion: true },
  });

  it('accepts numeric string when transform enabled', async () => {
    const transformed = await pipe.transform(
      { amount: '100' },
      { metatype: TestAmountDto as any, type: 'body' },
    );
    expect(typeof transformed.amount).toBe('number');
    expect(transformed.amount).toBe(100);
  });

  it('rejects NaN', async () => {
    await expect(
      pipe.transform(
        { amount: 'NaN' },
        { metatype: TestAmountDto as any, type: 'body' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects Infinity and -Infinity', async () => {
    await expect(
      pipe.transform(
        { amount: 'Infinity' },
        { metatype: TestAmountDto as any, type: 'body' },
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      pipe.transform(
        { amount: '-Infinity' },
        { metatype: TestAmountDto as any, type: 'body' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects non-numeric strings', async () => {
    await expect(
      pipe.transform(
        { amount: 'abc' },
        { metatype: TestAmountDto as any, type: 'body' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects empty / null / undefined', async () => {
    await expect(
      pipe.transform({}, { metatype: TestAmountDto as any, type: 'body' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      pipe.transform(
        { amount: null },
        { metatype: TestAmountDto as any, type: 'body' },
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      pipe.transform(
        { amount: undefined },
        { metatype: TestAmountDto as any, type: 'body' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
