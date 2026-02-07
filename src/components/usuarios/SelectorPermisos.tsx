interface PermissionSelectorProps {
    selected: string[];
    onChange: (permiso: string) => void;
}

const PERMISOS = [

    "ver_inicio",

    "ver_about",

    "agregar_cuadre",

    "ver_resumen_mensual",

    "verificar_cuadres",

    "ver_cuadres_dia",

    "ver_resumen_dia",

    "acceso_admin",

    "eliminar_cuadres",

    "ver_ventas_totales",

    "verificar_gastos"

];

export const PermissionSelector = ({ selected, onChange }: PermissionSelectorProps) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-white border rounded-md">
        {PERMISOS.map((p) => (
            <label key={p} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selected.includes(p)}
                    onChange={() => onChange(p)}
                />
                <span className="text-[11px] text-gray-700 uppercase font-medium">{p.replace(/_/g, " ")}</span>
            </label>
        ))}
    </div>
);