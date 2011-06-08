
/**
 * Module dependencies.
 */

var express = require('express');
var mongoose = require('mongoose');
var jsonreq = require('jsonreq');

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

app.listen(3001);
console.log("Express server listening on port %d", app.address().port);
