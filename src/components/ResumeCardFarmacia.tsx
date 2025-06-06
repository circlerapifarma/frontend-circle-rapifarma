import React, { useEffect, useState } from "react";
import InventarioInfoChip from "./InventarioInfoChip";

// Considera mover estas interfaces a un archivo de tipos compartido si se usan en varios lugares
interface ResumeCardFarmaciaProps {
  nombre: string;
  totalVentas?: number; // Monto real de la venta (totalGeneralUsd)
  totalBs?: number;     // Total en Bs (sin conversión)
  efectivoUsd?: number; // Solo USD efectivo
  zelleUsd?: number;    // Solo USD zelle
  totalUsd?: number;    // Total en USD directo (efectivoUsd + zelleUsd)
  faltantes?: number;   // Suma de diferencias negativas (faltantes)
  sobrantes?: number;   // Suma de diferencias positivas (sobrantes)
  top?: boolean;        // Si es top 3
  totalGeneralSinRecargas?: number; // Total General sin incluir recargas
  valesUsd?: number;    // Vales en USD
  pendienteVerificar?: number; // Monto pendiente por verificar
  localidadId: string;
  fechaInicio?: string;
  fechaFin?: string;
  totalCosto?: number; // Nuevo prop
  totalInventario?: number; // Nuevo: suma de inventarios por farmacia
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Reutilizar la constante

const ResumeCardFarmacia: React.FC<ResumeCardFarmaciaProps> = ({
  nombre,
  totalVentas = 0,
  totalBs = 0,
  efectivoUsd = 0,
  zelleUsd = 0,
  totalUsd = 0,
  faltantes = 0,
  sobrantes = 0,
  totalGeneralSinRecargas = 0,
  valesUsd = 0,
  top,
  pendienteVerificar = 0,
  localidadId,
  fechaInicio,
  fechaFin,
  totalCosto = 0,
  totalInventario = 0,
}) => {
  const [gastos, setGastos] = useState(0);
  const [cuentasPorPagarActivas, setCuentasPorPagarActivas] = useState(0);
  const [cuentasPagadas, setCuentasPagadas] = useState(0);
  const [loadingGastosCuentas, setLoadingGastosCuentas] = useState(true);
  const [errorGastosCuentas, setErrorGastosCuentas] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdditionalData = async () => {
      setLoadingGastosCuentas(true);
      setErrorGastosCuentas(null);
      try {
        // Fetch Gastos
        const resGastos = await fetch(`${API_BASE_URL}/gastos`);
        if (!resGastos.ok) {
          throw new Error("Error al obtener los gastos.");
        }
        const dataGastos = await resGastos.json();
        const gastosFiltrados = Array.isArray(dataGastos)
          ? dataGastos.filter((g: any) =>
              g.localidad === localidadId &&
              g.estado === 'verified' &&
              (!fechaInicio || new Date(g.fecha) >= new Date(fechaInicio)) && // Comparación de fechas
              (!fechaFin || new Date(g.fecha) <= new Date(fechaFin))
            )
          : [];
        // Reconversión de gastos si tienen tasa y la divisa es Bs
        const totalGastos = gastosFiltrados.reduce((acc: number, g: any) => {
          if (g.divisa === 'Bs' && g.tasa && Number(g.tasa) > 0) {
            return acc + (Number(g.monto || 0) / Number(g.tasa));
          }
          return acc + Number(g.monto || 0);
        }, 0);
        setGastos(Math.max(0, totalGastos));

        // Fetch Cuentas por Pagar
        const token = localStorage.getItem("token");
        if (token) {
          const resCuentas = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!resCuentas.ok) throw new Error("Error al obtener cuentas por pagar.");
          const dataCuentas = await resCuentas.json();

          // Cuentas activas (ya lo tienes)
          const cuentasFiltradas = Array.isArray(dataCuentas)
            ? dataCuentas.filter((c: any) =>
                c.farmacia === localidadId &&
                c.estatus === 'activa' &&
                (!fechaInicio || new Date(c.fechaEmision) >= new Date(fechaInicio)) &&
                (!fechaFin || new Date(c.fechaEmision) <= new Date(fechaFin))
              )
            : [];
          const totalCuentas = cuentasFiltradas.reduce((acc: number, c: any) => acc + Number(c.montoUsd || 0), 0);
          setCuentasPorPagarActivas(Math.max(0, totalCuentas));

          // NUEVO: Cuentas pagadas
          const cuentasPagadasFiltradas = Array.isArray(dataCuentas)
            ? dataCuentas.filter((c: any) =>
                c.farmacia === localidadId &&
                c.estatus === 'pagada' &&
                (!fechaInicio || new Date(c.fechaEmision) >= new Date(fechaInicio)) &&
                (!fechaFin || new Date(c.fechaEmision) <= new Date(fechaFin))
              )
            : [];
          const totalCuentasPagadas = cuentasPagadasFiltradas.reduce((acc: number, c: any) => acc + Number(c.montoUsd || 0), 0);
          setCuentasPagadas(Math.max(0, totalCuentasPagadas));
        }
      } catch (error: any) {
        console.error("Error al obtener datos adicionales:", error);
        setErrorGastosCuentas(error.message || "Error desconocido al cargar datos adicionales.");
      } finally {
        setLoadingGastosCuentas(false);
      }
    };

    fetchAdditionalData();
  }, [localidadId, fechaInicio, fechaFin]); // Dependencias para re-fetch cuando cambian

  // Función auxiliar para formatear moneda
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-VE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totalConGastos = totalVentas - gastos - cuentasPagadas;
  const showMissing = faltantes > 0 && faltantes !== null; // Asegúrate que no sea null
  const showSurplus = sobrantes > 0 && sobrantes !== null; // Asegúrate que no sea null

  return (
    <div
      className={`
        bg-white rounded-2xl shadow-xl p-6 border-2 flex flex-col items-center
        transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl relative
        ${top ? 'border-yellow-500 ring-4 ring-yellow-200' : 'border-blue-200'}
      `}
    >
      {/* Indicador TOP (si aplica) */}
      {top && (
        <div className="absolute -top-3 -left-3 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform rotate-[-5deg] z-10">
          🏆 TOP VENTAS
        </div>
      )}

      {/* Chip de Pendiente de Verificar (si aplica) */}
      {pendienteVerificar > 0 && (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10">
          <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full shadow border border-yellow-300">
            ⏳ Pendiente: {formatCurrency(pendienteVerificar)}
          </div>
          <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow border border-blue-300">
            Total Estimado: {formatCurrency(totalVentas + pendienteVerificar)}
          </div>
        </div>
      )}

      {/* Nombre de la Farmacia */}
      <h3 className={`text-2xl font-extrabold mb-3 text-center ${top ? 'text-yellow-800' : 'text-gray-900'} leading-tight`}>
        {nombre}
      </h3>

      {/* Total de Ventas Principal */}
      <div className={`text-4xl font-extrabold mb-2 ${top ? 'text-yellow-600' : 'text-green-600'} text-center`}>
        {formatCurrency(totalVentas)}
      </div>
      {/* Total Inventario visual */}
      <div className="flex items-center gap-2 mb-4 text-base text-blue-700 font-semibold relative">
        <i className="fas fa-boxes-stacked text-blue-500"></i>
        <span>Costo Inventario:</span>
        <span className="font-bold">{formatCurrency(totalInventario)}</span>
        <InventarioInfoChip totalInventario={totalInventario} totalCosto={totalCosto} formatCurrency={formatCurrency} />
      </div>

      {/* Sección de Métricas Detalladas */}
      <div className="flex flex-col gap-2 text-base text-gray-700 w-full mt-3">
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2"><i className="fas fa-dollar-sign text-green-500"></i> Total sin Recargas:</span>
          <span className="font-semibold">{formatCurrency(totalGeneralSinRecargas)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2"><i className="fas fa-money-bill-wave text-blue-500"></i> Solo USD Efectivo:</span>
          <span className="font-semibold">{formatCurrency(efectivoUsd)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2"><i className="fas fa-university text-blue-500"></i> Solo USD Zelle:</span>
          <span className="font-semibold">{formatCurrency(zelleUsd)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2"><i className="fas fa-money-check-alt text-blue-500"></i> Total USD (Recibido):</span>
          <span className="font-semibold">{formatCurrency(totalUsd)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2"><i className="fas fa-receipt text-indigo-500"></i> Vales USD:</span>
          <span className="font-semibold">{formatCurrency(valesUsd)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2"><i className="fas fa-coins text-yellow-600"></i> Solo Bs:</span>
          <span className="font-semibold">{totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2"><i className="fas fa-cash-register text-pink-500"></i> Costo de Cuadres:</span>
          <span className="font-semibold text-pink-700">{formatCurrency(totalCosto)}</span>
        </div>

        {loadingGastosCuentas ? (
          <div className="text-center text-sm text-gray-500 py-2">Cargando detalles...</div>
        ) : errorGastosCuentas ? (
          <div className="text-center text-sm text-red-500 py-2">Error al cargar: {errorGastosCuentas}</div>
        ) : (
          <>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="flex items-center gap-2"><i className="fas fa-minus-circle text-red-600"></i> Gastos Verificados:</span>
              <span className="font-semibold text-red-600">{formatCurrency(gastos)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="flex items-center gap-2"><i className="fas fa-hand-holding-usd text-orange-600"></i> Cuentas por Pagar:</span>
              <span className="font-semibold text-orange-600">{formatCurrency(cuentasPorPagarActivas)}</span>
            </div>
            {/* NUEVO: Total Pagado */}
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="flex items-center gap-2"><i className="fas fa-check-circle text-green-600"></i> Cuentas Pagadas:</span>
              <span className="font-semibold text-green-700">{formatCurrency(cuentasPagadas)}</span>
            </div>
          </>
        )}

        {/* Sección de Resumen final con Totales Ajustados */}
        <div className="flex justify-between items-center py-2 mt-2 border-t-2 border-gray-300 font-bold text-lg">
          <span className="flex items-center gap-2"><i className="fas fa-balance-scale text-purple-600"></i> Venta Neta:</span>
          <span className="text-purple-700">{formatCurrency(totalConGastos)}</span>
        </div>

        {/* Faltantes y Sobrantes (condicionales) */}
        {showMissing && (
          <div className="flex justify-between items-center py-1 bg-red-50 rounded-md px-3">
            <span className="flex items-center gap-2 text-red-700"><i className="fas fa-exclamation-triangle"></i> Faltantes:</span>
            <span className="font-bold text-red-700">{formatCurrency(faltantes)}</span>
          </div>
        )}
        {showSurplus && (
          <div className="flex justify-between items-center py-1 bg-green-50 rounded-md px-3">
            <span className="flex items-center gap-2 text-green-700"><i className="fas fa-check-circle"></i> Sobrante:</span>
            <span className="font-bold text-green-700">{formatCurrency(sobrantes)}</span>
          </div>
        )}
      </div>

      <span className="text-xs text-gray-500 mt-4 italic">Resumen de ventas del período</span>
    </div>
  );
};

export default ResumeCardFarmacia;