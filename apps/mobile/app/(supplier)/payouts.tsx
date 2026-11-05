import { PayoutsScreen } from '../../src/components/Payouts';

export default function SupplierPayouts() {
  return <PayoutsScreen path="/suppliers/me/settlements" cashHint="still need the cash confirmed on the Orders tab before they count." />;
}
