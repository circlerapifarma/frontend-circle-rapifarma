import React from "react";

interface PuntoVenta {
  banco: string;
  puntoDebito: number;
  puntoCredito: number;
}

interface CuadreDetalleModalProps {
  open: boolean;
  onClose: () => void;
  cuadre: any;
}

const CuadreDetalleModal: React.FC<CuadreDetalleModalProps> = ({ open, onClose, cuadre }) => {
  if (!open || !cuadre) return null;
  return (
    <div className="fixed inset-0 bg-white bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg w-full relative max-h-[90vh] overflow-auto">
        <button
          className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-red-500"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-blue-800">Detalle del Cuadre</h2>
        <div className="space-y-2 text-sm">
          <div><b>Fecha:</b> {cuadre.dia}</div>
          <div><b>Caja:</b> {cuadre.cajaNumero}</div>
          <div><b>Tasa:</b> {cuadre.tasa}</div>
          <div><b>Turno:</b> {cuadre.turno}</div>
          <div><b>Cajero:</b> {cuadre.cajero}</div>
          <div><b>Cédula Cajero:</b> {cuadre.cajeroId}</div>
          <div><b>Farmacia:</b> {cuadre.nombreFarmacia || cuadre.codigoFarmacia}</div>
          <div><b>Estado:</b> {cuadre.estado}</div>
          <div><b>Total Caja Sistema Bs:</b> {cuadre.totalCajaSistemaBs}</div>
          <div><b>Devoluciones Bs:</b> {cuadre.devolucionesBs}</div>
          <div><b>Recarga Bs:</b> {cuadre.recargaBs}</div>
          <div><b>Pago Móvil Bs:</b> {cuadre.pagomovilBs}</div>
          <div><b>Efectivo Bs:</b> {cuadre.efectivoBs}</div>
          <div><b>Total Bs:</b> {cuadre.totalBs}</div>
          <div><b>Total Bs en USD:</b> {cuadre.totalBsEnUsd}</div>
          <div><b>Efectivo USD:</b> {cuadre.efectivoUsd}</div>
          <div><b>Zelle USD:</b> {cuadre.zelleUsd}</div>
          <div><b>Total General USD:</b> {cuadre.totalGeneralUsd}</div>
          <div><b>Diferencia USD:</b> {cuadre.diferenciaUsd}</div>
          <div><b>Sobrante USD:</b> {cuadre.sobranteUsd}</div>
          <div><b>Faltante USD:</b> {cuadre.faltanteUsd}</div>
          {cuadre.puntosVenta && cuadre.puntosVenta.length > 0 && (
            <div>
              <b>Puntos de Venta:</b>
              <ul className="ml-4 list-disc">
                {cuadre.puntosVenta.map((pv: PuntoVenta, i: number) => (
                  <li key={i}>
                    Banco: <b>{pv.banco}</b>, Débito: <b>{pv.puntoDebito}</b>, Crédito: <b>{pv.puntoCredito}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CuadreDetalleModal;
