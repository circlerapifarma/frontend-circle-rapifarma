import React, { useState, useEffect } from "react";
import { useBancos } from "@/hooks/useBancos";
import type { Banco, Movimiento } from "@/hooks/useBancos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2, Edit, Plus, DollarSign, ArrowRightLeft, FileText, History, Filter } from "lucide-react";
import DepositoModal from "@/components/bancos/DepositoModal";
import TransferenciaModal from "@/components/bancos/TransferenciaModal";
import ChequeModal from "@/components/bancos/ChequeModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const BancosPage: React.FC = () => {
  const {
    bancos,
    loading,
    error,
    crearBanco,
    actualizarBanco,
    eliminarBanco,
    realizarDeposito,
    realizarTransferencia,
    emitirCheque,
    fetchMovimientos,
  } = useBancos();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [depositoModalOpen, setDepositoModalOpen] = useState(false);
  const [transferenciaModalOpen, setTransferenciaModalOpen] = useState(false);
  const [chequeModalOpen, setChequeModalOpen] = useState(false);
  const [bancoSeleccionado, setBancoSeleccionado] = useState<Banco | null>(null);
  const [editingBanco, setEditingBanco] = useState<Banco | null>(null);
  const [bancoToDelete, setBancoToDelete] = useState<Banco | null>(null);
  const [filtroBanco, setFiltroBanco] = useState<string>("");
  const [filtroFarmacia, setFiltroFarmacia] = useState<string>("");
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  const [formData, setFormData] = useState({
    numeroCuenta: "",
    nombreTitular: "",
    nombreBanco: "",
    cedulaRif: "",
    tipoMoneda: "USD" as "USD" | "Bs",
    metodoPagoDefault: "pagoMovil" as
      | "pagoMovil"
      | "debito"
      | "credito"
      | "transferencia"
      | "efectivoBs"
      | "efectivoUsd"
      | "zelle",
    tasa: "",
    farmacias: [] as string[],
  });

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
    if (filtroBanco || filtroFarmacia) {
      loadMovimientos();
    } else {
      setMovimientos([]);
    }
  }, [filtroBanco, filtroFarmacia]);

  const loadMovimientos = async (bancoId?: string, farmaciaId?: string) => {
    setLoadingMovimientos(true);
    try {
      const data = await fetchMovimientos(bancoId || filtroBanco || undefined, farmaciaId || filtroFarmacia || undefined);
      setMovimientos(data);
    } catch (err: any) {
      console.error("Error al cargar movimientos:", err);
    } finally {
      setLoadingMovimientos(false);
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
        pago_factura: "Pago de factura",
        deposito_cuadre: "Depósito por cierre de caja",
        retiro: "Retiro",
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

  const getConceptColorClass = (concepto?: string, tipo?: string) => {
    const conceptoLower = (concepto || "").toLowerCase();
    const tipoLower = (tipo || "").toLowerCase();

    const esDeposito =
      tipoLower === "deposito" ||
      conceptoLower === "ingreso_venta" ||
      conceptoLower === "deposito_cuadre";

    const esRetiroOGasto =
      tipoLower === "retiro" ||
      conceptoLower === "retiro" ||
      conceptoLower === "retiro_efectivo" ||
      conceptoLower === "gasto_tarjeta_debito" ||
      conceptoLower === "pago_factura" ||
      conceptoLower === "cuentas_pagadas";

    if (esDeposito) return "bg-green-100 text-green-800";
    if (esRetiroOGasto) return "bg-red-100 text-red-800";
    if (tipoLower === "transferencia") return "bg-blue-100 text-blue-800";
    if (tipoLower === "cheque") return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
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

  const getFarmaciaNombre = (farmaciaId?: string) => {
    if (!farmaciaId) return "N/A";
    const farmacia = farmacias.find((f) => f.id === farmaciaId);
    return farmacia?.nombre || farmaciaId;
  };

  const getSignedAmount = (mov: Movimiento) => {
    // Depósitos suman, transferencias/cheques/retiros restan
    const sign = mov.tipo === "deposito" ? 1 : -1;
    // Usar monto en la moneda del banco
    return sign * (mov.montoUsd || mov.monto || 0);
  };

  const totalesPorFarmacia = React.useMemo(() => {
    const map = new Map<string, number>();
    movimientos.forEach((mov) => {
      const key = mov.farmacia || "N/A";
      map.set(key, (map.get(key) || 0) + getSignedAmount(mov));
    });
    return map;
  }, [movimientos]);

  const totalDisponibleCalculado = React.useMemo(() => {
    return movimientos.reduce((acc, mov) => acc + getSignedAmount(mov), 0);
  }, [movimientos]);

  const handleOpenModal = (banco?: Banco) => {
    if (banco) {
      setEditingBanco(banco);
      setFormData({
        numeroCuenta: banco.numeroCuenta,
        nombreTitular: banco.nombreTitular,
        nombreBanco: banco.nombreBanco,
        cedulaRif: banco.cedulaRif,
        tipoMoneda: banco.tipoMoneda || "USD",
        metodoPagoDefault:
          (banco as any).metodoPagoDefault ||
          "pagoMovil",
        tasa: banco.tasa?.toString() || "",
        farmacias: banco.farmacias || [],
      });
    } else {
      setEditingBanco(null);
      setFormData({
        numeroCuenta: "",
        nombreTitular: "",
        nombreBanco: "",
        cedulaRif: "",
        tipoMoneda: "USD",
        metodoPagoDefault: "pagoMovil",
        tasa: "",
        farmacias: [],
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingBanco(null);
    setFormData({
      numeroCuenta: "",
      nombreTitular: "",
      nombreBanco: "",
      cedulaRif: "",
      tipoMoneda: "USD",
    metodoPagoDefault: "pagoMovil",
    tasa: "",
      farmacias: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.farmacias.length === 0) {
      alert("Por favor seleccione al menos una farmacia que utilizará este banco");
      return;
    }
    try {
      const dataToSend = {
        ...formData,
        // Mientras el backend siga validando tasa para bancos en Bs, enviamos 1 por defecto
        tasa: formData.tipoMoneda === "Bs" ? 1 : undefined,
      };
      if (editingBanco && editingBanco._id) {
        await actualizarBanco(editingBanco._id, dataToSend);
      } else {
        await crearBanco(dataToSend);
      }
      handleCloseModal();
      alert("Banco guardado exitosamente");
    } catch (err: any) {
      const mensajeError = err.message || "Error al guardar banco";
      alert(mensajeError);
      console.error("Error al guardar banco:", err);
    }
  };

  const handleDelete = (banco: Banco) => {
    setBancoToDelete(banco);
    setModalDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (bancoToDelete && bancoToDelete._id) {
      try {
        await eliminarBanco(bancoToDelete._id);
        setModalDeleteOpen(false);
        setBancoToDelete(null);
      } catch (err) {
        console.error("Error al eliminar banco:", err);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFarmaciaChange = (farmaciaId: string, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          farmacias: [...prev.farmacias, farmaciaId],
        };
      } else {
        return {
          ...prev,
          farmacias: prev.farmacias.filter((id) => id !== farmaciaId),
        };
      }
    });
  };

  const handleDeposito = (banco: Banco) => {
    setBancoSeleccionado(banco);
    setDepositoModalOpen(true);
  };

  const handleTransferencia = (banco: Banco) => {
    setBancoSeleccionado(banco);
    setTransferenciaModalOpen(true);
  };

  const handleCheque = (banco: Banco) => {
    setBancoSeleccionado(banco);
    setChequeModalOpen(true);
  };

  const handleHistorial = (banco: Banco) => {
    const bancoId = banco._id || "";
    setBancoSeleccionado(banco);
    setFiltroBanco(bancoId);
    setFiltroFarmacia("");
    loadMovimientos(bancoId, "");
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="text-center">Cargando bancos...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Bancos</h1>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenModal()} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Banco
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}


      {/* Filtros y selección de banco */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroBanco}
              onChange={(e) => {
                setFiltroBanco(e.target.value);
                const banco = bancos.find((b) => b._id === e.target.value);
                setBancoSeleccionado(banco || null);
                loadMovimientos(e.target.value, filtroFarmacia || undefined);
              }}
            >
              <option value="">Seleccione un banco</option>
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
              onChange={(e) => {
                setFiltroFarmacia(e.target.value);
                loadMovimientos(filtroBanco || undefined, e.target.value || undefined);
              }}
            >
              <option value="">Todas las farmacias</option>
              {farmacias.map((farmacia) => (
                <option key={farmacia.id} value={farmacia.id}>
                  {farmacia.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Información del banco seleccionado y acciones */}
        {bancoSeleccionado && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{bancoSeleccionado.nombreBanco}</h3>
                <p className="text-sm text-gray-600">Cuenta: {bancoSeleccionado.numeroCuenta}</p>
                <p className="text-sm text-gray-600">Titular: {bancoSeleccionado.nombreTitular}</p>
                <p className="text-sm text-gray-600">
                  Farmacias:{" "}
                  {bancoSeleccionado.farmacias && bancoSeleccionado.farmacias.length > 0
                    ? bancoSeleccionado.farmacias
                        .map((fId) => {
                          const farmacia = farmacias.find((f) => f.id === fId);
                          return farmacia?.nombre || fId;
                        })
                        .join(", ")
                    : "Ninguna"}
                </p>
                <p className="text-sm text-gray-600">
                  Moneda: <span className="font-semibold">{bancoSeleccionado.tipoMoneda || "USD"}</span>
                </p>
                {bancoSeleccionado.tipoMoneda === "Bs" ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-lg font-bold text-yellow-600">
                      Disponible: {bancoSeleccionado.disponible?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"} Bs
                    </p>
                    {bancoSeleccionado.tasa && bancoSeleccionado.tasa > 0 && (
                      <p className="text-lg font-bold text-green-600">
                        Disponible USD: {formatCurrency((bancoSeleccionado.disponible || 0) / bancoSeleccionado.tasa)}
                        <span className="text-xs text-gray-500 ml-2">(Tasa: {bancoSeleccionado.tasa})</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-lg font-bold text-green-600 mt-2">
                    Disponible: {formatCurrency(bancoSeleccionado.disponible || 0)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenModal(bancoSeleccionado)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(bancoSeleccionado)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                onClick={() => handleDeposito(bancoSeleccionado)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm"
                size="sm"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Depositar
              </Button>
              <Button
                onClick={() => handleTransferencia(bancoSeleccionado)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                size="sm"
              >
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Transferir
              </Button>
              <Button
                onClick={() => handleCheque(bancoSeleccionado)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-1" />
                Cheque
              </Button>
              <Button
                onClick={() => handleHistorial(bancoSeleccionado)}
                className="bg-gray-600 hover:bg-gray-700 text-white text-sm"
                size="sm"
              >
                <History className="w-4 h-4 mr-1" />
                Historial
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de movimientos filtrados */}
      {bancoSeleccionado ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Movimientos Filtrados</h3>

            {/* Resumen superior */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-700 font-semibold uppercase">Saldo disponible (calculado)</p>
                <p className="text-xl font-bold text-blue-800">
                  {formatCurrency(totalDisponibleCalculado)}
                </p>
                {bancoSeleccionado?.tipoMoneda === "Bs" && bancoSeleccionado.tasa && bancoSeleccionado.tasa > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    ≈ {formatCurrency(totalDisponibleCalculado / bancoSeleccionado.tasa)} (USD)
                  </p>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-3 md:col-span-2">
                <p className="text-xs text-green-700 font-semibold uppercase mb-2">Saldo por farmacia (calculado)</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(totalesPorFarmacia.entries()).map(([farmId, valor]) => (
                    <span
                      key={farmId}
                      className="px-2 py-1 rounded-full text-xs font-semibold bg-white border border-green-200 text-green-800"
                    >
                      {getFarmaciaNombre(farmId)}: {formatCurrency(valor)}
                    </span>
                  ))}
                  {totalesPorFarmacia.size === 0 && (
                    <span className="text-xs text-gray-500">Sin movimientos</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmacia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Pago</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titular</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loadingMovimientos ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      Cargando movimientos...
                    </td>
                  </tr>
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      No hay movimientos para este banco
                    </td>
                  </tr>
                ) : (
                  movimientos.map((movimiento) => (
                    <tr key={movimiento._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(movimiento.fecha)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {getFarmaciaNombre(movimiento.farmacia)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getConceptColorClass(movimiento.concepto, movimiento.tipo)}`}
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
                      <td className="px-4 py-3 text-sm text-gray-700">{movimiento.detalles}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {movimiento.nombreTitular || "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Seleccione un banco para ver su historial de movimientos
        </div>
      )}

      {/* Modal para crear/editar banco - Compacto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingBanco ? "Editar Banco" : "Agregar Banco"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Número de Cuenta *
                  </label>
                  <Input
                    name="numeroCuenta"
                    value={formData.numeroCuenta}
                    onChange={handleChange}
                    required
                    placeholder="0102-1234-5678901234"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nombre del Banco *
                  </label>
                  <Input
                    name="nombreBanco"
                    value={formData.nombreBanco}
                    onChange={handleChange}
                    required
                    placeholder="Banco de Venezuela"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nombre del Titular
                  </label>
                  <Input
                    name="nombreTitular"
                    value={formData.nombreTitular}
                    onChange={handleChange}
                    placeholder="Juan Pérez"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cédula o RIF
                  </label>
                  <Input
                    name="cedulaRif"
                    value={formData.cedulaRif}
                    onChange={handleChange}
                    placeholder="V-12345678"
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tipo de Moneda *
                </label>
                <select
                  name="tipoMoneda"
                  value={formData.tipoMoneda}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                >
                  <option value="USD">USD (Dólares)</option>
                  <option value="Bs">Bs (Bolívares)</option>
                </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Método de Pago por Defecto *
              </label>
              <select
                name="metodoPagoDefault"
                value={formData.metodoPagoDefault}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                required
              >
                <option value="pagoMovil">Pago Móvil</option>
                <option value="debito">Punto débito</option>
                <option value="credito">Punto crédito</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivoBs">Efectivo Bs</option>
                <option value="efectivoUsd">Efectivo $</option>
                <option value="zelle">Zelle</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Se usará como método por defecto para movimientos</p>
            </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Farmacias que utilizan este banco * (Seleccione una o más)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 bg-gray-50">
                  {farmacias.length === 0 ? (
                    <p className="text-xs text-gray-500">Cargando farmacias...</p>
                  ) : (
                    farmacias.map((farmacia) => (
                      <label
                        key={farmacia.id}
                        className="flex items-center space-x-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.farmacias.includes(farmacia.id)}
                          onChange={(e) => handleFarmaciaChange(farmacia.id, e.target.checked)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{farmacia.nombre}</span>
                      </label>
                    ))
                  )}
                </div>
                {formData.farmacias.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Seleccione al menos una farmacia</p>
                )}
                {formData.farmacias.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {formData.farmacias.length} farmacia(s) seleccionada(s)
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleCloseModal} size="sm">
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" size="sm">
                {editingBanco ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={modalDeleteOpen} onOpenChange={setModalDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            ¿Está seguro de que desea eliminar el banco{" "}
            <strong>{bancoToDelete?.nombreBanco}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modales de operaciones */}
      {bancoSeleccionado && (
        <>
          <DepositoModal
            open={depositoModalOpen}
            onClose={() => {
              setDepositoModalOpen(false);
              setBancoSeleccionado(null);
            }}
            banco={bancoSeleccionado}
            onDeposito={realizarDeposito}
          />
          <TransferenciaModal
            open={transferenciaModalOpen}
            onClose={() => {
              setTransferenciaModalOpen(false);
              setBancoSeleccionado(null);
            }}
            banco={bancoSeleccionado}
            onTransferencia={realizarTransferencia}
          />
          <ChequeModal
            open={chequeModalOpen}
            onClose={() => {
              setChequeModalOpen(false);
              setBancoSeleccionado(null);
            }}
            banco={bancoSeleccionado}
            onCheque={emitirCheque}
          />
        </>
      )}
    </div>
  );
};

export default BancosPage;

