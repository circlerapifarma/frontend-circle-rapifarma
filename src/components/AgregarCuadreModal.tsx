import React, { useState, useEffect } from "react";
import UpFile from "./upfile/UpFile";
import ImageDisplay from "./upfile/ImageDisplay";

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
  const [tasa, setTasa] = useState<number>();

  const [totalCajaSistemaBs, setTotalCajaSistemaBs] = useState<
    number | undefined
  >();
  const [devolucionesBs, setDevolucionesBs] = useState<number | undefined>();
  const [recargaBs, setRecargaBs] = useState<number | undefined>();
  const [pagomovilBs, setPagomovilBs] = useState<number | undefined>();
  const [efectivoBs, setEfectivoBs] = useState<number | undefined>();

  const [efectivoUsd, setEfectivoUsd] = useState<number | undefined>();
  const [zelleUsd, setZelleUsd] = useState<number | undefined>();

  const [valesUsd, setValesUsd] = useState<number | undefined>(undefined); // Inicialmente vacío
  const [costoInventario, setCostoInventario] = useState<number | undefined>(
    undefined
  ); // Nuevo estado para Costo Inventario

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false); // Nuevo estado para controlar el loading
  const [showConfirm, setShowConfirm] = useState(false);

  // Nuevo estado para puntos de venta
  const [puntosVenta, setPuntosVenta] = useState<
    Array<{
      banco: string;
      puntoDebito: number | string | undefined;
      puntoCredito: number | string | undefined;
    }>
  >([{ banco: "", puntoDebito: "", puntoCredito: "" }]);

  const [cajeros, setCajeros] = useState<Cajero[]>([]);
  // Para guardar hasta 3 objectNames, inicializado con 3 nulos
  const [imagenesCuadre, setImagenesCuadre] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
  ]);

  // Cálculos automáticos
  // Recarga Bs y Devoluciones Bs son solo visuales, no afectan los totales
  const totalBsIngresados =
    (pagomovilBs ?? 0) +
    puntosVenta.reduce((acc, pv) => acc + Number(pv.puntoDebito || 0), 0) +
    puntosVenta.reduce((acc, pv) => acc + Number(pv.puntoCredito || 0), 0) +
    (efectivoBs ?? 0);
  const totalBsMenosVales = totalBsIngresados; // Ya no se resta devolucionesBs
  const totalCajaSistemaMenosVales =
    (totalCajaSistemaBs ?? 0) - (valesUsd ? valesUsd * (tasa ?? 0) : 0);
  const totalBsEnUsd = (tasa ?? 0) > 0 ? totalBsMenosVales / (tasa ?? 0) : 0;
  const totalGeneralUsd = totalBsEnUsd + (efectivoUsd ?? 0) + (zelleUsd ?? 0);
  // Cálculo de diferenciaUsd, sobranteUsd y faltanteUsd con 4 decimales para guardar en la base de datos
  const diferenciaUsd =
    (tasa ?? 0) > 0
      ? Number(
          (totalGeneralUsd - totalCajaSistemaMenosVales / (tasa ?? 0)).toFixed(
            4
          )
        )
      : 0;

  const validar = () => {
    if (!cajero.trim()) return "El campo 'Cajero' es obligatorio.";
    if (!turno.trim()) return "El campo 'Turno' es obligatorio.";
    if (cajaNumero <= 0) return "El número de caja debe ser mayor a 0.";
    if ((tasa ?? 0) <= 0) return "La tasa debe ser mayor a 0.";
    if (
      costoInventario === undefined ||
      isNaN(costoInventario) ||
      costoInventario <= 0
    )
      return "El campo 'Costo Inventario' es obligatorio y debe ser mayor a 0.";
    if (
      (totalCajaSistemaBs ?? 0) < 0 ||
      (devolucionesBs ?? 0) < 0 ||
      (recargaBs ?? 0) < 0 ||
      (pagomovilBs ?? 0) < 0 ||
      (efectivoBs ?? 0) < 0 ||
      (efectivoUsd ?? 0) < 0 ||
      (zelleUsd ?? 0) < 0
    )
      return "Los montos no pueden ser negativos.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");
    const errorMsg = validar();
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    // Validar imágenes: debe haber al menos una
    const imagenesValidas = imagenesCuadre.filter(
      (img): img is string => !!img
    );
    if (imagenesValidas.length === 0) {
      setError("Debe adjuntar al menos una imagen (máx. 3).");
      return;
    }
    // Mostrar confirmación siempre
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setLoading(true);
    const cuadre = {
      dia,
      cajaNumero,
      tasa,
      turno,
      cajero,
      cajeroId: cajeros.find((c) => c.NOMBRE === cajero)?.ID || "",
      totalCajaSistemaBs,
      devolucionesBs,
      recargaBs,
      pagomovilBs,
      puntosVenta,
      efectivoBs,
      valesUsd: valesUsd ?? 0,
      totalBs: Number(totalBsMenosVales.toFixed(4)),
      totalBsEnUsd: Number(totalBsEnUsd.toFixed(4)),
      totalCajaSistemaMenosVales: Number(totalCajaSistemaMenosVales.toFixed(4)),
      efectivoUsd,
      zelleUsd,
      totalGeneralUsd: Number(totalGeneralUsd.toFixed(4)),
      diferenciaUsd,
      sobranteUsd: diferenciaUsd > 0 ? Number(diferenciaUsd.toFixed(4)) : 0,
      faltanteUsd:
        diferenciaUsd < 0 ? Number(Math.abs(diferenciaUsd).toFixed(4)) : 0,
      delete: false,
      estado: "wait",
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
        return farmacias[farmacia] || "";
      })(),
      costoInventario: costoInventario,
      imagenesCuadre: imagenesCuadre
        .filter((img): img is string => img !== null)
        .slice(0, 4),
    };

    console.log("Cuadre object being sent:", cuadre); // Log the cuadre object
    console.log("Valor de valesUsd antes de enviar:", valesUsd); // Log adicional para depuración

    try {
      setLoading(true);
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
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    await doSubmit();
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
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
      .then((res) => res.json())
      .then((data) => {
        const filtrados = data.filter(
          (c: Cajero) => c.FARMACIAS && c.FARMACIAS[farmacia]
        );
        setCajeros(filtrados);
      })
      .catch(() => setCajeros([]));
  }, [farmacia]);

  const handleNumericInput = (
    value: string,
    setter: (val: number | undefined) => void
  ) => {
    const numericValue = value.replace(/^0+(?!\.)/, ""); // Eliminar ceros iniciales excepto si es un número decimal
    setter(numericValue === "" ? undefined : Number(numericValue));
  };

  return (
    <div className="fixed inset-0 bg-white bg-opacity-40 flex items-center justify-center z-50 p-2 sm:p-4">
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
          {error && (
            <div className="mb-3 text-red-600 text-sm font-semibold text-center bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 text-green-600 text-sm font-semibold text-center bg-green-50 border border-green-200 rounded p-2">
              {success}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Día
              </label>
              <input
                type="text"
                value={dia}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Caja #
              </label>
              <input
                type="number"
                step="any"
                value={cajaNumero}
                onChange={(e) => setCajaNumero(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={1}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tasa
              </label>
              <input
                type="number"
                step="any"
                value={tasa}
                onChange={(e) => setTasa(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0.01}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Turno
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="De Turno">De Turno</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Cajero
              </label>
              <select
                value={cajero}
                onChange={(e) => setCajero(e.target.value)}
                className="w-full border rounded-lg p-2"
                required
              >
                <option value="">Seleccionar cajero</option>
                {cajeros.map((cj) => (
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Caja Sistema Bs
              </label>
              <input
                type="number"
                step="any"
                value={totalCajaSistemaBs}
                onChange={(e) => setTotalCajaSistemaBs(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Devoluciones Bs
              </label>
              <input
                type="number"
                step="any"
                value={devolucionesBs}
                onChange={(e) => setDevolucionesBs(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Recarga Bs
              </label>
              <input
                type="number"
                step="any"
                value={recargaBs}
                onChange={(e) => setRecargaBs(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Pago Móvil Bs
              </label>
              <input
                type="number"
                step="any"
                value={pagomovilBs}
                onChange={(e) => setPagomovilBs(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Costo Inventario
              </label>
              <input
                type="number"
                step="any"
                value={costoInventario ?? ""}
                onChange={(e) =>
                  setCostoInventario(
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
                className="w-full border rounded-lg p-2"
                required
                min={0.01}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Puntos de Venta
              </label>
              <div className="flex flex-col gap-3">
                {puntosVenta.map((pv, idx) => (
                  <div
                    key={idx}
                    className="relative bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-3 flex flex-col md:flex-row md:items-end gap-2 md:gap-4"
                  >
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-red-500 text-lg font-bold hover:bg-red-100 rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                      style={{
                        display: puntosVenta.length > 1 ? "block" : "none",
                      }}
                      onClick={() =>
                        setPuntosVenta(puntosVenta.filter((_, i) => i !== idx))
                      }
                      aria-label="Eliminar punto de venta"
                    >
                      ×
                    </button>
                    <div className="flex-1 flex flex-col min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5">
                        Banco
                      </label>
                      <input
                        type="text"
                        placeholder="Banco"
                        value={pv.banco}
                        onChange={(e) => {
                          const arr = [...puntosVenta];
                          arr[idx].banco = e.target.value;
                          setPuntosVenta(arr);
                        }}
                        className="border rounded-lg p-2 w-full"
                        required
                      />
                    </div>
                    <div className="flex-1 flex flex-col min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5">
                        Débito Bs
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Débito Bs"
                        value={pv.puntoDebito}
                        onChange={(e) => {
                          const arr = [...puntosVenta];
                          arr[idx].puntoDebito = Number(e.target.value);
                          setPuntosVenta(arr);
                        }}
                        className="border rounded-lg p-2 w-full"
                        min={0}
                        required
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    <div className="flex-1 flex flex-col min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5">
                        Crédito Bs
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Crédito Bs"
                        value={pv.puntoCredito}
                        onChange={(e) => {
                          const arr = [...puntosVenta];
                          arr[idx].puntoCredito = Number(e.target.value);
                          setPuntosVenta(arr);
                        }}
                        className="border rounded-lg p-2 w-full"
                        min={0}
                        required
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-blue-700 font-semibold underline text-sm hover:text-blue-900 transition-colors"
                onClick={() =>
                  setPuntosVenta([
                    ...puntosVenta,
                    { banco: "", puntoDebito: 0, puntoCredito: 0 },
                  ])
                }
              >
                + Agregar punto de venta
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Efectivo Bs
              </label>
              <input
                type="number"
                step="any"
                value={efectivoBs}
                onChange={(e) => setEfectivoBs(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Vales $
              </label>
              <input
                type="number"
                step="any"
                value={valesUsd ?? 0} // Mostrar vacío si es undefined
                onChange={(e) =>
                  handleNumericInput(e.target.value, setValesUsd)
                }
                className="w-full border rounded-lg p-2"
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />{" "}
              {/* Cambiado de valesBs a valesUsd */}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Bs
              </label>
              <input
                type="number"
                value={totalBsMenosVales.toFixed(4)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Caja Sistema Bs - Vales
              </label>
              <input
                type="number"
                value={totalCajaSistemaMenosVales.toFixed(4)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Bs en $ (calculado)
              </label>
              <input
                type="number"
                value={totalBsEnUsd.toFixed(4)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Efectivo $
              </label>
              <input
                type="number"
                step="any"
                value={efectivoUsd}
                onChange={(e) => setEfectivoUsd(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Zelle $
              </label>
              <input
                type="number"
                step="any"
                value={zelleUsd}
                onChange={(e) => setZelleUsd(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total General $ (calculado)
              </label>
              <input
                type="number"
                value={Number(totalGeneralUsd.toFixed(4))}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Diferencia $ (calculado)
              </label>
              <input
                type="number"
                value={diferenciaUsd.toFixed(4)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Sobrante $ (calculado)
              </label>
              <input
                type="number"
                value={diferenciaUsd > 0 ? diferenciaUsd.toFixed(4) : "0.0000"}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-green-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Faltante $ (calculado)
              </label>
              <input
                type="number"
                value={
                  diferenciaUsd < 0
                    ? Math.abs(diferenciaUsd).toFixed(4)
                    : "0.0000"
                }
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-red-700"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-1 md:gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-start relative group"
                >
                  <UpFile
                    onUploadSuccess={(objectName: string) => {
                      setImagenesCuadre((prev) => {
                        const newArr = [...prev];
                        newArr[idx] = objectName;
                        return newArr;
                      });
                    }}
                    label={`Adjuntar imagen ${idx + 1}`}
                    maxSizeMB={4}
                    initialFileUrl={imagenesCuadre[idx] || undefined}
                  />
                  {imagenesCuadre[idx] && (
                    <div className="mt-1 relative inline-block">
                      <ImageDisplay
                        imageName={imagenesCuadre[idx]!}
                        style={{
                          maxWidth: 200,
                          maxHeight: 200,
                          borderRadius: 8,
                          marginTop: 8,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-1 shadow-md text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors z-20 opacity-80 group-hover:opacity-100"
                        title="Eliminar imagen"
                        onClick={() => {
                          setImagenesCuadre((prev) => {
                            const newArr = [...prev];
                            newArr[idx] = null;
                            return newArr;
                          });
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className={`mt-6 w-full py-2 px-4 font-semibold rounded-lg shadow-md text-white transition-colors duration-200 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </form>
        {showConfirm && (
          <div className="fixed inset-0 bg-white bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-blue-200">
              <h3 className="text-lg font-bold text-blue-700 mb-2">
                Confirmar cuadre
              </h3>
              {Math.abs(diferenciaUsd) > 0.009 ? (
                <>
                  <p className="mb-2 text-gray-700">
                    Hay un {diferenciaUsd > 0 ? "sobrante" : "faltante"} en el
                    cuadre.
                  </p>
                  <div className="mb-4 text-center">
                    {diferenciaUsd > 0 && (
                      <span className="text-green-700 font-semibold">
                        Sobrante: ${diferenciaUsd.toFixed(4)}
                      </span>
                    )}
                    {diferenciaUsd < 0 && (
                      <span className="text-red-700 font-semibold">
                        Faltante: ${Math.abs(diferenciaUsd).toFixed(4)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="mb-4 text-gray-700">¿Desea guardar el cuadre?</p>
              )}
              <p className="mb-4 text-sm text-gray-500">
                ¿Desea continuar y guardar el cuadre?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleConfirm}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg"
                  disabled={loading}
                >
                  Sí, guardar
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg"
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgregarCuadreModal;
