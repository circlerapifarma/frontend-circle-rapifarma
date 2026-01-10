import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

type DesgloseFarmacia = {
  farmacia: string;
  codigo: string;
  venta: number;
  comision: number;
};
type CajeroEspecial = {
  cajero: string;
  cajeroId: string;
  farmacias?: Record<string, string> | string[];
  totalVentas: number;
  comisionPorcentaje?: number;
  estado?: string;
  desglose?: DesgloseFarmacia[];
};

const ComisionesEspecialesPage: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cajeros, setCajeros] = useState<CajeroEspecial[]>([]);
  // Aunque la API devuelve un total, lo recalcularemos dinámicamente según filtros
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [farmaciaFiltro, setFarmaciaFiltro] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const handleFetchComisiones = async () => {
    if (!startDate || !endDate) {
      alert("Por favor selecciona ambas fechas");
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`${API_BASE}/comisiones/especial?${params}`);

      if (!res.ok) throw new Error("Error al obtener las comisiones especiales");
      const data = await res.json();

      setCajeros(data.cajeros || []);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al obtener las comisiones especiales");
    } finally {
      setLoading(false);
    }
  };

  // ✅ MEMOS: Filtrado eficiente
  const cajerosFiltrados = useMemo(() => {
    return cajeros.filter((c) => {
      const coincideBusqueda =
        c.cajero.toLowerCase().includes(search.toLowerCase()) ||
        c.cajeroId.toLowerCase().includes(search.toLowerCase());

      const farmaciasArr = Array.isArray(c.farmacias)
        ? c.farmacias
        : c.farmacias
          ? Object.values(c.farmacias)
          : [];

      const coincideFarmacia = !farmaciaFiltro || farmaciasArr.includes(farmaciaFiltro);
      const coincideEstado = !estadoFiltro || c.estado === estadoFiltro;

      return coincideBusqueda && coincideFarmacia && coincideEstado;
    });
  }, [cajeros, search, farmaciaFiltro, estadoFiltro]);

  // ✅ MEMOS: Cálculos Totales
  const resumenFinanciero = useMemo(() => {
    return cajerosFiltrados.reduce(
      (acc, c) => {
        const venta = Number(c.totalVentas) || 0;
        const porcentaje = Number(c.comisionPorcentaje) || 0;
        const pagoComision = (venta * porcentaje) / 100;

        return {
          ventas: acc.ventas + venta,
          comisiones: acc.comisiones + pagoComision
        };
      },
      { ventas: 0, comisiones: 0 }
    );
  }, [cajerosFiltrados]);

  // ✅ EXPORTAR A EXCEL
  const handleExportExcel = () => {
    if (cajerosFiltrados.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    try {
      const excelData = cajerosFiltrados.map((item) => {
        const venta = Number(item.totalVentas) || 0;
        const porcentaje = Number(item.comisionPorcentaje) || 0;
        const comision = (venta * porcentaje) / 100;

        return {
          "Cajero": item.cajero,
          "ID": item.cajeroId,
          "Estado": item.estado || "N/A",
          "Farmacia(s)": Array.isArray(item.farmacias)
            ? item.farmacias.join(", ")
            : Object.values(item.farmacias || {}).join(", "),
          "Total Vendido": venta.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          "% Comisión": `${porcentaje}%`,
          "Total Comisión": comision.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajuste ancho columnas
      ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];

      // Header personalizado
      XLSX.utils.sheet_add_aoa(ws, [[
        `Reporte Comisiones Especiales (${startDate} al ${endDate})`,
        "", "", "", "",
        `Total Pago: $${resumenFinanciero.comisiones.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]], { origin: -1 });

      XLSX.utils.book_append_sheet(wb, ws, "Comisiones Especiales");
      XLSX.writeFile(wb, `Comisiones_Especiales_${startDate}_al_${endDate}.xlsx`);
    } catch (error) {
      console.error(error);
      alert("Error al exportar Excel");
    }
  };

  // Listas para filtros (Chips)
  const farmaciasUnicas = useMemo(() => Array.from(
    new Set(
      cajeros.flatMap((c) =>
        Array.isArray(c.farmacias)
          ? c.farmacias
          : c.farmacias
            ? Object.values(c.farmacias)
            : []
      ).filter(Boolean)
    )
  ), [cajeros]);

  const estadosUnicos = useMemo(() => ['activo', 'inactivo'].filter(e =>
    cajeros.some(c => c.estado === e)
  ), [cajeros]);

  // Contexto de usuario (Farmacia asignada)
  const farmaciasUsuario = useMemo(() => {
    try {
      const usuarioRaw = localStorage.getItem("usuario");
      if (!usuarioRaw) return {};
      const usuario = JSON.parse(usuarioRaw);
      return usuario.farmacias || {};
    } catch {
      return {};
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">

          {/* Encabezado */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-800 to-pink-700 bg-clip-text text-transparent mb-2">
              ✨ Comisiones Especiales
            </h1>
            {Object.keys(farmaciasUsuario).length > 0 && (
              <div className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-xl inline-block shadow-sm">
                🏥 Farmacia asignada: <span className="font-bold text-purple-700">{Object.values(farmaciasUsuario).join(", ")}</span>
              </div>
            )}
          </div>

          {/* Panel de Control: Fechas y Botones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-100">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-700 mb-2">📅 Desde</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12 text-lg font-semibold bg-white"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-700 mb-2">📅 Hasta</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12 text-lg font-semibold bg-white"
              />
            </div>
            <div className="flex gap-3 pt-7 md:pt-0">
              <Button
                onClick={handleFetchComisiones}
                disabled={loading || !startDate || !endDate}
                size="lg"
                className="flex-1 font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-md h-12"
              >
                {loading ? "🔄 Cargando..." : "🔎 Buscar"}
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={cajerosFiltrados.length === 0}
                size="lg"
                className="font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md h-12 px-6"
              >
                📊 Excel
              </Button>
            </div>
          </div>

          {/* Barra de Búsqueda */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="🔍 Buscar por nombre o ID de cajero..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-14 text-lg shadow-sm border-slate-200"
            />
          </div>

          {/* Chips de Filtros */}
          <div className="flex flex-wrap gap-2 mb-6 p-4 bg-white/50 rounded-xl border border-slate-100">
            {farmaciasUnicas.slice(0, 8).map((f) => (
              <Badge
                key={f}
                variant={farmaciaFiltro === f ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${farmaciaFiltro === f ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-purple-50 text-slate-600'
                  }`}
                onClick={() => setFarmaciaFiltro(farmaciaFiltro === f ? "" : f)}
              >
                🏥 {f}
              </Badge>
            ))}
            {estadosUnicos.map((estado) => (
              <Badge
                key={estado}
                variant={estadoFiltro === estado ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${estadoFiltro === estado ? 'bg-slate-800 hover:bg-slate-900' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                onClick={() => setEstadoFiltro(estadoFiltro === estado ? "" : estado)}
              >
                {estado === 'activo' ? '✅ Activo' : '⏸️ Inactivo'}
              </Badge>
            ))}
            {(farmaciaFiltro || estadoFiltro) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => { setFarmaciaFiltro(""); setEstadoFiltro(""); }}
              >
                🧹 Limpiar Filtros
              </Button>
            )}
          </div>

          {/* Resumen de Totales */}
          {cajerosFiltrados.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <Card className="p-4 bg-white border border-slate-100 shadow-sm flex flex-col justify-center items-center">
                <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Ventas Filtradas</span>
                <span className="text-2xl font-bold text-slate-700">
                  ${resumenFinanciero.ventas.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-emerald-100 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl">💰</div>
                <span className="text-emerald-800 text-sm font-bold uppercase tracking-wider">Total a Pagar (Comisiones)</span>
                <span className="text-3xl font-black text-emerald-600">
                  ${resumenFinanciero.comisiones.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </Card>
            </div>
          )}

          {/* Grid de Cajeros */}
          {cajerosFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {cajerosFiltrados.map((c) => {
                const porcentaje = Number(c.comisionPorcentaje) || 0;
                const totalVentas = Number(c.totalVentas) || 0;
                const comision = (totalVentas * porcentaje) / 100;

                return (
                  <Card key={c.cajeroId} className="group hover:shadow-xl transition-all duration-300 border-slate-200 overflow-hidden bg-white">
                    {/* Header Card */}
                    <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-start">
                      <div className="flex gap-4 items-center">
                        <div className="h-12 w-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold border-2 border-white shadow-sm">
                          {c.cajero.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                            {c.cajero}
                          </h2>
                          <div className="flex gap-2 text-xs mt-1">
                            <Badge variant="outline" className="text-slate-500 bg-white">ID: {c.cajeroId}</Badge>
                            {c.estado && (
                              <Badge variant={c.estado === 'activo' ? "secondary" : "destructive"} className="text-[10px] px-2 h-5">
                                {c.estado}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Body Card */}
                    <div className="p-5">
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-slate-400 mb-1 uppercase">Farmacia(s)</div>
                        <div className="text-sm text-slate-700 font-medium leading-relaxed">
                          {Array.isArray(c.farmacias) ? c.farmacias.join(", ") : Object.values(c.farmacias || {}).join(", ")}
                        </div>
                      </div>

                      {/* Datos Financieros */}
                      <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-2 items-center text-center">
                        <div>
                          <div className="text-[10px] uppercase text-slate-500 font-bold">Ventas</div>
                          <div className="text-slate-700 font-bold">
                            ${totalVentas.toLocaleString("es-VE", { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                        <div className="border-x border-slate-200">
                          <div className="text-[10px] uppercase text-slate-500 font-bold">%</div>
                          <div className="text-blue-600 font-bold">{porcentaje}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-emerald-700 font-bold">Comisión</div>
                          <div className="text-emerald-600 font-black text-lg">
                            ${comision.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {c.desglose?.map((d, idx) => (
                          <div key={idx} className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 hover:bg-white transition-colors">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-slate-700">🏥 {d.farmacia}</span>
                              <span className="text-[10px] text-slate-400">#{d.codigo}</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[9px] text-slate-500 uppercase">Venta</p>
                                <p className="text-xs font-medium text-slate-600">
                                  ${d.venta.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] text-emerald-600 font-bold uppercase">Comisión sucursal</p>
                                <p className="text-sm font-black text-emerald-700">
                                  ${d.comision.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-6xl mb-4 opacity-50">🕵️‍♀️</div>
                <p className="text-lg font-medium">No se encontraron comisiones especiales.</p>
                <p className="text-sm">Intenta ajustar el rango de fechas o los filtros.</p>
              </div>
            )
          )}
        </Card>
      </div>
    </div>
  );
};

export default ComisionesEspecialesPage;