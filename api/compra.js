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

        const sessionId =
            req.query.session_id;
        
        const token =
            req.query.token;

        if (!sessionId && !token) {
            return res.status(400).json({
                error: "Falta session_ido token"
            });
        }

        const compra =
            await pool.query(
                `
                SELECT
                    id,
                    stripe_session_id,
                    foto_ids,
                    total_mxn,
                    pagado,
                    email,
                    token_descarga
                FROM compras
                WHERE 
                    stripe_session_id = $1
                    OR token_descarga = $2
                LIMIT 1
                `,
                [
                    sessionId || "",
                    token || ""
                ]
            );

        if (compra.rows.length === 0) {
            return res.status(404).json({
                error: "Compra no encontrada"
            });
        }

        const datosCompra =
            compra.rows[0];

        if (!datosCompra.pagado) {
            return res.status(403).json({
                error: "Pago no confirmado"
            });
        }

        const fotos =
            await pool.query(
                `
                SELECT
                    id,
                    nombre_archivo,
                    url_thumbnail,
                    url_original
                FROM fotos
                WHERE id::text = ANY($1)
                ORDER BY id
                `,
                [datosCompra.foto_ids]
            );

        return res.status(200).json({
            compra: {
                id: datosCompra.id,
                total_mxn: datosCompra.total_mxn,
                email: datosCompra.email,
                token_descarga: datosCompra.token_descarga
            },
            fotos: fotos.rows
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Error servidor"
        });
    }
};
