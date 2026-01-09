import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ListaCuadresFarmacia from "@/components/ListaCuadresFarmacia";
import ListaCuentasPorPagarFarmacia from "@/components/ListaCuentasPorPagarFarmacia";
import type { Gasto } from "@/Types";
import ListaGastosFarmacia from "./ListaGastosFarmacia";

interface Farmacia {
  id: string;
  nombre: string;
}

interface DateRange {
  inicio: string;
  fin: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Custom hooks para cada endpoint
const useCuadresFarmacia = (farmaciaId: string | null, fechaInicio: string, fechaFin: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCuadres = useCallback(async () => {
    if (!farmaciaId || !fechaInicio || !fechaFin) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ fechaInicio: fechaInicio, fechaFin: fechaFin, farmacia: farmaciaId.toString() });
      const response = await fetch(`${API_BASE}/cuadres?${params}`);
      if (!response.ok) throw new Error("Error cargando cuadres");
      const result = await response.json();
      setData(result.data || result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setLoading(false); }
  }, [farmaciaId, fechaInicio, fechaFin]);

  return { data, setData, loading, error, fetchCuadres };
};

const useGastosFarmacia = (farmaciaId: string | null, fechaInicio: string, fechaFin: string) => {
  const [data, setData] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGastos = useCallback(async () => {
    if (!farmaciaId || !fechaInicio || !fechaFin) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, localidad: farmaciaId });
      const response = await fetch(`${API_BASE}/gastos?${params}`);
      if (!response.ok) throw new Error("Error cargando gastos");
      const result = await response.json();
      setData(result.data || result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setLoading(false); }
  }, [farmaciaId, fechaInicio, fechaFin]);

  return { data, setData, loading, error, fetchGastos };
};

const useCuentasPorPagar = (farmaciaId: string | null, fechaInicio: string, fechaFin: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCuentas = useCallback(async () => {
    if (!farmaciaId || !fechaInicio || !fechaFin) return;
    setLoading(true);
    setError(null);
    try {
      // Usamos los nombres de parámetros definidos en el endpoint de Python
      const params = new URLSearchParams({ startDate: fechaInicio, endDate: fechaFin });
      const response = await fetch(`${API_BASE}/cuentas-por-pagar/rango?${params}`);
      if (!response.ok) throw new Error("Error cargando cuentas");
      const result = await response.json();
      // Filtrar por farmacia localmente si el endpoint de rango es general
      const filtrados = (result.data || result || []).filter((c: any) => c.farmacia === farmaciaId);
      setData(filtrados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setLoading(false); }
  }, [farmaciaId, fechaInicio, fechaFin]);

  return { data, setData, loading, error, fetchCuentas };
};

const GastosCuentasCuadresPorFarmaciaPage: React.FC = () => {
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<Farmacia | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ inicio: "", fin: "" });

  const [hasSearched, setHasSearched] = useState(false); // Estado para controlar si ya se hizo clic en buscar
  // Custom hooks con filtros independientes
  const gastosHook = useGastosFarmacia(selectedFarmacia?.id || null, dateRange.inicio, dateRange.fin);
  const cuentasHook = useCuentasPorPagar(selectedFarmacia?.id || null, dateRange.inicio, dateRange.fin);
  const cuadresHook = useCuadresFarmacia(selectedFarmacia?.id || null, dateRange.inicio, dateRange.fin);

  const handleDateChange = (key: keyof DateRange, value: string) => {
    setDateRange(prev => ({ ...prev, [key]: value }));
    setHasSearched(false);
  };
  const handleFarmaciaSelect = (farm: Farmacia) => {
    setSelectedFarmacia(farm);
    setHasSearched(false);
    // Opcional: limpiar tablas anteriores al cambiar farmacia
    gastosHook.setData([]);
    cuentasHook.setData([]);
    cuadresHook.setData([]);
  };
  const handleSearchAll = useCallback(() => {
    if (dateRange.inicio && dateRange.fin && selectedFarmacia) {
      setHasSearched(true);
      gastosHook.fetchGastos();
      cuentasHook.fetchCuentas();
      cuadresHook.fetchCuadres();
    }
  }, [dateRange, selectedFarmacia, gastosHook, cuentasHook, cuadresHook]);


  // Cargar farmacias
  useEffect(() => {
    const usuarioStr = localStorage.getItem("usuario");
    if (!usuarioStr) return;
    const usuario = JSON.parse(usuarioStr);
    const farmaciasArr = Object.entries(usuario.farmacias || {}).map(([id, nombre]) => ({
      id, nombre: String(nombre)
    }));
    setFarmacias(farmaciasArr);
  }, []);
  // Handlers de filtros rápidos


  if (!farmacias.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Sin Farmacias</h1>
          <p className="text-slate-600 mb-6">No se encontraron farmacias asociadas a tu cuenta.</p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Recargar
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 text-center">Resumen por Farmacia</h1>

        {/* Selector Farmacias */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {farmacias.map(farm => (
            <Button
              key={farm.id}
              variant={selectedFarmacia?.id === farm.id ? "default" : "outline"}
              onClick={() => handleFarmaciaSelect(farm)}
              className="rounded-xl font-bold border-2"
            >
              {farm.nombre}
            </Button>
          ))}
        </div>

        {/* Filtros CENTRALIZADOS */}
        {selectedFarmacia && (
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex flex-col lg:flex-row gap-6 items-end">

              <div className="flex flex-col min-w-[150px]">
                <label className="text-xs font-bold mb-1">Desde</label>
                <Input
                  type="date"
                  value={dateRange.inicio}
                  onChange={e => handleDateChange('inicio', e.target.value)}
                />
              </div>

              <div className="flex flex-col min-w-[150px]">
                <label className="text-xs font-bold mb-1">Hasta</label>
                <Input
                  type="date"
                  value={dateRange.fin}
                  onChange={e => handleDateChange('fin', e.target.value)}
                />
              </div>

              <Button
                onClick={handleSearchAll}
                disabled={!dateRange.inicio || !dateRange.fin || gastosHook.loading}
                className="bg-indigo-600 hover:bg-indigo-700 px-10 h-10 font-bold"
              >
                {gastosHook.loading ? "⏳ Buscando..." : "🔍 Buscar Todo"}
              </Button>
            </div>
          </div>
        )}

        {/* CARDS DE RESULTADOS */}
        {hasSearched && selectedFarmacia ? (
          <div className="space-y-6">
            {/* GASTOS */}
            {/* Gastos */}
            <Card className="p-6 border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  💰 Gastos del Periodo
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {gastosHook.data.length}
                  </Badge>
                </h2>
              </div>

              {gastosHook.loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm font-medium">Consultando gastos...</p>
                </div>
              ) : (
                <ListaGastosFarmacia data={gastosHook.data} />
              )}
            </Card>

            {/* CUENTAS */}
            <Card className="p-4">
              <h2 className="text-lg font-bold mb-4">💳 Cuentas por Pagar ({cuentasHook.data.length})</h2>
              <ListaCuentasPorPagarFarmacia
                data={cuentasHook.data}
              />
            </Card>

            {/* CUADRES */}
            <Card className="p-4">
              <h2 className="text-lg font-bold mb-4">📊 Cuadres de Caja ({cuadresHook.data.length})</h2>
              <ListaCuadresFarmacia
                farmaciaId={selectedFarmacia.id}
                data={cuadresHook.data}
              />
            </Card>
          </div>
        ) : (
          selectedFarmacia && (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl text-slate-400">
              Selecciona un rango de fechas y presiona "Buscar Todo" para ver la información.
            </div>
          )
        )}
      </div>
    </div>
  );
};
export default GastosCuentasCuadresPorFarmaciaPage;
