const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async (req, res) => {

    // CORS

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Método no permitido"
        });
    }

    try {

        const {
            nombre,
            evento,
            numero_corredor,
            whatsapp,
            email,
            consentimiento
        } = req.body;

        // VALIDACIONES

        if (!nombre || nombre.length < 3) {
            return res.status(400).json({
                error: "Nombre inválido"
            });
        }

        if (!evento) {
            return res.status(400).json({
                error: "Selecciona evento"
            });
        }

        if (!/^[0-9]{1,6}$/.test(numero_corredor)) {
            return res.status(400).json({
                error: "Número de corredor inválido"
            });
        }

        if (!/^[0-9]{10,15}$/.test(whatsapp)) {
            return res.status(400).json({
                error: "WhatsApp inválido"
            });
        }

        if (!consentimiento) {
            return res.status(400).json({
                error: "Debes aceptar mensajes"
            });
        }

        await pool.query(
            `
            INSERT INTO registros
            (
                nombre,
                evento,
                numero_corredor,
                whatsapp,
                email,
                consentimiento
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                nombre,
                evento,
                numero_corredor,
                whatsapp,
                email,
                consentimiento
            ]
        );

        return res.status(200).json({
            mensaje: "Registro exitoso"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            error: "Error servidor"
        });
    }
};
