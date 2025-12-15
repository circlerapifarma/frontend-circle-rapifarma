import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Banco } from "@/hooks/useBancos";

interface TransferenciaModalProps {
  open: boolean;
  onClose: () => void;
  banco: Banco;
  onTransferencia: (bancoId: string, monto: number, detalles: string, nombreTitular: string) => Promise<void>;
}

const TransferenciaModal: React.FC<TransferenciaModalProps> = ({
  open,
  onClose,
  banco,
  onTransferencia,
}) => {
  const [monto, setMonto] = useState("");
  const [detalles, setDetalles] = useState("");
  const [nombreTitular, setNombreTitular] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) {
      alert("Por favor ingrese un monto válido");
      return;
    }
    if (parseFloat(monto) > (banco.disponible || 0)) {
      alert("El monto excede el disponible del banco");
      return;
    }
    if (!detalles.trim()) {
      alert("Por favor ingrese los detalles de la transferencia");
      return;
    }
    if (!nombreTitular.trim()) {
      alert("Por favor ingrese el nombre del titular");
      return;
    }

    setLoading(true);
    try {
      await onTransferencia(banco._id!, parseFloat(monto), detalles, nombreTitular);
      setMonto("");
      setDetalles("");
      setNombreTitular("");
      onClose();
      alert("Transferencia realizada exitosamente");
    } catch (error: any) {
      alert(error.message || "Error al realizar la transferencia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Realizar Transferencia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco: {banco.nombreBanco}
              </label>
              <p className="text-xs text-gray-500">Cuenta: {banco.numeroCuenta}</p>
              <p className="text-xs text-gray-500">Disponible: ${banco.disponible?.toFixed(2) || "0.00"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto (USD) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={banco.disponible || 0}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Titular *
              </label>
              <Input
                type="text"
                value={nombreTitular}
                onChange={(e) => setNombreTitular(e.target.value)}
                required
                placeholder="Nombre del beneficiario"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detalles *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={detalles}
                onChange={(e) => setDetalles(e.target.value)}
                required
                placeholder="Descripción de la transferencia..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? "Procesando..." : "Transferir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferenciaModal;

