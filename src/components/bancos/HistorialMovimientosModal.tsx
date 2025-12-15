import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Banco, Movimiento } from "@/hooks/useBancos";
// Usar un spinner simple si Loader2 no está disponible

interface HistorialMovimientosModalProps {
  open: boolean;
  onClose: () => void;
  banco: Banco;
  fetchMovimientos: (bancoId: string) => Promise<Movimiento[]>;
}

const HistorialMovimientosModal: React.FC<HistorialMovimientosModalProps> = ({
  open,
  onClose,
  banco,
  fetchMovimientos,
}) => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && banco._id) {
      loadMovimientos();
    }
  }, [open, banco._id]);

  const loadMovimientos = async () => {
    if (!banco._id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMovimientos(banco._id);
      setMovimientos(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar movimientos");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      deposito: "Depósito",
      transferencia: "Transferencia",
      cheque: "Cheque",
      retiro: "Retiro",
    };
    return labels[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      deposito: "bg-green-100 text-green-800",
      transferencia: "bg-blue-100 text-blue-800",
      cheque: "bg-purple-100 text-purple-800",
      retiro: "bg-red-100 text-red-800",
    };
    return colors[tipo] || "bg-gray-100 text-gray-800";
  };

  const getMontoColor = (tipo: string) => {
    if (tipo === "deposito") return "text-green-600 font-bold";
    return "text-red-600 font-bold";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de Movimientos - {banco.nombreBanco}</DialogTitle>
          <p className="text-sm text-gray-500">Cuenta: {banco.numeroCuenta}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay movimientos registrados</div>
        ) : (
          <div className="space-y-4">
            {movimientos.map((movimiento) => (
              <div
                key={movimiento._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getTipoColor(
                        movimiento.tipo
                      )}`}
                    >
                      {getTipoLabel(movimiento.tipo)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(movimiento.fecha)}
                    </span>
                  </div>
                  <span className={`text-lg ${getMontoColor(movimiento.tipo)}`}>
                    {movimiento.tipo === "deposito" ? "+" : "-"}
                    {formatCurrency(movimiento.monto)}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-700">{movimiento.detalles}</p>
                  {movimiento.nombreTitular && (
                    <p className="text-xs text-gray-500 mt-1">
                      Titular: {movimiento.nombreTitular}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistorialMovimientosModal;

