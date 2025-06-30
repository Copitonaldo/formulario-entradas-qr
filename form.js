// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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
const codigoQR = document.getElementById('codigoQR');
const qrCanvas = document.getElementById('qrCanvas');
const entradaGenerada = document.getElementById('entradaGenerada');
// El formTitle no se usa dinámicamente en este script, pero podría añadirse si se desea.
// const formTitle = document.getElementById('formTitle'); 

// Función para capitalizar nombres
function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

// Validación de cédula
function formatCedula(cedula) {
  // Esta función solo formatea, la validación de longitud se hace aparte.
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

if (formData) {
  formData.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMsg.style.display = 'none';

    const nombre = inputNombre.value.trim();
    const cedulaRaw = inputCedula.value.replace(/\D/g, ''); // Solo dígitos para validación
    const edad = inputEdad.value.trim();

    // Validaciones
    if (!nombre) {
      errorMsg.textContent = 'Debe ingresar un nombre.';
      errorMsg.style.display = 'block';
      return;
    }

    if (!/^\d{8}$/.test(cedulaRaw)) {
      errorMsg.textContent = 'La cédula debe tener exactamente 8 dígitos.';
      errorMsg.style.display = 'block';
      return;
    }

    if (!edad || isNaN(parseInt(edad)) || parseInt(edad) < 0) {
      errorMsg.textContent = 'Edad inválida.';
      errorMsg.style.display = 'block';
      return;
    }

    // Mostrar confirmación
    confNombre.textContent = toTitleCase(nombre);
    confCedula.textContent = formatCedula(cedulaRaw); // Formatear para mostrar
    confEdad.textContent = `${edad} años`;
    
    formData.style.display = 'none';
    entradaGenerada.style.display = 'none';
    confirmacionDatos.style.display = 'block';

    window.datosParaConfirmar = { nombre, cedula: cedulaRaw, edad }; // Guardar cedulaRaw (sin formato)
  });
}

if (btnConfirmar) {
  btnConfirmar.addEventListener('click', function () {
    const { nombre, cedula, edad } = window.datosParaConfirmar; // Cedula aquí es cedulaRaw
    const nuevaRespuesta = {
      codigo: Date.now().toString().slice(-5),
      nombre: toTitleCase(nombre),
      cedula, // Guardar cedulaRaw
      edad,
      fecha: new Date().toISOString()
    };

    const respuestasRef = ref(database, `respuestas/${formId}`);
    push(respuestasRef, nuevaRespuesta)
      .then(() => {
        outNombre.textContent = toTitleCase(nombre);
        outCedula.textContent = formatCedula(cedula); // Formatear para mostrar
        outEdad.textContent = `${edad} años`;
        outCodigo.textContent = nuevaRespuesta.codigo;
        codigoQR.textContent = "Código: " + nuevaRespuesta.codigo;

        const datosQR = `Nombre: ${toTitleCase(nombre)}\nCédula: ${cedula}\nEdad: ${edad}\nCódigo: ${nuevaRespuesta.codigo}`;
        QRCode.toCanvas(qrCanvas, datosQR, { width: 80 }, error => {
          if (error) {
            console.error("Error generando QR:", error);
            alert("Error generando QR");
          }
        });

        confirmacionDatos.style.display = 'none';
        entradaGenerada.style.display = 'block';
      })
      .catch(err => {
        console.error("Error guardando en Firebase:", err);
        errorMsg.textContent = "Error al guardar los datos. Intente de nuevo.";
        errorMsg.style.display = 'block';
        // Opcional: decidir si volver a mostrar el formulario o la confirmación
        // confirmacionDatos.style.display = 'block'; // Volver a la confirmación
        // formData.style.display = 'block'; // Volver al formulario
      });
  });
}

if (btnCorregir) {
  btnCorregir.addEventListener('click', () => {
    confirmacionDatos.style.display = 'none';
    if (formData) {
      formData.style.display = 'block';
    }
    errorMsg.style.display = 'none';
    // Los campos del formulario conservarán sus valores para que el usuario pueda corregirlos.
  });
}

// El botón con id="guardarBtn" (texto "Guardar entrada") que está en la sección "entradaGenerada"
// no tiene un listener aquí. Si se necesita funcionalidad (ej. descargar la imagen del ticket),
// se debe añadir un nuevo event listener específico para él.
// Ejemplo:
// const descargarTicketBtn = document.getElementById('guardarBtn');
// if (descargarTicketBtn) {
//   descargarTicketBtn.addEventListener('click', () => { /* lógica para descargar imagen */ });
// }
