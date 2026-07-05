require("dotenv").config();

const path = require("path");
const sharp = require("sharp");
const { Pool } = require("pg");

const {
    S3Client,
    GetObjectCommand,
    PutObjectCommand
} = require("@aws-sdk/client-s3");

const BUCKET = "mi-bucket-amfotografia";
const REGION = "us-east-2";

const s3 = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

function validarEnv() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "OK" : "FALTA");
    console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "OK" : "FALTA");
    console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "OK" : "FALTA");

    if (!process.env.DATABASE_URL) {
        throw new Error("Falta DATABASE_URL en .env");
    }

    if (!process.env.AWS_ACCESS_KEY_ID) {
        throw new Error("Falta AWS_ACCESS_KEY_ID en .env");
    }

    if (!process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error("Falta AWS_SECRET_ACCESS_KEY en .env");
    }
}

async function streamToBuffer(stream) {
    const chunks = [];

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

function extraerKeyDesdeUrl(url) {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.substring(1));
}

function crearUrlS3(key) {
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

function crearMarcaAguaSvg(width, height) {
    const fontSizePrincipal = Math.round(width * 0.09);
    const fontSizeSecundario = Math.round(width * 0.055);

    return Buffer.from(`
        <svg width="${width}" height="${height}">
            <style>
                .principal {
                    fill: white;
                    fill-opacity: 0.55;
                    font-size: ${fontSizePrincipal}px;
                    font-family: Arial, sans-serif;
                    font-weight: 700;
                }

                .secundario {
                    fill: white;
                    fill-opacity: 0.55;
                    font-size: ${fontSizeSecundario}px;
                    font-family: Arial, sans-serif;
                    font-weight: 500;
                }
            </style>

            <text
                x="50%"
                y="47%"
                text-anchor="middle"
                dominant-baseline="middle"
                class="principal"
            >
                A&amp;M
            </text>

            <text
                x="50%"
                y="57%"
                text-anchor="middle"
                dominant-baseline="middle"
                class="secundario"
            >
                Fotografía
            </text>
        </svg>
    `);
}

async function descargarOriginal(originalKey) {
    const respuesta = await s3.send(
        new GetObjectCommand({
            Bucket: BUCKET,
            Key: originalKey
        })
    );

    return await streamToBuffer(respuesta.Body);
}

async function subirImagenS3(key, buffer) {
    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: "image/jpeg",
            CacheControl: "public, max-age=31536000"
        })
    );

    return crearUrlS3(key);
}

async function obtenerFotosPendientes() {
    const { rows } = await pool.query(`
        SELECT
            id,
            evento,
            nombre_archivo,
            url_original,
            url_thumbnail,
            url_preview
        FROM fotos
        WHERE
            url_original IS NOT NULL
            AND url_original <> ''
            AND (
                url_thumbnail = ''
                OR url_thumbnail IS NULL
                OR url_preview = ''
                OR url_preview IS NULL
                OR procesada = false
            )
        ORDER BY id ASC
    `);

    return rows;
}

async function actualizarFoto(id, urlThumbnail, urlPreview) {
    await pool.query(
        `
        UPDATE fotos
        SET
            url_thumbnail = $1,
            url_preview = $2,
            procesada = true
        WHERE id = $3
        `,
        [urlThumbnail, urlPreview, id]
    );
}

async function generarThumbnail(originalBuffer) {
    return await sharp(originalBuffer)
        .rotate()
        .resize({
            width: 450,
            withoutEnlargement: true
        })
        .jpeg({
            quality: 72,
            mozjpeg: true
        })
        .toBuffer();
}

async function generarPreview(originalBuffer) {
    const previewBaseBuffer = await sharp(originalBuffer)
        .rotate()
        .resize({
            width: 1200,
            withoutEnlargement: true
        })
        .jpeg({
            quality: 80,
            mozjpeg: true
        })
        .toBuffer();

    const metadata = await sharp(previewBaseBuffer).metadata();

    const marcaAgua = crearMarcaAguaSvg(
        metadata.width,
        metadata.height
    );

    return await sharp(previewBaseBuffer)
        .composite([
            {
                input: marcaAgua,
                gravity: "center"
            }
        ])
        .jpeg({
            quality: 80,
            mozjpeg: true
        })
        .toBuffer();
}

async function procesarFoto(foto) {
    console.log("----------------------------------------");
    console.log(`Procesando ID ${foto.id}: ${foto.nombre_archivo}`);

    const originalKey = extraerKeyDesdeUrl(foto.url_original);

    console.log("Original key:", originalKey);

    const originalBuffer = await descargarOriginal(originalKey);

    const nombreBase = path.parse(foto.nombre_archivo).name;

    const thumbnailKey = `thumbnails/${nombreBase}.jpg`;
    const previewKey = `previews/${nombreBase}.jpg`;

    const thumbnailBuffer = await generarThumbnail(originalBuffer);
    const previewBuffer = await generarPreview(originalBuffer);

    const urlThumbnail = await subirImagenS3(
        thumbnailKey,
        thumbnailBuffer
    );

    const urlPreview = await subirImagenS3(
        previewKey,
        previewBuffer
    );

    await actualizarFoto(
        foto.id,
        urlThumbnail,
        urlPreview
    );

    console.log("Thumbnail:", urlThumbnail);
    console.log("Preview:", urlPreview);
    console.log(`Listo ID ${foto.id}`);
}

async function main() {
    try {
        validarEnv();

        console.log("Probando conexión a PostgreSQL...");
        const prueba = await pool.query("SELECT NOW()");
        console.log("PostgreSQL OK:", prueba.rows[0]);

        const fotos = await obtenerFotosPendientes();

        console.log(`Fotos pendientes: ${fotos.length}`);

        for (const foto of fotos) {
            try {
                await procesarFoto(foto);
            } catch (error) {
                console.error(
                    `Error procesando ID ${foto.id} ${foto.nombre_archivo}:`,
                    error.message
                );
            }
        }

        console.log("----------------------------------------");
        console.log("Proceso terminado");

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error("Error general:", error);

        await pool.end();
        process.exit(1);
    }
}

main();
