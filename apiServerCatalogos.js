/*
res.sendStatus(200) // equivalent to res.status(200).send('OK')
res.sendStatus(403) // equivalent to res.status(403).send('Forbidden')
res.sendStatus(404) // equivalent to res.status(404).send('Not Found')
res.sendStatus(500) // equivalent to res.status(500).send('Internal Server Error')
*/
require("dotenv").config();
var cat = require('./model/catalogos.ts');
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

app.listen(process.env.END_POINT_CATALOGOS, function () {
    console.log('escuchando en el puerto ' + process.env.END_POINT_CATALOGOS);
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

app.post('/consultaClientes', rutasProtegidas, jsonParser, (req, res) => {

    //console.log(JSON.stringify(req.body));


    const query = 'SELECT ' +
        cat.C_CLIENTE.idCliente + ' AS idCliente,' +
        cat.C_CLIENTE.refNombre + ' AS refNombre' +
        ' FROM ' + cat.C_CLIENTE.name +
        ' WHERE ' + cat.C_CLIENTE.fecBaja + ' IS NULL';
        ejecutaConsulta(res,query);
});
app.post('/insertaCliente', rutasProtegidas, jsonParser, (req, res) => {

    const cliente = req.body.cliente;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    params.push(cliente.refNombre.toUpperCase());
    params.push(idUsuUltMod);

    const query = 'INSERT INTO ' + cat.C_CLIENTE.name +
        ' ( ' + cat.C_CLIENTE.refNombre + ',' +
        cat.C_CLIENTE.fecAlta + ',' +
        cat.C_CLIENTE.idUsuUltMod + ')' +
        ' VALUES (?,SYSDATE(),?);';
        ejecutaInsertUpdate(res,query,params);

});
app.post('/modificaCliente', rutasProtegidas, jsonParser, (req, res) => {

    const cliente = req.body.cliente;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    params.push(cliente.refNombre.toUpperCase());
    params.push(idUsuUltMod);
    params.push(cliente.idCliente);

    const query = 'UPDATE ' + cat.C_CLIENTE.name +
        ' SET ' + cat.C_CLIENTE.refNombre + ' = ? ,' +
        cat.C_CLIENTE.fecModifica + ' = SYSDATE() ,' +
        cat.C_CLIENTE.idUsuUltMod + ' = ? ' +
        ' WHERE ' + cat.C_CLIENTE.idCliente + ' = ? ';
        ejecutaInsertUpdate(res,query,params);
    
});
app.post('/eliminaCliente', rutasProtegidas, jsonParser, (req, res) => {

    const clientes = req.body.clientes;
    const idUsuUltMod = req.body.idUsuUltMod;
    ids='';
    for(var i=0; i<clientes.length;i++){
        ids+=( i > 0 ? ',':'') + clientes[i].idCliente ;
    }
    let params = [];
    params.push(idUsuUltMod);
    
    const query = 'UPDATE ' + cat.C_CLIENTE.name +
        ' SET ' + cat.C_CLIENTE.fecBaja + ' = SYSDATE() ,' +
        cat.C_CLIENTE.idUsuUltMod + ' = ? ' +
        ' WHERE ' + cat.C_CLIENTE.idCliente + ' IN ( ' + ids + ' )';
        ejecutaInsertUpdate(res,query,params);
    
});

app.post('/consultaLocacion', rutasProtegidas, jsonParser, (req, res) => {

    //console.log(JSON.stringify(req.body));
    const idCliente = req.body.idCliente;
    let params = [];
    params.push(idCliente);
    const query = 'SELECT ' +
        cat.C_LOCACION.idLocacion + ' AS idLocacion,' +
        cat.C_LOCACION.idCliente + ' AS idCliente,' +
        cat.C_LOCACION.refNombre + ' AS refNombre' +
        ' FROM ' + cat.C_LOCACION.name +
        ' WHERE ' + cat.C_LOCACION.fecBaja + ' IS NULL' +
        ' AND ' + cat.C_LOCACION.idCliente + ' = ?';
        console.log('se recibio idCliente=' + idCliente);
        console.log('se recibio idCliente=' + idCliente);
        ejecutaConsulta(res,query,params);
});
app.post('/consultaLocacionCliente', rutasProtegidas, jsonParser, (req, res) => {

    //console.log(JSON.stringify(req.body));
    const idCliente = req.body.idCliente;
    let params = [];
    params.push(idCliente);
    const query = 'SELECT ' +
        'A.' + cat.C_LOCACION.idLocacion.trim() + ' AS idLocacion,' +
        'A.' + cat.C_LOCACION.idCliente.trim() + ' AS idCliente,' +
        'A.' + cat.C_LOCACION.refNombre.trim() + ' AS refNombreLocacion,' +
        'B.' + cat.C_CLIENTE.refNombre.trim() + ' AS refNombreCliente' +
        ' FROM ' + cat.C_LOCACION.name + ' A, ' +
        cat.C_CLIENTE.name + ' B ' +
        ' WHERE A.'+cat.C_LOCACION.idCliente.trim() +' = B.' +cat.C_CLIENTE.idCliente.trim() +
        ' AND A.' + cat.C_LOCACION.fecBaja.trim() + ' IS NULL ' +
        ' ORDER BY B.'+ cat.C_CLIENTE.refNombre.trim() + ', A.' + cat.C_LOCACION.refNombre.trim();
        ejecutaConsulta(res,query,params);
});
app.post('/insertaLocacion', rutasProtegidas, jsonParser, (req, res) => {

    const locacion = req.body.locacion;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    params.push(locacion.idCliente);
    params.push(locacion.refNombre.toUpperCase());
    params.push(idUsuUltMod);

    const query = 'INSERT INTO ' + cat.C_LOCACION.name + '(' +
        cat.C_LOCACION.idCliente + ',' +
        cat.C_LOCACION.refNombre + ',' +
        cat.C_LOCACION.fecAlta + ',' +
        cat.C_LOCACION.idUsuUltMod + ')' +
        ' VALUES (?,?,SYSDATE(),?);';
        ejecutaInsertUpdate(res,query,params);

});
app.post('/modificaLocacion', rutasProtegidas, jsonParser, (req, res) => {

    const locacion = req.body.locacion;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    params.push(locacion.refNombre.toUpperCase());
    params.push(idUsuUltMod);
    params.push(locacion.idLocacion);

    const query = 'UPDATE ' + cat.C_LOCACION.name +
        ' SET ' + cat.C_LOCACION.refNombre + ' = ? ,' +
        cat.C_LOCACION.fecModifica + ' = SYSDATE() ,' +
        cat.C_LOCACION.idUsuUltMod + ' = ? ' +
        ' WHERE ' + cat.C_LOCACION.idLocacion + ' = ? ';
        ejecutaInsertUpdate(res,query,params);
    
});
app.post('/eliminaLocacion', rutasProtegidas, jsonParser, (req, res) => {

    const locaciones = req.body.locaciones;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    ids='';
    for(var i=0; i<locaciones.length;i++){
        ids+=( i > 0 ? ',':'') + locaciones[i].idLocacion ;
    }
    params.push(idUsuUltMod);
    const query = 'UPDATE ' + cat.C_LOCACION.name +
        ' SET ' + cat.C_LOCACION.fecBaja + ' = SYSDATE() ,' +
        cat.C_LOCACION.idUsuUltMod + ' = ? ' +
        ' WHERE ' + cat.C_LOCACION.idLocacion + ' IN ( ' + ids + ' )';
        ejecutaInsertUpdate(res,query,params);
    
});

app.post('/consultaContacto', rutasProtegidas, jsonParser, (req, res) => {

    //console.log(JSON.stringify(req.body));
    const idCliente = req.body.idCliente;
    let params = [];
    params.push(idCliente);
    const query = 'SELECT ' +
        cat.C_CONTACTO.idContacto + ' AS idContacto,' +
        cat.C_CONTACTO.idCliente + ' AS idCliente,' +
        cat.C_CONTACTO.refNombre + ' AS refNombre' +
        ' FROM ' + cat.C_CONTACTO.name +
        ' WHERE ' + cat.C_CONTACTO.fecBaja + ' IS NULL' +
        ' AND ' + cat.C_CONTACTO.idCliente + ' = ?';
        console.log('se recibio idCliente=' + idCliente);
        ejecutaConsulta(res,query,params);
});
app.post('/insertaContacto', rutasProtegidas, jsonParser, (req, res) => {

    const contacto = req.body.contacto;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    params.push(contacto.idCliente);
    params.push(contacto.refNombre.toUpperCase());
    params.push(idUsuUltMod);
    console.log('contacto.idCliente=' + contacto.idCliente);
    console.log('contacto.refNombre=' + contacto.refNombre);
    console.log('idUsuUltMod=' + idUsuUltMod);

    const query = 'INSERT INTO ' + cat.C_CONTACTO.name + '(' +
        cat.C_CONTACTO.idCliente + ',' +
        cat.C_CONTACTO.refNombre + ',' +
        cat.C_CONTACTO.fecAlta + ',' +
        cat.C_CONTACTO.idUsuUltMod + ')' +
        ' VALUES (?,?,SYSDATE(),?);';
        ejecutaInsertUpdate(res,query,params);

});
app.post('/modificaContacto', rutasProtegidas, jsonParser, (req, res) => {

    const contacto = req.body.contacto;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    params.push(contacto.refNombre.toUpperCase());
    params.push(idUsuUltMod);
    params.push(contacto.idContacto);

    const query = 'UPDATE ' + cat.C_CONTACTO.name +
        ' SET ' + cat.C_CONTACTO.refNombre + ' = ? ,' +
        cat.C_CONTACTO.fecModifica + ' = SYSDATE() ,' +
        cat.C_CONTACTO.idUsuUltMod + ' = ? ' +
        ' WHERE ' + cat.C_CONTACTO.idContacto + ' = ? ';
        ejecutaInsertUpdate(res,query,params);
    
});
app.post('/eliminaContacto', rutasProtegidas, jsonParser, (req, res) => {

    const contactos = req.body.contactos;
    const idUsuUltMod = req.body.idUsuUltMod;

    let params = [];
    ids='';
    for(var i=0; i<contactos.length;i++){
        ids+=( i > 0 ? ',':'') + contactos[i].idContacto ;
    }
    params.push(idUsuUltMod);
    const query = 'UPDATE ' + cat.C_CONTACTO.name +
        ' SET ' + cat.C_CONTACTO.fecBaja + ' = SYSDATE() ,' +
        cat.C_CONTACTO.idUsuUltMod + ' = ? ' +
        ' WHERE ' + cat.C_CONTACTO.idContacto + ' IN ( ' + ids + ' )';
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
                    console.log('query:' + query);
                    console.log('params:' + params.toString());
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