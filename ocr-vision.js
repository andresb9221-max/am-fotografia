
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const API_KEY = process.env.GOOGLE_VISION_API_KEY;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function procesarFotos() {

    try {

        const carpetaJson =
            path.join(
                __dirname,
                "ocr-json"
            );

        if (
            !fs.existsSync(
                carpetaJson
            )
        ) {

            fs.mkdirSync(
                carpetaJson
            );
        }

        const resultado =
            await pool.query(
                `
                SELECT
                    id,
                    nombre_archivo,
                    url_original
                FROM fotos
                WHERE procesada = false
                ORDER BY id
                `
            );

        console.log(
            `Fotos encontradas: ${resultado.rows.length}`
        );

        for (const foto of resultado.rows) {

            console.log(
                `Procesando ${foto.nombre_archivo}`
            );
            
            
            const archivoJson =
                    path.join(
                        carpetaJson,
                        `${foto.id}.json`
                    );

                if (
                    fs.existsSync(
                        archivoJson
                    )
                ) {

                    console.log(
                        `Ya existe ${foto.id}.json`
                    );

                    continue;
                }
            
            if (!foto.url_original) {

                console.log(
                    `ID ${foto.id} sin url_original`
                );

                continue;
            }

            const imagenResponse =
                await fetch(
                    foto.url_original
                );

            const arrayBuffer =
                await imagenResponse.arrayBuffer();

            const imageBase64 =
                Buffer.from(
                    arrayBuffer
                ).toString(
                    "base64"
                );

            const response =
                await fetch(
                    `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            requests: [
                                {
                                    image: {
                                        content:
                                            imageBase64
                                    },

                                    features: [
                                        {
                                            type:
                                                "TEXT_DETECTION"
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                );

            const data =
                await response.json();

            fs.writeFileSync(
                archivoJson,
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

            console.log(
                `JSON guardado: ${foto.id}.json`
            );
        }

        console.log(
            "Proceso terminado"
        );

        await pool.end();

    } catch (error) {

        console.error(error);

        await pool.end();
    }
}

procesarFotos();
