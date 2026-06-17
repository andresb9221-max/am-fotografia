const { Pool } = require("pg");
const AWS = require("aws-sdk");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const s3 = new AWS.S3({
    region: "us-east-2",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

module.exports = async (req, res) => {

    if (req.method !== "GET") {
        return res.status(405).send("Método no permitido");
    }

    try {

        const sessionId =
            req.query.session_id;

        const fotoId =
            req.query.foto_id;

        if (!sessionId || !fotoId) {
            return res.status(400).send("Faltan datos");
        }

        const compra =
            await pool.query(
                `
                SELECT foto_ids, pagado
                FROM compras
                WHERE stripe_session_id = $1
                LIMIT 1
                `,
                [sessionId]
            );

        if (
            compra.rows.length === 0 ||
            !compra.rows[0].pagado
        ) {
            return res.status(403).send("Compra no válida");
        }

        const fotoIds =
            compra.rows[0].foto_ids;

        if (!fotoIds.includes(String(fotoId))) {
            return res.status(403).send("Foto no comprada");
        }

        const foto =
            await pool.query(
                `
                SELECT nombre_archivo, url_original
                FROM fotos
                WHERE id = $1
                LIMIT 1
                `,
                [fotoId]
            );

        if (foto.rows.length === 0) {
            return res.status(404).send("Foto no encontrada");
        }

        const nombreArchivo =
            foto.rows[0].nombre_archivo;

        const urlOriginal =
            foto.rows[0].url_original;

        const url =
            new URL(urlOriginal);

        const key =
            decodeURIComponent(
                url.pathname.replace("/", "")
            );

        const signedUrl =
            s3.getSignedUrl(
                "getObject",
                {
                    Bucket: "mi-bucket-amfotografia",
                    Key: key,
                    Expires: 60,
                    ResponseContentDisposition:
                        `attachment; filename="${nombreArchivo}"`
                }
            );

        return res.redirect(signedUrl);

    } catch (error) {

        console.error(error);

        return res.status(500).send("Error descargando foto");
    }
};
