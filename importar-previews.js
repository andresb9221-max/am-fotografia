require("dotenv").config();

const AWS = require("aws-sdk");
const { Pool } = require("pg");

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

async function actualizarPreviews() {

    try {

        let token = undefined;
        let total = 0;
        let actualizadas = 0;

        do {

            const resultado = await s3.listObjectsV2({

                Bucket: "mi-bucket-amfotografia",

                Prefix: "previews/",

                MaxKeys: 50,

                ContinuationToken: token

            }).promise();

            console.log(
                `Procesando ${resultado.KeyCount} archivos`
            );

            for (const archivo of resultado.Contents) {

                if (archivo.Key.endsWith("/")) {
                    continue;
                }

                total++;

                const nombreArchivo =
                    archivo.Key.replace(
                        "previews/",
                        ""
                    );

                const urlPreview =
                    `https://mi-bucket-amfotografia.s3.us-east-2.amazonaws.com/${archivo.Key}`;

                const resultadoUpdate =
                    await pool.query(
                        `
                        UPDATE fotos
                        SET url_preview = $1
                        WHERE nombre_archivo = $2
                        `,
                        [
                            urlPreview,
                            nombreArchivo
                        ]
                    );

                if (
                    resultadoUpdate.rowCount === 0
                ) {

                    console.log(
                        `No encontrado: ${nombreArchivo}`
                    );

                } else {

                    console.log(
                        `Actualizada: ${nombreArchivo}`
                    );

                    actualizadas++;
                }
            }

            token =
                resultado.NextContinuationToken;

        } while (token);

        console.log(
            `Archivos encontrados: ${total}`
        );

        console.log(
            `Registros actualizados: ${actualizadas}`
        );

        await pool.end();

        process.exit(0);

    } catch (error) {

        console.log(error);

        await pool.end();

        process.exit(1);
    }
}

actualizarPreviews();
