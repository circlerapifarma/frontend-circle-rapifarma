// services/cuentasPorPagarService.ts
interface CuentaPorPagar {
    _id: string;
    monto: number;
    montoUsd?: number;
    divisa: 'Bs' | 'USD';
    tasa?: number;
    estatus: 'activa' | 'pagada' | 'cancelada';
    fechaEmision: string;
    fechaVencimiento?: string;
    farmacia?: string;
    descripcion?: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const cuentasPorPagarService = {
    /**
     * Obtiene cuentas por pagar en un rango de fechas
     */
    getCuentasPorRango: async (params: {
        startDate: string;
        endDate: string;
        farmacia?: string;
        estatus?: 'activa' | 'pagada' | 'cancelada';
    }): Promise<ApiResponse<CuentaPorPagar[]>> => {
        try {
            const url = new URL('/cuentas-por-pagar/rango', API_BASE_URL);

            // Parámetros OBLIGATORIOS
            url.searchParams.append('startDate', params.startDate);
            url.searchParams.append('endDate', params.endDate);

            // Parámetros opcionales
            if (params.farmacia) url.searchParams.append('farmacia', params.farmacia);
            if (params.estatus) url.searchParams.append('estatus', params.estatus);

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);
            return { success: true, data: await response.json() };
        } catch (error) {
            console.error('Error fetching cuentas por pagar:', error);
            throw error;
        }
    },

    /**
     * Total cuentas activas en USD
     */
    getTotalCuentasActivasUsd: async (
        startDate: string,
        endDate: string,
        farmacia?: string
    ): Promise<number> => {
        const response = await cuentasPorPagarService.getCuentasPorRango({
            startDate,
            endDate,
            farmacia,
            estatus: 'activa'
        });

        if (!response.success) throw new Error(response.message || 'Error');

        return response.data.reduce((total, cuenta) => {
            if (cuenta.montoUsd) return total + cuenta.montoUsd;
            if (cuenta.divisa === 'USD') return total + cuenta.monto;
            if (cuenta.divisa === 'Bs' && cuenta.tasa && cuenta.tasa > 0) {
                return total + (cuenta.monto / cuenta.tasa);
            }
            return total;
        }, 0);
    }
};
