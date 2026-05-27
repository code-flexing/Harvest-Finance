import { RealtimeGateway } from './realtime.gateway';

const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

describe('RealtimeGateway – alert broadcasting', () => {
  let gateway: RealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new RealtimeGateway();
    gateway.server = { to: mockTo } as any;
  });

  describe('emitAlert', () => {
    it('sends to "admin" room when target is "admin"', () => {
      const payload = { message: 'threshold exceeded' };
      gateway.emitAlert('admin', payload);

      expect(mockTo).toHaveBeenCalledWith('admin');
      expect(mockEmit).toHaveBeenCalledWith('alert:threshold', payload);
    });

    it('sends to "farmer:<id>" room when target is a farmer id', () => {
      const payload = { message: 'low balance' };
      gateway.emitAlert('farmer-42', payload);

      expect(mockTo).toHaveBeenCalledWith('farmer:farmer-42');
      expect(mockEmit).toHaveBeenCalledWith('alert:threshold', payload);
    });

    it('does NOT broadcast admin alerts to farmer rooms', () => {
      gateway.emitAlert('admin', { message: 'admin only' });

      const room: string = mockTo.mock.calls[0][0];
      expect(room).not.toMatch(/^farmer:/);
    });

    it('does NOT broadcast farmer alerts to admin room', () => {
      gateway.emitAlert('farmer-7', { message: 'farmer only' });

      const room: string = mockTo.mock.calls[0][0];
      expect(room).not.toBe('admin');
    });
  });
});
