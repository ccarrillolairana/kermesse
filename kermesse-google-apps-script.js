// ============================================================
// GOOGLE APPS SCRIPT — Sistema de Gestión de Kermesse
// Base de Datos en Google Sheets + Backend API
// ============================================================

const SHEET_USUARIOS = 'usuarios';
const SHEET_TIPOS_PAGO = 'tipos_pago';
const SHEET_CATEGORIAS = 'categorias_producto';
const SHEET_PRODUCTOS = 'productos';
const SHEET_CLIENTES = 'clientes';
const SHEET_ESTADOS_PEDIDO = 'estados_pedido';
const SHEET_METODOS_ENTREGA = 'metodos_entrega';
const SHEET_PEDIDOS = 'pedidos';
const SHEET_PEDIDO_DETALLES = 'pedido_detalles';
const SHEET_PAGOS = 'pagos';
const SHEET_ENTREGAS = 'entregas';
const SHEET_AYUDAS = 'ayudas_economicas';
const SHEET_HISTORIAL = 'pedido_historial';
const SHEET_RENDICIONES = 'rendiciones';
const SHEET_RENDICION_DETALLES = 'rendicion_detalles';
const SHEET_PERMISOS = 'permisos';
const SHEET_KERMESSE_CIERRE = 'kermesse_cierre';

// Cabeceras exactas para cada hoja de cálculo
const AUTO_HEADERS = {
  'usuarios': ['id', 'nombre', 'correo', 'password', 'rol', 'activo', 'created_at', 'updated_at'],
  'tipos_pago': ['id', 'codigo', 'nombre', 'activo', 'created_at', 'updated_at'],
  'categorias_producto': ['id', 'codigo', 'nombre', 'descripcion', 'activo', 'created_at', 'updated_at'],
  'productos': ['id', 'categoria_id', 'codigo', 'nombre', 'descripcion', 'tipo', 'precio', 'stock_control', 'stock', 'activo', 'created_at', 'updated_at'],
  'clientes': ['id', 'nombre', 'telefono', 'direccion', 'latitud', 'longitud', 'observaciones', 'activo', 'created_at', 'updated_at'],
  'estados_pedido': ['id', 'codigo', 'nombre', 'color', 'activo', 'created_at', 'updated_at'],
  'metodos_entrega': ['id', 'codigo', 'nombre', 'activo', 'created_at', 'updated_at'],
  'pedidos': ['id', 'numero', 'cliente_id', 'estado_pedido_id', 'metodo_entrega_id', 'subtotal', 'descuento', 'total', 'observaciones', 'direccion_entrega', 'latitud', 'longitud', 'fecha_pedido', 'usuario_registro_id', 'created_at', 'updated_at'],
  'pedido_detalles': ['id', 'pedido_id', 'producto_id', 'cantidad', 'precio_unitario', 'descuento', 'subtotal', 'observaciones', 'created_at', 'updated_at'],
  'pagos': ['id', 'pedido_id', 'tipo_pago_id', 'monto', 'referencia', 'fecha_pago', 'usuario_id', 'estado', 'observaciones', 'created_at', 'updated_at'],
  'entregas': ['id', 'pedido_id', 'responsable_id', 'fecha_asignacion', 'fecha_salida', 'fecha_entrega', 'estado', 'observaciones', 'recibido_por', 'created_at', 'updated_at'],
  'ayudas_economicas': ['id', 'persona', 'monto', 'tipo_pago_id', 'referencia', 'fecha', 'usuario_id', 'observaciones', 'created_at', 'updated_at'],
  'pedido_historial': ['id', 'pedido_id', 'estado_anterior_id', 'estado_nuevo_id', 'usuario_id', 'fecha', 'observaciones'],
  'rendiciones': ['id', 'numero_rendicion', 'responsable_id', 'fecha_inicio', 'fecha_fin', 'pedidos_entregados_count', 'total_esperado', 'efectivo_esperado', 'qr_esperado', 'efectivo_declarado', 'qr_declarado', 'total_declarado', 'diferencia_efectivo', 'diferencia_qr', 'diferencia_total', 'estado', 'observaciones', 'usuario_cierre_id', 'fecha_aprobacion', 'created_at', 'updated_at'],
  'rendicion_detalles': ['id', 'rendicion_id', 'pedido_id', 'monto_esperado', 'monto_cobrado', 'diferencia', 'observaciones'],
  'permisos': ['id', 'codigo', 'nombre', 'modulo', 'descripcion'],
  'kermesse_cierre': ['id', 'fecha_cierre', 'total_pedidos', 'pedidos_entregados', 'pedidos_pendientes', 'pedidos_cancelados', 'total_ventas_platos', 'total_ventas_bebidas', 'total_ventas_postres', 'total_ventas_combos', 'total_ventas_otros', 'total_ventas', 'total_ayudas', 'total_recaudado', 'total_efectivo', 'total_qr', 'diferencias_rendicion', 'observaciones', 'usuario_cierre_id', 'created_at']
};

let _activeSpreadsheetCached = null;
function getActiveSpreadsheetCached() {
  if (!_activeSpreadsheetCached) {
    _activeSpreadsheetCached = SpreadsheetApp.getActiveSpreadsheet();
  }
  return _activeSpreadsheetCached;
}

function getSheet(name) {
  const ss = getActiveSpreadsheetCached();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (AUTO_HEADERS[name]) {
      sheet.appendRow(AUTO_HEADERS[name]);
    }
  }
  return sheet;
}

function sheetToJSON(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => h.toString().trim());
  return data.slice(1).filter(row => row[0] !== '' && row[0] !== null).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined && row[i] !== null ? row[i].toString() : '';
    });
    return obj;
  });
}

function appendRow(sheetName, obj) {
  const sheet = getSheet(sheetName);
  let lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    const headers = AUTO_HEADERS[sheetName] || Object.keys(obj);
    sheet.appendRow(headers);
    lastCol = headers.length;
  }
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => h.toString().trim());
  const row = headers.map(h => obj[h] !== undefined && obj[h] !== null ? obj[h] : '');
  sheet.appendRow(row);
}

function updateRow(sheetName, matchKey, matchValue, updateObj) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;
  const headers = data[0].map(h => h.toString().trim());
  const keyIdx = headers.indexOf(matchKey);
  if (keyIdx === -1) return false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIdx].toString() === matchValue.toString()) {
      Object.keys(updateObj).forEach(key => {
        const colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sheet.getRange(i + 1, colIdx + 1).setValue(updateObj[key]);
        }
      });
      return true;
    }
  }
  return false;
}

function generateNextId(sheetName, keyColumn, prefix, digits = 6) {
  const data = sheetToJSON(sheetName);
  let maxNum = 0;
  data.forEach(row => {
    const val = row[keyColumn] || '';
    const match = val.match(new RegExp(prefix + '(\\d+)'));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const next = maxNum + 1;
  return prefix + String(next).padStart(digits, '0');
}

function jsonResponse(data) {
  if (data && typeof data === 'object') {
    data.serverTime = new Date().toISOString();
  }
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// INICIALIZACIÓN AUTOMÁTICA DE LA BASE DE DATOS Y DATOS SEMILLA
// ============================================================
function initDatabaseSheets() {
  const now = new Date().toISOString();

  // 1. Crear todas las pestañas si no existen
  Object.keys(AUTO_HEADERS).forEach(sheetName => {
    const sheet = getSheet(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(AUTO_HEADERS[sheetName]);
    }
  });

  // 2. Poblar semillas de usuarios
  if (sheetToJSON(SHEET_USUARIOS).length === 0) {
    const defaultUsers = [
      { id: 'USR000001', nombre: 'Administrador General', correo: 'admin@kermesse.bo', password: 'demo1234', rol: 'Administrador', activo: 'true', created_at: now, updated_at: now },
      { id: 'USR000002', nombre: 'Encargado Cocina', correo: 'cocina@kermesse.bo', password: 'demo1234', rol: 'Cocina', activo: 'true', created_at: now, updated_at: now },
      { id: 'USR000003', nombre: 'Juan Pérez (Repartidor)', correo: 'juan.perez@kermesse.bo', password: 'demo1234', rol: 'Repartidor', activo: 'true', created_at: now, updated_at: now },
      { id: 'USR000004', nombre: 'María López (Cajera)', correo: 'caja@kermesse.bo', password: 'demo1234', rol: 'Cajero', activo: 'true', created_at: now, updated_at: now }
    ];
    defaultUsers.forEach(u => appendRow(SHEET_USUARIOS, u));
  }

  // 3. Poblar semillas de tipos de pago
  if (sheetToJSON(SHEET_TIPOS_PAGO).length === 0) {
    const defaultTiposPago = [
      { id: 'TPG000001', codigo: 'EFECTIVO', nombre: 'Efectivo', activo: 'true', created_at: now, updated_at: now },
      { id: 'TPG000002', codigo: 'QR', nombre: 'QR / Transferencia', activo: 'true', created_at: now, updated_at: now }
    ];
    defaultTiposPago.forEach(tp => appendRow(SHEET_TIPOS_PAGO, tp));
  }

  // 4. Poblar semillas de categorías de producto
  if (sheetToJSON(SHEET_CATEGORIAS).length === 0) {
    const defaultCat = [
      { id: 'CAT000001', codigo: 'PLATO', nombre: 'Platos', descripcion: 'Comidas principales y platos especiales', activo: 'true', created_at: now, updated_at: now },
      { id: 'CAT000002', codigo: 'BEBIDA', nombre: 'Bebidas', descripcion: 'Gaseosas, refrescos y agua', activo: 'true', created_at: now, updated_at: now },
      { id: 'CAT000003', codigo: 'POSTRE', nombre: 'Postres', descripcion: 'Postres, tortas y helados', activo: 'true', created_at: now, updated_at: now },
      { id: 'CAT000004', codigo: 'COMBO', nombre: 'Combos', descripcion: 'Combos de plato + bebida', activo: 'true', created_at: now, updated_at: now },
      { id: 'CAT000005', codigo: 'OTRO', nombre: 'Otros', descripcion: 'Otros productos o tiques', activo: 'true', created_at: now, updated_at: now }
    ];
    defaultCat.forEach(c => appendRow(SHEET_CATEGORIAS, c));
  }

  // 5. Poblar semillas de estados de pedido
  if (sheetToJSON(SHEET_ESTADOS_PEDIDO).length === 0) {
    const defaultEstados = [
      { id: 'EST000001', codigo: 'RESERVADO', nombre: 'Reservado', color: 'warning', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000002', codigo: 'CONFIRMADO', nombre: 'Confirmado', color: 'primary', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000003', codigo: 'EN_PREPARACION', nombre: 'En Preparación', color: 'warning', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000004', codigo: 'LISTO_DESPACHO', nombre: 'Listo Despacho', color: 'success', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000005', codigo: 'ASIGNADO', nombre: 'Asignado', color: 'primary', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000006', codigo: 'EN_CAMINO', nombre: 'En Camino', color: 'purple', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000007', codigo: 'RECOJO_SITIO', nombre: 'Recojo en Sitio', color: 'info', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000008', codigo: 'PARA_LLEVAR', nombre: 'Para Llevar', color: 'info', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000009', codigo: 'ENTREGADO', nombre: 'Entregado', color: 'success', activo: 'true', created_at: now, updated_at: now },
      { id: 'EST000010', codigo: 'CANCELADO', nombre: 'Cancelado', color: 'danger', activo: 'true', created_at: now, updated_at: now }
    ];
    defaultEstados.forEach(e => appendRow(SHEET_ESTADOS_PEDIDO, e));
  }

  // 6. Poblar semillas de métodos de entrega
  if (sheetToJSON(SHEET_METODOS_ENTREGA).length === 0) {
    const defaultMetodos = [
      { id: 'MET000001', codigo: 'RECOJO_SITIO', nombre: 'Recojo en Sitio', activo: 'true', created_at: now, updated_at: now },
      { id: 'MET000002', codigo: 'PARA_LLEVAR', nombre: 'Para Llevar', activo: 'true', created_at: now, updated_at: now },
      { id: 'MET000003', codigo: 'DOMICILIO', nombre: 'Entrega a Domicilio', activo: 'true', created_at: now, updated_at: now }
    ];
    defaultMetodos.forEach(m => appendRow(SHEET_METODOS_ENTREGA, m));
  }

  // 7. Poblar productos de prueba
  if (sheetToJSON(SHEET_PRODUCTOS).length === 0) {
    const defaultProds = [
      { id: 'PRO000001', categoria_id: 'CAT000001', codigo: 'PLT-001', nombre: 'Pollo al horno con papas', descripcion: 'Medio pollo dorado con papas y ensalada', tipo: 'PLATO', precio: 35.00, stock_control: 'true', stock: 100, activo: 'true', created_at: now, updated_at: now },
      { id: 'PRO000002', categoria_id: 'CAT000001', codigo: 'PLT-002', nombre: 'Chicharrón de cerdo', descripcion: 'Porción de chicharrón con mote y camote', tipo: 'PLATO', precio: 40.00, stock_control: 'true', stock: 80, activo: 'true', created_at: now, updated_at: now },
      { id: 'PRO000003', categoria_id: 'CAT000001', codigo: 'PLT-003', nombre: 'Hamburguesa completa', descripcion: 'Carne de res, queso, huevo, lechuga y tomate', tipo: 'PLATO', precio: 20.00, stock_control: 'true', stock: 150, activo: 'true', created_at: now, updated_at: now },
      { id: 'PRO000004', categoria_id: 'CAT000002', codigo: 'BEB-001', nombre: 'Coca Cola 500ml', descripcion: 'Gaseosa fría', tipo: 'BEBIDA', precio: 8.00, stock_control: 'true', stock: 200, activo: 'true', created_at: now, updated_at: now },
      { id: 'PRO000005', categoria_id: 'CAT000002', codigo: 'BEB-002', nombre: 'Agua Mineral sin gas 500ml', descripcion: 'Agua mineral embotellada', tipo: 'BEBIDA', precio: 5.00, stock_control: 'true', stock: 150, activo: 'true', created_at: now, updated_at: now },
      { id: 'PRO000006', categoria_id: 'CAT000002', codigo: 'BEB-003', nombre: 'Jugo Natural de Frutas', descripcion: 'Vaso de jugo natural 400ml', tipo: 'BEBIDA', precio: 6.00, stock_control: 'true', stock: 100, activo: 'true', created_at: now, updated_at: now },
      { id: 'PRO000007', categoria_id: 'CAT000003', codigo: 'PST-001', nombre: 'Gelatina con crema', descripcion: 'Copa de gelatina con chantilly', tipo: 'POSTRE', precio: 10.00, stock_control: 'true', stock: 60, activo: 'true', created_at: now, updated_at: now },
      { id: 'PRO000008', categoria_id: 'CAT000004', codigo: 'CMB-001', nombre: 'Combo Pollo + Coca Cola', descripcion: 'Pollo al horno + Coca Cola 500ml', tipo: 'COMBO', precio: 40.00, stock_control: 'true', stock: 50, activo: 'true', created_at: now, updated_at: now }
    ];
    defaultProds.forEach(p => appendRow(SHEET_PRODUCTOS, p));
  }

  // 8. Poblar cliente genérico
  if (sheetToJSON(SHEET_CLIENTES).length === 0) {
    appendRow(SHEET_CLIENTES, {
      id: 'CLI000001', nombre: 'Público General / Venta Mostrador', telefono: '', direccion: 'Kermesse', observaciones: 'Cliente predeterminado', activo: 'true', created_at: now, updated_at: now
    });
  }

  return { success: true, message: 'Base de datos inicializada correctamente con todas las pestañas y registros semilla.' };
}

// ============================================================
// ROUTING DE PETICIONES (doGet & doPost)
// ============================================================
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  let action = e ? e.parameter.action : null;
  let body = {};

  if (e && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); } catch (err) { }
  }
  if (!action && body.action) action = body.action;
  if (e && e.parameter.data && Object.keys(body).length === 0) {
    try { body = JSON.parse(e.parameter.data); } catch (err) { }
  }

  const isWriteAction = ['savePedido', 'savePago', 'cambiarEstadoPedido', 'asignarEntrega', 'desasignarEntrega', 'saveAyudaEconomica', 'saveCategoria', 'saveProducto', 'crearRendicion', 'aprobarRendicion', 'cerrarKermesse'].indexOf(action) !== -1;
  const lock = LockService.getScriptLock();
  let hasLock = false;
  if (isWriteAction) {
    try {
      lock.waitLock(3000);
      hasLock = true;
    } catch (err) {
      return jsonResponse({ success: false, error: 'Servidor ocupado. Intenta de nuevo en unos segundos.' });
    }
  }

  try {

    switch (action) {
      case 'ping':
        return jsonResponse({ success: true, message: 'API Kermesse activa y respondiendo' });

      case 'initDatabase':
        return jsonResponse(initDatabaseSheets());

      // ==================== AUTENTICACIÓN ====================
      case 'login': {
        const users = sheetToJSON(SHEET_USUARIOS);
        const user = users.find(u => u.correo === body.correo && u.password === body.password);
        if (!user) return jsonResponse({ success: false, error: 'Correo o contraseña incorrectos.' });
        if (user.activo === 'false') return jsonResponse({ success: false, error: 'El usuario está inactivo.' });
        return jsonResponse({
          success: true,
          data: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol }
        });
      }

      // ==================== OBTENER ESTADO GENERAL ====================
      case 'getAppState': {
        return jsonResponse({
          success: true,
          data: {
            usuarios: sheetToJSON(SHEET_USUARIOS),
            tiposPago: sheetToJSON(SHEET_TIPOS_PAGO),
            categorias: sheetToJSON(SHEET_CATEGORIAS),
            productos: sheetToJSON(SHEET_PRODUCTOS),
            clientes: sheetToJSON(SHEET_CLIENTES),
            estadosPedido: sheetToJSON(SHEET_ESTADOS_PEDIDO),
            metodosEntrega: sheetToJSON(SHEET_METODOS_ENTREGA),
            pedidos: sheetToJSON(SHEET_PEDIDOS),
            pedidoDetalles: sheetToJSON(SHEET_PEDIDO_DETALLES),
            pagos: sheetToJSON(SHEET_PAGOS),
            entregas: sheetToJSON(SHEET_ENTREGAS),
            ayudasEconomicas: sheetToJSON(SHEET_AYUDAS),
            pedidoHistorial: sheetToJSON(SHEET_HISTORIAL),
            rendiciones: sheetToJSON(SHEET_RENDICIONES),
            rendicionDetalles: sheetToJSON(SHEET_RENDICION_DETALLES),
            kermesseCierre: sheetToJSON(SHEET_KERMESSE_CIERRE)
          }
        });
      }

      // ==================== CATEGORÍAS, PRODUCTOS Y CLIENTES ====================
      case 'saveCategoria': {
        const now = new Date().toISOString();
        const id = body.id || generateNextId(SHEET_CATEGORIAS, 'id', 'CAT');
        const catData = {
          id: id,
          codigo: body.codigo || body.nombre.toUpperCase().replace(/\s+/g, '_'),
          nombre: body.nombre,
          descripcion: body.descripcion || '',
          activo: body.activo !== undefined ? String(body.activo) : 'true',
          updated_at: now
        };
        const existing = body.id ? sheetToJSON(SHEET_CATEGORIAS).find(c => c.id === body.id) : null;
        if (existing) {
          catData.created_at = existing.created_at;
          updateRow(SHEET_CATEGORIAS, 'id', id, catData);
        } else {
          catData.created_at = now;
          appendRow(SHEET_CATEGORIAS, catData);
        }
        return jsonResponse({ success: true, data: catData, message: 'Categoría guardada exitosamente.' });
      }

      case 'saveProducto': {
        const now = new Date().toISOString();
        const id = body.id || generateNextId(SHEET_PRODUCTOS, 'id', 'PRO');
        const prodData = {
          id: id,
          categoria_id: body.categoria_id,
          codigo: body.codigo || id,
          nombre: body.nombre,
          descripcion: body.descripcion || '',
          tipo: body.tipo || 'PLATO',
          precio: parseFloat(body.precio || 0),
          stock_control: body.stock_control || 'true',
          stock: parseInt(body.stock || 0),
          activo: body.activo !== undefined ? String(body.activo) : 'true',
          updated_at: now
        };
        const existing = body.id ? sheetToJSON(SHEET_PRODUCTOS).find(p => p.id === body.id) : null;
        if (existing) {
          prodData.created_at = existing.created_at;
          updateRow(SHEET_PRODUCTOS, 'id', id, prodData);
        } else {
          prodData.created_at = now;
          appendRow(SHEET_PRODUCTOS, prodData);
        }
        return jsonResponse({ success: true, data: prodData, message: 'Producto guardado exitosamente.' });
      }

      case 'saveCliente': {
        const now = new Date().toISOString();
        const id = body.id || generateNextId(SHEET_CLIENTES, 'id', 'CLI');
        const cliData = {
          id: id,
          nombre: body.nombre,
          telefono: body.telefono !== undefined ? String(body.telefono) : '0',
          direccion: body.direccion || '',
          latitud: body.latitud || '',
          longitud: body.longitud || '',
          observaciones: body.observaciones || '',
          activo: 'true',
          updated_at: now
        };
        const existing = body.id ? sheetToJSON(SHEET_CLIENTES).find(c => c.id === body.id) : null;
        if (existing) {
          cliData.created_at = existing.created_at;
          updateRow(SHEET_CLIENTES, 'id', id, cliData);
        } else {
          cliData.created_at = now;
          appendRow(SHEET_CLIENTES, cliData);
        }
        return jsonResponse({ success: true, data: cliData, message: 'Cliente guardado exitosamente.' });
      }

      // ==================== CREAR Y GESTIONAR PEDIDOS ====================
      case 'savePedido': {
        const now = new Date().toISOString();
        if (!body.items || body.items.length === 0) {
          return jsonResponse({ success: false, error: 'No se puede guardar un pedido sin productos.' });
        }

        const idPedido = generateNextId(SHEET_PEDIDOS, 'id', 'PED');
        const numPedido = generateNextId(SHEET_PEDIDOS, 'numero', 'KER-', 6);

        let subtotal = 0;
        const detailsToInsert = [];

        body.items.forEach(item => {
          const qty = parseFloat(item.cantidad || 1);
          const price = parseFloat(item.precio_unitario || item.precio || 0);
          const itemSub = qty * price;
          subtotal += itemSub;

          detailsToInsert.push({
            id: generateNextId(SHEET_PEDIDO_DETALLES, 'id', 'DET'),
            pedido_id: idPedido,
            producto_id: item.producto_id,
            cantidad: qty,
            precio_unitario: price,
            descuento: 0,
            subtotal: itemSub,
            observaciones: item.observaciones || '',
            created_at: now,
            updated_at: now
          });
        });

        const descuento = parseFloat(body.descuento || 0);
        const total = subtotal - descuento;

        const pedidoData = {
          id: idPedido,
          numero: numPedido,
          cliente_id: body.cliente_id || 'CLI000001',
          estado_pedido_id: body.estado_pedido_id || 'EST000001', // RESERVADO
          metodo_entrega_id: body.metodo_entrega_id || 'MET000001', // RECOJO_SITIO
          subtotal: subtotal,
          descuento: descuento,
          total: total,
          observaciones: body.observaciones || '',
          direccion_entrega: body.direccion_entrega || body.direccion || '',
          latitud: body.latitud || '',
          longitud: body.longitud || '',
          fecha_pedido: body.fecha_pedido || now.split('T')[0],
          usuario_registro_id: body.usuario_registro_id || 'USR000001',
          created_at: now,
          updated_at: now
        };

        appendRow(SHEET_PEDIDOS, pedidoData);
        detailsToInsert.forEach(d => appendRow(SHEET_PEDIDO_DETALLES, d));

        // Registrar Historial Inicial
        appendRow(SHEET_HISTORIAL, {
          id: generateNextId(SHEET_HISTORIAL, 'id', 'HST'),
          pedido_id: idPedido,
          estado_anterior_id: '',
          estado_nuevo_id: pedidoData.estado_pedido_id,
          usuario_id: pedidoData.usuario_registro_id,
          fecha: now,
          observaciones: 'Pedido creado exitosamente con número ' + numPedido
        });

        // Registrar Pago Inicial si fue realizado al momento de la venta
        if (body.pago_inicial && parseFloat(body.pago_inicial.monto || 0) > 0) {
          const idPago = generateNextId(SHEET_PAGOS, 'id', 'PAG');
          appendRow(SHEET_PAGOS, {
            id: idPago,
            pedido_id: idPedido,
            tipo_pago_id: body.pago_inicial.tipo_pago_id || 'TPG000001',
            monto: parseFloat(body.pago_inicial.monto),
            referencia: body.pago_inicial.referencia || '',
            fecha_pago: now,
            usuario_id: pedidoData.usuario_registro_id,
            estado: 'REGISTRADO',
            observaciones: 'Pago inicial registrado en pedido',
            created_at: now,
            updated_at: now
          });
        }

        return jsonResponse({
          success: true,
          data: { id: idPedido, numero: numPedido, total: total },
          message: 'Pedido ' + numPedido + ' registrado exitosamente.'
        });
      }

      case 'updatePedidoUbicacion': {
        const now = new Date().toISOString();
        const pedId = body.pedido_id;
        if (!pedId) return jsonResponse({ success: false, error: 'ID de pedido requerido.' });
        updateRow(SHEET_PEDIDOS, 'id', pedId, {
          direccion_entrega: body.direccion_entrega || '',
          latitud: body.latitud || '',
          longitud: body.longitud || '',
          updated_at: now
        });
        return jsonResponse({ success: true, message: 'Ubicación de entrega actualizada correctamente.' });
      }

      // ==================== PAGOS ====================
      case 'savePago': {
        const now = new Date().toISOString();
        const monto = parseFloat(body.monto || 0);
        if (monto <= 0) return jsonResponse({ success: false, error: 'El monto de pago debe ser mayor a cero.' });

        const pedido = sheetToJSON(SHEET_PEDIDOS).find(p => p.id === body.pedido_id);
        if (!pedido) return jsonResponse({ success: false, error: 'Pedido no encontrado.' });
        if (pedido.estado_pedido_id === 'EST000010') {
          return jsonResponse({ success: false, error: 'No se pueden registrar pagos a un pedido cancelado.' });
        }

        const idPago = generateNextId(SHEET_PAGOS, 'id', 'PAG');
        const pagoData = {
          id: idPago,
          pedido_id: body.pedido_id,
          tipo_pago_id: body.tipo_pago_id || 'TPG000001',
          monto: monto,
          referencia: body.referencia || '',
          fecha_pago: body.fecha_pago || now,
          usuario_id: body.usuario_id || 'USR000001',
          estado: 'REGISTRADO',
          observaciones: body.observaciones || '',
          created_at: now,
          updated_at: now
        };
        appendRow(SHEET_PAGOS, pagoData);

        return jsonResponse({ success: true, data: pagoData, message: 'Pago registrado exitosamente.' });
      }

      case 'anularPago': {
        const now = new Date().toISOString();
        const pago = sheetToJSON(SHEET_PAGOS).find(p => p.id === body.pago_id);
        if (!pago) return jsonResponse({ success: false, error: 'Pago no encontrado.' });

        updateRow(SHEET_PAGOS, 'id', body.pago_id, { estado: 'ANULADO', updated_at: now });
        return jsonResponse({ success: true, message: 'Pago anulado correctamente.' });
      }

      // ==================== CAMBIO DE ESTADO DE PEDIDO ====================
      case 'cambiarEstadoPedido': {
        const now = new Date().toISOString();
        const pedido = sheetToJSON(SHEET_PEDIDOS).find(p => p.id === body.pedido_id);
        if (!pedido) return jsonResponse({ success: false, error: 'Pedido no encontrado.' });

        const estadoAnterior = pedido.estado_pedido_id;
        const estadoNuevo = body.estado_nuevo_id;

        // Validar pago total antes de marcar como ENTREGADO (EST000009)
        if (estadoNuevo === 'EST000009') {
          const total = parseFloat(pedido.total || 0);
          const pagos = sheetToJSON(SHEET_PAGOS).filter(p => p.pedido_id === body.pedido_id && p.estado === 'REGISTRADO');
          const pagadoSum = pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
          if (pagadoSum < total - 0.01) {
            const saldo = Math.max(0, total - pagadoSum);
            return jsonResponse({ success: false, error: 'No se puede entregar el pedido ' + (pedido.numero || body.pedido_id) + ' porque tiene un saldo pendiente de Bs ' + saldo.toFixed(2) + '. Debe estar PAGADO para entregar.' });
          }
        }

        updateRow(SHEET_PEDIDOS, 'id', body.pedido_id, { estado_pedido_id: estadoNuevo, updated_at: now });

        appendRow(SHEET_HISTORIAL, {
          id: generateNextId(SHEET_HISTORIAL, 'id', 'HST'),
          pedido_id: body.pedido_id,
          estado_anterior_id: estadoAnterior,
          estado_nuevo_id: estadoNuevo,
          usuario_id: body.usuario_id || 'USR000001',
          fecha: now,
          observaciones: body.observaciones || ('Cambio de estado a ' + estadoNuevo)
        });

        return jsonResponse({ success: true, message: 'Estado del pedido actualizado correctamente.' });
      }

      // ==================== ASIGNACIÓN Y DESPACHO DE ENTREGAS ====================
      case 'asignarEntrega': {
        const now = new Date().toISOString();
        const pedidoIds = body.pedido_ids || [];
        const responsableId = body.responsable_id;
        if (!responsableId) return jsonResponse({ success: false, error: 'Debe seleccionar una persona responsable.' });
        if (pedidoIds.length === 0) return jsonResponse({ success: false, error: 'Debe seleccionar al menos un pedido.' });

        pedidoIds.forEach(pedId => {
          const idEntrega = generateNextId(SHEET_ENTREGAS, 'id', 'ENT');
          appendRow(SHEET_ENTREGAS, {
            id: idEntrega,
            pedido_id: pedId,
            responsable_id: responsableId,
            fecha_asignacion: now,
            fecha_salida: '',
            fecha_entrega: '',
            estado: 'ASIGNADO',
            observaciones: body.observaciones || '',
            recibido_por: '',
            created_at: now,
            updated_at: now
          });

          updateRow(SHEET_PEDIDOS, 'id', pedId, { estado_pedido_id: 'EST000005', updated_at: now }); // ASIGNADO

          appendRow(SHEET_HISTORIAL, {
            id: generateNextId(SHEET_HISTORIAL, 'id', 'HST'),
            pedido_id: pedId,
            estado_anterior_id: 'EST000004',
            estado_nuevo_id: 'EST000005',
            usuario_id: body.usuario_id || 'USR000001',
            fecha: now,
            observaciones: 'Pedido asignado a responsable ID: ' + responsableId
          });
        });

        return jsonResponse({ success: true, message: pedidoIds.length + ' pedidos asignados correctamente.' });
      }

      case 'desasignarEntrega': {
        const now = new Date().toISOString();
        const pedId = body.pedido_id;
        if (!pedId) return jsonResponse({ success: false, error: 'ID de pedido requerido.' });

        const pedido = sheetToJSON(SHEET_PEDIDOS).find(p => p.id === pedId);
        if (!pedido) return jsonResponse({ success: false, error: 'Pedido no encontrado.' });

        const estadoAnterior = pedido.estado_pedido_id;

        const entrega = sheetToJSON(SHEET_ENTREGAS).find(e => e.pedido_id === pedId && e.estado !== 'ENTREGADO');
        if (entrega) {
          updateRow(SHEET_ENTREGAS, 'id', entrega.id, {
            estado: 'DESASIGNADO',
            updated_at: now
          });
        }

        updateRow(SHEET_PEDIDOS, 'id', pedId, {
          estado_pedido_id: 'EST000004', // LISTO_DESPACHO
          updated_at: now
        });

        appendRow(SHEET_HISTORIAL, {
          id: generateNextId(SHEET_HISTORIAL, 'id', 'HST'),
          pedido_id: pedId,
          estado_anterior_id: estadoAnterior,
          estado_nuevo_id: 'EST000004',
          usuario_id: body.usuario_id || 'USR000001',
          fecha: now,
          observaciones: 'Entrega desasignada de repartidor. Devuelto a cola de despacho.'
        });

        return jsonResponse({ success: true, message: 'Pedido desasignado y devuelto a la lista de despacho.' });
      }

      case 'iniciarEntrega': {
        const now = new Date().toISOString();
        const entrega = sheetToJSON(SHEET_ENTREGAS).find(e => e.pedido_id === body.pedido_id && e.estado !== 'ENTREGADO');
        if (entrega) {
          updateRow(SHEET_ENTREGAS, 'id', entrega.id, { estado: 'EN_CAMINO', fecha_salida: now, updated_at: now });
        }
        updateRow(SHEET_PEDIDOS, 'id', body.pedido_id, { estado_pedido_id: 'EST000006', updated_at: now }); // EN_CAMINO

        appendRow(SHEET_HISTORIAL, {
          id: generateNextId(SHEET_HISTORIAL, 'id', 'HST'),
          pedido_id: body.pedido_id,
          estado_anterior_id: 'EST000005',
          estado_nuevo_id: 'EST000006',
          usuario_id: body.usuario_id || 'USR000001',
          fecha: now,
          observaciones: 'El repartidor inició el trayecto de entrega'
        });

        return jsonResponse({ success: true, message: 'Pedido marcado en camino.' });
      }

      case 'confirmarEntrega': {
        const now = new Date().toISOString();
        const pedido = sheetToJSON(SHEET_PEDIDOS).find(p => p.id === body.pedido_id);
        if (pedido) {
          const total = parseFloat(pedido.total || 0);
          const pagos = sheetToJSON(SHEET_PAGOS).filter(p => p.pedido_id === body.pedido_id && p.estado === 'REGISTRADO');
          const pagadoSum = pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
          if (pagadoSum < total - 0.01) {
            const saldo = Math.max(0, total - pagadoSum);
            return jsonResponse({ success: false, error: 'No se puede confirmar la entrega del pedido ' + (pedido.numero || body.pedido_id) + ' porque tiene un saldo pendiente de Bs ' + saldo.toFixed(2) + '.' });
          }
        }

        const entrega = sheetToJSON(SHEET_ENTREGAS).find(e => e.pedido_id === body.pedido_id && e.estado !== 'ENTREGADO');
        if (entrega) {
          updateRow(SHEET_ENTREGAS, 'id', entrega.id, {
            estado: 'ENTREGADO',
            fecha_entrega: now,
            recibido_por: body.recibido_por || '',
            updated_at: now
          });
        }
        updateRow(SHEET_PEDIDOS, 'id', body.pedido_id, { estado_pedido_id: 'EST000009', updated_at: now }); // ENTREGADO

        appendRow(SHEET_HISTORIAL, {
          id: generateNextId(SHEET_HISTORIAL, 'id', 'HST'),
          pedido_id: body.pedido_id,
          estado_anterior_id: 'EST000006',
          estado_nuevo_id: 'EST000009',
          usuario_id: body.usuario_id || 'USR000001',
          fecha: now,
          observaciones: 'Entrega realizada con éxito. Recibido por: ' + (body.recibido_por || 'Cliente')
        });

        return jsonResponse({ success: true, message: 'Pedido entregado con éxito.' });
      }

      // ==================== AYUDAS ECONÓMICAS ====================
      case 'saveAyudaEconomica': {
        const now = new Date().toISOString();
        const monto = parseFloat(body.monto || 0);
        if (monto <= 0) return jsonResponse({ success: false, error: 'El monto de la ayuda económica debe ser mayor a cero.' });

        const idAyuda = generateNextId(SHEET_AYUDAS, 'id', 'AYU');
        const ayudaData = {
          id: idAyuda,
          persona: body.persona || 'Anónimo',
          monto: monto,
          tipo_pago_id: body.tipo_pago_id || 'TPG000001',
          referencia: body.referencia || '',
          fecha: body.fecha || now,
          usuario_id: body.usuario_id || 'USR000001',
          observaciones: body.observaciones || '',
          created_at: now,
          updated_at: now
        };
        appendRow(SHEET_AYUDAS, ayudaData);

        return jsonResponse({ success: true, data: ayudaData, message: 'Ayuda económica registrada con éxito.' });
      }

      // ==================== RENDICIONES DE DINERO ====================
      case 'crearRendicion': {
        const now = new Date().toISOString();
        const responsableId = body.responsable_id;
        const entregasAll = sheetToJSON(SHEET_ENTREGAS).filter(e => e.responsable_id === responsableId && e.estado === 'ENTREGADO');
        const pagosAll = sheetToJSON(SHEET_PAGOS).filter(p => p.estado === 'REGISTRADO');
        const pedidosAll = sheetToJSON(SHEET_PEDIDOS);

        const pedidoIds = entregasAll.map(e => e.pedido_id);
        if (pedidoIds.length === 0) {
          return jsonResponse({ success: false, error: 'No existen pedidos entregados por esta persona para rendir.' });
        }

        let totalEsperado = 0;
        let efectivoEsperado = 0;
        let qrEsperado = 0;

        pedidoIds.forEach(pId => {
          const ped = pedidosAll.find(p => p.id === pId);
          if (ped && ped.estado_pedido_id !== 'EST00010') {
            totalEsperado += parseFloat(ped.total || 0);
            const pgs = pagosAll.filter(p => p.pedido_id === pId);
            pgs.forEach(pg => {
              if (pg.tipo_pago_id === 'TPG000001') efectivoEsperado += parseFloat(pg.monto || 0);
              else if (pg.tipo_pago_id === 'TPG000002') qrEsperado += parseFloat(pg.monto || 0);
            });
          }
        });

        const efectivoDeclarado = parseFloat(body.efectivo_declarado || 0);
        const qrDeclarado = parseFloat(body.qr_declarado || 0);
        const totalDeclarado = efectivoDeclarado + qrDeclarado;

        const difEfectivo = efectivoDeclarado - efectivoEsperado;
        const difQr = qrDeclarado - qrEsperado;
        const difTotal = totalDeclarado - totalEsperado;

        const estadoRend = (Math.abs(difTotal) < 0.01) ? 'APROBADA' : 'OBSERVADA';

        const idRend = generateNextId(SHEET_RENDICIONES, 'id', 'RND');
        const numRend = generateNextId(SHEET_RENDICIONES, 'numero_rendicion', 'RND-', 5);

        const rendData = {
          id: idRend,
          numero_rendicion: numRend,
          responsable_id: responsableId,
          fecha_inicio: body.fecha_inicio || now,
          fecha_fin: now,
          pedidos_entregados_count: pedidoIds.length,
          total_esperado: totalEsperado,
          efectivo_esperado: efectivoEsperado,
          qr_esperado: qrEsperado,
          efectivo_declarado: efectivoDeclarado,
          qr_declarado: qrDeclarado,
          total_declarado: totalDeclarado,
          diferencia_efectivo: difEfectivo,
          diferencia_qr: difQr,
          diferencia_total: difTotal,
          estado: estadoRend,
          observaciones: body.observaciones || '',
          usuario_cierre_id: body.usuario_cierre_id || 'USR000001',
          fecha_aprobacion: now,
          created_at: now,
          updated_at: now
        };

        appendRow(SHEET_RENDICIONES, rendData);

        // Guardar detalle de rendición
        pedidoIds.forEach(pId => {
          const ped = pedidosAll.find(p => p.id === pId);
          const pgs = pagosAll.filter(p => p.pedido_id === pId);
          const cobrado = pgs.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

          appendRow(SHEET_RENDICION_DETALLES, {
            id: generateNextId(SHEET_RENDICION_DETALLES, 'id', 'RDT'),
            rendicion_id: idRend,
            pedido_id: pId,
            monto_esperado: parseFloat(ped ? ped.total : 0),
            monto_cobrado: cobrado,
            diferencia: cobrado - parseFloat(ped ? ped.total : 0),
            observaciones: ''
          });
        });

        return jsonResponse({
          success: true,
          data: rendData,
          message: 'Rendición ' + numRend + ' procesada con estado: ' + estadoRend
        });
      }

      // ==================== CIERRE DEFINITIVO DE KERMESSE ====================
      case 'cerrarKermesse': {
        const now = new Date().toISOString();
        const pedidos = sheetToJSON(SHEET_PEDIDOS);
        const pagos = sheetToJSON(SHEET_PAGOS).filter(p => p.estado === 'REGISTRADO');
        const ayudas = sheetToJSON(SHEET_AYUDAS);
        const rendiciones = sheetToJSON(SHEET_RENDICIONES);
        const detalles = sheetToJSON(SHEET_PEDIDO_DETALLES);
        const prods = sheetToJSON(SHEET_PRODUCTOS);
        const cats = sheetToJSON(SHEET_CATEGORIAS);

        const totalPedidos = pedidos.length;
        const entregados = pedidos.filter(p => p.estado_pedido_id === 'EST000009').length;
        const pendientes = pedidos.filter(p => p.estado_pedido_id !== 'EST000009' && p.estado_pedido_id !== 'EST000010').length;
        const cancelados = pedidos.filter(p => p.estado_pedido_id === 'EST000010').length;

        let totalPlatos = 0, totalBebidas = 0, totalPostres = 0, totalCombos = 0, totalOtros = 0;

        detalles.forEach(d => {
          const ped = pedidos.find(p => p.id === d.pedido_id);
          if (ped && ped.estado_pedido_id !== 'EST000010') {
            const prod = prods.find(pr => pr.id === d.producto_id);
            const sub = parseFloat(d.subtotal || 0);
            if (prod) {
              const cat = cats.find(c => c.id === prod.categoria_id);
              const cod = cat ? cat.codigo : prod.tipo;
              if (cod === 'PLATO') totalPlatos += sub;
              else if (cod === 'BEBIDA') totalBebidas += sub;
              else if (cod === 'POSTRE') totalPostres += sub;
              else if (cod === 'COMBO') totalCombos += sub;
              else totalOtros += sub;
            } else {
              totalOtros += sub;
            }
          }
        });

        const totalVentas = totalPlatos + totalBebidas + totalPostres + totalCombos + totalOtros;
        const totalAyudas = ayudas.reduce((sum, a) => sum + parseFloat(a.monto || 0), 0);
        const totalRecaudado = totalVentas + totalAyudas;

        let totalEfectivo = 0;
        let totalQR = 0;

        pagos.forEach(p => {
          const ped = pedidos.find(pd => pd.id === p.pedido_id);
          if (ped && ped.estado_pedido_id !== 'EST000010') {
            if (p.tipo_pago_id === 'TPG000001') totalEfectivo += parseFloat(p.monto || 0);
            else totalQR += parseFloat(p.monto || 0);
          }
        });

        ayudas.forEach(a => {
          if (a.tipo_pago_id === 'TPG000001') totalEfectivo += parseFloat(a.monto || 0);
          else totalQR += parseFloat(a.monto || 0);
        });

        const difRendiciones = rendiciones.reduce((sum, r) => sum + parseFloat(r.diferencia_total || 0), 0);

        const idCierre = generateNextId(SHEET_KERMESSE_CIERRE, 'id', 'CIE');
        const cierreData = {
          id: idCierre,
          fecha_cierre: now,
          total_pedidos: totalPedidos,
          pedidos_entregados: entregados,
          pedidos_pendientes: pendientes,
          pedidos_cancelados: cancelados,
          total_ventas_platos: totalPlatos,
          total_ventas_bebidas: totalBebidas,
          total_ventas_postres: totalPostres,
          total_ventas_combos: totalCombos,
          total_ventas_otros: totalOtros,
          total_ventas: totalVentas,
          total_ayudas: totalAyudas,
          total_recaudado: totalRecaudado,
          total_efectivo: totalEfectivo,
          total_qr: totalQR,
          diferencias_rendicion: difRendiciones,
          observaciones: body.observaciones || 'Cierre oficial de Kermesse completado.',
          usuario_cierre_id: body.usuario_cierre_id || 'USR000001',
          created_at: now
        };

        appendRow(SHEET_KERMESSE_CIERRE, cierreData);

        return jsonResponse({
          success: true,
          data: cierreData,
          message: 'Cierre de Kermesse registrado y auditado exitosamente.'
        });
      }

      default:
        return jsonResponse({ success: false, error: 'Acción no válida o no especificada.' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: 'Error del Servidor: ' + err.message });
  } finally {
    if (hasLock) {
      try { lock.releaseLock(); } catch(e) {}
    }
  }
}
