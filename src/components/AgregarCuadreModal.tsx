import React, { useState } from "react";
import { useDataFarmaciaContext } from "@/context/DataFarmaciaContext";

interface Props {
    farmacia: string;
    dia: string;
    onClose: () => void;
}

const AgregarCuadreModal: React.FC<Props> = ({ farmacia, dia, onClose }) => {
    const { addCuadreCaja } = useDataFarmaciaContext();

    // Estados para los campos del cuadre
    const [cajaNumero, setCajaNumero] = useState<number>(1);
    const [turno, setTurno] = useState<string>("Mañana");
    const [cajero, setCajero] = useState<string>("");
    const [tasa, setTasa] = useState<number>(0);

    const [totalCajaSistemaBs, setTotalCajaSistemaBs] = useState<number>(0);
    const [devolucionesBs, setDevolucionesBs] = useState<number>(0);
    const [recargaBs, setRecargaBs] = useState<number>(0);
    const [pagomovilBs, setPagomovilBs] = useState<number>(0);
    const [puntoDebitoBs, setPuntoDebitoBs] = useState<number>(0);
    const [puntoCreditoBs, setPuntoCreditoBs] = useState<number>(0);
    const [efectivoBs, setEfectivoBs] = useState<number>(0);
    const [totalBs, setTotalBs] = useState<number>(0);

    const [efectivoUsd, setEfectivoUsd] = useState<number>(0);
    const [zelleUsd, setZelleUsd] = useState<number>(0);

    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    // Cálculos automáticos
    const totalBsIngresados = recargaBs + pagomovilBs + puntoDebitoBs + puntoCreditoBs + efectivoBs;
    const totalBsEnUsd = tasa > 0 ? (totalBsIngresados - devolucionesBs) / tasa : 0;
    const totalGeneralUsd = totalBsEnUsd + efectivoUsd + zelleUsd;
    const diferenciaUsd = tasa > 0 ? Number((totalGeneralUsd - (totalCajaSistemaBs / tasa)).toFixed(2)) : 0;

    const validar = () => {
        if (!cajero.trim()) return "El campo 'Cajero' es obligatorio.";
        if (!turno.trim()) return "El campo 'Turno' es obligatorio.";
        if (cajaNumero <= 0) return "El número de caja debe ser mayor a 0.";
        if (tasa <= 0) return "La tasa debe ser mayor a 0.";
        if (totalCajaSistemaBs < 0 || devolucionesBs < 0 || recargaBs < 0 || pagomovilBs < 0 ||
            puntoDebitoBs < 0 || puntoCreditoBs < 0 || efectivoBs < 0 || totalBs < 0 ||
            efectivoUsd < 0 || zelleUsd < 0) return "Los montos no pueden ser negativos.";
        return "";
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const errorMsg = validar();
        if (errorMsg) {
            setError(errorMsg);
            return;
        }
        const cuadre = {
            dia,
            cajaNumero,
            tasa,
            turno,
            cajero,
            totalCajaSistemaBs,
            devolucionesBs,
            recargaBs,
            pagomovilBs,
            puntoDebitoBs,
            puntoCreditoBs,
            efectivoBs,
            totalBs: totalBsIngresados, // puedes guardar el total de Bs ingresados
            totalBsEnUsd: Number(totalBsEnUsd.toFixed(2)),
            efectivoUsd,
            zelleUsd,
            totalGeneralUsd: Number(totalGeneralUsd.toFixed(2)),
            diferenciaUsd,
            delete: false,
        };
        addCuadreCaja(farmacia, cuadre);
        setSuccess("¡Cuadre guardado exitosamente!");
        setError("");
        // Imprime el resumen en consola
        console.log("Resumen Cuadre Guardado:", JSON.stringify(cuadre, null, 2));
        setTimeout(() => {
            onClose();
        }, 1200);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="overflow-auto max-h-[90vh]">

                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative"
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-2 right-2 text-xl text-gray-500 hover:text-red-500"
                    >
                        ×
                    </button>
                    <h2 className="text-xl font-bold mb-4 text-blue-800 text-center">
                        Agregar Cuadre - {farmacia}
                    </h2>
                    {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
                    {success && <div className="mb-2 text-green-600 text-sm">{success}</div>}
                    <div className="mb-2">
                        <label className="block text-sm">Día</label>
                        <input type="text" value={dia} readOnly className="w-full border rounded p-2 bg-gray-100" />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Caja #</label>
                        <input type="number" value={cajaNumero} onChange={e => setCajaNumero(Number(e.target.value))} className="w-full border rounded p-2" required min={1} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Tasa</label>
                        <input type="number" value={tasa} onChange={e => setTasa(Number(e.target.value))} className="w-full border rounded p-2" required min={0.01} step="0.01" />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Turno</label>
                        <select value={turno} onChange={e => setTurno(e.target.value)} className="w-full border rounded p-2">
                            <option value="Mañana">Mañana</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Noche">Noche</option>
                        </select>
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Cajero</label>
                        <input type="text" value={cajero} onChange={e => setCajero(e.target.value)} className="w-full border rounded p-2" required />
                    </div>
                    <hr className="my-3" />
                    <div className="mb-2">
                        <label className="block text-sm">Total Caja Sistema Bs</label>
                        <input type="number" value={totalCajaSistemaBs} onChange={e => setTotalCajaSistemaBs(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Devoluciones Bs</label>
                        <input type="number" value={devolucionesBs} onChange={e => setDevolucionesBs(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Recarga Bs</label>
                        <input type="number" value={recargaBs} onChange={e => setRecargaBs(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Pago Móvil Bs</label>
                        <input type="number" value={pagomovilBs} onChange={e => setPagomovilBs(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Punto Débito Bs</label>
                        <input type="number" value={puntoDebitoBs} onChange={e => setPuntoDebitoBs(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Punto Crédito Bs</label>
                        <input type="number" value={puntoCreditoBs} onChange={e => setPuntoCreditoBs(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Efectivo Bs</label>
                        <input type="number" value={efectivoBs} onChange={e => setEfectivoBs(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Total Bs</label>
                        <input type="number" value={totalBs} onChange={e => setTotalBs(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Total Bs en $ (calculado)</label>
                        <input
                            type="number"
                            value={Number(totalBsEnUsd.toFixed(2))}
                            readOnly
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">Efectivo $</label>
                        <input type="number" value={efectivoUsd} onChange={e => setEfectivoUsd(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm">Zelle $</label>
                        <input type="number" value={zelleUsd} onChange={e => setZelleUsd(Number(e.target.value))} className="w-full border rounded p-2" required min={0} />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm">Total General $ (calculado)</label>
                        <input
                            type="number"
                            value={Number(totalGeneralUsd.toFixed(2))}
                            readOnly
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm">Diferencia $ (calculado)</label>
                        <input
                            type="number"
                            value={diferenciaUsd}
                            readOnly
                            className="w-full border rounded p-2 bg-gray-100"
                        />
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                        Guardar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AgregarCuadreModal;