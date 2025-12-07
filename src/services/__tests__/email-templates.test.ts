import { describe, it, expect } from 'vitest';
import {
  renderBookingConfirmationEmail,
  renderBookingConfirmationEmailHTML,
  renderBookingConfirmationEmailText,
} from '../email-templates';
import { BookingEmailData } from '../email';

describe('Email Templates', () => {
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

  describe('renderBookingConfirmationEmail', () => {
    it('should generate HTML, text, and subject', () => {
      const result = renderBookingConfirmationEmail(mockBookingData);

      expect(result.html).toBeTruthy();
      expect(result.text).toBeTruthy();
      expect(result.subject).toBe(`Booking Confirmation - ${mockBookingData.bookingId}`);
    });

    it('should include booking reference in subject', () => {
      const result = renderBookingConfirmationEmail(mockBookingData);
      expect(result.subject).toContain(mockBookingData.bookingId);
    });
  });

  describe('renderBookingConfirmationEmailHTML', () => {
    it('should include all booking details', () => {
      const html = renderBookingConfirmationEmailHTML(mockBookingData);

      expect(html).toContain(mockBookingData.bookingId);
      expect(html).toContain(mockBookingData.customerName);
      expect(html).toContain(mockBookingData.origin);
      expect(html).toContain(mockBookingData.destination);
      expect(html).toContain(mockBookingData.paymentReference);
      // Check for currency amount (format may vary by locale, but should contain "450")
      expect(html).toMatch(/R\s*450[,.]00/); // Formatted currency (South African format)
    });

    it('should include flight number when provided', () => {
      const html = renderBookingConfirmationEmailHTML(mockBookingData);
      expect(html).toContain(mockBookingData.flightNumber);
    });

    it('should not include flight number section when not provided', () => {
      const dataWithoutFlight = {
        ...mockBookingData,
        flightNumber: null,
      };
      const html = renderBookingConfirmationEmailHTML(dataWithoutFlight);
      // Should not contain flight number in the details section
      expect(html).not.toContain(`Flight Number: ${mockBookingData.flightNumber}`);
    });

    it('should include passenger count', () => {
      const html = renderBookingConfirmationEmailHTML(mockBookingData);
      expect(html).toContain('2 passengers');
    });

    it('should use singular "passenger" for count of 1', () => {
      const singlePassengerData = {
        ...mockBookingData,
        passengerCount: 1,
      };
      const html = renderBookingConfirmationEmailHTML(singlePassengerData);
      expect(html).toContain('1 passenger');
      expect(html).not.toContain('1 passengers');
    });

    it('should include contact information', () => {
      const html = renderBookingConfirmationEmailHTML(mockBookingData);
      expect(html).toContain('support@vestroo.com');
      expect(html).toContain('Need Help?');
    });

    it('should be mobile-responsive (viewport meta tag)', () => {
      const html = renderBookingConfirmationEmailHTML(mockBookingData);
      expect(html).toContain('viewport');
      expect(html).toContain('width=device-width');
    });
  });

  describe('renderBookingConfirmationEmailText', () => {
    it('should include all booking details', () => {
      const text = renderBookingConfirmationEmailText(mockBookingData);

      expect(text).toContain(mockBookingData.bookingId);
      expect(text).toContain(mockBookingData.customerName);
      expect(text).toContain(mockBookingData.origin);
      expect(text).toContain(mockBookingData.destination);
      expect(text).toContain(mockBookingData.paymentReference);
      // Check for currency amount (format may vary by locale, but should contain "450")
      expect(text).toMatch(/R\s*450[,.]00/); // Formatted currency (South African format)
    });

    it('should include flight number when provided', () => {
      const text = renderBookingConfirmationEmailText(mockBookingData);
      expect(text).toContain(mockBookingData.flightNumber);
    });

    it('should not include flight number when not provided', () => {
      const dataWithoutFlight = {
        ...mockBookingData,
        flightNumber: null,
      };
      const text = renderBookingConfirmationEmailText(dataWithoutFlight);
      // Should not contain the flight number line
      expect(text).not.toContain(`Flight Number: ${mockBookingData.flightNumber}`);
    });

    it('should include passenger count', () => {
      const text = renderBookingConfirmationEmailText(mockBookingData);
      expect(text).toContain('2 passengers');
    });

    it('should use singular "passenger" for count of 1', () => {
      const singlePassengerData = {
        ...mockBookingData,
        passengerCount: 1,
      };
      const text = renderBookingConfirmationEmailText(singlePassengerData);
      expect(text).toContain('1 passenger');
      expect(text).not.toContain('1 passengers');
    });

    it('should include contact information', () => {
      const text = renderBookingConfirmationEmailText(mockBookingData);
      expect(text).toContain('support@vestroo.com');
      expect(text).toContain('NEED HELP?');
    });

    it('should have clear section headers', () => {
      const text = renderBookingConfirmationEmailText(mockBookingData);
      expect(text).toContain('BOOKING DETAILS');
      expect(text).toContain('PAYMENT INFORMATION');
      expect(text).toContain('WHAT TO EXPECT');
    });
  });
});

