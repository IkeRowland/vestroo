import { BookingEmailData } from './email';

/**
 * Format currency amount (ZAR)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
}

/**
 * Format date and time for display
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

/**
 * Format date for display (date only)
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

/**
 * Format time for display (time only)
 */
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  }).format(date);
}

/**
 * Render booking confirmation email (HTML)
 */
export function renderBookingConfirmationEmailHTML(data: BookingEmailData): string {
  const formattedAmount = formatCurrency(data.totalAmount);
  const formattedDate = formatDate(data.pickupDateTime);
  const formattedTime = formatTime(data.pickupDateTime);
  const formattedDateTime = formatDateTime(data.pickupDateTime);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - ${data.bookingId}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Vestroo</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">Booking Confirmation</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Dear ${data.customerName},</p>
              
              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for booking with Vestroo! Your booking has been confirmed and payment has been successfully processed.
              </p>
              
              <!-- Booking Details Card -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 30px 0; border-left: 4px solid #667eea;">
                <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px; font-weight: 600;">Booking Details</h2>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Booking Reference:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${data.bookingId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Route:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${data.origin} → ${data.destination}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Pickup Date & Time:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${formattedDateTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Passengers:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${data.passengerCount} ${data.passengerCount === 1 ? 'passenger' : 'passengers'}</td>
                  </tr>
                  ${data.flightNumber ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Flight Number:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${data.flightNumber}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <!-- Payment Information Card -->
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 30px; margin: 30px 0; border-left: 4px solid #10b981;">
                <h2 style="margin: 0 0 20px; color: #333333; font-size: 20px; font-weight: 600;">Payment Information</h2>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Total Amount Paid:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 18px; font-weight: 700; color: #10b981;">${formattedAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Payment Reference:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${data.paymentReference}</td>
                  </tr>
                  ${data.transactionId ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Transaction ID:</td>
                    <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: 600;">${data.transactionId}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #666666; font-size: 14px;">Payment Status:</td>
                    <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 600;">✓ Confirmed</td>
                  </tr>
                </table>
              </div>
              
              <!-- Instructions -->
              <div style="background-color: #fff7ed; border-radius: 8px; padding: 30px; margin: 30px 0; border-left: 4px solid #f59e0b;">
                <h2 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">What to Expect</h2>
                <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.8;">
                  <li>Your driver will arrive at the pickup location on <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong></li>
                  <li>Please ensure you're ready 10 minutes before the scheduled pickup time</li>
                  <li>Have your booking reference (${data.bookingId}) ready for verification</li>
                  ${data.flightNumber ? `<li>We'll monitor your flight (${data.flightNumber}) for any delays</li>` : ''}
                </ul>
              </div>
              
              <!-- Contact Information -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <h2 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Need Help?</h2>
                <p style="margin: 0 0 10px; color: #333333; font-size: 14px; line-height: 1.6;">
                  If you have any questions or need to make changes to your booking, please contact our support team:
                </p>
                <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                  <strong>Email:</strong> support@vestroo.com<br>
                  <strong>Phone:</strong> +27 (0) 11 123 4567<br>
                  <strong>Hours:</strong> Monday - Sunday, 24/7
                </p>
              </div>
              
              <!-- Footer Note -->
              <p style="margin: 30px 0 0; color: #666666; font-size: 12px; line-height: 1.6; text-align: center;">
                Please save or print this confirmation for your records. This email serves as your booking receipt.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 12px;">
                © ${new Date().getFullYear()} Vestroo. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 11px;">
                This is an automated confirmation email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Render booking confirmation email (Plain Text)
 */
export function renderBookingConfirmationEmailText(data: BookingEmailData): string {
  const formattedAmount = formatCurrency(data.totalAmount);
  const formattedDateTime = formatDateTime(data.pickupDateTime);

  return `
BOOKING CONFIRMATION - ${data.bookingId}

Dear ${data.customerName},

Thank you for booking with Vestroo! Your booking has been confirmed and payment has been successfully processed.

BOOKING DETAILS
---------------
Booking Reference: ${data.bookingId}
Route: ${data.origin} → ${data.destination}
Pickup Date & Time: ${formattedDateTime}
Passengers: ${data.passengerCount} ${data.passengerCount === 1 ? 'passenger' : 'passengers'}
${data.flightNumber ? `Flight Number: ${data.flightNumber}\n` : ''}

PAYMENT INFORMATION
-------------------
Total Amount Paid: ${formattedAmount}
Payment Reference: ${data.paymentReference}
${data.transactionId ? `Transaction ID: ${data.transactionId}\n` : ''}Payment Status: ✓ Confirmed

WHAT TO EXPECT
--------------
- Your driver will arrive at the pickup location on ${formatDate(data.pickupDateTime)} at ${formatTime(data.pickupDateTime)}
- Please ensure you're ready 10 minutes before the scheduled pickup time
- Have your booking reference (${data.bookingId}) ready for verification
${data.flightNumber ? `- We'll monitor your flight (${data.flightNumber}) for any delays\n` : ''}

NEED HELP?
----------
If you have any questions or need to make changes to your booking, please contact our support team:

Email: support@vestroo.com
Phone: +27 (0) 11 123 4567
Hours: Monday - Sunday, 24/7

Please save or print this confirmation for your records. This email serves as your booking receipt.

---
© ${new Date().getFullYear()} Vestroo. All rights reserved.
This is an automated confirmation email. Please do not reply to this message.
  `.trim();
}

/**
 * Render booking confirmation email (both HTML and text)
 */
export function renderBookingConfirmationEmail(data: BookingEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  return {
    html: renderBookingConfirmationEmailHTML(data),
    text: renderBookingConfirmationEmailText(data),
    subject: `Booking Confirmation - ${data.bookingId}`,
  };
}

