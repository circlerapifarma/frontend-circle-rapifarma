import React, { useState, useEffect, useMemo, useCallback } from "react";
import { animate, stagger } from 'animejs';

// Componentes internos
import AbonoModal from "@/components/AbonoModal";
import FiltrosCuentasPorPagar from "../cuentasPorPagar/visualizarCuentas/FiltrosCuentasPorPagar";
import EdicionCuentaModal from "../cuentasPorPagar/visualizarCuentas/EdicionCuentaModal";
import PagoMasivoModal from "../cuentasPorPagar/visualizarCuentas/PagoMasivoModal";
import TablaCuentasPorPagar from "@/pages/cuentasPorPagarV2/TablaCuentasPorPagar";
import {
    AlertBox, ConfirmDialog, EmptyState, LoadingState,
    MonedaAlert, PageHeader, SelectedCuentasBar
} from "./components/CuentasPorPagarComponents";
// Hooks y Utils
import { useCuentasPorPagar } from "../cuentasPorPagar/visualizarCuentas/useCuentasPorPagar";
import { useCuentasSelection } from "./hooks/useCuentasSelection";
import { formatFecha, calcularDiasRestantes } from "./utils";
import type { CuentaPorPagar, FarmaciaChip, Pago } from "./type";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ESTATUS_OPCIONES = ["wait", "activa", "inactiva", "pagada", "abonada", "anulada", "finalizada"];

const VisualizarCuentasPorPagarPage: React.FC = () => {
    // --- Estados de Datos ---
    const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
    const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // --- Estados de Modales ---
    const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null as string | null, nuevoEstatus: "" });
    const [abonoCuenta, setAbonoCuenta] = useState<CuentaPorPagar | null>(null);
    const [pagoMasivoOpen, setPagoMasivoOpen] = useState(false);
    const [cuentaEditando, setCuentaEditando] = useState<string | null>(null);
    const [showMonedaAlert, setShowMonedaAlert] = useState(true);

    // --- Custom Hooks ---
    const { cuentasParaPagar, selectedIds, toggleSeleccion, clearSeleccion } = useCuentasSelection();
    const [pagosData, setPagosData] = useState<Record<string, { loading: boolean; pagos: Pago[] }>>({});

    const {
        proveedorFiltro, setProveedorFiltro,
        estatusFiltro, setEstatusFiltro,
        fechaInicio, setFechaInicio,
        fechaFin, setFechaFin,
        selectedFarmacia, setSelectedFarmacia,
        cuentasFiltradas,
    } = useCuentasPorPagar({ cuentas, pagosAprobadosPorCuenta: pagosData, estatusInicial: 'wait' });

    // --- Efectos Iniciales ---
    useEffect(() => {
        const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
        if (usuario.farmacias) {
            const farr = Object.entries(usuario.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
            setFarmacias(farr);
            if (farr.length === 1) setSelectedFarmacia(farr[0].id);
        }
    }, [setSelectedFarmacia]);

    // --- Cálculos de Totales ---
    const { totalUSD, totalBs } = useMemo(() => {
        return cuentasFiltradas.reduce((acc, c) => {
            const montoBs = c.divisa === 'Bs' ? c.monto : (c.monto * (c.tasa || 0));
            const montoUSD = c.divisa === 'USD' ? c.monto : (c.monto / (c.tasa || 1));
            return {
                totalBs: acc.totalBs + montoBs,
                totalUSD: acc.totalUSD + montoUSD
            };
        }, { totalUSD: 0, totalBs: 0 });
    }, [cuentasFiltradas]);

    // --- Acciones de API ---
    const handleBuscarCuentas = async () => {
        if (!fechaInicio || !fechaFin) {
            setError("Seleccione un rango de fechas.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("No se encontró token");

            const url = `${API_BASE_URL}/cuentas-por-pagar/rango?startDate=${fechaInicio}&endDate=${fechaFin}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error("Error al obtener datos");

            const data = await res.json();
            setCuentas(data);
            if (data.length === 0) setSuccess("No se encontraron resultados.");
        } catch (err: any) {
            setError(err.message || "Error al obtener datos");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmChangeStatus = async () => {
        if (!confirmDialog.id) return;
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/cuentas-por-pagar/${confirmDialog.id}/estatus`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ estatus: confirmDialog.nuevoEstatus })
            });
            if (!res.ok) throw new Error("Error al actualizar");

            setCuentas(prev => prev.map(c => c._id === confirmDialog.id ? { ...c, estatus: confirmDialog.nuevoEstatus } : c));
            setSuccess("Estatus actualizado correctamente");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setConfirmDialog({ open: false, id: null, nuevoEstatus: "" });
        }
    };

    const fetchPagos = useCallback(
        (open: boolean, cuenta: CuentaPorPagar) => {
            if (!open) return;

            setPagosData(prev => {
                if (prev[cuenta._id]) return prev; // ya cargado
                return { ...prev, [cuenta._id]: { loading: true, pagos: [] } };
            });

            fetch(`${API_BASE_URL}/pagoscpp?cuentaPorPagarId=${cuenta._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            })
                .then(res => res.json())
                .then(data => {
                    setPagosData(prev => ({
                        ...prev,
                        [cuenta._id]: { loading: false, pagos: data },
                    }));
                    setTimeout(() => {
                        animate(`.pagos-dropdown-item-${cuenta._id}`, {
                            opacity: [0, 1],
                            y: [10, 0],
                            duration: 400,
                            delay: stagger(50),
                        });
                    }, 50);
                })
                .catch(() => {
                    setPagosData(prev => ({
                        ...prev,
                        [cuenta._id]: { loading: false, pagos: [] },
                    }));
                });
        },
        []
    );


    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative">
                    <FiltrosCuentasPorPagar
                        farmacias={farmacias}
                        selectedFarmacia={selectedFarmacia}
                        setSelectedFarmacia={setSelectedFarmacia}
                        proveedorFiltro={proveedorFiltro}
                        setProveedorFiltro={setProveedorFiltro}
                        estatusFiltro={estatusFiltro}
                        setEstatusFiltro={setEstatusFiltro}
                        fechaInicio={fechaInicio}
                        setFechaInicio={setFechaInicio}
                        fechaFin={fechaFin}
                        setFechaFin={setFechaFin}
                        ESTATUS_OPCIONES={ESTATUS_OPCIONES}
                    />
                    <PageHeader loading={loading} onBuscar={handleBuscarCuentas} />
                </div>

                {error && (
                    <AlertBox type="error" title="Error" message={error} />
                )}
                {success && (
                    <AlertBox type="success" title="Éxito" message={success} />
                )}
                {loading ? <LoadingState /> : cuentasFiltradas.length === 0 ? <EmptyState /> : (
                    <div className="space-y-4">
                        <SelectedCuentasBar
                            selectedCuentas={selectedIds}
                            cuentasParaPagar={cuentasParaPagar}
                            onClear={clearSeleccion}
                        />

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <button
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                    disabled={selectedIds.length === 0}
                                    onClick={() => setPagoMasivoOpen(true)}
                                >
                                    Registrar Pago ({selectedIds.length})
                                </button>

                                <div className="flex gap-6 text-right">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold">Total General Bs</p>
                                        <p className="text-xl font-black text-blue-700">{totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold">Total General USD</p>
                                        <p className="text-xl font-black text-green-700">{totalUSD.toLocaleString("es-VE", { minimumFractionDigits: 2, style: 'currency', currency: 'USD' })}</p>
                                    </div>
                                </div>
                            </div>

                            <TablaCuentasPorPagar
                                cuentasFiltradas={cuentasFiltradas}
                                pagosAprobadosPorCuenta={pagosData}
                                cuentasParaPagar={cuentasParaPagar}
                                handleToggleCuentaParaPagar={toggleSeleccion}
                                handlePagosDropdownOpen={fetchPagos}
                                handleEstadoChange={(id, nuevoEstatus) => setConfirmDialog({ open: true, id, nuevoEstatus })}
                                ESTATUS_OPCIONES={ESTATUS_OPCIONES}
                                formatFecha={formatFecha}
                                calcularDiasRestantes={calcularDiasRestantes}
                                abrirEdicionCuenta={setCuentaEditando}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Modales */}
            <ConfirmDialog
                open={confirmDialog.open}
                nuevoEstatus={confirmDialog.nuevoEstatus}
                onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
                onConfirm={handleConfirmChangeStatus}
            />

            {abonoCuenta && (
                <AbonoModal
                    open={!!abonoCuenta}
                    onClose={() => setAbonoCuenta(null)}
                    onSubmit={() => { setAbonoCuenta(null); handleBuscarCuentas(); }}
                    usuario={JSON.parse(localStorage.getItem("usuario") || "{}").correo}
                    cuentaPorPagarId={abonoCuenta._id}
                    farmaciaId={abonoCuenta.farmacia}
                />
            )}

            <PagoMasivoModal
                loading={loading}
                error={error}
                open={pagoMasivoOpen}
                onClose={() => setPagoMasivoOpen(false)}
                monedaConversion="USD"
            />

            <MonedaAlert
                open={pagoMasivoOpen}
                cuentasParaPagar={cuentasParaPagar}
                show={showMonedaAlert}
                onClose={() => setShowMonedaAlert(false)}
            />

            {cuentaEditando && (
                <EdicionCuentaModal
                    isOpen={!!cuentaEditando}
                    cuentaId={cuentaEditando}
                    onClose={() => setCuentaEditando(null)}
                    pagosPrevios={
                        (pagosData[cuentaEditando]?.pagos || []).map((p: any) => ({
                            _id: p._id,
                            monto: p.monto,
                            moneda: p.moneda,
                            tasa: p.tasa,
                            fecha: p.fecha,
                            referencia: p.referencia ?? ""
                        }))
                    }
                />
            )}
        </div>
    );
};

export default VisualizarCuentasPorPagarPage;