//
//  Untitled.js
//  as
//
//  Created by Andres Barrera on 15/05/26.
//
const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.log("Error conectando a MariaDB:", err);
    } else {
        console.log("Conectado a MariaDB");
    }
});

app.post("/registro", (req, res) => {

    const {
        nombre,
        evento,
        numero_corredor,
        whatsapp,
        consentimiento
    } = req.body;

    // VALIDACIONES

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
            error: "Número de WhatsApp inválido"
        });
    }

    if (!consentimiento) {
        return res.status(400).json({
            error: "Debes aceptar recibir mensajes"
        });
    }

    const sql = `
        INSERT INTO registros
        (nombre, evento, numero_corredor, whatsapp, consentimiento)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            nombre,
            evento,
            numero_corredor,
            whatsapp,
            consentimiento
        ],
        (err, result) => {

            if (err) {
                console.log(err);

                return res.status(500).json({
                    error: "Error guardando registro"
                });
            }

            res.json({
                mensaje: "Registro exitoso"
            });
        }
    );
});

app.listen(process.env.PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${process.env.PORT}`);
});
