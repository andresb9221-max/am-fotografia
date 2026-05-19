const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT DISTINCT evento
            FROM registros
            ORDER BY evento ASC
        `);

        return res.status(200).json(resultado.rows);

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            error: "Error obteniendo eventos"
        });
    }
};
