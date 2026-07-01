// ============================================================
// FinanzasPro v3.1 - Lógica Principal COMPLETA
// ============================================================
let DB = {
    config: {
        TasaBCV: 0,
        SaldoBinance_USD: 0,
        SaldoEmpresa_USD: 0,
        SaldoPersonal_USD: 0,
        SaldoEmpresa_Bs: 0,
        SaldoPersonal_Bs: 0,
        NombreNegocio: 'Mi Negocio'
    },
    ingresos: [],
    recordatorios: [],
    deudas: [],
    empleados: [],
    nominaPagos: [],
    notas: ''
};
let GS_URL = localStorage.getItem('FinanzasPro_GS_URL') || '';
let GS_CONECTADO = false;
let nominaTemporal = [];

window.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    
    const ingresoFecha = document.getElementById('ingresoFecha');
    if (ingresoFecha) ingresoFecha.value = hoy;

    const recFechaActual = document.getElementById('recordatorioFechaActual');
    if (recFechaActual) recFechaActual.value = hoy;
    const recFecha = document.getElementById('recordatorioFecha');
    if (recFecha) recFecha.value = hoy;

    const deudaFecha = document.getElementById('deudaFecha');
    if (deudaFecha) deudaFecha.value = hoy;

    const empFecha = document.getElementById('empleadoFecha');
    if (empFecha) empFecha.value = hoy;

    const nominaFecha = document.getElementById('nominaFechaPago');
    if (nominaFecha) nominaFecha.value = hoy;

    cargarDesdeLocalStorage();

    if (GS_URL) {
        const urlInput = document.getElementById('urlGoogleSheets');
        if (urlInput) urlInput.value = GS_URL;
        cambiarEstadoGS('cargando', 'Verificando conexión...');
        verificarConexion();
    }
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ============================================================
// VALIDACIÓN SALDO INICIAL OBLIGATORIO
// ============================================================
function validarSaldoInicial() {
    const saldoUSD = parseFloat(document.getElementById('saldoIniUSD').value) || 0;
    const saldoBS = parseFloat(document.getElementById('saldoIniBS').value) || 0;
    const alerta = document.getElementById('alertaSaldoInicial');
    if (saldoUSD === 0 && saldoBS === 0) {
        alerta.style.display = 'block';
        return false;
    } else {
        alerta.style.display = 'none';
        return true;
    }
}

// ============================================================
// CÁLCULOS
// ============================================================
function calcularTotales() {
    const efectivoUSD = parseFloat(document.getElementById('efectivoUSD').value) || 0;
    const zelle = parseFloat(document.getElementById('zelle').value) || 0;
    const binance = parseFloat(document.getElementById('binance').value) || 0;
    const tarjetaDebitoUSD = document.getElementById('tarjetaDebitoMoneda').value === 'USD' ?
        (parseFloat(document.getElementById('tarjetaDebito').value) || 0) : 0;
    const tarjetaCreditoUSD = document.getElementById('tarjetaCreditoMoneda').value === 'USD' ?
        (parseFloat(document.getElementById('tarjetaCredito').value) || 0) : 0;
    const totalUSD = efectivoUSD + zelle + binance + tarjetaDebitoUSD + tarjetaCreditoUSD;

    const efectivoBS = parseFloat(document.getElementById('efectivoBS').value) || 0;
    const pagoMovil = parseFloat(document.getElementById('pagoMovil').value) || 0;
    const transferencia = parseFloat(document.getElementById('transferencia').value) || 0;
    const tarjetaDebitoBS = document.getElementById('tarjetaDebitoMoneda').value === 'BS' ? 
        (parseFloat(document.getElementById('tarjetaDebito').value) || 0) : 0;
    const tarjetaCreditoBS = document.getElementById('tarjetaCreditoMoneda').value === 'BS' ? 
        (parseFloat(document.getElementById('tarjetaCredito').value) || 0) : 0;

    const totalBS = efectivoBS + pagoMovil + transferencia + tarjetaDebitoBS + tarjetaCreditoBS;

    document.getElementById('totalUSD').textContent = '$' + totalUSD.toFixed(2);
    document.getElementById('totalBS').textContent = 'Bs. ' + totalBS.toFixed(2);
}

function calcularMontoBSRecordatorio() {
    const tasa = parseFloat(document.getElementById('tasaBCV').value) || 0;
    const montoUSD = parseFloat(document.getElementById('recordatorioMontoUSD').value) || 0;
    document.getElementById('recordatorioMontoBSCalculado').value = (montoUSD * tasa).toFixed(2);
}

function calcularMontoBSDeuda() {
    const tasa = parseFloat(document.getElementById('tasaBCV').value) || 0;
    const montoUSD = parseFloat(document.getElementById('deudaMontoUSD').value) || 0;
    document.getElementById('deudaMontoBSCalculado').value = (montoUSD * tasa).toFixed(2);
}

// ============================================================
// INGRESOS
// ============================================================
function guardarIngreso() {
    if (!validarSaldoInicial()) {
        alert('⚠️ Debes registrar el Saldo Inicial USD y/o Bs antes de guardar.');
        document.getElementById('saldoIniUSD').focus();
        return;
    }

    const ingreso = {
        ID: Date.now(),
        Fecha: document.getElementById('ingresoFecha').value,
        TasaBCV: parseFloat(document.getElementById('ingresoTasa').value) || 0,
        SaldoIni_USD: parseFloat(document.getElementById('saldoIniUSD').value) || 0,
        SaldoIni_Bs: parseFloat(document.getElementById('saldoIniBS').value) || 0,
        Efectivo_USD: parseFloat(document.getElementById('efectivoUSD').value) || 0,
        Efectivo_Bs: parseFloat(document.getElementById('efectivoBS').value) || 0,
        PagoMovil_Bs: parseFloat(document.getElementById('pagoMovil').value) || 0,
        TarjetaDebito: parseFloat(document.getElementById('tarjetaDebito').value) || 0,
        TarjetaDebitoMoneda: document.getElementById('tarjetaDebitoMoneda').value,
        TarjetaCredito: parseFloat(document.getElementById('tarjetaCredito').value) || 0,
        TarjetaCreditoMoneda: document.getElementById('tarjetaCreditoMoneda').value,
        Transferencia_Bs: parseFloat(document.getElementById('transferencia').value) || 0,
        Zelle_USD: parseFloat(document.getElementById('zelle').value) || 0,
        Binance_USD: parseFloat(document.getElementById('binance').value) || 0,
        Observacion: document.getElementById('observacion').value
    };

    ingreso.Total_USD = ingreso.Efectivo_USD + ingreso.Zelle_USD + ingreso.Binance_USD + 
        (ingreso.TarjetaDebitoMoneda === 'USD' ? ingreso.TarjetaDebito : 0) +
        (ingreso.TarjetaCreditoMoneda === 'USD' ? ingreso.TarjetaCredito : 0);

    ingreso.Total_Bs = ingreso.Efectivo_Bs + ingreso.PagoMovil_Bs + ingreso.Transferencia_Bs +
        (ingreso.TarjetaDebitoMoneda === 'BS' ? ingreso.TarjetaDebito : 0) +
        (ingreso.TarjetaCreditoMoneda === 'BS' ? ingreso.TarjetaCredito : 0);

    ingreso.SaldoFin_USD = ingreso.SaldoIni_USD + ingreso.Total_USD;
    ingreso.SaldoFin_Bs = ingreso.SaldoIni_Bs + ingreso.Total_Bs;

    DB.ingresos.push(ingreso);
    DB.config.TasaBCV = ingreso.TasaBCV;

    guardarEnLocalStorage();
    renderizarIngresos();
    limpiarIngreso();
    actualizarDashboard();
    alert('✅ Ingreso guardado correctamente');
}

function renderizarIngresos() {
    const tbody = document.querySelector('#tablaIngresos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.ingresos.forEach(ing => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ing.Fecha}</td>
            <td>${ing.TasaBCV}</td>
            <td>${ing.SaldoIni_USD.toFixed(2)}</td>
            <td>${ing.SaldoIni_Bs.toFixed(2)}</td>
            <td>${ing.Efectivo_USD.toFixed(2)}</td>
            <td>${ing.Efectivo_Bs.toFixed(2)}</td>
            <td>${ing.PagoMovil_Bs.toFixed(2)}</td>
            <td>${ing.TarjetaDebito.toFixed(2)}</td>
            <td>${ing.TarjetaCredito.toFixed(2)}</td>
            <td>${ing.Transferencia_Bs.toFixed(2)}</td>
            <td>${ing.Zelle_USD.toFixed(2)}</td>
            <td>${ing.Binance_USD.toFixed(2)}</td>
            <td><strong>${ing.Total_USD.toFixed(2)}</strong></td>
            <td><strong>${ing.Total_Bs.toFixed(2)}</strong></td>
            <td>${ing.SaldoFin_USD.toFixed(2)}</td>
            <td>${ing.SaldoFin_Bs.toFixed(2)}</td>
            <td><button class="btn btn-danger" onclick="eliminarIngreso(${ing.ID})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('totalTransacciones').textContent = DB.ingresos.length;
}

function eliminarIngreso(id) {
    if (confirm('¿Eliminar este registro?')) {
        DB.ingresos = DB.ingresos.filter(i => i.ID !== id);
        guardarEnLocalStorage();
        renderizarIngresos();
        actualizarDashboard();
    }
}

function limpiarIngreso() {
    document.getElementById('efectivoUSD').value = 0;
    document.getElementById('efectivoBS').value = 0;
    document.getElementById('pagoMovil').value = 0;
    document.getElementById('tarjetaDebito').value = 0;
    document.getElementById('tarjetaCredito').value = 0;
    document.getElementById('transferencia').value = 0;
    document.getElementById('zelle').value = 0;
    document.getElementById('binance').value = 0;
    document.getElementById('observacion').value = '';
    calcularTotales();
}

// ============================================================
// RECORDATORIOS
// ============================================================
function guardarRecordatorio() {
    const recordatorio = {
        ID: Date.now(),
        FechaCreacion: new Date().toISOString(),
        FechaRecordatorio: document.getElementById('recordatorioFecha').value,
        Descripcion: document.getElementById('recordatorioDescripcion').value,
        MontoUSD: parseFloat(document.getElementById('recordatorioMontoUSD').value) || 0,
        MontoBs: parseFloat(document.getElementById('recordatorioMontoBS').value) || 0,
        Detalle: document.getElementById('recordatorioDetalle').value,
        Prioridad: document.getElementById('recordatorioPrioridad').value,
        Completado: false
    };
    DB.recordatorios.push(recordatorio);
    guardarEnLocalStorage();
    renderizarRecordatorios();
    limpiarRecordatorio();
    actualizarDashboard();
    alert('✅ Recordatorio guardado correctamente');
}

function renderizarRecordatorios() {
    const tbody = document.querySelector('#tablaRecordatorios tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.recordatorios.forEach(rec => {
        const tr = document.createElement('tr');
        const badgeClass = rec.Prioridad === 'Alta' ? 'badge-high' : rec.Prioridad === 'Media' ? 'badge-medium' : 'badge-low';
        tr.innerHTML = `
            <td>${rec.FechaRecordatorio}</td>
            <td>${rec.Descripcion}</td>
            <td>$${rec.MontoUSD.toFixed(2)}</td>
            <td>Bs. ${rec.MontoBs.toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${rec.Prioridad}</span></td>
            <td>${rec.Detalle}</td>
            <td>${rec.Completado ? '✅ Completado' : '⏳ Pendiente'}</td>
            <td>
                <button class="btn btn-${rec.Completado ? 'warning' : 'success'}" onclick="toggleRecordatorio(${rec.ID})">
                    ${rec.Completado ? '↩️' : '✅'}
                </button>
                <button class="btn btn-danger" onclick="eliminarRecordatorio(${rec.ID})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleRecordatorio(id) {
    const rec = DB.recordatorios.find(r => r.ID === id);
    if (rec) {
        rec.Completado = !rec.Completado;
        guardarEnLocalStorage();
        renderizarRecordatorios();
        actualizarDashboard();
    }
}

function eliminarRecordatorio(id) {
    if (confirm('¿Eliminar este recordatorio?')) {
        DB.recordatorios = DB.recordatorios.filter(r => r.ID !== id);
        guardarEnLocalStorage();
        renderizarRecordatorios();
        actualizarDashboard();
    }
}

function limpiarRecordatorio() {
    document.getElementById('recordatorioDescripcion').value = '';
    document.getElementById('recordatorioMontoUSD').value = '';
    document.getElementById('recordatorioMontoBS').value = '';
    document.getElementById('recordatorioMontoBSCalculado').value = '';
    document.getElementById('recordatorioDetalle').value = '';
}

// ============================================================
// DEUDAS / PAGAR - CON ABONOS Y REFERENCIAS
// ============================================================
function seleccionarProveedorExistente() {
    const proveedorSelect = document.getElementById('deudaProveedorExistente');
    const proveedorID = proveedorSelect.value;
    
    if (proveedorID) {
        const proveedor = DB.deudas.find(d => d.ID === parseInt(proveedorID));
        if (proveedor) {
            document.getElementById('deudaRIF').value = proveedor.RIF || '';
            document.getElementById('deudaNombre').value = proveedor.Nombre || '';
            document.getElementById('deudaEtiqueta').value = proveedor.Etiqueta || 'Proveedor';
        }
    } else {
        document.getElementById('deudaRIF').value = '';
        document.getElementById('deudaNombre').value = '';
    }
}

function actualizarListaProveedores() {
    const select = document.getElementById('deudaProveedorExistente');
    if (!select) return;
    
    const proveedoresUnicos = [];
    const nombresVistos = new Set();
    
    DB.deudas.forEach(d => {
        const clave = (d.Nombre || '').toLowerCase().trim();
        if (clave && !nombresVistos.has(clave)) {
            nombresVistos.add(clave);
            proveedoresUnicos.push(d);
        }
    });
    
    select.innerHTML = '<option value="">-- Nuevo Proveedor --</option>';
    proveedoresUnicos.forEach(p => {
        const option = document.createElement('option');
        option.value = p.ID;
        option.textContent = `${p.Nombre} (${p.RIF || 'Sin RIF'})`;
        select.appendChild(option);
    });
}

function guardarDeuda() {
    const nombre = document.getElementById('deudaNombre').value.trim();
    const montoUSD = parseFloat(document.getElementById('deudaMontoUSD').value) || 0;
    
    if (!nombre) {
        alert('⚠️ Debes ingresar el nombre del proveedor');
        return;
    }
    if (montoUSD <= 0) {
        alert('⚠️ Debes ingresar un monto mayor a 0');
        return;
    }

    const deuda = {
        ID: Date.now(),
        Fecha: document.getElementById('deudaFecha').value,
        TasaBCV: DB.config.TasaBCV,
        RIF: document.getElementById('deudaRIF').value,
        Nombre: nombre,
        Descripcion: document.getElementById('deudaDescripcion').value,
        NroFactura: document.getElementById('deudaFactura').value,
        MontoUSD: montoUSD,
        MontoBs: parseFloat(document.getElementById('deudaMontoBS').value) || (montoUSD * DB.config.TasaBCV) || 0,
        Etiqueta: document.getElementById('deudaEtiqueta').value,
        Prioridad: document.getElementById('deudaPrioridad').value,
        CuentaOrigen: document.getElementById('deudaCuentaOrigen').value,
        Pagado: false,
        TotalAbonado: 0,
        SaldoPendiente: montoUSD,
        HistorialPagos: []
    };

    DB.deudas.push(deuda);
    guardarEnLocalStorage();
    renderizarDeudas();
    actualizarListaProveedores();
    limpiarDeuda();
    actualizarDashboard();
    alert('✅ Factura guardada correctamente');
}

function renderizarDeudas() {
    const tbody = document.querySelector('#tablaDeudas tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let totalPendiente = 0;
    let totalPrioridadAlta = 0;
    let deudasActivas = 0;

    DB.deudas.forEach(deuda => {
        if (!deuda.Pagado && deuda.SaldoPendiente > 0) {
            deudasActivas++;
            totalPendiente += deuda.SaldoPendiente;
            if (deuda.Prioridad === 'Alta') totalPrioridadAlta += deuda.SaldoPendiente;
             
            const tr = document.createElement('tr');
            const badgeClass = deuda.Prioridad === 'Alta' ? 'badge-high' : deuda.Prioridad === 'Media' ? 'badge-medium' : 'badge-low';
            tr.innerHTML = `
                <td>${deuda.Fecha}</td>
                <td>${deuda.RIF}</td>
                <td>${deuda.Nombre}</td>
                <td>${deuda.Descripcion}</td>
                <td>${deuda.NroFactura}</td>
                <td>$${deuda.MontoUSD.toFixed(2)}</td>
                <td>$${deuda.TotalAbonado.toFixed(2)}</td>
                <td><strong>$${deuda.SaldoPendiente.toFixed(2)}</strong></td>
                <td>Bs. ${deuda.MontoBs.toFixed(2)}</td>
                <td>${deuda.Etiqueta}</td>
                <td><span class="badge ${badgeClass}">${deuda.Prioridad}</span></td>
                <td>${deuda.CuentaOrigen || '-'}</td>
                <td>
                    <button class="btn btn-success" onclick="abrirModalPago(${deuda.ID})">💵</button>
                    <button class="btn btn-primary" onclick="verHistorialPagos(${deuda.ID})">📜</button>
                    <button class="btn btn-danger" onclick="eliminarDeuda(${deuda.ID})">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });

    const elTotalPendiente = document.getElementById('totalPendiente');
    if (elTotalPendiente) elTotalPendiente.textContent = totalPendiente.toFixed(2);

    const elTotalAlta = document.getElementById('totalPrioridadAlta');
    if (elTotalAlta) elTotalAlta.textContent = totalPrioridadAlta.toFixed(2);

    const elTotalDeudas = document.getElementById('totalDeudas');
    if (elTotalDeudas) elTotalDeudas.textContent = deudasActivas;
}

function abrirModalPago(id) {
    const deuda = DB.deudas.find(d => d.ID === id);
    if (!deuda) return;
    
    document.getElementById('pagoDeudaID').value = deuda.ID;
    document.getElementById('pagoDeudaNombre').value = deuda.Nombre;
    document.getElementById('pagoDeudaFactura').value = deuda.NroFactura;
    document.getElementById('pagoDeudaSaldo').value = '$' + deuda.SaldoPendiente.toFixed(2);
    document.getElementById('pagoDeudaMonto').value = deuda.SaldoPendiente.toFixed(2);
    document.getElementById('pagoDeudaFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('pagoDeudaReferencia').value = '';
    document.getElementById('pagoDeudaObservacion').value = '';
    
    document.getElementById('modalPagoDeuda').style.display = 'flex';
}

function confirmarPagoDeuda() {
    const id = parseInt(document.getElementById('pagoDeudaID').value);
    const deuda = DB.deudas.find(d => d.ID === id);
    if (!deuda) {
        alert('❌ Deuda no encontrada');
        return;
    }
    
    const montoPago = parseFloat(document.getElementById('pagoDeudaMonto').value) || 0;
    const fechaPago = document.getElementById('pagoDeudaFecha').value;
    const cuentaOrigen = document.getElementById('pagoDeudaCuenta').value;
    const referencia = document.getElementById('pagoDeudaReferencia').value.trim();
    const observacion = document.getElementById('pagoDeudaObservacion').value;
    
    if (montoPago <= 0) {
        alert('⚠️ Debes ingresar un monto mayor a 0');
        return;
    }
    if (montoPago > deuda.SaldoPendiente) {
        alert('⚠️ El monto no puede ser mayor al saldo pendiente ($' + deuda.SaldoPendiente.toFixed(2) + ')');
        return;
    }
    if (!fechaPago) {
        alert('⚠️ Debes seleccionar la fecha de pago');
        return;
    }
    if (!referencia) {
        alert('⚠️ Debes ingresar la referencia de pago');
        return;
    }
    
    const pagoRegistro = {
        Fecha: fechaPago,
        MontoUSD: montoPago,
        MontoBs: montoPago * (DB.config.TasaBCV || 0),
        CuentaOrigen: cuentaOrigen,
        ReferenciaPago: referencia,
        Observacion: observacion
    };
    
    if (!deuda.HistorialPagos) {
        deuda.HistorialPagos = [];
    }
    deuda.HistorialPagos.push(pagoRegistro);
    
    deuda.TotalAbonado += montoPago;
    deuda.SaldoPendiente -= montoPago;
    
    if (deuda.SaldoPendiente <= 0.01) {
        deuda.Pagado = true;
        deuda.SaldoPendiente = 0;
    }
    
    guardarEnLocalStorage();
    renderizarDeudas();
    actualizarListaProveedores();
    actualizarDashboard();
    cerrarModalPago();
    
    if (deuda.Pagado) {
        alert('✅ Deuda PAGADA completamente. Referencia: ' + referencia);
    } else {
        alert('✅ Abono registrado. Saldo restante: $' + deuda.SaldoPendiente.toFixed(2));
    }
}

function verHistorialPagos(id) {
    const deuda = DB.deudas.find(d => d.ID === id);
    if (!deuda || !deuda.HistorialPagos || deuda.HistorialPagos.length === 0) {
        alert('📋 No hay pagos registrados para esta factura');
        return;
    }
    
    document.getElementById('histDeudaID').value = deuda.ID;
    const tbody = document.querySelector('#tablaHistorialPagosDeuda tbody');
    tbody.innerHTML = '';
    
    deuda.HistorialPagos.forEach(pago => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pago.Fecha}</td>
            <td>$${pago.MontoUSD.toFixed(2)}</td>
            <td>${pago.CuentaOrigen}</td>
            <td>${pago.ReferenciaPago}</td>
            <td>${pago.Observacion || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('modalHistorialPagos').style.display = 'flex';
}

function cerrarModalPago() {
    document.getElementById('modalPagoDeuda').style.display = 'none';
}

function cerrarModalHistorial() {
    document.getElementById('modalHistorialPagos').style.display = 'none';
}

function eliminarDeuda(id) {
    if (confirm('¿Eliminar esta factura?')) {
        DB.deudas = DB.deudas.filter(d => d.ID !== id);
        guardarEnLocalStorage();
        renderizarDeudas();
        actualizarListaProveedores();
        actualizarDashboard();
    }
}

function limpiarDeuda() {
    document.getElementById('deudaProveedorExistente').value = '';
    document.getElementById('deudaRIF').value = '';
    document.getElementById('deudaNombre').value = '';
    document.getElementById('deudaDescripcion').value = '';
    document.getElementById('deudaFactura').value = '';
    document.getElementById('deudaMontoUSD').value = '';
    document.getElementById('deudaMontoBSCalculado').value = '';
    document.getElementById('deudaCuentaOrigen').value = '';
}

function actualizarSaldosCuentas() {
    DB.config.SaldoBinance_USD = parseFloat(document.getElementById('saldoBinance').value) || 0;
    DB.config.SaldoEmpresa_USD = parseFloat(document.getElementById('saldoEmpresa').value) || 0;
    DB.config.SaldoPersonal_USD = parseFloat(document.getElementById('saldoPersonal').value) || 0;
    guardarEnLocalStorage();
}

// ============================================================
// EMPLEADOS
// ============================================================
function guardarEmpleado() {
    const nombre = document.getElementById('empleadoNombre').value.trim();
    const cedula = document.getElementById('empleadoCedula').value.trim();
    const sueldo = parseFloat(document.getElementById('empleadoSueldo').value) || 0;
    
    if (!nombre) {
        alert('⚠️ Debes ingresar el nombre del empleado');
        return;
    }
    if (!cedula) {
        alert('⚠️ Debes ingresar la cédula');
        return;
    }
    if (sueldo <= 0) {
        alert('⚠️ Debes ingresar un sueldo mayor a 0');
        return;
    }

    const empleado = {
        ID: Date.now(),
        FechaIngreso: document.getElementById('empleadoFecha').value,
        Nombre: nombre,
        Cedula: cedula,
        TipoSueldo: document.getElementById('empleadoTipoSueldo').value,
        SueldoUSD: sueldo,
        Status: 'Activo'
    };

    DB.empleados.push(empleado);
    guardarEnLocalStorage();
    renderizarEmpleados();
    limpiarEmpleado();
    actualizarDashboard();
    alert('✅ Empleado guardado correctamente');
}

function renderizarEmpleados() {
    const tbody = document.querySelector('#tablaEmpleados tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.empleados.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.FechaIngreso}</td>
            <td>${emp.Nombre}</td>
            <td>${emp.Cedula}</td>
            <td>${emp.TipoSueldo}</td>
            <td>$${emp.SueldoUSD.toFixed(2)}</td>
            <td>${emp.Status}</td>
            <td>
                <button class="btn btn-primary" onclick="editarEmpleado(${emp.ID})">✏️</button>
                <button class="btn btn-danger" onclick="eliminarEmpleado(${emp.ID})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editarEmpleado(id) {
    const emp = DB.empleados.find(e => e.ID === id);
    if (!emp) return;
    
    document.getElementById('editEmpleadoID').value = emp.ID;
    document.getElementById('editEmpleadoFecha').value = emp.FechaIngreso;
    document.getElementById('editEmpleadoNombre').value = emp.Nombre;
    document.getElementById('editEmpleadoCedula').value = emp.Cedula;
    document.getElementById('editEmpleadoTipoSueldo').value = emp.TipoSueldo;
    document.getElementById('editEmpleadoSueldo').value = emp.SueldoUSD;
    document.getElementById('editEmpleadoStatus').value = emp.Status;

    document.getElementById('modalEditarEmpleado').style.display = 'flex';
}

function guardarEdicionEmpleado() {
    const id = parseInt(document.getElementById('editEmpleadoID').value);
    const emp = DB.empleados.find(e => e.ID === id);
    if (!emp) {
        alert('❌ Empleado no encontrado');
        return;
    }

    const nombre = document.getElementById('editEmpleadoNombre').value.trim();
    const cedula = document.getElementById('editEmpleadoCedula').value.trim();
    const sueldo = parseFloat(document.getElementById('editEmpleadoSueldo').value) || 0;

    if (!nombre) {
        alert('⚠️ Debes ingresar el nombre');
        return;
    }
    if (!cedula) {
        alert('⚠️ Debes ingresar la cédula');
        return;
    }
    if (sueldo <= 0) {
        alert('⚠️ Debes ingresar un sueldo mayor a 0');
        return;
    }

    emp.FechaIngreso = document.getElementById('editEmpleadoFecha').value;
    emp.Nombre = nombre;
    emp.Cedula = cedula;
    emp.TipoSueldo = document.getElementById('editEmpleadoTipoSueldo').value;
    emp.SueldoUSD = sueldo;
    emp.Status = document.getElementById('editEmpleadoStatus').value;

    guardarEnLocalStorage();
    renderizarEmpleados();
    actualizarDashboard();
    cerrarModalEmpleado();
    alert('✅ Empleado actualizado correctamente');
}

function cerrarModalEmpleado() {
    document.getElementById('modalEditarEmpleado').style.display = 'none';
}

function eliminarEmpleado(id) {
    if (confirm('¿Eliminar este empleado?')) {
        DB.empleados = DB.empleados.filter(e => e.ID !== id);
        guardarEnLocalStorage();
        renderizarEmpleados();
        actualizarDashboard();
    }
}

function limpiarEmpleado() {
    document.getElementById('empleadoNombre').value = '';
    document.getElementById('empleadoCedula').value = '';
    document.getElementById('empleadoSueldo').value = '';
}

// ============================================================
// NÓMINA
// ============================================================
function generarNomina() {
    const empleadosActivos = DB.empleados.filter(e => e.Status === 'Activo');
    if (empleadosActivos.length === 0) {
        alert('⚠️ No hay empleados activos para pagar nómina');
        return;
    }

    nominaTemporal = empleadosActivos.map(emp => ({
        ID: emp.ID,
        Nombre: emp.Nombre,
        Cedula: emp.Cedula,
        TipoSueldo: emp.TipoSueldo,
        Sueldo: emp.SueldoUSD,
        Bono: 0,
        Deuda: 0,
        Neto: emp.SueldoUSD,
        Pagado: false
    }));

    renderizarNominaPagos();
    document.getElementById('tablaNominaContainer').style.display = 'block';
}

function renderizarNominaPagos() {
    const tbody = document.querySelector('#tablaNominaPagos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let totalPagar = 0;

    nominaTemporal.forEach((emp, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${emp.Nombre}</td>
            <td>${emp.Cedula}</td>
            <td>${emp.TipoSueldo}</td>
            <td>$${emp.Sueldo.toFixed(2)}</td>
            <td><input type="number" step="0.01" value="${emp.Bono}" onchange="actualizarNetoNomina(${index}, this.value, 'bono')" style="width:80px;padding:5px;"></td>
            <td><input type="number" step="0.01" value="${emp.Deuda}" onchange="actualizarNetoNomina(${index}, this.value, 'deuda')" style="width:80px;padding:5px;"></td>
            <td><strong>$${emp.Neto.toFixed(2)}</strong></td>
            <td><input type="checkbox" ${emp.Pagado ? 'checked' : ''} onchange="togglePagoNomina(${index})"></td>
            <td><button class="btn btn-danger" onclick="eliminarDeNomina(${index})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
        totalPagar += emp.Neto;
    });

    document.getElementById('totalNominaPagar').textContent = totalPagar.toFixed(2);
}

function actualizarNetoNomina(index, valor, tipo) {
    const val = parseFloat(valor) || 0;
    if (tipo === 'bono') {
        nominaTemporal[index].Bono = val;
    } else if (tipo === 'deuda') {
        nominaTemporal[index].Deuda = val;
    }
    nominaTemporal[index].Neto = nominaTemporal[index].Sueldo + nominaTemporal[index].Bono - nominaTemporal[index].Deuda;
    renderizarNominaPagos();
}

function togglePagoNomina(index) {
    nominaTemporal[index].Pagado = !nominaTemporal[index].Pagado;
}

function eliminarDeNomina(index) {
    nominaTemporal.splice(index, 1);
    renderizarNominaPagos();
}

function guardarNominaPagos() {
    const fechaPago = document.getElementById('nominaFechaPago').value;
    const cuentaOrigen = document.getElementById('nominaCuentaOrigen').value;
    
    if (!fechaPago) {
        alert('⚠️ Debes seleccionar la fecha de pago');
        return;
    }

    const pagosRealizados = nominaTemporal.filter(e => e.Pagado);

    if (pagosRealizados.length === 0) {
        alert('⚠️ Debes marcar al menos un empleado como pagado');
        return;
    }

    pagosRealizados.forEach(emp => {
        const pago = {
            ID: Date.now() + Math.random(),
            FechaPago: fechaPago,
            CuentaOrigen: cuentaOrigen,
            Nombre: emp.Nombre,
            Cedula: emp.Cedula,
            Tipo: emp.TipoSueldo,
            Sueldo: emp.Sueldo,
            Bono: emp.Bono,
            Deuda: emp.Deuda,
            Neto: emp.Neto,
            Status: 'Pagado'
        };
        DB.nominaPagos.push(pago);
    });

    guardarEnLocalStorage();
    renderizarHistorialNomina();
    actualizarDashboard();

    nominaTemporal = [];
    document.getElementById('tablaNominaContainer').style.display = 'none';

    alert(`✅ Nómina pagada correctamente. ${pagosRealizados.length} empleado(s) registrado(s).`);
}

function cancelarNomina() {
    if (confirm('¿Cancelar el pago de nómina?')) {
        nominaTemporal = [];
        document.getElementById('tablaNominaContainer').style.display = 'none';
    }
}

function renderizarHistorialNomina() {
    const tbody = document.querySelector('#tablaHistorialNomina tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.nominaPagos.forEach(pago => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pago.FechaPago}</td>
            <td>${pago.Nombre}</td>
            <td>${pago.Cedula}</td>
            <td>$${pago.Sueldo.toFixed(2)}</td>
            <td>$${pago.Bono.toFixed(2)}</td>
            <td>$${pago.Deuda.toFixed(2)}</td>
            <td><strong>$${pago.Neto.toFixed(2)}</strong></td>
            <td>${pago.CuentaOrigen}</td>
            <td>✅ ${pago.Status}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================
// BÚSQUEDA
// ============================================================
function realizarBusqueda() {
    const desde = document.getElementById('busqDesde').value;
    const hasta = document.getElementById('busqHasta').value;
    const filtro = document.getElementById('busqFiltro').value;
    const texto = document.getElementById('busqTexto').value.toLowerCase();
    let resultados = [];

    if (filtro === 'todos' || filtro === 'ingresos') {
        DB.ingresos.forEach(ing => {
            if (desde && ing.Fecha < desde) return;
            if (hasta && ing.Fecha > hasta) return;
            if (texto && !JSON.stringify(ing).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Ingreso', fecha: ing.Fecha, texto: `Total: $${ing.Total_USD} / Bs.${ing.Total_Bs}` });
        });
    }

    if (filtro === 'todos' || filtro === 'deudas') {
        DB.deudas.forEach(d => {
            if (desde && d.Fecha < desde) return;
            if (hasta && d.Fecha > hasta) return;
            if (texto && !JSON.stringify(d).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Deuda', fecha: d.Fecha, texto: `${d.Nombre} - $${d.MontoUSD}` });
        });
    }

    if (filtro === 'todos' || filtro === 'recordatorios') {
        DB.recordatorios.forEach(r => {
            if (desde && r.FechaRecordatorio < desde) return;
            if (hasta && r.FechaRecordatorio > hasta) return;
            if (texto && !JSON.stringify(r).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Recordatorio', fecha: r.FechaRecordatorio, texto: r.Descripcion });
        });
    }

    if (filtro === 'todos' || filtro === 'nomina') {
        DB.nominaPagos.forEach(p => {
            if (desde && p.FechaPago < desde) return;
            if (hasta && p.FechaPago > hasta) return;
            if (texto && !JSON.stringify(p).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Nómina', fecha: p.FechaPago, texto: `${p.Nombre} - $${p.Neto}` });
        });
    }

    const cont = document.getElementById('resultadosBusqueda');
    if (resultados.length === 0) {
        cont.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">Sin resultados</p>';
    } else {
        cont.innerHTML = `<p style="padding:10px;font-weight:600;">${resultados.length} resultado(s) encontrado(s)</p>` +
            resultados.map(r => `
                <div style="padding:10px;background:white;margin:5px 0;border-radius:6px;border-left:4px solid #667eea;">
                    <strong>${r.tipo}</strong> - ${r.fecha}<br>
                    ${r.texto}
                </div>
            `).join('');
    }
}

// ============================================================
// DASHBOARD
// ============================================================
function actualizarDashboard() {
    const totalIngresosUSD = DB.ingresos.reduce((sum, ing) => sum + ing.Total_USD, 0);
    const totalIngresosBS = DB.ingresos.reduce((sum, ing) => sum + ing.Total_Bs, 0);
    const totalDeudas = DB.deudas.filter(d => !d.Pagado).reduce((sum, d) => sum + d.SaldoPendiente, 0);
    const totalNomina = DB.nominaPagos.reduce((sum, p) => sum + p.Neto, 0);
    const recordatoriosPendientes = DB.recordatorios.filter(r => !r.Completado).length;

    document.getElementById('dashIngresos').textContent = `$${totalIngresosUSD.toFixed(2)} / Bs. ${totalIngresosBS.toFixed(2)}`;
    document.getElementById('dashDeudas').textContent = `$${totalDeudas.toFixed(2)}`;
    document.getElementById('dashNumDeudas').textContent = DB.deudas.filter(d => !d.Pagado).length;
    document.getElementById('dashNomina').textContent = `$${totalNomina.toFixed(2)}`;
    document.getElementById('dashNumEmpleados').textContent = DB.empleados.length;
    document.getElementById('dashRecordatorios').textContent = recordatoriosPendientes;
    document.getElementById('dashBalance').textContent = `$${(totalIngresosUSD - totalDeudas - totalNomina).toFixed(2)}`;
}

// ============================================================
// UTILIDADES
// ============================================================
function actualizarTasa() {
    DB.config.TasaBCV = parseFloat(document.getElementById('tasaBCV').value) || 0;
    const tasaInput = document.getElementById('recordatorioTasa');
    if (tasaInput) tasaInput.value = 'Bs. ' + DB.config.TasaBCV.toFixed(2);
    const ingresoTasa = document.getElementById('ingresoTasa');
    if (ingresoTasa) ingresoTasa.value = DB.config.TasaBCV;
    guardarEnLocalStorage();
}

function actualizarNegocio() {
    DB.config.NombreNegocio = document.getElementById('nombreNegocio').value;
    guardarEnLocalStorage();
}

function guardarNotas() {
    DB.notas = document.getElementById('notasRapidas').value;
    guardarEnLocalStorage();
    alert('✅ Notas guardadas');
}

// ============================================================
// LOCAL STORAGE
// ============================================================
function guardarEnLocalStorage() {
    localStorage.setItem('FinanzasProDB', JSON.stringify(DB));
}

function cargarDesdeLocalStorage() {
    const saved = localStorage.getItem('FinanzasProDB');
    if (saved) {
        DB = JSON.parse(saved);
        document.getElementById('tasaBCV').value = DB.config.TasaBCV;
        const tasaInput = document.getElementById('recordatorioTasa');
        if (tasaInput) tasaInput.value = 'Bs. ' + DB.config.TasaBCV.toFixed(2);
        document.getElementById('nombreNegocio').value = DB.config.NombreNegocio;
        document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD;
        document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD;
        document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD;
        document.getElementById('notasRapidas').value = DB.notas || '';
        
        renderizarIngresos();
        renderizarRecordatorios();
        renderizarDeudas();
        renderizarEmpleados();
        renderizarHistorialNomina();
        actualizarDashboard();
        actualizarListaProveedores();
    }
}

// ============================================================
// EXCEL
// ============================================================
function cargarExcelBtn() {
    document.getElementById('inputExcel').click();
}

function cargarExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type:'array'});
        
        DB.config = leerHojaConfig(wb, 'Config') || DB.config;
        DB.ingresos = leerHoja(wb, 'Ingresos') || [];
        DB.recordatorios = leerHoja(wb, 'Recordatorios') || [];
        DB.deudas = leerHoja(wb, 'Deudas') || [];
        DB.empleados = leerHoja(wb, 'Empleados') || [];
        DB.nominaPagos = leerHoja(wb, 'NominaPagos') || [];
        
        document.getElementById('tasaBCV').value = DB.config.TasaBCV;
        const tasaInput = document.getElementById('recordatorioTasa');
        if (tasaInput) tasaInput.value = 'Bs. ' + DB.config.TasaBCV.toFixed(2);
        document.getElementById('nombreNegocio').value = DB.config.NombreNegocio;
        document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD;
        document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD;
        document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD;
        
        guardarEnLocalStorage();
        renderizarIngresos();
        renderizarRecordatorios();
        renderizarDeudas();
        renderizarEmpleados();
        renderizarHistorialNomina();
        actualizarDashboard();
        actualizarListaProveedores();
        
        alert('✅ Excel cargado: ' + file.name);
    };
    reader.readAsArrayBuffer(file);
}

function leerHojaConfig(wb, nombre) {
    if (!wb.SheetNames.includes(nombre)) return {};
    const sheet = wb.Sheets[nombre];
    const json = XLSX.utils.sheet_to_json(sheet, {defval:''});
    const obj = {};
    json.forEach(r => obj[r.Clave] = r.Valor);
    return obj;
}

function leerHoja(wb, nombre) {
    if (!wb.SheetNames.includes(nombre)) return [];
    const sheet = wb.Sheets[nombre];
    return XLSX.utils.sheet_to_json(sheet, {defval:''});
}

function guardarExcel() {
    const wb = XLSX.utils.book_new();
    const configArr = [['Clave','Valor']];
    Object.entries(DB.config).forEach(([k,v]) => configArr.push([k,v]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configArr), 'Config');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.ingresos), 'Ingresos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.recordatorios), 'Recordatorios');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.deudas), 'Deudas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.empleados), 'Empleados');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.nominaPagos), 'NominaPagos');

    const nombre = (DB.config.NombreNegocio || 'FinanzasPro').replace(/\s+/g,'_');
    XLSX.writeFile(wb, `${nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ============================================================
// PDF
// ============================================================
function generarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('FinanzasPro - Respaldo Diario', 14, 20);

    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Negocio: ${DB.config.NombreNegocio}`, 14, 38);
    doc.text(`Tasa BCV: ${DB.config.TasaBCV}`, 14, 46);

    const tableData = DB.ingresos.map(ing => [
        ing.Fecha, ing.Total_USD.toFixed(2), ing.Total_Bs.toFixed(2),
        ing.SaldoFin_USD.toFixed(2), ing.SaldoFin_Bs.toFixed(2)
    ]);

    doc.autoTable({
        startY: 55,
        head: [['Fecha', 'Total USD', 'Total Bs', 'Saldo Final USD', 'Saldo Final Bs']],
        body: tableData,
    });

    doc.save(`FinanzasPro_Respaldo_${new Date().toISOString().split('T')[0]}.pdf`);
    alert('✅ PDF generado');
}

// ============================================================
// GOOGLE SHEETS
// ============================================================
function cambiarEstadoGS(estado, texto) {
    const dot = document.getElementById('estadoGS');
    const txt = document.getElementById('textoEstadoGS');
    dot.className = 'status-dot';

    if (estado === 'conectado') {
        dot.textContent = '';
        txt.textContent = '✅ Cargado y Conectado';
        GS_CONECTADO = true;
    } else if (estado === 'desconectado') {
        dot.textContent = '';
        txt.textContent = 'Desconectado - Pega tu URL para conectar';
        GS_CONECTADO = false;
    } else if (estado === 'cargando') {
        dot.textContent = '🟡';
        txt.textContent = texto || 'Conectando...';
        dot.classList.add('estado-cargando');
    } else if (estado === 'error') {
        dot.textContent = '⚠️';
        txt.textContent = 'Error: ' + texto;
        GS_CONECTADO = false;
    }
}

async function verificarConexion() {
    try {
        const res = await fetch(GS_URL + '?action=status');
        const data = await res.json();
        if (data.success) {
            cambiarEstadoGS('conectado');
        } else {
            cambiarEstadoGS('error', 'URL no válida');
        }
    } catch (err) {
        cambiarEstadoGS('error', 'No se puede conectar');
    }
}

function conectarGoogleSheets() {
    const url = document.getElementById('urlGoogleSheets').value.trim();
    if (!url) {
        alert('⚠️ Pega la URL de tu Apps Script (termina en /exec)');
        return;
    }
    if (!url.includes('/exec')) {
        alert('⚠️ La URL debe terminar en /exec');
        return;
    }
    GS_URL = url;
    localStorage.setItem('FinanzasPro_GS_URL', url);
    cambiarEstadoGS('cargando', 'Conectando...');
    verificarConexion();
}

function desconectarGoogleSheets() {
    if (confirm('¿Desconectar de Google Sheets? Los datos locales seguirán guardados.')) {
        GS_URL = '';
        GS_CONECTADO = false;
        localStorage.removeItem('FinanzasPro_GS_URL');
        document.getElementById('urlGoogleSheets').value = '';
        cambiarEstadoGS('desconectado');
    }
}

async function cargarDesdeSheets() {
    if (!GS_URL) {
        alert('⚠️ Primero conecta tu Google Sheet');
        return;
    }
    cambiarEstadoGS('cargando', 'Cargando datos...');

    try {
        const res = await fetch(GS_URL + '?action=load');
        const data = await res.json();
        
        if (data.success) {
            DB = data.data;
            
            if (DB.config) {
                document.getElementById('tasaBCV').value = DB.config.TasaBCV || 0;
                document.getElementById('nombreNegocio').value = DB.config.NombreNegocio || '';
                document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD || 0;
                document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD || 0;
                document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD || 0;
            }
            
            guardarEnLocalStorage();
            renderizarIngresos();
            renderizarRecordatorios();
            renderizarDeudas();
            renderizarEmpleados();
            renderizarHistorialNomina();
            actualizarDashboard();
            actualizarListaProveedores();
            
            cambiarEstadoGS('conectado');
            alert('✅ Datos cargados desde Google Sheets correctamente');
        } else {
            cambiarEstadoGS('error', data.error || 'Error al cargar');
        }
    } catch (err) {
        cambiarEstadoGS('error', err.message);
        alert('❌ Error al conectar: ' + err.message);
    }
}

async function guardarEnSheets() {
    if (!GS_URL) {
        alert('⚠️ Primero conecta tu Google Sheet');
        return;
    }
    cambiarEstadoGS('cargando', 'Guardando en la nube...');

    try {
        await fetch(GS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save',
                data: DB
            })
        });
        
        cambiarEstadoGS('conectado');
        alert('✅ Datos guardados en Google Sheets correctamente');
    } catch (err) {
        cambiarEstadoGS('error', err.message);
        alert('❌ Error al guardar: ' + err.message);
    }
}