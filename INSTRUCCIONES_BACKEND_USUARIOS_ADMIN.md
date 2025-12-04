# Instrucciones Backend - Administración de Usuarios

## Resumen de Cambios en Frontend

El frontend ha sido actualizado para mejorar la administración de usuarios:

1. **Campo Nombre**: Los usuarios ahora tienen un campo `nombre` que debe mostrarse
2. **Permiso "ver_inventarios"**: Nuevo permiso agregado a la lista
3. **Tipo de Usuario**: Se puede seleccionar si el usuario es "Administrativo" o pertenece a una "Farmacia"
4. **Selección de Farmacia**: Si el usuario es de farmacia, se selecciona de una lista
5. **Visualización mejorada**: Los usuarios se muestran con nombre, tipo y permisos correctamente

## Endpoints Requeridos

### 1. GET `/adminusuarios` o GET `/usuarios`

**Descripción**: Debe devolver todos los usuarios con todos sus campos.

**Response esperado** (200 OK):
```json
[
  {
    "_id": "string",
    "correo": "string",
    "nombre": "string (opcional pero recomendado)",
    "farmacias": {
      "farmacia_id_1": "Nombre Farmacia 1",
      "farmacia_id_2": "Nombre Farmacia 2"
    },
    "permisos": ["permiso1", "permiso2", ...],
    "esAdministrativo": boolean (opcional, si es true, farmacias puede estar vacío),
    "createdAt": "string (ISO date, opcional)",
    "updatedAt": "string (ISO date, opcional)"
  }
]
```

**Notas importantes**:
- El campo `nombre` debe estar presente (puede ser null o string vacío si no se ha asignado)
- El campo `contraseña` NO debe devolverse en la respuesta por seguridad
- El campo `esAdministrativo` indica si el usuario es administrativo (true) o de farmacia (false)
- Si `esAdministrativo` es true, el campo `farmacias` puede estar vacío o contener todas las farmacias
- Si `esAdministrativo` es false, el campo `farmacias` debe contener al menos una farmacia

### 2. POST `/usuarios`

**Descripción**: Crear un nuevo usuario.

**Request Body**:
```json
{
  "correo": "string (requerido, email válido)",
  "nombre": "string (opcional pero recomendado)",
  "contraseña": "string (requerido, debe estar hasheado en el backend)",
  "farmacias": {
    "farmacia_id": "Nombre Farmacia"
  },
  "permisos": ["permiso1", "permiso2", ...],
  "esAdministrativo": boolean (opcional, default: false)
}
```

**Ejemplo de Request**:
```json
{
  "correo": "usuario@farmacia.com",
  "nombre": "Juan Pérez",
  "contraseña": "password123",
  "farmacias": {
    "01": "Santa Elena"
  },
  "permisos": ["agregar_cuadre", "ver_cuadres_dia"],
  "esAdministrativo": false
}
```

**Ejemplo de Request (Administrativo)**:
```json
{
  "correo": "admin@rapifarma.com",
  "nombre": "Administrador",
  "contraseña": "admin123",
  "farmacias": {},
  "permisos": ["acceso_admin", "ver_inventarios", "usuarios"],
  "esAdministrativo": true
}
```

**Response esperado** (200 OK):
```json
{
  "_id": "string",
  "correo": "string",
  "nombre": "string",
  "farmacias": {},
  "permisos": [],
  "esAdministrativo": false,
  "message": "Usuario creado correctamente"
}
```

**Validaciones Requeridas**:
1. **correo**: Debe ser un email válido y único en la base de datos
2. **contraseña**: Debe tener al menos 6 caracteres (o según tu política de seguridad)
3. **nombre**: Opcional pero recomendado
4. **farmacias**: 
   - Si `esAdministrativo` es false, debe contener al menos una farmacia válida
   - Si `esAdministrativo` es true, puede estar vacío
5. **permisos**: Array de strings, cada permiso debe ser válido según tu sistema
6. **esAdministrativo**: Boolean, si no se envía, default false

### 3. PATCH `/usuarios/{id}`

**Descripción**: Actualizar un usuario existente.

**Request Body** (todos los campos son opcionales):
```json
{
  "correo": "string (opcional)",
  "nombre": "string (opcional)",
  "contraseña": "string (opcional, solo si se quiere cambiar)",
  "farmacias": {
    "farmacia_id": "Nombre Farmacia"
  },
  "permisos": ["permiso1", "permiso2", ...],
  "esAdministrativo": boolean (opcional)
}
```

**Notas importantes**:
- Si `contraseña` está vacío o no se envía, mantener la contraseña actual
- Si `contraseña` tiene un valor, actualizar la contraseña (hashearla)
- Si `esAdministrativo` cambia de false a true, limpiar el campo `farmacias` o mantener todas
- Si `esAdministrativo` cambia de true a false, requerir al menos una farmacia

**Response esperado** (200 OK):
```json
{
  "_id": "string",
  "correo": "string",
  "nombre": "string",
  "farmacias": {},
  "permisos": [],
  "esAdministrativo": false,
  "message": "Usuario actualizado correctamente"
}
```

## Nuevo Permiso: "ver_inventarios"

**Descripción**: Permiso para acceder al módulo de visualización de inventarios.

**Uso en Frontend**:
- Se muestra en la lista de permisos disponibles
- Cuando se asigna, el usuario puede ver el módulo "Ver Inventarios" en el navbar
- El endpoint `/verinventarios` requiere este permiso

**Validación en Backend**:
- Debe ser reconocido como un permiso válido
- Debe almacenarse en el array de `permisos` del usuario
- Debe validarse en los endpoints protegidos

## Estructura de Base de Datos Sugerida

```javascript
// MongoDB Schema
{
  _id: ObjectId,
  correo: String (requerido, único, indexado),
  nombre: String (opcional),
  contraseña: String (requerido, hasheado con bcrypt o similar),
  farmacias: Object (opcional, formato: { "farmacia_id": "nombre" }),
  permisos: Array<String> (requerido, default: []),
  esAdministrativo: Boolean (opcional, default: false),
  createdAt: Date (requerido, default: now),
  updatedAt: Date (requerido, default: now)
}
```

## Lógica de Validación

### Al Crear Usuario:

1. **Si esAdministrativo = true**:
   - El campo `farmacias` puede estar vacío `{}`
   - El usuario tendrá acceso a todas las farmacias según sus permisos
   - No requiere validación de farmacia específica

2. **Si esAdministrativo = false** (o no se envía):
   - El campo `farmacias` debe contener al menos una farmacia válida
   - Validar que la farmacia existe en la base de datos
   - El usuario solo tendrá acceso a las farmacias especificadas

### Al Actualizar Usuario:

1. **Si cambia esAdministrativo de false a true**:
   - Limpiar o mantener todas las farmacias según tu lógica de negocio
   - El usuario ahora tiene acceso administrativo

2. **Si cambia esAdministrativo de true a false**:
   - Requerir que se asigne al menos una farmacia
   - Validar que la farmacia existe

## Ejemplo de Implementación (FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from datetime import datetime
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UsuarioCreate(BaseModel):
    correo: EmailStr
    nombre: Optional[str] = None
    contraseña: str
    farmacias: Dict[str, str] = {}
    permisos: List[str] = []
    esAdministrativo: bool = False

class UsuarioUpdate(BaseModel):
    correo: Optional[EmailStr] = None
    nombre: Optional[str] = None
    contraseña: Optional[str] = None
    farmacias: Optional[Dict[str, str]] = None
    permisos: Optional[List[str]] = None
    esAdministrativo: Optional[bool] = None

@router.get("/adminusuarios")
async def obtener_usuarios(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene todos los usuarios.
    """
    usuarios = await db.usuarios.find({}).to_list(None)
    
    result = []
    for usuario in usuarios:
        result.append({
            "_id": str(usuario["_id"]),
            "correo": usuario.get("correo", ""),
            "nombre": usuario.get("nombre", ""),
            "farmacias": usuario.get("farmacias", {}),
            "permisos": usuario.get("permisos", []),
            "esAdministrativo": usuario.get("esAdministrativo", False),
            "createdAt": usuario.get("createdAt", datetime.utcnow()).isoformat() if usuario.get("createdAt") else None,
            "updatedAt": usuario.get("updatedAt", datetime.utcnow()).isoformat() if usuario.get("updatedAt") else None
        })
    
    return result

@router.post("/usuarios")
async def crear_usuario(
    usuario: UsuarioCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un nuevo usuario.
    """
    # Validar que el correo no exista
    usuario_existente = await db.usuarios.find_one({"correo": usuario.correo})
    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="El correo ya está registrado"
        )
    
    # Validar farmacias si no es administrativo
    if not usuario.esAdministrativo:
        if not usuario.farmacias:
            raise HTTPException(
                status_code=400,
                detail="Los usuarios de farmacia deben tener al menos una farmacia asignada"
            )
        # Validar que las farmacias existen
        for farmacia_id in usuario.farmacias.keys():
            farmacia = await db.farmacias.find_one({"_id": farmacia_id})
            if not farmacia:
                raise HTTPException(
                    status_code=400,
                    detail=f"La farmacia {farmacia_id} no existe"
                )
    
    # Validar permisos
    permisos_validos = [
        "ver_inicio", "ver_about", "agregar_cuadre", "ver_resumen_mensual",
        "verificar_cuadres", "ver_cuadres_dia", "ver_resumen_dia", "acceso_admin",
        "eliminar_cuadres", "ver_ventas_totales", "verificar_gastos", "comisiones",
        "cajeros", "metas", "modificar_cuadre", "proveedores", "usuarios",
        "ver_inventarios"
    ]
    
    for permiso in usuario.permisos:
        if permiso not in permisos_validos:
            raise HTTPException(
                status_code=400,
                detail=f"El permiso '{permiso}' no es válido"
            )
    
    # Hashear contraseña
    contraseña_hash = pwd_context.hash(usuario.contraseña)
    
    # Crear usuario
    nuevo_usuario = {
        "correo": usuario.correo,
        "nombre": usuario.nombre or "",
        "contraseña": contraseña_hash,
        "farmacias": usuario.farmacias,
        "permisos": usuario.permisos,
        "esAdministrativo": usuario.esAdministrativo,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.usuarios.insert_one(nuevo_usuario)
    nuevo_usuario["_id"] = str(result.inserted_id)
    
    # No devolver la contraseña
    del nuevo_usuario["contraseña"]
    
    return nuevo_usuario

@router.patch("/usuarios/{id}")
async def actualizar_usuario(
    id: str,
    usuario_update: UsuarioUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza un usuario existente.
    """
    from bson import ObjectId
    
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    usuario = await db.usuarios.find_one({"_id": ObjectId(id)})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Preparar actualización
    update_data = {}
    
    if usuario_update.correo is not None:
        # Validar que el correo no esté en uso por otro usuario
        usuario_existente = await db.usuarios.find_one({
            "correo": usuario_update.correo,
            "_id": {"$ne": ObjectId(id)}
        })
        if usuario_existente:
            raise HTTPException(
                status_code=400,
                detail="El correo ya está en uso por otro usuario"
            )
        update_data["correo"] = usuario_update.correo
    
    if usuario_update.nombre is not None:
        update_data["nombre"] = usuario_update.nombre
    
    if usuario_update.contraseña is not None and usuario_update.contraseña != "":
        update_data["contraseña"] = pwd_context.hash(usuario_update.contraseña)
    
    if usuario_update.esAdministrativo is not None:
        update_data["esAdministrativo"] = usuario_update.esAdministrativo
        
        # Si cambia a administrativo, limpiar farmacias
        if usuario_update.esAdministrativo:
            update_data["farmacias"] = {}
        # Si cambia a no administrativo, validar farmacias
        elif usuario_update.farmacias is None or not usuario_update.farmacias:
            raise HTTPException(
                status_code=400,
                detail="Los usuarios de farmacia deben tener al menos una farmacia asignada"
            )
    
    if usuario_update.farmacias is not None:
        if not usuario_update.esAdministrativo if usuario_update.esAdministrativo is not None else not usuario.get("esAdministrativo", False):
            if not usuario_update.farmacias:
                raise HTTPException(
                    status_code=400,
                    detail="Los usuarios de farmacia deben tener al menos una farmacia asignada"
                )
            # Validar que las farmacias existen
            for farmacia_id in usuario_update.farmacias.keys():
                farmacia = await db.farmacias.find_one({"_id": farmacia_id})
                if not farmacia:
                    raise HTTPException(
                        status_code=400,
                        detail=f"La farmacia {farmacia_id} no existe"
                    )
        update_data["farmacias"] = usuario_update.farmacias
    
    if usuario_update.permisos is not None:
        # Validar permisos
        permisos_validos = [
            "ver_inicio", "ver_about", "agregar_cuadre", "ver_resumen_mensual",
            "verificar_cuadres", "ver_cuadres_dia", "ver_resumen_dia", "acceso_admin",
            "eliminar_cuadres", "ver_ventas_totales", "verificar_gastos", "comisiones",
            "cajeros", "metas", "modificar_cuadre", "proveedores", "usuarios",
            "ver_inventarios"
        ]
        
        for permiso in usuario_update.permisos:
            if permiso not in permisos_validos:
                raise HTTPException(
                    status_code=400,
                    detail=f"El permiso '{permiso}' no es válido"
                )
        update_data["permisos"] = usuario_update.permisos
    
    update_data["updatedAt"] = datetime.utcnow()
    
    # Actualizar usuario
    await db.usuarios.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    # Obtener usuario actualizado
    usuario_actualizado = await db.usuarios.find_one({"_id": ObjectId(id)})
    usuario_actualizado["_id"] = str(usuario_actualizado["_id"])
    
    # No devolver la contraseña
    del usuario_actualizado["contraseña"]
    
    return usuario_actualizado
```

## Ejemplo de Implementación (Node.js/Express)

```javascript
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

// GET /adminusuarios
router.get('/adminusuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.find({});
    
    const result = usuarios.map(usuario => ({
      _id: usuario._id.toString(),
      correo: usuario.correo || '',
      nombre: usuario.nombre || '',
      farmacias: usuario.farmacias || {},
      permisos: usuario.permisos || [],
      esAdministrativo: usuario.esAdministrativo || false,
      createdAt: usuario.createdAt ? usuario.createdAt.toISOString() : null,
      updatedAt: usuario.updatedAt ? usuario.updatedAt.toISOString() : null
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ detail: 'Error al obtener usuarios: ' + error.message });
  }
});

// POST /usuarios
router.post('/usuarios', async (req, res) => {
  try {
    const { correo, nombre, contraseña, farmacias, permisos, esAdministrativo } = req.body;
    
    // Validar correo único
    const usuarioExistente = await Usuario.findOne({ correo });
    if (usuarioExistente) {
      return res.status(400).json({ detail: 'El correo ya está registrado' });
    }
    
    // Validar farmacias si no es administrativo
    if (!esAdministrativo) {
      if (!farmacias || Object.keys(farmacias).length === 0) {
        return res.status(400).json({ 
          detail: 'Los usuarios de farmacia deben tener al menos una farmacia asignada' 
        });
      }
      
      // Validar que las farmacias existen
      for (const farmaciaId of Object.keys(farmacias)) {
        const farmacia = await Farmacia.findById(farmaciaId);
        if (!farmacia) {
          return res.status(400).json({ 
            detail: `La farmacia ${farmaciaId} no existe` 
          });
        }
      }
    }
    
    // Validar permisos
    const permisosValidos = [
      'ver_inicio', 'ver_about', 'agregar_cuadre', 'ver_resumen_mensual',
      'verificar_cuadres', 'ver_cuadres_dia', 'ver_resumen_dia', 'acceso_admin',
      'eliminar_cuadres', 'ver_ventas_totales', 'verificar_gastos', 'comisiones',
      'cajeros', 'metas', 'modificar_cuadre', 'proveedores', 'usuarios',
      'ver_inventarios'
    ];
    
    for (const permiso of permisos) {
      if (!permisosValidos.includes(permiso)) {
        return res.status(400).json({ 
          detail: `El permiso '${permiso}' no es válido` 
        });
      }
    }
    
    // Hashear contraseña
    const contraseñaHash = await bcrypt.hash(contraseña, 10);
    
    // Crear usuario
    const nuevoUsuario = new Usuario({
      correo,
      nombre: nombre || '',
      contraseña: contraseñaHash,
      farmacias: farmacias || {},
      permisos: permisos || [],
      esAdministrativo: esAdministrativo || false
    });
    
    await nuevoUsuario.save();
    
    // No devolver la contraseña
    const usuarioResponse = nuevoUsuario.toObject();
    delete usuarioResponse.contraseña;
    
    res.json(usuarioResponse);
  } catch (error) {
    res.status(500).json({ detail: 'Error al crear usuario: ' + error.message });
  }
});

// PATCH /usuarios/:id
router.patch('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { correo, nombre, contraseña, farmacias, permisos, esAdministrativo } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ detail: 'ID inválido' });
    }
    
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ detail: 'Usuario no encontrado' });
    }
    
    const updateData = {};
    
    if (correo !== undefined) {
      // Validar correo único
      const usuarioExistente = await Usuario.findOne({ 
        correo, 
        _id: { $ne: id } 
      });
      if (usuarioExistente) {
        return res.status(400).json({ 
          detail: 'El correo ya está en uso por otro usuario' 
        });
      }
      updateData.correo = correo;
    }
    
    if (nombre !== undefined) {
      updateData.nombre = nombre;
    }
    
    if (contraseña !== undefined && contraseña !== '') {
      updateData.contraseña = await bcrypt.hash(contraseña, 10);
    }
    
    if (esAdministrativo !== undefined) {
      updateData.esAdministrativo = esAdministrativo;
      
      if (esAdministrativo) {
        updateData.farmacias = {};
      } else if (!farmacias || Object.keys(farmacias).length === 0) {
        return res.status(400).json({ 
          detail: 'Los usuarios de farmacia deben tener al menos una farmacia asignada' 
        });
      }
    }
    
    if (farmacias !== undefined) {
      const esAdmin = esAdministrativo !== undefined ? esAdministrativo : usuario.esAdministrativo;
      if (!esAdmin) {
        if (!farmacias || Object.keys(farmacias).length === 0) {
          return res.status(400).json({ 
            detail: 'Los usuarios de farmacia deben tener al menos una farmacia asignada' 
          });
        }
        
        // Validar que las farmacias existen
        for (const farmaciaId of Object.keys(farmacias)) {
          const farmacia = await Farmacia.findById(farmaciaId);
          if (!farmacia) {
            return res.status(400).json({ 
              detail: `La farmacia ${farmaciaId} no existe` 
            });
          }
        }
      }
      updateData.farmacias = farmacias;
    }
    
    if (permisos !== undefined) {
      // Validar permisos
      const permisosValidos = [
        'ver_inicio', 'ver_about', 'agregar_cuadre', 'ver_resumen_mensual',
        'verificar_cuadres', 'ver_cuadres_dia', 'ver_resumen_dia', 'acceso_admin',
        'eliminar_cuadres', 'ver_ventas_totales', 'verificar_gastos', 'comisiones',
        'cajeros', 'metas', 'modificar_cuadre', 'proveedores', 'usuarios',
        'ver_inventarios'
      ];
      
      for (const permiso of permisos) {
        if (!permisosValidos.includes(permiso)) {
          return res.status(400).json({ 
            detail: `El permiso '${permiso}' no es válido` 
          });
        }
      }
      updateData.permisos = permisos;
    }
    
    updateData.updatedAt = new Date();
    
    await Usuario.findByIdAndUpdate(id, { $set: updateData });
    
    const usuarioActualizado = await Usuario.findById(id);
    const usuarioResponse = usuarioActualizado.toObject();
    delete usuarioResponse.contraseña;
    
    res.json(usuarioResponse);
  } catch (error) {
    res.status(500).json({ detail: 'Error al actualizar usuario: ' + error.message });
  }
});

module.exports = router;
```

## Checklist para el Backend

- [ ] Verificar que GET `/adminusuarios` devuelve el campo `nombre`
- [ ] Verificar que GET `/adminusuarios` NO devuelve el campo `contraseña`
- [ ] Agregar el permiso `"ver_inventarios"` a la lista de permisos válidos
- [ ] Implementar el campo `esAdministrativo` en el modelo de usuario
- [ ] Validar que usuarios no administrativos tengan al menos una farmacia
- [ ] Validar que las farmacias asignadas existan en la base de datos
- [ ] Hashear las contraseñas antes de guardarlas (nunca guardar en texto plano)
- [ ] Validar que el correo sea único al crear y actualizar
- [ ] Validar que los permisos sean válidos antes de guardar
- [ ] Actualizar el endpoint PATCH para manejar cambios de `esAdministrativo`
- [ ] Probar creación de usuario administrativo
- [ ] Probar creación de usuario de farmacia
- [ ] Probar actualización de permisos
- [ ] Probar cambio de tipo de usuario (administrativo ↔ farmacia)

## Notas Importantes

1. **Seguridad de Contraseñas**:
   - NUNCA devolver la contraseña en las respuestas
   - Siempre hashear las contraseñas antes de guardar (usar bcrypt o similar)
   - Validar longitud mínima de contraseña (recomendado: 6-8 caracteres)

2. **Validación de Farmacias**:
   - Verificar que las farmacias existen antes de asignarlas
   - Si un usuario no es administrativo, debe tener al menos una farmacia

3. **Permisos**:
   - El permiso `"ver_inventarios"` debe estar en la lista de permisos válidos
   - Validar que todos los permisos enviados sean válidos

4. **Campo Nombre**:
   - Es opcional pero recomendado
   - Puede ser string vacío si no se proporciona
   - Debe mostrarse en las respuestas GET

5. **Tipo de Usuario**:
   - `esAdministrativo: true` → Usuario administrativo, puede tener acceso a todas las farmacias
   - `esAdministrativo: false` → Usuario de farmacia, debe tener al menos una farmacia asignada

