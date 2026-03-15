import { encodeCursor, decodeCursor, CursorPayload } from './cursor';

describe('cursor', () => {
  const secret = 'test-secret';

  it('encodeCursor then decodeCursor returns same payload', () => {
    const payload: CursorPayload = { createdAt: '2024-01-15T10:00:00.000Z', id: 'cuid123' };
    const encoded = encodeCursor(payload, secret);
    expect(encoded).toContain('.');
    const decoded = decodeCursor(encoded, secret);
    expect(decoded).toEqual(payload);
  });

  it('decodeCursor throws on invalid signature', () => {
    const payload: CursorPayload = { createdAt: '2024-01-15T10:00:00.000Z', id: 'cuid123' };
    const encoded = encodeCursor(payload, secret);
    const [part1, part2] = encoded.split('.');
    const tampered = `${part1}.${part2.slice(0, -1)}x`;
    expect(() => decodeCursor(tampered, secret)).toThrow('Invalid cursor signature');
  });

  it('decodeCursor throws on wrong secret', () => {
    const payload: CursorPayload = { createdAt: '2024-01-15T10:00:00.000Z', id: 'cuid123' };
    const encoded = encodeCursor(payload, secret);
    expect(() => decodeCursor(encoded, 'other-secret')).toThrow('Invalid cursor signature');
  });

  it('decodeCursor throws on invalid format (no dot)', () => {
    expect(() => decodeCursor('noseparator', secret)).toThrow('Invalid cursor format');
  });
});
