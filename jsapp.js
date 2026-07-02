// ============================================================
// FinanzasPro v3.5 - Lógica Principal COMPLETA
// ============================================================
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
    empleados: [],
    nominaPagos: [],
    resumenDiario: [],
    notas: ''
};
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
    
    // ✅ NUEVO: Establecer fecha máxima (hoy) en todos los inputs de fecha excepto búsqueda
    const inputsFecha = document.querySelectorAll('input[type="date"]:not(#busqDesde):not(#busqHasta):not(#analisisFecha)');
    inputsFecha.forEach(input => {
        input.setAttribute('max', hoy);
    });
    
    // ✅ NUEVO: En pagar proveedor, la fecha debe ser solo hoy (no anteriores)
    const deudaFecha = document.getElementById('deudaFecha');
    if (deudaFecha) {
        deudaFecha.setAttribute('min', hoy);
        deudaFecha.setAttribute('max', hoy);
    }
    
    const ingresoFecha = document.getElementById('ingresoFecha');
    if (ingresoFecha) ingresoFecha.value = hoy;

    const recFechaActual = document.getElementById('recordatorioFechaActual');
    if (recFechaActual) recFechaActual.value = hoy;
    const recFecha = document.getElementById('recordatorioFecha');
    if (recFecha) recFecha.value = hoy;

    if (deudaFecha) deudaFecha.value = hoy;

    const empFecha = document.getElementById('empleadoFecha');
    if (empFecha) empFecha.value = hoy;

    const nominaFecha = document.getElementById('nominaFechaPago');
    if (nominaFecha) nominaFecha.value = hoy;

    const analisisMes = document.getElementById('analisisMes');
    if (analisisMes) analisisMes.value = mesActual;

    cargarDesdeLocalStorage();
    
    // ✅ NUEVO: Actualizar panel de saldos al cargar
    actualizarPanelSaldos();

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
        
        // ✅ NUEVO: Actualizar panel de saldos al cambiar de pestaña
        actualizarPanelSaldos();
        
        if (tab.dataset.tab === 'tabAnalisis') {
            setTimeout(() => renderizarResumenDiario(), 100);
        }
    });
});

// ============================================================
// ✅ NUEVO: ACTUALIZAR PANEL DE SALDOS EN TODAS LAS PESTAÑAS
// ============================================================
function actualizarPanelSaldos() {
    const saldoBinance = document.getElementById('saldoBinanceDisplay');
    const saldoZelle = document.getElementById('saldoZelleDisplay');
    const saldoEmpresa = document.getElementById('saldoEmpresaDisplay');
    const saldoPersonal = document.getElementById('saldoPersonalDisplay');
    const saldoEmpresaBs = document.getElementById('saldoEmpresaBsDisplay');
    const saldoPersonalBs = document.getElementById('saldoPersonalBsDisplay');
    
    if (saldoBinance) saldoBinance.textContent = '$' + (DB.config.SaldoBinance_USD || 0).toFixed(2);
    if (saldoZelle) saldoZelle.textContent = '$' + (DB.config.SaldoZelle_USD || 0).toFixed(2);
    if (saldoEmpresa) saldoEmpresa.textContent = '$' + (DB.config.SaldoEmpresa_USD || 0).toFixed(2);
    if (saldoPersonal) saldoPersonal.textContent = '$' + (DB.config.SaldoPersonal_USD || 0).toFixed(2);
    if (saldoEmpresaBs) saldoEmpresaBs.textContent = 'Bs. ' + (DB.config.SaldoEmpresa_Bs || 0).toFixed(2);
    if (saldoPersonalBs) saldoPersonalBs.textContent = 'Bs. ' + (DB.config.SaldoPersonal_Bs || 0).toFixed(2);
}

// ============================================================
// VALIDACIÓN SALDO INICIAL
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

// ✅ CORREGIDO: Usar ingresoTasa en lugar de tasaBCV
function calcularMontoBSRecordatorio() {
    const tasa = parseFloat(document.getElementById('ingresoTasa').value) || 0;
    const montoUSD = parseFloat(document.getElementById('recordatorioMontoUSD').value) || 0;
    document.getElementById('recordatorioMontoBSCalculado').value = (montoUSD * tasa).toFixed(2);
}

// ✅ CORREGIDO: Usar ingresoTasa en lugar de tasaBCV
function calcularMontoBSDeuda() {
    const tasa = parseFloat(document.getElementById('ingresoTasa').value) || 0;
    const montoUSD = parseFloat(document.getElementById('deudaMontoUSD').value) || 0;
    document.getElementById('deudaMontoBSCalculado').value = (montoUSD * tasa).toFixed(2);
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
    DB.ingresos.forEach(ing => {
        const fecha = ing.Fecha;
        if (!fecha) return;
        if (!dias[fecha]) {
            dias[fecha] = {
                Fecha: fecha,
                IngresosUSD: 0, IngresosBS: 0,
                PagosUSD: 0, PagosBS: 0,
                NominaUSD: 0, NominaBS: 0,
                TasaBCV: ing.TasaBCV || DB.config.TasaBCV || 0
            };
        }
        dias[fecha].IngresosUSD += ing.Total_USD || 0;
        dias[fecha].IngresosBS += ing.Total_Bs || 0;
        if (ing.TasaBCV) dias[fecha].TasaBCV = ing.TasaBCV;
    });

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
                        TasaBCV: DB.config.TasaBCV || 0
                    };
                }
                dias[fecha].PagosUSD += pago.MontoUSD || 0;
                dias[fecha].PagosBS += pago.MontoBs || 0;
            });
        }
    });

    DB.nominaPagos.forEach(pago => {
        const fecha = pago.FechaPago;
        if (!fecha) return;
        if (!dias[fecha]) {
            dias[fecha] = {
                Fecha: fecha,
                IngresosUSD: 0, IngresosBS: 0,
                PagosUSD: 0, PagosBS: 0,
                NominaUSD: 0, NominaBS: 0,
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
            NetoUSD: d.IngresosUSD - totalEgresosUSD,
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
                TasaBCV: 0, contadorTasa: 0
            };
        }
        meses[mes].IngresosUSD += d.IngresosUSD;
        meses[mes].IngresosBS += d.IngresosBS;
        meses[mes].PagosUSD += d.PagosUSD;
        meses[mes].PagosBS += d.PagosBS;
        meses[mes].NominaUSD += d.NominaUSD;
        meses[mes].NominaBS += d.NominaBS;
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
            TasaBCV: m.contadorTasa > 0 ? m.TasaBCV / m.contadorTasa : 0,
            NetoUSD: m.IngresosUSD - totalEgresosUSD,
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
                TasaBCV: 0, contadorTasa: 0
            };
        }
        anios[anio].IngresosUSD += d.IngresosUSD;
        anios[anio].IngresosBS += d.IngresosBS;
        anios[anio].PagosUSD += d.PagosUSD;
        anios[anio].PagosBS += d.PagosBS;
        anios[anio].NominaUSD += d.NominaUSD;
        anios[anio].NominaBS += d.NominaBS;
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
            TasaBCV: a.contadorTasa > 0 ? a.TasaBCV / a.contadorTasa : 0,
            NetoUSD: a.IngresosUSD - totalEgresosUSD,
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

    if (graficoAnalisis) {
        graficoAnalisis.destroy();
    }

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
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function mostrarAnalisisInteligente() {
    recalcularResumenDiario();
    const modal = document.getElementById('modalAnalisisInteligente');
    const contenido = document.getElementById('contenidoAnalisisInteligente');
    if (DB.resumenDiario.length === 0) {
        contenido.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">📊 Aún no hay datos para analizar. Registra algunos ingresos primero.</p>';
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
        .reduce((acc, d) => ({ 
            NetoUSD: acc.NetoUSD + d.NetoUSD, 
            IngresosUSD: acc.IngresosUSD + d.IngresosUSD 
        }), { NetoUSD: 0, IngresosUSD: 0 });

    const mesPasadoData = DB.resumenDiario
        .filter(d => d.Fecha.startsWith(mesPasado))
        .reduce((acc, d) => ({ 
            NetoUSD: acc.NetoUSD + d.NetoUSD, 
            IngresosUSD: acc.IngresosUSD + d.IngresosUSD 
        }), { NetoUSD: 0, IngresosUSD: 0 });

    const diasConsecutivosNegativos = contarDiasNegativosConsecutivos();
    const promedioMensual = mesActualData.NetoUSD / Math.max(1, new Date().getDate());

    let html = '<div style="padding:10px;">';

    html += '<h3 style="color:#667eea;margin-bottom:10px;">📊 Análisis del Día</h3>';
    if (hoyData.IngresosUSD > 0) {
        html += `<div class="insight ${hoyData.NetoUSD > 0 ? 'positivo' : 'negativo'}">
            💰 Hoy llevas <strong>$${hoyData.NetoUSD.toFixed(2)}</strong> de ganancia neta.
         </div>`;
    } else {
        html += `<div class="insight neutro">ℹ️ Aún no hay registros para hoy.</div>`;
    }

    if (ayerData.IngresosUSD > 0) {
        const diff = hoyData.NetoUSD - ayerData.NetoUSD;
        const pct = ayerData.NetoUSD !== 0 ? ((diff / Math.abs(ayerData.NetoUSD)) * 100).toFixed(1) : 0;
        const clase = diff >= 0 ? 'positivo' : 'negativo';
        const emoji = diff >= 0 ? '📈' : '📉';
        html += `<div class="insight ${clase}">
            ${emoji} vs ayer: <strong>${diff >= 0 ? '+' : ''}$${diff.toFixed(2)} (${pct}%)</strong>
         </div>`;
    }

    html += '<h3 style="color:#667eea;margin:20px 0 10px 0;">📅 Comparación Mensual</h3>';
    if (mesPasadoData.IngresosUSD > 0) {
        const diffMes = mesActualData.NetoUSD - mesPasadoData.NetoUSD;
        const pctMes = mesPasadoData.NetoUSD !== 0 ? ((diffMes / Math.abs(mesPasadoData.NetoUSD)) * 100).toFixed(1) : 0;
        const clase = diffMes >= 0 ? 'positivo' : 'negativo';
        html += `<div class="insight ${clase}">
            ${diffMes >= 0 ? '' : '⚠️'} Mes actual vs mes pasado: <strong>${diffMes >= 0 ? '+' : ''}$${diffMes.toFixed(2)} (${pctMes}%)</strong>
         </div>`;
    }

    html += `<div class="insight neutro">
        📊 Promedio diario este mes: <strong>$${promedioMensual.toFixed(2)}</strong>
     </div>`;

    if (diasConsecutivosNegativos >= 2) {
        html += `<div class="insight negativo">
            ⚠️ <strong>${diasConsecutivosNegativos} días seguidos con pérdidas.</strong> Revisa gastos.
         </div>`;
    } else if (diasConsecutivosNegativos === 1) {
        html += `<div class="insight neutro">
            ℹ️ Ayer fue un día negativo, pero hoy puedes recuperarte.
         </div>`;
    }

    html += '<h3 style="color:#667eea;margin:20px 0 10px 0;">🎯 Veredicto</h3>';
    let veredicto = '';
    if (mesActualData.NetoUSD > mesPasadoData.NetoUSD && mesPasadoData.NetoUSD > 0) {
        veredicto = `<div class="insight positivo" style="font-size:1.1em;font-weight:bold;">
            ✅ <strong>¡Vamos bien!</strong> Estás mejorando vs el mes pasado.
         </div>`;
    } else if (mesActualData.NetoUSD < 0) {
        veredicto = `<div class="insight negativo" style="font-size:1.1em;font-weight:bold;">
            ⚠️ <strong>Hay que mejorar.</strong> Este mes va en negativo.
         </div>`;
    } else if (mesActualData.NetoUSD > 0 && mesActualData.NetoUSD < mesPasadoData.NetoUSD) {
        veredicto = `<div class="insight neutro" style="font-size:1.1em;font-weight:bold;">
            📉 <strong>Vas bajando</strong> vs el mes pasado. Mantén el enfoque.
         </div>`;
    } else {
        veredicto = `<div class="insight neutro" style="font-size:1.1em;font-weight:bold;">
            📊 <strong>Sigue registrando</strong> para tener más datos para comparar.
         </div>`;
    }
    html += veredicto;

    html += '</div>';
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
        'Nómina Bs': d.NominaBS.toFixed(2),
        'NETO USD': d.NetoUSD.toFixed(2),
        'NETO Bs': d.NetoBS.toFixed(2),
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

    // ✅ NUEVO: Sumar los ingresos a las cuentas correspondientes
    DB.config.SaldoBinance_USD += ingreso.Binance_USD;
    DB.config.SaldoZelle_USD += ingreso.Zelle_USD;
    DB.config.SaldoEmpresa_Bs += ingreso.Efectivo_Bs + ingreso.PagoMovil_Bs + ingreso.Transferencia_Bs +
        (ingreso.TarjetaDebitoMoneda === 'BS' ? ingreso.TarjetaDebito : 0) +
        (ingreso.TarjetaCreditoMoneda === 'BS' ? ingreso.TarjetaCredito : 0);

    DB.ingresos.push(ingreso);
    DB.config.TasaBCV = ingreso.TasaBCV;

    guardarEnLocalStorage();
    renderizarIngresos();
    recalcularResumenDiario();
    actualizarBloqueCierre();
    actualizarPanelSaldos(); // ✅ NUEVO
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
        tr.innerHTML = `<td>${ing.Fecha}</td><td>${ing.TasaBCV}</td><td>${ing.SaldoIni_USD.toFixed(2)}</td><td>${ing.SaldoIni_Bs.toFixed(2)}</td><td>${ing.Efectivo_USD.toFixed(2)}</td><td>${ing.Efectivo_Bs.toFixed(2)}</td><td>${ing.PagoMovil_Bs.toFixed(2)}</td><td>${ing.TarjetaDebito.toFixed(2)}</td><td>${ing.TarjetaCredito.toFixed(2)}</td><td>${ing.Transferencia_Bs.toFixed(2)}</td><td>${ing.Zelle_USD.toFixed(2)}</td><td>${ing.Binance_USD.toFixed(2)}</td><td><strong>${ing.Total_USD.toFixed(2)}</strong></td><td><strong>${ing.Total_Bs.toFixed(2)}</strong></td><td>${ing.SaldoFin_USD.toFixed(2)}</td><td>${ing.SaldoFin_Bs.toFixed(2)}</td><td><button class="btn btn-danger" onclick="eliminarIngreso(${ing.ID})">️</button></td>`;
        tbody.appendChild(tr);
    });
}

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
        tr.innerHTML = `<td>${rec.FechaRecordatorio}</td><td>${rec.Descripcion}</td><td>$${rec.MontoUSD.toFixed(2)}</td><td>Bs. ${rec.MontoBs.toFixed(2)}</td><td><span class="badge ${badgeClass}">${rec.Prioridad}</span></td><td>${rec.Detalle}</td><td>${rec.Completado ? '✅ Completado' : '⏳ Pendiente'}</td><td><button class="btn btn-${rec.Completado ? 'warning' : 'success'}" onclick="toggleRecordatorio(${rec.ID})"> ${rec.Completado ? '↩️' : '✅'} </button><button class="btn btn-danger" onclick="eliminarRecordatorio(${rec.ID})">🗑️</button></td>`;
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
// DEUDAS / PAGAR
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
    if (!nombre) { alert('⚠️ Debes ingresar el nombre del proveedor'); return; }
    if (montoUSD <= 0) { alert('⚠️ Debes ingresar un monto mayor a 0'); return; }
    
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
                    <button class="btn btn-success" onclick="abrirModalPago(${deuda.ID})"></button>
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

// ✅ NUEVO: Mostrar saldos en el modal de pago
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
    
    // ✅ NUEVO: Mostrar saldos disponibles
    document.getElementById('modalSaldoBinance').textContent = '$' + (DB.config.SaldoBinance_USD || 0).toFixed(2);
    document.getElementById('modalSaldoZelle').textContent = '$' + (DB.config.SaldoZelle_USD || 0).toFixed(2);
    document.getElementById('modalSaldoEmpresa').textContent = '$' + (DB.config.SaldoEmpresa_USD || 0).toFixed(2);
    document.getElementById('modalSaldoPersonal').textContent = '$' + (DB.config.SaldoPersonal_USD || 0).toFixed(2);
    
    // Ocultar alerta de saldo insuficiente
    document.getElementById('alertaSaldoInsuficiente').style.display = 'none';
    
    document.getElementById('modalPagoDeuda').style.display = 'flex';
}

// ✅ NUEVO: Verificar si hay saldo suficiente
function verificarSaldoDisponible() {
    const montoPago = parseFloat(document.getElementById('pagoDeudaMonto').value) || 0;
    const cuentaOrigen = document.getElementById('pagoDeudaCuenta').value;
    const alerta = document.getElementById('alertaSaldoInsuficiente');
    
    let saldoDisponible = 0;
    if (cuentaOrigen === 'Binance') {
        saldoDisponible = DB.config.SaldoBinance_USD || 0;
    } else if (cuentaOrigen === 'Zelle') {
        saldoDisponible = DB.config.SaldoZelle_USD || 0;
    } else if (cuentaOrigen === 'Empresa') {
        saldoDisponible = DB.config.SaldoEmpresa_USD || 0;
    } else if (cuentaOrigen === 'Personal') {
        saldoDisponible = DB.config.SaldoPersonal_USD || 0;
    }
    
    if (montoPago > saldoDisponible) {
        alerta.style.display = 'block';
    } else {
        alerta.style.display = 'none';
    }
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
    if (montoPago > deuda.SaldoPendiente) {
        alert('⚠️ El monto no puede ser mayor al saldo pendiente ($' + deuda.SaldoPendiente.toFixed(2) + ')');
        return;
    }
    if (!fechaPago) { alert('⚠️ Debes seleccionar la fecha de pago'); return; }
    if (!referencia) { alert('⚠️ Debes ingresar la referencia de pago'); return; }

    // ✅ NUEVO: Verificar saldo suficiente antes de pagar
    let saldoDisponible = 0;
    if (cuentaOrigen === 'Binance') {
        saldoDisponible = DB.config.SaldoBinance_USD || 0;
    } else if (cuentaOrigen === 'Zelle') {
        saldoDisponible = DB.config.SaldoZelle_USD || 0;
    } else if (cuentaOrigen === 'Empresa') {
        saldoDisponible = DB.config.SaldoEmpresa_USD || 0;
    } else if (cuentaOrigen === 'Personal') {
        saldoDisponible = DB.config.SaldoPersonal_USD || 0;
    }
    
    if (montoPago > saldoDisponible) {
        alert('⚠️ Saldo insuficiente en la cuenta seleccionada. Saldo disponible: $' + saldoDisponible.toFixed(2));
        return;
    }

    // ✅ NUEVO: Descontar de la cuenta seleccionada
    if (cuentaOrigen === 'Binance') {
        DB.config.SaldoBinance_USD -= montoPago;
    } else if (cuentaOrigen === 'Zelle') {
        DB.config.SaldoZelle_USD -= montoPago;
    } else if (cuentaOrigen === 'Empresa') {
        DB.config.SaldoEmpresa_USD -= montoPago;
    } else if (cuentaOrigen === 'Personal') {
        DB.config.SaldoPersonal_USD -= montoPago;
    }

    const tasa = DB.config.TasaBCV || 0;
    const pagoRegistro = {
        Fecha: fechaPago,
        MontoUSD: montoPago,
        MontoBs: montoPago * tasa,
        CuentaOrigen: cuentaOrigen,
        ReferenciaPago: referencia,
        Observacion: observacion
    };

    if (!deuda.HistorialPagos) deuda.HistorialPagos = [];
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
    recalcularResumenDiario();
    actualizarBloqueCierre();
    actualizarPanelSaldos(); // ✅ NUEVO
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
        alert(' No hay pagos registrados para esta factura');
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
    document.getElementById('deudaMontoBSCalculado').value = '';
    document.getElementById('deudaCuentaOrigen').value = '';
}

// ============================================================
// EMPLEADOS
// ============================================================
function guardarEmpleado() {
    const nombre = document.getElementById('empleadoNombre').value.trim();
    const cedula = document.getElementById('empleadoCedula').value.trim();
    const sueldo = parseFloat(document.getElementById('empleadoSueldo').value) || 0;
    if (!nombre) { alert('⚠️ Debes ingresar el nombre del empleado'); return; }
    if (!cedula) { alert('⚠️ Debes ingresar la cédula'); return; }
    if (sueldo <= 0) { alert('⚠️ Debes ingresar un sueldo mayor a 0'); return; }
    
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
        tr.innerHTML = `<td>${emp.FechaIngreso}</td><td>${emp.Nombre}</td><td>${emp.Cedula}</td><td>${emp.TipoSueldo}</td><td>$${emp.SueldoUSD.toFixed(2)}</td><td>${emp.Status}</td><td><button class="btn btn-primary" onclick="editarEmpleado(${emp.ID})">✏️</button><button class="btn btn-danger" onclick="eliminarEmpleado(${emp.ID})">🗑️</button></td>`;
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
    
    const nombre = document.getElementById('editEmpleadoNombre').value.trim();
    const cedula = document.getElementById('editEmpleadoCedula').value.trim();
    const sueldo = parseFloat(document.getElementById('editEmpleadoSueldo').value) || 0;

    if (!nombre) { alert('⚠️ Debes ingresar el nombre'); return; }
    if (!cedula) { alert('⚠️ Debes ingresar la cédula'); return; }
    if (sueldo <= 0) { alert('⚠️ Debes ingresar un sueldo mayor a 0'); return; }

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
        tr.innerHTML = `<td>${emp.Nombre}</td><td>${emp.Cedula}</td><td>${emp.TipoSueldo}</td><td>$${emp.Sueldo.toFixed(2)}</td><td><input type="number" step="0.01" value="${emp.Bono}" onchange="actualizarNetoNomina(${index}, this.value, 'bono')" style="width:80px;padding:5px;"></td><td><input type="number" step="0.01" value="${emp.Deuda}" onchange="actualizarNetoNomina(${index}, this.value, 'deuda')" style="width:80px;padding:5px;"></td><td><strong>$${emp.Neto.toFixed(2)}</strong></td><td><input type="checkbox" ${emp.Pagado ? 'checked' : ''} onchange="togglePagoNomina(${index})"></td><td><button class="btn btn-danger" onclick="eliminarDeNomina(${index})">️</button></td>`;
        tbody.appendChild(tr);
        totalPagar += emp.Neto;
    });
    document.getElementById('totalNominaPagar').textContent = totalPagar.toFixed(2);
}

function actualizarNetoNomina(index, valor, tipo) {
    const val = parseFloat(valor) || 0;
    if (tipo === 'bono') nominaTemporal[index].Bono = val;
    else if (tipo === 'deuda') nominaTemporal[index].Deuda = val;
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
    if (!fechaPago) { alert('⚠️ Debes seleccionar la fecha de pago'); return; }
    
    const pagosRealizados = nominaTemporal.filter(e => e.Pagado);
    if (pagosRealizados.length === 0) {
        alert('⚠️ Debes marcar al menos un empleado como pagado');
        return;
    }

    const totalNomina = pagosRealizados.reduce((sum, emp) => sum + emp.Neto, 0);
    
    // ✅ NUEVO: Verificar saldo suficiente antes de pagar nómina
    let saldoDisponible = 0;
    if (cuentaOrigen === 'Binance') {
        saldoDisponible = DB.config.SaldoBinance_USD || 0;
    } else if (cuentaOrigen === 'Zelle') {
        saldoDisponible = DB.config.SaldoZelle_USD || 0;
    } else if (cuentaOrigen === 'Empresa') {
        saldoDisponible = DB.config.SaldoEmpresa_USD || 0;
    } else if (cuentaOrigen === 'Personal') {
        saldoDisponible = DB.config.SaldoPersonal_USD || 0;
    }
    
    if (totalNomina > saldoDisponible) {
        alert('⚠️ Saldo insuficiente en la cuenta seleccionada. Saldo disponible: $' + saldoDisponible.toFixed(2) + ' | Total a pagar: $' + totalNomina.toFixed(2));
        return;
    }

    // ✅ NUEVO: Descontar de la cuenta seleccionada
    if (cuentaOrigen === 'Binance') {
        DB.config.SaldoBinance_USD -= totalNomina;
    } else if (cuentaOrigen === 'Zelle') {
        DB.config.SaldoZelle_USD -= totalNomina;
    } else if (cuentaOrigen === 'Empresa') {
        DB.config.SaldoEmpresa_USD -= totalNomina;
    } else if (cuentaOrigen === 'Personal') {
        DB.config.SaldoPersonal_USD -= totalNomina;
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
    recalcularResumenDiario();
    actualizarBloqueCierre();
    actualizarPanelSaldos(); // ✅ NUEVO
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
        tr.innerHTML = `<td>${pago.FechaPago}</td><td>${pago.Nombre}</td><td>${pago.Cedula}</td><td>$${pago.Sueldo.toFixed(2)}</td><td>$${pago.Bono.toFixed(2)}</td><td>$${pago.Deuda.toFixed(2)}</td><td><strong>$${pago.Neto.toFixed(2)}</strong></td><td>${pago.CuentaOrigen}</td><td>✅ ${pago.Status}</td>`;
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
            resultados.push({ 
                tipo: 'Ingreso', 
                fecha: ing.Fecha, 
                icono: '📈',
                titulo: `Ingreso del ${ing.Fecha}`,
                texto: `Total: $${ing.Total_USD.toFixed(2)} / Bs.${ing.Total_Bs.toFixed(2)}`,
                detalle: `Tasa: ${ing.TasaBCV} | Saldo Final: $${ing.SaldoFin_USD.toFixed(2)}`
            });
        });
    }

    if (filtro === 'todos' || filtro === 'deudas') {
        DB.deudas.forEach(d => {
            if (desde && d.Fecha < desde) return;
            if (hasta && d.Fecha > hasta) return;
            if (texto && !JSON.stringify(d).toLowerCase().includes(texto)) return;
            resultados.push({ 
                tipo: 'Deuda', 
                fecha: d.Fecha, 
                icono: '💳',
                titulo: `${d.Nombre}`,
                texto: `Factura: ${d.NroFactura} - $${d.MontoUSD.toFixed(2)}`,
                detalle: `Abonado: $${d.TotalAbonado.toFixed(2)} | Pendiente: $${d.SaldoPendiente.toFixed(2)}`
            });
        });
    }

    if (filtro === 'todos' || filtro === 'recordatorios') {
        DB.recordatorios.forEach(r => {
            if (desde && r.FechaRecordatorio < desde) return;
            if (hasta && r.FechaRecordatorio > hasta) return;
            if (texto && !JSON.stringify(r).toLowerCase().includes(texto)) return;
            resultados.push({ 
                tipo: 'Recordatorio', 
                fecha: r.FechaRecordatorio, 
                icono: '🔔',
                titulo: r.Descripcion,
                texto: `$${r.MontoUSD.toFixed(2)} / Bs.${r.MontoBs.toFixed(2)}`,
                detalle: r.Detalle || ''
            });
        });
    }

    if (filtro === 'todos' || filtro === 'nomina') {
        DB.nominaPagos.forEach(p => {
            if (desde && p.FechaPago < desde) return;
            if (hasta && p.FechaPago > hasta) return;
            if (texto && !JSON.stringify(p).toLowerCase().includes(texto)) return;
            resultados.push({ 
                tipo: 'Nómina', 
                fecha: p.FechaPago, 
                icono: '👥',
                titulo: `${p.Nombre}`,
                texto: `Neto: $${p.Neto.toFixed(2)}`,
                detalle: `Cédula: ${p.Cedula} | Cuenta: ${p.CuentaOrigen}`
            });
        });
    }

    const cont = document.getElementById('resultadosBusqueda');
    if (resultados.length === 0) {
        cont.innerHTML = '<p style="padding:20px;text-align:center;color:#666;">Sin resultados</p>';
    } else {
        cont.innerHTML = `<p style="padding:10px;font-weight:600;">${resultados.length} resultado(s) encontrado(s)</p>` +
            resultados.map(r => `
                <div style="padding:15px;background:white;margin:10px 0;border-radius:10px;border-left:5px solid #667eea;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                        <span style="font-size:1.8em;">${r.icono}</span>
                        <div>
                            <strong style="font-size:1.1em;color:#333;">${r.titulo}</strong>
                            <div style="color:#6b7280;font-size:0.9em;">${r.tipo} - ${r.fecha}</div>
                        </div>
                    </div>
                    <div style="font-size:1.1em;color:#667eea;font-weight:600;margin:5px 0;">${r.texto}</div>
                    ${r.detalle ? `<div style="color:#6b7280;font-size:0.9em;margin-top:5px;">${r.detalle}</div>` : ''}
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
// RESET DEL SISTEMA CON CLAVE SECRETA
// ============================================================
function resetearSistema() {
    document.getElementById('resetClave1').value = '';
    document.getElementById('resetClave2').value = '';
    document.getElementById('resetConfirmacion').checked = false;
    document.getElementById('modalReset').style.display = 'flex';
}

function confirmarReset() {
    const clave1 = document.getElementById('resetClave1').value;
    const clave2 = document.getElementById('resetClave2').value;
    const confirmado = document.getElementById('resetConfirmacion').checked;
    
    if (!confirmado) {
        alert('⚠️ Debes marcar la casilla de confirmación');
        return;
    }

    if (clave1 !== CLAVE_ADMIN) {
        alert('❌ Clave INCORRECTA. Acceso denegado.');
        document.getElementById('resetClave1').value = '';
        document.getElementById('resetClave1').focus();
        return;
    }

    if (clave2 !== CLAVE_ADMIN) {
        alert('❌ La segunda clave es INCORRECTA o no coincide.');
        document.getElementById('resetClave2').value = '';
        document.getElementById('resetClave2').focus();
        return;
    }

    if (clave1 !== clave2) {
        alert('❌ Las claves no coinciden entre sí.');
        return;
    }

    if (!confirm('⚠️ ÚLTIMA ADVERTENCIA ⚠️\n\n¿Estás 100% seguro de que quieres BORRAR TODOS los datos?\n\nEsta acción NO se puede deshacer.')) {
        return;
    }

    DB = {
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
        empleados: [],
        nominaPagos: [],
        resumenDiario: [],
        notas: ''
    };

    localStorage.removeItem('FinanzasProDB');

    document.getElementById('tasaBCV').value = '';
    document.getElementById('nombreNegocio').value = 'Mi Negocio';
    document.getElementById('saldoBinance').value = '';
    document.getElementById('saldoZelle').value = '';
    document.getElementById('saldoEmpresa').value = '';
    document.getElementById('saldoPersonal').value = '';
    document.getElementById('notasRapidas').value = '';
    document.getElementById('recordatorioTasa').value = '';

    renderizarIngresos();
    renderizarRecordatorios();
    renderizarDeudas();
    renderizarEmpleados();
    renderizarHistorialNomina();
    actualizarDashboard();
    actualizarListaProveedores();
    actualizarBloqueCierre();
    recalcularResumenDiario();
    actualizarPanelSaldos();

    document.getElementById('modalReset').style.display = 'none';

    alert('✅ Sistema reseteado completamente.\n\nTodos los datos han sido eliminados.\nEl sistema está como nuevo.');
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
        if (!DB.resumenDiario) DB.resumenDiario = [];
        if (!DB.config.SaldoZelle_USD) DB.config.SaldoZelle_USD = 0;
        
        document.getElementById('tasaBCV').value = DB.config.TasaBCV;
        const tasaInput = document.getElementById('recordatorioTasa');
        if (tasaInput) tasaInput.value = 'Bs. ' + DB.config.TasaBCV.toFixed(2);
        document.getElementById('nombreNegocio').value = DB.config.NombreNegocio;
        document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD;
        document.getElementById('saldoZelle').value = DB.config.SaldoZelle_USD;
        document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD;
        document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD;
        document.getElementById('notasRapidas').value = DB.notas || '';

        renderizarIngresos();
        renderizarRecordatorios();
        renderizarDeudas();
        renderizarEmpleados();
        renderizarHistorialNomina();
        recalcularResumenDiario();
        actualizarBloqueCierre();
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
        DB.resumenDiario = [];
        
        if (!DB.config.SaldoZelle_USD) DB.config.SaldoZelle_USD = 0;

        document.getElementById('tasaBCV').value = DB.config.TasaBCV;
        const tasaInput = document.getElementById('recordatorioTasa');
        if (tasaInput) tasaInput.value = 'Bs. ' + DB.config.TasaBCV.toFixed(2);
        document.getElementById('nombreNegocio').value = DB.config.NombreNegocio;
        document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD;
        document.getElementById('saldoZelle').value = DB.config.SaldoZelle_USD;
        document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD;
        document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD;
        
        guardarEnLocalStorage();
        renderizarIngresos();
        renderizarRecordatorios();
        renderizarDeudas();
        renderizarEmpleados();
        renderizarHistorialNomina();
        recalcularResumenDiario();
        actualizarBloqueCierre();
        actualizarDashboard();
        actualizarListaProveedores();
        actualizarPanelSaldos();
        
        alert('✅ Excel cargado: ' + file.name);

        if (DB.ingresos.length > 0) {
            const ultimaFecha = DB.ingresos[DB.ingresos.length - 1].Fecha;
            document.getElementById('busqDesde').value = ultimaFecha;
            document.getElementById('busqHasta').value = ultimaFecha;
            document.getElementById('busqFiltro').value = 'todos';
            realizarBusqueda();
            
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector('[data-tab="tabBusqueda"]').classList.add('active');
            document.getElementById('tabBusqueda').classList.add('active');
        }
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
    recalcularResumenDiario();
    const wb = XLSX.utils.book_new();
    const configArr = [['Clave','Valor']];
    Object.entries(DB.config).forEach(([k,v]) => configArr.push([k,v]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configArr), 'Config');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.ingresos), 'Ingresos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.recordatorios), 'Recordatorios');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.deudas), 'Deudas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.empleados), 'Empleados');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.nominaPagos), 'NominaPagos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DB.resumenDiario), 'ResumenDiario');
    const nombre = (DB.config.NombreNegocio || 'FinanzasPro').replace(/\s+/g,'_');
    XLSX.writeFile(wb, `${nombre}_${new Date().toISOString().split('T')[0]}.xlsx`);
    alert('✅ Excel guardado correctamente');
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
        dot.textContent = '';
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
        if (data.success) cambiarEstadoGS('conectado');
        else cambiarEstadoGS('error', 'URL no válida');
    } catch (err) {
        cambiarEstadoGS('error', 'No se puede conectar');
    }
}

function conectarGoogleSheets() {
    const url = document.getElementById('urlGoogleSheets').value.trim();
    if (!url) { alert('⚠️ Pega la URL de tu Apps Script (termina en /exec)'); return; }
    if (!url.includes('/exec')) { alert('⚠️ La URL debe terminar en /exec'); return; }
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
    if (!GS_URL) { alert('⚠️ Primero conecta tu Google Sheet'); return; }
    cambiarEstadoGS('cargando', 'Cargando datos...');
    try {
        const res = await fetch(GS_URL + '?action=load');
        const data = await res.json();
        
        if (data.success) {
            DB = data.data;
            if (!DB.resumenDiario) DB.resumenDiario = [];
            if (!DB.config.SaldoZelle_USD) DB.config.SaldoZelle_USD = 0;
            
            if (DB.config) {
                document.getElementById('tasaBCV').value = DB.config.TasaBCV || 0;
                document.getElementById('nombreNegocio').value = DB.config.NombreNegocio || '';
                document.getElementById('saldoBinance').value = DB.config.SaldoBinance_USD || 0;
                document.getElementById('saldoZelle').value = DB.config.SaldoZelle_USD || 0;
                document.getElementById('saldoEmpresa').value = DB.config.SaldoEmpresa_USD || 0;
                document.getElementById('saldoPersonal').value = DB.config.SaldoPersonal_USD || 0;
            }
            
            guardarEnLocalStorage();
            renderizarIngresos();
            renderizarRecordatorios();
            renderizarDeudas();
            renderizarEmpleados();
            renderizarHistorialNomina();
            recalcularResumenDiario();
            actualizarBloqueCierre();
            actualizarDashboard();
            actualizarListaProveedores();
            actualizarPanelSaldos();
            
            cambiarEstadoGS('conectado');
            alert('✅ Datos cargados desde Google Sheets correctamente');

            if (DB.ingresos.length > 0) {
                const ultimaFecha = DB.ingresos[DB.ingresos.length - 1].Fecha;
                document.getElementById('busqDesde').value = ultimaFecha;
                document.getElementById('busqHasta').value = ultimaFecha;
                document.getElementById('busqFiltro').value = 'todos';
                realizarBusqueda();
                
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelector('[data-tab="tabBusqueda"]').classList.add('active');
                document.getElementById('tabBusqueda').classList.add('active');
            }
        } else {
            cambiarEstadoGS('error', data.error || 'Error al cargar');
        }
    } catch (err) {
        cambiarEstadoGS('error', err.message);
        alert('❌ Error al conectar: ' + err.message);
    }
}

async function guardarEnSheets() {
    if (!GS_URL) { alert('⚠️ Primero conecta tu Google Sheet'); return; }
    recalcularResumenDiario();
    cambiarEstadoGS('cargando', 'Guardando en la nube...');
    try {
        await fetch(GS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save', data: DB })
        });
        cambiarEstadoGS('conectado');
        alert('✅ Datos guardados en Google Sheets correctamente');
    } catch (err) {
        cambiarEstadoGS('error', err.message);
        alert('❌ Error al guardar: ' + err.message);
    }
}
