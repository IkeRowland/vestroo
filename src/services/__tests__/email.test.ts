import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use global object to avoid hoisting issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).__resendMockSend = vi.fn();

// Mock Resend module before importing email service
vi.mock('resend', () => {
  return {
    Resend: class {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(apiKey: string) {
        // Constructor accepts API key but doesn't need to do anything
      }
      get emails() {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          send: (global as any).__resendMockSend,
        };
      }
    },
  };
});

// Import after mock
import { sendBookingConfirmation, BookingEmailData } from '../email';

describe('Email Service', () => {
  const mockBookingData: BookingEmailData = {
    bookingId: 'test-booking-123',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    origin: 'OR Tambo Airport',
    destination: 'Sandton City',
    pickupDateTime: new Date('2024-12-25T10:00:00Z'),
    passengerCount: 2,
    flightNumber: 'SA123',
    totalAmount: 450.0,
    paymentReference: 'PF-123456',
    transactionId: 'TXN-789',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getMockSend = () => (global as any).__resendMockSend;

  beforeEach(() => {
    // Set required environment variables
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_EMAIL = 'noreply@vestroo.com';
    const mockSend = getMockSend();
    if (mockSend) {
      mockSend.mockClear();
      mockSend.mockReset();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendBookingConfirmation', () => {
    it('should send email successfully', async () => {
      const mockSend = getMockSend();
      mockSend.mockResolvedValueOnce({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await sendBookingConfirmation(mockBookingData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return error if RESEND_API_KEY is not configured', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendBookingConfirmation(mockBookingData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('RESEND_API_KEY not configured');
    });

    it('should return error for invalid email address', async () => {
      const invalidData = {
        ...mockBookingData,
        customerEmail: 'invalid-email',
      };

      const result = await sendBookingConfirmation(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer email');
    });

    it('should retry on network errors', async () => {
      const mockSend = getMockSend();
      const networkError = new Error('Network timeout');
      mockSend
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: { id: 'email-123' },
          error: null,
        });

      const result = await sendBookingConfirmation(mockBookingData);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      const mockSend = getMockSend();
      const nonRetryableError = new Error('Invalid API key');
      mockSend.mockRejectedValue(nonRetryableError);

      const result = await sendBookingConfirmation(mockBookingData);

      expect(result.success).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1); // No retries
    });

    it('should handle Resend API errors', async () => {
      const mockSend = getMockSend();
      // Mock API error response - use a non-retryable error message to avoid retries
      mockSend.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Invalid API key',
        },
      });

      const result = await sendBookingConfirmation(mockBookingData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
      expect(mockSend).toHaveBeenCalledTimes(1); // No retries for non-retryable errors
    });

    it('should handle missing flight number', async () => {
      const mockSend = getMockSend();
      // Clear any previous mocks
      mockSend.mockClear();
      const dataWithoutFlight = {
        ...mockBookingData,
        flightNumber: null,
      };

      mockSend.mockResolvedValueOnce({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await sendBookingConfirmation(dataWithoutFlight);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
