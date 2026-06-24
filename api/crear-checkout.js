const stripe = require("stripe")(
    process.env.STRIPE_SECRET_KEY
);

const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const PRECIO_FOTO = 80;

module.exports = async (req, res) => {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Método no permitido"
        });
    }

    try {

        const { carrito } = req.body;

        if (
            !Array.isArray(carrito) ||
            carrito.length === 0
        ) {
            return res.status(400).json({
                error: "Carrito vacío"
            });
        }

        const fotoIds =
            carrito.map(
                foto => String(foto.id)
            );

        const total =
            fotoIds.length * PRECIO_FOTO;

        const tokenDescarga =
            crypto.randomBytes(24).toString("hex");

        const session =
            await stripe.checkout.sessions.create({
                mode: "payment",

                payment_method_types: [
                    "card"
                ],

                line_items: [
                    {
                        price_data: {
                            currency: "mxn",

                            product_data: {
                                name:
                                    `Fotos A&M Fotografía (${fotoIds.length})`
                            },

                            unit_amount:
                                total * 100
                        },

                        quantity: 1
                    }
                ],

                success_url:
                    `${req.headers.origin}/gracias.html?session_id={CHECKOUT_SESSION_ID}`,

                cancel_url:
                    `${req.headers.origin}/fotos.html`,

                metadata: {
                    foto_ids:
                        JSON.stringify(fotoIds),

                    token_descarga:
                        tokenDescarga
                }
            });

        await pool.query(
            `
            INSERT INTO compras
            (
                stripe_session_id,
                foto_ids,
                total_mxn,
                pagado,
                token_descarga
            )
            VALUES
            ($1, $2, $3, $4, $5)
            `,
            [
                session.id,
                fotoIds,
                total,
                false,
                tokenDescarga
            ]
        );

        return res.status(200).json({
            url: session.url
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Error creando checkout"
        });
    }
};
