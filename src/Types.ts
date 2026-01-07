export interface Gasto {
    _id: string;
    titulo: string;
    descripcion: string;
    monto: number;
    montoUsd: number;
    divisa: string;
    tasa: number;
    fecha: string;
    estado: string;
    imagenesGasto?: string[];
}