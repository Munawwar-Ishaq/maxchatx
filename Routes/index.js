const express = require('express');
const Controller = require('../controllers')
const Routers = express.Router();


Routers.get('/' , (req , res) => {
    res.send('Hy What\'s Up How Are You')
})


Routers.post('/createaccount' , Controller.createAccountController);
Routers.post('/login' , Controller.LoginController);
Routers.post('/verifyaccount/:token' , Controller.verifyAccountController);
Routers.post('/SendMail' , Controller.sendCodeController);
Routers.post('/getInfo' , Controller.getInfoController);
// Routers.post('/addContact' , Controller.addContactController);
Routers.post('/getdisplaycontact' , Controller.getdisplayContactController);
Routers.post('/getallcontact' , Controller.getAllContactController);
Routers.post('/getLoacalUserdata' , Controller.getLoacalUserdataController);
Routers.post('/getLoacalUserdata' , Controller.getLoacalUserdataController);
Routers.post('/readmsg' , Controller.readMsgController);
Routers.post('/getChat' , Controller.getChatController);
Routers.post('/recievedMsg' , Controller.recievedMsgController);

module.exports = {
    Routers
}

