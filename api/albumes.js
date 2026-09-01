const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

module.exports = async (req, res) => {
    if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
    try {
        const resultado = await pool.query(`
            SELECT evento, COUNT(*)::int AS total,
                (ARRAY_AGG(url_preview ORDER BY id DESC) FILTER (WHERE url_preview IS NOT NULL))[1] AS portada
            FROM fotos
            WHERE evento IS NOT NULL AND evento <> ''
            GROUP BY evento
            ORDER BY MAX(id) DESC
        `);
        return res.status(200).json(resultado.rows.filter(album => album.portada));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error servidor" });
    }
};
