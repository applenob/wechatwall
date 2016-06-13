/**
 * Created by cer on 2016/4/16.
 */
var express = require('express');
var path = require('path');

//创建express实例
var app = express();

//定义静态文件目录
app.use(express.static(path.join(__dirname,'public')));

//监听3000端口
app.listen(3001,function(req,res){
    console.log('app is running at port 3001')
});