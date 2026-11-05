import { PayoutsScreen } from '../../src/components/Payouts';

export default function DriverPayouts() {
  return <PayoutsScreen path="/delivery/me/settlements" cashHint="still need the cash confirmed on the delivery screen before they count." />;
}
