const {
  users,
  verificationAccount,
  contact,
  displayContact,
  chat,
} = require("../models");
const { userImagUrl, SEND_CODE, userContactImageUrl } = require("../config");
const { AccountVerificationMail } = require("../mails");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const createAccountController = async (req, res) => {
  const { username, email, password, id } = req.body;
  const checkemail = await users.findOne({ email });

  if (checkemail) {
    res.send({
      success: false,
      message: "Email already exist",
    });
  } else {
    if (username.trim()) {
      if (username.trim().length > 3) {
        if (email.trim()) {
          let emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
          if (email.trim().match(emailPattern)) {
            if (password.trim()) {
              if (password.trim().length > 8) {
                if (id) {
                  const newUser = new users({
                    username,
                    email,
                    password,
                    id,
                    profile: userImagUrl(),
                    verified: false,
                    isOnline: false,
                    about: "Hey' I am Using MaxChat Here",
                  });
                  newUser.save().then((data) => {
                    let tok = jwt.sign(
                      { id: data._id },
                      process.env.JWT_SECRET_KEY
                    );
                    res.send({
                      success: true,
                      message: "account created successfully",
                      token: tok,
                      data: {
                        email: data.email,
                        id: data.id,
                        profile: data.profile,
                        username: data.username,
                        verified: data.verified,
                      },
                    });
                    let data2 = {
                      email,
                      id,
                      code: Math.floor(Math.random() * 988777365765365),
                    };
                    let token = jwt.sign(data2, process.env.JWT_SECRET_KEY, {
                      expiresIn: "1h",
                    });
                    let verificationLink =
                      "http://localhost:3000/AccountVerification/" + token;
                    const Verification = new verificationAccount({
                      ...data2,
                    });
                    Verification.save().then(() => {
                      SEND_CODE(
                        email,
                        "Account Verification",
                        AccountVerificationMail(username, verificationLink),
                        "MaxChat Mail Services"
                      );
                    });
                  });
                } else {
                  res.send({
                    success: false,
                    message: "Id must Be Required",
                  });
                }
              } else {
                res.send({
                  success: false,
                  message: "Password length must be greater than 8 characters",
                });
              }
            } else {
              res.send({
                success: false,
                message: "Please Enter Your Password",
              });
            }
          }
        } else {
          res.send({
            success: false,
            message: "Please Enter Your Email",
          });
        }
      } else {
        res.send({
          success: false,
          message: "Username length must be greater than 3 characters",
        });
      }
    } else {
      res.send({
        success: false,
        message: "Please Enter Your username",
      });
    }
  }
};

const LoginController = async (req, res) => {
  const { emailorid, password } = req.body;
  const sendEmail = async (userdata) => {
    let data2 = {
      email: userdata.email,
      id: userdata.id,
      code: Math.floor(Math.random() * 988777365765365),
    };
    let token = jwt.sign(data2, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    });
    let verificationLink = "http://localhost:3000/AccountVerification/" + token;
    // const Verification = new verificationAccount({
    //   ...data2,
    // });
    await verificationAccount.updateOne(
      { email: userdata.email },
      {
        code: data2.code,
      }
    );
    SEND_CODE(
      userdata.email,
      "Account Verification",
      AccountVerificationMail(userdata.username, verificationLink),
      "MaxChat Mail Services"
    );
  };
  if (emailorid && password) {
    if (isNaN(emailorid)) {
      let userdata = await users.findOne({ email: emailorid });
      if (userdata) {
        if (userdata.password === password) {
          if (userdata.verified === true) {
            let tok = jwt.sign(
              { id: userdata._id },
              process.env.JWT_SECRET_KEY
            );
            res.send({
              success: true,
              message: "Login Successfully",
              token: tok,
            });
          } else {
            let tok = jwt.sign(
              { id: userdata._id },
              process.env.JWT_SECRET_KEY
            );
            sendEmail(userdata);
            res.send({
              success: false,
              token: tok,
              message: "Please Verify Your Account",
            });
          }
        } else {
          res.send({
            success: false,
            message: "Please Enter a valid Password",
          });
        }
      } else {
        res.send({
          success: false,
          message: "Please Enter a valid Email",
        });
      }
    } else {
      let userdata = await users.findOne({ id: emailorid });
      if (userdata) {
        if (userdata.password === password) {
          if (userdata.verified === true) {
            let tok = jwt.sign(
              { id: userdata._id },
              process.env.JWT_SECRET_KEY
            );
            res.send({
              success: true,
              message: "Login Successfully",
              token: tok,
            });
          } else {
            let tok = jwt.sign(
              { id: userdata._id },
              process.env.JWT_SECRET_KEY
            );
            sendEmail(userdata);
            res.send({
              success: false,
              token: tok,
              message: "Please Verify Your Account",
            });
          }
        } else {
          res.send({
            success: false,
            message: "Please Enter a valid Password",
          });
        }
      } else {
        res.send({
          success: false,
          message: "Please Enter a valid ID",
        });
      }
    }
  } else {
    res.send({
      success: false,
      message: "Please Enter Your Email or ID and Password",
    });
  }
};

const verifyAccountController = async (req, res) => {
  const { token } = req.params;
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      res.send({
        success: false,
        message: "Token Expired",
      });
    } else {
      const { email, id, code } = decoded;
      const usercheck = await users.findOne({ email, id });
      if (!usercheck.verified) {
        const checkCode = await verificationAccount.findOne({
          email,
          id,
          code,
        });
        if (checkCode) {
          await users.updateOne(
            { email, id },
            {
              verified: true,
            }
          );
          await verificationAccount.deleteOne({ email });
          let datausers = await users.findOne({ email, id });
          let tok = jwt.sign({ id: datausers._id }, process.env.JWT_SECRET_KEY);
          res.send({
            success: true,
            message: "Account Verified Successfully",
            token: tok,
          });
        } else {
          res.send({
            success: false,
            message: "Invalid Code",
          });
        }
      } else {
        res.send({
          success: false,
          message: "Account Already Verified",
        });
      }
    }
  });
};

const sendCodeController = (req, res) => {
  const { token } = req.body;
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      res.send({
        success: false,
        message: "Token Expired",
      });
    } else {
      const userdata = await users.findOne({ _id: decoded.id });
      if (userdata) {
        let codejenerate = Math.floor(Math.random() * 988777365765365);
        let tokendata = {
          email: userdata.email,
          id: userdata.id,
          code: codejenerate,
        };
        let token = jwt.sign(tokendata, process.env.JWT_SECRET_KEY, {
          expiresIn: "1h",
        });
        let verificationLink =
          "http://localhost:3000/AccountVerification/" + token;
        SEND_CODE(
          userdata.email,
          "Account Verification",
          AccountVerificationMail(userdata.username, verificationLink),
          "MaxChat Mail Services"
        );
        let data = {
          email: userdata.email,
          id: userdata.id,
          code: codejenerate,
        };
        await verificationAccount.updateOne(
          { email: userdata.email },
          { code: data.code }
        );
        res.send({
          success: true,
          message: "Code Sent Successfully",
        });
      } else {
        res.send({
          success: false,
          message: "Account Not Found",
        });
      }
    }
  });
};

const getInfoController = (req, res) => {
  let { token } = req.body;
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      res.send({
        success: false,
        message: "Token Expired",
      });
    } else {
      const userdata = await users.findOne({ _id: decoded.id });
      if (userdata) {
        res.send({
          success: true,
          data: {
            username: userdata.username,
            email: userdata.email,
            id: userdata.id,
            profile: userdata.profile,
            verified: userdata.verified,
          },
        });
      } else {
        res.send({
          success: false,
          message: "Account Not Found",
        });
      }
    }
  });
};

// const addContactController = (req, res) => {
//   let { contactName, contactID, token } = req.body;
//   jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
//     if (err) {
//       res.send({
//         success: false,
//         message: "Token Expired",
//       });
//     } else {
//       let { id } = decoded;
//       if (contactName && contactID) {
//         let userdata = await users.findOne({ id: contactID });
//         if (userdata) {
//           let mydata = await users.findOne({ _id: id });
//           let checkContact = await contact.findOne({
//             userID: userdata._id,
//             contactID: mydata.id,
//           });
//           let checkMyDisplayContact = await displayContact.findOne({
//             userID: mydata._id,
//             contactID: userdata.id,
//           })
//           if (checkContact) {
//             if(checkMyDisplayContact){
//               await displayContact.updateOne(
//                 { userID: mydata._id, contactID: userdata.id },
//                 {
//                   contactName: contactName,
//                   contactID: contactID,
//                   isBlocked: false,
//                   savedContact: true,
//                   userID: id,
//                   profile: userContactImageUrl(),
//                   oponentProfile: userdata.profile,
//                   opponentSaved: checkContact.savedContact,
//                   opponentBlocked: checkContact.isBlocked,
//                 }
//               );

//               await displayContact.updateOne(
//                 { userID: userdata._id, contactID: mydata.id },
//                 {
//                   opponentSaved: true,
//                 }
//               );
//             }
//             await contact.updateOne(
//               { userID: userdata._id, contactID: mydata.id },
//               { opponentSaved: true }
//             );
//             let newContact = new contact({
//               contactName: contactName,
//               contactID: contactID,
//               isBlocked: false,
//               savedContact: true,
//               userID: id,
//               profile: userContactImageUrl(),
//               oponentProfile: userdata.profile,
//               opponentSaved: checkContact.savedContact,
//               opponentBlocked: checkContact.isBlocked,
//               about: userdata.about,
//             });
//             await newContact.save();
//             res.send({
//               success: true,
//               message: "Contact Added Successfully",
//             });
//           } else {
//             let newContact = new contact({
//               contactName: contactName,
//               contactID: contactID,
//               isBlocked: false,
//               savedContact: true,
//               userID: id,
//               profile: userContactImageUrl(),
//               oponentProfile: userdata.profile,
//               opponentSaved: false,
//               opponentBlocked: false,
//               about: userdata.about,
//             });
//             await newContact.save();
//             res.send({
//               success: true,
//               message: "Contact Added Successfully",
//             });
//           }
//         } else {
//           res.send({
//             success: false,
//             message: "Invalid Contact ID",
//           });
//         }
//       } else {
//         res.send({
//           success: false,
//           message: "Please Enter Contact Name and ID",
//         });
//       }
//     }
//   });
// };

const getdisplayContactController = (req, res) => {
  let { token } = req.body;
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      res.send({
        success: false,
        message: "Token Expired",
      });
    } else {
      let { id } = decoded;
      let userdata = await users.findOne({ _id: id });
      if (userdata) {
        let data = await displayContact.find({ userID: id });
        res.send({
          success: true,
          data: data,
        });
      } else {
        res.send({
          success: false,
          message: "Account Not Found",
        });
      }
    }
  });
};
const getAllContactController = (req, res) => {
  let { token } = req.body;
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      res.send({
        success: false,
        message: "Token Expired",
      });
    } else {
      let { id } = decoded;
      let userdata = await users.findOne({ _id: id });
      if (userdata) {
        let data = await contact.find({ userID: id });
        res.send({
          success: true,
          data: data,
        });
      } else {
        res.send({
          success: false,
          message: "Account Not Found",
        });
      }
    }
  });
};

const getLoacalUserdataController = async (req, res) => {
  let { id } = req.body;
  let userdata = await users.findOne({ id: id });
  if (userdata) {
    res.send({
      success: true,
      data: {
        username: userdata.username,
        email: userdata.email,
        id: userdata.id,
        profile: userdata.profile,
        verified: userdata.verified,
        about: userdata.about,
        Online: userdata.isOnline,
      },
    });
  }
};

const readMsgController = (req, res) => {
  let { token, contactID } = req.body;
  console.log("Read Msg");
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      res.send({
        success: false,
        message: "Token Expired",
      });
    } else {
      let { id } = decoded;
      await displayContact.updateOne(
        { userID: id, contactID: contactID },
        {
          $set: {
            unReadMsgCount: 0,
          },
        }
      );
      res.send({
        success: true,
        message: "Message Read Successfully",
      });
    }
  });
};

const getChatController = (req, res) => {
  let { token, contactID } = req.body;
  console.log("get chat");
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      res.send({
        success: false,
        message: "Token Expired",
      });
    } else {
      let { id } = decoded;
      let userdata = await users.findOne({ _id: id });
      if (userdata) {
        let data = await chat.find({ userID: id, recieverID: contactID });
        console.log(data);
        res.send({
          success: true,
          data: data,
        });
      } else {
        res.send({
          success: false,
          message: "Account Not Found",
        });
      }
    }
  });
};

const recievedMsgController = (req, res) => {
  let { token } = req.body;
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      res.send({
        success: false,
        message: "Token Expired",
      });
    } else {
      let { id } = decoded;
      let userdata = await users.findOne({ _id: id });
      if (userdata) {
        let data = await chat.updateMany(
          { recieverID: userdata.id },
          { msgRecieved: true }
        );
      } else {
        res.send({
          success: false,
          message: "Account Not Found",
        });
      }
    }
  });
};

module.exports = {
  createAccountController,
  verifyAccountController,
  sendCodeController,
  getInfoController,
  LoginController,
  getdisplayContactController,
  getAllContactController,
  getLoacalUserdataController,
  readMsgController,
  getChatController,
  recievedMsgController,
};
