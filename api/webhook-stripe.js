const stripe = require("stripe")(
    process.env.STRIPE_SECRET_KEY
);

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

function leerRawBody(req) {
    return new Promise((resolve, reject) => {

        const chunks = [];

        req.on("data", (chunk) => {
            chunks.push(chunk);
        });

        req.on("end", () => {
            resolve(Buffer.concat(chunks));
        });

        req.on("error", reject);
    });
}

module.exports = async (req, res) => {

    if (req.method !== "POST") {
        return res.status(405).send("Método no permitido");
    }

    const sig =
        req.headers["stripe-signature"];

    let event;

    try {

        const rawBody =
            await leerRawBody(req);

        event =
            stripe.webhooks.constructEvent(
                rawBody,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );

    } catch (error) {

        console.error(
            "Webhook signature error:",
            error.message
        );

        return res.status(400).send(
            `Webhook Error: ${error.message}`
        );
    }

    try {

        if (
            event.type ===
            "checkout.session.completed"
        ) {

            const session =
                event.data.object;

            const email =
                session.customer_details?.email ||
                session.customer_email ||
                null;

            const resultado =
                await pool.query(
                    `
                    UPDATE compras
                    SET
                        pagado = true,
                        email = $1
                    WHERE stripe_session_id = $2
                    `,
                    [
                        email,
                        session.id
                    ]
                );

            console.log(
                "Compra pagada:",
                session.id,
                "Filas actualizadas:",
                resultado.rowCount
            );
        }

        return res.status(200).json({
            received: true
        });

    } catch (error) {

        console.error(error);

        return res.status(500).send(
            "Error procesando webhook"
        );
    }
};

module.exports.config = {
    api: {
        bodyParser: false
    }
};
