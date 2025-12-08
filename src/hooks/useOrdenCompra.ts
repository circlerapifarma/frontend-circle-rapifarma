import { useState, useEffect } from 'react';
import { type ListaComparativa } from './useListasComparativas';
import * as XLSX from 'xlsx';

export interface ItemOrdenCompra {
  listaId: string;
  codigo: string;
  descripcion: string;
  laboratorio: string;
  precio: number;
  descuento: number;
  precioNeto: number;
  fechaVencimiento: string | null;
  existencia: number;
  proveedorId: string;
  proveedorNombre: string;
  farmacia: string;
  farmaciaNombre: string;
  cantidad: number;
}

export interface OrdenCompraPorFarmacia {
  farmacia: string;
  farmaciaNombre: string;
  items: ItemOrdenCompra[];
  total: number;
}

export function useOrdenCompra() {
  const [ordenCompra, setOrdenCompra] = useState<ItemOrdenCompra[]>([]);
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);

  // Cargar orden de compra desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ordenCompra');
    if (saved) {
      try {
        setOrdenCompra(JSON.parse(saved));
      } catch (e) {
        console.error('Error al cargar orden de compra:', e);
      }
    }
  }, []);

  // Cargar farmacias
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    fetch(`${API_BASE_URL}/farmacias`)
      .then(res => res.json())
      .then(data => {
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
      })
      .catch(err => console.error('Error al obtener farmacias:', err));
  }, []);

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    if (ordenCompra.length > 0) {
      localStorage.setItem('ordenCompra', JSON.stringify(ordenCompra));
    } else {
      localStorage.removeItem('ordenCompra');
    }
  }, [ordenCompra]);

  // Agregar producto al carrito
  const agregarProducto = (lista: ListaComparativa, farmaciaId: string, farmaciaNombre: string, cantidad: number = 1) => {
    const nuevoItem: ItemOrdenCompra = {
      listaId: lista._id,
      codigo: lista.codigo,
      descripcion: lista.descripcion,
      laboratorio: lista.laboratorio,
      precio: lista.precio,
      descuento: lista.descuento,
      precioNeto: lista.precioNeto,
      fechaVencimiento: lista.fechaVencimiento,
      existencia: lista.existencia,
      proveedorId: lista.proveedorId,
      proveedorNombre: lista.proveedor?.nombreJuridico || "N/A",
      farmacia: farmaciaId,
      farmaciaNombre: farmaciaNombre,
      cantidad: cantidad,
    };

    setOrdenCompra(prev => {
      // Verificar si ya existe el mismo producto para la misma farmacia
      const existe = prev.find(
        item => item.listaId === lista._id && item.farmacia === farmaciaId
      );
      
      if (existe) {
        // Actualizar cantidad
        return prev.map(item =>
          item.listaId === lista._id && item.farmacia === farmaciaId
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      } else {
        // Agregar nuevo
        return [...prev, nuevoItem];
      }
    });
  };

  // Eliminar producto del carrito
  const eliminarProducto = (listaId: string, farmaciaId: string) => {
    setOrdenCompra(prev =>
      prev.filter(item => !(item.listaId === listaId && item.farmacia === farmaciaId))
    );
  };

  // Actualizar cantidad
  const actualizarCantidad = (listaId: string, farmaciaId: string, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarProducto(listaId, farmaciaId);
      return;
    }
    
    setOrdenCompra(prev =>
      prev.map(item =>
        item.listaId === listaId && item.farmacia === farmaciaId
          ? { ...item, cantidad }
          : item
      )
    );
  };

  // Limpiar carrito
  const limpiarCarrito = () => {
    setOrdenCompra([]);
    localStorage.removeItem('ordenCompra');
  };

  // Agrupar por farmacia
  const ordenCompraPorFarmacia = (): OrdenCompraPorFarmacia[] => {
    const grupos = new Map<string, ItemOrdenCompra[]>();
    
    ordenCompra.forEach(item => {
      if (!grupos.has(item.farmacia)) {
        grupos.set(item.farmacia, []);
      }
      grupos.get(item.farmacia)!.push(item);
    });

    return Array.from(grupos.entries()).map(([farmaciaId, items]) => {
      const farmacia = farmacias.find(f => f.id === farmaciaId);
      const total = items.reduce((sum, item) => sum + (item.precioNeto * item.cantidad), 0);
      
      return {
        farmacia: farmaciaId,
        farmaciaNombre: farmacia?.nombre || farmaciaId,
        items,
        total,
      };
    });
  };

  // Exportar a Excel por farmacia (agrupado por proveedor)
  const exportarExcelPorFarmacia = (farmaciaId: string) => {
    const grupo = ordenCompraPorFarmacia().find(g => g.farmacia === farmaciaId);
    if (!grupo || grupo.items.length === 0) {
      alert('No hay items en la orden de compra para esta farmacia');
      return;
    }

    // Agrupar items por proveedor
    const itemsPorProveedor = new Map<string, ItemOrdenCompra[]>();
    grupo.items.forEach(item => {
      const proveedorKey = item.proveedorId;
      if (!itemsPorProveedor.has(proveedorKey)) {
        itemsPorProveedor.set(proveedorKey, []);
      }
      itemsPorProveedor.get(proveedorKey)!.push(item);
    });

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Crear una hoja por proveedor
    const proveedoresArray = Array.from(itemsPorProveedor.entries());
    proveedoresArray.forEach(([, items], index) => {
      const proveedorNombre = items[0]?.proveedorNombre || 'N/A';
      const subtotalProveedor = items.reduce((sum, item) => sum + ((item.precioNeto || 0) * (item.cantidad || 0)), 0);

      // Preparar datos para Excel
      const datos: Array<{
        'Código': string;
        'Descripción': string;
        'Laboratorio': string;
        'Precio': number;
        'Descuento (%)': number;
        'Precio Neto': number;
        'Cantidad': number | string;
        'Subtotal': number;
        'Fecha Vencimiento': string;
      }> = items
        .filter(item => item != null)
        .map(item => {
          const precio = (item?.precio != null && !isNaN(item.precio)) ? item.precio : 0;
          const precioNeto = (item?.precioNeto != null && !isNaN(item.precioNeto)) ? item.precioNeto : 0;
          const cantidad = (item?.cantidad != null && !isNaN(item.cantidad)) ? item.cantidad : 0;
          const descuento = (item?.descuento != null && !isNaN(item.descuento)) ? item.descuento : 0;
          return {
            'Código': item?.codigo || '',
            'Descripción': item?.descripcion || '',
            'Laboratorio': item?.laboratorio || '',
            'Precio': precio,
            'Descuento (%)': descuento,
            'Precio Neto': precioNeto,
            'Cantidad': cantidad,
            'Subtotal': precioNeto * cantidad,
            'Fecha Vencimiento': item?.fechaVencimiento 
              ? new Date(item.fechaVencimiento).toLocaleDateString('es-VE')
              : '',
          };
        });

      // Agregar fila de subtotal del proveedor
      datos.push({
        'Código': '',
        'Descripción': '',
        'Laboratorio': '',
        'Precio': 0,
        'Descuento (%)': 0,
        'Precio Neto': 0,
        'Cantidad': `SUBTOTAL ${proveedorNombre}`,
        'Subtotal': subtotalProveedor,
        'Fecha Vencimiento': '',
      });

      // Agregar fila de total general (solo en el último proveedor)
      const esUltimoProveedor = index === proveedoresArray.length - 1;
      if (esUltimoProveedor) {
        datos.push({
          'Código': '',
          'Descripción': '',
          'Laboratorio': '',
          'Precio': 0,
          'Descuento (%)': 0,
          'Precio Neto': 0,
          'Cantidad': 'TOTAL GENERAL',
          'Subtotal': grupo.total || 0,
          'Fecha Vencimiento': '',
        });
      }

      const ws = XLSX.utils.json_to_sheet(datos);
      
      // Ajustar anchos de columna
      const colWidths = [
        { wch: 15 }, // Código
        { wch: 40 }, // Descripción
        { wch: 25 }, // Laboratorio
        { wch: 12 }, // Precio
        { wch: 12 }, // Descuento
        { wch: 12 }, // Precio Neto
        { wch: 10 }, // Cantidad
        { wch: 12 }, // Subtotal
        { wch: 15 }, // Fecha Vencimiento
      ];
      ws['!cols'] = colWidths;

      // Limpiar nombre de hoja (máximo 31 caracteres)
      const nombreHoja = proveedorNombre.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    });
    
    // Descargar
    const nombreArchivo = `Orden_Compra_${grupo.farmaciaNombre}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  // Imprimir orden por farmacia (agrupado por proveedor)
  const imprimirPorFarmacia = (farmaciaId: string) => {
    const grupo = ordenCompraPorFarmacia().find(g => g.farmacia === farmaciaId);
    if (!grupo || grupo.items.length === 0) {
      alert('No hay items en la orden de compra para esta farmacia');
      return;
    }

    // Agrupar items por proveedor
    const itemsPorProveedor = new Map<string, ItemOrdenCompra[]>();
    grupo.items.forEach(item => {
      const proveedorKey = item.proveedorId;
      if (!itemsPorProveedor.has(proveedorKey)) {
        itemsPorProveedor.set(proveedorKey, []);
      }
      itemsPorProveedor.get(proveedorKey)!.push(item);
    });

    // Crear contenido HTML para imprimir
    const contenido = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Orden de Compra - ${grupo.farmaciaNombre}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
              @page { margin: 1cm; }
            }
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin-bottom: 20px; }
            .proveedor-section { margin-bottom: 30px; page-break-inside: avoid; }
            .proveedor-title { background-color: #4CAF50; color: white; padding: 10px; font-weight: bold; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .subtotal { font-weight: bold; background-color: #e8f5e9; }
            .total { font-weight: bold; font-size: 1.2em; background-color: #c8e6c9; }
            .footer { margin-top: 30px; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Orden de Compra</h1>
          <div class="info">
            <p><strong>Farmacia:</strong> ${grupo.farmaciaNombre}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-VE')}</p>
            <p><strong>Total de Items:</strong> ${grupo.items.length}</p>
          </div>
          ${Array.from(itemsPorProveedor.entries()).map(([, items]) => {
            if (!items || items.length === 0) return '';
            const proveedorNombre = items[0]?.proveedorNombre || 'N/A';
            const subtotalProveedor = items
              .filter(item => item != null)
              .reduce((sum, item) => {
                const precioNeto = (item?.precioNeto != null && !isNaN(item.precioNeto)) ? item.precioNeto : 0;
                const cantidad = (item?.cantidad != null && !isNaN(item.cantidad)) ? item.cantidad : 0;
                return sum + (precioNeto * cantidad);
              }, 0);
            return `
            <div class="proveedor-section">
              <div class="proveedor-title">Proveedor: ${proveedorNombre}</div>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Laboratorio</th>
                    <th>Precio</th>
                    <th>Desc. (%)</th>
                    <th>Precio Neto</th>
                    <th>Cantidad</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.filter(item => item != null).map(item => {
                    if (!item) return '';
                    const precio = (item.precio != null && !isNaN(item.precio)) ? item.precio : 0;
                    const precioNeto = (item.precioNeto != null && !isNaN(item.precioNeto)) ? item.precioNeto : 0;
                    const cantidad = (item.cantidad != null && !isNaN(item.cantidad)) ? item.cantidad : 0;
                    const descuento = (item.descuento != null && !isNaN(item.descuento)) ? item.descuento : 0;
                    const subtotal = precioNeto * cantidad;
                    return `
                    <tr>
                      <td>${item.codigo || ''}</td>
                      <td>${item.descripcion || ''}</td>
                      <td>${item.laboratorio || ''}</td>
                      <td>$${Number(precio).toFixed(2)}</td>
                      <td>${Number(descuento)}%</td>
                      <td>$${Number(precioNeto).toFixed(2)}</td>
                      <td>${Number(cantidad)}</td>
                      <td>$${Number(subtotal).toFixed(2)}</td>
                    </tr>
                  `;
                  }).join('')}
                  <tr class="subtotal">
                    <td colspan="7" style="text-align: right;">Subtotal ${proveedorNombre}:</td>
                    <td>$${Number(subtotalProveedor || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            `;
          }).join('')}
          <div style="margin-top: 20px;">
            <table>
              <tr class="total">
                <td colspan="7" style="text-align: right; padding: 15px;">TOTAL ${grupo.farmaciaNombre}:</td>
                <td style="padding: 15px;">$${Number(grupo.total || 0).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            <p>Generado el ${new Date().toLocaleString('es-VE')}</p>
          </div>
        </body>
      </html>
    `;

    // Abrir ventana para imprimir
    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(contenido);
      ventana.document.close();
      setTimeout(() => {
        ventana.print();
      }, 250);
    }
  };

  // Exportar a PDF por farmacia (agrupado por proveedor, usando window.print)
  const exportarPDFPorFarmacia = (farmaciaId: string) => {
    // Reutilizar la función de imprimir que ya agrupa por proveedor
    imprimirPorFarmacia(farmaciaId);
  };

  // Exportar todas las farmacias a Excel (múltiples hojas)
  const exportarTodasFarmaciasExcel = () => {
    const grupos = ordenCompraPorFarmacia();
    if (grupos.length === 0) {
      alert('No hay items en la orden de compra');
      return;
    }

    const wb = XLSX.utils.book_new();

    grupos.forEach(grupo => {
      const datos: Array<{
        'Código': string;
        'Descripción': string;
        'Laboratorio': string;
        'Proveedor': string;
        'Precio': number;
        'Descuento (%)': number;
        'Precio Neto': number;
        'Cantidad': number | string;
        'Subtotal': number;
        'Fecha Vencimiento': string;
      }> = grupo.items.map(item => ({
        'Código': item.codigo,
        'Descripción': item.descripcion,
        'Laboratorio': item.laboratorio || '',
        'Proveedor': item.proveedorNombre,
        'Precio': item.precio || 0,
        'Descuento (%)': item.descuento || 0,
        'Precio Neto': item.precioNeto || 0,
        'Cantidad': item.cantidad || 0,
        'Subtotal': (item.precioNeto || 0) * (item.cantidad || 0),
        'Fecha Vencimiento': item.fechaVencimiento 
          ? new Date(item.fechaVencimiento).toLocaleDateString('es-VE')
          : '',
      }));

      datos.push({
        'Código': '',
        'Descripción': '',
        'Laboratorio': '',
        'Proveedor': '',
        'Precio': 0,
        'Descuento (%)': 0,
        'Precio Neto': 0,
        'Cantidad': 'TOTAL',
        'Subtotal': grupo.total,
        'Fecha Vencimiento': '',
      });

      const ws = XLSX.utils.json_to_sheet(datos);
      const colWidths = [
        { wch: 15 }, { wch: 40 }, { wch: 25 }, { wch: 30 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 15 },
      ];
      ws['!cols'] = colWidths;

      // Limpiar nombre de hoja (máximo 31 caracteres)
      const nombreHoja = grupo.farmaciaNombre.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    });

    const nombreArchivo = `Orden_Compra_Todas_Farmacias_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  const totalItems = ordenCompra.reduce((sum, item) => sum + item.cantidad, 0);
  const totalGeneral = ordenCompra.reduce((sum, item) => sum + (item.precioNeto * item.cantidad), 0);

  return {
    ordenCompra,
    ordenCompraPorFarmacia: ordenCompraPorFarmacia(),
    farmacias,
    agregarProducto,
    eliminarProducto,
    actualizarCantidad,
    limpiarCarrito,
    exportarExcelPorFarmacia,
    exportarPDFPorFarmacia,
    imprimirPorFarmacia,
    exportarTodasFarmaciasExcel,
    totalItems,
    totalGeneral,
  };
}

