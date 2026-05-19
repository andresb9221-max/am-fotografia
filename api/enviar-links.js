const { Pool } = require("pg");
            WHERE evento = $1
            AND consentimiento = true
        `, [evento]);

        let enviados = 0;

        for (const participante of participantes.rows) {

            const linkFinal = `${linkBase}${participante.numero_corredor}`;

            try {

                await client.messages.create({

                    from: process.env.TWILIO_WHATSAPP_NUMBER,

                    to: `whatsapp:+52${participante.whatsapp}`,

                    body:
`Hola ${participante.nombre} 👋

Tus fotos del evento ${participante.evento} ya están listas 📸

Puedes verlas aquí:
${linkFinal}

¡Gracias por correr con nosotros!`

                });

                enviados++;

            } catch (twilioError) {

                console.log("Error enviando a:", participante.whatsapp);
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
