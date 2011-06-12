/**
 * @description Functions base for communicate with fb
 * @author Daniel Aristizabal Romero
 * @date Junio 2011
 */

var crypto = require('crypto');

exports = module.exports = Facebook;

function Facebook(ops){
  this.APP_ID = ops.appId;
  this.APP_SECRET = ops.secret;
  this.APP_KEY = ops.key;
};

Facebook.prototype.request = function(signed_req){
  var request = signed_req.split('.');
  var sign = request[0].replace(/_/g, '/').replace(/-/g, '+');
  var fbObj = JSON.parse(this.base64_decode(request[1]));
  if (fbObj.algorithm != 'HMAC-SHA256'){
    console.error('Recibido un mensaje en diferente cifrado');
    throw new Error('Error de comunicacion con Facebook');
  }
  if (this.verify_sign(sign,request[1])){
    // Podemos confiar en el mensaje y tratar sus datos
    return fbObj;
  } else {
    console.error('La firma del mensaje no es valida');
    throw new Error('Error al validar el mensaje con Facebook');
    return false;
  }
};

Facebook.prototype.base64_decode = function(hash){
  var clean = hash.replace(/_/, '/').replace(/-/, '+');
  return new Buffer(clean, 'base64').toString();
};

Facebook.prototype.verify_sign = function(sign,msg){
  var real = crypto.createHmac('sha256', this.APP_SECRET).update(msg).digest('base64');
  return (real == sign+'=');
};
