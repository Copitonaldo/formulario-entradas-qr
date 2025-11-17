// Importar Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Configuración de Supabase
const SUPABASE_URL = 'https://wiyejeeiehwfkdcbpomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...'; 

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================
// VARIABLES DEL DOM
// =============================

const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
const formTitleElement = document.getElementById('formTitle');

const formData = document.getElementById('formData');
const inputNombre = document.getElementById('nombre');
const inputCedula = document.getElementById('cedula');
const inputEdad = document.getElementById('edad');
const inputNumero = document.getElementById('numero');
const inputCorreo = document.getElementById('correo');
const inputReferencia = document.getElementById('referencia');

const errorMsg = document.getElementById('errorMsg');

const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confCedula');
const confEdad = document.getElementById('confEdad');
const confNumero = document.getElementById('confNumero');
const confCorreo = document.getElementById('confCorreo');
const confReferencia = document.getElementById('confReferencia');

const btnConfirmar = document.getElementById('btnConfirmar');
const btnCorregir = document.getElementById('btnCorregir');

const entradaGenerada = document.getElementById('entradaGenerada');
const ticketBg = document.getElementById('ticketBg');

const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outNumero = document.getElementById('outNumero');
const outCorreo = document.getElementById('outCorreo');
const outCodigo = document.getElementById('outCodigo');
const outReferencia = document.getElementById('outReferencia');
const outReferenciaContenedor = document.getElementById('outReferenciaContenedor');

const codigoQR = document.getElementById('codigoQR');
const qrCanvas = document.getElementById('qrCanvas');

const guardarBtn = document.getElementById('guardarBtn');

// Estados de formulario
let currentMinAge = null;
let currentMaxAge = null;
let currentFormDbId = null;
let isSubmitting = false;

// =============================
// CARGAR FORMULARIO
// =============================

async function cargarDatosFormulario() {
  if (!formId) return;

  const { data: formDataResult, error: formError } = await supabase
    .from('formularios')
    .select('id, nombre, imagen_url, min_age, max_age')
    .eq('codigo_form', formId)
    .single();

  if (formError) {
    formTitleElement.textContent = "Error al cargar formulario";
    errorMsg.textContent = "Error al cargar formulario.";
    errorMsg.style.display = "block";
    return;
  }

  if (formDataResult) {
    currentFormDbId = formDataResult.id;
    formTitleElement.textContent = `Formulario: ${formDataResult.nombre}`;
    ticketBg.src = formDataResult.imagen_url;
    currentMinAge = formDataResult.min_age;
    currentMaxAge = formDataResult.max_age;
  }
}

if (formId) cargarDatosFormulario();

// =============================
// FORMATOS
// =============================

function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

function formatCedula(cedula) {
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

function formatSequentialCode(number) {
  return number.toString().padStart(3, '0');
}

// =============================
// SUBMIT DEL FORMULARIO
// =============================

formData.addEventListener('submit', (event) => {
  event.preventDefault();
  errorMsg.style.display = "none";

  const nombre = inputNombre.value.trim();
  const cedulaRaw = inputCedula.value.replace(/\D/g, '');
  const edadValue = inputEdad.value.trim();
  const numeroValue = inputNumero.value.trim();
  const correoValue = inputCorreo.value.trim();
  const referenciaValue = inputReferencia.value.trim();

  if (!nombre || !/^\d{8}$/.test(cedulaRaw) || !edadValue || !referenciaValue) {
    errorMsg.textContent = "Complete todos los campos obligatorios.";
    errorMsg.style.display = "block";
    return;
  }

  confNombre.textContent = toTitleCase(nombre);
  confCedula.textContent = formatCedula(cedulaRaw);
  confEdad.textContent = `${edadValue} años`;
  confNumero.textContent = numeroValue || "-";
  confCorreo.textContent = correoValue || "-";
  confReferencia.textContent = referenciaValue;

  window.datosParaConfirmar = {
    nombre,
    cedula: cedulaRaw,
    edadInt: parseInt(edadValue),
    numero: numeroValue,
    correo: correoValue,
    referencia: referenciaValue
  };

  formData.style.display = "none";
  confirmacionDatos.style.display = "block";
});

// =============================
// VALIDACIÓN Y GUARDADO
// =============================

async function validarYObtenerReferencia(codigoReferencia, formDbId) {
  const { data, error } = await supabase
    .from("referencias_usos")
    .select("id, usos_disponibles")
    .eq("formulario_id", formDbId)
    .eq("codigo_referencia", codigoReferencia)
    .single();

  if (error || !data) return { valida: false };
  if (data.usos_disponibles <= 0) return { valida: false };

  return { valida: true, datosReferencia: data };
}

async function decrementarUsoReferencia(idReferencia) {
  const { data } = await supabase
    .from("referencias_usos")
    .select("usos_disponibles")
    .eq("id", idReferencia)
    .single();

  if (!data) return;

  const nuevos = data.usos_disponibles - 1;

  await supabase
    .from("referencias_usos")
    .update({ usos_disponibles: nuevos })
    .eq("id", idReferencia);
}

// =============================
// BOTÓN CONFIRMAR
// =============================

btnConfirmar.addEventListener('click', async function () {

  const { nombre, cedula, edadInt, numero, correo, referencia } = window.datosParaConfirmar;

  const validRef = await validarYObtenerReferencia(referencia, currentFormDbId);
  if (!validRef.valida) {
    errorMsg.textContent = "Referencia inválida.";
    errorMsg.style.display = "block";
    return;
  }

  const { data: existingResponse } = await supabase
    .from("respuestas")
    .select("cedula")
    .eq("formulario_id", currentFormDbId)
    .eq("cedula", cedula)
    .maybeSingle();

  if (existingResponse) {
    errorMsg.textContent = "Esta cédula ya está registrada.";
    errorMsg.style.display = "block";
    return;
  }

  // CONTADOR
  let { data: contadorData } = await supabase
    .from("contadores_formularios")
    .select("ultimo_codigo")
    .eq("formulario_id", currentFormDbId)
    .single();

  let nuevoCodigo = contadorData ? contadorData.ultimo_codigo + 1 : 1;
  let nuevoCodigoFmt = formatSequentialCode(nuevoCodigo);

  await supabase
    .from("contadores_formularios")
    .upsert({ formulario_id: currentFormDbId, ultimo_codigo: nuevoCodigo });

  // GUARDAR RESPUESTA
  const nuevaRespuesta = {
    formulario_id: currentFormDbId,
    codigo_secuencial: nuevoCodigoFmt,
    nombre_completo: toTitleCase(nombre),
    cedula: cedula,
    edad: edadInt,
    numero_telefono: numero,
    correo_electronico: correo,
    referencia_usada: referencia
  };

  const { data: insertData } = await supabase
    .from("respuestas")
    .insert([nuevaRespuesta])
    .select()
    .single();

  // Mostrar datos
  outNombre.textContent = insertData.nombre_completo;
  outCedula.textContent = formatCedula(insertData.cedula);
  outEdad.textContent = `${insertData.edad} años`;
  outNumero.textContent = insertData.numero_telefono || "-";
  outCorreo.textContent = insertData.correo_electronico || "-";
  outCodigo.textContent = insertData.codigo_secuencial;
  outReferencia.textContent = insertData.referencia_usada;

  codigoQR.textContent = "Código: " + insertData.codigo_secuencial;

  // =============================
  // GENERAR QR GRANDE (240px)
  // =============================

  QRCode.toCanvas(qrCanvas, `
Nombre: ${insertData.nombre_completo}
Cédula: ${insertData.cedula}
Edad: ${insertData.edad}
Código: ${insertData.codigo_secuencial}`, 
{
    width: 240,
    height: 240,
    margin: 1
});

  confirmacionDatos.style.display = "none";
  entradaGenerada.style.display = "block";
});

// =============================
// BOTÓN CORREGIR
// =============================

btnCorregir.addEventListener("click", () => {
  confirmacionDatos.style.display = "none";
  formData.style.display = "block";
});

// =============================
// GUARDAR IMAGEN (SEGUNDA IMAGEN EXACTA)
// =============================

guardarBtn.addEventListener('click', async () => {
  const html2canvas = (await import(
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js'
  )).default;

  const element = document.querySelector('.ticket-img-wrap');

  const clone = element.cloneNode(true);
  clone.style.position = "absolute";
  clone.style.left = "-9999px";
  document.body.appendChild(clone);

  // FORZAR LOS NUEVOS TAMAÑOS EXACTOS DEL QR
  const qrClone = clone.querySelector("#qrCanvas");
  qrClone.style.width = "240px";
  qrClone.style.height = "240px";

  const qrBoxClone = clone.querySelector(".qr-absolute");
  qrBoxClone.style.left = "110px";
  qrBoxClone.style.width = "260px";
  qrBoxClone.style.minHeight = "330px";
  qrBoxClone.style.padding = "25px";
  qrBoxClone.style.borderRadius = "26px";

  const labelClone = clone.querySelector(".qr-code-label");
  labelClone.style.fontSize = "28px";
  labelClone.style.fontWeight = "bold";

  // REGENERAR QR EN EL CLON
  QRCode.toCanvas(
    qrClone,
    `
Nombre: ${outNombre.textContent}
Cédula: ${outCedula.textContent}
Edad: ${outEdad.textContent}
Código: ${outCodigo.textContent}`,
    { width: 240, height: 240 }
  );

  const canvas = await html2canvas(clone, {
    scale: 3,
    useCORS: true
  });

  const link = document.createElement('a');
  link.download = `${outCodigo.textContent}_${outNombre.textContent}.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();

  document.body.removeChild(clone);
});

console.log("JS cargado con QR estilo segunda imagen.");
