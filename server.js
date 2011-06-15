
/**
 * Module dependencies.
 */

var express = require('express');
var jsonreq = require('jsonreq');
var Facebook = require('./facebook');
var mongo = require('mongodb');
var server = new mongo.Server("127.0.0.1", 27017, {});

var app = module.exports = express.createServer();

var fb = new Facebook({appId:'124829930933291', 
  key:'c2f33b41ee0f6d7dc3b65ba70b92ef6e', 
  secret:'9e39d0ddc888b9e08c418debf14cf3b4'
});

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());  
  app.use(express.session({secret:'bitcoinpriceonfacebook'}));
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.set('db-name', 'btcfb-devel');
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
  app.set('db-name', 'btcfb-production');
});

var db = new mongo.Db(app.set('db-name'), server, {});

var checkUser = function(req, res, next){
  if (req.session.fbInfo){
    req.session.recargas++;
  } else {
    console.log('Nuevo Visitante');
    req.session.recargas = 1;
  }
  next();
    
}

// Routes

app.get('/', checkUser, function(req, res){
  var locals = {};
  // Traemos los valores de bitcoincharts.com
  jsonreq.get('http://bitcoincharts.com/t/weighted_prices.json', function(err, data) {
    // Inicializamos los locales a pasar a la vista
    locals.dolares = {valor: data.USD['24h']};
    locals.euros = {valor: data.EUR['24h']};
    locals.libras = {valor: data.GBP['24h']};
    
    db.open(function(err,client){
      if (err) throw err;
      // Iniciamos la guardada de la informacion.
      db.collection('precios', function(err, precios){
        var timestamp = new Date();
        precios.insert({time:timestamp, precios:data}, {safe:true}, 
          function(err,objs){if (err) console.warn(err.message)});
      });
      
      // Revisamos la tendencia con el nuevo precio
      db.collection('precios', function (err, precios) {
        var ultimos = precios.find({}, {sort:{time:-1}});
        var nuevo = {};
        ultimos.nextObject(function(err,doc){
          nuevo = doc;
        }); 
        ultimos.nextObject(function(err,doc){
          var checkTendencia = function (nuevo, viejo) {
            var ret;
            if (nuevo === viejo) ret = '=';
            if (nuevo > viejo) ret = '↑';
            if (nuevo < viejo) ret = '↓';
            return ret;
          }
          locals.dolares.tendencia = checkTendencia(nuevo.precios.USD['24h'], doc.precios.USD['24h']);
          locals.euros.tendencia = checkTendencia(nuevo.precios.EUR['24h'], doc.precios.EUR['24h']);
          locals.libras.tendencia = checkTendencia(nuevo.precios.GBP['24h'], doc.precios.GBP['24h']);
          res.render('index', {
            title:'Bitcoin Price on Facebook',
            locals: locals
          });
        });
      });
      db.close();
    });
  });
});

app.post('/', function(req, res){
  if (req.body.signed_request){
    // Es una peticion desde facebook
    var mensaje = fb.request(req.body.signed_request);
    console.log(mensaje);
    if (mensaje.user_id){
      req.session.fbInfo = mensaje;
      console.log('El usuario '+mensaje.user_id+' ha autorizado la app');
      res.redirect('/');
    } else {
      fb.auth_dialog(res,'http://apps.facebook.com/bitcoin_price/');
    }
  }
});

app.listen(3001);
console.log("Express server listening on port %d", app.address().port);
