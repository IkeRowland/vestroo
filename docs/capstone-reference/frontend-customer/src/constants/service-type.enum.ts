export enum ServiceType {
  BOOKING_HOUR = 'booking_hour',
  BOOKING_SCENIC_ROUTE = 'booking_scenic_route',
  BOOKING_SHARE = 'booking_share',
  BOOKING_DESTINATION = 'booking_destination',
  SCHEDULED_CORPORATE_ROUTE = 'scheduled_corporate_route',
}

export const serviceTypeText: Record<ServiceType, string> = {
  [ServiceType.BOOKING_HOUR]: 'Đặt theo giờ',
  [ServiceType.BOOKING_SCENIC_ROUTE]: 'Đặt lộ trình ngắm cảnh',
  [ServiceType.BOOKING_SHARE]: 'Đặt chia sẻ',
  [ServiceType.BOOKING_DESTINATION]: 'Đặt điểm đến',
  [ServiceType.SCHEDULED_CORPORATE_ROUTE]: 'Đặt xe buýt',
}
