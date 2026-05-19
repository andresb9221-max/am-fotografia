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

    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Método no permitido"
        });
    }

    try {

        const {
            evento,
            linkBase
        } = req.body;

        if (!evento || !linkBase) {

            return res.status(400).json({
                error: "Faltan datos"
            });
        }

        const participantes = await pool.query(`
            SELECT *
            FROM registros
            WHERE evento = $1
            AND consentimiento = true
        `, [evento]);

        let enviados = 0;

        for (const participante of participantes.rows) {

            const linkFinal =
                `${linkBase}${participante.numero_corredor}`;

            try {

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

                enviados++;

                await new Promise(resolve =>
                    setTimeout(resolve, 1000)
                );

            } catch (twilioError) {

                console.log(
                    "Error enviando a:",
                    participante.whatsapp
                );

                console.log(twilioError);
            }
        }

        return res.status(200).json({
            mensaje: "Mensajes enviados",
            enviados
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            error: "Error enviando links"
        });
    }
};
