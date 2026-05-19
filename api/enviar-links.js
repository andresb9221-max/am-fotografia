
const { Pool } = require("pg");
const twilio = require("twilio");

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async (req, res) => {

    console.log("===== INICIO ENVIO LINKS =====");

    if (req.method !== "POST") {

        console.log("Método no permitido");

        return res.status(405).json({
            error: "Método no permitido"
        });
    }

    try {

        const {
            evento,
            linkBase
        } = req.body;

        console.log("Evento recibido:", evento);
        console.log("Link base recibido:", linkBase);

        if (!evento || !linkBase) {

            console.log("Faltan datos");

            return res.status(400).json({
                error: "Faltan datos"
            });
        }

        const participantes = await pool.query(`
            SELECT *
            FROM registros
            WHERE evento = $1
        `, [evento]);

        console.log(
            "Participantes encontrados:",
            participantes.rows.length
        );

        console.log(participantes.rows);

        let enviados = 0;

        for (const participante of participantes.rows) {

            const linkFinal =
                `${linkBase}${participante.numero_corredor}`;

            console.log(
                "--------------------------------"
            );

            console.log(
                "Procesando participante:"
            );

            console.log(
                "Nombre:",
                participante.nombre
            );

            console.log(
                "WhatsApp:",
                participante.whatsapp
            );

            console.log(
                "Número corredor:",
                participante.numero_corredor
            );

            console.log(
                "Link final:",
                linkFinal
            );

            try {

                const respuestaTwilio =
                    await client.messages.create({

                        from:
                            process.env.TWILIO_WHATSAPP_NUMBER,

                        to:
                            `whatsapp:+52${participante.whatsapp}`,

                        body:
`Hola ${participante.nombre} 👋

Tus fotos del evento ${participante.evento} ya están listas 📸

Puedes verlas aquí:
${linkFinal}

¡Gracias por correr con nosotros!`

                    });

                console.log(
                    "Mensaje enviado correctamente"
                );

                console.log(
                    "SID:",
                    respuestaTwilio.sid
                );

                enviados++;

                await new Promise(resolve =>
                    setTimeout(resolve, 1000)
                );

            } catch (twilioError) {

                console.log(
                    "ERROR TWILIO"
                );

                console.log(
                    "Mensaje:",
                    twilioError.message
                );

                console.log(
                    "Código:",
                    twilioError.code
                );

                console.log(
                    "Más detalles:"
                );

                console.log(twilioError);
            }
        }

        console.log(
            "Total enviados:",
            enviados
        );

        console.log(
            "===== FIN ENVIO LINKS ====="
        );

        return res.status(200).json({
            mensaje: "Mensajes enviados",
            enviados
        });

    } catch (error) {

        console.log(
            "ERROR GENERAL"
        );

        console.log(error);

        return res.status(500).json({
            error: "Error enviando links"
        });
    }
};
