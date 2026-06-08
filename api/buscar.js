const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async (req, res) => {

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET"
    );

    if (req.method !== "GET") {

        return res.status(405).json({
            error: "Método no permitido"
        });
    }

    try {

        const numero =
            req.query.numero;

        if (!numero) {

            return res.status(400).json({
                error: "Número requerido"
            });
        }

        const resultado =
            await pool.query(
                `
                SELECT
                    id,
                    nombre_archivo,
                    url_thumbnail,
                    url_preview,
                    url_original,
                    numeros_detectados
                FROM fotos
                WHERE $1 = ANY(numeros_detectados)
                ORDER BY id
                `,
                [numero]
            );

        return res.status(200).json(
            resultado.rows
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Error servidor"
        });
    }
};
