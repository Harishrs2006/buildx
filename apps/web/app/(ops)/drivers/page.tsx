'use client';

import { EmptyState, ErrorNote, PageHead, Pill } from '../../../components/ui';
import { errorText, opsApi, populated, useLoad } from '../../../lib/ops';

const VEHICLE: Record<string, string> = {
  BIKE: 'Bike', AUTO: 'Auto', MINI_TRUCK: 'Mini truck', TEMPO: 'Tempo', TRUCK: 'Truck', TRACTOR: 'Tractor',
};

export default function DriversPage() {
  const { state } = useLoad(opsApi.drivers, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Delivery" title="Drivers">
        <p className="max-w-sm text-[15px] text-stone">Who is on duty and how many deliveries each driver has on hand right now.</p>
      </PageHead>

      {state.status === 'loading' && <div className="skeleton h-64" role="status" aria-label="Loading drivers" />}
      {state.status === 'error' && <ErrorNote>{errorText(state.error, 'Couldn’t load drivers.')}</ErrorNote>}
      {state.status === 'success' && (
        state.data.length === 0 ? (
          <EmptyState icon="local_shipping" title="No drivers yet" body="Delivery partners appear here after they sign up in the BuildX app." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.map((d) => {
              const u = populated(d.userId);
              return (
                <li key={d._id} className="card flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {u?.isActive === false ? <Pill tone="bad">Suspended</Pill> : d.isAvailable ? <Pill tone="live">On duty</Pill> : <Pill tone="muted">Off duty</Pill>}
                    {d.activeOrders > 0 && <Pill tone="active">{d.activeOrders} on hand</Pill>}
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold">{u?.name ?? 'Driver'}</p>
                    {u?.phone && <a href={`tel:${u.phone}`} className="font-mono text-[14px] text-cobalt hover:underline">{u.phone}</a>}
                  </div>
                  <p className="text-[14px] text-stone">
                    {VEHICLE[d.vehicleType] ?? d.vehicleType} · <span className="font-mono">{d.vehicleNumber}</span>
                    {typeof d.totalDeliveries === 'number' && <> · {d.totalDeliveries} delivered</>}
                  </p>
                  {(d.serviceAreas ?? []).length > 0 && <p className="text-[13px] text-stone">Areas: {d.serviceAreas!.join(', ')}</p>}
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
