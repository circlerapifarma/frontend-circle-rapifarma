import { X } from "lucide-react";

interface PharmacySelectorProps {
  available: {id: string, nombre: string}[];
  selected: Record<string, string>;
  onChange: (farmacias: Record<string, string>) => void;
}

export const SelectorFarmacia = ({ available, selected, onChange }: PharmacySelectorProps) => {
  const handleAdd = (id: string) => {
    const farmacia = available.find(f => f.id === id);
    if (farmacia) {
      onChange({ ...selected, [id]: farmacia.nombre });
    }
  };

  const handleRemove = (id: string) => {
    const newSelected = { ...selected };
    delete newSelected[id];
    onChange(newSelected);
  };

  return (
    <div className="space-y-3 p-3 bg-gray-50 border rounded-lg">
      <div className="flex flex-wrap gap-2 mb-2">
        {Object.entries(selected).length === 0 && (
          <span className="text-gray-400 text-xs italic">Ninguna farmacia asignada</span>
        )}
        {Object.entries(selected).map(([id, nombre]) => (
          <span key={id} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold border border-blue-200">
            {id}: {nombre}
            <button onClick={() => handleRemove(id)} className="hover:text-red-500 ml-1">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      <select 
        className="w-full p-2 text-sm border rounded bg-white outline-none focus:ring-2 focus:ring-blue-300"
        value=""
        onChange={(e) => handleAdd(e.target.value)}
      >
        <option value="" disabled>+ Asignar farmacia...</option>
        {available
          .filter(f => !selected[f.id]) // Solo mostramos las que no han sido seleccionadas
          .map(f => (
            <option key={f.id} value={f.id}>{f.id} - {f.nombre}</option>
          ))
        }
      </select>
    </div>
  );
};