/*
res.sendStatus(200) // equivalent to res.status(200).send('OK')
res.sendStatus(403) // equivalent to res.status(403).send('Forbidden')
res.sendStatus(404) // equivalent to res.status(404).send('Not Found')
res.sendStatus(500) // equivalent to res.status(500).send('Internal Server Error')
*/

require("dotenv").config();

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

const generadorPasswords = require('generate-password');
const nodemailer = require('nodemailer');
// libreria para subir archivos
const multer = require('multer');
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
var jsonParser = bodyParser.json();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configura Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads'); // Directorio donde se guardarán los archivos
    },
    filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Nombre del archivo en el servidor
    },
});
const upload = multer({ storage: storage });

app.listen(process.env.END_POINT_SEGURIDAD, function () {
    console.log('escuchando en el puerto ' + process.env.END_POINT_SEGURIDAD);
});

// Ruta para manejar la solicitud POST con un archivo
app.post('/upload', upload.single('avatar'), (req, res) => {
    const archivo = req.file;
    if (!archivo) {
      return res.status(400).json({ mensaje: 'No se recibió ningún archivo' });
    }
    res.json({ mensaje: 'Archivo recibido con éxito', archivo });
  });

app.post('/autenticar', (req, res) => {
    if (req.body.usuario === process.env.USER_TKEN_USR
        && req.body.contrasena === process.env.USER_TKEN_PWS) {
        const payload = {
            check: true
        };
        const token = jwt.sign(payload, process.env.JWT_KEY, {
            expiresIn: 1440
        });
        res.json({
            outDesc: 'Autenticación correcta',
            token: token
        });
    } else {
        //res.json({ outDesc: "Usuario o contraseña incorrectos" });
        res.json(req.body);
        
    }
});

// 6
const rutasProtegidas = express.Router();
rutasProtegidas.use((req, res, next) => {
    const token = req.headers['access-token'];

    if (token) {
        jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
            if (err) {
                return res.json({ outDesc: 'Sesión inválida' });
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        res.send({
            outDesc: 'Sesión no detectada.'
        });
    }
});

app.post('/consultaUsuarios', rutasProtegidas, jsonParser, (req, res) => {

    //console.log(JSON.stringify(req.body));


    let params = [];


    const query = 'SELECT U.ID_CTL_USUARIO AS idUsuario, P.REF_NOMBRE AS refNomPerfil,U.ID_CTL_PERFIL AS idPerfil, U.CVE_USUARIO AS cveUsuario, U.REF_NOMBRE AS refNombre, U.REF_PATERNO AS refPaterno, U.REF_MATERNO AS refMaterno, null as refPassword, ' +
        ' DATE_FORMAT(U.FEC_ALTA,' + properties.get('formatoFecha') + ') as fecAlta '+ 
        ' FROM CTL_USUARIO U,	CTL_PERFIL P WHERE P.ID_CTL_PERFIL=U.ID_CTL_PERFIL';
        
    pool.getConnection((err, connection)=> {
        if (err) {
            console.error("la conexión no se pudo onbtener del pool" + err.message);
            res.sendStatus(500);
        } else {
            connection.query(query, (err, rows) => {
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
});

app.post('/consultaPerfiles', rutasProtegidas,jsonParser, (req, res) => {

    //CONSULTA DE PERFILES
    const query = 'SELECT P.ID_CTL_PERFIL as idPerfil, ' +
        'P.REF_NOMBRE as refNombre, ' + 
        'P.NUM_NIVEL AS numNivel ' +
        'FROM CTL_PERFIL P';
    
    pool.getConnection((err, connection)=> {
        if (err) {
            console.error("la conexión no se pudo onbtener del pool" + err.message);
            res.sendStatus(500);
        } else {
            connection.query(query, (err, rows) => {
                if (err) {
                    console.error(err.message);
                    res.sendStatus(500);
                } else {
                    res.json(rows);
                }
                connection.release();
            });
        }
    });
});

// crear usuario
app.post('/createUser', rutasProtegidas, jsonParser, (req, res) => {

    const perfil = req.body.perfil;
    const email = req.body.email;
    const nombre = req.body.nombre.toUpperCase();
    const paterno = req.body.paterno.toUpperCase();
    const materno = req.body.materno.toUpperCase();
    const idUsuUltMod = req.body.idUsuUltMod;
    
    
    

    let params = [];
    params.push(perfil);
    params.push(email);
    params.push(nombre);
    params.push(paterno);
    params.push(materno);
    params.push(idUsuUltMod);
    
    const query = 'INSERT INTO CTL_USUARIO (ID_CTL_PERFIL,CVE_USUARIO, REF_NOMBRE, REF_PATERNO, REF_MATERNO, FEC_ALTA,ID_CTL_USU_UM)' +
        'VALUES (?,?,?,?,?,SYSDATE(),?);';
    
    pool.getConnection((err, connection)=> {
        if (err) {
            console.error("la conexión no se pudo onbtener del pool" + err.message);
            res.sendStatus(500);
        } else {
            connection.query(query, params, (err, rows) => {
                if (err) {
                    if(err.code=='ER_DUP_ENTRY'){
                        res.send({
                            outCode: 0,
                            outDesc: "El email ya se encuentra registrado."
                        });
                    }else{
                        console.error("Error al registrar el usuario (" + err.code+") " + err.message);
                        res.send({
                            outCode: 0,
                            outDesc: "Error al registrar el usuario."
                        });
                    }
                    
                }else{
                    res.send({
                        outCode: 1,
                        outDesc: "Operación realizada exitosamente"
                    });
                    connection.release();
                }
                
            });
            
            
        }
    });
    
});

app.post('/login',rutasProtegidas, jsonParser, (req, res) => {

    //console.log(JSON.stringify(req.body));

    // No vamos a usar por el url
    const userName = req.body.userName;
    //const userName = req.body.userName;
    const password = req.body.password;

    let params = [];
    params.push(userName);
    params.push(password);

    const query = 'SELECT U.ID_CTL_USUARIO as idUsuario, ' +
        'P.ID_CTL_PERFIL as ifPerfil,' +
        'P.REF_NOMBRE as refNomPerfil,' +
        'U.CVE_USUARIO as cveUsuario,' +
        'U.REF_NOMBRE as nombre,' +
        'U.REF_PATERNO as paterno,' +
        'U.REF_MATERNO as materno,' +
        'U.FEC_ALTA as fecAlta' +
        ' FROM CTL_USUARIO U,' +
        '	CTL_PERFIL P ' +
        ' WHERE P.ID_CTL_PERFIL=U.ID_CTL_PERFIL AND U.CVE_USUARIO=? ' +
        '	AND U.REF_PASSWORD=? ;';
    
    pool.getConnection((err, connection)=> {
            if (err) {
                console.error("la conexión no se pudo onbtener del pool" + err.message);
                res.sendStatus(500);
            } else {
                connection.query(query, params, (err, rows) => {
                    if(err){
                        console.error("Ocurrio un error:" + err.message);
                        res.send({
                            outCode: 2,
                            outDesc: "Ocurrio un error!"
                        });
                    }else{
                        if (rows.length === 0) {
                            res.send({
                                outCode: 2,
                                outDesc: "Usuario/Password Incorrecto!"
                            });
                        } else {
                            res.send({
                                outCode: 1,
                                outDesc: "Operación exitosa",
                                idUsuario: rows[0].idUsuario,
                                idPerfil: rows[0].ifPerfil,
                                refNomPerfil: rows[0].refNomPerfil,
                                cveUsuario: rows[0].cveUsuario,
                                refNombre: rows[0].nombre,
                                refPaterno: rows[0].paterno,
                                refMaterno: rows[0].materno,
                                fecAlta: rows[0].fecAlta
                            });
                        }
                        connection.release();
                    }
                });
            }
            });
});

app.post('/resetPassword', rutasProtegidas, jsonParser, (req, res) => {

    //console.log(JSON.stringify(req.body));

    // obtenemos el usuario
    const userName = req.body.userName;


    let params = [];
    params.push(userName);

    const query = 'SELECT COUNT(*) AS numReg'+
        ' FROM CTL_USUARIO U'+
        ' WHERE U.CVE_USUARIO=?';
    
    pool.getConnection((err, connection)=> {
        if (err) {
            console.error("la conexión no se pudo onbtener del pool" + err.message);
            res.sendStatus(500);
        } else {
            //validamos EMAIL recibido
            connection.query(query, params, (err, rows) => {
            if (rows[0].numReg === 0) {
                res.send({
                    outCode: 2,
                    outDesc: "No se encontraron coincidencias con el EMail recibido!"
                });
            }else{
                //aqui ya sabemos que el email es correcto procedemos a asignar un password temporal y mandarlo por correo
                console.log("Reseteando password de " + userName);
                const passcode = generadorPasswords.generate({
                    length: 10,
                    numbers: true
                });
                saveCambioPassword(res,userName,passcode);
                console.log("Modificación de BD realizada ");
                sendMail(res,userName,passcode);
                console.log("Modificación de BD realizada ");
                res.send({
                    outCode: 1,
                    outDesc: "Operación realizada exitosamente"
                });
            }
            connection.release();
            });
        }
    });
  
});

function sendMail(res,userName,passcode){
    var transporter = nodemailer.createTransport({
        pool: true,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true, // upgrade later with STARTTLS
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PSW,
        },
    });
    transporter.verify(function (error, success) {
        if (error) {
            console.error("Problemas con el servicio SMTP");
            console.error(error);
            res.sendStatus(500);
        }
    });

    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: userName,
        subject: "Ha solicitado restablecer su password del sistema SIIMEX.",
        html: "<b>Puede acceder con la siguiente contraseña:</b></br>"+passcode+""
      };
    transporter.sendMail(mailOptions, function(err, data) {
        if (err) {
            console.error("Problemas con el servicio SMTP");
            console.error(err);
            res.sendStatus(500);
        } else {
            console.log("Email sent successfully");
        }
    });

}
function saveCambioPassword(res,cveUsuario, passwordNvo) {

    let params = [];
    params.push(passwordNvo);
    params.push(cveUsuario);
    const query = 'UPDATE CTL_USUARIO SET REF_PASSWORD = ? ' +
        ' WHERE CVE_USUARIO = ? ';

    pool.getConnection((err, connection)=> {
        if (err) {
            console.error("la conexión no se pudo onbtener del pool" + err.message);
            res.sendStatus(500);
        } else {
            //validamos EMAIL recibido
            connection.query(query, params, (err, rows) => {
            connection.release();
            });
        }
    });

   

}