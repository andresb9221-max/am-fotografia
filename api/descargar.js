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

    try {

        const sessionId = req.query.session_id;
        const token = req.query.token;
        const fotoId = req.query.foto_id;

        if ((!sessionId && !token) || !fotoId) {
            return res.status(400).send("Faltan datos");
        }

        const compra = await pool.query(
            `
            SELECT foto_ids, pagado
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

        if (
            compra.rows.length === 0 ||
            !compra.rows[0].pagado
        ) {
            return res.status(403).send("Compra no válida");
        }

        if (
            !compra.rows[0].foto_ids.includes(
                String(fotoId)
            )
        ) {
            return res.status(403).send("Foto no comprada");
        }

        const foto = await pool.query(
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

        const archivo =
            await s3.getObject({
                Bucket: "mi-bucket-amfotografia",
                Key: key
            }).promise();

        res.setHeader(
            "Content-Type",
            archivo.ContentType || "image/jpeg"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${nombreArchivo}"`
        );

        return res.status(200).send(
            archivo.Body
        );

    } catch (error) {

        console.error(error);

        return res.status(500).send(
            "Error descargando foto"
        );
    }
};
