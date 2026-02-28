// Componentes auxiliares en el mismo archivo o en /components

const PageHeader: React.FC<{
  loading: boolean;
  onBuscar: () => void;
}> = ({ loading, onBuscar }) => (
  <>
    <div className="flex justify-center mb-6 absolute bottom-0 left-0 w-full z-10">
      <button
        onClick={onBuscar}
        disabled={loading}
        className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          "Buscando..."
        ) : (
          <>
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Cuentas por pagar
          </>
        )}
      </button>
    </div>
  </>
);

const AlertBox: React.FC<{
  type: "error" | "success";
  title: string;
  message: string;
}> = ({ type, title, message }) => {
  const isError = type === "error";
  const base =
    "p-4 mb-6 rounded-md shadow border-l-4 text-sm flex flex-col gap-1";
  const classes = isError
    ? "bg-red-100 border-red-500 text-red-700"
    : "bg-green-100 border-green-500 text-green-700";

  return (
    <div className={`${base} ${classes}`} role="alert">
      <p className="font-bold">{title}</p>
      <p>{message}</p>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
    <svg
      className="mx-auto h-12 w-12 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
      />
    </svg>
    <h3 className="mt-2 text-lg font-medium text-slate-800">
      No hay cuentas por pagar
    </h3>
    <p className="mt-1 text-sm text-slate-500">
      No se encontraron cuentas que coincidan con los filtros aplicados.
    </p>
  </div>
);

const LoadingState: React.FC = () => (
  <div className="text-center py-10 text-slate-500 text-lg">
    <svg
      className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    Cargando cuentas...
  </div>
);

const SelectedCuentasBar: React.FC<{
  selectedCuentas: string[];
  cuentasParaPagar: any[];
  onClear: () => void;
}> = ({ selectedCuentas, cuentasParaPagar, onClear }) =>
    selectedCuentas.length === 0 ? null : (
      <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-semibold text-blue-700">
            Cuentas seleccionadas:
          </span>
          {selectedCuentas.map((id) => {
            const cuenta = cuentasParaPagar.find(
              (c) => c.cuentaPorPagarId === id || c._id === id
            );
            return (
              <span
                key={id}
                className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {cuenta?.numeroFactura || id}
              </span>
            );
          })}
        </div>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 transition"
          onClick={onClear}
        >
          Deseleccionar todas
        </button>
      </div>
    );

const ConfirmDialog: React.FC<{
  open: boolean;
  nuevoEstatus: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, nuevoEstatus, onCancel, onConfirm }) => {
  if (!open) return null;

  const color =
    nuevoEstatus === "anulada"
      ? "text-red-600"
      : nuevoEstatus === "pagada"
        ? "text-green-600"
        : "text-yellow-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          Confirmar Cambio de Estatus
        </h2>
        <p className="text-slate-600 mb-4">
          ¿Está seguro que desea cambiar el estatus de la cuenta a
          <span className={`font-bold ml-1 ${color}`}>
            {nuevoEstatus}
          </span>
          ?
        </p>
        {nuevoEstatus === "anulada" && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm">
            <strong>Advertencia:</strong> Esta acción es irreversible. La
            cuenta será marcada como anulada.
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-md font-medium transition-colors shadow-sm hover:shadow-md ${nuevoEstatus === "anulada"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

const MonedaAlert: React.FC<{
  open: boolean;
  cuentasParaPagar: any[];
  show: boolean;
  onClose: () => void;
}> = ({ open, cuentasParaPagar, show, onClose }) => {
  if (
    !open ||
    !show ||
    Object.values(cuentasParaPagar).length <= 1
  )
    return null;

  const monedas = Object.values(cuentasParaPagar)
    .map((c: any) => c.moneda)
    .filter(Boolean);
  const distintas = new Set(monedas).size > 1;
  if (!distintas) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-opacity-30">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded shadow-xl max-w-md mx-auto relative">
        <button
          className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900 text-lg font-bold px-2"
          onClick={onClose}
          aria-label="Cerrar aviso"
        >
          ×
        </button>
        <strong>Atención:</strong> Las cuentas seleccionadas tienen
        monedas distintas. El pago masivo puede requerir revisión manual
        de tasas y montos.
      </div>
    </div>
  );
};

export {
  PageHeader,
  AlertBox,
  EmptyState,
  LoadingState,
  SelectedCuentasBar,
  ConfirmDialog,
  MonedaAlert
};