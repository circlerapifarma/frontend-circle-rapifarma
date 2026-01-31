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
  const key = params ? ['gastos-estado', params] : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    ([, params]: [string, GastosParams]) => gastosService.getGastosPorEstado(params)
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
