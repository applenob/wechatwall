/**
 * Created by cer on 2016/4/12.
 */
var PORT = 9530;
var http = require('http');
var qs = require('qs');
var TOKEN = 'cer_token';

var getUserInfo = require('./lib/user').getUserInfo;
var replyText = require('./lib/reply').replyText;

var wss = require('./lib/ws.js').wss;

function checkSignature(params, token){
    //1.将token、timestamp、nonce三个参数进行字典序排序
    //2.将三个参数字符串拼接成一个字符串进行sha1加密
    //3.开发中获得加密后的字符串可与signature对比，表示该请求来源于微信
    var key = [token, params.timestamp, params.nonce].sort().join('');
    var sha1 = require('crypto').createHash('sha1');
    sha1.update(key);

    return sha1.digest('hex') == params.signature;
}

function replyType(msg){
    var type="其他";
    if(msg.xml.MsgType[0] == 'text'){
        type="文字";
    }
    else if(msg.xml.MsgType[0] == 'image'){
        type="图片";
    }
    else if(msg.xml.MsgType[0] == 'location'){
        type="位置";
    }
    else if(msg.xml.MsgType[0] == 'voice'){
        type="声音";
    }
    else if(msg.xml.MsgType[0] == 'shortvideo'){
        type="小视频";
    }
    else if(msg.xml.MsgType[0] == 'video'){
        type="视频";
    }
    else if(msg.xml.MsgType[0] == 'link'){
        type="链接";
    }
    console.log(msg);

    //将要返回的消息通过一个简单的tmpl模板（npm install tmpl）返回微信
    var tmpl = require('tmpl');
    var replyTmpl = '<xml>' +
        '<ToUserName><![CDATA[{toUser}]]></ToUserName>' +
        '<FromUserName><![CDATA[{fromUser}]]></FromUserName>' +
        '<CreateTime><![CDATA[{time}]]></CreateTime>' +
        '<MsgType><![CDATA[{type}]]></MsgType>' +
        '<Content><![CDATA[{content}]]></Content>' +
        '</xml>';

    return tmpl(replyTmpl, {
        toUser: msg.xml.FromUserName[0],
        fromUser: msg.xml.ToUserName[0],
        type: 'text',
        time: Date.now(),
        content: "您发送的是"+type+"消息"
    });
}

var server = http.createServer(function (request, response){
    //解析URL中的query部分，用qs模块将query解析成json
    var query = require('url').parse(request.url).query;
    var params = qs.parse(query);
    //console.log(params);
    //console.log("token-->",TOKEN);

    if(!checkSignature(params,TOKEN)){
        //签名不对，结束请求并返回
        response.end('signature fail');
        return;
        response.end(params.echostr);
    }
    if(request.method == "GET"){
        //如果请求是GET，返回echostr用于通过服务器有效校验
        response.end(params.echostr);
    } else{
        //否则是微信发给开发者服务器的POST请求
        var postdata = "";
        request.addListener("data",function(postchunk){
           postdata += postchunk;
        });
        //获取到了POST数据
        request.addListener('end',function(){
            var parseString = require('xml2js').parseString;

            parseString(postdata, function (err, result) {
                if (!err) {
                    //我们将XML数据通过xml2js模块(npm install xml2js)解析成json格式
                    console.log(result['xml']['MsgType'][0]);
                    if(result.xml.MsgType[0] === 'text'){
                        getUserInfo(result.xml.FromUserName[0])
                            .then(function(userInfo){
                                //获得用户信息，合并到消息中
                                result.user = userInfo;
                                //将消息通过websocket广播
                                wss.broadcast(result);
                                var res = replyText(result, '您发送的是文本消息，可以上墙');
                                response.end(res);
                            })
                    }
                    else{
                        var res = replyType(result);
                        response.end(res);
                    }

                }
            });
        });
    }
});

server.listen(PORT);
console.log("Server runing at port " + PORT +'.');