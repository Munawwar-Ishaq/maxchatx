const mongoose = require('mongoose');

const userschema = new mongoose.Schema({
    username : String,
    email : String,
    id : Number,
    password : String,
    profile : String,
    verified : Boolean,
    isOnline : Boolean,
    about : String,
} , { timestamps : true});

const users = mongoose.model('User', userschema)



const verifyschema = new mongoose.Schema({
    email : String,
    id : Number,
    code : Number,
    attempt : Number
} , { timestamps : true});

const verificationAccount = mongoose.model('VerifictionAccount', verifyschema);

const ContactSchema = new mongoose.Schema({
    userId : String,
    contactID : String,
    isBlocked : Boolean,
})

const contact = mongoose.model('Contact', ContactSchema);

const DisplayContactSchema = new mongoose.Schema({
    contactName : String,
    contactID : String,
    isBlocked : Boolean,
    savedContact : Boolean,
    userID : String,
    profile : String,
    opponentSaved : Boolean,
    opponentBlocked : Boolean,
    oponentProfile : String,
    lastMsg : String,
    lastMsgType : String,
    lastMsgTime : String,
    unReadMsgCount : Number,
    senderID : String,
}, {timestamps : true})

const displayContact = mongoose.model('DisplayContact', DisplayContactSchema);


const OfflineMsgNotificationsSchema = new mongoose.Schema({
    userID : String,
    SenderID : Array,
}) 

const offlineMsgNotifications = mongoose.model('OfflineMsgNotifications', OfflineMsgNotificationsSchema);

const BlockedContactSchema = new mongoose.Schema({
    userID : String,
    contactID : Number,
});

const blockedContact = mongoose.model('BlockedContact', BlockedContactSchema);

const offlineSaveContactschema = new mongoose.Schema({
    userID : Number,
    contactID : Number,
    image : String,
    about : String
})

const offlineSaveContact = mongoose.model('OfflineSavingContact', offlineSaveContactschema);

const offlinMsgHandlerSchema = new mongoose.Schema({
    UserID : Number,
    SenderID : Number,
    ReceiverID : Number,
    IsReceived : Number,
    Message : String,
    MsgType : String,
    Time : String,
    IsSeen : Number,
    ChatID : String,
    Picture : String,
    Audio : String,
});

const offlineMessageHandler = mongoose.model('OfflineMessageHandler', offlinMsgHandlerSchema);

const offlineReceivedMsgSchema = new mongoose.Schema({
    UserID : Number,
    ReceiverID : Number,
    action : String
})

const offlineReceivedMsg = mongoose.model('OfflineReceivedMsg', offlineReceivedMsgSchema);

module.exports = {
    users,
    verificationAccount,
    contact,
    displayContact,
    offlineMsgNotifications,
    blockedContact,
    offlineSaveContact,
    offlineMessageHandler,
    offlineReceivedMsg,
}