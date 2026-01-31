// services/gastosService.ts
interface Gasto {
    _id: string;
    monto: number;
    divisa: 'Bs' | 'USD';
    tasa?: number;
    estado: 'wait' | 'verified' | 'denied';
    fecha: string;
    descripcion?: string;
    localidad?: string;
    // Agrega más campos según tu modelo
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const gastosService = {
    /**
     * Obtiene gastos filtrados por estado, localidad y rango de fechas
     */
    getGastosPorEstado: async (
        params: {
            estado?: 'wait' | 'verified' | 'denied';
            localidad?: string;
            fechaInicio?: string;
            fechaFin?: string;
        } = {}
    ): Promise<ApiResponse<Gasto[]>> => {
        try {
            const url = new URL('/gastos/estado', API_BASE_URL);

            // Agregar parámetros solo si existen
            if (params.estado) url.searchParams.append('estado', params.estado);
            if (params.localidad) url.searchParams.append('localidad', params.localidad);
            if (params.fechaInicio) url.searchParams.append('fecha_inicio', params.fechaInicio);
            if (params.fechaFin) url.searchParams.append('fecha_fin', params.fechaFin);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${token}`, // Descomenta si necesitas auth
                },
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data: ApiResponse<Gasto[]> = { data: await response.json(), success: true };
            console.log('Gastos por estado fetched:', data);
            return data;
        } catch (error) {
            console.error('Error fetching gastos por estado:', error);
            throw error;
        }
    },

    /**
     * Helper para gastos verificados en un rango de fechas
     */
    getGastosVerificados: async (
        fechaInicio?: string,
        fechaFin?: string,
        localidad?: string
    ): Promise<Gasto[]> => {
        const response = await gastosService.getGastosPorEstado({
            estado: 'verified',
            fechaInicio,
            fechaFin,
            localidad
        });

        if (!response.success) {
            throw new Error(response.message || 'Error al obtener gastos verificados');
        }

        return response.data;
    },

    /**
     * Obtiene total de gastos verificados en USD (conversión automática)
     */
    getTotalGastosVerificadosUsd: async (
        fechaInicio?: string,
        fechaFin?: string,
        localidad?: string
    ): Promise<number> => {
        const gastos = await gastosService.getGastosVerificados(fechaInicio, fechaFin, localidad);

        return gastos.reduce((total, gasto) => {
            if (gasto.divisa === 'USD') {
                return total + gasto.monto;
            }
            if (gasto.divisa === 'Bs' && gasto.tasa && gasto.tasa > 0) {
                return total + (gasto.monto / gasto.tasa);
            }
            return total;
        }, 0);
    }
};

// Ejemplo de uso:
// const gastos = await gastosService.getGastosPorEstado({
//   estado: 'verified',
//   fechaInicio: '2026-01-01',
//   fechaFin: '2026-01-31',
//   localidad: 'Maracaibo'
// });
