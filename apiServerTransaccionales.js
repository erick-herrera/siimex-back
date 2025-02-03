/*
res.sendStatus(200) // equivalent to res.status(200).send('OK')
res.sendStatus(403) // equivalent to res.status(403).send('Forbidden')
res.sendStatus(404) // equivalent to res.status(404).send('Not Found')
res.sendStatus(500) // equivalent to res.status(500).send('Internal Server Error')
*/
require("dotenv").config();
var cat = require('./model/catalogos.ts');
var trx = require('./model/transaccionales.ts');
var propertiesReader = require('properties-reader')
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var helmet = require('helmet');
var mysqldb = require('mysql');
var jwt = require('jsonwebtoken');
var app = express();
var pool = mysqldb.createPool({
    host: process.env.DB_HOST,
    port: process.env.BD_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_USER_PSW,
    database: process.env.DB_NAME,
    connectionLimit: process.env.DB_CONNECTION_LIMIT
});
global.properties = propertiesReader('./utils/app.properties');
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
var jsonParser = bodyParser.json();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(process.env.END_POINT_TRANSACCIONES, function () {
    console.log('escuchando en el puerto ' + process.env.END_POINT_TRANSACCIONES);
});

const rutasProtegidas = express.Router();
rutasProtegidas.use((req, res, next) => {
    const token = req.headers['access-token'];

    if (token) {
        jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
            if (err) {
                return res.json({ outCode: properties.get('codeTokenError'), outDesc: properties.get('msgErrorTokenExpirado') });
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        res.send({
            outCode: properties.get('codeTokenError'), outDesc: properties.get('msgErrorTokenNoEncontrado') 
        });
    }
});

app.post('/consultaSolicitudes', rutasProtegidas, jsonParser, (req, res) => {

    let params = [];
    
    const numEstatus = req.body.numEstatus;
    const idSolicitud = req.body.idSolicitud;
    const refNomServicio = req.body.refNomServicio;
    const idLocacion = req.body.idLocacion;
    
    where='';
    if(numEstatus!=9){
        where+=' AND ' + trx.T_SOLICITUD.numEstatus + ' = ? ';
        params.push(numEstatus);
    }
    if(idSolicitud!=0){
        where+=' AND ' + trx.T_SOLICITUD.idSolicitud + ' = ? ';
        params.push(idSolicitud);
    }
    if(refNomServicio!=''){
        where+=' AND ' + trx.T_SOLICITUD.refNomServicio + ' = ? ';
        params.push(refNomServicio);
    }
    if(idLocacion!=0){
        where+=' AND ' + trx.T_SOLICITUD.idLocacion + ' = ? ';
        params.push(idLocacion);
    }
    

    const query = 'SELECT ' +
        trx.T_SOLICITUD.idSolicitud + ' AS idSolicitud,' +
        trx.T_SOLICITUD.idCliente + ' AS idCliente,' +
        trx.T_SOLICITUD.idLocacion + ' AS idLocacion,' +
        trx.T_SOLICITUD.idContacto + ' AS idContacto,' +
        trx.T_SOLICITUD.numEstatus + ' AS numEstatus,' +
        trx.T_SOLICITUD.refNomServicio + ' AS refNomServicio,' +
        ' DATE_FORMAT(' + trx.T_SOLICITUD.fecAltaSolicitud + ',' + properties.get('formatoFecha') + ') AS fecAltaSolicitud,' +
        trx.T_SOLICITUD.refUnidadCobro + ' AS refUnidadCobro,' +
        trx.T_SOLICITUD.numCantHoras + ' AS numCantHoras,' +
        trx.T_SOLICITUD.numPiezasHora + ' AS numPiezasHora,' +
        trx.T_SOLICITUD.refPlanta + ' AS refPlanta,' +
        trx.T_SOLICITUD.refTransito + ' AS refTransito' +
        
        ' FROM ' + trx.T_SOLICITUD.name +
        ' WHERE ' + trx.T_SOLICITUD.fecBaja + ' IS NULL';
        ejecutaConsulta(res,query,params);
});
app.post('/insertaSolicitud', rutasProtegidas, jsonParser, (req, res) => {

    const solicitud = req.body.solicitud;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    params.push(solicitud.idCliente);
    params.push(solicitud.idLocacion);
    params.push(solicitud.idContacto);
    params.push(solicitud.refNomServicio.toUpperCase());
    params.push(solicitud.numEstatus);
    params.push(solicitud.fecAltaSolicitud);
    params.push(solicitud.refUnidadCobro.toUpperCase());
    params.push(solicitud.numCantHoras);
    params.push(solicitud.numPiezasHora);
    params.push(solicitud.refPlanta.toUpperCase());
    params.push(solicitud.refTransito.toUpperCase());
    params.push(idUsuUltMod);

    const query = 'INSERT INTO ' + trx.T_SOLICITUD.name +
        ' ( ' + 
        trx.T_SOLICITUD.idCliente + ',' +
        trx.T_SOLICITUD.idLocacion + ',' +
        trx.T_SOLICITUD.idContacto + ',' +
        trx.T_SOLICITUD.refNomServicio + ',' +
        trx.T_SOLICITUD.numEstatus + ',' +
        trx.T_SOLICITUD.fecAltaSolicitud + ',' +
        trx.T_SOLICITUD.refUnidadCobro + ',' +
        trx.T_SOLICITUD.numCantHoras + ',' +
        trx.T_SOLICITUD.numPiezasHora + ',' +
        trx.T_SOLICITUD.refPlanta + ',' +
        trx.T_SOLICITUD.refTransito + ',' +
        trx.T_SOLICITUD.fecAlta + ',' +
        trx.T_SOLICITUD.idUsuUltMod + 
        ') VALUES (' +
        ' ? ,?,?,?,?,?,?,?,?,?,?,' + 
        'SYSDATE(),?);';
        ejecutaInsertUpdate(res,query,params);

});
app.post('/eliminaSolicitud', rutasProtegidas, jsonParser, (req, res) => {

    const solicitud = req.body.solicitud;
    const idUsuUltMod = req.body.idUsuUltMod;
    let params = [];
    params.push(idUsuUltMod);
    params.push(solicitud.idSolicitud);
    
    const query = 'UPDATE ' + trx.T_SOLICITUD.name +
        ' SET ' + trx.T_SOLICITUD.fecBaja + ' = SYSDATE() ,' +
        trx.T_SOLICITUD.idUsuUltMod + ' = ? ' +
        ' WHERE ' + trx.T_SOLICITUD.idSolicitud + ' ? ';
        ejecutaInsertUpdate(res,query,params);
    
});


function ejecutaConsulta(res,query,params) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error("la conexión no se pudo ontener del pool" + err.message);
            res.sendStatus(500);
        } else {
            connection.query(query, params, (err, rows) => {
                if (err) {
                    console.error(err.message);
                    res.sendStatus(500);
                } else {
                    console.log("registros:" + rows.length)
                    res.json(rows);
                }
                connection.release();
            });
        }
    });
}
function ejecutaInsertUpdate(res,query,params) {
    console.log(query);
    pool.getConnection((err, connection) => {
        if (err) {
            console.error(properties.get('msgErrorBDPool') + '-' + err.message);
            res.sendStatus(500);
        } else {
            connection.query(query, params, (err) => {
                if (err) {
                    if (err.code == 'ER_DUP_ENTRY') {
                        res.send({
                            outCode: 0,
                            outDesc: properties.get('msgErrorBdRegDup')
                        });
                    } else {
                        console.error(properties.get('msgErrorBdEjec') + " (" + err.code + ") " + err.message);
                        res.send({
                            outCode: 0,
                            outDesc: properties.get('msgErrorBdEjec')
                        });
                    }

                } else {
                    res.send({
                        outCode: 1,
                        outDesc: properties.get('msgExito')
                    });
                    connection.release();
                }

            });


        }
    });
}