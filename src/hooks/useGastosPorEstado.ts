// hooks/useGastosPorEstado.ts
import { gastosService } from '@/services/gastos.service';
import type { Gasto } from '@/Types';
import useSWR from 'swr';

interface GastosParams {
  estado?: 'wait' | 'verified' | 'denied';
  localidad?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export const useGastosPorEstado = (params?: GastosParams) => {
  const key = params
    ? `gastos-${params.estado}-${params.localidad}-${params.fechaInicio}-${params.fechaFin}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    // SWR ahora comparará el string de la 'key'. Si es igual al anterior,
    // NO ejecutará esta función y sacará los datos del caché instantáneamente.
    () => gastosService.getGastosPorEstado(params!),
    {
      revalidateOnFocus: false,    // No recargar al cambiar de pestaña del navegador
      revalidateIfStale: false,    // No hacer fetch si ya existen datos en el caché
      dedupingInterval: 60000,     // Evitar peticiones duplicadas en el mismo minuto
    }
  );
  return {
    gastos: data?.data || [] as Gasto[],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
    totalGastosUsd: data?.data?.reduce((total, g) => {
      if (g.divisa === 'USD') return total + g.monto;
      if (g.divisa === 'Bs' && g.tasa && g.tasa > 0) return total + (g.monto / g.tasa);
      return total;
    }, 0) || 0,
  };
};
