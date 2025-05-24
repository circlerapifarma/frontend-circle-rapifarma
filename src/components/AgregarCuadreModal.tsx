import React, { useState, useEffect } from "react";

interface Props {
    farmacia: string;
    dia: string;
    onClose: () => void;
}

interface Cajero {
    _id: string;
    NOMBRE: string;
    ID: string;
    FARMACIAS: Record<string, string>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AgregarCuadreModal: React.FC<Props> = ({ farmacia, dia, onClose }) => {
    // Estados para los campos del cuadre
    const [cajaNumero, setCajaNumero] = useState<number>(1);
    const [turno, setTurno] = useState<string>("Mañana");
    const [cajero, setCajero] = useState<string>("");
    const [tasa, setTasa] = useState<number>(0);

    const [totalCajaSistemaBs, setTotalCajaSistemaBs] = useState<number>(0);
    const [devolucionesBs, setDevolucionesBs] = useState<number>(0);
    const [recargaBs, setRecargaBs] = useState<number>(0);
    const [pagomovilBs, setPagomovilBs] = useState<number>(0);
    const [efectivoBs, setEfectivoBs] = useState<number>(0);

    const [efectivoUsd, setEfectivoUsd] = useState<number>(0);
    const [zelleUsd, setZelleUsd] = useState<number>(0);

    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false); // Nuevo estado para controlar el loading

    // Nuevo estado para puntos de venta
    const [puntosVenta, setPuntosVenta] = useState<Array<{ banco: string; puntoDebito: number; puntoCredito: number }>>([
        { banco: '', puntoDebito: 0, puntoCredito: 0 }
    ]);

    const [cajeros, setCajeros] = useState<Cajero[]>([]);

    // Cálculos automáticos
    const totalBsIngresados = recargaBs + pagomovilBs + puntosVenta.reduce((acc, pv) => acc + Number(pv.puntoDebito || 0), 0) + puntosVenta.reduce((acc, pv) => acc + Number(pv.puntoCredito || 0), 0) + efectivoBs;
    const totalBsEnUsd = tasa > 0 ? (totalBsIngresados - devolucionesBs) / tasa : 0;
    const totalGeneralUsd = totalBsEnUsd + efectivoUsd + zelleUsd;
    const diferenciaUsd = tasa > 0 ? Number((totalGeneralUsd - (totalCajaSistemaBs / tasa)).toFixed(2)) : 0;

    const validar = () => {
        if (!cajero.trim()) return "El campo 'Cajero' es obligatorio.";
        if (!turno.trim()) return "El campo 'Turno' es obligatorio.";
        if (cajaNumero <= 0) return "El número de caja debe ser mayor a 0.";
        if (tasa <= 0) return "La tasa debe ser mayor a 0.";
        if (totalCajaSistemaBs < 0 || devolucionesBs < 0 || recargaBs < 0 || pagomovilBs < 0 ||
            efectivoBs < 0 ||
            efectivoUsd < 0 || zelleUsd < 0) return "Los montos no pueden ser negativos.";
        return "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return; // Evita doble submit por toque rápido
        setError("");
        setSuccess("");
        setLoading(true); // Activar loading lo antes posible
        const errorMsg = validar();
        if (errorMsg) {
            setError(errorMsg);
            setLoading(false);
            return;
        }
        const cuadre = {
            dia,
            cajaNumero,
            tasa,
            turno,
            cajero,
            cajeroId: cajeros.find(c => c.NOMBRE === cajero)?.ID || '', // Add the ID of the selected cashier
            totalCajaSistemaBs,
            devolucionesBs,
            recargaBs,
            pagomovilBs,
            puntosVenta, // array de puntos de venta
            efectivoBs,
            totalBs: totalBsIngresados - devolucionesBs, // Ahora es la suma de todos los bolívares menos devoluciones
            totalBsEnUsd: Number(totalBsEnUsd.toFixed(2)),
            efectivoUsd,
            zelleUsd,
            totalGeneralUsd: Number(totalGeneralUsd.toFixed(2)),
            diferenciaUsd,
            sobranteUsd: diferenciaUsd > 0 ? diferenciaUsd : 0,
            faltanteUsd: diferenciaUsd < 0 ? Math.abs(diferenciaUsd) : 0,
            delete: false,
            estado: 'wait',
            nombreFarmacia: (() => {
                const usuario = (() => {
                    try {
                        const raw = localStorage.getItem("usuario");
                        return raw ? JSON.parse(raw) : null;
                    } catch {
                        return null;
                    }
                })();
                const farmacias = usuario?.farmacias || {};
                return farmacias[farmacia] || '';
            })()
        };

        console.log("Cuadre object being sent:", cuadre); // Log the cuadre object

        try {
            setLoading(true); // Activar loading
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL}/agg/cuadre/${farmacia}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(cuadre),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || "Error al guardar el cuadre");
            }
            setSuccess("¡Cuadre guardado exitosamente!");
            setError("");
            // Opcional: puedes actualizar el contexto si lo necesitas
            // addCuadreCaja(farmacia, cuadre);
            setTimeout(() => {
                onClose();
            }, 300);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false); // Desactivar loading
        }
    };

    // Limpia mensajes al cerrar el modal
    const handleClose = () => {
        setSuccess("");
        setError("");
        onClose();
    };

    useEffect(() => {
        // Obtener cajeros asociados a la farmacia seleccionada
        fetch(`${API_BASE_URL}/cajeros`)
            .then(res => res.json())
            .then(data => {
                const filtrados = data.filter((c: Cajero) => c.FARMACIAS && c.FARMACIAS[farmacia]);
                setCajeros(filtrados);
            })
            .catch(() => setCajeros([]));
    }, [farmacia]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="overflow-auto max-h-[95vh] w-full max-w-lg sm:max-w-xl md:max-w-2xl p-0 relative rounded-2xl shadow-2xl bg-white border border-blue-200 animate-fade-in">
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-red-500 transition-colors z-10"
                    aria-label="Cerrar"
                >
                    ×
                </button>
                <form
                    onSubmit={handleSubmit}
                    className="p-2 xs:p-4 sm:p-8 w-full relative"
                >
                    <h2 className="text-2xl font-extrabold mb-6 text-blue-700 text-center tracking-tight drop-shadow-sm">
                        Agregar Cuadre
                    </h2>
                    {error && <div className="mb-3 text-red-600 text-sm font-semibold text-center bg-red-50 border border-red-200 rounded p-2">{error}</div>}
                    {success && <div className="mb-3 text-green-600 text-sm font-semibold text-center bg-green-50 border border-green-200 rounded p-2">{success}</div>}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Día</label>
                            <input type="text" value={dia} readOnly className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Caja #</label>
                            <input type="number" step="any" value={cajaNumero} onChange={e => setCajaNumero(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={1} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Tasa</label>
                            <input type="number" step="any" value={tasa} onChange={e => setTasa(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={0.01} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Turno</label>
                            <select value={turno} onChange={e => setTurno(e.target.value)} className="w-full border rounded-lg p-2">
                                <option value="Mañana">Mañana</option>
                                <option value="Tarde">Tarde</option>
                                <option value="Noche">Noche</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Cajero</label>
                            <select
                                value={cajero}
                                onChange={e => setCajero(e.target.value)}
                                className="w-full border rounded-lg p-2"
                                required
                            >
                                <option value="">Seleccionar cajero</option>
                                {cajeros.map(cj => (
                                    <option key={cj._id} value={cj.NOMBRE}>
                                        {cj.NOMBRE} ({cj.ID})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <hr className="my-5 border-blue-100" />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Total Caja Sistema Bs</label>
                            <input type="number" step="any" value={totalCajaSistemaBs} onChange={e => setTotalCajaSistemaBs(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={0} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Devoluciones Bs</label>
                            <input type="number" step="any" value={devolucionesBs} onChange={e => setDevolucionesBs(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={0} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Recarga Bs</label>
                            <input type="number" step="any" value={recargaBs} onChange={e => setRecargaBs(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={0} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Pago Móvil Bs</label>
                            <input type="number" step="any" value={pagomovilBs} onChange={e => setPagomovilBs(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={0} />
                        </div>
                        <div className="col-span-1 sm:col-span-3">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Puntos de Venta</label>
                            <div className="flex flex-col gap-3">
                                {puntosVenta.map((pv, idx) => (
                                    <div
                                        key={idx}
                                        className="relative bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-3 flex flex-col md:flex-row md:items-end gap-2 md:gap-4"
                                    >
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 text-red-500 text-lg font-bold hover:bg-red-100 rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                                            style={{ display: puntosVenta.length > 1 ? 'block' : 'none' }}
                                            onClick={() => setPuntosVenta(puntosVenta.filter((_, i) => i !== idx))}
                                            aria-label="Eliminar punto de venta"
                                        >
                                            ×
                                        </button>
                                        <div className="flex-1 flex flex-col min-w-[120px]">
                                            <label className="text-xs text-gray-500 mb-0.5">Banco</label>
                                            <input
                                                type="text"
                                                placeholder="Banco"
                                                value={pv.banco}
                                                onChange={e => {
                                                    const arr = [...puntosVenta];
                                                    arr[idx].banco = e.target.value;
                                                    setPuntosVenta(arr);
                                                }}
                                                className="border rounded-lg p-2 w-full"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col min-w-[120px]">
                                            <label className="text-xs text-gray-500 mb-0.5">Débito Bs</label>
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Débito Bs"
                                                value={pv.puntoDebito}
                                                onChange={e => {
                                                    const arr = [...puntosVenta];
                                                    arr[idx].puntoDebito = Number(e.target.value);
                                                    setPuntosVenta(arr);
                                                }}
                                                className="border rounded-lg p-2 w-full"
                                                min={0}
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col min-w-[120px]">
                                            <label className="text-xs text-gray-500 mb-0.5">Crédito Bs</label>
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Crédito Bs"
                                                value={pv.puntoCredito}
                                                onChange={e => {
                                                    const arr = [...puntosVenta];
                                                    arr[idx].puntoCredito = Number(e.target.value);
                                                    setPuntosVenta(arr);
                                                }}
                                                className="border rounded-lg p-2 w-full"
                                                min={0}
                                                required
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="mt-3 text-blue-700 font-semibold underline text-sm hover:text-blue-900 transition-colors"
                                onClick={() => setPuntosVenta([...puntosVenta, { banco: '', puntoDebito: 0, puntoCredito: 0 }])}
                            >
                                + Agregar punto de venta
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Efectivo Bs</label>
                            <input type="number" step="any" value={efectivoBs} onChange={e => setEfectivoBs(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={0} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Total Bs</label>
                            <input
                                type="number"
                                value={totalBsIngresados - devolucionesBs}
                                readOnly
                                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Total Bs en $ (calculado)</label>
                            <input
                                type="number"
                                value={Number(totalBsEnUsd.toFixed(2))}
                                readOnly
                                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Efectivo $</label>
                            <input type="number" step="any" value={efectivoUsd} onChange={e => setEfectivoUsd(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={0} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Zelle $</label>
                            <input type="number" step="any" value={zelleUsd} onChange={e => setZelleUsd(Number(e.target.value))} className="w-full border rounded-lg p-2" required min={0} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Total General $ (calculado)</label>
                            <input
                                type="number"
                                value={Number(totalGeneralUsd.toFixed(2))}
                                readOnly
                                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Diferencia $ (calculado)</label>
                            <input
                                type="number"
                                value={diferenciaUsd}
                                readOnly
                                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className={`mt-6 w-full py-2 px-4 font-semibold rounded-lg shadow-md text-white transition-colors duration-200 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        disabled={loading}
                        aria-disabled={loading}
                    >
                        {loading ? "Guardando..." : "Guardar"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AgregarCuadreModal;