import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGastos } from "@/hooks/useGastos";
import AgregarGastosPage from "./AgregarGastosPage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusCircle, LayoutDashboard, MapPin } from "lucide-react";
import ModalDetallesGastos from "@/components/gastos/ModalDetallesGastos";

const ChequeoGastosPage: React.FC = () => {
  const {
    localidades,
    gastos,
    loading,
    fetchGastosPorEstado,
    refreshGastosSilently,
    removeGasto,
  } = useGastos();

  const [modalGastos, setModalGastos] = useState({ abierto: false, id: "", nombre: "" });
  const [modalAgregar, setModalAgregar] = useState(false);
  const [gastoAEliminar, setGastoAEliminar] = useState<string | null>(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchGastosPorEstado("wait");
  }, [fetchGastosPorEstado]);

  const gastosPorLocalidad = useMemo(() => {
    const agrupados: Record<string, any[]> = {};
    for (const gasto of gastos) {
      const loc = gasto.localidad || "Sin Localidad";
      if (!agrupados[loc]) agrupados[loc] = [];
      agrupados[loc].push(gasto);
    }
    return agrupados;
  }, [gastos]);

  const actualizarEstadoGasto = async (id: string, estado: string) => {
    try {
      removeGasto(id);
      const res = await fetch(`${apiBase}/gastos/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      if (!res.ok) {
        refreshGastosSilently("wait");
        throw new Error("Error en el servidor");
      }
      refreshGastosSilently("wait");
    } catch {
      alert("No se pudo actualizar el estado.");
      refreshGastosSilently("wait");
    }
  };

  const eliminarGasto = async (id: string) => {
    try {
      removeGasto(id);
      setGastoAEliminar(null);
      const res = await fetch(`${apiBase}/gastos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      refreshGastosSilently("wait");
    } catch {
      alert("Error al eliminar.");
      refreshGastosSilently("wait");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Cargando panel de gastos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm">
              <LayoutDashboard className="text-red-500 w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Panel de Gastos
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Gestión de egresos por localidad.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden sm:inline-flex border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-xl px-3 h-10 text-xs sm:text-sm"
              onClick={() => fetchGastosPorEstado("wait")}
            >
              Actualizar
            </Button>
            <Button
              onClick={() => setModalAgregar(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-medium h-10 sm:h-11 px-4 sm:px-5 rounded-xl shadow-sm gap-2 text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Agregar gasto
            </Button>
          </div>
        </header>

        {/* Localidades */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <p className="text-xs sm:text-sm text-slate-500">
              Localidades con gastos en espera.
            </p>
            <span className="hidden sm:inline-flex text-[11px] text-slate-400">
              Seleccione una localidad.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {localidades.map((loc) => {
              const pendientes = (gastosPorLocalidad[loc.id] || []).length;
              const hasPendientes = pendientes > 0;

              return (
                <Card
                  key={loc.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {hasPendientes && (
                    <div className="absolute inset-x-4 top-3 flex justify-between items-center text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Pendientes
                      </span>
                      <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        {pendientes}
                      </span>
                    </div>
                  )}

                  <div className="p-4 pt-7 space-y-4">
                    <div className="flex items-center justify-start gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        {loc.nombre}
                      </h3>
                    </div>


                    <Button
                      onClick={() =>
                        setModalGastos({
                          abierto: true,
                          id: loc.id,
                          nombre: loc.nombre,
                        })
                      }
                      className="w-full justify-center rounded-xl text-xs sm:text-sm font-medium bg-slate-900 hover:bg-red-600 text-white py-2 mt-1"
                    >
                      Revisar gastos
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Modal Detalles */}
        <ModalDetallesGastos
          open={modalGastos.abierto}
          onClose={() => setModalGastos((p) => ({ ...p, abierto: false }))}
          nombreLocalidad={modalGastos.nombre}
          gastos={gastosPorLocalidad[modalGastos.id] || []}
          onActualizar={actualizarEstadoGasto}
          onEliminar={(id) => setGastoAEliminar(id)}
        />

        {/* Modal Agregar */}
        <Dialog open={modalAgregar} onOpenChange={setModalAgregar}>
          <DialogContent className="sm:max-w-[720px] rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden shadow-lg">
            <div className="bg-emerald-500 px-5 py-4 text-white">
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                Nuevo registro
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs sm:text-sm text-emerald-50">
                Ingrese los datos del gasto.
              </DialogDescription>
            </div>
            <div className="p-5 sm:p-6">
              <AgregarGastosPage
                onSubmitSuccess={() => {
                  fetchGastosPorEstado("wait");
                  setModalAgregar(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Confirmar Eliminación */}
        <Dialog open={!!gastoAEliminar} onOpenChange={() => setGastoAEliminar(null)}>
          <DialogContent className="sm:max-w-[380px] rounded-2xl border border-slate-200 bg-white shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-semibold text-slate-900">
                ¿Eliminar gasto?
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-slate-500">
                Esta acción es permanente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-center pt-3">
              <Button
                onClick={() => setGastoAEliminar(null)}
                variant="outline"
                className="rounded-xl flex-1 border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => gastoAEliminar && eliminarGasto(gastoAEliminar)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl flex-1 text-sm"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ChequeoGastosPage;
