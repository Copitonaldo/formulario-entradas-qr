// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, runTransaction, get, query, orderByChild, equalTo, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAnjDU-BWTGTmbOrxjFsdNkvp8pNnXJba4",
  authDomain: "entradas-qr-07.firebaseapp.com",
  projectId: "entradas-qr-07",
  storageBucket: "entradas-qr-07.firebasestorage.app",
  messagingSenderId: "543393610176",
  appId: "1:543393610176:web:5f2ac0c66ae80415b47025"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Variables del DOM
const urlParams = new URLSearchParams(window.location.search);
const formId = urlParams.get('id');
const formTitleElement = document.getElementById('formTitle');
const formData = document.getElementById('formData');
const inputNombre = document.getElementById('nombre');
const inputCedula = document.getElementById('cedula');
const inputEdad = document.getElementById('edad');
const errorMsg = document.getElementById('errorMsg');
const confirmacionDatos = document.getElementById('confirmacionDatos');
const confNombre = document.getElementById('confNombre');
const confCedula = document.getElementById('confCedula');
const confEdad = document.getElementById('confEdad');
const btnConfirmar = document.getElementById('btnConfirmar');
const btnCorregir = document.getElementById('btnCorregir');
const outNombre = document.getElementById('outNombre');
const outCedula = document.getElementById('outCedula');
const outEdad = document.getElementById('outEdad');
const outCodigo = document.getElementById('outCodigo');
const codigoQR = document.getElementById('codigoQR'); // Este es el div .qr-code-label
const qrCanvas = document.getElementById('qrCanvas'); // El canvas original para mostrar QR
const entradaGenerada = document.getElementById('entradaGenerada');
const ticketBg = document.getElementById('ticketBg');
const guardarBtn = document.getElementById('guardarBtn');

// --- Carga de datos del formulario (incluida imagen de fondo) ---
async function cargarDatosFormulario() {
  if (!formId) return;

  const formQuery = query(ref(database, 'formularios'), orderByChild('codigo'), equalTo(formId));

  onValue(formQuery, (snapshot) => {
    if (snapshot.exists()) {
      const formEntries = snapshot.val();
      const formKey = Object.keys(formEntries)[0];
      const specificFormData = formEntries[formKey];

      if (formTitleElement) {
        formTitleElement.textContent = `Formulario: ${specificFormData.nombre || formId}`;
      }
      if (ticketBg && specificFormData.imagen) {
        ticketBg.src = specificFormData.imagen;
        ticketBg.style.display = 'block';
      } else if (ticketBg) {
        ticketBg.style.display = 'none';
      }
    } else {
      if (formTitleElement) formTitleElement.textContent = 'Formulario no encontrado';
      if (ticketBg) ticketBg.style.display = 'none';
      console.warn(`Formulario con ID ${formId} no encontrado.`);
      if (formData) formData.style.display = 'none';
      errorMsg.innerHTML = '<b>Error:</b> El formulario especificado no existe. Verifique el enlace o contacte al administrador.';
      errorMsg.style.display = 'block';
    }
  }, (error) => {
    console.error("Error al cargar datos del formulario:", error);
    if (formTitleElement) formTitleElement.textContent = 'Error al cargar formulario';
    if (ticketBg) ticketBg.style.display = 'none';
    if (formData) formData.style.display = 'none';
    errorMsg.innerHTML = '<b>Error:</b> No se pudo cargar la información del formulario. Intente más tarde.';
    errorMsg.style.display = 'block';
  });
}

if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'Error: Formulario no especificado';
  if (errorMsg) {
    errorMsg.innerHTML = '<b>Error Crítico:</b> No se ha especificado un ID de formulario en la URL (parámetro `?id=`).<br>Por favor, contacte al administrador o verifique el enlace.';
    errorMsg.style.display = 'block';
  }
  if (formData) formData.style.display = 'none';
  if (ticketBg) ticketBg.style.display = 'none';
  console.error("formId es nulo o vacío. La aplicación no puede continuar.");
} else {
  cargarDatosFormulario();
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

function formatCedula(cedula) {
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

function formatSequentialCode(number) {
  return number.toString().padStart(3, '0');
}

if (formData) {
  formData.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMsg.style.display = 'none';
    const nombre = inputNombre.value.trim();
    const cedulaRaw = inputCedula.value.replace(/\D/g, '');
    const edad = inputEdad.value.trim();

    if (!nombre || !/^\d{7,8}$/.test(cedulaRaw) || !edad || isNaN(parseInt(edad)) || parseInt(edad) < 0) {
      if (!nombre) errorMsg.textContent = 'Debe ingresar un nombre.';
      else if (!/^\d{7,8}$/.test(cedulaRaw)) errorMsg.textContent = 'La cédula debe tener entre 7 y 8 dígitos.';
      else errorMsg.textContent = 'Edad inválida.';
      errorMsg.style.display = 'block';
      return;
    }

    confNombre.textContent = toTitleCase(nombre);
    confCedula.textContent = formatCedula(cedulaRaw);
    confEdad.textContent = `${edad} años`;

    formData.style.display = 'none';
    entradaGenerada.style.display = 'none';
    confirmacionDatos.style.display = 'block';
    window.datosParaConfirmar = { nombre, cedula: cedulaRaw, edad };
  });
}

if (btnConfirmar) {
  btnConfirmar.addEventListener('click', async function () {
    if (!formId || formId.trim() === "") {
      errorMsg.innerHTML = "<b>Error Crítico:</b> ID de formulario ausente.";
      errorMsg.style.display = 'block';
      return;
    }

    const { nombre, cedula, edad } = window.datosParaConfirmar;

    const respuestasQuery = query(ref(database, `respuestas/${formId}`), orderByChild('cedula'), equalTo(cedula));
    try {
      const snapshot = await get(respuestasQuery);
      if (snapshot.exists()) {
        errorMsg.textContent = "Esta cédula ya ha sido registrada para este formulario.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        return;
      }
    } catch (e) {
      console.error("Error detallado verificando cédula duplicada:", e);
      errorMsg.textContent = "Error al verificar la cédula. Intente de nuevo. (Ver consola para detalles)";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
      return;
    }

    const contadorRef = ref(database, `contadores/${formId}/ultimoCodigo`);
    let nuevoCodigoSecuencialFormateado;

    try {
      const transactionResult = await runTransaction(contadorRef, (currentData) => {
        if (currentData === null) return 1;
        return currentData + 1;
      });

      if (transactionResult.committed && transactionResult.snapshot.exists()) {
        nuevoCodigoSecuencialFormateado = formatSequentialCode(transactionResult.snapshot.val());
      } else {
        throw new Error("Transaction not committed or snapshot doesn't exist.");
      }
    } catch (e) {
      console.error("Error en la transacción del contador:", e);
      errorMsg.textContent = "Error crítico al generar el código. Contacte al administrador.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
      return;
    }

    const nuevaRespuesta = {
      codigo: nuevoCodigoSecuencialFormateado,
      nombre: toTitleCase(nombre),
      cedula,
      edad,
      fecha: new Date().toISOString()
    };

    const respuestasRef = ref(database, `respuestas/${formId}`);
    try {
      await push(respuestasRef, nuevaRespuesta);
      outNombre.textContent = toTitleCase(nombre);
      outCedula.textContent = formatCedula(cedula);
      outEdad.textContent = `${edad} años`;
      outCodigo.textContent = nuevaRespuesta.codigo;

      // Actualizar la etiqueta del código QR visible en la previsualización
      if (codigoQR) codigoQR.textContent = "Código: " + nuevaRespuesta.codigo;

      const qrCanvasElement = document.getElementById('qrCanvas');
      const datosQR = `Nombre: ${toTitleCase(nombre)}\nCédula: ${cedula}\nEdad: ${edad}\nCódigo: ${nuevaRespuesta.codigo}`;

      if (qrCanvasElement) {
        QRCode.toCanvas(qrCanvasElement, datosQR, {
          width: parseInt(qrCanvasElement.style.width) || 70,
          height: parseInt(qrCanvasElement.style.height) || 70,
          margin: 1
        }, error => {
          if (error) console.error("Error generando QR para visualización:", error);
        });
      }

      confirmacionDatos.style.display = 'none';
      entradaGenerada.style.display = 'block';
    } catch (err) {
      console.error("Error guardando en Firebase:", err);
      errorMsg.textContent = "Error al guardar los datos. Intente de nuevo.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
    }
  });
}

if (btnCorregir) {
  btnCorregir.addEventListener('click', () => {
    confirmacionDatos.style.display = 'none';
    if (formData) {
      if (formId && formId.trim() !== "" && formData.style.display === 'none') {
        formData.style.display = 'block';
      }
    }
    errorMsg.style.display = 'none';
  });
}

// --- BOTÓN GUARDAR CON ESCALADO PARA 300 DPI Y TAMAÑO 2500x960 ---
if (guardarBtn) {
  guardarBtn.addEventListener('click', async () => {
    try {
      const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js')).default;

      const elementToCapture = document.querySelector('#entradaGenerada .ticket-img-wrap');
      if (!elementToCapture) {
        console.error("Elemento '.ticket-img-wrap' no encontrado para captura.");
        alert("Error: No se pudo encontrar el contenido del ticket para guardar.");
        return;
      }

      // Clonar elemento para no afectar el DOM original
      const clone = elementToCapture.cloneNode(true);

      // Establecer tamaño fijo para que html2canvas capture en 2500x960 px
      clone.style.width = '2500px';
      clone.style.height = '960px';
      clone.style.boxSizing = 'border-box';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';

      // Estirar imagen de fondo sin mantener proporción
      const clonedTicketBg = clone.querySelector('#ticketBg');
      if (clonedTicketBg) {
        clonedTicketBg.style.width = '100%';
        clonedTicketBg.style.height = '100%';
        clonedTicketBg.style.objectFit = 'fill'; // ESTIRAR sin mantener proporción
      }

      // Eliminar sombras y bordes redondeados para evitar artefactos
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0px';
      clone.querySelectorAll('*').forEach(el => {
        el.style.boxShadow = 'none';
      });

      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 250)); // Esperar renderizado

      // Calcular factor de escala para 300 DPI (96 DPI es base)
      const scaleFactor = 300 / 96;

      // Usar html2canvas con tamaño fijo y escala para DPI alta
      const canvas = await html2canvas(clone, {
        useCORS: true,
        width: 2500,
        height: 960,
        scale: scaleFactor,
        backgroundColor: clone.style.backgroundColor || '#ffffff',
        logging: true,
      });

      // Descargar imagen
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const nombreArchivo = `${outCodigo.textContent || 'TICKET'}${outNombre.textContent.replace(/\s/g, '') || ''}.png`;
      link.download = nombreArchivo;
      link.href = dataUrl;
      link.click();

      document.body.removeChild(clone);
    } catch (error) {
      console.error("Error al generar o descargar la imagen:", error);
      alert("Error al generar la imagen. Intente de nuevo.");
    }
  });
}
