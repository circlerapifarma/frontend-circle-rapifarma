import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Banco } from "@/hooks/useBancos";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface DepositoModalProps {
  open: boolean;
  onClose: () => void;
  banco: Banco;
  onDeposito: (
    bancoId: string,
    monto: number,
    detalles: string,
    farmacia?: string,
    tipoPago?: "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil",
    montoOriginalBs?: number,
    tasa?: number
  ) => Promise<any>;
  onDepositoSuccess?: (bancoActualizado: any) => void;
}

const DepositoModal: React.FC<DepositoModalProps> = ({ open, onClose, banco, onDeposito, onDepositoSuccess }) => {
  const [monto, setMonto] = useState("");
  const [tasa, setTasa] = useState("");
  const [detalles, setDetalles] = useState("");
  const [farmacia, setFarmacia] = useState("");
  const [tipoPago, setTipoPago] = useState<"efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil" | "">("");
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchFarmacias = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/farmacias`);
          const data = await res.json();
          const lista = data.farmacias
            ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
            : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
          setFarmacias(lista);
        } catch (err) {
          console.error("Error al obtener farmacias:", err);
        }
      };
      fetchFarmacias();
      // Inicializar tasa con la tasa del banco si existe (solo como sugerencia)
      if (banco.tipoMoneda === "Bs" && banco.tasa) {
        setTasa(banco.tasa.toString());
      } else {
        setTasa("");
      }
    }
  }, [open, banco]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) {
      alert("Por favor ingrese un monto válido");
      return;
    }
    if (!detalles.trim()) {
      alert("Por favor ingrese los detalles del depósito");
      return;
    }
    if (!tipoPago) {
      alert("Por favor seleccione el tipo de pago");
      return;
    }

    // Validar tasa si el banco es en Bs
    let tasaUsada: number | undefined = undefined;
    if (banco.tipoMoneda === "Bs") {
      if (!tasa || parseFloat(tasa) <= 0) {
        alert("Por favor ingrese la tasa del día para realizar el depósito");
        return;
      }
      tasaUsada = parseFloat(tasa);
    }

    setLoading(true);
    try {
      let montoAEnviar = parseFloat(monto);
      
      // Si el banco es en Bs, convertir a USD dividiendo por la tasa ingresada
      let montoOriginalBs: number | undefined = undefined;
      if (banco.tipoMoneda === "Bs" && tasaUsada && tasaUsada > 0) {
        montoOriginalBs = montoAEnviar;
        montoAEnviar = montoOriginalBs / tasaUsada;
      }
      
      // Calcular monto neto (después de restar comisión)
      let montoNeto = montoAEnviar;
      if (banco.porcentajeComision && banco.porcentajeComision > 0) {
        montoNeto = montoAEnviar * (1 - banco.porcentajeComision / 100);
      }
      
      const bancoActualizado = await onDeposito(
        banco._id!,
        montoNeto, // Enviar monto neto (USD si banco es USD, USD convertido si banco es Bs)
        detalles,
        farmacia || undefined,
        tipoPago || undefined,
        montoOriginalBs, // Solo enviar si banco es Bs
        tasaUsada // Tasa ingresada por el usuario (solo si banco es Bs)
      );
      
      // Limpiar formulario
      setMonto("");
      setTasa("");
      setDetalles("");
      setFarmacia("");
      setTipoPago("");
      
      // Notificar éxito y actualizar banco si hay callback
      if (onDepositoSuccess && bancoActualizado) {
        onDepositoSuccess(bancoActualizado);
      }
      
      // Cerrar modal silenciosamente
      onClose();
    } catch (error: any) {
      alert(error.message || "Error al realizar el depósito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Realizar Depósito</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco: {banco.nombreBanco}
              </label>
              <p className="text-xs text-gray-500">Cuenta: {banco.numeroCuenta}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto ({banco.tipoMoneda === "Bs" ? "Bs" : "USD"}) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                placeholder="0.00"
              />
              {banco.tipoMoneda === "Bs" && tasa && parseFloat(tasa) > 0 && monto && parseFloat(monto) > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    Conversión (Tasa: {parseFloat(tasa).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}):
                  </p>
                  <p className="text-xs text-blue-700">
                    Monto en Bs: {parseFloat(monto).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                  </p>
                  <p className="text-xs text-blue-700">
                    Equivalente en USD: {(parseFloat(monto) / parseFloat(tasa)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
                </div>
              )}
              {banco.porcentajeComision && banco.porcentajeComision > 0 && monto && parseFloat(monto) > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">
                    Comisión por punto ({banco.porcentajeComision}%):
                  </p>
                  {banco.tipoMoneda === "Bs" && tasa && parseFloat(tasa) > 0 ? (
                    <>
                      <p className="text-xs text-yellow-700">
                        Monto en USD (después de conversión): {(parseFloat(monto) / parseFloat(tasa)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                      <p className="text-xs text-yellow-700">
                        Comisión: {((parseFloat(monto) / parseFloat(tasa)) * banco.porcentajeComision / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                      <p className="text-xs font-semibold text-yellow-900 mt-1">
                        Monto neto a depositar: {((parseFloat(monto) / parseFloat(tasa)) * (1 - banco.porcentajeComision / 100)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        (Monto original en Bs: {parseFloat(monto).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs)
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-yellow-700">
                        Monto ingresado: {parseFloat(monto).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                      <p className="text-xs text-yellow-700">
                        Comisión: {(parseFloat(monto) * banco.porcentajeComision / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                      <p className="text-xs font-semibold text-yellow-900 mt-1">
                        Monto neto a depositar: {(parseFloat(monto) * (1 - banco.porcentajeComision / 100)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            {banco.tipoMoneda === "Bs" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasa del Día *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tasa}
                  onChange={(e) => setTasa(e.target.value)}
                  required
                  placeholder="Ej: 1.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingrese la tasa de cambio del día para convertir Bs a USD
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Farmacia (Opcional)
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                value={farmacia}
                onChange={(e) => setFarmacia(e.target.value)}
              >
                <option value="">Seleccione una farmacia</option>
                {farmacias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Pago *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value as any)}
                required
              >
                <option value="">Seleccione tipo de pago</option>
                <option value="pagoMovil">Pago Móvil</option>
                <option value="debito">Punto debito/credito</option>
                <option value="zelle">Zelle</option>
                <option value="efectivoBs">Efectivo Bs</option>
                <option value="efectivoUsd">Efectivo USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detalles *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                value={detalles}
                onChange={(e) => setDetalles(e.target.value)}
                required
                placeholder="Descripción del depósito..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? "Procesando..." : "Depositar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepositoModal;

