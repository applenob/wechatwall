/**
  上一个例子的微信墙没有获得用户头像、名字等信息
  这些信息要通过另一类微信API，也就是由服务器主动调用微信获得
  这一类API的安全机制不同于之前，不再通过简单的TOKEN校验
  而需要通过appID、appSecret获得access_token，然后再用
  access_token获取相应的数据

  可以先看以下代码：
  lib/config.js - appID和appSecret配置
  lib/token.js  - 获得有效token
  lib/user.js   - 获得用户信息
  lib/reply.js  - 回复微信的模板
  lib/ws.js     - 简单的websocket
*/

var fs= require('fs');
var PORT = require('./lib/config').wxPort;

var http = require('http');
var qs = require('qs');
var TOKEN = 'cer_token';


var getUserInfo = require('./lib/user').getUserInfo;
var replyText = require('./lib/reply').replyText; 

var wss = require('./lib/ws').wss;

function checkSignature(params, token){
  //1. 将token、timestamp、nonce三个参数进行字典序排序
  //2. 将三个参数字符串拼接成一个字符串进行sha1加密
  //3. 开发者获得加密后的字符串可与signature对比，标识该请求来源于微信

  var key = [token, params.timestamp, params.nonce].sort().join('');
  var sha1 = require('crypto').createHash('sha1');
  sha1.update(key);
  
  return  sha1.digest('hex') == params.signature;
}

var server = http.createServer(function (request, response) {
	

  //解析URL中的query部分，用qs模块(npm install qs)将query解析成json
  var query = require('url').parse(request.url).query;
  var params = qs.parse(query);

  if(!checkSignature(params, TOKEN)){
    //如果签名不对，结束请求并返回
    response.end('signature fail');
    return;
  }

  if(request.method == "GET"){
    //如果请求是GET，返回echostr用于通过服务器有效校验
    response.end(params.echostr);
  }else{
    //否则是微信给开发者服务器的POST请求
    var postdata = "";

    request.addListener("data",function(postchunk){
        postdata += postchunk;
    });

    //获取到了POST数据
    request.addListener("end",function(){
      var parseString = require('xml2js').parseString;
      
      parseString(postdata, function (err, result) {
	  console.log("服务器收到的用户发来的信息 result=",result);
        if(!err){
		
		
     //     if(result.xml.MsgType[0] === 'text'){
     //       getUserInfo(result.xml.FromUserName[0])
     //      .then(function(userInfo){
	 //			console.log("userInfo应该就是用户的基本信息data， userInfo=",userInfo);
     //         //获得用户信息，合并到消息中
     //        result.user = userInfo;
     //        //将消息通过websocket广播
     //        wss.broadcast(result);
     //        var res = replyText(result, "消息推送成功!!!");
     //         response.end(res);
     //   })
     //   }
		  
		switch(result.xml.MsgType[0])  {
		
		case 'text':
		
		  getUserInfo(result.xml.FromUserName[0])
           .then(function(userInfo){
	 			console.log("text: userInfo应该就是用户的基本信息data， userInfo=",userInfo);
              //获得用户信息，合并到消息中
             result.user = userInfo;
			 
		
             //将消息通过websocket广播
             wss.broadcast(result);
             var res = replyText(result, "成功接收到：文字!");
              response.end(res);
        })
		break;
		
		
		case 'image':
		
		getUserInfo(result.xml.FromUserName[0])
           .then(function(userInfo){
	 			console.log("image:userInfo应该就是用户的基本信息data， userInfo=",userInfo);
				
              //获得用户信息，合并到消息中
             result.user = userInfo;
			
			  
			   var re=require('request');
		 var img_url=result.xml.PicUrl[0];
		
		  
		
		 
		  // 存储用户所发图片的路径
		 var where=result.user.nickname+result.xml.CreateTime+'.jpg';
		 

		 
		 //将用户发的图片存储到服务器本地
		re(img_url).pipe(fs.createWriteStream("./client/user_images/"+where));
		
             //将消息通过websocket广播
             
			 
             var res = replyText(result, "成功接收到：图片!");
              response.end(res);
			  	//设置setTimeout的原因是，服务器存储图片的代码（将用户发的图片存储到服务器本地	re(img_url).pipe(fs.createWriteStream("./client/user_images/"+where));）可能还没完成，
	             //所以，隔一段时间在去调用，保证图片已经下载到服务器本地了。
			  setTimeout(function(){wss.broadcast(result);},1000*0.5);
			  
		 });
		 
		
		
		
		break;
		
		default :  
		
		getUserInfo(result.xml.FromUserName[0])
           .then(function(userInfo){
	 			console.log("other: userInfo应该就是用户的基本信息data， userInfo=",userInfo);
              //获得用户信息，合并到消息中
             result.user = userInfo;
             //将消息通过websocket广播
           //  wss.broadcast(result);
             var res = replyText(result, "本公众号暂时只支持文字和图片的信息，后续会进一步改进!");
              response.end(res);
			  });
			  
		break;
		
		
		
		}
		  
		  
        }
		
      });
    });
  }
});

server.listen(PORT);

console.log("Weixin server runing at port: " + PORT + ".");
