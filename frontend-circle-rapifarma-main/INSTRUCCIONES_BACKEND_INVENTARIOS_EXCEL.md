# Instrucciones Backend - Agregar Inventario desde Excel

## Endpoint: POST `/inventarios/excel`

Este endpoint permite agregar múltiples items de inventario desde un archivo Excel.

### Request Body

```json
{
  "farmacia": "string (ID de la farmacia)",
  "items": [
    {
      "codigo": "string",
      "descripcion": "string",
      "laboratorio": "string",
      "costo": number,
      "utilidad": number,
      "precio": number,
      "existencia": number
    }
  ],
  "usuarioCorreo": "string (correo del usuario que realiza la acción)"
}
```

### Ejemplo de Request

```json
{
  "farmacia": "farmacia_001",
  "items": [
    {
      "codigo": "PROD001",
      "descripcion": "Paracetamol 500mg",
      "laboratorio": "Laboratorio XYZ",
      "costo": 2.50,
      "utilidad": 30.0,
      "precio": 3.25,
      "existencia": 100
    },
    {
      "codigo": "PROD002",
      "descripcion": "Ibuprofeno 400mg",
      "laboratorio": "Laboratorio ABC",
      "costo": 3.00,
      "utilidad": 35.0,
      "precio": 4.05,
      "existencia": 75
    }
  ],
  "usuarioCorreo": "usuario@ejemplo.com"
}
```

### Validaciones Requeridas

1. **farmacia**: Debe ser un ID válido de farmacia existente en la base de datos
2. **items**: Debe ser un array con al menos un item
3. **usuarioCorreo**: Debe ser un correo válido de usuario existente
4. **Cada item debe tener**:
   - `codigo`: String no vacío
   - `descripcion`: String no vacío
   - `laboratorio`: String (puede estar vacío)
   - `costo`: Número positivo o cero
   - `utilidad`: Número positivo o cero (porcentaje)
   - `precio`: Número positivo o cero
   - `existencia`: Número positivo o cero (cantidad)

### Response Exitosa (200 OK)

```json
{
  "message": "Inventario guardado correctamente",
  "itemsProcessed": 2,
  "farmacia": "farmacia_001",
  "fecha": "2025-01-11T10:30:00Z"
}
```

### Response de Error (400 Bad Request)

```json
{
  "detail": "Mensaje de error descriptivo"
}
```

### Posibles Errores

- `"Farmacia no encontrada"`: El ID de farmacia no existe
- `"Usuario no encontrado"`: El correo del usuario no existe
- `"El array de items no puede estar vacío"`: No se enviaron items
- `"Item inválido: [descripción del error]"`: Algún item tiene datos inválidos
- `"Error al guardar inventario"`: Error interno del servidor

### Estructura de Base de Datos Sugerida

Si aún no existe una colección/tabla para los items de inventario, se sugiere la siguiente estructura:

```javascript
// MongoDB Schema
{
  _id: ObjectId,
  codigo: String (requerido, indexado),
  descripcion: String (requerido),
  laboratorio: String,
  costo: Number (requerido, >= 0),
  utilidad: Number (requerido, >= 0), // Porcentaje
  precio: Number (requerido, >= 0),
  existencia: Number (requerido, >= 0), // Cantidad en stock
  farmacia: String (requerido, referencia a farmacia),
  usuarioCorreo: String (requerido),
  fechaCreacion: Date (requerido, default: now),
  fechaActualizacion: Date (requerido, default: now),
  estado: String (default: "activo") // "activo" | "inactivo"
}
```

### Notas Importantes

1. **Duplicados**: Se recomienda verificar si ya existe un item con el mismo `codigo` y `farmacia`. Si existe, se puede:
   - Actualizar el item existente
   - Rechazar el item duplicado
   - Crear un nuevo registro (según la lógica de negocio)

2. **Cálculo de Precio**: Si el precio no se proporciona pero sí el costo y utilidad, se puede calcular:
   ```
   precio = costo * (1 + utilidad / 100)
   ```

3. **Transacciones**: Se recomienda usar transacciones de base de datos para asegurar que todos los items se guarden correctamente o ninguno (atomicidad).

4. **Autenticación**: El endpoint debe requerir autenticación JWT (token en el header `Authorization: Bearer <token>`).

### Ejemplo de Implementación (FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List
from datetime import datetime

router = APIRouter()

class InventarioItem(BaseModel):
    codigo: str
    descripcion: str
    laboratorio: str = ""
    costo: float
    utilidad: float
    precio: float
    existencia: float

class InventarioExcelRequest(BaseModel):
    farmacia: str
    items: List[InventarioItem]
    usuarioCorreo: EmailStr

@router.post("/inventarios/excel")
async def crear_inventario_excel(
    request: InventarioExcelRequest,
    current_user: dict = Depends(get_current_user)
):
    # Validar farmacia
    farmacia = await db.farmacias.find_one({"_id": request.farmacia})
    if not farmacia:
        raise HTTPException(status_code=404, detail="Farmacia no encontrada")
    
    # Validar usuario
    usuario = await db.usuarios.find_one({"correo": request.usuarioCorreo})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if not request.items:
        raise HTTPException(status_code=400, detail="El array de items no puede estar vacío")
    
    # Validar y procesar items
    items_guardados = []
    for item in request.items:
        if not item.codigo or not item.descripcion:
            raise HTTPException(
                status_code=400,
                detail=f"Item inválido: código y descripción son requeridos"
            )
        
        if item.costo < 0 or item.utilidad < 0 or item.precio < 0 or item.existencia < 0:
            raise HTTPException(
                status_code=400,
                detail=f"Item inválido: los valores numéricos no pueden ser negativos"
            )
        
        # Verificar si ya existe (opcional)
        # existente = await db.inventario_items.find_one({
        #     "codigo": item.codigo,
        #     "farmacia": request.farmacia
        # })
        
        inventario_item = {
            "codigo": item.codigo,
            "descripcion": item.descripcion,
            "laboratorio": item.laboratorio,
            "costo": item.costo,
            "utilidad": item.utilidad,
            "precio": item.precio,
            "existencia": item.existencia,
            "farmacia": request.farmacia,
            "usuarioCorreo": request.usuarioCorreo,
            "fechaCreacion": datetime.utcnow(),
            "fechaActualizacion": datetime.utcnow(),
            "estado": "activo"
        }
        
        # Insertar en base de datos
        result = await db.inventario_items.insert_one(inventario_item)
        items_guardados.append(result.inserted_id)
    
    return {
        "message": "Inventario guardado correctamente",
        "itemsProcessed": len(items_guardados),
        "farmacia": request.farmacia,
        "fecha": datetime.utcnow().isoformat()
    }
```

### Ejemplo de Implementación (Node.js/Express)

```javascript
const express = require('express');
const router = express.Router();

router.post('/inventarios/excel', async (req, res) => {
  try {
    const { farmacia, items, usuarioCorreo } = req.body;
    
    // Validar farmacia
    const farmaciaDoc = await Farmacia.findById(farmacia);
    if (!farmaciaDoc) {
      return res.status(404).json({ detail: 'Farmacia no encontrada' });
    }
    
    // Validar usuario
    const usuario = await Usuario.findOne({ correo: usuarioCorreo });
    if (!usuario) {
      return res.status(404).json({ detail: 'Usuario no encontrado' });
    }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ detail: 'El array de items no puede estar vacío' });
    }
    
    // Validar y procesar items
    const itemsGuardados = [];
    for (const item of items) {
      if (!item.codigo || !item.descripcion) {
        return res.status(400).json({ 
          detail: 'Item inválido: código y descripción son requeridos' 
        });
      }
      
      if (item.costo < 0 || item.utilidad < 0 || item.precio < 0 || item.existencia < 0) {
        return res.status(400).json({ 
          detail: 'Item inválido: los valores numéricos no pueden ser negativos' 
        });
      }
      
      const inventarioItem = new InventarioItem({
        codigo: item.codigo,
        descripcion: item.descripcion,
        laboratorio: item.laboratorio || '',
        costo: item.costo,
        utilidad: item.utilidad,
        precio: item.precio,
        existencia: item.existencia,
        farmacia: farmacia,
        usuarioCorreo: usuarioCorreo,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
        estado: 'activo'
      });
      
      await inventarioItem.save();
      itemsGuardados.push(inventarioItem._id);
    }
    
    res.json({
      message: 'Inventario guardado correctamente',
      itemsProcessed: itemsGuardados.length,
      farmacia: farmacia,
      fecha: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ detail: 'Error al guardar inventario: ' + error.message });
  }
});

module.exports = router;
```

