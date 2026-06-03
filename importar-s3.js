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

console.log(
    "DATABASE_URL:",
    process.env.DATABASE_URL ? "OK" : "FALTA"
);

console.log(
    "AWS_ACCESS_KEY_ID:",
    process.env.AWS_ACCESS_KEY_ID ? "OK" : "FALTA"
);

console.log(
    "AWS_SECRET_ACCESS_KEY:",
    process.env.AWS_SECRET_ACCESS_KEY ? "OK" : "FALTA"
);

async function importarFotos() {

    try {
         
        console.log("1 - Antes de SELECT NOW");
        const prueba = await pool.query(
            "SELECT NOW()"
        );
        console.log("2 - Después de SELECT NOW");
        console.log(prueba.rows);

        let token = undefined;
        let total = 0;

        do {

            const resultado = await s3.listObjectsV2({

                Bucket: "mi-bucket-amfotografia",

                MaxKeys: 50,

                ContinuationToken: token

            }).promise();

            console.log(
                `Página: ${resultado.KeyCount}`
            );

            console.log(
                `Procesando página con ${resultado.KeyCount} objetos`
            );
            
            for (const archivo of resultado.Contents) {

                if (archivo.Key.endsWith("/")) {
                    continue;
                }

                total++;
                
                const nombreArchivo =
                    archivo.Key.replace(
                        "thumbnails/",
                        ""
                    );
                
                console.log(
                    nombreArchivo
                );

                const urlThumbnail =
                    `https://mi-bucket-amfotografia.s3.us-east-2.amazonaws.com/${archivo.Key}`;
                
                const existe = await pool.query(
                    `
                    SELECT id
                    FROM fotos
                    WHERE nombre_archivo = $1
                    `,
                    [nombreArchivo]
                );

                if (existe.rows.length > 0) {

                    console.log(
                        `Ya existe: ${nombreArchivo}`
                    );

                    continue;
                }

                await pool.query(
                    `
                    INSERT INTO fotos
                    (
                        evento,
                        nombre_archivo,
                        url_thumbnail,
                        url_preview,
                        url_original,
                        numeros_detectados,
                        procesada
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )
                    `,
                    [
                        "Aniversario Club",
                        nombreArchivo,
                        urlThumbnail,
                        "",
                        "",
                        [],
                        false
                    ]
                );

                console.log(
                    `Insertada: ${nombreArchivo}`
                );
            }

            token = resultado.NextContinuationToken;

        } while (token);

        console.log(
            `TOTAL: ${total}`
        );
              

        console.log(
            "Importación terminada"
        );
        
        
        await pool.end();
        process.exit(0);

    } catch (error) {

        console.log(error);
        
        await pool.end();
        process.exit(1);
        
        
    }
}

importarFotos();
