import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  reserveServiceRunCapacity,
  releaseServiceRunTicketHold,
  cancelServiceRunTicketHold,
  confirmServiceRunTicketHold,
  expireOutdatedServiceRunHolds,
} from '../service-run-capacity';

const userRpcMock = vi.fn();
const serverRpcMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createUserServerClient: vi.fn(async () => ({
    rpc: userRpcMock,
  })),
  createServerClient: vi.fn(async () => ({
    rpc: serverRpcMock,
  })),
}));

const runId = 'a0000001-0000-4000-8000-000000000101';
const passengerId = 'b0000001-0000-4000-8000-000000000201';
const fromId = 'c0000001-0000-4000-8000-000000000301';
const toId = 'c0000001-0000-4000-8000-000000000302';
const ticketId = 'd0000001-0000-4000-8000-000000000401';

describe('service-run-capacity actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reserveServiceRunCapacity returns ticket id on success', async () => {
    userRpcMock.mockResolvedValueOnce({
      data: ticketId,
      error: null,
    });
    const result = await reserveServiceRunCapacity({
      serviceRunId: runId,
      passengerId,
      seats: 1,
      fromPointId: fromId,
      toPointId: toId,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.ticketId).toBe(ticketId);
    }
    expect(userRpcMock).toHaveBeenCalledWith(
      'reserve_service_run_capacity',
      expect.objectContaining({
        p_service_run_id: runId,
        p_passenger_id: passengerId,
        p_seats: 1,
        p_idempotency_key: null,
      }),
    );
  });

  it('reserveServiceRunCapacity passes idempotency key for dedupe (AC6)', async () => {
    userRpcMock.mockResolvedValue({ data: ticketId, error: null });
    await reserveServiceRunCapacity({
      serviceRunId: runId,
      passengerId,
      seats: 1,
      fromPointId: fromId,
      toPointId: toId,
      idempotencyKey: 'checkout-attempt-1',
    });
    expect(userRpcMock).toHaveBeenCalledWith(
      'reserve_service_run_capacity',
      expect.objectContaining({
        p_idempotency_key: 'checkout-attempt-1',
      }),
    );
  });

  it('reserveServiceRunCapacity returns same ticket id on repeated idempotent calls (mock)', async () => {
    userRpcMock.mockResolvedValue({ data: ticketId, error: null });
    const first = await reserveServiceRunCapacity({
      serviceRunId: runId,
      passengerId,
      seats: 1,
      fromPointId: fromId,
      toPointId: toId,
      idempotencyKey: 'same-key',
    });
    const second = await reserveServiceRunCapacity({
      serviceRunId: runId,
      passengerId,
      seats: 1,
      fromPointId: fromId,
      toPointId: toId,
      idempotencyKey: 'same-key',
    });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data.ticketId).toBe(second.data.ticketId);
    }
  });

  it('reserveServiceRunCapacity surfaces capacity_exceeded from RPC (concurrency path)', async () => {
    userRpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'capacity_exceeded', code: 'P0001' },
    });
    const result = await reserveServiceRunCapacity({
      serviceRunId: runId,
      passengerId,
      seats: 99,
      fromPointId: fromId,
      toPointId: toId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('capacity');
    }
  });

  it('releaseServiceRunTicketHold calls release RPC', async () => {
    userRpcMock.mockResolvedValueOnce({ data: null, error: null });
    const result = await releaseServiceRunTicketHold({ ticketId });
    expect(result.ok).toBe(true);
    expect(userRpcMock).toHaveBeenCalledWith('release_service_run_ticket_hold', {
      p_ticket_id: ticketId,
    });
  });

  it('cancelServiceRunTicketHold calls cancel RPC', async () => {
    userRpcMock.mockResolvedValueOnce({ data: null, error: null });
    await cancelServiceRunTicketHold({ ticketId });
    expect(userRpcMock).toHaveBeenCalledWith('cancel_service_run_ticket_hold', {
      p_ticket_id: ticketId,
    });
  });

  it('confirmServiceRunTicketHold calls confirm RPC', async () => {
    userRpcMock.mockResolvedValueOnce({ data: null, error: null });
    await confirmServiceRunTicketHold({ ticketId });
    expect(userRpcMock).toHaveBeenCalledWith('confirm_service_run_ticket_hold', {
      p_ticket_id: ticketId,
    });
  });

  it('expireOutdatedServiceRunHolds uses service client and returns count', async () => {
    serverRpcMock.mockResolvedValueOnce({ data: 3, error: null });
    const result = await expireOutdatedServiceRunHolds();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.expiredCount).toBe(3);
    }
    expect(serverRpcMock).toHaveBeenCalledWith('expire_outdated_service_run_holds');
  });

  it('rejects invalid UUID in reserve payload before RPC', async () => {
    const result = await reserveServiceRunCapacity({
      serviceRunId: 'not-a-uuid',
      passengerId,
      seats: 1,
      fromPointId: fromId,
      toPointId: toId,
    });
    expect(result.ok).toBe(false);
    expect(userRpcMock).not.toHaveBeenCalled();
  });
});
