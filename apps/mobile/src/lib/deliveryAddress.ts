// Builds the delivery address sent with an order.
//
// Coordinates are optional on the API. They are included ONLY when a real device location
// was obtained (with the user's permission) and passed in here. There is no default or
// fallback location: if GPS is unavailable, denied, or simply not used, the order carries
// no coordinates at all — never a substitute like a city centre.
//
// Kept free of React Native imports so it can be unit-tested with Node's test runner.

export type DeliveryAddressForm = {
  label: string;
  fullAddress: string;
  contactPhone: string;
};

/** A position actually reported by the device's location provider after permission was granted */
export type DeviceLocation = {
  source: 'device';
  lat: number;
  lng: number;
};

export type OrderDeliveryAddress = DeliveryAddressForm & { lat?: number; lng?: number };

const validCoordinate = (loc: DeviceLocation) =>
  Number.isFinite(loc.lat) && Number.isFinite(loc.lng) &&
  loc.lat >= -90 && loc.lat <= 90 && loc.lng >= -180 && loc.lng <= 180;

export function buildDeliveryAddress(form: DeliveryAddressForm, location: DeviceLocation | null): OrderDeliveryAddress {
  const address: OrderDeliveryAddress = {
    label: form.label,
    fullAddress: form.fullAddress.trim(),
    contactPhone: form.contactPhone,
  };
  if (location && location.source === 'device' && validCoordinate(location)) {
    address.lat = location.lat;
    address.lng = location.lng;
  }
  return address;
}
