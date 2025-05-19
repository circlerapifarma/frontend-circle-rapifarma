import React, { useState } from "react";
import { useUserContext } from "@/context/UserContext";

const RegisterPage: React.FC = () => {
    const { register } = useUserContext();
    const [nombre, setNombre] = useState("");
    const [cargo, setCargo] = useState("");
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const ok = register({
            nombre,
            cargo,
            correo,
            contraseña,
            permisos: ["ver_cuadres"],
            accesos: []
        });
        if (ok) {
            setSuccess("Usuario registrado correctamente");
            setError("");
        } else {
            setError("El correo ya está registrado");
            setSuccess("");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-100">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4 text-center">Crear Usuario</h2>
                <input
                    type="text"
                    placeholder="Nombre"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    className="w-full mb-2 p-2 border rounded"
                    required
                />
                <input
                    type="text"
                    placeholder="Cargo"
                    value={cargo}
                    onChange={e => setCargo(e.target.value)}
                    className="w-full mb-2 p-2 border rounded"
                    required
                />
                <input
                    type="email"
                    placeholder="Correo"
                    value={correo}
                    onChange={e => setCorreo(e.target.value)}
                    className="w-full mb-2 p-2 border rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={contraseña}
                    onChange={e => setContraseña(e.target.value)}
                    className="w-full mb-4 p-2 border rounded"
                    required
                />
                {error && <p className="text-red-500 mb-2">{error}</p>}
                {success && <p className="text-green-600 mb-2">{success}</p>}
                <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                    Registrar
                </button>
            </form>
        </div>
    );
};

export default RegisterPage;