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
    // Usamos params directamente del closure para evitar problemas de tipos en el array
    () => cuentasPorPagarService.getCuentasPorRango(params!),
    {
      revalidateOnFocus: false,    // ⚡ No cargar al cambiar de pestaña navegador
      revalidateIfStale: false,    // ⚡ Usar caché si ya existe sin preguntar de nuevo
      revalidateOnReconnect: true, // Reintentar solo si se cae el internet
      dedupingInterval: 60000,     // ⚡ Ignorar peticiones duplicadas por 1 minuto
    }
  );
  // ✅ Total general (activas + pagadas)
  const totalCuentasUsd = data?.data?.reduce((total, cuenta) => {
    if (cuenta.montoUsd) return total + cuenta.montoUsd;
    if (cuenta.divisa === 'USD') return total + cuenta.monto;
    if (cuenta.divisa === 'Bs' && cuenta.tasa && cuenta.tasa > 0) {
      return total + (cuenta.monto / cuenta.tasa);
    }
    return total;
  }, 0) || 0;

  // ✅ Solo cuentas ACTIVAS
  const cuentasActivas = data?.data?.filter(c => c.estatus === 'activa') || [];
  const totalActivasUsd = cuentasActivas.reduce((total, c) => {
    if (c.montoUsd) return total + c.montoUsd;
    if (c.divisa === 'USD') return total + c.monto;
    return total;
  }, 0);

  // ✅ Solo cuentas PAGADAS
  const cuentasPagadas = data?.data?.filter(c => c.estatus === 'pagada') || [];
  const totalPagadasUsd = cuentasPagadas.reduce((total, c) => {
    if (c.montoUsd) return total + c.montoUsd;
    if (c.divisa === 'USD') return total + c.monto;
    return total;
  }, 0);

  return {
    cuentas: data?.data || [] as CuentaPorPagar[],
    totalCuentasUsd,        // ✅ Todas (activas + pagadas)
    totalActivasUsd,        // ✅ Solo activas
    totalPagadasUsd,        // ✅ Solo pagadas
    cuentasActivas,
    cuentasPagadas,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
};
