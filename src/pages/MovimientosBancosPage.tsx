import React, { useState, useEffect } from "react";
import { useBancos } from "@/hooks/useBancos";
import type { Movimiento } from "@/hooks/useBancos";
import { Filter } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const MovimientosBancosPage: React.FC = () => {
  const { bancos, fetchMovimientos } = useBancos();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [filtroBanco, setFiltroBanco] = useState<string>("");
  const [filtroFarmacia, setFiltroFarmacia] = useState<string>("");
  const [filtroConcepto, setFiltroConcepto] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    loadMovimientos();
  }, [filtroBanco, filtroFarmacia, filtroConcepto]);

  const loadMovimientos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMovimientos(filtroBanco || undefined, filtroFarmacia || undefined);
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

  const getTipoPagoLabel = (tipo?: string) => {
    if (!tipo) return "";
    const labels: Record<string, string> = {
      efectivoBs: "Efectivo Bs",
      efectivoUsd: "Efectivo USD",
      debito: "Débito",
      credito: "Crédito",
      zelle: "Zelle",
      pagoMovil: "Pago Móvil",
    };
    return labels[tipo] || tipo;
  };

  const getConceptoLabel = (concepto?: string, tipo?: string, tipoPago?: string) => {
    // Si hay concepto específico, usarlo
    if (concepto) {
      const conceptos: Record<string, string> = {
        cuentas_pagadas: "Cuentas Pagadas",
        transferencia: "Transferencia",
        retiro_efectivo: "Retiro en Efectivo",
        ingreso_venta: "Ingreso por Venta",
        gasto_tarjeta_debito: "Gasto por Tarjeta Débito",
        cheque: "Cheque",
      };
      return conceptos[concepto] || concepto;
    }
    
    // Si no hay concepto, inferir del tipo y tipoPago
    if (tipo === "cheque") return "Cheque";
    if (tipo === "transferencia") return "Transferencia";
    if (tipo === "retiro") return "Retiro en Efectivo";
    if (tipo === "deposito") {
      if (tipoPago === "debito") return "Gasto por Tarjeta Débito";
      if (tipoPago === "efectivoUsd" || tipoPago === "efectivoBs") return "Ingreso por Venta";
      return "Depósito";
    }
    return getTipoLabel(tipo || "");
  };

  // Calcular totales
  const movimientosFiltrados = movimientos.filter((m) => {
    if (filtroBanco && m.bancoId !== filtroBanco) return false;
    if (filtroFarmacia && m.farmacia !== filtroFarmacia) return false;
    if (filtroConcepto) {
      const conceptoMovimiento = m.concepto || 
        (m.tipo === "cheque" ? "cheque" :
         m.tipo === "transferencia" ? "transferencia" :
         m.tipo === "retiro" ? "retiro_efectivo" :
         m.tipo === "deposito" && m.tipoPago === "debito" ? "gasto_tarjeta_debito" :
         m.tipo === "deposito" ? "ingreso_venta" : "");
      if (conceptoMovimiento !== filtroConcepto) return false;
    }
    return true;
  });

  const depositos = movimientosFiltrados.filter((m) => m.tipo === "deposito");
  const totalEfectivoBs = depositos
    .filter((m) => m.tipoPago === "efectivoBs")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalEfectivoUsd = depositos
    .filter((m) => m.tipoPago === "efectivoUsd")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalDebito = depositos
    .filter((m) => m.tipoPago === "debito")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalCredito = depositos
    .filter((m) => m.tipoPago === "credito")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalZelle = depositos
    .filter((m) => m.tipoPago === "zelle")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalPagoMovil = depositos
    .filter((m) => m.tipoPago === "pagoMovil")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalDepositos = depositos.reduce((sum, m) => sum + m.monto, 0);
  const totalTransferencias = movimientosFiltrados
    .filter((m) => m.tipo === "transferencia")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalCheques = movimientosFiltrados
    .filter((m) => m.tipo === "cheque")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalRetiros = movimientosFiltrados
    .filter((m) => m.tipo === "retiro")
    .reduce((sum, m) => sum + m.monto, 0);
  const totalGeneral = totalDepositos - totalTransferencias - totalCheques - totalRetiros;

  const getBancoNombre = (bancoId: string) => {
    const banco = bancos.find((b) => b._id === bancoId);
    return banco?.nombreBanco || bancoId;
  };

  const getFarmaciaNombre = (farmaciaId?: string) => {
    if (!farmaciaId) return "N/A";
    const farmacia = farmacias.find((f) => f.id === farmaciaId);
    return farmacia?.nombre || farmaciaId;
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Movimientos de Bancos</h1>
      </div>

      {/* Resumen de Totales */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Resumen de Totales</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">Efectivo Bs</p>
            <p className="text-lg font-bold text-yellow-700">{formatCurrency(totalEfectivoBs)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Efectivo USD</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalEfectivoUsd)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Débito</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totalDebito)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">Crédito</p>
            <p className="text-lg font-bold text-purple-700">{formatCurrency(totalCredito)}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <p className="text-sm text-gray-600 mb-1">Zelle</p>
            <p className="text-lg font-bold text-indigo-700">{formatCurrency(totalZelle)}</p>
          </div>
          <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
            <p className="text-sm text-gray-600 mb-1">Pago Móvil</p>
            <p className="text-lg font-bold text-pink-700">{formatCurrency(totalPagoMovil)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-green-100 p-4 rounded-lg border border-green-300">
            <p className="text-sm text-gray-600 mb-1">Total Depósitos</p>
            <p className="text-xl font-bold text-green-800">{formatCurrency(totalDepositos)}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg border border-red-300">
            <p className="text-sm text-gray-600 mb-1">Total Transferencias</p>
            <p className="text-xl font-bold text-red-800">{formatCurrency(totalTransferencias)}</p>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg border border-orange-300">
            <p className="text-sm text-gray-600 mb-1">Total Cheques</p>
            <p className="text-xl font-bold text-orange-800">{formatCurrency(totalCheques)}</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
            <p className="text-sm text-gray-600 mb-1">Total General</p>
            <p className={`text-xl font-bold ${totalGeneral >= 0 ? "text-green-800" : "text-red-800"}`}>
              {formatCurrency(totalGeneral)}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroBanco}
              onChange={(e) => setFiltroBanco(e.target.value)}
            >
              <option value="">Todos los bancos</option>
              {bancos.map((banco) => (
                <option key={banco._id} value={banco._id}>
                  {banco.nombreBanco} - {banco.numeroCuenta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farmacia</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroFarmacia}
              onChange={(e) => setFiltroFarmacia(e.target.value)}
            >
              <option value="">Todas las farmacias</option>
              {farmacias.map((farmacia) => (
                <option key={farmacia.id} value={farmacia.id}>
                  {farmacia.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroConcepto}
              onChange={(e) => setFiltroConcepto(e.target.value)}
            >
              <option value="">Todos los conceptos</option>
              <option value="cuentas_pagadas">Cuentas Pagadas</option>
              <option value="transferencia">Transferencia</option>
              <option value="retiro_efectivo">Retiro en Efectivo</option>
              <option value="ingreso_venta">Ingreso por Venta</option>
              <option value="gasto_tarjeta_debito">Gasto por Tarjeta Débito</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de movimientos */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : movimientosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No hay movimientos registrados</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Banco</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmacia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Pago</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titular</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movimientosFiltrados.map((movimiento) => (
                  <tr key={movimiento._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(movimiento.fecha)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{getBancoNombre(movimiento.bancoId)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getFarmaciaNombre(movimiento.farmacia)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          movimiento.tipo === "deposito"
                            ? "bg-green-100 text-green-800"
                            : movimiento.tipo === "transferencia"
                            ? "bg-blue-100 text-blue-800"
                            : movimiento.tipo === "cheque"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {getConceptoLabel(movimiento.concepto, movimiento.tipo, movimiento.tipoPago)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getTipoPagoLabel(movimiento.tipoPago)}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold ${
                        movimiento.tipo === "deposito" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      <div className="flex flex-col">
                        {movimiento.tipo === "deposito" ? "+" : "-"}
                        {movimiento.tipoMonedaBanco === "Bs" && movimiento.montoOriginal ? (
                          <>
                            <span>{movimiento.montoOriginal.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
                            {movimiento.montoUsd && (
                              <span className="text-xs text-gray-500">
                                ({formatCurrency(movimiento.montoUsd)})
                              </span>
                            )}
                          </>
                        ) : (
                          formatCurrency(movimiento.monto)
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {movimiento.detalles}
                      {movimiento.tipoMonedaBanco === "Bs" && movimiento.tasaUsada && (
                        <span className="block text-xs text-gray-500 mt-1">
                          Tasa: {movimiento.tasaUsada}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {movimiento.nombreTitular || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosBancosPage;

