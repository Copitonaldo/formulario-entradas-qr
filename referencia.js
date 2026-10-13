// Importar Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.4/+esm";

// Configuración de Supabase
const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeWVqZWVpZWh3ZmtkY2Jwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQwOTYsImV4cCI6MjA2NzE0MDA5Nn0.yDq4eOHujKH2nmg-F-DVnqCHGwdfEmf4Z968KXl1SDc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const formPadreNombreElem = document.getElementById('formPadreNombre');
const formPadreCodigoElem = document.getElementById('formPadreCodigo');
const crearReferenciaForm = document.getElementById('crearReferenciaForm');
const codigoReferenciaInput = document.getElementById('codigoReferencia');
const usosReferenciaInput = document.getElementById('usosReferencia');
const tipoEntradaInput = document.getElementById('tipoEntrada');
const tipoEntradaContainer = document.getElementById('tipoEntradaContainer');
const thTipoEntrada = document.getElementById('thTipoEntrada');
const referenciasTableBody = document.querySelector('#referenciasTable tbody');
const noReferenciasMsg = document.getElementById('noReferencias');
const errorMensajeElem = document.getElementById('errorMensaje');
const exitoMensajeElem = document.getElementById('exitoMensaje');

let currentFormPadreCodigo = null;
let currentFormPadreDbId = null; 
let currentFormTipo = 'normal';

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentFormPadreCodigo = urlParams.get('id_formulario');

  if (!currentFormPadreCodigo) {
    mostrarError('Error: No se especificó un ID de formulario padre en la URL.');
    if (formPadreNombreElem) formPadreNombreElem.textContent = 'Error';
    if (formPadreCodigoElem) formPadreCodigoElem.textContent = 'N/A';
    crearReferenciaForm.style.display = 'none';
    document.getElementById('referenciasTable').style.display = 'none';
    return;
  }

  if (formPadreCodigoElem) formPadreCodigoElem.textContent = currentFormPadreCodigo;
  await cargarInformacionFormularioPadre();
  if (currentFormPadreDbId) {
    await cargarReferenciasExistentes();
  }
});

async function cargarInformacionFormularioPadre() {
  const { data: formData, error } = await supabase
    .from('formularios')
    .select('id, nombre, tipo_formulario')
    .eq('codigo_form', currentFormPadreCodigo)
    .single();

  if (error || !formData) {
    console.error('Error cargando información del formulario padre:', error);
    mostrarError(`Error: No se pudo cargar información para el formulario con código ${currentFormPadreCodigo}.`);
    if (formPadreNombreElem) formPadreNombreElem.textContent = 'Desconocido';
    crearReferenciaForm.style.display = 'none';
    return;
  }

  currentFormPadreDbId = formData.id;
  currentFormTipo = formData.tipo_formulario || 'normal';
  
  if (formPadreNombreElem) formPadreNombreElem.textContent = formData.nombre || 'Sin nombre';

  // Mostrar u ocultar controles de VIP/General según el tipo de formulario
  if (currentFormTipo === 'vip_general') {
    if (tipoEntradaContainer) tipoEntradaContainer.style.display = 'block';
    if (tipoEntradaInput) tipoEntradaInput.required = true;
    if (thTipoEntrada) thTipoEntrada.style.display = '';
  } else {
    if (tipoEntradaContainer) tipoEntradaContainer.style.display = 'none';
    if (tipoEntradaInput) tipoEntradaInput.required = false;
    if (thTipoEntrada) thTipoEntrada.style.display = 'none';
  }
}

// --- Crear Referencia ---
crearReferenciaForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  ocultarMensajes();

  if (!currentFormPadreDbId) {
    mostrarError("Error: No se ha identificado el formulario padre. No se puede crear la referencia.");
    return;
  }

  const codigoReferencia = codigoReferenciaInput.value.trim();
  const usosReferencia = parseInt(usosReferenciaInput.value.trim());

  let tipoEntrada = 'Normal';
  if (currentFormTipo === 'vip_general') {
    tipoEntrada = tipoEntradaInput.value.trim();
    if (!['VIP', 'General'].includes(tipoEntrada)) {
      mostrarError('Debe seleccionar un tipo de entrada válido (VIP o General).');
      return;
    }
  }

  if (!/^\d{4}$/.test(codigoReferencia)) {
    mostrarError('El código de referencia debe ser un número de 4 dígitos.');
    return;
  }
  if (isNaN(usosReferencia) || usosReferencia < 1) {
    mostrarError('La cantidad de usos debe ser un número mayor o igual a 1.');
    return;
  }

  const { data: existingRef, error: checkError } = await supabase
    .from('referencias_usos')
    .select('id')
    .eq('formulario_id', currentFormPadreDbId)
    .eq('codigo_referencia', codigoReferencia)
    .maybeSingle();

  if (checkError) {
    console.error("Error verificando referencia existente:", checkError);
    mostrarError(`Error al verificar la referencia: ${checkError.message}`);
    return;
  }

  if (existingRef) {
    mostrarError(`El código de referencia '${codigoReferencia}' ya existe para este formulario.`);
    return;
  }

  const { error: insertError } = await supabase
    .from('referencias_usos')
    .insert([
      {
        formulario_id: currentFormPadreDbId,
        codigo_referencia: codigoReferencia,
        usos_disponibles: usosReferencia,
        usos_iniciales: usosReferencia,
        tipo_entrada: tipoEntrada
      }
    ]);

  if (insertError) {
    console.error("Error al crear referencia:", insertError);
    mostrarError(`No se pudo crear la referencia: ${insertError.message}`);
  } else {
    mostrarExito(`Referencia '${codigoReferencia}' creada con éxito.`);
    crearReferenciaForm.reset();
    await cargarReferenciasExistentes();
  }
});

// --- Cargar Referencias Existentes ---
async function cargarReferenciasExistentes() {
  if (!currentFormPadreDbId) return;

  const { data, error } = await supabase
    .from('referencias_usos')
    .select('id, codigo_referencia, tipo_entrada, usos_disponibles, usos_iniciales')
    .eq('formulario_id', currentFormPadreDbId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error cargando referencias existentes:", error);
    mostrarError(`Error al cargar las referencias: ${error.message}`);
    referenciasTableBody.innerHTML = '<tr><td colspan="4">Error al cargar datos.</td></tr>';
    noReferenciasMsg.style.display = 'none';
    return;
  }

  referenciasTableBody.innerHTML = '';
  if (data && data.length > 0) {
    noReferenciasMsg.style.display = 'none';
    data.forEach(ref => {
      const tr = document.createElement('tr');
      
      let htmlCeldaTipo = '';
      if (currentFormTipo === 'vip_general') {
        htmlCeldaTipo = `<td><strong>${ref.tipo_entrada || 'General'}</strong></td>`;
      }

      tr.innerHTML = `
        <td>${ref.codigo_referencia}</td>
        ${htmlCeldaTipo}
        <td>${ref.usos_disponibles} (de ${ref.usos_iniciales || ref.usos_disponibles})</td>
        <td>
          <button onclick="borrarReferencia('${ref.id}', '${ref.codigo_referencia}')">Borrar</button>
        </td>
      `;
      referenciasTableBody.appendChild(tr);
    });
  } else {
    noReferenciasMsg.style.display = 'block';
  }
}

// --- Borrar Referencia ---
window.borrarReferencia = async function(idReferencia, codigoRef) {
  if (!confirm(`¿Seguro que quieres borrar la referencia "${codigoRef}"? Esta acción no se puede deshacer.`)) {
    return;
  }
  ocultarMensajes();

  const { error } = await supabase
    .from('referencias_usos')
    .delete()
    .eq('id', idReferencia);

  if (error) {
    console.error("Error al borrar referencia:", error);
    mostrarError(`No se pudo borrar la referencia: ${error.message}`);
  } else {
    mostrarExito(`Referencia "${codigoRef}" borrada correctamente.`);
    await cargarReferenciasExistentes();
  }
}

// --- Funciones de utilidad para mensajes ---
function mostrarError(mensaje) {
  if (errorMensajeElem) {
    errorMensajeElem.textContent = mensaje;
    errorMensajeElem.style.display = 'block';
  }
}
function mostrarExito(mensaje) {
  if (exitoMensajeElem) {
    exitoMensajeElem.textContent = mensaje;
    exitoMensajeElem.style.display = 'block';
  }
}
function ocultarMensajes() {
  if (errorMensajeElem) errorMensajeElem.style.display = 'none';
  if (exitoMensajeElem) exitoMensajeElem.style.display = 'none';
}
