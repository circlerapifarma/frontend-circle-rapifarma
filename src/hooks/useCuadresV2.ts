// hooks/useCuadresDetallados.ts
import { cuadresService } from '@/services/cuadres.service';
import useSWR from 'swr';
import type { CuadreDetallado } from './types';

interface CuadresParams {
    farmacia?: string;
    fechaInicio?: string;
    fechaFin?: string;
    estado?: string;
}

export const useCuadresDetallados = (params?: CuadresParams) => {
    const key = params
        ? `cuadres-${params.farmacia}-${params.fechaInicio}-${params.fechaFin}-${params.estado}`
        : null;

    const { data, error, isLoading, mutate: refresh } = useSWR(
        key,
        () => cuadresService.getCuadresDetallados(params!),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            dedupingInterval: 60000 // Opcional: evita peticiones repetidas por 1 min
        }
    );
    console.log("useCuadresDetallados - data:", data);
    return {
        // Datos procesados
        cuadres: data?.data || [] as CuadreDetallado[],
        isLoading,
        isError: !!error,
        error,
        // Acciones
        refresh,

        // Stats útiles
        totalCuadres: data?.data?.length || 0,
        totalBs: data?.data?.reduce((sum, c) => sum + c.totalBs, 0) || 0,
        totalUsd: data?.data?.reduce((sum, c) => sum + c.totalGeneralUsd, 0) || 0,
    };
};
