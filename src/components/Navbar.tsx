import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router'; // Ensure you're using react-router-dom
import { Menu, X, ChevronDown, LogOut, Home, BarChart, DollarSign, Users } from 'lucide-react'; // Import only used icons from Lucide React
import { motion } from 'framer-motion';

// Permisos y enlaces agrupados para una mejor organización visual
const allLinks = [
    {
        category: 'Ventas y Cuadres',
        icon: BarChart,
        items: [
            { to: '/resumenfarmacias', label: 'Resumen de Ventas', permiso: 'ver_resumen_mensual' },
            { to: '/ventatotal', label: 'Venta Total', permiso: 'ver_ventas_totales' },
            { to: '/agregarcuadre', label: 'Agregar Cuadre', permiso: 'agregar_cuadre' },
            { to: '/cuadresporfarmacia', label: 'Mis Cuadres', permiso: 'agregar_cuadre' },
            { to: '/verificacion-cuadres', label: 'Verificación Cuadres', permiso: 'verificar_cuadres' },
            { to: '/ver-cuadres-dia', label: 'Cuadres por Día', permiso: 'ver_cuadres_dia' },
            { to: '/visualizarcuadres', label: 'Visualizar Cuadres', permiso: 'acceso_admin' },
        ]
    },
    {
        category: 'Gastos',
        icon: DollarSign,
        items: [
            { to: '/agregargastos', label: 'Agregar Gasto', permiso: 'agregar_cuadre' },
            { to: '/gastosporusuario', label: 'Mis Gastos', permiso: 'agregar_cuadre' },
            { to: '/verificaciongastos', label: 'Verificación Gastos', permiso: 'verificar_gastos' },
            { to: '/vergastos', label: 'Ver Gastos (Admin)', permiso: 'acceso_admin' },
        ]
    },
    {
        category: 'Administración',
        icon: Users,
        items: [
            { to: '/cajeros', label: 'Vendedores', permiso: 'acceso_admin' },
            { to: '/comisiones', label: 'Comisiones Por Turno', permiso: 'acceso_admin' },
            { to: '/comisionesgenerales', label: 'Comisiones Generales', permiso: 'acceso_admin' },
            { to: '/cuentasporpagar', label: 'Cuentas por Pagar', permiso: 'acceso_admin' },
            { to: '/vercuentasporpagar', label: 'Ver Cuentas por Pagar', permiso: 'acceso_admin' },
        ]
    },
    // Añadir un enlace a la página de inicio o dashboard si existe
    {
        category: 'Inicio',
        icon: Home,
        items: [
            { to: '/admin', label: 'Dashboard', permiso: 'acceso_admin' }, // Assuming '/admin' is your dashboard
        ]
    },
];

const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [permisosUsuario, setPermisosUsuario] = useState<string[]>([]);
    const [usuario, setUsuario] = useState<any>(null);
    const location = useLocation();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Effect for handling user data and permissions from localStorage
    useEffect(() => {
        const storedUsuario = JSON.parse(localStorage.getItem('usuario') || 'null');
        setUsuario(storedUsuario);
        setPermisosUsuario(storedUsuario?.permisos || []);

        const handleStorageChange = () => {
            const updatedUsuario = JSON.parse(localStorage.getItem('usuario') || 'null');
            setUsuario(updatedUsuario);
            setPermisosUsuario(updatedUsuario?.permisos || []);
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Effect for handling clicks outside dropdown/mobile menu to close them
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && isMobileMenuOpen) {
                // Only close if the click is outside and menu is open
                const button = document.querySelector('[aria-label="Abrir menú"]'); // Get the mobile menu button
                if (button && !button.contains(event.target as Node)) {
                    setIsMobileMenuOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    // Filter links based on user permissions
    const accessibleLinks = allLinks.map(category => ({
        ...category,
        items: category.items.filter(link => !link.permiso || permisosUsuario.includes(link.permiso))
    })).filter(category => category.items.length > 0); // Remove empty categories

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/login'; // Redirect to login page
    };

    return (
        <nav className="bg-gradient-to-r bg-white text-black shadow-lg px-4 py-3 sticky top-0 z-50">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
                {/* Logo / Brand Name */}
                <Link to="/admin" className="text-2xl font-extrabold tracking-wide flex items-center gap-2">
                    <img src="/path/to/your/logo.png" alt="Drocolven Logo" className="h-8 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} /> {/* Optional: Add your logo here */}
                    <span>DROCOLVEN</span>
                </Link>

                {/* Desktop Menu (Dropdown) */}
                <div className="hidden sm:flex items-center gap-6 relative" ref={dropdownRef}>
                    <button
                        className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200 text-base font-semibold"
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        aria-expanded={isDropdownOpen}
                    >
                        Menú de Opciones
                        <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                    </button>

                    {isDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-3 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
                        >
                            <div className="py-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                {accessibleLinks.map(category => (
                                    <div key={category.category} className="mb-2">
                                        <h3 className="px-4 pt-3 pb-2 text-xs font-bold uppercase text-gray-500 flex items-center gap-2 border-b border-gray-100">
                                            {category.icon && <category.icon className="w-4 h-4" />}
                                            {category.category}
                                        </h3>
                                        <ul className="pb-1">
                                            {category.items.map(link => (
                                                <li key={link.to}>
                                                    <Link
                                                        to={link.to}
                                                        onClick={() => setIsDropdownOpen(false)} // Close dropdown on link click
                                                        className={`block px-4 py-2 text-sm whitespace-nowrap transition-all duration-150 rounded mx-2 my-1
                                                            ${location.pathname === link.to
                                                                ? 'text-gray-700 font-semibold bg-gray-50 hover:bg-gray-100'
                                                                : 'text-gray-800 hover:text-gray-700 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {link.label}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                                {usuario && (
                                    <div className="border-t border-gray-200 pt-2 mt-2">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded mx-2 my-1 flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" /> Cerrar sesión
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="sm:hidden text-white p-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                    aria-label="Abrir menú"
                >
                    {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
                </button>
            </div>

            {/* Mobile Menu Content (Animated Slide-in) */}
            <motion.div
                ref={mobileMenuRef}
                initial={false}
                animate={isMobileMenuOpen ? "open" : "closed"}
                variants={{
                    open: { opacity: 1, height: "auto", transition: { duration: 0.3 } },
                    closed: { opacity: 0, height: 0, transition: { duration: 0.3 } }
                }}
                className="sm:hidden mt-4 bg-white rounded-lg shadow-xl overflow-hidden"
            >
                <div className="p-4 custom-scrollbar max-h-[70vh]">
                    {accessibleLinks.map(category => (
                        <div key={category.category} className="mb-4 last:mb-0">
                            <h3 className="text-sm font-bold uppercase text-black-600 mb-2 flex items-center gap-2">
                                {category.icon && <category.icon className="w-4 h-4" />}
                                {category.category}
                            </h3>
                            <ul className="space-y-1">
                                {category.items.map(link => (
                                    <li key={link.to}>
                                        <Link
                                            to={link.to}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`block px-3 py-2 text-sm transition-all duration-150 rounded
                                                ${location.pathname === link.to
                                                    ? 'text-blue-700 font-semibold bg-blue-50'
                                                    : 'text-gray-800 hover:text-blue-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    {usuario && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" /> Cerrar sesión
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </nav>
    );
};

export default Navbar;
