import React from "react";
import ResumeCardFarmacia from "@/components/ResumeCardFarmacia";
import { useResumenData } from "@/hooks/useResumenData";

const ResumenFarmaciasVentas: React.FC = () => {
  const {
    loading,
    error,
    sortedFarmacias,
    ventas,
    pendientesPorFarmacia,
    inventariosFarmacia,
    costoInventarioCuadresPorFarmacia,
    fechaInicio,
    fechaFin,
    setFechaInicio,
    setFechaFin,
    setHoy,
    setAyer,
    setSemanaActual,
    setQuincenaActual,
    setMesActual,
    detallesVisibles,
    setDetallesVisibles,
    calcularDetalles,
    gastosPorFarmacia,
    cuentasActivasPorFarmacia,
    cuentasPagadasPorFarmacia,
    totalPagosPorFarmacia, // Este objeto ya contiene los totales por farmacia
  } = useResumenData();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="flex items-center text-blue-700 text-lg font-semibold">
          <svg
            className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Cargando resumen de ventas...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center text-red-700 font-semibold border border-red-300">
          <p className="text-xl mb-4">⚠️ ¡Oops! Algo salió mal.</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 shadow-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-800 mb-2">
              <i className="fas fa-chart-bar text-blue-500 mr-3"></i>
              Resumen de Ventas por Farmacia
            </h1>
            <p className="text-gray-600 text-md">
              Consulta un desglose detallado de las ventas de cada farmacia.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[400px]">
            <label
              htmlFor="fecha-inicio"
              className="block text-sm font-medium text-gray-700"
            >
              Período de Ventas:
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="Fecha de inicio"
              />
              <input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="Fecha de fin"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={setHoy}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={setAyer}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Dia Anterior
              </button>
              <button
                type="button"
                onClick={setSemanaActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Esta Semana
              </button>
              <button
                type="button"
                onClick={setQuincenaActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Quincena Actual
              </button>
              <button
                type="button"
                onClick={setMesActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Mes Actual
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFarmacias.map((farm, idx) => {
            // ▼▼▼ CORRECCIÓN AQUÍ ▼▼▼
            // 1. Accede a los datos de pago para esta farmacia desde el objeto que nos da el hook.
            const pagosDelPeriodo = totalPagosPorFarmacia[farm.id] || {
              pagosUsd: 0,
              pagosBs: 0,
              pagosGeneralUsd: 0,
              abonosNoLiquidadosUsd: 0,
              abonosNoLiquidadosEnUsd: 0,
              abonosNoLiquidadosEnBs: 0,
              montoOriginalFacturasUsd: 0,
              diferencialPagosUsd: 0,
            };

            return (
              <div key={farm.id}>
                <ResumeCardFarmacia
                  nombre={farm.nombre}
                  localidadId={farm.id}
                  totalVentas={ventas[farm.id]?.totalVentas || 0}
                  totalBs={ventas[farm.id]?.totalBs || 0}
                  totalUsd={ventas[farm.id]?.totalUsd || 0}
                  efectivoUsd={ventas[farm.id]?.efectivoUsd || 0}
                  zelleUsd={ventas[farm.id]?.zelleUsd || 0}
                  faltantes={ventas[farm.id]?.faltantes || 0}
                  sobrantes={ventas[farm.id]?.sobrantes || 0}
                  totalGeneralSinRecargas={
                    ventas[farm.id]?.totalGeneralSinRecargas || 0
                  }
                  valesUsd={ventas[farm.id]?.valesUsd || 0}
                  top={idx < 3}
                  pendienteVerificar={pendientesPorFarmacia[farm.id] || 0}
                  fechaInicio={fechaInicio}
                  fechaFin={fechaFin}
                  totalCosto={costoInventarioCuadresPorFarmacia[farm.id] || 0}
                  totalInventario={inventariosFarmacia[farm.id] || 0}
                  gastos={gastosPorFarmacia[farm.id] || 0}
                  cuentasPorPagarActivas={
                    cuentasActivasPorFarmacia[farm.id] || 0
                  }
                  cuentasPagadas={cuentasPagadasPorFarmacia[farm.id] || 0}
                  // 2. Pasa los datos correctos como props individuales.
                  pagosEnUsd={pagosDelPeriodo.pagosUsd}
                  pagosEnBs={pagosDelPeriodo.pagosBs}
                  totalPagosGeneral={pagosDelPeriodo.pagosGeneralUsd}
                  abonosNoLiquidadosEnUsd={pagosDelPeriodo.abonosNoLiquidadosEnUsd}
                  abonosNoLiquidadosEnBs={pagosDelPeriodo.abonosNoLiquidadosEnBs}
                  montoOriginalFacturas={
                    pagosDelPeriodo.montoOriginalFacturasUsd
                  }
                  diferencialPagos={pagosDelPeriodo.diferencialPagosUsd}
                />
                <button
                  className="mt-2 text-blue-700 underline text-sm"
                  onClick={() =>
                    setDetallesVisibles((v) => ({
                      ...v,
                      [farm.id]: !v[farm.id],
                    }))
                  }
                >
                  {detallesVisibles[farm.id]
                    ? "Ocultar detalles"
                    : "Ver detalles completos"}
                </button>
                {detallesVisibles[farm.id] && calcularDetalles(farm.id)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResumenFarmaciasVentas;
