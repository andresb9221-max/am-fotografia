require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function procesarJsons() {

    try {

        const carpetaJson =
            path.join(
                __dirname,
                "ocr-json"
            );

        const archivos =
            fs.readdirSync(
                carpetaJson
            );

        console.log(
            `JSON encontrados: ${archivos.length}`
        );

        let procesados = 0;
        let actualizadas = 0;

        for (const archivo of archivos) {

            if (
                !archivo.endsWith(".json")
            ) {
                continue;
            }

            const idFoto =
                parseInt(
                    archivo.replace(
                        ".json",
                        ""
                    )
                );

            const ruta =
                path.join(
                    carpetaJson,
                    archivo
                );

            const contenido =
                fs.readFileSync(
                    ruta,
                    "utf8"
                );

            const data =
                JSON.parse(
                    contenido
                );

            const textAnnotations =
                data.responses?.[0]
                    ?.textAnnotations || [];

            const numeros =
                textAnnotations
                    .slice(1)
                    .map(
                        item =>
                            item.description
                    )
                    .filter(
                        texto =>
                            /^\d+$/.test(
                                texto
                            )
                    );

            const numerosUnicos =
                [...new Set(numeros)];

            console.log(
                `ID ${idFoto}:`,
                numerosUnicos
            );

            const existe =
                await pool.query(
                    `
                    SELECT id
                    FROM fotos
                    WHERE id = $1
                    `,
                    [idFoto]
                );

            if (
                existe.rows.length === 0
            ) {

                console.log(
                    `No existe ID ${idFoto}`
                );

                continue;
            }
            
            if (numerosUnicos.length === 0) {

                console.log(
                    `ID ${idFoto}: sin números detectados`
                );

            }
            
            console.log(
                `Guardando ${numerosUnicos.length} números en ID ${idFoto}`
            );
            
            await pool.query(
                `
                UPDATE fotos
                SET
                    numeros_detectados = $1,
                    procesada = true
                WHERE id = $2
                `,
                [
                    numerosUnicos,
                    idFoto
                ]
            );

            console.log(
                `Actualizada foto ${idFoto}`
            );
            
            actualizadas++;
            procesados++;
        }

        console.log(
            `Fotos actualizadas: ${procesados}`
        );
        
        console.log(
            `Fotos actualizadas: ${actualizadas}`
        );

        console.log(
            "Proceso terminado"
        );

        await pool.end();

        process.exit(0);

    } catch (error) {

        console.error(error);

        await pool.end();

        process.exit(1);
    }
}

procesarJsons();
