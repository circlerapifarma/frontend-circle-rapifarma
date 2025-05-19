import React, { useState } from "react";
import { useUserContext } from "@/context/UserContext";
import { useNavigate } from "react-router";

const LoginPage: React.FC = () => {
    const { login } = useUserContext();
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (login(correo, contraseña)) {
            navigate("/admin");
        } else {
            setError("Correo o contraseña incorrectos");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4 text-center">Iniciar Sesión</h2>
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
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                    Ingresar
                </button>
            </form>
        </div>
    );
};

export default LoginPage;