require("dotenv").config();

const AWS = require("aws-sdk");

console.log("Probando S3...");

console.log(
    "AWS_ACCESS_KEY_ID:",
    process.env.AWS_ACCESS_KEY_ID ? "OK" : "FALTA"
);

console.log(
    "AWS_SECRET_ACCESS_KEY:",
    process.env.AWS_SECRET_ACCESS_KEY ? "OK" : "FALTA"
);

const s3 = new AWS.S3({
    region: "us-east-2",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    httpOptions: {
        timeout: 30000,
        connectTimeout: 10000
    },
    maxRetries: 0
});

async function probar() {

    try {

        console.log("Antes de listObjectsV2");

        const resultado =
            await s3.listObjectsV2({
                Bucket: "mi-bucket-amfotografia",
                Prefix: "originales/",
                MaxKeys: 10
            }).promise();

        console.log("Después de listObjectsV2");

        console.log({
            KeyCount: resultado.KeyCount,
            IsTruncated: resultado.IsTruncated,
            Keys: resultado.Contents.map(
                item => item.Key
            )
        });

    } catch (error) {

        console.error("ERROR S3:");
        console.error(error);
    }
}

probar();
