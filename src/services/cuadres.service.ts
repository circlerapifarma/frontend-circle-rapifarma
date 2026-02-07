interface PuntoVenta {
    banco: string;
    puntoDebito: number;
    puntoCredito: number;
}

interface CuadreDetallado {
    _id: string;
    dia: string;
    cajaNumero: number;
    tasa: number;
    turno: string;
    cajero: string;
    cajeroId: string;
    totalCajaSistemaBs: number;
    devolucionesBs: number;
    recargaBs: number;
    pagomovilBs: number;
    puntosVenta: PuntoVenta[];
    efectivoBs: number;
    totalBs: number;
    totalBsEnUsd: number;
    efectivoUsd: number;
    zelleUsd: number;
    totalGeneralUsd: number;
    diferenciaUsd: number;
    sobranteUsd: number;
    faltanteUsd: number;
    delete: boolean;
    estado: string;
    costoInventario: number;
    nombreFarmacia: string;
    codigoFarmacia: string;
    valesUsd: number; // Agregado para incluir los vales en USD
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const cuadresService = {
    /**
     * Obtiene los cuadros detallados filtrados por farmacia, fechas y estado
     */
    getCuadresDetallados: async (
        params: {
            farmacia?: string;
            fechaInicio?: string;
            fechaFin?: string;
            estado?: string;
        } = {}
    ): Promise<ApiResponse<CuadreDetallado[]>> => {
        try {
            const url = new URL('/api/cuadres/cuadres-detallados', API_BASE_URL);

            if (params.farmacia) url.searchParams.append('farmacia', params.farmacia);
            if (params.fechaInicio) url.searchParams.append('fechaInicio', params.fechaInicio);
            if (params.fechaFin) url.searchParams.append('fechaFin', params.fechaFin);
            if (params.estado) url.searchParams.append('estado', params.estado);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const data: ApiResponse<CuadreDetallado[]> = { data: await response.json(), success: true };
            return data;
        } catch (error) {
            console.error('Error fetching cuadres detallados:', error);
            throw error;
        }
    },

    /**
     * Ejemplo de uso con filtros específicos
     */
    //   getCuadresPorFarmaciaYFecha: async (
    //     farmacia: string,
    //     fechaInicio: string,
    //     fechaFin: string,
    //     estado?: string
    //   ): Promise<CuadreDetallado[]> => {
    //     const response = await cuadresService.getCuadresDetallados({
    //       farmacia,
    //       fechaInicio,
    //       fechaFin,
    //       estado
    //     });

    //     if (!response.success) {
    //       throw new Error(response.message || 'Error al obtener cuadres');
    //     }

    //     return response.data;
    //   }
};

// Ejemplo de uso:
// const cuadres = await cuadresService.getCuadresDetallados({
//   farmacia: 'sur america',
//   fechaInicio: '2025-01-01',
//   fechaFin: '2025-12-31',
//   estado: 'approved'
// });
