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
  fechaInicio?: string;
  fechaFin?: string;
}

const ResumeCardFarmacia: React.FC<ResumeCardFarmaciaProps> = ({
  nombre,
  totalVentas = 0, // Valor predeterminado
  totalBs = 0, // Valor predeterminado
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
  fechaInicio,
  fechaFin,
}) => {
  const [gastos, setGastos] = useState(0);

  useEffect(() => {
    const fetchGastos = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos`);
        if (!res.ok) {
          throw new Error("Error al obtener los gastos");
        }
        const data = await res.json();
        // Filtrar por localidad, estado y fechas si están presentes
        const gastosFiltrados = Array.isArray(data)
          ? data.filter((g: any) =>
              g.localidad === localidadId &&
              g.estado === 'verified' &&
              (!fechaInicio || g.fecha >= fechaInicio) &&
              (!fechaFin || g.fecha <= fechaFin)
            )
          : [];
        const totalGastos = gastosFiltrados.reduce((acc: number, g: any) => acc + Number(g.monto || 0), 0);
        setGastos(Math.max(0, totalGastos));
      } catch (error) {
        console.error("Error al obtener los gastos:", error);
      }
    };

    fetchGastos();
  }, [localidadId, fechaInicio, fechaFin]);

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border flex flex-col items-center transition hover:shadow-lg relative ${top ? 'border-yellow-400 ring-2 ring-yellow-300' : 'border-blue-100'}`}>
      {/* Chip solo si hay pendiente, sin la palabra 'Ref' */}
      {pendienteVerificar > 0 && (
        <div className="absolute top-2 left-4 flex flex-col gap-1 z-10">
          <div className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-yellow-300 min-w-[90px] text-center">
            Pendiente: ${pendienteVerificar.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow border border-blue-300 flex items-center gap-1 min-w-[90px] justify-center">
            <span className="material-icons text-blue-400 text-xs">info</span>
            Total: ${(totalVentas + pendienteVerificar).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
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
        <div className="flex justify-between w-full font-bold"><span>Total con Gastos:</span><span>$ {(totalVentas - gastos).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
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