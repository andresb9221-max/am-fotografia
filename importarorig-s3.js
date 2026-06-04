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

async function actualizarOriginales() {

    try {

        let token = undefined;
        let total = 0;

        do {

            const resultado = await s3.listObjectsV2({

                Bucket: "mi-bucket-amfotografia",

                Prefix: "originales/",

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
                        "originales/",
                        ""
                    );

                const urlOriginal =
                    `https://mi-bucket-amfotografia.s3.us-east-2.amazonaws.com/${archivo.Key}`;

                const resultadoUpdate =
                    await pool.query(
                        `
                        UPDATE fotos
                        SET url_original = $1
                        WHERE nombre_archivo = $2
                        `,
                        [
                            urlOriginal,
                            nombreArchivo
                        ]
                    );

                console.log(
                    `Actualizada: ${nombreArchivo}`
                );
            }

            token =
                resultado.NextContinuationToken;

        } while (token);

        console.log(
            `Total procesadas: ${total}`
        );

        await pool.end();

        process.exit(0);

    } catch (error) {

        console.log(error);

        await pool.end();

        process.exit(1);
    }
}

actualizarOriginales();
