require("dotenv").config();

const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { Pool } = require("pg");

console.log("Iniciando importar originales...");

const BUCKET = "mi-bucket-amfotografia";
const PREFIX = "originales/";
const REGION = "us-east-2";

const EVENTO = "carrera-once-ipn-5k";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const s3 = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function listarTodosLosObjetosS3() {
    let token = undefined;
    let pagina = 1;
    const objetos = [];

    do {
        console.log(`\nConsultando página ${pagina}...`);

        const command = new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: PREFIX,
            MaxKeys: 100,
            ContinuationToken: token
        });

        const resultado = await s3.send(command);
        const contents = resultado.Contents || [];

        console.log({
            pagina,
            KeyCount: resultado.KeyCount,
            IsTruncated: resultado.IsTruncated,
            TieneNextToken: !!resultado.NextContinuationToken,
            PrimerKey: contents[0]?.Key,
            UltimoKey: contents[contents.length - 1]?.Key
        });

        const archivos = contents.filter((archivo) => {
            return archivo.Key && !archivo.Key.endsWith("/");
        });

        objetos.push(...archivos);

        token = resultado.IsTruncated
            ? resultado.NextContinuationToken
            : undefined;

        pagina++;

    } while (token);

    return objetos;
}

async function importarOriginales() {
    try {
        const objetos = await listarTodosLosObjetosS3();

        console.log("\nListado S3 terminado");
        console.log(`Total objetos útiles encontrados en S3: ${objetos.length}`);

        let procesadas = 0;
        let insertadasOActualizadas = 0;
        let errores = 0;

        for (const archivo of objetos) {
            procesadas++;

            const nombreArchivo = archivo.Key.replace(PREFIX, "");

            const urlOriginal =
                `https://${BUCKET}.s3.${REGION}.amazonaws.com/${archivo.Key}`;

            try {
                const resultado = await pool.query(
                    `
                    INSERT INTO fotos (
                        evento,
                        nombre_archivo,
                        url_original
                    )
                    VALUES ($1, $2, $3)
                    ON CONFLICT (nombre_archivo)
                    DO UPDATE SET
                        evento = EXCLUDED.evento,
                        url_original = EXCLUDED.url_original
                    RETURNING id, evento, nombre_archivo, url_original
                    `,
                    [
                        EVENTO,
                        nombreArchivo,
                        urlOriginal
                    ]
                );

                insertadasOActualizadas += resultado.rowCount;

                if (procesadas % 100 === 0) {
                    console.log({
                        procesadas,
                        insertadasOActualizadas,
                        errores
                    });
                }

            } catch (error) {
                errores++;

                console.error(`Error importando ${nombreArchivo}:`);
                console.error(error.message);
            }
        }

        console.log("\nProceso terminado");
        console.log({
            objetosS3: objetos.length,
            procesadas,
            insertadasOActualizadas,
            errores
        });

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error("\nERROR GENERAL:");
        console.error(error);

        await pool.end();
        process.exit(1);
    }
}

importarOriginales();
