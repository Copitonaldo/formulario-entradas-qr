// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, runTransaction, increment } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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
const formTitleElement = document.getElementById('formTitle'); // Referencia al H2 del título
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

// --- INICIO: Validación de formId ---
if (!formId || formId.trim() === "") {
  if (formTitleElement) {
    formTitleElement.textContent = 'Error: Formulario no especificado';
  }
  if (errorMsg) {
    errorMsg.innerHTML = '<b>Error Crítico:</b> No se ha especificado un ID de formulario en la URL (parámetro `?id=`).<br>Por favor, contacte al administrador o verifique el enlace.';
    errorMsg.style.display = 'block';
  }
  if (formData) {
    formData.style.display = 'none';
  }
  console.error("formId es nulo, está vacío o solo contiene espacios. La aplicación no puede continuar.");
  throw new Error("formId es nulo, está vacío o solo contiene espacios. La aplicación no puede continuar.");
} else {
  if (formTitleElement && formTitleElement.textContent.includes('Cargando formulario...')) {
    // formTitleElement.textContent = `Formulario: ${formId}`; // Opcional
  }
}
// --- FIN: Validación de formId ---

function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

function formatCedula(cedula) {
  return cedula.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
}

// Función para formatear el número de secuencia a una cadena con ceros a la izquierda
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
  btnConfirmar.addEventListener('click', async function () { // Convertido a async para await
    if (!formId || formId.trim() === "") {
      console.error("Error crítico: formId es nulo o vacío al intentar guardar la respuesta.");
      if (errorMsg) {
        errorMsg.innerHTML = "<b>Error Crítico:</b> No se puede identificar el formulario para guardar la respuesta...";
        errorMsg.style.display = 'block';
      }
      if (confirmacionDatos) confirmacionDatos.style.display = 'none';
      return;
    }

    const { nombre, cedula, edad } = window.datosParaConfirmar;
    
    // --- INICIO: Generación de Código Secuencial con Transacción ---
    const contadorRef = ref(database, `contadores/${formId}/ultimoCodigo`);
    let nuevoCodigoSecuencialFormateado;

    try {
      const transactionResult = await runTransaction(contadorRef, (currentData) => {
        if (currentData === null) {
          return 1; // Si no existe, el primer código es 1
        }
        return currentData + 1; // Incrementar el contador actual
      });

      if (transactionResult.committed) {
        const nuevoContador = transactionResult.snapshot.val();
        nuevoCodigoSecuencialFormateado = formatSequentialCode(nuevoContador);
      } else {
        console.error("Transacción para el contador no fue committed.");
        errorMsg.textContent = "Error al generar el código secuencial. Intente de nuevo.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        formData.style.display = 'block'; // Volver a mostrar el formulario
        return;
      }
    } catch (e) {
      console.error("Error en la transacción del contador:", e);
      errorMsg.textContent = "Error crítico al generar el código. Contacte al administrador.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      formData.style.display = 'block'; // Volver a mostrar el formulario
      return;
    }
    // --- FIN: Generación de Código Secuencial con Transacción ---

    const nuevaRespuesta = {
      codigo: nuevoCodigoSecuencialFormateado, // Usar el código secuencial formateado
      nombre: toTitleCase(nombre),
      cedula,
      edad,
      fecha: new Date().toISOString()
    };

    const respuestasRef = ref(database, `respuestas/${formId}`);
    push(respuestasRef, nuevaRespuesta)
      .then(() => {
        outNombre.textContent = toTitleCase(nombre);
        outCedula.textContent = formatCedula(cedula);
        outEdad.textContent = `${edad} años`;
        outCodigo.textContent = nuevaRespuesta.codigo; // Mostrar el nuevo código
        codigoQR.textContent = "Código: " + nuevaRespuesta.codigo;

        const datosQR = `Nombre: ${toTitleCase(nombre)}\nCédula: ${cedula}\nEdad: ${edad}\nCódigo: ${nuevaRespuesta.codigo}`;
        QRCode.toCanvas(qrCanvas, datosQR, { width: 80 }, error => {
          if (error) console.error("Error generando QR:", error);
        });

        confirmacionDatos.style.display = 'none';
        entradaGenerada.style.display = 'block';
      })
      .catch(err => {
        console.error("Error guardando en Firebase:", err);
        errorMsg.textContent = "Error al guardar los datos. Intente de nuevo.";
        errorMsg.style.display = 'block';
        // Considerar si se debe revertir el contador si el push falla, aunque es complejo.
        // Por ahora, el contador avanzó.
        confirmacionDatos.style.display = 'none';
        formData.style.display = 'block'; // Volver a mostrar el formulario
      });
  });
}

if (btnCorregir) {
  btnCorregir.addEventListener('click', () => {
    confirmacionDatos.style.display = 'none';
    if (formData) {
      if (formData.style.display === 'none' && (formId && formId.trim() !== "")) {
         formData.style.display = 'block';
      } else if (!formId || formId.trim() === "") {
        // No hacer nada, el error de formId ya está visible
      } else {
        formData.style.display = 'block';
      }
    }
    errorMsg.style.display = 'none';
  });
}
// El botón guardarBtn no tiene listener asignado aquí.
