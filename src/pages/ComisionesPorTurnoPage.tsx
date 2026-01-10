import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

type Comision = {
  cajero: string;
  turno: string;
  comision: number;
  totalVentas?: number;
  sobrante?: number;
  faltante?: number;
  farmacias?: Record<string, string> | string[];
  comisionPorcentaje?: number;
  dia?: string;
  estado?: string;
};

const ComisionesPorTurnoPage: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [farmaciaFiltro, setFarmaciaFiltro] = useState<string>("");
  const [openCajero, setOpenCajero] = useState<string | null>(null);
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
      const res = await fetch(`${API_BASE}/comisiones?${params}`);
      if (!res.ok) throw new Error("Error al obtener las comisiones");
      const data = await res.json();

      setComisiones(
        Array.isArray(data)
          ? data.map((item: any) => ({
            cajero: item.NOMBRE || "Sin nombre",
            turno: item.turno || "Sin turno",
            comision: Number(item.comision) || 0,
            totalVentas: Number(item.totalVentas) || 0,
            sobrante: Number(item.sobrante) || 0,
            faltante: Number(item.faltante) || 0,
            farmacias: item.farmacias || [],
            comisionPorcentaje: Number(item.comisionPorcentaje) || 0,
            dia: item.dia,
            estado: item.estado,
          }))
          : []
      );
    } catch (error) {
      console.error("Error al obtener las comisiones:", error);
      alert("Hubo un error al obtener las comisiones");
    } finally {
      setLoading(false);
    }
  };

  // ✅ EXPORTAR A EXCEL - Datos FILTRADOS
  const handleExportExcel = async () => {
    if (comisionesFiltradas.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    try {
      const excelData = comisionesFiltradas.map((item) => ({
        "Cajero": item.cajero,
        "Turno": item.turno,
        "Fecha": item.dia?.slice(0, 10) || "",
        "Estado": item.estado || "",
        "Farmacia(s)": Array.isArray(item.farmacias)
          ? item.farmacias.join(", ")
          : Object.values(item.farmacias || {}).join(", "),
        "% Comisión": `${item.comisionPorcentaje || 0}%`,
        "Total Vendido": Number(item.totalVentas || 0).toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        "Comisión": Number(item.comision || 0).toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        "Sobrante": Number(item.sobrante || 0).toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        "Faltante": Number(item.faltante || 0).toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      const colWidths = excelData[0]
        ? Object.keys(excelData[0]).map((key) => ({
          wch: Math.max(key.length, 12),
        }))
        : [];
      ws["!cols"] = colWidths;

      XLSX.utils.sheet_add_aoa(
        ws,
        [
          [
            "COMISIONES POR TURNO",
            "",
            "",
            `Rango: ${startDate} al ${endDate}`,
            "",
            `Total: $${totalComisionesFiltradas.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`,
          ],
        ],
        { origin: -1 }
      );

      XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
      XLSX.writeFile(wb, `Comisiones_${startDate}_al_${endDate}.xlsx`);

      const btn = document.getElementById("export-btn") as HTMLButtonElement;
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = "✅ Exportado!";
        btn.disabled = true;
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error("Error exportando Excel:", error);
      alert("Error al generar el archivo Excel");
    }
  };

  const farmaciasUnicas = Array.from(
    new Set(
      comisiones
        .flatMap((c) =>
          Array.isArray(c.farmacias)
            ? c.farmacias
            : c.farmacias
              ? Object.values(c.farmacias)
              : []
        )
        .filter(Boolean)
    )
  );

  const estadosUnicos = ["activo", "inactivo"].filter((e) =>
    comisiones.some((c) => c.estado === e)
  );

  const comisionesFiltradas = React.useMemo(() => {
    return comisiones.filter((comision) => {
      const coincideBusqueda =
        comision.turno.toLowerCase().includes(search.toLowerCase()) ||
        comision.cajero.toLowerCase().includes(search.toLowerCase());
      const farmaciasArr = Array.isArray(comision.farmacias)
        ? comision.farmacias
        : comision.farmacias
          ? Object.values(comision.farmacias)
          : [];
      const coincideFarmacia = !farmaciaFiltro || farmaciasArr.includes(farmaciaFiltro);
      const coincideEstado = !estadoFiltro || comision.estado === estadoFiltro;
      return coincideBusqueda && coincideFarmacia && coincideEstado;
    });
  }, [comisiones, search, farmaciaFiltro, estadoFiltro]);

  const comisionesPorCajero = React.useMemo(() => {
    return comisionesFiltradas.reduce<Record<string, Comision[]>>((acc, comision) => {
      if (!acc[comision.cajero]) acc[comision.cajero] = [];
      acc[comision.cajero].push(comision);
      return acc;
    }, {});
  }, [comisionesFiltradas]);

  const totalComisionesFiltradas = React.useMemo(() => {
    return comisionesFiltradas.reduce((acc, c) => acc + (Number(c.comision) || 0), 0);
  }, [comisionesFiltradas]);

  const farmaciasUsuario = React.useMemo(() => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
              💰 Comisiones por Turno
            </h1>
            {Object.keys(farmaciasUsuario).length > 0 && (
              <div className="text-sm text-slate-600 bg-slate-100 px-4 py-2 rounded-xl inline-block">
                🏥 Farmacia(s):{" "}
                <span className="font-bold text-blue-700">
                  {Object.values(farmaciasUsuario).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Filtros Fecha + Botones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-100">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-700 mb-2">📅 Fecha Inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-12 text-lg font-semibold"
                max={endDate || undefined}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-700 mb-2">📅 Fecha Fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-12 text-lg font-semibold"
                min={startDate || undefined}
              />
            </div>
            <div className="flex gap-3 pt-7 md:pt-0">
              <Button
                onClick={handleFetchComisiones}
                disabled={loading || !startDate || !endDate}
                size="lg"
                className="flex-1 font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg h-12"
              >
                {loading ? "🔄 Cargando..." : "📊 Obtener"}
              </Button>
              <Button
                id="export-btn"
                onClick={handleExportExcel}
                disabled={comisionesFiltradas.length === 0}
                size="lg"
                className="font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg h-12 px-6"
              >
                📊 Excel ({comisionesFiltradas.length})
              </Button>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="mb-6">
            <Input
              type="text"
              placeholder="🔍 Buscar por cajero o turno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-14 text-lg shadow-lg"
            />
          </div>

          {/* Chips Filtros */}
          <div className="flex flex-wrap gap-2 mb-6 p-4 bg-white/50 rounded-xl border">
            {farmaciasUnicas.map((f) => (
              <Badge
                key={f}
                variant={farmaciaFiltro === f ? "default" : "secondary"}
                className="cursor-pointer px-3 py-2 text-sm font-bold hover:scale-105 transition-all"
                onClick={() => setFarmaciaFiltro(farmaciaFiltro === f ? "" : f)}
              >
                🏥 {f}
              </Badge>
            ))}
            {estadosUnicos.map((estado) => (
              <Badge
                key={estado}
                variant={estadoFiltro === estado ? "default" : "secondary"}
                className="cursor-pointer px-3 py-2 text-sm font-bold hover:scale-105 transition-all"
                onClick={() => setEstadoFiltro(estadoFiltro === estado ? "" : estado)}
              >
                {estado === "activo" ? "✅ Activo" : "⏸️ Inactivo"}
              </Badge>
            ))}
            {(farmaciaFiltro || estadoFiltro) && (
              <Button
                variant="outline"
                size="sm"
                className="px-4 py-2 rounded-full border-2 border-slate-300"
                onClick={() => {
                  setFarmaciaFiltro("");
                  setEstadoFiltro("");
                }}
              >
                🧹 Limpiar
              </Button>
            )}
          </div>

          {/* Total Filtrado */}
          {comisionesFiltradas.length > 0 && (
            <div className="mb-8 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl text-right shadow-lg">
              <div className="text-2xl font-black text-emerald-900">
                💵 Total Filtrado: ${totalComisionesFiltradas.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm text-emerald-800">
                {comisionesFiltradas.length} registro(s)
              </div>
            </div>
          )}

          {/* Lista Cajeros */}
          {Object.keys(comisionesPorCajero).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(comisionesPorCajero).map(([cajero, lista]) => {
                const totalComision = lista.reduce((acc, item) => acc + (Number(item.comision) || 0), 0);
                const totalVentas = lista.reduce((acc, item) => acc + (Number(item.totalVentas) || 0), 0);
                const totalSobrante = lista.reduce((acc, item) => acc + (Number(item.sobrante) || 0), 0);
                const totalFaltante = lista.reduce((acc, item) => acc + (Number(item.faltante) || 0), 0);
                const isOpen = openCajero === cajero;

                return (
                  <Card key={cajero} className="overflow-hidden shadow-xl hover:shadow-2xl transition-all border-0">
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 hover:from-slate-100 hover:to-blue-100 border-b border-slate-200 h-auto"
                      onClick={() => setOpenCajero(isOpen ? null : cajero)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center font-bold text-white text-lg">
                          {cajero.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900">{cajero}</h3>
                          <div className="flex flex-wrap gap-2 text-sm text-slate-600 mt-1">
                            {lista[0].estado && (
                              <Badge variant={lista[0].estado === "activo" ? "default" : "secondary"}>
                                {lista[0].estado}
                              </Badge>
                            )}
                            <span>📊 {lista.length} turno(s)</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-emerald-700 mb-1">
                          ${totalComision.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-slate-600 font-medium">
                          Total Ventas: <span className="text-slate-900">${totalVentas.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </Button>

                    {/* Resumen General del Cajero */}
                    <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm font-bold text-slate-800">
                      <div className="flex flex-col">
                        <span className="text-xs text-black uppercase tracking-wide">Total Ventas</span>
                        <span className="text-lg text-slate-800">${totalVentas.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-black uppercase tracking-wide">Total Sobrante</span>
                        <span className="text-lg text-emerald-600">+${totalSobrante.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-black uppercase tracking-wide">Total Faltante</span>
                        <span className="text-lg text-red-600">-${totalFaltante.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex flex-col bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-xs text-black uppercase tracking-wide">Total Comisión</span>
                        <span className="text-lg text-blue-700 font-black">${totalComision.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Detalle Turnos Expandible */}
                    <div className={`overflow-hidden transition-all duration-500 ${isOpen ? "max-h-[800px] overflow-y-auto" : "max-h-0"}`}>
                      <div className="p-4 space-y-3 bg-slate-50/50">
                        {lista.map((item, index) => (
                          <div
                            key={index}
                            className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                          >
                            {/* Cabecera del Item: Info Contextual */}
                            <div className="flex flex-wrap justify-between items-center mb-3 pb-2 border-b border-slate-100">
                              <div className="flex gap-4 text-md text-black font-medium">
                                <span className="flex items-center gap-1">📅 {item.dia?.slice(0, 10)}</span>
                                <span className="flex items-center gap-1">🕒 {item.turno}</span>
                                <span className="flex items-center gap-1">🏥 {Array.isArray(item.farmacias) ? item.farmacias.join(", ") : Object.values(item.farmacias || {}).join(", ")}</span>
                              </div>
                              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                Comisión: {item.comisionPorcentaje}%
                              </Badge>
                            </div>

                            {/* Cuerpo del Item: Datos Financieros Desglosados */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                              {/* 1. Ventas */}
                              <div>
                                <p className="text-md text-black mb-1">Total Vendido</p>
                                <div className="font-bold text-slate-700 text-lg">
                                  ${Number(item.totalVentas || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>

                              {/* 2. Sobrante */}
                              <div>
                                <p className="text-md text-black mb-1">Sobrante</p>
                                <div className={`font-bold text-lg ${Number(item.sobrante) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {Number(item.sobrante) > 0 ? '+' : ''}${Number(item.sobrante || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>

                              {/* 3. Faltante */}
                              <div>
                                <p className="text-md text-black mb-1">Faltante</p>
                                <div className={`font-bold text-lg ${Number(item.faltante) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {Number(item.faltante) > 0 ? '-' : ''}${Number(item.faltante || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>

                              {/* 4. Comisión Final */}
                              <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-lg border border-emerald-100 text-right">
                                <p className="text-md text-emerald-800 font-semibold mb-1">COMISIÓN</p>
                                <div className="font-black text-emerald-700 text-xl">
                                  ${Number(item.comision || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
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
              <div className="text-center py-12 text-black bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                <div className="text-4xl mb-4">📊</div>
                Selecciona un rango de fechas y haz clic en "Obtener" para ver las comisiones
              </div>
            )
          )}
        </Card>
      </div>
    </div>
  );
};

export default ComisionesPorTurnoPage;