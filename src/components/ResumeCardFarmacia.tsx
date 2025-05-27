import React, { useEffect, useState } from "react";

interface ResumeCardFarmaciaProps {
  nombre: string;
  totalVentas: number; // Monto real de la venta (totalGeneralUsd)
  totalBs: number;     // Total en Bs (sin conversión)
  totalBsEnUsd: number; // Total Bs convertido a USD
  efectivoUsd: number;  // Solo USD efectivo
  zelleUsd: number;     // Solo USD zelle
  totalUsd: number;    // Total en USD directo (efectivoUsd + zelleUsd)
  faltantes: number;   // Suma de diferencias negativas (faltantes)
  sobrantes: number;   // Suma de diferencias positivas (sobrantes)
  top?: boolean;       // Si es top 3
  totalGeneralSinRecargas: number; // Total General sin incluir recargas
  valesUsd: number;    // Agregar vales en USD
  pendienteVerificar?: number; // Nuevo campo: monto pendiente por verificar
  localidadId: string; // Nuevo campo para identificar la farmacia
}

const ResumeCardFarmacia: React.FC<ResumeCardFarmaciaProps> = ({
  nombre,
  totalVentas = 0, // Valor predeterminado
  totalBs = 0, // Valor predeterminado
  totalBsEnUsd = 0, // Valor predeterminado
  efectivoUsd = 0, // Valor predeterminado
  zelleUsd = 0, // Valor predeterminado
  totalUsd = 0, // Valor predeterminado
  faltantes = 0, // Valor predeterminado
  sobrantes = 0, // Valor predeterminado
  totalGeneralSinRecargas = 0, // Valor predeterminado
  valesUsd = 0, // Valor predeterminado
  top,
  pendienteVerificar = 0,
  localidadId,
}) => {
  const [gastos, setGastos] = useState(0);

  useEffect(() => {
    const fetchGastos = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos/total`);
        if (!res.ok) {
          throw new Error("Error al obtener los gastos");
        }
        const data = await res.json();
        const gastoLocalidad = data[localidadId] || 0;
        setGastos(Math.max(0, gastoLocalidad)); // Ensure gastos is non-negative
        console.log("Gastos obtenidos:", gastoLocalidad);
      } catch (error) {
        console.error("Error al obtener los gastos:", error);
      }
    };

    fetchGastos();
  }, [localidadId]);

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border flex flex-col items-center transition hover:shadow-lg relative ${top ? 'border-yellow-400 ring-2 ring-yellow-300' : 'border-blue-100'}`}>
      {pendienteVerificar > 0 && (
        <div className="absolute top-1 right-4 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full shadow border border-yellow-300 z-10">
          Pendiente: ${pendienteVerificar.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
      {top && (
        <div className="flex items-center mb-2">
          <span className="material-icons text-yellow-500 mr-1">emoji_events</span>
          <span className="text-yellow-600 font-bold text-sm">TOP</span>
        </div>
      )}
      <h3 className={`text-lg font-bold mb-2 text-center ${top ? 'text-yellow-700' : 'text-blue-700'}`}>{nombre}</h3>
      <div className={`text-2xl font-extrabold mb-1 ${top ? 'text-yellow-700' : 'text-green-700'}`}>${totalVentas.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div className="flex flex-col gap-1 text-sm text-gray-700 w-full mt-2">
        <div className="flex justify-between w-full"><span>Total General sin Recargas:</span><span>${totalGeneralSinRecargas.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        <div className="flex justify-between w-full"><span>Solo Bs:</span><span>{totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span></div>
        <div className="flex justify-between w-full"><span>Solo USD Efectivo:</span><span>${efectivoUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        <div className="flex justify-between w-full"><span>Solo USD Zelle:</span><span>${zelleUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        <div className="flex justify-between w-full"><span>Solo USD:</span><span>${totalUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        <div className="flex justify-between w-full"><span>Vales USD:</span><span>${valesUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        <div className="flex justify-between w-full"><span>Gastos:</span><span className="text-red-600">${gastos.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        <div className="flex justify-between w-full font-bold"><span>Total con Gastos:</span><span>$ {(totalBsEnUsd + totalUsd - gastos).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        {faltantes > 0 && (
          <div className="flex justify-between w-full"><span>Faltantes:</span><span className="text-red-600">${faltantes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        )}
        {sobrantes > 0 && (
          <div className="flex justify-between w-full"><span>Sobrante:</span><span className="text-green-600">${sobrantes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        )}
      </div>
      <span className="text-xs text-gray-500 mt-2">Venta mensual</span>
    </div>
  );
};

export default ResumeCardFarmacia;
// Si quieres mostrar el estado general de los cuadres, puedes agregarlo aquí. Si no, omite este cambio.