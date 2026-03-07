// hooks/useCuentasPorPagar.ts
import type { CuentaPorPagar } from '@/pages/cuentasPorPagar/visualizarCuentas/FilaCuentaPorPagar';
import { cuentasPorPagarService } from '@/services/cuentasPorPagar.service';
import useSWR from 'swr';

interface CuentasParams {
  startDate: string;
  endDate: string;
  farmacia?: string;
  estatus?: 'activa' | 'pagada' | 'cancelada';
}

export const useCuentasPorPagar = (params: CuentasParams | null) => {
  const key = params
    ? `cuentas-pagar-${params.farmacia}-${params.startDate}-${params.endDate}-${params.estatus}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => cuentasPorPagarService.getCuentasPorRango(params!),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
    }
  );

  // ✅ Total general (activas + pagadas) basado en la respuesta principal
  const totalCuentasUsd =
    data?.data?.reduce((total, cuenta) => {
      if (cuenta.montoUsd) return total + cuenta.montoUsd;
      if (cuenta.divisa === 'USD') return total + cuenta.monto;
      if (cuenta.divisa === 'Bs' && cuenta.tasa && cuenta.tasa > 0) {
        return total + cuenta.monto / cuenta.tasa;
      }
      return total;
    }, 0) || 0;

  // ✅ Cuentas ACTIVAS: solo filtrado de la data principal
  const cuentasActivas =
    data?.data?.filter((c) => c.estatus === 'activa') || [];

  // ✅ Total ACTIVAS en USD usando el otro servicio (rango grande + estatus=activa)
  const { data: totalActivasDesdeServicio, error: errorActivas } = useSWR(
    params ? `total-cuentas-activas-${params.farmacia || 'all'}` : null,
    () => cuentasPorPagarService.getTotalCuentasActivasUsd(params?.farmacia),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
    }
  );

  const totalActivasUsd = totalActivasDesdeServicio || 0;

  // ✅ Solo cuentas PAGADAS (se mantiene igual)
  const cuentasPagadas =
    data?.data?.filter((c) => c.estatus === 'pagada') || [];
  const totalPagadasUsd = cuentasPagadas.reduce((total, c) => {
    if (c.montoUsd) return total + c.montoUsd;
    if (c.divisa === 'USD') return total + c.monto;
    return total;
  }, 0);

  return {
    cuentas: (data?.data || []) as CuentaPorPagar[],
    totalCuentasUsd,          // Todas (activas + pagadas) del rango actual
    totalActivasUsd,          // Total activas usando getTotalCuentasActivasUsd
    totalPagadasUsd,          // Total pagadas del rango actual
    cuentasActivas,           // Cuentas activas del rango actual
    cuentasPagadas,
    isLoading,
    isError: !!error || !!errorActivas,
    error: error || errorActivas,
    refresh: mutate,
  };
};
