const { Pool } = require("pg");

const { Resend } = require("resend");

const resend = new Resend(
process.env.RESEND_API_KEY
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

    const participantes = await pool.query(
        `
        SELECT *
        FROM registros
        WHERE evento = $1
        `,
        [evento]
    );

    let enviados = 0;

    for (const participante of participantes.rows) {

        const linkFinal =
            `${linkBase}${participante.numero_corredor}`;

        try {

            const resultado =
                await resend.emails.send({

                    from:
                        "A&M Fotografía <onboarding@resend.dev>",

                    to:
                        participante.email,

                    subject:
                        `Tus fotos ya están listas 📸`,

                    html:
                    `
                    <h2>
                    Hola ${participante.nombre} 👋
                    </h2>

                    <p>
                    Tus fotos del evento
                    <b>${participante.evento}</b>
                    ya están disponibles.
                    </p>

                    <p>
                    <a href="${linkFinal}">
                    VER MIS FOTOS
                    </a>
                    </p>

                    <p>
                    ¡Gracias por correr con nosotros!
                    </p>
                    `
                });

            console.log(
                "EMAIL ENVIADO:"
            );

            console.log(resultado);

            enviados++;

        } catch (emailError) {

            console.log(
                "ERROR EMAIL:"
            );

            console.log(emailError);
        }
    }

    return res.status(200).json({
        enviados
    });

} catch (error) {

    console.log(error);

    return res.status(500).json({
        error: "Error servidor"
    });
}


};

