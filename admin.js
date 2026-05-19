const selectEvento = document.getElementById("evento");
        const respuesta = await fetch("/api/eventos");

        const eventos = await respuesta.json();

        eventos.forEach(evento => {

            const option = document.createElement("option");

            option.value = evento.evento;
            option.textContent = evento.evento;

            selectEvento.appendChild(option);
        });

    } catch (error) {

        console.log(error);
    }
}

cargarEventos();

adminForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    mensaje.textContent = "Enviando mensajes...";

    const evento = document.getElementById("evento").value;
    const link = document.getElementById("link").value;

    try {

        const respuesta = await fetch("/api/enviar-links", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                evento,
                linkBase: link
            })
        });

        const data = await respuesta.json();

        if (respuesta.ok) {

            mensaje.textContent = `Mensajes enviados: ${data.enviados}`;

        } else {

            mensaje.textContent = data.error;
        }

    } catch (error) {

        console.log(error);

        mensaje.textContent = "Error del servidor";
    }
});
