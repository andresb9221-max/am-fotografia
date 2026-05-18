//
//  Untitled.js
//  as
//
//  Created by Andres Barrera on 15/05/26.
//
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});



app.post("/registro", async (req, res) => {

    try {

        const {
            nombre,
            evento,
            numero_corredor,
            whatsapp,
            consentimiento
        } = req.body;

        if (!nombre || nombre.length < 3) {
            return res.status(400).json({
                error: "Nombre inválido"
            });
        }

        if (!evento) {
            return res.status(400).json({
                error: "Selecciona un evento"
            });
        }

        if (!numero_corredor.match(/^[0-9]{1,6}$/)) {
            return res.status(400).json({
                error: "Número de corredor inválido"
            });
        }

        if (!whatsapp.match(/^[0-9]{10,15}$/)) {
            return res.status(400).json({
                error: "WhatsApp inválido"
            });
        }

        if (!consentimiento) {
            return res.status(400).json({
                error: "Debes aceptar mensajes"
            });
        }

        await pool.query(
            `
            INSERT INTO registros
            (
                nombre,
                evento,
                numero_corredor,
                whatsapp,
                consentimiento
            )
            VALUES ($1, $2, $3, $4, $5)
            `,
            [
                nombre,
                evento,
                numero_corredor,
                whatsapp,
                consentimiento
            ]
        );

        res.json({
            mensaje: "Registro exitoso"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            error: "Error servidor"
        });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${process.env.PORT}`);
});
