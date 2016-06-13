/**
 * Created by cer on 2016/4/12.
 */
var PORT = 9530;
var http = require('http');
var qs = require('qs');

var TOKEN = 'cer_token';

function checkSignature(params, token){
    //1.将token、timestamp、nonce三个参数进行字典序排序
    //2.将三个参数字符串拼接成一个字符串进行sha1加密
    //3.开发中获得加密后的字符串可与signature对比，表示该请求来源于微信
    var key = [token, params.timestamp, params.nonce].sort().join('');
    var sha1 = require('crypto').createHash('sha1');
    sha1.update(key);

    return sha1.digest('hex') == params.signature;
}

var server = http.createServer(function (request, response){
   //解析URL中的query部分，用qs模块将query解析成json
    var query = require('url').parse(request.url).query;
    var params = qs.parse(query);
    console.log(params);
    console.log("token-->",TOKEN);

    if(checkSignature(params,TOKEN)){
        response.end(params.echostr);
    }else{
        response.end('signature fail');
    }
});

server.listen(PORT);

console.log("Server runing at port: "+PORT + ".");