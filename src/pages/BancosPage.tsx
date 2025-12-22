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
  const [filtroConcepto, setFiltroConcepto] = useState<string>("");
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  const [formData, setFormData] = useState({
    numeroCuenta: "",
    nombreTitular: "",
    nombreBanco: "",
    cedulaRif: "",
    tipoMoneda: "USD" as "USD" | "Bs",
    metodoPagoDefault: ["pagoMovil"] as (
      | "pagoMovil"
      | "debito"
      | "credito"
      | "transferencia"
      | "efectivoBs"
      | "efectivoUsd"
      | "zelle"
    )[],
    tasa: "",
    porcentajeComision: "",
    farmacias: [] as string[],
  });

  useEffect(() => {
    const fetchFarmacias = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/farmacias`);
        if (!res.ok) {
          if (res.status === 502) {
            console.error("Error 502: El servidor backend no está respondiendo. Verifique que el backend esté funcionando.");
          } else if (res.status === 0 || res.status === 404) {
            console.error("Error de conexión: No se puede conectar al backend. Verifique la URL y CORS.");
          }
          return;
        }
        const data = await res.json();
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
      } catch (err: any) {
        console.error("Error al obtener farmacias:", err);
        if (err.message?.includes("CORS") || err.message?.includes("Failed to fetch")) {
          console.error("⚠️ Error de CORS: El backend necesita configurar CORS para permitir solicitudes desde el frontend.");
          console.error("📋 Ver instrucciones en: INSTRUCCIONES_BACKEND_CORS_URGENTE.md");
        }
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

  const getConceptoLabel = (concepto?: string, tipo?: string) => {
    // Si hay concepto específico, usarlo
    if (concepto) {
      const conceptos: Record<string, string> = {
        cuentas_pagadas: "Cuentas Pagadas",
        transferencia: "Transferencia",
        retiro_efectivo: "Retiro en Efectivo",
        ingreso_venta: "Ingreso por Venta",
        gasto_tarjeta_debito: "Gasto por Tarjeta Débito",
        cheque: "Retiro por Cheque",
        pago_factura: "Pago de factura",
        deposito_cuadre: "Depósito por cierre de caja",
        retiro: "Retiro",
      };
      return conceptos[concepto] || concepto;
    }
    
    // Si no hay concepto, inferir del tipo de movimiento
    if (tipo === "cheque") return "Retiro por Cheque";
    if (tipo === "transferencia") return "Transferencia";
    if (tipo === "retiro") return "Retiro en Efectivo";
    if (tipo === "deposito") {
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
    // Si el banco es en Bs, usar montoOriginal o monto (en Bs)
    // Si el banco es en USD, usar monto (en USD) - nunca usar montoOriginal ni conversiones
    if (bancoSeleccionado?.tipoMoneda === "Bs") {
      return sign * (mov.montoOriginal || mov.monto || 0);
    } else {
      // Para bancos en USD, siempre usar monto directamente (ya está en USD)
      return sign * (mov.monto || 0);
    }
  };

  // Filtrar movimientos según el filtro de concepto
  const movimientosFiltrados = React.useMemo(() => {
    return movimientos.filter((movimiento) => {
      if (!filtroConcepto) return true;
      const conceptoLabel = getConceptoLabel(movimiento.concepto, movimiento.tipo);
      // Mapear valores del select a los conceptos reales
      const conceptoMap: Record<string, string> = {
        deposito: "Depósito",
        retiro_por_cheque: "Retiro por Cheque",
        transferencia: "Transferencia",
        retiro_efectivo: "Retiro en Efectivo",
        ingreso_venta: "Ingreso por Venta",
        cuentas_pagadas: "Cuentas Pagadas",
        gasto_tarjeta_debito: "Gasto por Tarjeta Débito",
        pago_factura: "Pago de factura",
        deposito_cuadre: "Depósito por cierre de caja",
      };
      const conceptoBuscado = conceptoMap[filtroConcepto] || filtroConcepto;
      return conceptoLabel === conceptoBuscado;
    });
  }, [movimientos, filtroConcepto]);

  // Calcular monto en USD de un movimiento
  const getMontoUsd = (mov: Movimiento) => {
    if (bancoSeleccionado?.tipoMoneda === "Bs") {
      // Si tiene montoOriginal y tasaUsada, calcular USD desde ahí (prioridad)
      if (mov.montoOriginal && mov.tasaUsada && mov.tasaUsada > 0) {
        return mov.montoOriginal / mov.tasaUsada;
      }
      // Si tiene montoUsd, usarlo
      if (mov.montoUsd) {
        return mov.montoUsd;
      }
      // Si solo tiene monto y es un banco en Bs, asumir que el monto ya está en USD (del backend)
      return mov.monto || 0;
    } else {
      // Para bancos en USD, usar monto directamente
      return mov.monto || 0;
    }
  };

  const getSignedAmountUsd = (mov: Movimiento) => {
    const sign = mov.tipo === "deposito" ? 1 : -1;
    return sign * getMontoUsd(mov);
  };

  const totalesPorFarmacia = React.useMemo(() => {
    const map = new Map<string, number>();
    movimientosFiltrados.forEach((mov) => {
      const key = mov.farmacia || "N/A";
      map.set(key, (map.get(key) || 0) + getSignedAmount(mov));
    });
    return map;
  }, [movimientosFiltrados]);

  const totalesPorFarmaciaUsd = React.useMemo(() => {
    const map = new Map<string, number>();
    movimientosFiltrados.forEach((mov) => {
      const key = mov.farmacia || "N/A";
      map.set(key, (map.get(key) || 0) + getSignedAmountUsd(mov));
    });
    return map;
  }, [movimientosFiltrados]);

  const totalDisponibleCalculado = React.useMemo(() => {
    return movimientosFiltrados.reduce((acc, mov) => acc + getSignedAmount(mov), 0);
  }, [movimientosFiltrados]);

  const totalDisponibleCalculadoUsd = React.useMemo(() => {
    return movimientosFiltrados.reduce((acc, mov) => acc + getSignedAmountUsd(mov), 0);
  }, [movimientosFiltrados]);

  // Calcular disponible en Bs basado en TODOS los movimientos (no filtrados)
  const disponibleBsCalculado = React.useMemo(() => {
    if (bancoSeleccionado?.tipoMoneda !== "Bs") {
      return bancoSeleccionado?.disponible || 0;
    }
    // Sumar todos los montos en Bs de todos los movimientos (depósitos suman, otros restan)
    return movimientos.reduce((acc, mov) => acc + getSignedAmount(mov), 0);
  }, [movimientos, bancoSeleccionado]);

  // Calcular disponible USD y tasa promedio de TODOS los movimientos (no filtrados)
  const disponibleUsdCalculado = React.useMemo(() => {
    if (bancoSeleccionado?.tipoMoneda !== "Bs") {
      return bancoSeleccionado?.disponibleUsd || 0;
    }
    // Sumar todos los montos en USD de todos los movimientos (depósitos suman, otros restan)
    return movimientos.reduce((acc, mov) => acc + getSignedAmountUsd(mov), 0);
  }, [movimientos, bancoSeleccionado]);

  // Calcular tasa promedio ponderada basada en todos los movimientos
  const tasaPromedio = React.useMemo(() => {
    if (bancoSeleccionado?.tipoMoneda !== "Bs") {
      return bancoSeleccionado?.tasa || 1;
    }
    
    let totalBs = 0;
    let totalUsd = 0;
    
    movimientos.forEach((mov) => {
      const sign = mov.tipo === "deposito" ? 1 : -1;
      
      // Calcular monto en Bs
      let montoBs = 0;
      if (mov.montoOriginal) {
        montoBs = mov.montoOriginal;
      } else if (bancoSeleccionado?.tipoMoneda === "Bs") {
        // Si no hay montoOriginal pero el banco es en Bs, usar monto como Bs
        montoBs = mov.monto || 0;
      }
      
      // Calcular monto en USD
      let montoUsd = getMontoUsd(mov);
      
      if (montoBs > 0 && montoUsd > 0) {
        totalBs += sign * montoBs;
        totalUsd += sign * montoUsd;
      }
    });
    
    // Tasa promedio = totalBs / totalUsd
    if (totalUsd !== 0 && Math.abs(totalUsd) > 0.01) {
      return Math.abs(totalBs) / Math.abs(totalUsd);
    }
    
    // Si no hay movimientos o no se puede calcular, usar la tasa del banco
    return bancoSeleccionado?.tasa || 1;
  }, [movimientos, bancoSeleccionado]);

  const handleOpenModal = (banco?: Banco) => {
    if (banco) {
      setEditingBanco(banco);
      setFormData({
        numeroCuenta: banco.numeroCuenta,
        nombreTitular: banco.nombreTitular,
        nombreBanco: banco.nombreBanco,
        cedulaRif: banco.cedulaRif,
        tipoMoneda: banco.tipoMoneda || "USD",
        metodoPagoDefault: Array.isArray((banco as any).metodoPagoDefault)
          ? (banco as any).metodoPagoDefault
          : (banco as any).metodoPagoDefault
          ? [(banco as any).metodoPagoDefault]
          : ["pagoMovil"],
        tasa: banco.tasa?.toString() || "",
        porcentajeComision: banco.porcentajeComision?.toString() || "",
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
        metodoPagoDefault: ["pagoMovil"],
        tasa: "",
        porcentajeComision: "",
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
      metodoPagoDefault: ["pagoMovil"],
    tasa: "",
      porcentajeComision: "",
      farmacias: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.farmacias.length === 0) {
      alert("Por favor seleccione al menos una farmacia que utilizará este banco");
      return;
    }
    if (formData.metodoPagoDefault.length === 0) {
      alert("Por favor seleccione al menos un método de pago");
      return;
    }
    try {
      const dataToSend: any = {
        numeroCuenta: formData.numeroCuenta,
        nombreBanco: formData.nombreBanco, // Asegurar que nombreBanco se envíe
        nombreTitular: formData.nombreTitular || undefined,
        cedulaRif: formData.cedulaRif || undefined,
        tipoMoneda: formData.tipoMoneda,
        metodoPagoDefault: formData.metodoPagoDefault,
        farmacias: formData.farmacias,
        // Mientras el backend siga validando tasa para bancos en Bs, enviamos 1 por defecto
        tasa: formData.tipoMoneda === "Bs" ? (formData.tasa ? parseFloat(formData.tasa) : 1) : undefined,
        // Convertir porcentajeComision a número si existe
        porcentajeComision: formData.porcentajeComision ? parseFloat(formData.porcentajeComision) : undefined,
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

  const handleMetodoPagoChange = (metodo: "pagoMovil" | "debito" | "credito" | "transferencia" | "efectivoBs" | "efectivoUsd" | "zelle", checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          metodoPagoDefault: [...prev.metodoPagoDefault, metodo],
        };
      } else {
        return {
          ...prev,
          metodoPagoDefault: prev.metodoPagoDefault.filter((m) => m !== metodo),
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
              {bancos.map((banco) => {
                // Obtener métodos de pago (puede ser array o string para compatibilidad)
                const metodosPago = Array.isArray((banco as any).metodoPagoDefault)
                  ? (banco as any).metodoPagoDefault
                  : (banco as any).metodoPagoDefault
                  ? [(banco as any).metodoPagoDefault]
                  : ["pagoMovil"];
                const metodosPagoTexto = metodosPago.length === 1
                  ? getTipoPagoLabel(metodosPago[0])
                  : metodosPago.length > 1
                  ? `${getTipoPagoLabel(metodosPago[0])} +${metodosPago.length - 1}`
                  : "Sin métodos";
                
                // Obtener información de farmacias asignadas
                const farmaciasAsignadas = banco.farmacias || [];
                let farmaciasTexto = "";
                if (farmaciasAsignadas.length === 0) {
                  farmaciasTexto = "Sin farmacias";
                } else if (farmaciasAsignadas.length === 1) {
                  farmaciasTexto = getFarmaciaNombre(farmaciasAsignadas[0]);
                } else {
                  // Mostrar primera farmacia + símbolo +
                  farmaciasTexto = `${getFarmaciaNombre(farmaciasAsignadas[0])} +`;
                }
                const nombreBancoMostrar = banco.nombreBanco || "Sin nombre";
                return (
                  <option key={banco._id} value={banco._id}>
                    {nombreBancoMostrar} - Cuenta: {banco.numeroCuenta} - {metodosPagoTexto} - {farmaciasTexto}
                  </option>
                );
              })}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtroConcepto}
              onChange={(e) => {
                setFiltroConcepto(e.target.value);
              }}
            >
              <option value="">Todos los conceptos</option>
              <option value="deposito">Depósito</option>
              <option value="retiro_por_cheque">Retiro por Cheque</option>
              <option value="transferencia">Transferencia</option>
              <option value="retiro_efectivo">Retiro en Efectivo</option>
              <option value="ingreso_venta">Ingreso por Venta</option>
              <option value="cuentas_pagadas">Cuentas Pagadas</option>
              <option value="gasto_tarjeta_debito">Gasto por Tarjeta Débito</option>
              <option value="pago_factura">Pago de factura</option>
              <option value="deposito_cuadre">Depósito por cierre de caja</option>
            </select>
          </div>
        </div>

        {/* Información del banco seleccionado y acciones */}
        {bancoSeleccionado && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {bancoSeleccionado.nombreBanco || bancoSeleccionado.numeroCuenta || "Sin nombre"}
                </h3>
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
                      Disponible: {disponibleBsCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      Disponible USD: {formatCurrency(disponibleUsdCalculado)}
                      <span className="text-xs text-gray-500 ml-2">(Tasa promedio: {tasaPromedio.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                    </p>
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
                  {bancoSeleccionado?.tipoMoneda === "Bs" 
                    ? `${totalDisponibleCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
                    : formatCurrency(totalDisponibleCalculado)
                  }
                </p>
                {bancoSeleccionado?.tipoMoneda === "Bs" && (
                  <p className="text-xs text-gray-600 mt-1">
                    ≈ {formatCurrency(totalDisponibleCalculadoUsd)} (USD)
                  </p>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-3 md:col-span-2">
                <p className="text-xs text-green-700 font-semibold uppercase mb-2">Saldo por farmacia (calculado)</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(totalesPorFarmacia.entries()).map(([farmId, valor]) => {
                    const valorUsd = totalesPorFarmaciaUsd.get(farmId) || 0;
                    return (
                      <div
                        key={farmId}
                        className="px-2 py-1 rounded-full text-xs font-semibold bg-white border border-green-200 text-green-800"
                      >
                        {getFarmaciaNombre(farmId)}: {bancoSeleccionado?.tipoMoneda === "Bs"
                          ? (
                            <>
                              <span>{valor.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
                              <span className="text-gray-600 ml-1">
                                ({formatCurrency(valorUsd)})
                              </span>
                            </>
                          )
                          : formatCurrency(valor)
                        }
                      </div>
                    );
                  })}
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
                ) : movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      {movimientos.length === 0 
                        ? "No hay movimientos para este banco"
                        : "No hay movimientos que coincidan con el filtro seleccionado"
                      }
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map((movimiento) => (
                    <tr key={movimiento._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(movimiento.fecha)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {getFarmaciaNombre(movimiento.farmacia)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getConceptColorClass(movimiento.concepto, movimiento.tipo)}`}
                        >
                          {getConceptoLabel(movimiento.concepto, movimiento.tipo)}
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
                          {bancoSeleccionado?.tipoMoneda === "Bs" ? (
                            <>
                              {movimiento.montoOriginal ? (
                                <>
                                  <span>{movimiento.montoOriginal.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
                                  {movimiento.tasaUsada && movimiento.tasaUsada > 0 ? (
                                    <span className="text-xs text-gray-500">
                                      ({formatCurrency(movimiento.montoOriginal / movimiento.tasaUsada)})
                                    </span>
                                  ) : movimiento.montoUsd ? (
                                    <span className="text-xs text-gray-500">
                                      ({formatCurrency(movimiento.montoUsd)})
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span>{movimiento.monto.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
                              )}
                            </>
                          ) : (
                            formatCurrency(movimiento.monto)
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {movimiento.detalles}
                        {bancoSeleccionado?.tipoMoneda === "Bs" && movimiento.tasaUsada && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Tasa: {movimiento.tasaUsada}
                          </span>
                        )}
                      </td>
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
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Métodos de Pago Disponibles * (Seleccione uno o más)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 bg-gray-50">
                <label className="flex items-center space-x-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.metodoPagoDefault.includes("pagoMovil")}
                    onChange={(e) => handleMetodoPagoChange("pagoMovil", e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Pago Móvil</span>
                </label>
                <label className="flex items-center space-x-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.metodoPagoDefault.includes("debito")}
                    onChange={(e) => handleMetodoPagoChange("debito", e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Punto debito/credito</span>
                </label>
                <label className="flex items-center space-x-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.metodoPagoDefault.includes("transferencia")}
                    onChange={(e) => handleMetodoPagoChange("transferencia", e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Transferencia</span>
                </label>
                <label className="flex items-center space-x-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.metodoPagoDefault.includes("zelle")}
                    onChange={(e) => handleMetodoPagoChange("zelle", e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Zelle</span>
                </label>
                <label className="flex items-center space-x-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.metodoPagoDefault.includes("efectivoBs")}
                    onChange={(e) => handleMetodoPagoChange("efectivoBs", e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Efectivo Bs</span>
                </label>
                <label className="flex items-center space-x-2 py-1 hover:bg-gray-100 px-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.metodoPagoDefault.includes("efectivoUsd")}
                    onChange={(e) => handleMetodoPagoChange("efectivoUsd", e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Efectivo $</span>
                </label>
              </div>
              {formData.metodoPagoDefault.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Seleccione al menos un método de pago</p>
              )}
              {formData.metodoPagoDefault.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {formData.metodoPagoDefault.length} método(s) seleccionado(s)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Seleccione los métodos de pago disponibles para este banco</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Porcentaje de Comisión por Punto (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="porcentajeComision"
                value={formData.porcentajeComision}
                onChange={handleChange}
                placeholder="Ej: 2.5 (para 2.5%)"
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este porcentaje se restará automáticamente de cada depósito realizado a este banco
              </p>
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
            }}
            banco={bancoSeleccionado}
            onDeposito={realizarDeposito}
            onDepositoSuccess={(bancoActualizado) => {
              // Actualizar banco seleccionado con los nuevos datos
              if (bancoActualizado && bancoSeleccionado) {
                setBancoSeleccionado({
                  ...bancoSeleccionado,
                  disponible: bancoActualizado.disponible ?? bancoSeleccionado.disponible,
                  disponibleUsd: bancoActualizado.disponibleUsd ?? bancoSeleccionado.disponibleUsd,
                });
              }
              // Recargar movimientos silenciosamente si están siendo mostrados
              if (filtroBanco && bancoSeleccionado?._id) {
                loadMovimientos(bancoSeleccionado._id, filtroFarmacia || undefined);
              }
            }}
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

