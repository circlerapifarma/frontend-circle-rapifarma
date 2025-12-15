import { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  monto: number;
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

      const res = await fetch(`${API_BASE_URL}/bancos`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...banco, disponible: 0 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al crear banco");
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
        const data = await res.json();
        throw new Error(data.detail || "Error al actualizar banco");
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
        const data = await res.json();
        throw new Error(data.detail || "Error al eliminar banco");
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
    tipoPago?: "efectivoBs" | "efectivoUsd" | "debito" | "credito" | "zelle" | "pagoMovil"
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

      const res = await fetch(`${API_BASE_URL}/bancos/${bancoId}/deposito`, {
        method: "POST",
        headers,
        body: JSON.stringify({ monto, detalles, farmacia, tipoPago }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al realizar depósito");
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
    nombreTitular: string
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

      const res = await fetch(`${API_BASE_URL}/bancos/${bancoId}/transferencia`, {
        method: "POST",
        headers,
        body: JSON.stringify({ monto, detalles, nombreTitular }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al realizar transferencia");
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
    nombreTitular: string
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

      const res = await fetch(`${API_BASE_URL}/bancos/${bancoId}/cheque`, {
        method: "POST",
        headers,
        body: JSON.stringify({ monto, detalles, nombreTitular }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al emitir cheque");
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

