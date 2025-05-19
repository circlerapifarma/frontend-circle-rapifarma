import React, { createContext, useContext, useState } from "react";
import type { Usuario } from "../data";
import { usuarios as usuariosData } from "../data";

interface UserContextProps {
    usuario: Usuario | null;
    login: (correo: string, contraseña: string) => boolean;
    logout: () => void;
    register: (nuevoUsuario: Omit<Usuario, "id">) => boolean;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosData);

    const login = (correo: string, contraseña: string) => {
        const user = usuarios.find(
            u => u.correo === correo && u.contraseña === contraseña
        );
        if (user) {
            setUsuario(user);
            return true;
        }
        return false;
    };

    const logout = () => setUsuario(null);

    const register = (nuevoUsuario: Omit<Usuario, "id">) => {
        if (usuarios.some(u => u.correo === nuevoUsuario.correo)) return false;
        const user: Usuario = { ...nuevoUsuario, id: usuarios.length + 1 };
        setUsuarios(prev => [...prev, user]);
        setUsuario(user);
        return true;
    };

    return (
        <UserContext.Provider value={{ usuario, login, logout, register }}>
            {children}
        </UserContext.Provider>
    );
};

export function useUserContext() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUserContext debe usarse dentro de UserProvider");
    return ctx;
}