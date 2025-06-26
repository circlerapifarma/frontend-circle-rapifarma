import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router'; // Ensure react-router-dom is used
import { Menu, X, ChevronDown, LogOut, Home, BarChart, DollarSign, Users } from 'lucide-react';
import { motion } from 'framer-motion';

// Permisos y enlaces agrupados para una mejor organización visual
const allLinks = [
    {
        category: 'Ventas y Cuadres',
        icon: BarChart,
        items: [
            { to: '/gastoscxc-cuadres', label: 'Gastos, Cuentas y Cuadres', permiso: 'ver_cuadres_dia' },
            { to: '/resumenfarmacias', label: 'Resumen de Ventas', permiso: 'ver_resumen_mensual' },
            { to: '/ventatotal', label: 'Venta Total', permiso: 'ver_ventas_totales' },
            { to: '/agregarcuadre', label: 'Agregar Cuadre', permiso: 'agregar_cuadre' },
            { to: '/cuadresporfarmacia', label: 'Mis Cuadres', permiso: 'agregar_cuadre' },
            { to: '/verificacion-cuadres', label: 'Verificación Cuadres', permiso: 'verificar_cuadres' },
            { to: '/ver-cuadres-dia', label: 'Cuadres por Día', permiso: 'ver_cuadres_dia' },
            { to: '/visualizarcuadres', label: 'Visualizar Cuadres', permiso: 'ver_cuadres_dia' },
        ]
    },
    {
        category: 'Gastos',
        icon: DollarSign,
        items: [
            { to: '/agregargastos', label: 'Agregar Gasto', permiso: 'agregar_cuadre' },
            { to: '/gastosporusuario', label: 'Mis Gastos', permiso: 'agregar_cuadre' },
            { to: '/verificaciongastos', label: 'Verificación Gastos', permiso: 'verificar_gastos' },
            { to: '/vergastos', label: 'Ver Gastos (Admin)', permiso: 'verificar_gastos' },
        ]
    },
    {
        category: 'Administración',
        icon: Users,
        items: [
            { to: '/cajeros', label: 'Vendedores', permiso: 'cajeros' },
            { to: '/retiros', label: 'Retiro', permiso: 'acceso_admin' },
            { to: '/comisiones', label: 'Comisiones Por Turno', permiso: 'comisiones' },
            { to: '/comisionesgenerales', label: 'Comisiones Generales', permiso: 'comisiones' },
            { to: '/cuentasporpagar', label: 'Agregar Cuenta Por Pagar', permiso: 'agregar_cuadre' },
            { to: '/vercuentasporpagar', label: 'Ver Cuentas por Pagar', permiso: 'verificar_gastos' },
            { to: '/verificacioncuentasporpagar', label: 'Verificación Cuentas por Pagar', permiso: 'verificar_gastos' },
            { to: '/agregarinventariocosto', label: 'Agregar Costo Inv', permiso: 'acceso_admin' },
            { to: '/verinventarios', label: 'Ver Inventarios', permiso: 'acceso_admin' },
            { to: '/pagoscpp', label: 'Ver Pagos CxP', permiso: 'verificar_gastos' },
            { to: '/cuentasporpagarfarmacia', label: 'Cuentas por Pagar por Farmacia', permiso: 'verificar_gastos' },
        ]
    },
    
    {
        category: 'Inicio',
        icon: Home,
        items: [
            { to: '/admin', label: 'Dashboard', permiso: 'acceso_admin' },
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
            // Close desktop dropdown
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            // Close mobile menu if open and click is outside the menu and not on the toggle button
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && isMobileMenuOpen) {
                const mobileButton = document.querySelector('[aria-label="Toggle mobile menu"]');
                if (mobileButton && !mobileButton.contains(event.target as Node)) {
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
    })).filter(category => category.items.length > 0);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/login';
    };

    return (
        <nav className="bg-white text-black shadow-lg px-4 py-3 sticky top-0 z-50">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
                {/* Logo / Brand Name */}
                <Link to="/admin" className="text-2xl font-extrabold tracking-wide flex items-center gap-2 text-black">
                    {/* Consider placing your actual logo image here */}
                    <img src="/path/to/your/logo.png" alt="Donaive Logo" className="h-8 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <span>DONAIVE</span>
                </Link>

                {/* Desktop Menu (Dropdown) */}
                <div className="hidden sm:flex items-center gap-6 relative" ref={dropdownRef}>
                    <button
                        className="flex items-center gap-2 px-4 text-2xl font-extrabold py-2 rounded-full text-black transition-all duration-200"
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        aria-expanded={isDropdownOpen}
                    >
                        MODULOS
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
                                        <h3 className="px-4 pt-3 pb-2 text-xs font-bold uppercase text-gray-700 flex items-center gap-2 border-b border-gray-100">
                                            {category.icon && <category.icon className="w-4 h-4 text-gray-700" />} {/* Icons remain dark */}
                                            {category.category}
                                        </h3>
                                        <ul className="pb-1">
                                            {category.items.map(link => (
                                                <li key={link.to}>
                                                    <Link
                                                        to={link.to}
                                                        onClick={() => setIsDropdownOpen(false)}
                                                        className={`block px-4 py-2 text-sm whitespace-nowrap transition-all duration-150 rounded mx-2 my-1
                                                            ${location.pathname === link.to
                                                                ? 'text-black font-semibold bg-gray-100 hover:bg-gray-200' // Active link black on light gray
                                                                : 'text-gray-800 hover:text-black hover:bg-gray-50' // Hover link black on very light gray
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
                    className="sm:hidden bg-white text- p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                    aria-label="Toggle mobile menu"
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
                className="sm:hidden mt-4 bg-gray-100 rounded-lg shadow-xl overflow-y-auto overflow-x-hidden max-h-[70vh]"
            >
                <div className="p-4 custom-scrollbar">
                    {accessibleLinks.map(category => (
                        <div key={category.category} className="mb-4 last:mb-0">
                            <h3 className="text-sm font-bold uppercase text-gray-600 mb-2 flex items-center gap-2">
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
                                                    ? 'text-black font-semibold bg-gray-200' // Active link black on medium gray
                                                    : 'text-gray-800 hover:text-black hover:bg-gray-50' // Default text gray, hover black on very light gray
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
