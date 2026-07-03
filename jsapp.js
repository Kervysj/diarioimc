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
    saldosInicialesBloqueados: false // NUEVO: Control de bloqueo
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
        contenido.innerHTML = '<p style="padding:20px;text-align:center;color:#666;"> Aún no hay datos para analizar.</p>';
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
    
    let html = '<div style="padding:10px; color: var(--text-primary);">';
    html += '<h3 style="color:#667eea;margin-bottom:10px;"> Análisis del Día</h3>';
    
    if (hoyData.IngresosUSD > 0) {
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;">💰 Hoy llevas <strong>$${hoyData.NetoUSD.toFixed(2)}</strong> de ganancia neta.</div>`;
    } else {
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;">ℹ️ Aún no hay registros para hoy.</div>`;
    }
    
    if (ayerData.IngresosUSD > 0) {
        const diff = hoyData.NetoUSD - ayerData.NetoUSD;
        const pct = ayerData.NetoUSD !== 0 ? ((diff / Math.abs(ayerData.NetoUSD)) * 100).toFixed(1) : 0;
        const clase = diff >= 0 ? 'neto-positivo' : 'neto-negativo';
        const emoji = diff >= 0 ? '📈' : '📉';
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;" class="${clase}">${emoji} vs ayer: <strong>${diff >= 0 ? '+' : ''}$${diff.toFixed(2)} (${pct}%)</strong></div>`;
    }
    
    html += '<h3 style="color:#667eea;margin:20px 0 10px 0;">📅 Comparación Mensual</h3>';
    if (mesPasadoData.IngresosUSD > 0) {
        const diffMes = mesActualData.NetoUSD - mesPasadoData.NetoUSD;
        const pctMes = mesPasadoData.NetoUSD !== 0 ? ((diffMes / Math.abs(mesPasadoData.NetoUSD)) * 100).toFixed(1) : 0;
        const clase = diffMes >= 0 ? 'neto-positivo' : 'neto-negativo';
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;" class="${clase}">${diffMes >= 0 ? '🚀' : '️'} Mes actual vs mes pasado: <strong>${diffMes >= 0 ? '+' : ''}$${diffMes.toFixed(2)} (${pctMes}%)</strong></div>`;
    }
    
    html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;">📊 Promedio diario este mes: <strong>$${promedioMensual.toFixed(2)}</strong></div>`;
    
    if (diasConsecutivosNegativos >= 2) {
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px; color:var(--danger);">⚠️ <strong>${diasConsecutivosNegativos} días seguidos con pérdidas.</strong> Revisa gastos.</div>`;
    } else if (diasConsecutivosNegativos === 1) {
        html += `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px;">ℹ️ Ayer fue un día negativo, pero hoy puedes recuperarte.</div>`;
    }
    
    html += '<h3 style="color:#667eea;margin:20px 0 10px 0;"> Veredicto</h3>';
    let veredicto = '';
    if (mesActualData.NetoUSD > mesPasadoData.NetoUSD && mesPasadoData.NetoUSD > 0) {
        veredicto = `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px; color:var(--success); font-weight:bold;">✅ <strong>¡Vamos bien!</strong> Estás mejorando vs el mes pasado.</div>`;
    } else if (mesActualData.NetoUSD < 0) {
        veredicto = `<div style="padding:10px; margin:5px 0; background:var(--bg-input); border-radius:8px; color:var(--danger); font-weight:bold;">️ <strong>Hay que mejorar.</strong> Este mes va en negativo.</div>`;
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
        alert('⚠️ No hay datos de análisis para exportar');
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
