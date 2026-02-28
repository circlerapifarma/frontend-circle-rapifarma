export interface Pago {
  _id: string;
  monto: number;
  moneda: string;
  tasa?: number;
  fecha: string;
  usuario: string;
  [key: string]: any;
}

export interface CuentaPorPagar {
  _id: string;
  monto: number;
  divisa: string;
  tasa: number;
  retencion?: number;
  fechaEmision: string;
  diasCredito: number;
  fechaRecepcion: string;
  proveedor: string;
  numeroFactura: string;
  numeroControl: string;
  descripcion: string;
  usuarioCorreo: string;
  farmacia: string;
  estatus: string;
  [key: string]: any;
}

export interface FarmaciaChip {
  id: string;
  nombre: string;
}