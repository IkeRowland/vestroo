import { Resend } from 'resend';
import { renderBookingConfirmationEmail } from './email-templates';

/**
 * Email service configuration
 * Exported for testing purposes
 */
export const createResendClient = () => {
  return new Resend(process.env.RESEND_API_KEY);
};

// Lazy initialization to avoid errors during build time
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = createResendClient();
  }
  return resend;
}

/**
 * Email sending configuration
 */
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@vestroo.com';
const FROM_NAME = 'Vestroo';

/**
 * Booking email data interface
 */
export interface BookingEmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  origin: string;
  destination: string;
  pickupDateTime: Date;
  passengerCount: number;
  flightNumber?: string | null;
  totalAmount: number;
  paymentReference: string;
  transactionId?: string | null;
}

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Retry configuration for email sending
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 4000, // 4 seconds
  backoffMultiplier: 2,
};

/**
 * Check if error is retryable (network errors, rate limits, etc.)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502')
    );
  }
  return false;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send booking confirmation email with retry logic
 */
export async function sendBookingConfirmation(
  data: BookingEmailData
): Promise<EmailResult> {
  // Validate email service configuration
  if (!process.env.RESEND_API_KEY) {
    const error = 'RESEND_API_KEY not configured';
    console.error(`[Email Service] ${error}`);
    return {
      success: false,
      error,
    };
  }

  // Validate customer email
  if (!data.customerEmail || !isValidEmail(data.customerEmail)) {
    const error = `Invalid customer email: ${data.customerEmail}`;
    console.error(`[Email Service] ${error}`);
    return {
      success: false,
      error,
    };
  }

  // Validate booking status (should be 'paid' before sending email)
  // This is validated in the webhook handler before calling this function

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Generate email content
      const { html, text, subject } = renderBookingConfirmationEmail(data);

      // Send email via Resend
      const client = getResendClient();
      const result = await client.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: data.customerEmail,
        subject,
        html,
        text,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Unknown email service error');
      }

      // Success
      console.log(
        `[Email Service] Confirmation email sent successfully for booking ${data.bookingId}. Message ID: ${result.data?.id}`
      );

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Log error
      console.error(
        `[Email Service] Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1} failed for booking ${data.bookingId}:`,
        lastError.message
      );

      // Check if error is retryable
      if (!isRetryableError(error) || attempt === RETRY_CONFIG.maxRetries) {
        // Non-retryable error or max retries reached
        return {
          success: false,
          error: lastError.message,
        };
      }

      // Wait before retry (exponential backoff)
      const delay = calculateBackoffDelay(attempt);
      console.log(
        `[Email Service] Retrying in ${delay}ms for booking ${data.bookingId}...`
      );
      await sleep(delay);
    }
  }

  // Should not reach here, but handle edge case
  return {
    success: false,
    error: lastError?.message || 'Unknown error occurred',
  };
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

