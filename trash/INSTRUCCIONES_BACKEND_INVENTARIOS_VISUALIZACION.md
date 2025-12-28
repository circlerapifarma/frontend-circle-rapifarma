# Instrucciones Backend - Visualización de Inventarios

## Resumen de Cambios en Frontend

El frontend ha sido actualizado para mostrar los inventarios de manera diferente:

1. **Eliminación del campo Estado**: Ya no se muestra ni se permite cambiar el estado de los inventarios
2. **Visualización como hoja de cálculo**: Los items se muestran individualmente con todas sus propiedades
3. **Cálculo de total general**: Se calcula como `existencia × costo` para cada item
4. **Eliminación de inventario completo**: Se puede eliminar todos los items de una farmacia completa

## Endpoints Requeridos

### 1. GET `/inventarios`

**Descripción**: Debe devolver todos los items de inventario individuales con todos sus campos.

**Response esperado** (200 OK):
```json
[
  {
    "_id": "string",
    "codigo": "string",
    "descripcion": "string",
    "laboratorio": "string",
    "costo": number,
    "utilidad": number,
    "precio": number,
    "existencia": number,
    "farmacia": "string (ID de farmacia)",
    "usuarioCorreo": "string (opcional)",
    "fecha": "string (opcional, ISO date)"
  }
]
```

**Notas importantes**:
- El campo `estado` ya no es necesario en la respuesta (aunque puede seguir existiendo en la BD)
- Todos los campos numéricos deben ser números válidos (no strings)
- El campo `farmacia` debe ser el ID de la farmacia
- El campo `existencia` debe ser la cantidad disponible

### 2. DELETE `/inventarios/{id}`

**Descripción**: Elimina un item individual de inventario.

**Parámetros**:
- `id` (string, requerido): ID del item de inventario a eliminar

**Response esperado** (200 OK):
```json
{
  "message": "Inventario eliminado correctamente",
  "id": "string"
}
```

**Notas importantes**:
- Este endpoint ya existe según la documentación previa
- Se usa para eliminar items individuales cuando se elimina el inventario completo de una farmacia

### 3. GET `/farmacias`

**Descripción**: Debe devolver las farmacias disponibles para poder mostrar el nombre de cada farmacia.

**Response esperado** (200 OK):
```json
{
  "farmacias": {
    "farmacia_id_1": "Nombre Farmacia 1",
    "farmacia_id_2": "Nombre Farmacia 2"
  }
}
```

O alternativamente:
```json
{
  "farmacia_id_1": "Nombre Farmacia 1",
  "farmacia_id_2": "Nombre Farmacia 2"
}
```

**Notas importantes**:
- El frontend maneja ambos formatos
- Se necesita para mostrar el nombre de la farmacia en lugar del ID

## Funcionalidad de Eliminación de Inventario Completo

El frontend implementa la eliminación de inventario completo de una farmacia haciendo múltiples llamadas DELETE al endpoint `/inventarios/{id}` para cada item.

**Proceso**:
1. El frontend filtra todos los items de una farmacia específica
2. Hace una llamada DELETE para cada item
3. Si todas las eliminaciones son exitosas, recarga la lista

**Consideración para el Backend**:
Si prefieres tener un endpoint específico para eliminar todos los items de una farmacia de una vez, podrías crear:

### DELETE `/inventarios/farmacia/{farmaciaId}` (Opcional)

**Descripción**: Elimina todos los items de inventario de una farmacia específica.

**Parámetros**:
- `farmaciaId` (string, requerido): ID de la farmacia

**Response esperado** (200 OK):
```json
{
  "message": "Inventario de farmacia eliminado correctamente",
  "farmaciaId": "string",
  "itemsEliminados": number
}
```

**Ventajas**:
- Más eficiente (una sola llamada en lugar de múltiples)
- Transaccional (si falla, no se elimina nada)
- Mejor rendimiento

## Métricas para el Navbar

El frontend calcula dos métricas en el navbar:

1. **Total Cantidad**: Suma de todas las existencias de todos los items
2. **Total SKU**: Número de productos únicos (por código)

Estas métricas se calculan en el frontend usando los datos del endpoint GET `/inventarios`, por lo que **no se requieren endpoints adicionales**.

## Validaciones Importantes

1. **Campos requeridos en GET `/inventarios`**:
   - `codigo`: String no vacío
   - `descripcion`: String no vacío
   - `costo`: Number >= 0
   - `utilidad`: Number >= 0
   - `precio`: Number >= 0
   - `existencia`: Number >= 0
   - `farmacia`: String (ID válido)

2. **Formato de números**: Todos los valores numéricos deben ser números, no strings numéricos.

3. **Filtrado por farmacia**: El frontend filtra por `farmacia === farmaciaId`, asegúrate de que el campo `farmacia` en la BD sea consistente.

## Ejemplo de Implementación (FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException
from typing import List

router = APIRouter()

@router.get("/inventarios")
async def obtener_inventarios(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene todos los items de inventario.
    """
    items = await db.inventarios.find({"estado": {"$ne": "eliminado"}}).to_list(None)
    
    # Convertir ObjectId a string y asegurar que los números sean números
    result = []
    for item in items:
        result.append({
            "_id": str(item["_id"]),
            "codigo": item.get("codigo", ""),
            "descripcion": item.get("descripcion", ""),
            "laboratorio": item.get("laboratorio", ""),
            "costo": float(item.get("costo", 0)),
            "utilidad": float(item.get("utilidad", 0)),
            "precio": float(item.get("precio", 0)),
            "existencia": float(item.get("existencia", 0)),
            "farmacia": item.get("farmacia", ""),
            "usuarioCorreo": item.get("usuarioCorreo", ""),
            "fecha": item.get("fechaCreacion", "").isoformat() if item.get("fechaCreacion") else None
        })
    
    return result

@router.delete("/inventarios/{id}")
async def eliminar_inventario(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina un item de inventario.
    """
    from bson import ObjectId
    
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    result = await db.inventarios.delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    return {"message": "Inventario eliminado correctamente", "id": id}

# Opcional: Endpoint para eliminar inventario completo de una farmacia
@router.delete("/inventarios/farmacia/{farmacia_id}")
async def eliminar_inventario_farmacia(
    farmacia_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina todos los items de inventario de una farmacia.
    """
    result = await db.inventarios.delete_many({"farmacia": farmacia_id})
    
    return {
        "message": "Inventario de farmacia eliminado correctamente",
        "farmaciaId": farmacia_id,
        "itemsEliminados": result.deleted_count
    }
```

## Ejemplo de Implementación (Node.js/Express)

```javascript
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// GET /inventarios
router.get('/inventarios', async (req, res) => {
  try {
    const items = await Inventario.find({ estado: { $ne: 'eliminado' } });
    
    const result = items.map(item => ({
      _id: item._id.toString(),
      codigo: item.codigo || '',
      descripcion: item.descripcion || '',
      laboratorio: item.laboratorio || '',
      costo: parseFloat(item.costo || 0),
      utilidad: parseFloat(item.utilidad || 0),
      precio: parseFloat(item.precio || 0),
      existencia: parseFloat(item.existencia || 0),
      farmacia: item.farmacia || '',
      usuarioCorreo: item.usuarioCorreo || '',
      fecha: item.fechaCreacion ? item.fechaCreacion.toISOString() : null
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ detail: 'Error al obtener inventarios: ' + error.message });
  }
});

// DELETE /inventarios/:id
router.delete('/inventarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ detail: 'ID inválido' });
    }
    
    const result = await Inventario.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ detail: 'Item no encontrado' });
    }
    
    res.json({
      message: 'Inventario eliminado correctamente',
      id: id
    });
  } catch (error) {
    res.status(500).json({ detail: 'Error al eliminar inventario: ' + error.message });
  }
});

// Opcional: DELETE /inventarios/farmacia/:farmaciaId
router.delete('/inventarios/farmacia/:farmaciaId', async (req, res) => {
  try {
    const { farmaciaId } = req.params;
    
    const result = await Inventario.deleteMany({ farmacia: farmaciaId });
    
    res.json({
      message: 'Inventario de farmacia eliminado correctamente',
      farmaciaId: farmaciaId,
      itemsEliminados: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ detail: 'Error al eliminar inventario: ' + error.message });
  }
});

module.exports = router;
```

## Checklist para el Backend

- [ ] Verificar que GET `/inventarios` devuelve todos los campos requeridos
- [ ] Asegurar que los valores numéricos se devuelven como números (no strings)
- [ ] Verificar que DELETE `/inventarios/{id}` funciona correctamente
- [ ] (Opcional) Implementar DELETE `/inventarios/farmacia/{farmaciaId}` para mejor rendimiento
- [ ] Verificar que GET `/farmacias` devuelve el formato esperado
- [ ] Probar que el campo `farmacia` en los items coincide con los IDs de farmacias

## Notas Finales

- El campo `estado` puede seguir existiendo en la base de datos, pero el frontend ya no lo utiliza
- El cálculo del total general (existencia × costo) se hace en el frontend, no requiere cambios en el backend
- Las métricas del navbar (total cantidad y SKU) se calculan en el frontend
- Si implementas el endpoint opcional para eliminar inventario completo, el frontend puede ser actualizado para usarlo en el futuro

