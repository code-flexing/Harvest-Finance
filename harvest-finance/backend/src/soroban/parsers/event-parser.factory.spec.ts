import { EventParserFactory } from './event-parser.factory';

describe('EventParserFactory', () => {
  let factory: EventParserFactory;

  beforeEach(() => {
    factory = new EventParserFactory();
  });

  it('returns registered versions', () => {
    expect(factory.registeredVersions()).toEqual(expect.arrayContaining(['v1', 'v2']));
  });

  it('getParser returns null for unknown version', () => {
    expect(factory.getParser('v99')).toBeNull();
  });

  describe('v1 parser', () => {
    it('parses well-formed event', () => {
      const result = factory.parse('v1', ['escrow_funded'], { amount: 100, actor: 'G...' });
      expect(result).toMatchObject({
        eventName: 'escrow_funded',
        contractVersion: 'v1',
        data: { amount: 100, actor: 'G...' },
      });
    });

    it('returns null for empty topics', () => {
      expect(factory.parse('v1', [], null)).toBeNull();
    });
  });

  describe('v2 parser', () => {
    it('parses well-formed event', () => {
      const result = factory.parse('v2', ['escrow', 'funded'], { amount: 200, actor: 'G...', memo: 'test' });
      expect(result).toMatchObject({
        eventName: 'escrow.funded',
        contractVersion: 'v2',
        data: { amount: 200, actor: 'G...', memo: 'test' },
      });
    });

    it('returns null when fewer than two topics', () => {
      expect(factory.parse('v2', ['only_one'], null)).toBeNull();
    });
  });

  it('logs warning and returns null for unknown version', () => {
    const warnSpy = jest.spyOn((factory as any).logger, 'warn').mockImplementation();
    const result = factory.parse('v99', ['topic'], null);
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('v99'));
  });
});
