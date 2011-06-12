
/**
 * Module dependencies.
 */

var express = require('express');
var mongoose = require('mongoose');
var jsonreq = require('jsonreq');
var Facebook = require('./facebook');

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
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({secret:'bitcoinpriceonfacebook'}));
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

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
