// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, push, runTransaction, increment, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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
const codigoQR = document.getElementById('codigoQR');
const qrCanvas = document.getElementById('qrCanvas');
const entradaGenerada = document.getElementById('entradaGenerada');

if (!formId || formId.trim() === "") {
  if (formTitleElement) formTitleElement.textContent = 'Error: Formulario no especificado';
  if (errorMsg) {
    errorMsg.innerHTML = '<b>Error Crítico:</b> No se ha especificado un ID de formulario en la URL (parámetro `?id=`).<br>Por favor, contacte al administrador o verifique el enlace.';
    errorMsg.style.display = 'block';
  }
  if (formData) formData.style.display = 'none';
  console.error("formId es nulo o vacío. La aplicación no puede continuar.");
  throw new Error("formId es nulo o vacío. La aplicación no puede continuar.");
} else {
  if (formTitleElement && formTitleElement.textContent.includes('Cargando formulario...')) {
    // Opcional: formTitleElement.textContent = `Formulario: ${formId}`;
  }
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

    if (!nombre || !/^\d{8}$/.test(cedulaRaw) || !edad || isNaN(parseInt(edad)) || parseInt(edad) < 0) {
      if (!nombre) errorMsg.textContent = 'Debe ingresar un nombre.';
      else if (!/^\d{8}$/.test(cedulaRaw)) errorMsg.textContent = 'La cédula debe tener exactamente 8 dígitos.';
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
      // Esta validación ya debería haber detenido el script antes, pero es una salvaguarda.
      errorMsg.innerHTML = "<b>Error Crítico:</b> ID de formulario ausente.";
      errorMsg.style.display = 'block';
      return;
    }

    const { nombre, cedula, edad } = window.datosParaConfirmar;
    const contadorRef = ref(database, `contadores/${formId}/ultimoCodigo`);
    let nuevoCodigoSecuencialFormateado;

    try {
      // La función de transacción ahora es async para permitir `await` dentro.
      const transactionResult = await runTransaction(contadorRef, async (currentData) => {
        if (currentData === null) {
          // Es la primera vez que se usa el contador para este formId O el contador fue eliminado.
          // Contar las respuestas existentes para inicializar el contador.
          const respuestasExistentesRef = ref(database, `respuestas/${formId}`);
          try {
            const snapshot = await get(respuestasExistentesRef);
            const numChildren = snapshot.exists() ? snapshot.numChildren() : 0;
            return numChildren + 1; // El nuevo código será el siguiente después de las existentes.
          } catch (error) {
            console.error("Error al leer respuestas existentes para inicializar contador:", error);
            // Si no podemos leer, abortamos la transacción devolviendo undefined.
            // Esto podría pasar por permisos o problemas de red.
            return; // Aborta la transacción.
          }
        }
        // Si el contador ya existe, simplemente lo incrementamos.
        return currentData + 1;
      });

      if (transactionResult.committed && transactionResult.snapshot.exists()) {
        const nuevoContador = transactionResult.snapshot.val();
        nuevoCodigoSecuencialFormateado = formatSequentialCode(nuevoContador);
      } else {
        console.error("Transacción para el contador no fue committed o el snapshot no existe.");
        // Esto puede pasar si la función de transacción retornó undefined (ej. por error en get())
        errorMsg.textContent = "Error al generar el código secuencial (transacción fallida). Intente de nuevo.";
        errorMsg.style.display = 'block';
        confirmacionDatos.style.display = 'none';
        if (formData) formData.style.display = 'block';
        return;
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
      codigoQR.textContent = "Código: " + nuevaRespuesta.codigo;

      const datosQR = `Nombre: ${toTitleCase(nombre)}\nCédula: ${cedula}\nEdad: ${edad}\nCódigo: ${nuevaRespuesta.codigo}`;
      QRCode.toCanvas(qrCanvas, datosQR, { width: 80 }, error => {
        if (error) console.error("Error generando QR:", error);
      });

      confirmacionDatos.style.display = 'none';
      entradaGenerada.style.display = 'block';
    } catch (err) {
      console.error("Error guardando en Firebase:", err);
      errorMsg.textContent = "Error al guardar los datos. Intente de nuevo.";
      errorMsg.style.display = 'block';
      confirmacionDatos.style.display = 'none';
      if (formData) formData.style.display = 'block';
      // Consideración: Si push falla, el contador ya se incrementó.
      // Revertir el contador es complejo y podría llevar a sus propios problemas de concurrencia.
      // Por ahora, se asume que el fallo de push es menos frecuente que el éxito.
    }
  });
}

if (btnCorregir) {
  btnCorregir.addEventListener('click', () => {
    confirmacionDatos.style.display = 'none';
    if (formData) {
      if (formData.style.display === 'none' && (formId && formId.trim() !== "")) {
         formData.style.display = 'block';
      } else if (!formId || formId.trim() === "") {
        // El error de formId inválido ya debería estar visible.
      } else {
        formData.style.display = 'block';
      }
    }
    errorMsg.style.display = 'none';
  });
}
