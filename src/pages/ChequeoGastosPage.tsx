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
import ImageDisplay from "@/components/upfile/ImageDisplay";

const ChequeoGastosPage: React.FC = () => {
  const {
    localidades,
    gastos,
    loading,
    error,
    fetchGastosPorEstado,
    refreshGastosSilently,
    removeGasto,
  } = useGastos();

  const [modalGastos, setModalGastos] = useState({ abierto: false, id: "", nombre: "" });
  const [modalAgregar, setModalAgregar] = useState(false);
  const [gastoAEliminar, setGastoAEliminar] = useState<string | null>(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // cargar solo gastos con estado wait
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
      // Actualización optimista: remover el gasto inmediatamente del estado local
      // Esto hace que desaparezca del modal instantáneamente
      removeGasto(id);
      
      // Actualizar el estado en el servidor
      const res = await fetch(`${apiBase}/gastos/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      
      if (!res.ok) {
        // Si falla, recargar los gastos para restaurar el estado correcto
        refreshGastosSilently("wait");
        throw new Error((await res.json()).message);
      }
      
      // Sincronizar con el servidor en segundo plano para asegurar consistencia
      refreshGastosSilently("wait");
      
      // NO cerrar el modal - mantenerlo abierto para seguir verificando
    } catch (e) {
      console.error("Error actualizando gasto:", e);
      alert("Error al actualizar el gasto. Por favor, intenta de nuevo.");
      // Recargar los gastos para restaurar el estado correcto
      refreshGastosSilently("wait");
    }
  };

  const eliminarGasto = async (id: string) => {
    try {
      // Actualización optimista: remover el gasto inmediatamente del estado local
      removeGasto(id);
      setGastoAEliminar(null);
      
      // Eliminar el gasto en el servidor
      const res = await fetch(`${apiBase}/gastos/${id}`, { method: "DELETE" });
      
      if (!res.ok) {
        // Si falla, recargar los gastos para restaurar el estado correcto
        refreshGastosSilently("wait");
        throw new Error((await res.json()).message);
      }
      
      // Sincronizar con el servidor en segundo plano
      refreshGastosSilently("wait");
    } catch (e) {
      console.error("Error al eliminar gasto:", e);
      alert("Error al eliminar el gasto. Por favor, intenta de nuevo.");
      // Recargar los gastos para restaurar el estado correcto
      refreshGastosSilently("wait");
    }
  };

  if (loading)
    return <p className="text-center py-12 text-xl text-gray-700">Cargando datos...</p>;
  if (error)
    return <p className="text-center py-12 text-xl text-red-600">Error: {error}</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center mb-12 text-gray-900">
          Panel de Chequeo de <span className="text-red-600">Gastos</span>
        </h1>

        <header className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Localidades</h2>
          <Button
            onClick={() => setModalAgregar(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-transform hover:scale-105"
          >
            + Agregar Gasto
          </Button>
        </header>

        {localidades.length === 0 ? (
          <p className="text-center text-gray-500 text-lg mt-8">
            No hay localidades disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {localidades.map((loc) => {
              const pendientes = (gastosPorLocalidad[loc.id] || []).length;
              return (
                <Card
                  key={loc.id}
                  className="relative bg-white p-7 rounded-2xl shadow-lg hover:shadow-2xl transition-transform hover:-translate-y-1 border-l-6 border-red-500"
                >
                  <div className="text-center text-2xl font-bold text-gray-800 mb-4">
                    {loc.nombre}
                  </div>
                  {pendientes > 0 && (
                    <span className="absolute top-4 right-4 bg-red-600 text-white text-md font-bold px-3 py-1 rounded-full animate-bounce">
                      {pendientes} pendientes
                    </span>
                  )}
                  <Button
                    onClick={() =>
                      setModalGastos({ abierto: true, id: loc.id, nombre: loc.nombre })
                    }
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 mt-4 rounded-lg transition-transform hover:scale-105"
                  >
                    Ver Gastos ({pendientes})
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={modalGastos.abierto} onOpenChange={(o) => setModalGastos((p) => ({ ...p, abierto: o }))}>
          <DialogContent className="sm:max-w-[800px] p-8 rounded-3xl shadow-xl border-4 border-red-500">
            <DialogHeader>
              <DialogTitle className="text-3xl font-extrabold text-red-600 text-center">
                Gastos Pendientes - {modalGastos.nombre}
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                Revisa y gestiona los gastos pendientes.
              </DialogDescription>
            </DialogHeader>

            {(gastosPorLocalidad[modalGastos.id] || []).length === 0 ? (
              <p className="text-center text-gray-500 text-xl py-8">
                Sin gastos pendientes.
              </p>
            ) : (
              <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
                {gastosPorLocalidad[modalGastos.id].map((gasto) => {
                  const tasa = Number(gasto.tasa) || 0;
                  const isBs = gasto.divisa === "Bs";
                  const montoBs = isBs ? gasto.monto : gasto.monto * tasa;
                  const montoUsd = isBs ? gasto.monto / (tasa || 1) : gasto.monto;

                  return (
                    <Card
                      key={gasto._id}
                      className="p-6 border-2 border-red-400 rounded-2xl bg-white/80 flex flex-col gap-4 shadow-md"
                    >
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{gasto.titulo}</h3>
                        <p className="text-gray-600 text-base">{gasto.descripcion}</p>
                        <p className="text-sm text-gray-500">Fecha: {gasto.fecha}</p>
                        {gasto.fechaRegistro && (
                          <p className="text-sm text-gray-500">
                            Registro: {new Date(gasto.fechaRegistro).toLocaleDateString("es-ES")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2">
                          <span className="bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-lg text-lg">
                            {gasto.monto.toLocaleString("es-VE", { minimumFractionDigits: 2 })}{" "}
                            {gasto.divisa}
                          </span>
                          {tasa > 0 && (
                            <span className="bg-yellow-100 text-yellow-800 font-semibold px-3 py-1 rounded-lg text-lg">
                              Tasa: {tasa}
                            </span>
                          )}
                          <span className="bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-lg text-lg">
                            {isBs
                              ? `≈ ${montoUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`
                              : `≈ ${montoBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })} Bs`}
                          </span>
                        </div>
                        {Array.isArray(gasto.imagenesGasto) && gasto.imagenesGasto.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {gasto.imagenesGasto.map((img:any, i:any) => (
                              <ImageDisplay
                                key={i}
                                imageName={img}
                                style={{ maxWidth: 100, maxHeight: 100, borderRadius: 8 }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          onClick={() => actualizarEstadoGasto(gasto._id, "verified")}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          ✅ Verificar
                        </Button>
                        <Button
                          onClick={() => actualizarEstadoGasto(gasto._id, "denied")}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          ❌ Denegar
                        </Button>
                        <Button
                          onClick={() => setGastoAEliminar(gasto._id)}
                          className="bg-gray-400 hover:bg-gray-500 text-white"
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={() => setModalGastos((p) => ({ ...p, abierto: false }))}
                className="bg-gray-700 hover:bg-gray-800 text-white"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modalAgregar} onOpenChange={setModalAgregar}>
          <DialogContent className="sm:max-w-[800px] p-8 rounded-3xl shadow-xl border-4 border-green-600">
            <DialogHeader>
              <DialogTitle className="text-3xl font-extrabold text-green-700 text-center">
                Agregar Nuevo Gasto
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                Completa los detalles para añadir un nuevo gasto.
              </DialogDescription>
            </DialogHeader>
            <AgregarGastosPage
              onSubmitSuccess={() => {
                fetchGastosPorEstado("wait");
                setModalAgregar(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!gastoAEliminar} onOpenChange={() => setGastoAEliminar(null)}>
          <DialogContent className="sm:max-w-[425px] p-6 rounded-2xl shadow-xl border-2 border-red-500">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-red-600 text-center">
                Confirmar Eliminación
              </DialogTitle>
              <DialogDescription className="text-center text-gray-700 mt-2">
                ¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-center gap-4">
              <Button onClick={() => setGastoAEliminar(null)} className="bg-gray-300 hover:bg-gray-400 text-gray-800">
                Cancelar
              </Button>
              <Button
                onClick={() => gastoAEliminar && eliminarGasto(gastoAEliminar)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ChequeoGastosPage;
