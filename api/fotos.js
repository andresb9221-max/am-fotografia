const { Pool } = require("pg");

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: {
rejectUnauthorized: false
}
});

module.exports = async (req, res) => {


res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method !== "GET") {
    return res.status(405).json({
        error: "Método no permitido"
    });
}

try {

    const evento = typeof req.query.evento === "string" ? req.query.evento.trim() : "";

    const pagina =
        parseInt(req.query.page || "1");

    const limite = 20;

    const offset =
        (pagina - 1) * limite;
    
    const total = await pool.query(
        `SELECT COUNT(*) as total FROM fotos WHERE ($1 = '' OR evento = $1)`,
        [evento]
    );

    const resultado =
        await pool.query(
            `
            SELECT
                id,
                nombre_archivo,
                url_thumbnail,
                url_preview,
                url_original
            FROM fotos
            WHERE ($1 = '' OR evento = $1)
            ORDER BY id
            LIMIT $2
            OFFSET $3
            `,
            [
                evento, limite, offset
            ]
        );

    res.status(200).json({
        fotos: resultado.rows,
        total: parseInt(
            total.rows[0].total
        )
    });

} catch (error) {

    console.log(error);

    return res.status(500).json({
        error: "Error servidor"
    });
}


};
