'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBookingStore } from '../hooks/useBookingStore';
import { z } from 'zod';
import type { PlaceResult } from '@/lib/maps';
import { isAirport } from '@/lib/maps';
import { calculateQuote, type SearchParams } from '@/actions/calculateQuote';
import { searchBooking, type BookingSearchResult } from '@/actions/searchBooking';
import { Select } from '@/components/ui/select';

/**
 * Validation schema for booking search form
 */
const searchFormSchema = z.object({
  origin: z.object({
    placeId: z.string(),
    formattedAddress: z.string(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  destination: z.object({
    placeId: z.string(),
    formattedAddress: z.string(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  date: z.date().refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Date must be today or in the future',
  }),
  passengers: z.number().min(1).max(20),
  flightNumber: z.string().optional(),
});

export type SearchFormData = z.infer<typeof searchFormSchema>;

/**
 * Booking Search Form component
 * Matches the desired UI/UX design with tabs and modern layout
 */
export function BookingSearchForm() {
  const router = useRouter();
  const {
    origin,
    destination,
    date,
    passengers,
    flightNumber,
    setTripDetails,
    setQuoteDetails,
  } = useBookingStore();

  const [activeTab, setActiveTab] = useState('create-booking');
  const [originAddress, setOriginAddress] = useState(origin?.formattedAddress || '');
  const [destinationAddress, setDestinationAddress] = useState(
    destination?.formattedAddress || ''
  );
  // Initialize date and time from store, preserving time component
  const getInitialDateAndTime = () => {
    if (date) {
      // Extract time from existing date
      const hours = date.getHours();
      const minutes = date.getMinutes();
      // If time is midnight (00:00), use default 08:00
      if (hours === 0 && minutes === 0) {
        const newDate = new Date(date);
        newDate.setHours(8, 0, 0, 0);
        return { date: newDate, time: '08:00' };
      }
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      return { date: date, time: timeStr };
    }
    const defaultDate = new Date();
    defaultDate.setHours(8, 0, 0, 0); // Set to 08:00 by default
    return { date: defaultDate, time: '08:00' };
  };

  const initialDateTime = getInitialDateAndTime();
  const [selectedDate, setSelectedDate] = useState(initialDateTime.date);
  const [selectedTime, setSelectedTime] = useState(initialDateTime.time);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [returnTime, setReturnTime] = useState('');
  const [passengerCount, setPassengerCount] = useState(passengers || 2);
  const [flightNum, setFlightNum] = useState(flightNumber || '');
  const [returnTrip, setReturnTrip] = useState(false);
  const [babySeat, setBabySeat] = useState(false);
  const [trailer, setTrailer] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showFlightNumber, setShowFlightNumber] = useState(false);
  
  // Modify booking form state
  const [reservationNumber, setReservationNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+27'); // Default to South Africa
  const [phoneNumber, setPhoneNumber] = useState('');
  const [foundBooking, setFoundBooking] = useState<BookingSearchResult | null>(null);
  const [isSearchingBooking, setIsSearchingBooking] = useState(false);

  // Sync date and time from store when it changes, but only if time is not midnight
  useEffect(() => {
    if (date) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      // Only update if the date actually has a time set (not midnight)
      // This prevents overwriting user input with stale midnight dates
      if (hours !== 0 || minutes !== 0) {
        setSelectedDate(date);
        setSelectedTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      }
    }
  }, [date]);

  // Check if origin is an airport
  useEffect(() => {
    if (origin?.isAirport) {
      setShowFlightNumber(true);
    } else {
      setShowFlightNumber(false);
      setFlightNum('');
    }
  }, [origin]);

  // Sync address strings with store and clear errors when locations are set
  useEffect(() => {
    if (origin && origin.formattedAddress !== originAddress) {
      setOriginAddress(origin.formattedAddress);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.origin;
        return newErrors;
      });
    }
  }, [origin, originAddress]);

  useEffect(() => {
    if (destination && destination.formattedAddress !== destinationAddress) {
      setDestinationAddress(destination.formattedAddress);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.destination;
        return newErrors;
      });
    }
  }, [destination, destinationAddress]);

  const handleOriginSelect = (place: PlaceResult) => {
    // Validate that place has required data
    if (!place.place_id || !place.geometry || !place.geometry.location) {
      setErrors((prev) => ({ ...prev, origin: 'Please select a valid location from the dropdown' }));
      return;
    }

    const location = {
      placeId: place.place_id,
      formattedAddress: place.formatted_address,
      name: place.name || place.formatted_address,
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      isAirport: isAirport(place),
    };
    
    setOriginAddress(place.formatted_address);
    setTripDetails({ origin: location });
    
    // Clear error immediately
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.origin;
      return newErrors;
    });
  };

  const handleDestinationSelect = (place: PlaceResult) => {
    // Validate that place has required data
    if (!place.place_id || !place.geometry || !place.geometry.location) {
      setErrors((prev) => ({ ...prev, destination: 'Please select a valid location from the dropdown' }));
      return;
    }

    const location = {
      placeId: place.place_id,
      formattedAddress: place.formatted_address,
      name: place.name || place.formatted_address,
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      isAirport: isAirport(place),
    };
    
    setDestinationAddress(place.formatted_address);
    setTripDetails({ destination: location });
    
    // Clear error immediately
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.destination;
      return newErrors;
    });
  };

  const swapAddresses = () => {
    const tempOrigin = origin;
    const tempOriginAddress = originAddress;
    setOriginAddress(destinationAddress);
    setDestinationAddress(tempOriginAddress);
    if (destination) {
      setTripDetails({ origin: destination });
    }
    if (tempOrigin) {
      setTripDetails({ destination: tempOrigin });
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      // Preserve the time from selectedTime when changing date
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      setSelectedDate(newDate);
      setTripDetails({ date: newDate });
      setErrors((prev) => ({ ...prev, date: '' }));
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    setSelectedTime(timeValue);
    if (timeValue) {
      // Use the current selectedDate state, or fallback to the store date
      const currentDate = selectedDate || date || new Date();
      const [hours, minutes] = timeValue.split(':').map(Number);
      const dateWithTime = new Date(currentDate);
      dateWithTime.setHours(hours, minutes, 0, 0);
      setSelectedDate(dateWithTime); // Update local state
      setTripDetails({ date: dateWithTime }); // Update store
    }
  };

  const handleReturnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      setReturnDate(newDate);
      setErrors((prev) => ({ ...prev, returnDate: '' }));
    }
  };

  const handleReturnTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    setReturnTime(timeValue);
    setErrors((prev) => ({ ...prev, returnTime: '' }));
  };

  const handlePassengerChange = (value: string) => {
    const count = parseInt(value, 10);
    if (!isNaN(count) && count >= 1 && count <= 20) {
      setPassengerCount(count);
      setTripDetails({ passengers: count });
      setErrors((prev) => ({ ...prev, passengers: '' }));
    }
  };

  const handleFlightNumberChange = (value: string) => {
    setFlightNum(value);
    setTripDetails({ flightNumber: value || null });
  };

  const incrementPassengers = () => {
    if (passengerCount < 20) {
      handlePassengerChange((passengerCount + 1).toString());
    }
  };

  const decrementPassengers = () => {
    if (passengerCount > 1) {
      handlePassengerChange((passengerCount - 1).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrors({});
      setIsLoading(true);

      // Get fresh values from store to ensure we have the latest state
      // Access store directly to get current state (not destructured values which might be stale)
      const storeState = useBookingStore.getState();
      const currentOrigin = storeState.origin;
      const currentDestination = storeState.destination;

      // Validate all required fields
      console.log('Form submission - checking validation:', {
        originAddress,
        origin,
        currentOrigin,
        destinationAddress,
        destination,
        currentDestination,
        originExists: !!origin,
        currentOriginExists: !!currentOrigin,
        destinationExists: !!destination,
        currentDestinationExists: !!currentDestination,
      });
      
      // Use current store values for validation
      const originToValidate = currentOrigin || origin;
      const destinationToValidate = currentDestination || destination;
      
      // Check if address is typed but not selected from dropdown
      if (originAddress && !originToValidate) {
        console.log('Origin address typed but not selected from dropdown');
        setErrors((prev) => ({ ...prev, origin: 'Please select a pickup location from the dropdown suggestions' }));
        setIsLoading(false);
        return;
      }
      if (!originToValidate) {
        console.log('No origin selected');
        setErrors((prev) => ({ ...prev, origin: 'Please select a pickup location from the dropdown' }));
        setIsLoading(false);
        return;
      }

      if (destinationAddress && !destinationToValidate) {
        console.log('Destination address typed but not selected from dropdown');
        setErrors((prev) => ({ ...prev, destination: 'Please select a drop-off location from the dropdown suggestions' }));
        setIsLoading(false);
        return;
      }
      if (!destinationToValidate) {
        console.log('No destination selected');
        setErrors((prev) => ({ ...prev, destination: 'Please select a drop-off location from the dropdown' }));
        setIsLoading(false);
        return;
      }
      
      console.log('Validation passed, proceeding with quote calculation');

    if (!selectedDate) {
      setErrors((prev) => ({ ...prev, date: 'Please select a date' }));
      setIsLoading(false);
      return;
    }

    if (!selectedTime) {
      setErrors((prev) => ({ ...prev, time: 'Please select a time' }));
      setIsLoading(false);
      return;
    }

    // Validate return trip fields if enabled
    if (returnTrip) {
      if (!returnDate) {
        setErrors((prev) => ({ ...prev, returnDate: 'Please select a return date' }));
        setIsLoading(false);
        return;
      }
      if (!returnTime) {
        setErrors((prev) => ({ ...prev, returnTime: 'Please select a return time' }));
        setIsLoading(false);
        return;
      }
    }

    // Validate form data with Zod
    try {
      // Ensure we have the latest date and time before submitting
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const dateWithTime = new Date(selectedDate);
      dateWithTime.setHours(hours, minutes, 0, 0);
      
      // Update store with the final date/time before submitting
      setTripDetails({ date: dateWithTime });

      const formData: SearchParams = {
        origin: originToValidate,
        destination: destinationToValidate,
        date: dateWithTime,
        passengers: passengerCount,
        flightNumber: showFlightNumber && flightNum ? flightNum : undefined,
      };

      searchFormSchema.parse(formData);
      
      // Calculate quote
      const result = await calculateQuote(formData);

      if (!result.success) {
        setErrors({ submit: result.error });
        setIsLoading(false);
        return;
      }

      // Store quote details including vehicle options in the store
      setQuoteDetails({
        quoteAmount: result.data.price,
        estimatedDuration: result.data.estimatedDuration,
        distance: result.data.distance,
        vehicleOptions: result.data.vehicleOptions,
      });

      // Navigate to quote page
      router.push('/book/quote');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ submit: 'An error occurred. Please try again.' });
      }
      setIsLoading(false);
    }
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle modify booking form submission
  const handleSearchReservation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setIsSearchingBooking(true);

    try {
      const result = await searchBooking({
        reservationNumber,
        countryCode,
        phoneNumber,
      });

      if (!result.success) {
        setErrors({ search: result.error });
        setIsSearchingBooking(false);
        return;
      }

      setFoundBooking(result.data);
      setIsSearchingBooking(false);
    } catch (error) {
      console.error('Error searching reservation:', error);
      setErrors({ search: 'An error occurred. Please try again.' });
      setIsSearchingBooking(false);
    }
  };

  // Handle modify booking action
  const handleModifyBooking = () => {
    if (foundBooking) {
      // Navigate to modify page with booking ID
      router.push(`/book/modify?id=${foundBooking.id}`);
    }
  };

  // Handle cancel booking action
  const handleCancelBooking = () => {
    if (foundBooking) {
      // Navigate to cancel page with booking ID
      router.push(`/book/cancel?id=${foundBooking.id}`);
    }
  };

  // Reset modify booking form when switching tabs
  useEffect(() => {
    if (activeTab === 'create-booking') {
      setFoundBooking(null);
      setReservationNumber('');
      setPhoneNumber('');
      setErrors({});
    }
  }, [activeTab]);

  return (
    <div className="w-full min-w-[320px] mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between px-4 pt-3 pb-2.5 bg-gray-100 border-b border-gray-200 gap-2">
        <TabsList className="flex gap-0">
          <TabsTrigger
            value="create-booking"
            isActive={activeTab === 'create-booking'}
            onClick={() => setActiveTab('create-booking')}
            className="rounded-t-lg"
          >
            Create New Booking
          </TabsTrigger>
          <TabsTrigger
            value="modify-booking"
            isActive={activeTab === 'modify-booking'}
            onClick={() => setActiveTab('modify-booking')}
            className="rounded-t-lg"
          >
            Modify or Cancel Booking
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="px-4 py-4 space-y-4 bg-white">
      {activeTab === 'modify-booking' ? (
        // Modify Booking Form
        <div className="space-y-6 w-full">
          {!foundBooking ? (
            <form onSubmit={handleSearchReservation} className="space-y-6 w-full">
              {/* Booking Search */}
              <div className="space-y-3 w-full">
                <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Booking Search</h2>
                <div className="space-y-3 w-full">
                  <div className="space-y-1.5">
                    <Label htmlFor="reservation-number" className="text-xs font-medium text-gray-700">
                      Reservation Number
                    </Label>
                    <Input
                      id="reservation-number"
                      type="text"
                      value={reservationNumber}
                      onChange={(e) => setReservationNumber(e.target.value)}
                      placeholder="Enter reservation number"
                      required
                      className="h-12 text-xs font-bold w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="country-code" className="text-xs font-medium text-gray-700">
                        Country code
                      </Label>
                      <Select
                        id="country-code"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-12 text-xs font-bold w-full"
                      >
                        <option value="+27">+27 (ZA)</option>
                        <option value="+1">+1 (US/CA)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+61">+61 (AU)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+234">+234 (NG)</option>
                        <option value="+254">+254 (KE)</option>
                        <option value="+260">+260 (ZM)</option>
                        <option value="+263">+263 (ZW)</option>
                        <option value="+264">+264 (NA)</option>
                        <option value="+265">+265 (MW)</option>
                        <option value="+266">+266 (LS)</option>
                        <option value="+267">+267 (BW)</option>
                        <option value="+268">+268 (SZ)</option>
                        <option value="+269">+269 (KM)</option>
                      </Select>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <Label htmlFor="phone-number" className="text-xs font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <Input
                        id="phone-number"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Phone Number"
                        required
                        className="h-12 text-xs font-bold w-full"
                      />
                    </div>
                  </div>

                  {errors.search && (
                    <p className="text-xs text-red-500" role="alert">{errors.search}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#bc4328] hover:bg-[#a83a22] active:bg-[#95301c] text-white py-3.5 text-sm font-medium rounded-lg shadow-md transition-colors"
                disabled={isSearchingBooking}
              >
                {isSearchingBooking ? 'Searching...' : 'Search Reservation'}
              </Button>
            </form>
          ) : (
            // Booking Found - Show Modify/Cancel Options
            <div className="space-y-6 w-full">
              {/* Booking Details */}
              <div className="space-y-3 w-full">
                <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Booking Details</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">Reservation: <span className="font-normal">{foundBooking.reservationNumber}</span></p>
                    <p className="font-semibold mb-1">Customer: <span className="font-normal">{foundBooking.customerName}</span></p>
                    <p className="font-semibold mb-1">Route: <span className="font-normal">{foundBooking.origin} → {foundBooking.destination}</span></p>
                    <p className="font-semibold mb-1">Date: <span className="font-normal">{new Date(foundBooking.pickupDateTime).toLocaleDateString()}</span></p>
                    <p className="font-semibold mb-1">Status: <span className="font-normal">{foundBooking.status}</span></p>
                    <p className="font-semibold">Payment Status: <span className="font-normal">{foundBooking.paymentStatus}</span></p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 w-full">
                <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Actions</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleModifyBooking}
                    className="flex-1 bg-[#bc4328] hover:bg-[#a83a22] active:bg-[#95301c] text-white py-3.5 text-sm font-medium rounded-lg shadow-md transition-colors"
                  >
                    Modify Booking
                  </Button>
                  <Button
                    onClick={handleCancelBooking}
                    className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3.5 text-sm font-medium rounded-lg shadow-md transition-colors"
                  >
                    Cancel Booking
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    setFoundBooking(null);
                    setReservationNumber('');
                    setPhoneNumber('');
                    setErrors({});
                  }}
                  variant="outline"
                  className="w-full py-3.5 text-sm font-medium rounded-lg"
                >
                  Search Another Booking
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Create New Booking Form
      <form onSubmit={handleSubmit} className="space-y-6 w-full">
        {/* Ride Details */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Ride Details</h2>
          <div className="space-y-2 w-full">
            {/* Pickup Address - Button Style */}
            <div className="relative w-full">
              <AddressAutocomplete
                label=""
                value={originAddress}
                onChange={setOriginAddress}
                onSelect={handleOriginSelect}
                placeholder="Pickup Address"
                required
                error={errors.origin}
                buttonStyle={true}
                inputId="pickup-address-input"
                icon="pickup"
              />
            </div>

            {/* Dropoff Address - Button Style with Swap Button */}
            <div className="flex items-start gap-2 w-full">
              <div className="flex-1 min-w-0 relative">
                <AddressAutocomplete
                  label=""
                  value={destinationAddress}
                  onChange={setDestinationAddress}
                  onSelect={handleDestinationSelect}
                  placeholder="Dropoff Address"
                  required
                  error={errors.destination}
                  buttonStyle={true}
                  inputId="dropoff-address-input"
                  icon="dropoff"
                />
              </div>
              {/* Swap Button - Positioned to the right, aligned with both fields */}
              <button
                type="button"
                onClick={swapAddresses}
                className="h-12 w-12 rounded-full bg-[#bc4328] text-white flex items-center justify-center hover:bg-[#a83a22] active:bg-[#95301c] transition-colors flex-shrink-0 shadow-md"
                aria-label="Swap addresses"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </button>
            </div>
            {errors.origin && (
              <p className="text-xs text-red-500" role="alert">{errors.origin}</p>
            )}
            {errors.destination && (
              <p className="text-xs text-red-500" role="alert">{errors.destination}</p>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Date & Time</h2>
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="date" className="text-xs font-medium text-gray-700" required>Date</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={formatDateForInput(selectedDate)}
                  onChange={handleDateChange}
                  required
                  className="h-12 text-xs font-bold w-full"
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
              </div>
              {errors.date && (
                <p className="text-xs text-red-500" role="alert">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="time" className="text-xs font-medium text-gray-700" required>Time</Label>
              <div className="relative">
                <div className="absolute left-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={handleTimeChange}
                  required
                  className="pl-10 pr-10 h-12 text-xs font-bold w-full"
                />
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
              </div>
              {errors.time && (
                <p className="text-xs text-red-500" role="alert">{errors.time}</p>
              )}
            </div>
          </div>
          
          {/* Return Date & Time - Only show when return trip is enabled */}
          {returnTrip && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="return-date" className="text-xs font-medium text-gray-700" required>Return Date</Label>
                <div className="relative">
                  <Input
                    id="return-date"
                    type="date"
                    value={returnDate ? formatDateForInput(returnDate) : ''}
                    onChange={handleReturnDateChange}
                    required={returnTrip}
                    className="h-12 text-xs font-bold w-full"
                  />
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                </div>
                {errors.returnDate && (
                  <p className="text-xs text-red-500" role="alert">{errors.returnDate}</p>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="return-time" className="text-xs font-medium text-gray-700" required>Return Time</Label>
                <div className="relative">
                  <div className="absolute left-3 top-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <Input
                    id="return-time"
                    type="time"
                    value={returnTime}
                    onChange={handleReturnTimeChange}
                    required={returnTrip}
                    className="pl-10 pr-10 h-12 text-xs font-bold w-full"
                  />
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </div>
                </div>
                {errors.returnTime && (
                  <p className="text-xs text-red-500" role="alert">{errors.returnTime}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-1">
            <Label htmlFor="return-trip" className="text-xs font-normal text-gray-700 cursor-pointer">Add return trip</Label>
            <Switch
              id="return-trip"
              checked={returnTrip}
              onCheckedChange={setReturnTrip}
            />
          </div>
        </div>

        {/* No. of Passengers */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">No. of Passengers</h2>
          <div className="relative max-w-xs">
            <Input
              type="number"
              min="1"
              max="20"
              value={passengerCount}
              onChange={(e) => handlePassengerChange(e.target.value)}
              required
              className="pr-12 h-12 text-xs font-bold w-full"
              placeholder="No. Of Passengers"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-0">
              <button
                type="button"
                onClick={incrementPassengers}
                className="h-4 w-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Increase passengers"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={decrementPassengers}
                className="h-4 w-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Decrease passengers"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>
          {errors.passengers && (
            <p className="text-xs text-red-500" role="alert">{errors.passengers}</p>
          )}
        </div>

        {/* Additional Request */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Additional Request</h2>
          <div className="space-y-2">
            <Checkbox
              id="baby-seat"
              label="Add baby seat"
              checked={babySeat}
              onChange={(e) => setBabySeat(e.target.checked)}
            />
            <Checkbox
              id="trailer"
              label="Trailer"
              checked={trailer}
              onChange={(e) => setTrailer(e.target.checked)}
            />
          </div>
        </div>

        {/* Special Instruction */}
        <div className="space-y-3 w-full">
          <h2 className="text-xs font-semibold text-gray-800 font-Poppins uppercase tracking-wider">Special Instruction</h2>
          <Textarea
            placeholder="Please enter note"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            rows={3}
            className="h-12 text-xs font-bold w-full"
          />
        </div>

        {/* Flight Number (conditional) */}
        {showFlightNumber && (
          <div className="space-y-2">
            <Label htmlFor="flightNumber">Flight Number (Optional)</Label>
            <Input
              id="flightNumber"
              type="text"
              value={flightNum}
              onChange={(e) => handleFlightNumberChange(e.target.value)}
              placeholder="e.g., SA123"
            />
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800" role="alert">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-[#bc4328] hover:bg-[#a83a22] active:bg-[#95301c] text-white py-3.5 text-sm font-medium rounded-lg shadow-md transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Calculating Quote...' : 'Get Instant Quote'}
        </Button>
      </form>
      )}
      </div>
    </div>
  );
}
