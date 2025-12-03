# Instrucciones para Implementar el Backend de Gestión de Usuarios

Este documento contiene las instrucciones detalladas para implementar los endpoints de gestión de usuarios en el backend, especialmente para poder ver y modificar usuarios existentes.

## 📋 Estructura de Datos

### Modelo de Usuario

El modelo debe tener los siguientes campos:

```python
{
    "_id": ObjectId,  # ID único generado por MongoDB
    "correo": str,  # Correo electrónico del usuario (requerido, único)
    "contraseña": str,  # Contraseña hasheada (requerido)
    "farmacias": dict,  # Objeto con farmacias asignadas: {"01": "Santa Elena", "02": "Sur America"}
    "permisos": list[str],  # Array de permisos: ["agregar_cuadre", "ver_cuadres_dia", "proveedores", ...]
    "createdAt": datetime,  # Fecha de creación (opcional pero recomendado)
    "updatedAt": datetime,  # Fecha de última actualización (opcional pero recomendado)
}
```

### Permisos Disponibles en el Sistema

```python
PERMISOS_DISPONIBLES = [
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
    "verificar_gastos",
    "comisiones",
    "cajeros",
    "metas",
    "modificar_cuadre",
    "proveedores",  # Nuevo permiso para el módulo de proveedores
    "usuarios",  # Permiso para gestionar usuarios
]
```

## 🔌 Endpoints Requeridos

### 1. GET `/usuarios`
**Descripción:** Obtener todos los usuarios registrados en el sistema.

**Autenticación:** Requerida (Bearer Token)

**Respuesta exitosa (200):**
```json
[
    {
        "_id": "507f1f77bcf86cd799439011",
        "correo": "admin@rapifarma.com",
        "farmacias": {
            "01": "Santa Elena",
            "02": "Sur America",
            "03": "Rapifarma"
        },
        "permisos": [
            "acceso_admin",
            "agregar_cuadre",
            "ver_cuadres_dia",
            "proveedores",
            "usuarios"
        ],
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
        "_id": "507f1f77bcf86cd799439012",
        "correo": "supervisor@rapifarma.com",
        "farmacias": {
            "01": "Santa Elena"
        },
        "permisos": [
            "agregar_cuadre",
            "ver_cuadres_dia"
        ],
        "createdAt": "2024-01-16T08:15:00Z",
        "updatedAt": "2024-01-16T08:15:00Z"
    }
]
```

**Nota importante:** NO devolver el campo `contraseña` en la respuesta por seguridad.

**Errores:**
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

---

### 2. GET `/usuarios/{id}`
**Descripción:** Obtener un usuario específico por su ID.

**Autenticación:** Requerida (Bearer Token)

**Parámetros de URL:**
- `id`: ID del usuario (ObjectId de MongoDB)

**Respuesta exitosa (200):**
```json
{
    "_id": "507f1f77bcf86cd799439011",
    "correo": "admin@rapifarma.com",
    "farmacias": {
        "01": "Santa Elena",
        "02": "Sur America"
    },
    "permisos": [
        "acceso_admin",
        "proveedores"
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Errores:**
- `404 Not Found`: Usuario no encontrado
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

---

### 3. POST `/usuarios`
**Descripción:** Crear un nuevo usuario.

**Autenticación:** Requerida (Bearer Token)

**Body (JSON):**
```json
{
    "correo": "nuevo@rapifarma.com",
    "contraseña": "password123",
    "farmacias": {
        "01": "Santa Elena",
        "02": "Sur America"
    },
    "permisos": [
        "agregar_cuadre",
        "ver_cuadres_dia",
        "proveedores"
    ]
}
```

**Validaciones:**
- `correo`: Requerido, debe ser un email válido, debe ser único
- `contraseña`: Requerido, string no vacío (debe hashearse antes de guardar)
- `farmacias`: Opcional, objeto con estructura `{"id": "nombre"}`
- `permisos`: Opcional, array de strings (validar que sean permisos válidos)

**Respuesta exitosa (201):**
```json
{
    "_id": "507f1f77bcf86cd799439013",
    "correo": "nuevo@rapifarma.com",
    "farmacias": {
        "01": "Santa Elena",
        "02": "Sur America"
    },
    "permisos": [
        "agregar_cuadre",
        "ver_cuadres_dia",
        "proveedores"
    ],
    "createdAt": "2024-01-20T14:30:00Z",
    "updatedAt": "2024-01-20T14:30:00Z"
}
```

**Errores:**
- `400 Bad Request`: Datos inválidos o faltantes
- `409 Conflict`: El correo ya existe
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

---

### 4. PATCH `/usuarios/{id}`
**Descripción:** Actualizar un usuario existente (especialmente para modificar permisos).

**Autenticación:** Requerida (Bearer Token)

**Parámetros de URL:**
- `id`: ID del usuario (ObjectId de MongoDB)

**Body (JSON):** Todos los campos son opcionales, solo enviar los que se desean actualizar
```json
{
    "correo": "correo_actualizado@rapifarma.com",
    "contraseña": "nueva_password",  # Si se envía, debe hashearse
    "farmacias": {
        "01": "Santa Elena",
        "03": "Rapifarma"
    },
    "permisos": [
        "agregar_cuadre",
        "ver_cuadres_dia",
        "proveedores",
        "usuarios"
    ]
}
```

**Validaciones:**
- Si se envía `correo`, debe ser único (no puede duplicar otro usuario)
- Si se envía `contraseña`, debe hashearse antes de guardar
- Si se envía `permisos`, validar que sean permisos válidos del sistema

**Respuesta exitosa (200):**
```json
{
    "_id": "507f1f77bcf86cd799439011",
    "correo": "correo_actualizado@rapifarma.com",
    "farmacias": {
        "01": "Santa Elena",
        "03": "Rapifarma"
    },
    "permisos": [
        "agregar_cuadre",
        "ver_cuadres_dia",
        "proveedores",
        "usuarios"
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T15:45:00Z"
}
```

**Errores:**
- `400 Bad Request`: Datos inválidos
- `404 Not Found`: Usuario no encontrado
- `409 Conflict`: El correo ya existe (si se intenta cambiar)
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

---

### 5. DELETE `/usuarios/{id}` (Opcional)
**Descripción:** Eliminar un usuario.

**Autenticación:** Requerida (Bearer Token)

**Parámetros de URL:**
- `id`: ID del usuario (ObjectId de MongoDB)

**Respuesta exitosa (200 o 204):**
```json
{
    "message": "Usuario eliminado exitosamente"
}
```

**Errores:**
- `404 Not Found`: Usuario no encontrado
- `401 Unauthorized`: Token no válido o ausente
- `500 Internal Server Error`: Error del servidor

---

## 🔒 Permisos y Seguridad

### Autenticación
Todos los endpoints requieren autenticación mediante Bearer Token.

### Permisos Recomendados
- **GET `/usuarios`**: Requiere permiso `"usuarios"` o `"acceso_admin"`
- **GET `/usuarios/{id}`**: Requiere permiso `"usuarios"` o `"acceso_admin"`
- **POST `/usuarios`**: Requiere permiso `"usuarios"` o `"acceso_admin"`
- **PATCH `/usuarios/{id}`**: Requiere permiso `"usuarios"` o `"acceso_admin"`
- **DELETE `/usuarios/{id}`**: Requiere permiso `"usuarios"` o `"acceso_admin"`

### Seguridad de Contraseñas
- **NUNCA** devolver la contraseña en las respuestas (ni hasheada ni en texto plano)
- **SIEMPRE** hashear las contraseñas antes de guardarlas (usar bcrypt, argon2, o similar)
- Si se actualiza la contraseña, hashearla antes de guardar

---

## 💾 Base de Datos

### MongoDB - Esquema de Colección

**Nombre de la colección:** `usuarios` (o el nombre que uses en tu sistema)

**Índices recomendados:**
```javascript
// Índice único para correo
db.usuarios.createIndex({ "correo": 1 }, { unique: true })

// Índice para búsquedas por permisos
db.usuarios.createIndex({ "permisos": 1 })
```

### Ejemplo de Documento en MongoDB

```json
{
    "_id": ObjectId("507f1f77bcf86cd799439011"),
    "correo": "admin@rapifarma.com",
    "contraseña": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqB5x5K5Xe",  // Contraseña hasheada
    "farmacias": {
        "01": "Santa Elena",
        "02": "Sur America",
        "03": "Rapifarma"
    },
    "permisos": [
        "acceso_admin",
        "agregar_cuadre",
        "ver_cuadres_dia",
        "proveedores",
        "usuarios"
    ],
    "createdAt": ISODate("2024-01-15T10:30:00Z"),
    "updatedAt": ISODate("2024-01-20T15:45:00Z")
}
```

---

## 📝 Ejemplo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from auth import get_current_user  # Tu función de autenticación

router = APIRouter(prefix="/usuarios", tags=["usuarios"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Modelos Pydantic
class UsuarioCreate(BaseModel):
    correo: EmailStr
    contraseña: str = Field(..., min_length=6)
    farmacias: Optional[Dict[str, str]] = {}
    permisos: Optional[List[str]] = []

class UsuarioUpdate(BaseModel):
    correo: Optional[EmailStr] = None
    contraseña: Optional[str] = Field(None, min_length=6)
    farmacias: Optional[Dict[str, str]] = None
    permisos: Optional[List[str]] = None

class UsuarioResponse(BaseModel):
    _id: str
    correo: str
    farmacias: Dict[str, str]
    permisos: List[str]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Permisos válidos del sistema
PERMISOS_VALIDOS = [
    "ver_inicio", "ver_about", "agregar_cuadre", "ver_resumen_mensual",
    "verificar_cuadres", "ver_cuadres_dia", "ver_resumen_dia",
    "acceso_admin", "eliminar_cuadres", "ver_ventas_totales",
    "verificar_gastos", "comisiones", "cajeros", "metas",
    "modificar_cuadre", "proveedores", "usuarios"
]

def validar_permisos(permisos: List[str]):
    """Valida que los permisos sean válidos"""
    for permiso in permisos:
        if permiso not in PERMISOS_VALIDOS:
            raise ValueError(f"Permiso inválido: {permiso}")
    return True

def hash_password(password: str) -> str:
    """Hashea una contraseña"""
    return pwd_context.hash(password)

def usuario_helper(usuario) -> dict:
    """Convierte un documento de MongoDB a un diccionario sin contraseña"""
    return {
        "_id": str(usuario["_id"]),
        "correo": usuario["correo"],
        "farmacias": usuario.get("farmacias", {}),
        "permisos": usuario.get("permisos", []),
        "createdAt": usuario.get("createdAt", datetime.utcnow()),
        "updatedAt": usuario.get("updatedAt", datetime.utcnow()),
    }

@router.get("", response_model=List[UsuarioResponse])
async def obtener_usuarios(current_user: dict = Depends(get_current_user)):
    """Obtener todos los usuarios"""
    # Verificar permisos
    if "usuarios" not in current_user.get("permisos", []) and "acceso_admin" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permisos para ver usuarios")
    
    db = get_database()
    usuarios = []
    async for usuario in db.usuarios.find({}, {"contraseña": 0}):  # Excluir contraseña
        usuarios.append(usuario_helper(usuario))
    return usuarios

@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def obtener_usuario(
    usuario_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un usuario específico"""
    if "usuarios" not in current_user.get("permisos", []) and "acceso_admin" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permisos para ver usuarios")
    
    db = get_database()
    usuario = await db.usuarios.find_one(
        {"_id": ObjectId(usuario_id)},
        {"contraseña": 0}  # Excluir contraseña
    )
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return usuario_helper(usuario)

@router.post("", response_model=UsuarioResponse, status_code=201)
async def crear_usuario(
    usuario: UsuarioCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear un nuevo usuario"""
    if "usuarios" not in current_user.get("permisos", []) and "acceso_admin" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permisos para crear usuarios")
    
    db = get_database()
    
    # Verificar que el correo no exista
    existing = await db.usuarios.find_one({"correo": usuario.correo})
    if existing:
        raise HTTPException(status_code=409, detail="El correo ya está registrado")
    
    # Validar permisos
    if usuario.permisos:
        validar_permisos(usuario.permisos)
    
    # Hashear contraseña
    contraseña_hash = hash_password(usuario.contraseña)
    
    usuario_dict = {
        "correo": usuario.correo,
        "contraseña": contraseña_hash,
        "farmacias": usuario.farmacias or {},
        "permisos": usuario.permisos or [],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.usuarios.insert_one(usuario_dict)
    nuevo_usuario = await db.usuarios.find_one(
        {"_id": result.inserted_id},
        {"contraseña": 0}
    )
    
    return usuario_helper(nuevo_usuario)

@router.patch("/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(
    usuario_id: str,
    usuario: UsuarioUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar un usuario existente"""
    if "usuarios" not in current_user.get("permisos", []) and "acceso_admin" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permisos para actualizar usuarios")
    
    db = get_database()
    
    # Verificar que el usuario existe
    existing = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Si se intenta cambiar el correo, verificar que no exista
    if usuario.correo and usuario.correo != existing["correo"]:
        correo_existing = await db.usuarios.find_one({"correo": usuario.correo})
        if correo_existing:
            raise HTTPException(status_code=409, detail="El correo ya está registrado")
    
    # Validar permisos si se envían
    if usuario.permisos:
        validar_permisos(usuario.permisos)
    
    # Construir objeto de actualización
    update_data = {"updatedAt": datetime.utcnow()}
    
    if usuario.correo:
        update_data["correo"] = usuario.correo
    if usuario.contraseña:
        update_data["contraseña"] = hash_password(usuario.contraseña)
    if usuario.farmacias is not None:
        update_data["farmacias"] = usuario.farmacias
    if usuario.permisos is not None:
        update_data["permisos"] = usuario.permisos
    
    await db.usuarios.update_one(
        {"_id": ObjectId(usuario_id)},
        {"$set": update_data}
    )
    
    usuario_actualizado = await db.usuarios.find_one(
        {"_id": ObjectId(usuario_id)},
        {"contraseña": 0}
    )
    
    return usuario_helper(usuario_actualizado)

@router.delete("/{usuario_id}")
async def eliminar_usuario(
    usuario_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar un usuario"""
    if "usuarios" not in current_user.get("permisos", []) and "acceso_admin" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar usuarios")
    
    db = get_database()
    
    result = await db.usuarios.delete_one({"_id": ObjectId(usuario_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {"message": "Usuario eliminado exitosamente"}
```

---

## 📝 Ejemplo de Implementación (Node.js/Express)

```javascript
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// Permisos válidos
const PERMISOS_VALIDOS = [
    "ver_inicio", "ver_about", "agregar_cuadre", "ver_resumen_mensual",
    "verificar_cuadres", "ver_cuadres_dia", "ver_resumen_dia",
    "acceso_admin", "eliminar_cuadres", "ver_ventas_totales",
    "verificar_gastos", "comisiones", "cajeros", "metas",
    "modificar_cuadre", "proveedores", "usuarios"
];

function validarPermisos(permisos) {
    for (const permiso of permisos) {
        if (!PERMISOS_VALIDOS.includes(permiso)) {
            throw new Error(`Permiso inválido: ${permiso}`);
        }
    }
}

// GET /usuarios
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Verificar permisos
        if (!req.user.permisos.includes('usuarios') && !req.user.permisos.includes('acceso_admin')) {
            return res.status(403).json({ detail: 'No tiene permisos para ver usuarios' });
        }

        const db = req.app.locals.db;
        const usuarios = await db.collection('usuarios')
            .find({}, { projection: { contraseña: 0 } })  // Excluir contraseña
            .toArray();
        
        const usuariosFormateados = usuarios.map(u => ({
            ...u,
            _id: u._id.toString()
        }));
        
        res.json(usuariosFormateados);
    } catch (error) {
        res.status(500).json({ detail: 'Error al obtener usuarios' });
    }
});

// GET /usuarios/:id
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user.permisos.includes('usuarios') && !req.user.permisos.includes('acceso_admin')) {
            return res.status(403).json({ detail: 'No tiene permisos para ver usuarios' });
        }

        const db = req.app.locals.db;
        const usuario = await db.collection('usuarios').findOne(
            { _id: new ObjectId(req.params.id) },
            { projection: { contraseña: 0 } }
        );

        if (!usuario) {
            return res.status(404).json({ detail: 'Usuario no encontrado' });
        }

        res.json({
            ...usuario,
            _id: usuario._id.toString()
        });
    } catch (error) {
        res.status(500).json({ detail: 'Error al obtener usuario' });
    }
});

// POST /usuarios
router.post('/', authenticateToken, async (req, res) => {
    try {
        if (!req.user.permisos.includes('usuarios') && !req.user.permisos.includes('acceso_admin')) {
            return res.status(403).json({ detail: 'No tiene permisos para crear usuarios' });
        }

        const db = req.app.locals.db;
        const { correo, contraseña, farmacias, permisos } = req.body;

        // Validaciones
        if (!correo || !contraseña) {
            return res.status(400).json({ detail: 'Correo y contraseña son requeridos' });
        }

        // Verificar que el correo no exista
        const existing = await db.collection('usuarios').findOne({ correo });
        if (existing) {
            return res.status(409).json({ detail: 'El correo ya está registrado' });
        }

        // Validar permisos
        if (permisos) {
            validarPermisos(permisos);
        }

        // Hashear contraseña
        const contraseñaHash = await bcrypt.hash(contraseña, 10);

        const nuevoUsuario = {
            correo,
            contraseña: contraseñaHash,
            farmacias: farmacias || {},
            permisos: permisos || [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('usuarios').insertOne(nuevoUsuario);
        const usuarioCreado = await db.collection('usuarios').findOne(
            { _id: result.insertedId },
            { projection: { contraseña: 0 } }
        );

        res.status(201).json({
            ...usuarioCreado,
            _id: usuarioCreado._id.toString()
        });
    } catch (error) {
        if (error.message.includes('Permiso inválido')) {
            return res.status(400).json({ detail: error.message });
        }
        res.status(500).json({ detail: 'Error al crear usuario' });
    }
});

// PATCH /usuarios/:id
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user.permisos.includes('usuarios') && !req.user.permisos.includes('acceso_admin')) {
            return res.status(403).json({ detail: 'No tiene permisos para actualizar usuarios' });
        }

        const db = req.app.locals.db;
        const { id } = req.params;

        // Verificar que el usuario existe
        const existing = await db.collection('usuarios').findOne({ _id: new ObjectId(id) });
        if (!existing) {
            return res.status(404).json({ detail: 'Usuario no encontrado' });
        }

        // Si se intenta cambiar el correo, verificar que no exista
        if (req.body.correo && req.body.correo !== existing.correo) {
            const correoExisting = await db.collection('usuarios').findOne({ correo: req.body.correo });
            if (correoExisting) {
                return res.status(409).json({ detail: 'El correo ya está registrado' });
            }
        }

        // Validar permisos si se envían
        if (req.body.permisos) {
            validarPermisos(req.body.permisos);
        }

        const updateData = {
            ...req.body,
            updatedAt: new Date()
        };

        // Si se envía contraseña, hashearla
        if (updateData.contraseña) {
            updateData.contraseña = await bcrypt.hash(updateData.contraseña, 10);
        }

        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        const usuarioActualizado = await db.collection('usuarios').findOne(
            { _id: new ObjectId(id) },
            { projection: { contraseña: 0 } }
        );

        res.json({
            ...usuarioActualizado,
            _id: usuarioActualizado._id.toString()
        });
    } catch (error) {
        if (error.message.includes('Permiso inválido')) {
            return res.status(400).json({ detail: error.message });
        }
        res.status(500).json({ detail: 'Error al actualizar usuario' });
    }
});

// DELETE /usuarios/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user.permisos.includes('usuarios') && !req.user.permisos.includes('acceso_admin')) {
            return res.status(403).json({ detail: 'No tiene permisos para eliminar usuarios' });
        }

        const db = req.app.locals.db;
        const result = await db.collection('usuarios').deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ detail: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ detail: 'Error al eliminar usuario' });
    }
});

module.exports = router;
```

---

## ✅ Checklist de Implementación

- [ ] Crear modelo/esquema de Usuario en la base de datos
- [ ] Crear índice único para el campo `correo`
- [ ] Implementar endpoint GET `/usuarios` (sin devolver contraseñas)
- [ ] Implementar endpoint GET `/usuarios/{id}`
- [ ] Implementar endpoint POST `/usuarios` con validaciones
- [ ] Implementar endpoint PATCH `/usuarios/{id}` para modificar permisos
- [ ] Agregar autenticación a todos los endpoints
- [ ] Agregar validación de permisos (solo usuarios con permiso "usuarios" o "acceso_admin")
- [ ] Implementar hashing de contraseñas (bcrypt, argon2, etc.)
- [ ] Validar que los permisos sean válidos del sistema
- [ ] Agregar manejo de errores apropiado
- [ ] Probar todos los endpoints con Postman o similar
- [ ] Verificar que el correo sea único
- [ ] Asegurar que las contraseñas nunca se devuelvan en las respuestas

---

## 🔍 Notas Adicionales

1. **Seguridad de Contraseñas**: 
   - NUNCA devolver contraseñas en las respuestas
   - SIEMPRE hashear contraseñas antes de guardar
   - Usar bcrypt, argon2, o scrypt para hashing

2. **Validación de Permisos**: 
   - Validar que los permisos enviados sean válidos del sistema
   - Rechazar permisos desconocidos

3. **Farmacias**: 
   - Las farmacias se almacenan como objeto: `{"id": "nombre"}`
   - Validar que los IDs de farmacias sean válidos si tienes una lista de farmacias

4. **Actualización Parcial**: 
   - El endpoint PATCH debe permitir actualizar solo los campos enviados
   - Si no se envía un campo, mantener el valor actual

5. **Permiso "proveedores"**: 
   - Asegúrate de incluir el permiso "proveedores" en la lista de permisos válidos
   - Este permiso controla el acceso al módulo de proveedores

---

## 📞 Soporte

Si tienes dudas sobre la implementación, revisa el código del frontend en:
- `src/pages/UsuariosAdminPage.tsx` - Para ver cómo se consumen los endpoints
- `src/pages/auth/RegistroUsuario.tsx` - Para ver la estructura de datos esperada

