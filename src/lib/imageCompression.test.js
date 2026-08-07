import { describe, test, expect } from 'vitest';
import {
  fitWithin,
  compressImage,
  ImageCompressionError,
  FULL_LADDER,
  IMAGE_DATA_URL_PATTERN,
  MAX_FULL_CHARS,
  MAX_SOURCE_BYTES,
  MAX_THUMB_CHARS,
  THUMB_MAX_EDGE,
} from './imageCompression.js';

describe('fitWithin', () => {
  test('scales a landscape photo down by its longest edge', () => {
    // Arrange
    const width = 4032;
    const height = 3024;

    // Act
    const fitted = fitWithin(width, height, 1280);

    // Assert
    expect(fitted).toEqual({ width: 1280, height: 960 });
  });

  test('scales a portrait photo down by its longest edge', () => {
    expect(fitWithin(3024, 4032, 1280)).toEqual({ width: 960, height: 1280 });
  });

  test('leaves an image already inside the bound untouched', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  test('never enlarges, because bigger pixels cost bytes and add nothing', () => {
    expect(fitWithin(64, 48, 1280)).toEqual({ width: 64, height: 48 });
  });

  test('keeps a sliver of an extreme panorama rather than rounding to zero', () => {
    const fitted = fitWithin(8000, 30, THUMB_MAX_EDGE);

    expect(fitted.width).toBe(THUMB_MAX_EDGE);
    expect(fitted.height).toBeGreaterThanOrEqual(1);
  });

  test('handles a square', () => {
    expect(fitWithin(2000, 2000, 128)).toEqual({ width: 128, height: 128 });
  });
});

describe('the quality ladder', () => {
  test('gets strictly smaller and cheaper at every rung', () => {
    const edges = FULL_LADDER.map((step) => step.maxEdge);
    const qualities = FULL_LADDER.map((step) => step.quality);

    expect(edges).toEqual([...edges].sort((a, b) => b - a));
    expect(qualities).toEqual([...qualities].sort((a, b) => b - a));
  });

  test('starts no larger than a phone screen needs and stays a valid quality', () => {
    for (const { maxEdge, quality } of FULL_LADDER) {
      expect(maxEdge).toBeLessThanOrEqual(1280);
      expect(quality).toBeGreaterThan(0);
      expect(quality).toBeLessThanOrEqual(1);
    }
  });
});

describe('IMAGE_DATA_URL_PATTERN', () => {
  test.each([
    'data:image/webp;base64,AAAA',
    'data:image/jpeg;base64,AAAA=',
    'data:image/jpeg;base64,a+/9AB==',
  ])('accepts %s', (value) => {
    expect(IMAGE_DATA_URL_PATTERN.test(value)).toBe(true);
  });

  // Anything that is not an inert image is an <img src> injection risk, and
  // would be refused by the CHECK constraint in migration 0003 anyway.
  test.each([
    'data:text/html;base64,AAAA',
    'data:image/svg+xml;base64,AAAA',
    'data:image/png;base64,AAAA',
    'data:image/webp;base64,',
    'data:image/webp;base64,AA AA',
    'https://example.com/a.webp',
    '',
  ])('refuses %s', (value) => {
    expect(IMAGE_DATA_URL_PATTERN.test(value)).toBe(false);
  });
});

describe('the caps agree with migration 0003', () => {
  test('a thumbnail budget small enough to ride along with every list read', () => {
    expect(MAX_THUMB_CHARS).toBe(20000);
  });

  test('a full-image budget matching the column constraint', () => {
    expect(MAX_FULL_CHARS).toBe(400000);
  });
});

describe('compressImage input guards', () => {
  // These run before any canvas work, so they are the parts worth asserting in
  // jsdom; the encode path itself needs a real browser.
  test('refuses a file that is not an image', async () => {
    // Arrange
    const notAnImage = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

    // Act + Assert
    await expect(compressImage(notAnImage)).rejects.toThrow(ImageCompressionError);
  });

  test('refuses something that is not a file at all', async () => {
    await expect(compressImage('a photo')).rejects.toThrow(ImageCompressionError);
  });

  test('refuses a photo far larger than any phone would produce', async () => {
    const huge = { type: 'image/jpeg', size: MAX_SOURCE_BYTES + 1 };
    Object.setPrototypeOf(huge, Blob.prototype);

    await expect(compressImage(huge)).rejects.toThrow('照片檔案太大，請選 30MB 以下的');
  });

  test('reports in zh-TW, so the message can be shown as-is', async () => {
    const notAnImage = new Blob(['x'], { type: 'text/plain' });

    await expect(compressImage(notAnImage)).rejects.toThrow('請選擇圖片檔');
  });
});
