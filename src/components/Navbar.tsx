import { useState } from 'react';
import { Link } from 'react-router';

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/agregarcuadre', label: 'Agregar Cuadre' },
  { to: '/resumenfarmacias', label: 'Resumen Mensual' },
  { to: '/verificacion-cuadres', label: 'Verificación Cuadres' },
  { to: '/ver-cuadres-dia', label: 'Cuadres por Día' },
  { to: '/resumenfarmacias-dia', label: 'Resumen por Día' },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <nav className="bg-blue-800 text-white px-4 py-3 shadow flex items-center justify-between relative">
      <div className="font-bold text-lg tracking-wide">RapiFarma</div>
      <button
        className="sm:hidden flex flex-col justify-center items-center w-8 h-8 focus:outline-none"
        onClick={() => setOpen(o => !o)}
        aria-label="Abrir menú"
      >
        <span className={`block w-6 h-0.5 bg-white mb-1 transition-all ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
        <span className={`block w-6 h-0.5 bg-white mb-1 transition-all ${open ? 'opacity-0' : ''}`}></span>
        <span className={`block w-6 h-0.5 bg-white transition-all ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
      </button>
      <div className={`flex-col sm:flex-row sm:flex gap-4 text-sm absolute sm:static top-full left-0 w-full sm:w-auto bg-blue-800 sm:bg-transparent z-40 transition-all duration-200 ${open ? 'flex' : 'hidden sm:flex'}`}>
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="block px-4 py-2 sm:p-0 hover:underline text-center"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
