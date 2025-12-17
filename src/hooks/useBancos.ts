import { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Extrae mensaje de error de cualquier formato de respuesta
 */
async function extraerMensajeError(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    
    // Error 422 (Validación)
    if (response.status === 422) {
      if (Array.isArray(errorData.detail)) {
        // Formato: Array de errores de Pydantic
        return errorData.detail
          .map((e: any) => {
            const campo = e.loc?.[e.loc.length - 1] || "campo";
            const campoLegible = campo
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (str: string) => str.toUpperCase())
              .trim();
            return `${campoLegible}: ${e.msg || e.message || "Error de validación"}`;
          })
          .join('\n');
      }
      // Formato: String simple
      return typeof errorData.detail === 'string' 
        ? errorData.detail 
        : JSON.stringify(errorData.detail);
    }

    // Otros errores
    if (errorData.detail) {
      return typeof errorData.detail === 'string' 
        ? errorData.detail 
        : JSON.stringify(errorData.detail);
    }

    if (errorData.message) {
      return errorData.message;
    }

    return `Error ${response.status}: ${response.statusText}`;
  } catch (e) {
    return `Error ${response.status}: ${response.statusText}`;
  }
}

export interface Banco {
  _id?: string;
  numeroCuenta: string;
  nombreTitular: string;
  nombreBanco: string;
  cedulaRif: string;
  tipoMoneda: "USD" | "Bs"; // Tipo de moneda del banco
  disponible: number; // Saldo disponible (en la moneda del banco)
  tasa?: number; // Tasa de cambio del día (solo si tipoMoneda es "Bs")
  disponibleUsd?: number; // Saldo disponible en USD (calculado si tipoMoneda es "Bs")
  metodoPagoDefault?: "pagoMovil" | "debito" | "credito" | "transferencia" | "efectivoBs" | "efectivoUsd";
  farmacias?: string[]; // IDs de las farmacias que utilizan este banco
  createdAt?: string;
  updatedAt?: string;
}

export interface Movimiento {
  _id?: string;
  bancoId: string;
  farmacia?: string; // ID de la farmacia
  tipo: "deposito" | "transferencia" | "cheque" | "retiro";
  concepto?: "cuentas_pagadas" | "transferencia" | "retiro_efectivo" | "ingreso_venta" | "gasto_tarjeta_debito" | string; // Concepto del movimiento
  tipoPago?: "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil"; // Tipo de pago para depósitos
  monto: number; // Monto en la moneda del banco
  montoOriginal?: number; // Monto original antes de conversión (para depósitos en Bs)
  montoUsd?: number; // Monto en USD (calculado si el banco es en Bs)
  tipoMonedaBanco?: "USD" | "Bs"; // Tipo de moneda del banco
  tasaUsada?: number; // Tasa de cambio usada para la conversión
  detalles: string;
  nombreTitular?: string; // Para transferencias y cheques
  fecha: string;
  createdAt?: string;
}

export function useBancos() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Obtener todos los bancos
  const fetchBancos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/bancos`, { headers });
      if (!res.ok) throw new Error("Error al obtener bancos");
      const data = await res.json();
      setBancos(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener bancos");
      setBancos([]);
    } finally {
      setLoading(false);
    }
  };

  // Crear banco
  const crearBanco = async (banco: Omit<Banco, "_id" | "disponible" | "createdAt" | "updatedAt">) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Preparar datos para enviar (no incluir disponibleUsd, se calcula en el backend)
      const bancoToSend = {
        ...banco,
        disponible: 0,
        // El backend acepta nombreBanco o nombre, usamos nombreBanco
        nombreBanco: banco.nombreBanco,
      };
      // Eliminar disponibleUsd si existe (se calcula en el backend)
      delete (bancoToSend as any).disponibleUsd;

      const res = await fetch(`${API_BASE_URL}/bancos`, {
        method: "POST",
        headers,
        body: JSON.stringify(bancoToSend),
      });
      if (!res.ok) {
        const mensajeError = await extraerMensajeError(res);
        throw new Error(mensajeError);
      }
      const nuevoBanco = await res.json();
      await fetchBancos(); // Refrescar lista
      return nuevoBanco;
    } catch (err: any) {
      setError(err.message || "Error al crear banco");
      throw err;
    }
  };

  // Actualizar banco
  const actualizarBanco = async (id: string, banco: Partial<Banco>) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/bancos/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(banco),
      });
      if (!res.ok) {
        const mensajeError = await extraerMensajeError(res);
        throw new Error(mensajeError);
      }
      const bancoActualizado = await res.json();
      await fetchBancos(); // Refrescar lista
      return bancoActualizado;
    } catch (err: any) {
      setError(err.message || "Error al actualizar banco");
      throw err;
    }
  };

  // Eliminar banco
  const eliminarBanco = async (id: string) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/bancos/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const mensajeError = await extraerMensajeError(res);
        throw new Error(mensajeError);
      }
      await fetchBancos(); // Refrescar lista
    } catch (err: any) {
      setError(err.message || "Error al eliminar banco");
      throw err;
    }
  };

  // Realizar depósito
  const realizarDeposito = async (
    bancoId: string,
    monto: number,
    detalles: string,
    farmacia?: string,
    tipoPago?: "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil",
    tasa?: number
  ) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payload: any = { monto, detalles, farmacia, tipoPago };
      if (tasa && tasa > 0) {
        payload.tasa = tasa;
      }

      const res = await fetch(`${API_BASE_URL}/bancos/${bancoId}/deposito`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const mensajeError = await extraerMensajeError(res);
        throw new Error(mensajeError);
      }
      await fetchBancos(); // Refrescar lista
    } catch (err: any) {
      setError(err.message || "Error al realizar depósito");
      throw err;
    }
  };

  // Realizar transferencia
  const realizarTransferencia = async (
    bancoId: string,
    monto: number,
    detalles: string,
    nombreTitular: string,
    tasa?: number
  ) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payload: any = { monto, detalles, nombreTitular };
      if (tasa && tasa > 0) {
        payload.tasa = tasa;
      }

      const res = await fetch(`${API_BASE_URL}/bancos/${bancoId}/transferencia`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const mensajeError = await extraerMensajeError(res);
        throw new Error(mensajeError);
      }
      await fetchBancos(); // Refrescar lista
    } catch (err: any) {
      setError(err.message || "Error al realizar transferencia");
      throw err;
    }
  };

  // Emitir cheque
  const emitirCheque = async (
    bancoId: string,
    monto: number,
    detalles: string,
    nombreTitular: string,
    tasa?: number
  ) => {
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payload: any = { monto, detalles, nombreTitular };
      if (tasa && tasa > 0) {
        payload.tasa = tasa;
      }

      const res = await fetch(`${API_BASE_URL}/bancos/${bancoId}/cheque`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const mensajeError = await extraerMensajeError(res);
        throw new Error(mensajeError);
      }
      await fetchBancos(); // Refrescar lista
    } catch (err: any) {
      setError(err.message || "Error al emitir cheque");
      throw err;
    }
  };

  // Obtener movimientos de un banco (con filtros opcionales)
  const fetchMovimientos = async (
    bancoId?: string,
    farmaciaId?: string
  ): Promise<Movimiento[]> => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let url = `${API_BASE_URL}/bancos/movimientos`;
      const params = new URLSearchParams();
      if (bancoId) params.append("bancoId", bancoId);
      if (farmaciaId) params.append("farmaciaId", farmaciaId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Error al obtener movimientos");
      const data = await res.json();
      return data;
    } catch (err: any) {
      throw new Error(err.message || "Error al obtener movimientos");
    }
  };

  useEffect(() => {
    fetchBancos();
  }, []);

  return {
    bancos,
    loading,
    error,
    fetchBancos,
    crearBanco,
    actualizarBanco,
    eliminarBanco,
    realizarDeposito,
    realizarTransferencia,
    emitirCheque,
    fetchMovimientos,
  };
}

