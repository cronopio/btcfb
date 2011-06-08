
/**
 * Module dependencies.
 */

var express = require('express');
var mongoose = require('mongoose');
var jsonreq = require('jsonreq');
var crypto = require('crypto');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  app.set('db-uri', 'mongodb://localhost/btcfb-development');
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
  app.set('db-uri', 'mongodb://btcfb:t3st1ng@localhost/btcfb-production');
});

app.db = mongoose.connect(app.set('db-uri'));

var base64_decode = function(cifrado){
  var limpio = cifrado.replace(/_/, '/').replace(/-/, '+');
  return new Buffer(limpio, 'base64').toString();
};

var checkFirma = function(sinverificar, msg){
    var supuesta = sinverificar+'=';
    var firma = crypto.createHmac('sha256', '9e39d0ddc888b9e08c418debf14cf3b4').update(msg).digest('base64');
    if (firma == supuesta){
      return true;
    } else {
      return false;
    }

};

// Routes

app.get('/', function(req, res){
  jsonreq.get('http://bitcoincharts.com/t/weighted_prices.json', function(err, data) {
    res.render('index', {
      title:'Precio del Bitcoin en Facebook',
      locals: {
        dolares: data.USD['24h']
      , euros: data.EUR['24h']
      , libras: data.GBP['24h'] 
      }
    });
  });
});

app.post('/', function(req, res){
  if (req.body.signed_request){
    // Es una peticion desde facebook
    var peticion = req.body.signed_request.split('.');
    var firma = peticion[0].replace(/_/, '/').replace(/-/, '+');
    var fbObj = JSON.parse(base64_decode(peticion[1]));
    if (fbObj.algorithm != 'HMAC-SHA256'){
      console.error('Recibido un mensaje en diferente cifrado');
      throw new Error('Error de comunicacion con Facebook');
    }
    if (checkFirma(firma,peticion[1])){
        // Podemos confiar en el mensaje y tratar sus datos
        console.log(fbObj);
        res.redirect('/');
    } else {
      console.error('La firma del mensaje no es valida');
      throw new Error('Error al validar el mensaje con Facebook');
    }
  }
});

app.listen(3001);
console.log("Express server listening on port %d", app.address().port);
