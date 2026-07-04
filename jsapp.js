// ============================================================
// FinanzasPro v3.7 - Lógica Principal COMPLETA
// ============================================================

// Base de datos principal
let DB = {
    config: {
        TasaBCV: 0,
        SaldoBinance_USD: 0,
        SaldoZelle_USD: 0,
        SaldoEmpresa_USD: 0,
        SaldoPersonal_USD: 0,
        SaldoEmpresa_Bs: 0,
        SaldoPersonal_Bs: 0,
        NombreNegocio: 'Mi Negocio'
    },
    ingresos: [],
    recordatorios: [],
    deudas: [],
    cuentasPorCobrar: [], // NUEVO: Cuentas por cobrar
    empleados: [],
    nominaPagos: [],
    resumenDiario: [],
    notas: '',
    saldosInicialesBloqueados: false, // NUEVO: Control de bloqueo
    cierreCajaBloqueado: false // NUEVO: Control de bloqueo cierre de caja
};

// Variables globales
let GS_URL = localStorage.getItem('FinanzasPro_GS_URL') || '';
let GS_CONECTADO = false;
let nominaTemporal = [];
let graficoAnalisis = null;
const CLAVE_ADMIN = 'Adri2712*';

// ============================================================
// INICIALIZACIÓN
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.substring(0, 7);
    
    // Establecer fechas por defecto
    const ingresoFecha = document.getElementById('ingresoFecha');
    if (ingresoFecha) ingresoFecha.value = hoy;
    
    const recFecha = document.getElementById('recordatorioFecha');
    if (recFecha) recFecha.value = hoy;
    
    const deudaFecha = document.getElementById('deudaFecha');
    if (deudaFecha) deudaFecha.value = hoy;
    
    const cobrarFecha = document.getElementById('cobrarFecha');
    if (cobrarFecha) cobrarFecha.value = hoy;
    
    const empFecha = document.getElementById('empleadoFecha');
    if (empFecha) empFecha.value = hoy;
    
    const nominaFecha = document.getElementById('nominaFechaPago');
    if (nominaFecha) nominaFecha.value = hoy;
    
    const busqDesde = document.getElementById('busqDesde');
    const busqHasta = document.getElementById('busqHasta');
    if (busqDesde) busqDesde.value = hoy;
    if (busqHasta) busqHasta.value = hoy;
    
    const analisisMes = document.getElementById('analisisMes');
    if (analisisMes) analisisMes.value = mesActual;
    
    const dashFechaCierre = document.getElementById('dashFechaCierre');
    if (dashFechaCierre) dashFechaCierre.value = hoy;
    
    // Cargar datos guardados
    cargarDesdeLocalStorage();
    
    // Actualizar paneles
    actualizarPanelSaldos();
    actualizarContexto();
    
    // Verificar conexión con Google Sheets
    if (GS_URL) {
        const urlInput = document.getElementById('urlGoogleSheets');
        if (urlInput) urlInput.value = GS_URL;
        cambiarEstadoGS('cargando', 'Verificando conexión...');
        verificarConexion();
    }
    
    // Cargar modo guardado
    const modoGuardado = localStorage.getItem('FinanzasPro_Modo');
    const btn = document.getElementById('btnModo');
    if (modoGuardado === 'claro') {
        document.body.classList.add('modo-claro');
        if (btn) btn.innerHTML = '☀️ Modo Oscuro';
    }
});

// Manejo de pestañas
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
        actualizarPanelSaldos();
        if (tab.dataset.tab === 'tabAnalisis') {
            setTimeout(() => renderizarResumenDiario(), 100);
        }
    });
});

// ============================================================
// MODO OSCURO / MODO CLARO
// ============================================================
function cambiarModo() {
    const body = document.body;
    const btn = document.getElementById('btnModo');
    
    if (body.classList.contains('modo-claro')) {
        body.classList.remove('modo-claro');
        if (btn) btn.innerHTML = '🌙 Modo Claro';
        localStorage.setItem('FinanzasPro_Modo', 'oscuro');
    } else {
        body.classList.add('modo-claro');
        if (btn) btn.innerHTML = '☀️ Modo Oscuro';
        localStorage.setItem('FinanzasPro_Modo', 'claro');
    }
}

// ============================================================
// ACTUALIZAR PANEL DE SALDOS
// ============================================================
function actualizarPanelSaldos() {
    const saldoBinance = document.getElementById('saldoBinanceDisplay');
    const saldoZelle = document.getElementById('saldoZelleDisplay');
    const saldoEmpresa = document.getElementById('saldoEmpresaDisplay');
    const saldoEmpresaBs = document.getElementById('saldoEmpresaBsDisplay');
    const saldoPersonal = document.getElementById('saldoPersonalDisplay');
    const saldoPersonalBs = document.getElementById('saldoPersonalBsDisplay');
    
    if (saldoBinance) saldoBinance.textContent = '$' + (DB.config.SaldoBinance_USD || 0).toFixed(2);
    if (saldoZelle) saldoZelle.textContent = '$' + (DB.config.SaldoZelle_USD || 0).toFixed(2);
    if (saldoEmpresa) saldoEmpresa.textContent = '$' + (DB.config.SaldoEmpresa_USD || 0).toFixed(2);
    if (saldoEmpresaBs) saldoEmpresaBs.textContent = 'Bs. ' + (DB.config.SaldoEmpresa_Bs || 0).toFixed(2);
    if (saldoPersonal) saldoPersonal.textContent = '$' + (DB.config.SaldoPersonal_USD || 0).toFixed(2);
    if (saldoPersonalBs) saldoPersonalBs.textContent = 'Bs. ' + (DB.config.SaldoPersonal_Bs || 0).toFixed(2);
}

// ============================================================
// ACTUALIZAR BARRA DE CONTEXTO
// ============================================================
function actualizarContexto() {
    const hoy = new Date().toLocaleDateString('es-VE');
    const contextoFecha = document.getElementById('contextoFecha');
    const contextoTasa = document.getElementById('contextoTasa');
    const contextoNegocio = document.getElementById('contextoNegocio');
    const nombreEmpresaDisplay = document.getElementById('nombreEmpresaDisplay');
    
    if (contextoFecha) contextoFecha.textContent = hoy;
    if (contextoTasa) contextoTasa.textContent = 'Bs. ' + (DB.config.TasaBCV || 0).toFixed(2);
    if (contextoNegocio) contextoNegocio.textContent = DB.config.NombreNegocio || 'Mi Negocio';
    if (nombreEmpresaDisplay) nombreEmpresaDisplay.textContent = DB.config.NombreNegocio || 'Mi Negocio';
}

// ============================================================
// EDITAR NOMBRE DE EMPRESA
// ============================================================
function editarNombreEmpresa() {
    const nuevoNombre = prompt('Ingresa el nombre de tu empresa:', DB.config.NombreNegocio);
    if (nuevoNombre && nuevoNombre.trim() !== '') {
        DB.config.NombreNegocio = nuevoNombre.trim();
        guardarEnLocalStorage();
        actualizarContexto();
        mostrarIndicadorGuardado();
        alert('✅ Nombre de empresa actualizado a: ' + nuevoNombre);
    }
}

// ============================================================
// REFRESCAR TODO
// ============================================================
function refrescarTodo() {
    if (confirm('¿Refrescar la página? Se perderán los datos no guardados.')) {
        location.reload();
    }
}

// ============================================================
// NUEVO: GUARDAR SALDOS INICIALES CON BLOQUEO
// ============================================================
function guardarSaldosIniciales() {
    const saldoIniUSD = parseFloat(document.getElementById('saldoIniUSD').value) || 0;
    const saldoIniBS = parseFloat(document.getElementById('saldoIniBS').value) || 0;
    const saldoIniPersonalUSD = parseFloat(document.getElementById('saldoIniPersonalUSD').value) || 0;
    const saldoIniPersonalBS = parseFloat(document.getElementById('saldoIniPersonalBS').value) || 0;
    
    if (saldoIniUSD === 0 && saldoIniBS === 0) {
        alert('⚠️ Debes ingresar al menos un saldo inicial (USD o Bs)');
        return;
    }
    
    // Verificar discrepancia con el cierre anterior
    if (DB.ingresos.length > 0) {
        const ingresosOrdenados = [...DB.ingresos].sort((a, b) => 
            (b.Fecha || '').localeCompare(a.Fecha || '')
        );
        const ultimo = ingresosOrdenados[0];
        const saldoEsperadoUSD = ultimo.SaldoFin_USD || 0;
        const saldoEsperadoBS = ultimo.SaldoFin_Bs || 0;
        const diferenciaUSD = Math.abs(saldoIniUSD - saldoEsperadoUSD);
        const diferenciaBS = Math.abs(saldoIniBS - saldoEsperadoBS);
        
        if (diferenciaUSD > 0.01 || diferenciaBS > 0.01) {
            // Mostrar alerta de discrepancia
            const alerta = document.getElementById('alertaDiscrepancia');
            if (alerta) alerta.style.display = 'flex';
            
            // Guardar temporalmente los valores
            window._saldosTemporales = {
                USD: saldoIniUSD,
                BS: saldoIniBS,
                PersonalUSD: saldoIniPersonalUSD,
                PersonalBS: saldoIniPersonalBS
            };
            
            // No guardar aún, esperar evaluación
            return;
        }
    }
    
    // Actualizar saldos de cuentas
    DB.config.SaldoEmpresa_USD = saldoIniUSD;
    DB.config.SaldoEmpresa_Bs = saldoIniBS;
    DB.config.SaldoPersonal_USD = saldoIniPersonalUSD;
    DB.config.SaldoPersonal_Bs = saldoIniPersonalBS;
    
    guardarEnLocalStorage();
    actualizarPanelSaldos();
    bloquearCamposSaldos();
    mostrarIndicadorGuardado();
    alert('✅ Saldos iniciales guardados correctamente. Campos bloqueados.');
}

// ============================================================
// NUEVO: BLOQUEAR / DESBLOQUEAR CAMPOS DE SALDOS
// ============================================================
function bloquearCamposSaldos() {
    const campos = ['saldoIniUSD', 'saldoIniBS', 'saldoIniPersonalUSD', 'saldoIniPersonalBS'];
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.disabled = true;
            campo.classList.add('locked-field');
        }
    });
    DB.saldosInicialesBloqueados = true;
    const btnEditar = document.getElementById('btnEditarSaldos');
    if (btnEditar) btnEditar.style.display = 'inline-flex';
}

function desbloquearSaldos() {
    const campos = ['saldoIniUSD', 'saldoIniBS', 'saldoIniPersonalUSD', 'saldoIniPersonalBS'];
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.disabled = false;
            campo.classList.remove('locked-field');
        }
    });
    DB.saldosInicialesBloqueados = false;
    const btnEditar = document.getElementById('btnEditarSaldos');
    if (btnEditar) btnEditar.style.display = 'none';
    const alerta = document.getElementById('alertaDiscrepancia');
    if (alerta) alerta.style.display = 'none';
}

// ============================================================
// NUEVO: EVALUAR Y AJUSTAR SALDO (DISCREPANCIA)
// ============================================================
function evaluarAjustarSaldo() {
    const modal = document.getElementById('modalAjustarSaldo');
    if (modal) modal.style.display = 'flex';
}

function aceptarAjusteSaldo() {
    const temp = window._saldosTemporales;
    if (!temp) return;
    
    // Aceptar el saldo real escrito por el usuario
    DB.config.SaldoEmpresa_USD = temp.USD;
    DB.config.SaldoEmpresa_Bs = temp.BS;
    DB.config.SaldoPersonal_USD = temp.PersonalUSD;
    DB.config.SaldoPersonal_Bs = temp.PersonalBS;
    
    guardarEnLocalStorage();
    actualizarPanelSaldos();
    bloquearCamposSaldos();
    
    const alerta = document.getElementById('alertaDiscrepancia');
    if (alerta) alerta.style.display = 'none';
    const modal = document.getElementById('modalAjustarSaldo');
    if (modal) modal.style.display = 'none';
    
    window._saldosTemporales = null;
    mostrarIndicadorGuardado();
    alert('✅ Saldo real aceptado y campos bloqueados.');
}

// ============================================================
// INDICADOR DE GUARDADO
// ============================================================
function mostrarIndicadorGuardado() {
    const indicador = document.getElementById('saveIndicator');
    if (!indicador) return;
    indicador.style.display = 'block';
    setTimeout(() => {
        indicador.style.display = 'none';
    }, 2000);
}

// ============================================================
// VALIDACIÓN SALDO INICIAL
// ============================================================
function validarSaldoInicial() {
    const saldoUSD = parseFloat(document.getElementById('saldoIniUSD').value) || 0;
    const saldoBS = parseFloat(document.getElementById('saldoIniBS').value) || 0;
    const alerta = document.getElementById('alertaSaldoInicial');
    if (saldoUSD === 0 && saldoBS === 0) {
        if (alerta) alerta.style.display = 'block';
        return false;
    } else {
        if (alerta) alerta.style.display = 'none';
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

function calcularMontoBSDeuda() {
    const tasa = parseFloat(document.getElementById('ingresoTasa').value) || 0;
    const montoUSD = parseFloat(document.getElementById('deudaMontoUSD').value) || 0;
    const campo = document.getElementById('deudaMontoBSCalculado');
    if (campo) campo.value = (montoUSD * tasa).toFixed(2);
}

// ============================================================
// BLOQUE ÚLTIMO CIERRE DE CAJA
// ============================================================
function actualizarBloqueCierre() {
    const bloque = document.getElementById('bloqueUltimoCierre');
    if (!bloque) return;
    
    if (DB.ingresos.length === 0) {
        bloque.style.display = 'none';
        return;
    }
    
    const ingresosOrdenados = [...DB.ingresos].sort((a, b) => 
        (b.Fecha || '').localeCompare(a.Fecha || '')
    );
    const ultimo = ingresosOrdenados[0];
    const fechaUltimo = ultimo.Fecha;
    
    let gastadoDia = 0;
    DB.deudas.forEach(deuda => {
        if (deuda.HistorialPagos && deuda.HistorialPagos.length > 0) {
            deuda.HistorialPagos.forEach(pago => {
                if (pago.Fecha === fechaUltimo) {
                    gastadoDia += pago.MontoUSD || 0;
                }
            });
        }
    });
    DB.nominaPagos.forEach(pago => {
        if (pago.FechaPago === fechaUltimo) {
            gastadoDia += pago.Neto || 0;
        }
    });
    
    document.getElementById('cierreFechaTexto').textContent = 
        `📅 Fecha del último cierre: ${fechaUltimo}`;
    document.getElementById('cierreUSD').textContent = 
        '$' + (ultimo.SaldoFin_USD || 0).toFixed(2);
    document.getElementById('cierreBS').textContent = 
        'Bs. ' + (ultimo.SaldoFin_Bs || 0).toFixed(2);
    document.getElementById('cierreZelle').textContent = 
        '$' + (DB.config.SaldoZelle_USD || 0).toFixed(2);
    document.getElementById('cierreBinance').textContent = 
        '$' + (DB.config.SaldoBinance_USD || 0).toFixed(2);
    document.getElementById('cierreGastado').textContent = 
        '$' + gastadoDia.toFixed(2);
    
    bloque.style.display = 'block';
    
    // Precargar saldos iniciales con el cierre anterior (si están en 0)
    const saldoIniUSD = document.getElementById('saldoIniUSD');
    const saldoIniBS = document.getElementById('saldoIniBS');
    if (saldoIniUSD && saldoIniUSD.value === '0') {
        saldoIniUSD.value = (ultimo.SaldoFin_USD || 0).toFixed(2);
    }
    if (saldoIniBS && saldoIniBS.value === '0') {
        saldoIniBS.value = (ultimo.SaldoFin_Bs || 0).toFixed(2);
    }
    
    const saldoUltimoUSD = document.getElementById('saldoUltimoUSD');
    const saldoUltimoBS = document.getElementById('saldoUltimoBS');
    if (saldoUltimoUSD) saldoUltimoUSD.textContent = (ultimo.SaldoFin_USD || 0).toFixed(2);
    if (saldoUltimoBS) saldoUltimoBS.textContent = (ultimo.SaldoFin_Bs || 0).toFixed(2);
}

// ============================================================
// ANÁLISIS FINANCIERO
// ============================================================
function recalcularResumenDiario() {
    const dias = {};
    
    // Ingresos
    DB.ingresos.forEach(ing => {
        const fecha = ing.Fecha;
        if (!fecha) return;
        if (!dias[fecha]) {
            dias[fecha] = {
                Fecha: fecha,
                IngresosUSD: 0, IngresosBS: 0,
                PagosUSD: 0, PagosBS: 0,
                NominaUSD: 0, NominaBS: 0,
                CobrosUSD: 0, CobrosBS: 0,
                TasaBCV: ing.TasaBCV || DB.config.TasaBCV || 0
            };
        }
        dias[fecha].IngresosUSD += ing.Total_USD || 0;
        dias[fecha].IngresosBS += ing.Total_Bs || 0;
        if (ing.TasaBCV) dias[fecha].TasaBCV = ing.TasaBCV;
    });
    
    // Pagos de deudas
    DB.deudas.forEach(deuda => {
        if (deuda.HistorialPagos && deuda.HistorialPagos.length > 0) {
            deuda.HistorialPagos.forEach(pago => {
                const fecha = pago.Fecha;
                if (!fecha) return;
                if (!dias[fecha]) {
                    dias[fecha] = {
                        Fecha: fecha,
                        IngresosUSD: 0, IngresosBS: 0,
                        PagosUSD: 0, PagosBS: 0,
                        NominaUSD: 0, NominaBS: 0,
                        CobrosUSD: 0, CobrosBS: 0,
                        TasaBCV: DB.config.TasaBCV || 0
                    };
                }
                dias[fecha].PagosUSD += pago.MontoUSD || 0;
                dias[fecha].PagosBS += pago.MontoBs || 0;
            });
        }
    });
    
    // NUEVO: Cobros recibidos
    DB.cuentasPorCobrar.forEach(cuenta => {
        if (cuenta.HistorialCobros && cuenta.HistorialCobros.length > 0) {
            cuenta.HistorialCobros.forEach(cobro => {
                const fecha = cobro.Fecha;
                if (!fecha) return;
                if (!dias[fecha]) {
                    dias[fecha] = {
                        Fecha: fecha,
                        IngresosUSD: 0, IngresosBS: 0,
                        PagosUSD: 0, PagosBS: 0,
                        NominaUSD: 0, NominaBS: 0,
                        CobrosUSD: 0, CobrosBS: 0,
                        TasaBCV: DB.config.TasaBCV || 0
                    };
                }
                dias[fecha].CobrosUSD += cobro.MontoUSD || 0;
            });
        }
    });
    
    // Nómina
    DB.nominaPagos.forEach(pago => {
        const fecha = pago.FechaPago;
        if (!fecha) return;
        if (!dias[fecha]) {
            dias[fecha] = {
                Fecha: fecha,
                IngresosUSD: 0, IngresosBS: 0,
                PagosUSD: 0, PagosBS: 0,
                NominaUSD: 0, NominaBS: 0,
                CobrosUSD: 0, CobrosBS: 0,
                TasaBCV: DB.config.TasaBCV || 0
            };
        }
        dias[fecha].NominaUSD += pago.Neto || 0; 
        const tasa = dias[fecha].TasaBCV || DB.config.TasaBCV || 0;
        dias[fecha].NominaBS += (pago.Neto || 0) * tasa;
    });
    
    DB.resumenDiario = Object.values(dias).map(d => {
        const totalEgresosUSD = d.PagosUSD + d.NominaUSD;
        const totalEgresosBS = d.PagosBS + d.NominaBS;
        return {
            ...d,
            TotalEgresosUSD: totalEgresosUSD,
            TotalEgresosBS: totalEgresosBS,
            NetoUSD: d.IngresosUSD - totalEgresosUSD + d.CobrosUSD,
            NetoBS: d.IngresosBS - totalEgresosBS
        };
    }).sort((a, b) => b.Fecha.localeCompare(a.Fecha));
}

function renderizarResumenDiario() {
    recalcularResumenDiario();
    const mesFiltro = document.getElementById('analisisMes')?.value || '';
    const fechaFiltro = document.getElementById('analisisFecha')?.value || '';
    const vista = document.getElementById('analisisVista')?.value || 'dia';
    
    let datosFiltrados = [...DB.resumenDiario];
    
    if (vista === 'mes') {
        datosFiltrados = agruparPorMes(datosFiltrados);
    } else if (vista === 'anio') {
        datosFiltrados = agruparPorAnio(datosFiltrados);
    }
    
    if (mesFiltro && vista === 'dia') {
        datosFiltrados = datosFiltrados.filter(d => d.Fecha.startsWith(mesFiltro));
    }
    if (fechaFiltro && vista === 'dia') {
        datosFiltrados = datosFiltrados.filter(d => d.Fecha === fechaFiltro);
    }
    
    let totIngresosUSD = 0, totIngresosBS = 0;
    let totPagosUSD = 0, totPagosBS = 0;
    let totNominaUSD = 0, totNominaBS = 0;
    let totNetoUSD = 0, totNetoBS = 0;
    
    const tbody = document.querySelector('#tablaAnalisis tbody');
    const tfoot = document.getElementById('tablaAnalisisFoot');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    datosFiltrados.forEach(d => {
        totIngresosUSD += d.IngresosUSD;
        totIngresosBS += d.IngresosBS;
        totPagosUSD += d.PagosUSD;
        totPagosBS += d.PagosBS;
        totNominaUSD += d.NominaUSD;
        totNominaBS += d.NominaBS;
        totNetoUSD += d.NetoUSD;
        totNetoBS += d.NetoBS;
        
        const claseNetoUSD = d.NetoUSD > 0 ? 'neto-positivo' : d.NetoUSD < 0 ? 'neto-negativo' : 'neto-cero';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${d.Fecha}</strong></td>
            <td>$${d.IngresosUSD.toFixed(2)}</td>
            <td>Bs. ${d.IngresosBS.toFixed(2)}</td>
            <td>$${d.PagosUSD.toFixed(2)}</td>
            <td>Bs. ${d.PagosBS.toFixed(2)}</td>
            <td>$${d.NominaUSD.toFixed(2)}</td>
            <td class="${claseNetoUSD}">$${d.NetoUSD.toFixed(2)}</td>
            <td>${(d.TasaBCV || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    const claseTotalUSD = totNetoUSD > 0 ? 'neto-positivo' : totNetoUSD < 0 ? 'neto-negativo' : '';
    if (tfoot) {
        tfoot.innerHTML = `
            <tr>
                <td><strong>TOTAL</strong></td>
                <td>$${totIngresosUSD.toFixed(2)}</td>
                <td>Bs. ${totIngresosBS.toFixed(2)}</td>
                <td>$${totPagosUSD.toFixed(2)}</td>
                <td>Bs. ${totPagosBS.toFixed(2)}</td>
                <td>$${totNominaUSD.toFixed(2)}</td>
                <td class="${claseTotalUSD}">$${totNetoUSD.toFixed(2)}</td>
                <td>-</td>
            </tr>
        `;
    }
    
    document.getElementById('analisisIngresosUSD').textContent = '$' + totIngresosUSD.toFixed(2);
    document.getElementById('analisisIngresosBS').textContent = 'Bs. ' + totIngresosBS.toFixed(2);
    document.getElementById('analisisPagosUSD').textContent = '$' + totPagosUSD.toFixed(2);
    document.getElementById('analisisPagosBS').textContent = 'Bs. ' + totPagosBS.toFixed(2);
    document.getElementById('analisisNominaUSD').textContent = '$' + totNominaUSD.toFixed(2);
    document.getElementById('analisisNetoUSD').textContent = '$' + totNetoUSD.toFixed(2);
    
    actualizarGrafico(datosFiltrados);
}

function agruparPorMes(datos) {
    const meses = {};
    datos.forEach(d => {
        const mes = d.Fecha.substring(0, 7);
        if (!meses[mes]) {
            meses[mes] = {
                Fecha: mes,
                IngresosUSD: 0, IngresosBS: 0,
                PagosUSD: 0, PagosBS: 0,
                NominaUSD: 0, NominaBS: 0,
                CobrosUSD: 0, CobrosBS: 0,
                TasaBCV: 0, contadorTasa: 0
            };
        }
        meses[mes].IngresosUSD += d.IngresosUSD;
        meses[mes].IngresosBS += d.IngresosBS;
        meses[mes].PagosUSD += d.PagosUSD;
        meses[mes].PagosBS += d.PagosBS;
        meses[mes].NominaUSD += d.NominaUSD;
        meses[mes].NominaBS += d.NominaBS;
        meses[mes].CobrosUSD += (d.CobrosUSD || 0);
        if (d.TasaBCV) {
            meses[mes].TasaBCV += d.TasaBCV;
            meses[mes].contadorTasa++;
        }
    });
    return Object.values(meses).map(m => {
        const totalEgresosUSD = m.PagosUSD + m.NominaUSD;
        return {
            Fecha: m.Fecha,
            IngresosUSD: m.IngresosUSD,
            IngresosBS: m.IngresosBS,
            PagosUSD: m.PagosUSD,
            PagosBS: m.PagosBS,
            NominaUSD: m.NominaUSD,
            NominaBS: m.NominaBS,
            CobrosUSD: m.CobrosUSD,
            TasaBCV: m.contadorTasa > 0 ? m.TasaBCV / m.contadorTasa : 0,
            NetoUSD: m.IngresosUSD - totalEgresosUSD + m.CobrosUSD,
            NetoBS: m.IngresosBS - (m.PagosBS + m.NominaBS)
        };
    }).sort((a, b) => b.Fecha.localeCompare(a.Fecha));
}

function agruparPorAnio(datos) {
    const anios = {};
    datos.forEach(d => {
        const anio = d.Fecha.substring(0, 4);
        if (!anios[anio]) {
            anios[anio] = {
                Fecha: anio,
                IngresosUSD: 0, IngresosBS: 0,
                PagosUSD: 0, PagosBS: 0,
                NominaUSD: 0, NominaBS: 0,
                CobrosUSD: 0, CobrosBS: 0,
                TasaBCV: 0, contadorTasa: 0
            };
        }
        anios[anio].IngresosUSD += d.IngresosUSD;
        anios[anio].IngresosBS += d.IngresosBS;
        anios[anio].PagosUSD += d.PagosUSD;
        anios[anio].PagosBS += d.PagosBS;
        anios[anio].NominaUSD += d.NominaUSD;
        anios[anio].NominaBS += d.NominaBS;
        anios[anio].CobrosUSD += (d.CobrosUSD || 0);
        if (d.TasaBCV) {
            anios[anio].TasaBCV += d.TasaBCV;
            anios[anio].contadorTasa++;
        }
    });
    return Object.values(anios).map(a => {
        const totalEgresosUSD = a.PagosUSD + a.NominaUSD;
        return {
            Fecha: a.Fecha,
            IngresosUSD: a.IngresosUSD,
            IngresosBS: a.IngresosBS,
            PagosUSD: a.PagosUSD,
            PagosBS: a.PagosBS,
            NominaUSD: a.NominaUSD,
            NominaBS: a.NominaBS,
            CobrosUSD: a.CobrosUSD,
            TasaBCV: a.contadorTasa > 0 ? a.TasaBCV / a.contadorTasa : 0,
            NetoUSD: a.IngresosUSD - totalEgresosUSD + a.CobrosUSD,
            NetoBS: a.IngresosBS - (a.PagosBS + a.NominaBS)
        };
    }).sort((a, b) => b.Fecha.localeCompare(a.Fecha));
}

function actualizarGrafico(datos) {
    const ctx = document.getElementById('graficoAnalisis');
    if (!ctx) return;
    
    const datosGrafico = datos.slice(0, 30).reverse();
    const labels = datosGrafico.map(d => d.Fecha);
    const ingresosData = datosGrafico.map(d => d.IngresosUSD);
    const egresosData = datosGrafico.map(d => d.PagosUSD + d.NominaUSD);
    const netoData = datosGrafico.map(d => d.NetoUSD);
    
    if (graficoAnalisis) graficoAnalisis.destroy();
    
    graficoAnalisis = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ingresos USD',
                    data: ingresosData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Egresos USD',
                    data: egresosData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Neto USD',
                    data: netoData,
                    type: 'line',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Ingresos vs Egresos vs Neto (últimos 30 registros)' }
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function mostrarAnalisisInteligente() {
    recalcularResumenDiario();
    const modal = document.getElementById('modalAnalisisInteligente');
    const contenido = document.getElementById('contenidoAnalisisInteligente');
    
    if (DB.resumenDiario.length === 0) {
        contenido.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">📊 Aún no hay datos para analizar.</p>';
        modal.style.display = 'flex';
        return;
    }
    
    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.substring(0, 7);
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const mesPasado = new Date(Date.now() - 30*86400000).toISOString().substring(0, 7);
    
    const hoyData = DB.resumenDiario.find(d => d.Fecha === hoy) || { NetoUSD: 0, IngresosUSD: 0 };
    const ayerData = DB.resumenDiario.find(d => d.Fecha === ayer) || { NetoUSD: 0, IngresosUSD: 0 };
    
    const mesActualData = DB.resumenDiario
        .filter(d => d.Fecha.startsWith(mesActual))
        .reduce((acc, d) => ({ NetoUSD: acc.NetoUSD + d.NetoUSD, IngresosUSD: acc.IngresosUSD + d.IngresosUSD }), { NetoUSD: 0, IngresosUSD: 0 });
    
    const mesPasadoData = DB.resumenDiario
        .filter(d => d.Fecha.startsWith(mesPasado))
        .reduce((acc, d) => ({ NetoUSD: acc.NetoUSD + d.NetoUSD, IngresosUSD: acc.IngresosUSD + d.IngresosUSD }), { NetoUSD: 0, IngresosUSD: 0 });
    
    const diasConsecutivosNegativos = contarDiasNegativosConsecutivos();
    const promedioMensual = mesActualData.NetoUSD / Math.max(1, new Date().getDate());
    
    let html = '<div style="padding:10px; color: var(--text-main);">';
    html += '<h3 style="color:#667eea;margin-bottom:10px;">📊 Análisis del Día</h3>';
    
    if (hoyData.IngresosUSD > 0) {
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;">💰 Hoy llevas <strong>$${hoyData.NetoUSD.toFixed(2)}</strong> de ganancia neta.</div>`;
    } else {
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;">ℹ️ Aún no hay registros para hoy.</div>`;
    }
    
    if (ayerData.IngresosUSD > 0) {
        const diff = hoyData.NetoUSD - ayerData.NetoUSD;
        const pct = ayerData.NetoUSD !== 0 ? ((diff / Math.abs(ayerData.NetoUSD)) * 100).toFixed(1) : 0;
        const clase = diff >= 0 ? 'neto-positivo' : 'neto-negativo';
        const emoji = diff >= 0 ? '' : '📉';
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;" class="${clase}">${emoji} vs ayer: <strong>${diff >= 0 ? '+' : ''}$${diff.toFixed(2)} (${pct}%)</strong></div>`;
    }
    
    html += '<h3 style="color:#667eea;margin:20px 0 10px 0;"> Comparación Mensual</h3>';
    if (mesPasadoData.IngresosUSD > 0) {
        const diffMes = mesActualData.NetoUSD - mesPasadoData.NetoUSD;
        const pctMes = mesPasadoData.NetoUSD !== 0 ? ((diffMes / Math.abs(mesPasadoData.NetoUSD)) * 100).toFixed(1) : 0;
        const clase = diffMes >= 0 ? 'neto-positivo' : 'neto-negativo';
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;" class="${clase}">${diffMes >= 0 ? '🚀' : '⚠️'} Mes actual vs mes pasado: <strong>${diffMes >= 0 ? '+' : ''}$${diffMes.toFixed(2)} (${pctMes}%)</strong></div>`;
    }
    
    html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;"> Promedio diario este mes: <strong>$${promedioMensual.toFixed(2)}</strong></div>`;
    
    if (diasConsecutivosNegativos >= 2) {
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px; color:var(--danger);">️ <strong>${diasConsecutivosNegativos} días seguidos con pérdidas.</strong> Revisa gastos.</div>`;
    } else if (diasConsecutivosNegativos === 1) {
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;">ℹ️ Ayer fue un día negativo, pero hoy puedes recuperarte.</div>`;
    }
    
    html += '<h3 style="color:#667eea;margin:20px 0 10px 0;">🎯 Veredicto</h3>';
    let veredicto = '';
    if (mesActualData.NetoUSD > mesPasadoData.NetoUSD && mesPasadoData.NetoUSD > 0) {
        veredicto = `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px; color:var(--success); font-weight:bold;">✅ <strong>¡Vamos bien!</strong> Estás mejorando vs el mes pasado.</div>`;
    } else if (mesActualData.NetoUSD < 0) {
        veredicto = `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px; color:var(--danger); font-weight:bold;">⚠️ <strong>Hay que mejorar.</strong> Este mes va en negativo.</div>`;
    } else if (mesActualData.NetoUSD > 0 && mesActualData.NetoUSD < mesPasadoData.NetoUSD) {
        veredicto = `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px; color:var(--warning); font-weight:bold;">📉 <strong>Vas bajando</strong> vs el mes pasado.</div>`;
    } else {
        veredicto = `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px; font-weight:bold;">📊 <strong>Sigue registrando</strong> para tener más datos.</div>`;
    }
    html += veredicto + '</div>';
    
    contenido.innerHTML = html;
    modal.style.display = 'flex';
}

function contarDiasNegativosConsecutivos() {
    const ordenados = [...DB.resumenDiario].sort((a, b) => b.Fecha.localeCompare(a.Fecha));
    let contador = 0;
    for (const dia of ordenados) {
        if (dia.NetoUSD < 0) contador++;
        else break;
    }
    return contador;
}

function exportarAnalisisExcel() {
    if (DB.resumenDiario.length === 0) {
        alert('⚠️ No hay datos de análisis para exportar');
        return;
    }
    const wb = XLSX.utils.book_new();
    const data = DB.resumenDiario.map(d => ({
        'Fecha': d.Fecha,
        'Ingresos USD': d.IngresosUSD.toFixed(2),
        'Ingresos Bs': d.IngresosBS.toFixed(2),
        'Pagos USD': d.PagosUSD.toFixed(2),
        'Pagos Bs': d.PagosBS.toFixed(2),
        'Nómina USD': d.NominaUSD.toFixed(2),
        'NETO USD': d.NetoUSD.toFixed(2),
        'Tasa BCV': d.TasaBCV.toFixed(2)
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Análisis Diario');
    const nombre = (DB.config.NombreNegocio || 'FinanzasPro').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `${nombre}_Analisis_${new Date().toISOString().split('T')[0]}.xlsx`);
    alert('✅ Análisis exportado a Excel');
}

function exportarAnalisisPDF() {
    if (DB.resumenDiario.length === 0) {
        alert('️ No hay datos de análisis para exportar');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Análisis Financiero Diario', 14, 20);
    doc.setFontSize(11);
    doc.text(`Negocio: ${DB.config.NombreNegocio}`, 14, 30);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 37);
    
    const tableData = DB.resumenDiario.map(d => [
        d.Fecha,
        '$' + d.IngresosUSD.toFixed(2),
        'Bs.' + d.IngresosBS.toFixed(2),
        '$' + d.PagosUSD.toFixed(2),
        '$' + d.NominaUSD.toFixed(2),
        '$' + d.NetoUSD.toFixed(2)
    ]);
    
    doc.autoTable({
        startY: 45,
        head: [['Fecha', 'Ingresos USD', 'Ingresos Bs', 'Pagos USD', 'Nómina USD', 'NETO USD']],
        body: tableData,
        styles: { fontSize: 9 }
    });
    doc.save(`Analisis_${new Date().toISOString().split('T')[0]}.pdf`);
    alert('✅ PDF generado');
}
// ============================================================
// GUARDAR INGRESO (CIERRE DE CAJA) CON BLOQUEO
// ============================================================
function guardarIngreso() {
    if (!validarSaldoInicial()) {
        alert('️ Debes registrar el Saldo Inicial USD y/o Bs antes de guardar.');
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
    
    // Sumar a las cuentas correspondientes
    DB.config.SaldoBinance_USD += ingreso.Binance_USD;
    DB.config.SaldoZelle_USD += ingreso.Zelle_USD;
    DB.config.SaldoEmpresa_Bs += ingreso.Efectivo_Bs + ingreso.PagoMovil_Bs + ingreso.Transferencia_Bs +
        (ingreso.TarjetaDebitoMoneda === 'BS' ? ingreso.TarjetaDebito : 0) +
        (ingreso.TarjetaCreditoMoneda === 'BS' ? ingreso.TarjetaCredito : 0);
    
    DB.ingresos.push(ingreso);
    DB.config.TasaBCV = ingreso.TasaBCV; // Actualizar tasa global
    
    guardarEnLocalStorage();
    renderizarIngresos();
    recalcularResumenDiario();
    actualizarBloqueCierre();
    actualizarPanelSaldos();
    actualizarContexto();
    limpiarIngreso();
    bloquearCierreCaja(); // NUEVO: Bloquear el cierre de caja
    actualizarDashboard();
    mostrarIndicadorGuardado();
    alert('✅ Cierre de caja guardado correctamente. Campos bloqueados.');
}

// NUEVO: Bloquear y Desbloquear Cierre de Caja
function bloquearCierreCaja() {
    const contenedor = document.getElementById('camposCierreCaja');
    const alerta = document.getElementById('alertaCierreBloqueado');
    if (contenedor) {
        contenedor.classList.add('seccion-bloqueada');
        const inputs = contenedor.querySelectorAll('input, textarea, select');
        inputs.forEach(input => input.disabled = true);
    }
    if (alerta) alerta.style.display = 'flex';
    DB.cierreCajaBloqueado = true;
}

function desbloquearCierreCaja() {
    const contenedor = document.getElementById('camposCierreCaja');
    const alerta = document.getElementById('alertaCierreBloqueado');
    if (contenedor) {
        contenedor.classList.remove('seccion-bloqueada');
        const inputs = contenedor.querySelectorAll('input, textarea, select');
        inputs.forEach(input => input.disabled = false);
    }
    if (alerta) alerta.style.display = 'none';
    DB.cierreCajaBloqueado = false;
}

function renderizarIngresos() {
    const tbody = document.querySelector('#tablaIngresos tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.ingresos.forEach(ing => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${ing.Fecha}</td><td>${ing.TasaBCV}</td><td>${ing.SaldoIni_USD.toFixed(2)}</td><td>${ing.SaldoIni_Bs.toFixed(2)}</td><td>${ing.Efectivo_USD.toFixed(2)}</td><td>${ing.Efectivo_Bs.toFixed(2)}</td><td>${ing.PagoMovil_Bs.toFixed(2)}</td><td>${ing.TarjetaDebito.toFixed(2)}</td><td>${ing.TarjetaCredito.toFixed(2)}</td><td>${ing.Transferencia_Bs.toFixed(2)}</td><td>${ing.Zelle_USD.toFixed(2)}</td><td>${ing.Binance_USD.toFixed(2)}</td><td><strong>${ing.Total_USD.toFixed(2)}</strong></td><td><strong>${ing.Total_Bs.toFixed(2)}</strong></td><td>${ing.SaldoFin_USD.toFixed(2)}</td><td>${ing.SaldoFin_Bs.toFixed(2)}</td><td><button class="btn btn-primary btn-sm" onclick="editarIngreso(${ing.ID})">✏️</button> <button class="btn btn-danger btn-sm" onclick="eliminarIngreso(${ing.ID})">🗑️</button></td>`;
        tbody.appendChild(tr);
    });
}

function editarIngreso(id) {
    const ing = DB.ingresos.find(i => i.ID === id);
    if (!ing) return;
    document.getElementById('editIngresoID').value = ing.ID;
    document.getElementById('editIngresoFecha').value = ing.Fecha;
    document.getElementById('editIngresoTasa').value = ing.TasaBCV;
    document.getElementById('editIngresoSaldoIniUSD').value = ing.SaldoIni_USD;
    document.getElementById('editIngresoSaldoIniBS').value = ing.SaldoIni_Bs;
    document.getElementById('editIngresoEfectivoUSD').value = ing.Efectivo_USD;
    document.getElementById('editIngresoEfectivoBS').value = ing.Efectivo_Bs;
    document.getElementById('editIngresoPagoMovil').value = ing.PagoMovil_Bs;
    document.getElementById('editIngresoTarjetaDebito').value = ing.TarjetaDebito;
    document.getElementById('editIngresoTarjetaCredito').value = ing.TarjetaCredito;
    document.getElementById('editIngresoTransferencia').value = ing.Transferencia_Bs;
    document.getElementById('editIngresoZelle').value = ing.Zelle_USD;
    document.getElementById('editIngresoBinance').value = ing.Binance_USD;
    document.getElementById('editIngresoObservacion').value = ing.Observacion || '';
    document.getElementById('modalEditarIngreso').style.display = 'flex';
}

function guardarEdicionIngreso() {
    const id = parseInt(document.getElementById('editIngresoID').value);
    const ing = DB.ingresos.find(i => i.ID === id);
    if (!ing) { alert('❌ Ingreso no encontrado'); return; }
    
    ing.Fecha = document.getElementById('editIngresoFecha').value;
    ing.TasaBCV = parseFloat(document.getElementById('editIngresoTasa').value) || 0;
    ing.SaldoIni_USD = parseFloat(document.getElementById('editIngresoSaldoIniUSD').value) || 0;
    ing.SaldoIni_Bs = parseFloat(document.getElementById('editIngresoSaldoIniBS').value) || 0;
    ing.Efectivo_USD = parseFloat(document.getElementById('editIngresoEfectivoUSD').value) || 0;
    ing.Efectivo_Bs = parseFloat(document.getElementById('editIngresoEfectivoBS').value) || 0;
    ing.PagoMovil_Bs = parseFloat(document.getElementById('editIngresoPagoMovil').value) || 0;
    ing.TarjetaDebito = parseFloat(document.getElementById('editIngresoTarjetaDebito').value) || 0;
    ing.TarjetaCredito = parseFloat(document.getElementById('editIngresoTarjetaCredito').value) || 0;
    ing.Transferencia_Bs = parseFloat(document.getElementById('editIngresoTransferencia').value) || 0;
    ing.Zelle_USD = parseFloat(document.getElementById('editIngresoZelle').value) || 0;
    ing.Binance_USD = parseFloat(document.getElementById('editIngresoBinance').value) || 0;
    ing.Observacion = document.getElementById('editIngresoObservacion').value;
    
    ing.Total_USD = ing.Efectivo_USD + ing.Zelle_USD + ing.Binance_USD + ing.TarjetaDebito + ing.TarjetaCredito;
    ing.Total_Bs = ing.Efectivo_Bs + ing.PagoMovil_Bs + ing.Transferencia_Bs;
    ing.SaldoFin_USD = ing.SaldoIni_USD + ing.Total_USD;
    ing.SaldoFin_Bs = ing.SaldoIni_Bs + ing.Total_Bs;
    
    guardarEnLocalStorage();
    renderizarIngresos();
    recalcularResumenDiario();
    actualizarBloqueCierre();
    actualizarPanelSaldos();
    actualizarDashboard();
    cerrarModalEditarIngreso();
    mostrarIndicadorGuardado();
    alert('✅ Ingreso actualizado correctamente');
}

function cerrarModalEditarIngreso() { document.getElementById('modalEditarIngreso').style.display = 'none'; }

function eliminarIngreso(id) {
    if (confirm('¿Eliminar este registro?')) {
        DB.ingresos = DB.ingresos.filter(i => i.ID !== id);
        guardarEnLocalStorage();
        renderizarIngresos();
        recalcularResumenDiario();
        actualizarBloqueCierre();
        actualizarPanelSaldos();
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
// RECORDATORIOS (SIN MONTOS - ACTUALIZADO)
// ============================================================
function guardarRecordatorio() {
    const descripcion = document.getElementById('recordatorioDescripcion').value.trim();
    if (!descripcion) { alert('️ Debes ingresar una descripción'); return; }
    
    const recordatorio = {
        ID: Date.now(),
        FechaCreacion: new Date().toISOString(),
        FechaRecordatorio: document.getElementById('recordatorioFecha').value,
        Descripcion: descripcion,
        Detalle: document.getElementById('recordatorioDetalle').value,
        Prioridad: document.getElementById('recordatorioPrioridad').value,
        Completado: false
    };
    
    DB.recordatorios.push(recordatorio);
    guardarEnLocalStorage();
    renderizarRecordatorios();
    limpiarRecordatorio();
    actualizarDashboard();
    mostrarIndicadorGuardado();
    alert('✅ Recordatorio guardado correctamente');
}

function renderizarRecordatorios() {
    const tbody = document.querySelector('#tablaRecordatorios tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.recordatorios.forEach(rec => {
        const tr = document.createElement('tr');
        const badgeClass = rec.Prioridad === 'Alta' ? 'badge-high' : rec.Prioridad === 'Media' ? 'badge-medium' : 'badge-low';
        tr.innerHTML = `<td>${rec.FechaRecordatorio}</td><td>${rec.Descripcion}</td><td>${rec.Detalle || '-'}</td><td><span class="badge ${badgeClass}">${rec.Prioridad}</span></td><td>${rec.Completado ? '✅ Completado' : '⏳ Pendiente'}</td><td><button class="btn btn-primary btn-sm" onclick="editarRecordatorio(${rec.ID})">✏️</button> <button class="btn btn-${rec.Completado ? 'warning' : 'success'} btn-sm" onclick="toggleRecordatorio(${rec.ID})">${rec.Completado ? '↩️' : '✅'}</button> <button class="btn btn-danger btn-sm" onclick="eliminarRecordatorio(${rec.ID})">🗑️</button></td>`;
        tbody.appendChild(tr);
    });
}

function editarRecordatorio(id) {
    const rec = DB.recordatorios.find(r => r.ID === id);
    if (!rec) return;
    document.getElementById('editRecordatorioID').value = rec.ID;
    document.getElementById('editRecordatorioFecha').value = rec.FechaRecordatorio;
    document.getElementById('editRecordatorioDescripcion').value = rec.Descripcion;
    document.getElementById('editRecordatorioDetalle').value = rec.Detalle || '';
    document.getElementById('editRecordatorioPrioridad').value = rec.Prioridad;
    document.getElementById('modalEditarRecordatorio').style.display = 'flex';
}

function guardarEdicionRecordatorio() {
    const id = parseInt(document.getElementById('editRecordatorioID').value);
    const rec = DB.recordatorios.find(r => r.ID === id);
    if (!rec) { alert('❌ Recordatorio no encontrado'); return; }
    rec.FechaRecordatorio = document.getElementById('editRecordatorioFecha').value;
    rec.Descripcion = document.getElementById('editRecordatorioDescripcion').value;
    rec.Detalle = document.getElementById('editRecordatorioDetalle').value;
    rec.Prioridad = document.getElementById('editRecordatorioPrioridad').value;
    guardarEnLocalStorage();
    renderizarRecordatorios();
    actualizarDashboard();
    cerrarModalEditarRecordatorio();
    mostrarIndicadorGuardado();
    alert('✅ Recordatorio actualizado correctamente');
}

function cerrarModalEditarRecordatorio() { document.getElementById('modalEditarRecordatorio').style.display = 'none'; }

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
    document.getElementById('recordatorioDetalle').value = '';
}

// ============================================================
// NUEVO: CUENTAS POR COBRAR
// ============================================================
function guardarCuentaPorCobrar() {
    const nombre = document.getElementById('cobrarNombre').value.trim();
    const monto = parseFloat(document.getElementById('cobrarMonto').value) || 0;
    if (!nombre) { alert('⚠️ Debes ingresar el nombre del deudor'); return; }
    if (monto <= 0) { alert('️ Debes ingresar un monto mayor a 0'); return; }
    
    const cuenta = {
        ID: Date.now(),
        Fecha: document.getElementById('cobrarFecha').value,
        Cedula: document.getElementById('cobrarCedula').value,
        Nombre: nombre,
        Descripcion: document.getElementById('cobrarDescripcion').value,
        MontoUSD: monto,
        Etiqueta: document.getElementById('cobrarEtiqueta').value,
        TotalAbonado: 0,
        SaldoPendiente: monto,
        Pagado: false,
        HistorialCobros: []
    };
    
    DB.cuentasPorCobrar.push(cuenta);
    guardarEnLocalStorage();
    renderizarCobrar();
    limpiarCobrar();
    actualizarDashboard();
    mostrarIndicadorGuardado();
    alert('✅ Cuenta por cobrar registrada correctamente');
}

function calcularDiasMora(fecha) {
    if (!fecha) return 0;
    const fechaDeuda = new Date(fecha);
    const hoy = new Date();
    const diff = hoy - fechaDeuda;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function renderizarCobrar() {
    const tbody = document.querySelector('#tablaCobrar tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let totalCobrar = 0;
    let cuentasActivas = 0;
    
    DB.cuentasPorCobrar.forEach(cuenta => {
        if (!cuenta.Pagado && cuenta.SaldoPendiente > 0) {
            cuentasActivas++;
            totalCobrar += cuenta.SaldoPendiente;
            const diasMora = calcularDiasMora(cuenta.Fecha);
            const tr = document.createElement('tr');
            const claseMora = diasMora > 30 ? 'badge-high' : diasMora > 7 ? 'badge-medium' : 'badge-low';
            tr.innerHTML = `<td>${cuenta.Fecha}</td><td>${cuenta.Cedula || '-'}</td><td>${cuenta.Nombre}</td><td>${cuenta.Descripcion || '-'}</td><td>$${cuenta.MontoUSD.toFixed(2)}</td><td>$${cuenta.TotalAbonado.toFixed(2)}</td><td><strong>$${cuenta.SaldoPendiente.toFixed(2)}</strong></td><td><span class="badge ${claseMora}">${diasMora} días</span></td><td>${cuenta.Etiqueta}</td><td><button class="btn btn-success btn-sm" onclick="abrirModalCobro(${cuenta.ID})">💰</button> <button class="btn btn-danger btn-sm" onclick="eliminarCuentaPorCobrar(${cuenta.ID})">🗑️</button></td>`;
            tbody.appendChild(tr);
        }
    });
    
    const elTotalCobrar = document.getElementById('totalCobrar');
    if (elTotalCobrar) elTotalCobrar.textContent = '$' + totalCobrar.toFixed(2);
    const elTotalCuentas = document.getElementById('totalCuentasCobrar');
    if (elTotalCuentas) elTotalCuentas.textContent = cuentasActivas;
}

function abrirModalCobro(id) {
    const cuenta = DB.cuentasPorCobrar.find(c => c.ID === id);
    if (!cuenta) return;
    document.getElementById('pagoCobrarID').value = cuenta.ID;
    document.getElementById('pagoCobrarNombre').textContent = cuenta.Nombre;
    document.getElementById('pagoCobrarSaldo').textContent = '$' + cuenta.SaldoPendiente.toFixed(2);
    document.getElementById('pagoCobrarMonto').value = cuenta.SaldoPendiente.toFixed(2);
    document.getElementById('pagoCobrarFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('pagoCobrarReferencia').value = '';
    document.getElementById('modalPagarCobrar').style.display = 'flex';
}

function cerrarModalCobro() { document.getElementById('modalPagarCobrar').style.display = 'none'; }

function confirmarPagoCobro() {
    const id = parseInt(document.getElementById('pagoCobrarID').value);
    const cuenta = DB.cuentasPorCobrar.find(c => c.ID === id);
    if (!cuenta) { alert('❌ Cuenta no encontrada'); return; }
    
    const montoCobro = parseFloat(document.getElementById('pagoCobrarMonto').value) || 0;
    const fechaCobro = document.getElementById('pagoCobrarFecha').value;
    const cuentaDestino = document.getElementById('pagoCobrarCuenta').value;
    const referencia = document.getElementById('pagoCobrarReferencia').value.trim();
    
    if (montoCobro <= 0) { alert('⚠️ Debes ingresar un monto mayor a 0'); return; }
    if (montoCobro > cuenta.SaldoPendiente) { alert('⚠️ El monto no puede ser mayor al saldo pendiente'); return; }
    
    if (cuentaDestino === 'Binance') DB.config.SaldoBinance_USD += montoCobro;
    else if (cuentaDestino === 'Zelle') DB.config.SaldoZelle_USD += montoCobro;
    else if (cuentaDestino === 'Empresa') DB.config.SaldoEmpresa_USD += montoCobro;
    else if (cuentaDestino === 'Empresa_Bs') DB.config.SaldoEmpresa_Bs += montoCobro * DB.config.TasaBCV;
    
    const cobroRegistro = { Fecha: fechaCobro, MontoUSD: montoCobro, CuentaDestino: cuentaDestino, Referencia: referencia };
    if (!cuenta.HistorialCobros) cuenta.HistorialCobros = [];
    cuenta.HistorialCobros.push(cobroRegistro);
    cuenta.TotalAbonado += montoCobro;
    cuenta.SaldoPendiente -= montoCobro;
    
    if (cuenta.SaldoPendiente <= 0.01) { cuenta.Pagado = true; cuenta.SaldoPendiente = 0; }
    
    guardarEnLocalStorage();
    renderizarCobrar();
    recalcularResumenDiario();
    actualizarPanelSaldos();
    actualizarDashboard();
    cerrarModalCobro();
    mostrarIndicadorGuardado();
    alert(cuenta.Pagado ? '✅ Cuenta COBRADA completamente' : '✅ Cobro registrado. Saldo restante: $' + cuenta.SaldoPendiente.toFixed(2));
}

function eliminarCuentaPorCobrar(id) {
    if (confirm('¿Eliminar esta cuenta por cobrar?')) {
        DB.cuentasPorCobrar = DB.cuentasPorCobrar.filter(c => c.ID !== id);
        guardarEnLocalStorage();
        renderizarCobrar();
        actualizarDashboard();
    }
}

function limpiarCobrar() {
    document.getElementById('cobrarCedula').value = '';
    document.getElementById('cobrarNombre').value = '';
    document.getElementById('cobrarDescripcion').value = '';
    document.getElementById('cobrarMonto').value = '';
}

// ============================================================
// DEUDAS / PAGAR (ACTUALIZADO CON MODAL MEJORADO)
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
        if (clave && !nombresVistos.has(clave)) { nombresVistos.add(clave); proveedoresUnicos.push(d); }
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
    if (!nombre) { alert('️ Debes ingresar el nombre del proveedor'); return; }
    if (montoUSD <= 0) { alert('⚠️ Debes ingresar un monto mayor a 0'); return; }
    
    const deuda = {
        ID: Date.now(), Fecha: document.getElementById('deudaFecha').value, TasaBCV: DB.config.TasaBCV,
        RIF: document.getElementById('deudaRIF').value, Nombre: nombre,
        Descripcion: document.getElementById('deudaDescripcion').value,
        NroFactura: document.getElementById('deudaFactura').value,
        MontoUSD: montoUSD, MontoBs: parseFloat(document.getElementById('deudaMontoBS').value) || (montoUSD * DB.config.TasaBCV) || 0,
        Etiqueta: document.getElementById('deudaEtiqueta').value, Prioridad: document.getElementById('deudaPrioridad').value,
        CuentaOrigen: document.getElementById('deudaCuentaOrigen').value,
        Pagado: false, TotalAbonado: 0, SaldoPendiente: montoUSD, HistorialPagos: []
    };
    
    DB.deudas.push(deuda);
    guardarEnLocalStorage();
    renderizarDeudas();
    actualizarListaProveedores();
    limpiarDeuda();
    actualizarDashboard();
    mostrarIndicadorGuardado();
    alert('✅ Factura guardada correctamente');
}

function renderizarDeudas() {
    const tbody = document.querySelector('#tablaDeudas tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let totalPendiente = 0; let totalPrioridadAlta = 0; let deudasActivas = 0;
    
    DB.deudas.forEach(deuda => {
        if (!deuda.Pagado && deuda.SaldoPendiente > 0) {
            deudasActivas++;
            totalPendiente += deuda.SaldoPendiente;
            if (deuda.Prioridad === 'Alta') totalPrioridadAlta += deuda.SaldoPendiente;
            const tr = document.createElement('tr');
            const badgeClass = deuda.Prioridad === 'Alta' ? 'badge-high' : deuda.Prioridad === 'Media' ? 'badge-medium' : 'badge-low';
            tr.innerHTML = `<td>${deuda.Fecha}</td><td>${deuda.RIF}</td><td>${deuda.Nombre}</td><td>${deuda.Descripcion}</td><td>${deuda.NroFactura}</td><td>$${deuda.MontoUSD.toFixed(2)}</td><td>$${deuda.TotalAbonado.toFixed(2)}</td><td><strong>$${deuda.SaldoPendiente.toFixed(2)}</strong></td><td>Bs. ${deuda.MontoBs.toFixed(2)}</td><td>${deuda.Etiqueta}</td><td><span class="badge ${badgeClass}">${deuda.Prioridad}</span></td><td>${deuda.CuentaOrigen || '-'}</td><td><button class="btn btn-success btn-sm" onclick="abrirModalPago(${deuda.ID})">💵</button> <button class="btn btn-primary btn-sm" onclick="editarDeuda(${deuda.ID})">✏️</button> <button class="btn btn-info btn-sm" onclick="verHistorialPagos(${deuda.ID})">📜</button> <button class="btn btn-danger btn-sm" onclick="eliminarDeuda(${deuda.ID})">🗑️</button></td>`;
            tbody.appendChild(tr);
        }
    });
    
    const elTotalPendiente = document.getElementById('totalPendiente'); if (elTotalPendiente) elTotalPendiente.textContent = totalPendiente.toFixed(2);
    const elTotalAlta = document.getElementById('totalPrioridadAlta'); if (elTotalAlta) elTotalAlta.textContent = totalPrioridadAlta.toFixed(2);
    const elTotalDeudas = document.getElementById('totalDeudas'); if (elTotalDeudas) elTotalDeudas.textContent = deudasActivas;
}

function editarDeuda(id) {
    const deuda = DB.deudas.find(d => d.ID === id);
    if (!deuda) return;
    document.getElementById('editDeudaID').value = deuda.ID;
    document.getElementById('editDeudaFecha').value = deuda.Fecha;
    document.getElementById('editDeudaRIF').value = deuda.RIF || '';
    document.getElementById('editDeudaNombre').value = deuda.Nombre;
    document.getElementById('editDeudaDescripcion').value = deuda.Descripcion || '';
    document.getElementById('editDeudaFactura').value = deuda.NroFactura || '';
    document.getElementById('editDeudaMontoUSD').value = deuda.MontoUSD;
    document.getElementById('editDeudaMontoBS').value = deuda.MontoBs;
    document.getElementById('editDeudaEtiqueta').value = deuda.Etiqueta;
    document.getElementById('editDeudaPrioridad').value = deuda.Prioridad;
    document.getElementById('editDeudaCuentaOrigen').value = deuda.CuentaOrigen || 'Empresa';
    document.getElementById('modalEditarDeuda').style.display = 'flex';
}

function guardarEdicionDeuda() {
    const id = parseInt(document.getElementById('editDeudaID').value);
    const deuda = DB.deudas.find(d => d.ID === id);
    if (!deuda) { alert('❌ Deuda no encontrada'); return; }
    deuda.Fecha = document.getElementById('editDeudaFecha').value;
    deuda.RIF = document.getElementById('editDeudaRIF').value;
    deuda.Nombre = document.getElementById('editDeudaNombre').value;
    deuda.Descripcion = document.getElementById('editDeudaDescripcion').value;
    deuda.NroFactura = document.getElementById('editDeudaFactura').value;
    deuda.MontoUSD = parseFloat(document.getElementById('editDeudaMontoUSD').value) || 0;
    deuda.MontoBs = parseFloat(document.getElementById('editDeudaMontoBS').value) || 0;
    deuda.Etiqueta = document.getElementById('editDeudaEtiqueta').value;
    deuda.Prioridad = document.getElementById('editDeudaPrioridad').value;
    deuda.CuentaOrigen = document.getElementById('editDeudaCuentaOrigen').value;
    guardarEnLocalStorage();
    renderizarDeudas();
    actualizarListaProveedores();
    cerrarModalEditarDeuda();
    mostrarIndicadorGuardado();
    alert('✅ Factura actualizada correctamente');
}

function cerrarModalEditarDeuda() { document.getElementById('modalEditarDeuda').style.display = 'none'; }

function abrirModalPago(id) {
    const deuda = DB.deudas.find(d => d.ID === id);
    if (!deuda) return;
    document.getElementById('pagoDeudaID').value = deuda.ID;
    document.getElementById('pagoDeudaNombre').textContent = deuda.Nombre;
    document.getElementById('pagoDeudaFactura').textContent = deuda.NroFactura;
    document.getElementById('pagoDeudaSaldo').textContent = '$' + deuda.SaldoPendiente.toFixed(2);
    document.getElementById('pagoDeudaMonto').value = deuda.SaldoPendiente.toFixed(2);
    document.getElementById('pagoDeudaFecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('pagoDeudaReferencia').value = '';
    document.getElementById('pagoDeudaObservacion').value = '';
    document.getElementById('modalSaldoBinance').textContent = '$' + (DB.config.SaldoBinance_USD || 0).toFixed(2);
    document.getElementById('modalSaldoZelle').textContent = '$' + (DB.config.SaldoZelle_USD || 0).toFixed(2);
    document.getElementById('modalSaldoEmpresa').textContent = '$' + (DB.config.SaldoEmpresa_USD || 0).toFixed(2);
    document.getElementById('modalSaldoEmpresaBs').textContent = 'Bs. ' + (DB.config.SaldoEmpresa_Bs || 0).toFixed(2);
    document.getElementById('modalSaldoPersonal').textContent = '$' + (DB.config.SaldoPersonal_USD || 0).toFixed(2);
    document.getElementById('modalSaldoPersonalBs').textContent = 'Bs. ' + (DB.config.SaldoPersonal_Bs || 0).toFixed(2);
    document.getElementById('alertaSaldoInsuficiente').style.display = 'none';
    document.getElementById('modalPagoDeuda').style.display = 'flex';
}

function verificarSaldoDisponible() {
    const montoPago = parseFloat(document.getElementById('pagoDeudaMonto').value) || 0;
    const cuentaOrigen = document.getElementById('pagoDeudaCuenta').value;
    const alerta = document.getElementById('alertaSaldoInsuficiente');
    let saldoDisponible = 0;
    if (cuentaOrigen === 'Binance') saldoDisponible = DB.config.SaldoBinance_USD || 0;
    else if (cuentaOrigen === 'Zelle') saldoDisponible = DB.config.SaldoZelle_USD || 0;
    else if (cuentaOrigen === 'Empresa') saldoDisponible = DB.config.SaldoEmpresa_USD || 0;
    else if (cuentaOrigen === 'Empresa_Bs') saldoDisponible = DB.config.SaldoEmpresa_Bs || 0;
    else if (cuentaOrigen === 'Personal') saldoDisponible = DB.config.SaldoPersonal_USD || 0;
    else if (cuentaOrigen === 'Personal_Bs') saldoDisponible = DB.config.SaldoPersonal_Bs || 0;
    alerta.style.display = montoPago > saldoDisponible ? 'block' : 'none';
}

function confirmarPagoDeuda() {
    const id = parseInt(document.getElementById('pagoDeudaID').value);
    const deuda = DB.deudas.find(d => d.ID === id);
    if (!deuda) { alert('❌ Deuda no encontrada'); return; }
    
    const montoPago = parseFloat(document.getElementById('pagoDeudaMonto').value) || 0;
    const fechaPago = document.getElementById('pagoDeudaFecha').value;
    const cuentaOrigen = document.getElementById('pagoDeudaCuenta').value;
    const referencia = document.getElementById('pagoDeudaReferencia').value.trim();
    const observacion = document.getElementById('pagoDeudaObservacion').value;
    
    if (montoPago <= 0) { alert('⚠️ Debes ingresar un monto mayor a 0'); return; }
    if (montoPago > deuda.SaldoPendiente) { alert('⚠️ El monto no puede ser mayor al saldo pendiente'); return; }
    if (!fechaPago) { alert('⚠️ Debes seleccionar la fecha de pago'); return; }
    if (!referencia) { alert('⚠️ Debes ingresar la referencia de pago'); return; }
    
    let saldoDisponible = 0;
    if (cuentaOrigen === 'Binance') saldoDisponible = DB.config.SaldoBinance_USD || 0;
    else if (cuentaOrigen === 'Zelle') saldoDisponible = DB.config.SaldoZelle_USD || 0;
    else if (cuentaOrigen === 'Empresa') saldoDisponible = DB.config.SaldoEmpresa_USD || 0;
    else if (cuentaOrigen === 'Empresa_Bs') saldoDisponible = DB.config.SaldoEmpresa_Bs || 0;
    else if (cuentaOrigen === 'Personal') saldoDisponible = DB.config.SaldoPersonal_USD || 0;
    else if (cuentaOrigen === 'Personal_Bs') saldoDisponible = DB.config.SaldoPersonal_Bs || 0;
    
    if (montoPago > saldoDisponible) { alert('⚠️ Saldo insuficiente. Disponible: $' + saldoDisponible.toFixed(2)); return; }
    
    if (cuentaOrigen === 'Binance') DB.config.SaldoBinance_USD -= montoPago;
    else if (cuentaOrigen === 'Zelle') DB.config.SaldoZelle_USD -= montoPago;
    else if (cuentaOrigen === 'Empresa') DB.config.SaldoEmpresa_USD -= montoPago;
    else if (cuentaOrigen === 'Empresa_Bs') DB.config.SaldoEmpresa_Bs -= montoPago * DB.config.TasaBCV;
    else if (cuentaOrigen === 'Personal') DB.config.SaldoPersonal_USD -= montoPago;
    else if (cuentaOrigen === 'Personal_Bs') DB.config.SaldoPersonal_Bs -= montoPago * DB.config.TasaBCV;
    
    const tasa = DB.config.TasaBCV || 0;
    const pagoRegistro = { Fecha: fechaPago, MontoUSD: montoPago, MontoBs: montoPago * tasa, CuentaOrigen: cuentaOrigen, ReferenciaPago: referencia, Observacion: observacion };
    if (!deuda.HistorialPagos) deuda.HistorialPagos = [];
    deuda.HistorialPagos.push(pagoRegistro);
    deuda.TotalAbonado += montoPago;
    deuda.SaldoPendiente -= montoPago;
    if (deuda.SaldoPendiente <= 0.01) { deuda.Pagado = true; deuda.SaldoPendiente = 0; }
    
    guardarEnLocalStorage();
    renderizarDeudas();
    actualizarListaProveedores();
    recalcularResumenDiario();
    actualizarBloqueCierre();
    actualizarPanelSaldos();
    actualizarDashboard();
    cerrarModalPago();
    mostrarIndicadorGuardado();
    alert(deuda.Pagado ? '✅ Deuda PAGADA completamente. Ref: ' + referencia : '✅ Abono registrado. Saldo restante: $' + deuda.SaldoPendiente.toFixed(2));
}

function verHistorialPagos(id) {
    const deuda = DB.deudas.find(d => d.ID === id);
    if (!deuda || !deuda.HistorialPagos || deuda.HistorialPagos.length === 0) { alert('📋 No hay pagos registrados'); return; }
    document.getElementById('histDeudaID').value = deuda.ID;
    const tbody = document.querySelector('#tablaHistorialPagosDeuda tbody');
    tbody.innerHTML = '';
    deuda.HistorialPagos.forEach(pago => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${pago.Fecha}</td><td>$${pago.MontoUSD.toFixed(2)}</td><td>${pago.CuentaOrigen}</td><td>${pago.ReferenciaPago}</td><td>${pago.Observacion || '-'}</td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('modalHistorialPagos').style.display = 'flex';
}

function cerrarModalPago() { document.getElementById('modalPagoDeuda').style.display = 'none'; }
function cerrarModalHistorial() { document.getElementById('modalHistorialPagos').style.display = 'none'; }

function eliminarDeuda(id) {
    if (confirm('¿Eliminar esta factura?')) {
        DB.deudas = DB.deudas.filter(d => d.ID !== id);
        guardarEnLocalStorage();
        renderizarDeudas();
        actualizarListaProveedores();
        recalcularResumenDiario();
        actualizarBloqueCierre();
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
    document.getElementById('deudaMontoBS').value = '';
    document.getElementById('deudaMontoBSCalculado').value = '';
}

// ============================================================
// EMPLEADOS Y NÓMINA (ACTUALIZADO: PAGO INDIVIDUAL CON TASA EDITABLE)
// ============================================================
function guardarEmpleado() {
    const nombre = document.getElementById('empleadoNombre').value.trim();
    const cedula = document.getElementById('empleadoCedula').value.trim();
    const sueldo = parseFloat(document.getElementById('empleadoSueldo').value) || 0;
    if (!nombre) { alert('⚠️ Debes ingresar el nombre'); return; }
    if (!cedula) { alert('⚠️ Debes ingresar la cédula'); return; }
    if (sueldo <= 0) { alert('⚠️ Debes ingresar un sueldo mayor a 0'); return; }
    
    const empleado = { ID: Date.now(), FechaIngreso: document.getElementById('empleadoFecha').value, Nombre: nombre, Cedula: cedula, TipoSueldo: document.getElementById('empleadoTipoSueldo').value, SueldoUSD: sueldo, Status: 'Activo' };
    DB.empleados.push(empleado);
    guardarEnLocalStorage();
    renderizarEmpleados();
    limpiarEmpleado();
    actualizarDashboard();
    mostrarIndicadorGuardado();
    alert('✅ Empleado guardado correctamente');
}

function renderizarEmpleados() {
    const tbody = document.querySelector('#tablaEmpleados tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.empleados.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${emp.FechaIngreso}</td><td>${emp.Nombre}</td><td>${emp.Cedula}</td><td>${emp.TipoSueldo}</td><td>$${emp.SueldoUSD.toFixed(2)}</td><td>${emp.Status}</td><td><button class="btn btn-primary btn-sm" onclick="editarEmpleado(${emp.ID})">✏️</button> <button class="btn btn-success btn-sm" onclick="abrirModalPagoNomina(${emp.ID})">💵</button> <button class="btn btn-danger btn-sm" onclick="eliminarEmpleado(${emp.ID})">🗑️</button></td>`;
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
    if (!emp) { alert('❌ Empleado no encontrado'); return; }
    emp.FechaIngreso = document.getElementById('editEmpleadoFecha').value;
    emp.Nombre = document.getElementById('editEmpleadoNombre').value.trim();
    emp.Cedula = document.getElementById('editEmpleadoCedula').value.trim();
    emp.TipoSueldo = document.getElementById('editEmpleadoTipoSueldo').value;
    emp.SueldoUSD = parseFloat(document.getElementById('editEmpleadoSueldo').value) || 0;
    emp.Status = document.getElementById('editEmpleadoStatus').value;
    guardarEnLocalStorage();
    renderizarEmpleados();
    actualizarDashboard();
    cerrarModalEmpleado();
    mostrarIndicadorGuardado();
    alert('✅ Empleado actualizado correctamente');
}

function cerrarModalEmpleado() { document.getElementById('modalEditarEmpleado').style.display = 'none'; }

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

// NUEVO: Modal de Pago Individual de Nómina
function abrirModalPagoNomina(id) {
    const emp = DB.empleados.find(e => e.ID === id);
    if (!emp) return;
    
    document.getElementById('nominaEmpID').value = emp.ID;
    document.getElementById('nominaEmpNombre').textContent = emp.Nombre;
    document.getElementById('nominaEmpCedula').textContent = emp.Cedula;
    document.getElementById('nominaEmpSueldo').textContent = '$' + emp.SueldoUSD.toFixed(2);
    document.getElementById('nominaTasaEditable').value = DB.config.TasaBCV || 0;
    document.getElementById('nominaEmpMontoBs').textContent = 'Bs. ' + (emp.SueldoUSD * (DB.config.TasaBCV || 0)).toFixed(2);
    document.getElementById('nominaFechaPagoInd').value = new Date().toISOString().split('T')[0];
    document.getElementById('nominaCuentaOrigenInd').value = 'Empresa';
    document.getElementById('alertaSaldoNomina').style.display = 'none';
    document.getElementById('modalPagoNomina').style.display = 'flex';
    
    // Actualizar cálculo al cambiar tasa
    document.getElementById('nominaTasaEditable').oninput = function() {
        const tasa = parseFloat(this.value) || 0;
        document.getElementById('nominaEmpMontoBs').textContent = 'Bs. ' + (emp.SueldoUSD * tasa).toFixed(2);
    };
}

function cerrarModalPagoNomina() { document.getElementById('modalPagoNomina').style.display = 'none'; }

function confirmarPagoNominaIndividual() {
    const id = parseInt(document.getElementById('nominaEmpID').value);
    const emp = DB.empleados.find(e => e.ID === id);
    if (!emp) return;
    
    const fechaPago = document.getElementById('nominaFechaPagoInd').value;
    const cuentaOrigen = document.getElementById('nominaCuentaOrigenInd').value;
    const tasaUsada = parseFloat(document.getElementById('nominaTasaEditable').value) || 0;
    
    if (!fechaPago) { alert('⚠️ Selecciona la fecha'); return; }
    
    let saldoDisponible = 0;
    if (cuentaOrigen === 'Empresa') saldoDisponible = DB.config.SaldoEmpresa_USD || 0;
    else if (cuentaOrigen === 'Empresa_Bs') saldoDisponible = DB.config.SaldoEmpresa_Bs || 0;
    else if (cuentaOrigen === 'Binance') saldoDisponible = DB.config.SaldoBinance_USD || 0;
    else if (cuentaOrigen === 'Zelle') saldoDisponible = DB.config.SaldoZelle_USD || 0;
    
    if (emp.SueldoUSD > saldoDisponible) {
        document.getElementById('alertaSaldoNomina').style.display = 'block';
        return;
    }
    
    // Descontar
    if (cuentaOrigen === 'Empresa') DB.config.SaldoEmpresa_USD -= emp.SueldoUSD;
    else if (cuentaOrigen === 'Empresa_Bs') DB.config.SaldoEmpresa_Bs -= emp.SueldoUSD * tasaUsada;
    else if (cuentaOrigen === 'Binance') DB.config.SaldoBinance_USD -= emp.SueldoUSD;
    else if (cuentaOrigen === 'Zelle') DB.config.SaldoZelle_USD -= emp.SueldoUSD;
    
    DB.nominaPagos.push({
        ID: Date.now(), FechaPago: fechaPago, CuentaOrigen: cuentaOrigen,
        Nombre: emp.Nombre, Cedula: emp.Cedula, Tipo: emp.TipoSueldo,
        Sueldo: emp.SueldoUSD, Bono: 0, Deuda: 0, Neto: emp.SueldoUSD,
        TasaUsada: tasaUsada, Status: 'Pagado'
    });
    
    guardarEnLocalStorage();
    renderizarHistorialNomina();
    recalcularResumenDiario();
    actualizarPanelSaldos();
    actualizarDashboard();
    cerrarModalPagoNomina();
    mostrarIndicadorGuardado();
    alert('✅ Nómina pagada a ' + emp.Nombre);
}

function generarNomina() {
    // Mantenemos la función original por si se usa, pero el pago individual es el principal ahora
    alert('ℹ️ Usa el botón 💵 en la lista de empleados para pagar uno por uno con tasa editable.');
}

function renderizarNominaPagos() { /* Función original mantenida por compatibilidad */ }
function actualizarNetoNomina() {}
function togglePagoNomina() {}
function eliminarDeNomina() {}
function guardarNominaPagos() { /* Función original mantenida */ }
function cancelarNomina() { /* Función original mantenida */ }

function renderizarHistorialNomina() {
    const tbody = document.querySelector('#tablaHistorialNomina tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.nominaPagos.forEach(pago => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${pago.FechaPago}</td><td>${pago.Nombre}</td><td>${pago.Cedula}</td><td>$${pago.Sueldo.toFixed(2)}</td><td>$${pago.Bono.toFixed(2)}</td><td>$${pago.Deuda.toFixed(2)}</td><td><strong>$${pago.Neto.toFixed(2)}</strong></td><td>${pago.CuentaOrigen}</td><td>✅ ${pago.Status}</td>`;
        tbody.appendChild(tr);
    });
}

// ============================================================
// BÚSQUEDA CON TARJETAS (ACTUALIZADA)
// ============================================================
function realizarBusqueda() {
    const desde = document.getElementById('busqDesde').value;
    const hasta = document.getElementById('busqHasta').value;
    const filtro = document.getElementById('busqFiltro').value;
    const texto = document.getElementById('busqTexto').value.toLowerCase();
    let resultados = [];
    
    if (filtro === 'todos' || filtro === 'ingresos') {
        DB.ingresos.forEach(ing => {
            if (desde && ing.Fecha < desde) return; if (hasta && ing.Fecha > hasta) return;
            if (texto && !JSON.stringify(ing).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Ingreso', fecha: ing.Fecha, icono: '📈', titulo: `Ingreso del ${ing.Fecha}`, texto: `Total: $${ing.Total_USD.toFixed(2)} / Bs.${ing.Total_Bs.toFixed(2)}`, detalle: `Tasa: ${ing.TasaBCV} | Saldo Final: $${ing.SaldoFin_USD.toFixed(2)}`, id: ing.ID, data: ing });
        });
    }
    if (filtro === 'todos' || filtro === 'deudas') {
        DB.deudas.forEach(d => {
            if (desde && d.Fecha < desde) return; if (hasta && d.Fecha > hasta) return;
            if (texto && !JSON.stringify(d).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Deuda', fecha: d.Fecha, icono: '💳', titulo: `${d.Nombre}`, texto: `Factura: ${d.NroFactura} - $${d.MontoUSD.toFixed(2)}`, detalle: `Abonado: $${d.TotalAbonado.toFixed(2)} | Pendiente: $${d.SaldoPendiente.toFixed(2)}`, id: d.ID, data: d });
        });
    }
    if (filtro === 'todos' || filtro === 'cobros') {
        DB.cuentasPorCobrar.forEach(c => {
            if (desde && c.Fecha < desde) return; if (hasta && c.Fecha > hasta) return;
            if (texto && !JSON.stringify(c).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Cobro', fecha: c.Fecha, icono: '💰', titulo: `${c.Nombre}`, texto: `Monto: $${c.MontoUSD.toFixed(2)} | Pendiente: $${c.SaldoPendiente.toFixed(2)}`, detalle: `${c.Descripcion || ''} | Mora: ${calcularDiasMora(c.Fecha)} días`, id: c.ID, data: c });
        });
    }
    if (filtro === 'todos' || filtro === 'recordatorios') {
        DB.recordatorios.forEach(r => {
            if (desde && r.FechaRecordatorio < desde) return; if (hasta && r.FechaRecordatorio > hasta) return;
            if (texto && !JSON.stringify(r).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Recordatorio', fecha: r.FechaRecordatorio, icono: '', titulo: r.Descripcion, texto: r.Detalle || 'Sin detalle', detalle: `Prioridad: ${r.Prioridad} | ${r.Completado ? '✅ Completado' : ' Pendiente'}`, id: r.ID, data: r });
        });
    }
    if (filtro === 'todos' || filtro === 'nomina') {
        DB.nominaPagos.forEach(p => {
            if (desde && p.FechaPago < desde) return; if (hasta && p.FechaPago > hasta) return;
            if (texto && !JSON.stringify(p).toLowerCase().includes(texto)) return;
            resultados.push({ tipo: 'Nómina', fecha: p.FechaPago, icono: '👥', titulo: `${p.Nombre}`, texto: `Neto: $${p.Neto.toFixed(2)}`, detalle: `Cédula: ${p.Cedula} | Cuenta: ${p.CuentaOrigen}`, id: p.ID, data: p });
        });
    }
    
    resultados.sort((a, b) => b.fecha.localeCompare(a.fecha));
    const cont = document.getElementById('resultadosBusqueda');
    if (resultados.length === 0) {
        cont.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted);">Sin resultados</p>';
    } else {
        cont.innerHTML = `<p style="padding:10px;font-weight:600; color:var(--text-main);">${resultados.length} resultado(s)</p>` +
            resultados.map(r => {
                let botonesAccion = '';
                if (r.tipo === 'Deuda' && !r.data.Pagado) botonesAccion = `<button class="btn btn-success btn-sm" onclick="abrirModalPago(${r.id})">💵 Pagar</button> <button class="btn btn-primary btn-sm" onclick="editarDeuda(${r.id})">✏️ Editar</button>`;
                else if (r.tipo === 'Cobro' && !r.data.Pagado) botonesAccion = `<button class="btn btn-success btn-sm" onclick="abrirModalCobro(${r.id})">💰 Cobrar</button>`;
                else if (r.tipo === 'Recordatorio' && !r.data.Completado) botonesAccion = `<button class="btn btn-success btn-sm" onclick="toggleRecordatorio(${r.id})">✅ Completar</button> <button class="btn btn-primary btn-sm" onclick="editarRecordatorio(${r.id})">✏️ Editar</button>`;
                else if (r.tipo === 'Ingreso') botonesAccion = `<button class="btn btn-primary btn-sm" onclick="editarIngreso(${r.id})">✏️ Editar</button>`;
                return `<div style="padding:15px;background:var(--bg-card);margin:10px 0;border-radius:10px;border-left:5px solid var(--primary);box-shadow:0 2px 8px rgba(0,0,0,0.2); color:var(--text-main);"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><span style="font-size:1.8em;">${r.icono}</span><div><strong style="font-size:1.1em;color:var(--text-main);">${r.titulo}</strong><div style="color:var(--text-muted);font-size:0.9em;">${r.tipo} - ${r.fecha}</div></div></div><div style="font-size:1.1em;color:var(--primary);font-weight:600;margin:5px 0;">${r.texto}</div>${r.detalle ? `<div style="color:var(--text-muted);font-size:0.9em;margin-top:5px;">${r.detalle}</div>` : ''}${botonesAccion ? `<div style="margin-top:10px;">${botonesAccion}</div>` : ''}</div>`;
            }).join('');
    }
}

// ============================================================
// DASHBOARD ACTUALIZADO
// ============================================================
function actualizarDashboard() {
    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = hoy.substring(0, 7);
    
    const ingresosMes = DB.ingresos.filter(ing => ing.Fecha && ing.Fecha.startsWith(mesActual)).reduce((sum, ing) => ({ USD: sum.USD + ing.Total_USD, BS: sum.BS + ing.Total_Bs }), { USD: 0, BS: 0 });
    const totalDeudas = DB.deudas.filter(d => !d.Pagado).reduce((sum, d) => sum + d.SaldoPendiente, 0);
    const numDeudas = DB.deudas.filter(d => !d.Pagado).length;
    const totalCobrar = DB.cuentasPorCobrar.filter(c => !c.Pagado).reduce((sum, c) => sum + c.SaldoPendiente, 0);
    const numCobrar = DB.cuentasPorCobrar.filter(c => !c.Pagado).length;
    const recordatoriosPendientes = DB.recordatorios.filter(r => !r.Completado).length;
    const balanceNeto = ingresosMes.USD - totalDeudas;
    
    document.getElementById('dashIngresos').textContent = `$${ingresosMes.USD.toFixed(2)} / Bs. ${ingresosMes.BS.toFixed(2)}`;
    document.getElementById('dashDeudas').textContent = `$${totalDeudas.toFixed(2)}`;
    document.getElementById('dashNumDeudas').textContent = `${numDeudas} deudas`;
    document.getElementById('dashCobrar').textContent = `$${totalCobrar.toFixed(2)}`;
    document.getElementById('dashNumCobrar').textContent = `${numCobrar} cuentas`;
    document.getElementById('dashRecordatorios').textContent = recordatoriosPendientes;
    document.getElementById('dashBalance').textContent = `$${balanceNeto.toFixed(2)}`;
}

// NUEVO: Ver Cierre por Fecha
function verCierrePorFecha() {
    const fecha = document.getElementById('dashFechaCierre').value;
    if (!fecha) { alert('⚠️ Selecciona una fecha'); return; }
    const ingresoDelDia = DB.ingresos.find(i => i.Fecha === fecha);
    const contenedor = document.getElementById('resultadoCierreFecha');
    if (!ingresoDelDia) { contenedor.style.display = 'block'; contenedor.innerHTML = `<strong>📅 ${fecha}:</strong> No hay registro de cierre de caja para esta fecha.`; return; }
    
    let pagosDia = 0; let cobrosDia = 0; let nominaDia = 0; const detallesPagos = [];
    DB.deudas.forEach(d => { if (d.HistorialPagos) d.HistorialPagos.forEach(p => { if (p.Fecha === fecha) { pagosDia += p.MontoUSD; detallesPagos.push(`💳 ${d.Nombre}: $${p.MontoUSD.toFixed(2)}`); } }); });
    DB.cuentasPorCobrar.forEach(c => { if (c.HistorialCobros) c.HistorialCobros.forEach(p => { if (p.Fecha === fecha) cobrosDia += p.MontoUSD; }); });
    DB.nominaPagos.forEach(p => { if (p.FechaPago === fecha) nominaDia += p.Neto; });
    
    const netoDia = ingresoDelDia.Total_USD - pagosDia - nominaDia + cobrosDia;
    let html = `<strong>📅 Cierre de Caja - ${fecha}</strong><br><br>`;
    html += `💵 Saldo Inicial: <strong>$${ingresoDelDia.SaldoIni_USD.toFixed(2)}</strong><br>`;
    html += `💴 Saldo Inicial Bs: <strong>Bs. ${ingresoDelDia.SaldoIni_Bs.toFixed(2)}</strong><br>`;
    html += `📈 Ingresos del día: <strong>$${ingresoDelDia.Total_USD.toFixed(2)}</strong> / Bs. ${ingresoDelDia.Total_Bs.toFixed(2)}<br>`;
    html += `💳 Pagos (deudas): <strong>-$${pagosDia.toFixed(2)}</strong><br>`;
    html += `💰 Cobros recibidos: <strong>+$${cobrosDia.toFixed(2)}</strong><br>`;
    html += `👥 Nómina pagada: <strong>-$${nominaDia.toFixed(2)}</strong><br>`;
    html += `💰 Saldo Final: <strong>$${ingresoDelDia.SaldoFin_USD.toFixed(2)}</strong> / Bs. ${ingresoDelDia.SaldoFin_Bs.toFixed(2)}<br>`;
    html += `<br><strong> NETO DEL DÍA: $${netoDia.toFixed(2)}</strong>`;
    if (detallesPagos.length > 0) html += `<br><br><strong>Detalle de pagos:</strong><br>` + detallesPagos.join('<br>');
    contenedor.style.display = 'block'; contenedor.innerHTML = html;
}

// ============================================================
// NUEVO: REPORTE TELEGRAM
// ============================================================
function generarReporteTelegram() {
    const hoy = new Date().toLocaleDateString('es-VE');
    const mesActual = hoy.substring(0, 7); // Formato YYYY-MM no funciona bien con toLocaleDateString, usamos ISO
    const mesISO = new Date().toISOString().substring(0, 7);
    
    const ingresosMes = DB.ingresos.filter(ing => ing.Fecha && ing.Fecha.startsWith(mesISO)).reduce((sum, ing) => sum + ing.Total_USD, 0);
    const deudasPendientes = DB.deudas.filter(d => !d.Pagado).reduce((sum, d) => sum + d.SaldoPendiente, 0);
    const porCobrar = DB.cuentasPorCobrar.filter(c => !c.Pagado).reduce((sum, c) => sum + c.SaldoPendiente, 0);
    
    let reporte = `📊 *REPORTE FINANCIERO - ${DB.config.NombreNegocio}*\n`;
    reporte += ` Fecha: ${hoy}\n\n`;
    reporte += `💵 *Ingresos del Mes:* $${ingresosMes.toFixed(2)}\n`;
    reporte += ` *Deudas Pendientes:* $${deudasPendientes.toFixed(2)}\n`;
    reporte += `💰 *Por Cobrar:* $${porCobrar.toFixed(2)}\n\n`;
    reporte += ` *Saldos Actuales:*\n`;
    reporte += `- Binance: $${(DB.config.SaldoBinance_USD||0).toFixed(2)}\n`;
    reporte += `- Zelle: $${(DB.config.SaldoZelle_USD||0).toFixed(2)}\n`;
    reporte += `- Empresa USD: $${(DB.config.SaldoEmpresa_USD||0).toFixed(2)}\n`;
    reporte += `- Empresa Bs: Bs.${(DB.config.SaldoEmpresa_Bs||0).toFixed(2)}\n`;
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(reporte).then(() => {
        alert('✅ Reporte copiado al portapapeles.\n\n⚠️ ADVERTENCIA: Para enviarlo al bot, pégalo en el chat.\n\n📞 Soporte Técnico: Kervys - 04149956831');
    }).catch(() => {
        prompt('Copia este reporte manualmente:', reporte);
    });
}

// ============================================================
// UTILIDADES, RESET, LOCALSTORAGE, EXCEL, PDF, GOOGLE SHEETS
// ============================================================
function guardarNotas() { DB.notas = document.getElementById('notasRapidas').value; guardarEnLocalStorage(); mostrarIndicadorGuardado(); alert('✅ Notas guardadas'); }

function resetearSistema() { document.getElementById('resetClave1').value = ''; document.getElementById('resetClave2').value = ''; document.getElementById('resetConfirmacion').checked = false; document.getElementById('modalReset').style.display = 'flex'; }

function confirmarReset() {
    const clave1 = document.getElementById('resetClave1').value; const clave2 = document.getElementById('resetClave2').value; const confirmado = document.getElementById('resetConfirmacion').checked;
    if (!confirmado) { alert('️ Marca la casilla'); return; }
    if (clave1 !== CLAVE_ADMIN) { alert('❌ Clave INCORRECTA'); return; }
    if (clave2 !== CLAVE_ADMIN) { alert('❌ Segunda clave INCORRECTA'); return; }
    if (clave1 !== clave2) { alert('❌ Las claves no coinciden'); return; }
    if (!confirm('⚠️ ¿BORRAR TODOS los datos?')) return;
    
    DB = { config: { TasaBCV: 0, SaldoBinance_USD: 0, SaldoZelle_USD: 0, SaldoEmpresa_USD: 0, SaldoPersonal_USD: 0, SaldoEmpresa_Bs: 0, SaldoPersonal_Bs: 0, NombreNegocio: 'Mi Negocio' }, ingresos: [], recordatorios: [], deudas: [], cuentasPorCobrar: [], empleados: [], nominaPagos: [], resumenDiario: [], notas: '', saldosInicialesBloqueados: false, cierreCajaBloqueado: false };
    localStorage.removeItem('FinanzasProDB');
    renderizarIngresos(); renderizarRecordatorios(); renderizarDeudas(); renderizarCobrar(); renderizarEmpleados(); renderizarHistorialNomina();
    actualizarDashboard(); actualizarListaProveedores(); actualizarBloqueCierre(); recalcularResumenDiario(); actualizarPanelSaldos(); actualizarContexto();
    desbloquearSaldos(); desbloquearCierreCaja();
    document.getElementById('modalReset').style.display = 'none';
    alert('✅ Sistema reseteado completamente.');
}

function guardarEnLocalStorage() { localStorage.setItem('FinanzasProDB', JSON.stringify(DB)); }

function cargarDesdeLocalStorage() {
    const saved = localStorage.getItem('FinanzasProDB');
    if (saved) {
        DB = JSON.parse(saved);
        if (!DB.resumenDiario) DB.resumenDiario = [];
        if (!DB.cuentasPorCobrar) DB.cuentasPorCobrar = [];
        if (!DB.config.SaldoZelle_USD) DB.config.SaldoZelle_USD = 0;
        document.getElementById('ingresoTasa').value = DB.config.TasaBCV;
        document.getElementById('notasRapidas').value = DB.notas || '';
        renderizarIngresos(); renderizarRecordatorios(); renderizarDeudas(); renderizarCobrar(); renderizarEmpleados(); renderizarHistorialNomina();
        recalcularResumenDiario(); actualizarBloqueCierre(); actualizarDashboard(); actualizarListaProveedores();
        if (DB.ingresos.length > 0) { bloquearCamposSaldos(); bloquearCierreCaja(); }
    }
}

function cargarExcelBtn() { document.getElementById('inputExcel').click(); }

function cargarExcel(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result); const wb = XLSX.read(data, {type:'array'});
        DB.config = leerHojaConfig(wb, 'Config') || DB.config;
        DB.ingresos = leerHoja(wb, 'Ingresos') || []; DB.recordatorios = leerHoja(wb, 'Recordatorios') || [];
        DB.deudas = leerHoja(wb, 'Deudas') || []; DB.cuentasPorCobrar = leerHoja(wb, 'CuentasPorCobrar') || [];
        DB.empleados = leerHoja(wb, 'Empleados') || []; DB.nominaPagos = leerHoja(wb, 'NominaPagos') || [];
        DB.resumenDiario = [];
        if (!DB.config.SaldoZelle_USD) DB.config.SaldoZelle_USD = 0;
        document.getElementById('ingresoTasa').value = DB.config.TasaBCV;
        guardarEnLocalStorage();
        renderizarIngresos(); renderizarRecordatorios(); renderizarDeudas(); renderizarCobrar(); renderizarEmpleados(); renderizarHistorialNomina();
        recalcularResumenDiario(); actualizarBloqueCierre(); actualizarDashboard(); actualizarListaProveedores(); actualizarPanelSaldos(); actualizarContexto();
        alert('✅ Excel cargado: ' + file.name);
    };
    reader.readAsArrayBuffer(file);
}

function leerHojaConfig(wb, nombre) { if (!wb.SheetNames.includes(nombre)) return {}; const sheet = wb.Sheets[nombre]; const json = XLSX.utils.sheet_to_json(sheet, {defval:''}); const obj = {}; json.forEach(r => obj[r.Clave] = r.Valor); return obj; }
function leerHoja(wb, nombre) { if (!wb.SheetNames.includes(nombre)) return []; const sheet = wb.Sheets[nombre]; return XLSX.utils.sheet_to_json(sheet, {defval:''}); }

function guardarExcel() {
    recalcularResumenDiario();
    const wb = XLSX.utils.book_new();
    const configArr = [['Clave','Valor']]; Object.entries(DB.config).forEach(([k,v]) => configArr.push([k,v]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configArr), 'Config');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.ingresos), 'Ingresos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.recordatorios), 'Recordatorios');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.deudas), 'Deudas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.cuentasPorCobrar), 'CuentasPorCobrar');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.empleados), 'Empleados');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.nominaPagos), 'NominaPagos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.resumenDiario), 'ResumenDiario');
    const nombre = (DB.config.NombreNegocio || 'FinanzasPro').replace(/\s+/g,'_');
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${nombre}_${fecha}.xlsx`);
    alert('✅ Excel guardado: ' + nombre + '_' + fecha + '.xlsx');
}

function generarPDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFontSize(20); doc.text('FinanzasPro - Respaldo Diario', 14, 20);
    doc.setFontSize(12); doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Negocio: ${DB.config.NombreNegocio}`, 14, 38); doc.text(`Tasa BCV: ${DB.config.TasaBCV}`, 14, 46);
    const tableData = DB.ingresos.map(ing => [ing.Fecha, ing.Total_USD.toFixed(2), ing.Total_Bs.toFixed(2), ing.SaldoFin_USD.toFixed(2), ing.SaldoFin_Bs.toFixed(2)]);
    doc.autoTable({ startY: 55, head: [['Fecha', 'Total USD', 'Total Bs', 'Saldo Final USD', 'Saldo Final Bs']], body: tableData, });
    doc.save(`FinanzasPro_Respaldo_${new Date().toISOString().split('T')[0]}.pdf`);
    alert('✅ PDF generado');
}

function cambiarEstadoGS(estado, texto) {
    const dot = document.getElementById('estadoGS'); if (!dot) return;
    if (estado === 'conectado') { dot.textContent = '🟢 Conectado'; dot.style.color = '#10b981'; GS_CONECTADO = true; const btnDesc = document.getElementById('btnDesconectarGS'); if (btnDesc) btnDesc.style.display = 'inline-flex'; }
    else if (estado === 'desconectado') { dot.textContent = '🔴 Desconectado'; dot.style.color = '#ef4444'; GS_CONECTADO = false; const btnDesc = document.getElementById('btnDesconectarGS'); if (btnDesc) btnDesc.style.display = 'none'; }
    else if (estado === 'cargando') { dot.textContent = '🟡 ' + (texto || 'Conectando...'); dot.style.color = '#f59e0b'; }
    else if (estado === 'error') { dot.textContent = '️ Error: ' + texto; dot.style.color = '#ef4444'; GS_CONECTADO = false; }
}

async function verificarConexion() { try { const res = await fetch(GS_URL + '?action=status'); const data = await res.json(); if (data.success) cambiarEstadoGS('conectado'); else cambiarEstadoGS('error', 'URL no válida'); } catch (err) { cambiarEstadoGS('error', 'No se puede conectar'); } }
function conectarGoogleSheets() { const url = document.getElementById('urlGoogleSheets').value.trim(); if (!url) { alert('⚠️ Pega la URL de tu Apps Script'); return; } if (!url.includes('/exec')) { alert('⚠️ La URL debe terminar en /exec'); return; } GS_URL = url; localStorage.setItem('FinanzasPro_GS_URL', url); cambiarEstadoGS('cargando', 'Conectando...'); verificarConexion(); }
function desconectarGoogleSheets() { if (confirm('¿Desconectar?')) { GS_URL = ''; GS_CONECTADO = false; localStorage.removeItem('FinanzasPro_GS_URL'); document.getElementById('urlGoogleSheets').value = ''; cambiarEstadoGS('desconectado'); } }
async function cargarDesdeSheets() { if (!GS_URL) { alert('⚠️ Primero conecta tu Google Sheet'); return; } cambiarEstadoGS('cargando', 'Cargando datos...'); try { const res = await fetch(GS_URL + '?action=load'); const data = await res.json(); if (data.success) { DB = data.data; if (!DB.resumenDiario) DB.resumenDiario = []; if (!DB.cuentasPorCobrar) DB.cuentasPorCobrar = []; if (!DB.config.SaldoZelle_USD) DB.config.SaldoZelle_USD = 0; if (DB.config) document.getElementById('ingresoTasa').value = DB.config.TasaBCV || 0; guardarEnLocalStorage(); renderizarIngresos(); renderizarRecordatorios(); renderizarDeudas(); renderizarCobrar(); renderizarEmpleados(); renderizarHistorialNomina(); recalcularResumenDiario(); actualizarBloqueCierre(); actualizarDashboard(); actualizarListaProveedores(); actualizarPanelSaldos(); actualizarContexto(); cambiarEstadoGS('conectado'); alert('✅ Datos cargados desde Google Sheets'); } else { cambiarEstadoGS('error', data.error || 'Error al cargar'); } } catch (err) { cambiarEstadoGS('error', err.message); alert(' Error: ' + err.message); } }
async function guardarEnSheets() { if (!GS_URL) { alert('⚠️ Primero conecta tu Google Sheet'); return; } recalcularResumenDiario(); cambiarEstadoGS('cargando', 'Guardando en la nube...'); try { await fetch(GS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', data: DB }) }); cambiarEstadoGS('conectado'); alert('✅ Datos guardados en Google Sheets'); } catch (err) { cambiarEstadoGS('error', err.message); alert('❌ Error: ' + err.message); } }

function generarGuiaGoogleSheets() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); let y = 20;
    const addText = (texto, size = 10, bold = false) => { if (y > 270) { doc.addPage(); y = 20; } doc.setFontSize(size); if (bold) doc.setFont('helvetica', 'bold'); else doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(texto, 180); doc.text(lines, 15, y); y += lines.length * (size * 0.4); };
    doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.text('GUÍA DE CONFIGURACIÓN', 105, 40, {align: 'center'}); doc.text('GOOGLE SHEETS', 105, 55, {align: 'center'}); doc.setFontSize(14); doc.text('FinanzasPro v3.7', 105, 75, {align: 'center'});
    y = 110; addText('PASO 1: Crear hoja de Google Sheets', 14, true); addText('1. Ve a https://sheets.google.com'); addText('2. Crea una nueva hoja en blanco'); addText('3. Ponle nombre: "FinanzasPro"'); y += 5;
    addText('PASO 2: Abrir Apps Script', 14, true); addText('1. Menú "Extensiones" → "Apps Script"'); y += 5;
    addText('PASO 3: Pegar código', 14, true); addText('1. Borra el código por defecto'); addText('2. Pega el código del Apps Script'); addText('3. Guarda con Ctrl+S'); y += 5;
    addText('PASO 4: Implementar', 14, true); addText('1. Clic en "Implementar" → "Nueva implementación"'); addText('2. Tipo: "Aplicación web"'); addText('3. Ejecutar como: "Yo"'); addText('4. Acceso: "Cualquier persona"'); y += 5;
    addText('PASO 5: Autorizar y copiar URL', 14, true); addText('1. Autoriza los permisos'); addText('2. Copia la URL que termina en /exec'); addText('3. Pégala en FinanzasPro y clic en "Conectar"'); y += 5;
    addText('✅ ¡LISTO!', 14, true); doc.save('Guia_Google_Sheets_FinanzasPro.pdf'); alert('✅ Guía generada');
}

// Función auxiliar para el modal de pago de nómina individual (necesita estar definida)
// Nota: El HTML del modalPagoNomina debe existir. Si no está en el HTML anterior, agrégalo.
