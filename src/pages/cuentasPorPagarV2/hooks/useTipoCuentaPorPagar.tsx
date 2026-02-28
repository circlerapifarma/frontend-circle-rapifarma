// hooks/useTipoCuenta.ts
import { useState } from 'react';

export const TIPO_CUENTA_OPCIONES = [
  "traslado", 
  "pago_listo", 
  "cuenta_por_pagar"
] as const;

export type TipoCuenta = typeof TIPO_CUENTA_OPCIONES[number];

export const useTipoCuentaService = () => {
  const [tipoLoading, setTipoLoading] = useState<string | null>(null);
  const [tipoError, setTipoError] = useState<string | null>(null);

  const actualizarTipoCuenta = async (
    cuentaId: string, 
    nuevoTipo: TipoCuenta
  ) => {
    setTipoLoading(cuentaId);
    setTipoError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/cuentas-por-pagar/${cuentaId}/tipo`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ tipo: nuevoTipo })
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al actualizar tipo");
      }

      return true;
    } catch (err: any) {
      setTipoError(err.message);
      throw err;
    } finally {
      setTipoLoading(null);
    }
  };

  return {
    actualizarTipoCuenta,
    tipoLoading,
    tipoError,
    TIPO_CUENTA_OPCIONES
  };
};
