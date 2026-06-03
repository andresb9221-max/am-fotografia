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

    const pagina =
        parseInt(req.query.page || "1");

    const limite = 20;

    const offset =
        (pagina - 1) * limite;

    const resultado =
        await pool.query(
            `
            SELECT
                id,
                nombre_archivo,
                url_thumbnail
            FROM fotos
            ORDER BY id
            LIMIT $1
            OFFSET $2
            `,
            [
                limite,
                offset
            ]
        );

    return res.status(200).json(
        resultado.rows
    );

} catch (error) {

    console.log(error);

    return res.status(500).json({
        error: "Error servidor"
    });
}


};

