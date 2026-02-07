interface PuntoVenta {
    banco: string;
    puntoDebito: number;
    puntoCredito: number;
}

export interface CuadreDetallado {
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
    valesUsd: number
}
