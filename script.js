//
//  script.js
//  A&M Fotografía
//

alert("SCRIPT CARGADO");

const form = document.getElementById("registroForm");

form.addEventListener("submit", async (e) => {

```
e.preventDefault();

const nombre =
    document.getElementById("nombre")
    .value
    .trim();

const evento =
    document.getElementById("evento")
    .value;

const numero_corredor =
    document.getElementById("numero_corredor")
    .value
    .trim();

const whatsapp =
    document.getElementById("whatsapp")
    .value
    .trim();

const email =
    document.getElementById("email")
    .value
    .trim();

const consentimiento =
    document.getElementById("consentimiento")
    .checked;

// VALIDACIONES

if (nombre.length < 3) {

    alert("Nombre inválido");

    return;
}

if (!evento) {

    alert("Selecciona un evento");

    return;
}

if (!/^[0-9]{1,6}$/.test(numero_corredor)) {

    alert("Número de corredor inválido");

    return;
}

if (!/^[0-9]{10,15}$/.test(whatsapp)) {

    alert("Número de WhatsApp inválido");

    return;
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

    alert("Email inválido");

    return;
}

if (!consentimiento) {

    alert("Debes aceptar recibir mensajes");

    return;
}

try {

    const response = await fetch("/api/registro", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            nombre,
            evento,
            numero_corredor,
            whatsapp,
            email,
            consentimiento
        })
    });

    const data = await response.json();

    if (response.ok) {

        alert("Registro exitoso");

        form.reset();

    } else {

        alert(data.error);
    }

} catch (error) {

    console.log(error);

    alert("Error conectando con el servidor");
}
```

});

