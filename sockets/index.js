require("dotenv").config();
const jwt = require("jsonwebtoken");
const {
  users,
  chat,
  contact,
  displayContact,
  blockedContact,
  offlineSaveContact,
  offlineMessageHandler,
  offlineReceivedMsg,
} = require("../models");
const { userContactImageUrl, contactDB, msgDB } = require("../config");

// Globals Variables
const UsersSocket = new Set();
let allContacts = [];
let allChats = [];

const GET_TIME = () => {
  let date = new Date();
  let hr = date.getHours();
  let minute = date.getMinutes();
  let timeType = "AM";
  if (hr > 12) {
    hr = hr - 12;
    timeType = "PM";
    if (minute > 12) {
      minute = minute - 12;
    } else if (minute < 10) {
      minute = "0" + minute;
    }
  } else if (hr < 10) {
    hr = "0" + hr;
  }

  let Time = hr + ":" + minute + " " + timeType;

  return Time;
};

const SocketEvents = (io) => {
  io.on("connection", (socket) => {
    let { token } = socket.handshake.auth;
    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
      if (err) {
        socket.emit("token-error");
      } else {
        // Find UserData from DataBase
        let UserData = await users.findById(decoded.id);

        // Update User Online status
        if (UserData) {
          await offlineSaveContact
            .find({ userID: UserData.id })
            .then(async (item) => {
              // console.log(item);
              if (item) {
                item.forEach((dat) => {
                  const sql =
                    "UPDATE contacts SET ProfileImage = ? , OpponentSaved = ? , About = ? WHERE ContactID = ? AND UserID = ?";
                  contactDB.run(
                    sql,
                    [dat.image, 1, dat.about, dat.contactID, UserData.id],
                    (err) => {
                      if (err) {
                        console.error("Error updating database:", err.message);
                      }
                    }
                  );
                });
                await offlineSaveContact
                  .deleteMany({ userID: UserData.id })
                  .then((dar) => {});
              }
              UserData.isOnline = true;
              try {
                await UserData.save();
                socket.emit("user-info", UserData);
              } catch (error) {
                console.error("Error saving UserData:", error.message);
              }

              let allSocketdata = [];

              UsersSocket.forEach((us) => {
                allSocketdata.push(us);
              });

              // Notify Opponent about the Connecting

              contactDB.all(
                "SELECT * FROM contacts WHERE UserID = ?",
                [UserData.id],
                (err, row) => {
                  if (err) {
                    console.error("Error fetching data:", err.message);
                  } else {
                    row.forEach((user) => {
                      let findincontcat = allSocketdata.filter(
                        (data) => data.AccountID === user.ContactID
                      );
                      if (findincontcat.length > 0) {
                        socket.broadcast
                          .to(findincontcat[0].SocketID)
                          .emit("OnineUser", {
                            id: UserData.id,
                          });
                        contactDB.all(
                          "UPDATE contacts SET IsOnline = ? WHERE ContactID = ? AND UserID = ?",
                          [1, findincontcat[0].AccountID, UserData.id],
                          (err) => {
                            if (err) {
                              console.error(
                                "Error updating database:",
                                err.message
                              );
                              return;
                            }
                          }
                        );
                      } else {
                        contactDB.all(
                          "UPDATE contacts SET IsOnline = ? WHERE ContactID = ? AND UserID = ?",
                          [0, user.ContactID, UserData.id],
                          (err) => {
                            if (err) {
                              console.error(
                                "Error updating database:",
                                err.message
                              );
                              return;
                            }
                          }
                        );
                      }
                    });

                    // Get My All Contact From DataBase
                    contactDB.all(
                      "SELECT * FROM contacts WHERE userID = ?",
                      [UserData.id],
                      (err, row) => {
                        if (err) {
                          console.error("Error fetching data:", err.message);
                        } else {
                          socket.emit("all contact", { row });
                          allContacts = row;
                        }
                      }
                    );

                    // Handle Message from Database when I am Offline
                    offlineMessageHandler
                      .find({ UserID: UserData.id })
                      .then((allmsg) => {
                        let idArr = [];
                        let sql2 =
                          "UPDATE contacts SET isDisplay = ? , LastMsg = ? ,  LastMsgType = ? , LastMsgTime = ? , lastMsgSenderID = ? , msgCount = msgCount + 1 WHERE UserID = ? AND ContactID = ? ";

                        if (allmsg.length > 0) {
                          allmsg.forEach((msg) => {
                            let sql =
                              "INSERT INTO msg (UserID , SenderID , ReceiverID , Message , MsgType , Time , IsReceived , IsSeen , Audio , Picture , ChatID) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
                            msgDB.run(
                              sql,
                              [
                                UserData.id,
                                msg.SenderID,
                                parseInt(msg.ReceiverID),
                                msg.Message,
                                msg.MsgType,
                                msg.Time,
                                msg.IsReceived,
                                msg.IsSeen,
                                msg.Audio,
                                msg.Picture,
                                msg.ChatID,
                              ],
                              (err) => {
                                if (err) {
                                  console.error(
                                    "Error inserting data:",
                                    err.message
                                  );
                                  return;
                                }
                                console.log("I Receive Msg ");
                                contactDB.run(
                                  sql2,
                                  [
                                    1,
                                    msg.Message,
                                    msg.MsgType,
                                    msg.Time,
                                    msg.SenderID,
                                    parseInt(msg.ReceiverID),
                                    parseInt(msg.SenderID),
                                  ],
                                  (err) => {
                                    if (err) {
                                      console.log(err);
                                      return;
                                    }
                                    console.log("Update Contact ");
                                    contactDB.all(
                                      "SELECT * FROM contacts WHERE UserID = ?",
                                      [UserData.id],
                                      (err, row) => {
                                        if (err) {
                                          console.log(
                                            "Error getting contact",
                                            err
                                          );
                                          return;
                                        }
                                        socket.emit("all contact", { row });
                                      }
                                    );
                                  }
                                );
                                msgDB.all(
                                  "SELECT * FROM msg WHERE userID = ?",
                                  [UserData.id],
                                  (err, row) => {
                                    socket.emit("all chats", { row });
                                  }
                                );

                                socket.emit("msgNotification", { row: msg });
                              }
                            );
                            if (!idArr.includes(msg.SenderID)) {
                              idArr.push(msg.SenderID);
                            }
                          });
                          idArr.forEach((id) => {
                            let AllSocket = [];
                            UsersSocket.forEach((user) => {
                              AllSocket.push(user);
                            });
                            let findInSocket = AllSocket.filter(
                              (soc) => soc.AccountID === id
                            );
                            if (findInSocket.length > 0) {
                              socket
                                .to(findInSocket[0].SocketID)
                                .emit("ReceivedMsg", {
                                  id: UserData.id,
                                });
                            } else {
                              new offlineReceivedMsg({
                                UserID: id,
                                ReceiverID: UserData.id,
                                action: "r",
                              }).save();
                            }
                          });

                          // Get My All Chats From DataBase
                          msgDB.all(
                            "SELECT * FROM msg WHERE userID = ?",
                            [UserData.id],
                            (err, row) => {
                              if (err) {
                                console.error(
                                  "Error fetching data:",
                                  err.message
                                );
                              } else {
                                socket.emit("all chats", { row });
                                allChats = row;
                              }
                            }
                          );

                          offlineMessageHandler
                            .deleteMany({ UserID: UserData.id })
                            .then((dar) => {});
                        } else {
                          // Get My All Chats From DataBase
                          msgDB.all(
                            "SELECT * FROM msg WHERE userID = ?",
                            [UserData.id],
                            (err, row) => {
                              if (err) {
                                console.error(
                                  "Error fetching data:",
                                  err.message
                                );
                              } else {
                                socket.emit("all chats", { row });
                                allChats = row;
                              }
                            }
                          );
                        }
                      });
                  }
                }
              );
            });

          // Set My Socket Id And Account Id In UserSocket Set
          UsersSocket.add({
            SocketID: socket.id,
            AccountID: UserData.id,
          });
        }

        // Add Contact Into DataBase
        socket.on("addContact", (e_data) => {
          const { token, contactName, contactID } = e_data;
          jwt.verify(
            token,
            process.env.JWT_SECRET_KEY,
            async (err, decoded) => {
              if (err) {
                socket.emit("error", {
                  errorCode: 102,
                  message: "Token Has Been Expired",
                });
              } else {
                users.findOne({ id: contactID }).then((finduser) => {
                  if (finduser) {
                    let online = finduser.isOnline ? 1 : 0;
                    contact
                      .findOne({ contactID: UserData.id })
                      .then((findincontact) => {
                        if (findincontact) {
                          blockedContact
                            .findOne({
                              userID: contactID,
                              contactID: UserData.id,
                            })
                            .then((checkBloack) => {
                              // console.log(checkBloack);
                              if (checkBloack) {
                                let sql_ADD_CONTACT =
                                  "INSERT INTO contacts (UserID , Name , IsOnline , ProfileImage , IsSaved , LastMsg , LastMsgTime , LastMsgType , OpponentSaved , ContactID , isDisplay , About , opponentBlocked , msgCount, lastMsgSenderID) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                                contactDB.run(
                                  sql_ADD_CONTACT,
                                  [
                                    UserData.id,
                                    contactName,
                                    online,
                                    userContactImageUrl(),
                                    1,
                                    null,
                                    null,
                                    null,
                                    1,
                                    contactID,
                                    0,
                                    null,
                                    1,
                                    0,
                                    0,
                                  ],
                                  (err) => {
                                    console.log("Block Save");
                                    let insertintoCntact = new contact({
                                      userId: UserData.id,
                                      contactID: contactID,
                                    });

                                    insertintoCntact.save().then(() => {
                                      contactDB.all(
                                        "SELECT * FROM contacts WHERE ContactID = ? AND UserID = ?",
                                        [contactID, UserData.id],
                                        (err, row) => {
                                          if (err) {
                                            console.error(
                                              "Error fetching data:",
                                              err.message
                                            );
                                          } else {
                                            socket.emit("success", {
                                              message:
                                                "Added Contact Successfully",
                                              action: "add contact",
                                              data: row[0],
                                            });
                                          }
                                        }
                                      );
                                    });
                                  }
                                );
                              } else {
                                let sql_ADD_CONTACT =
                                  "INSERT INTO contacts (UserID , Name , IsOnline , ProfileImage , IsSaved , LastMsg , LastMsgTime , LastMsgType , OpponentSaved , ContactID , isDisplay , About , opponentBlocked , msgCount , lastMsgSenderID) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                                contactDB.run(
                                  sql_ADD_CONTACT,
                                  [
                                    UserData.id,
                                    contactName,
                                    online,
                                    finduser.profile,
                                    1,
                                    null,
                                    null,
                                    null,
                                    1,
                                    contactID,
                                    0,
                                    finduser.about,
                                    0,
                                    0,
                                    0,
                                  ],
                                  (err) => {
                                    console.log(
                                      "user Save not block in contact"
                                    );
                                    let insertintoCntact = new contact({
                                      userId: UserData.id,
                                      contactID: contactID,
                                    });
                                    insertintoCntact.save().then(() => {
                                      contactDB.all(
                                        "SELECT * FROM contacts WHERE ContactID = ? AND UserID = ?",
                                        [contactID, UserData.id],
                                        (err, row) => {
                                          if (err) {
                                            console.error(
                                              "Error fetching data:",
                                              err.message
                                            );
                                          } else {
                                            socket.emit("success", {
                                              message:
                                                "Added Contact Successfully",
                                              action: "add contact",
                                              data: row[0],
                                            });

                                            if (finduser.isOnline) {
                                              console.log("yes user is online");
                                              UsersSocket.forEach((user) => {
                                                if (
                                                  user.AccountID ===
                                                  parseInt(contactID)
                                                ) {
                                                  console.log(
                                                    "user is found in socket and id is " +
                                                      user.SocketID
                                                  );
                                                  socket.broadcast
                                                    .to(user.SocketID)
                                                    .emit("OpponentSaveYou", {
                                                      id: UserData.id,
                                                      image: UserData.profile,
                                                      about: UserData.about,
                                                    });
                                                }
                                              });
                                            } else {
                                              let offlineContact =
                                                new offlineSaveContact({
                                                  userID: finduser.id,
                                                  contactID: UserData.id,
                                                  image: UserData.profile,
                                                  about: UserData.about,
                                                });
                                              offlineContact.save();
                                            }
                                          }
                                        }
                                      );
                                    });
                                  }
                                );
                              }
                            });
                        } else {
                          let sql_ADD_CONTACT =
                            "INSERT INTO contacts (UserID , Name , IsOnline , ProfileImage , IsSaved , LastMsg , LastMsgTime , LastMsgType , OpponentSaved , ContactID , isDisplay , About , opponentBlocked , msgCount , lastMsgSenderID) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                          contactDB.run(
                            sql_ADD_CONTACT,
                            [
                              UserData.id,
                              contactName,
                              online,
                              userContactImageUrl(),
                              1,
                              null,
                              null,
                              null,
                              0,
                              contactID,
                              0,
                              null,
                              0,
                              0,
                              0,
                            ],
                            (err) => {
                              console.log(
                                "Insert Contact Successfully not in Contact"
                              );
                              let insertintoCntact = new contact({
                                userId: UserData.id,
                                contactID: contactID,
                              });
                              insertintoCntact.save().then(() => {
                                contactDB.all(
                                  "SELECT * FROM contacts WHERE ContactID = ? AND UserID = ?",
                                  [contactID, UserData.id],
                                  (err, row) => {
                                    if (err) {
                                      console.error(
                                        "Error fetching data:",
                                        err.message
                                      );
                                    } else {
                                      socket.emit("success", {
                                        message: "Added Contact Successfully",
                                        action: "add contact",
                                        data: row[0],
                                      });
                                    }
                                  }
                                );
                              });
                            }
                          );
                        }
                      });
                  } else {
                    socket.emit("error", {
                      errorCode: 103,
                      message: "Invalid User ID",
                    });
                  }
                });
              }
            }
          );
        });

        //  Msg Handler
        socket.on("chat", (e_data) => {
          let sql =
            "INSERT INTO msg (UserID , SenderID , ReceiverID , Message , MsgType , Time , IsReceived , IsSeen , Audio , Picture , ChatID) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
          let sql2 =
            "UPDATE contacts SET isDisplay = ? , LastMsg = ? ,  LastMsgType = ? , LastMsgTime = ? , lastMsgSenderID = ? WHERE UserID = ? AND ContactID = ? ";
          msgDB.run(
            sql,
            [
              UserData.id,
              e_data.SenderID,
              parseInt(e_data.ReceiverID),
              e_data.Message,
              e_data.MsgType,
              e_data.Time,
              e_data.IsReceived,
              e_data.IsSeen,
              e_data.Audio,
              e_data.Picture,
              e_data.ChatID,
            ],
            (err) => {
              if (err) {
                console.log(err);
              } else {
                contactDB.all(
                  "SELECT * FROM contacts WHERE userID = ? AND ContactID = ?",
                  [UserData.id, parseInt(e_data.ReceiverID)],
                  (err, row) => {
                    if (err) {
                      console.log("Error getting contact", err);
                      return;
                    }
                    contactDB.run(
                      sql2,
                      [
                        1,
                        e_data.Message,
                        e_data.MsgType,
                        e_data.Time,
                        UserData.id,
                        UserData.id,
                        parseInt(e_data.ReceiverID),
                      ],
                      (err) => {
                        if (err) {
                          console.log(err);
                          return;
                        }
                        console.log("Update Contact ");
                        contactDB.all(
                          "SELECT * FROM contacts WHERE UserID = ?",
                          [UserData.id],
                          (err, row) => {
                            if (err) {
                              console.log("Error getting contact", err);
                              return;
                            }
                            socket.emit("all contact", { row });
                          }
                        );
                      }
                    );
                    if (row[0].opponentBlocked === 0) {
                      if (row.length > -1) {
                        let AllSocket = [];
                        UsersSocket.forEach((user) => {
                          AllSocket.push(user);
                        });
                        let findInSocket = AllSocket.filter(
                          (soc) => soc.AccountID === e_data.ReceiverID
                        );
                        console.log(findInSocket);
                        if (findInSocket.length > 0) {
                          socket.broadcast
                            .to(findInSocket[0].SocketID)
                            .emit("SendMeMsg", e_data);
                        } else {
                          console.log(
                            "User Is Offline I Can Enter Chat In DataBase"
                          );
                          let newchat = new offlineMessageHandler({
                            UserID: e_data.ReceiverID,
                            SenderID: parseInt(e_data.SenderID),
                            ReceiverID: parseInt(e_data.ReceiverID),
                            Message: e_data.Message,
                            MsgType: e_data.MsgType,
                            Time: e_data.Time,
                            IsReceived: e_data.IsReceived,
                            IsSeen: e_data.IsSeen,
                            Audio: e_data.Audio,
                            Picture: e_data.Picture,
                            ChatID: e_data.ChatID,
                          });
                          newchat.save().then(() => {
                            console.log("Insert Into Database");
                          });
                        }
                      }
                    }
                  }
                );
              }
            }
          );
        });

        // msg Seen handler
        socket.on("msgSeen", (e_data) => {
          console.log("msg Seen Handler Request received");
          // let sql =
          //   "UPDATE msg SET IsSeen = ? , IsReceived = ? WHERE UserID = ? AND ReceiverID = ? AND SenderID = ?";
          // msgDB.run(sql, [1 , 1  , UserData.id , e_data.id , UserData.id] , (err) => {
          //   if(err){
          //     console.log(err);
          //     return;
          //   }
          //   msgDB.all(
          //     "SELECT * FROM msg WHERE userID = ?",
          //     [UserData.id],
          //     (err, row) => {
          //       socket.emit("all chats", { row });
          //     }
          //   );

          // });
          let sql =
            "UPDATE contacts SET msgCount = 0 WHERE UserID = ? AND ContactID = ?";
          contactDB.run(sql, [UserData.id, parseInt(e_data.id)], (err) => {
            if (err) {
              console.log(err);
              return;
            }
            contactDB.all(
              "SELECT * FROM contacts WHERE UserID = ?",
              [UserData.id],
              (err, row) => {
                if (err) {
                  console.log("Error getting contact", err);
                  return;
                }
                socket.emit("all contact", { row });
              }
            );
          });
        });

        // I am Receive User Message
        socket.on("IReceivedMsg", (e_data) => {
          let sql =
            "INSERT INTO msg (UserID , SenderID , ReceiverID , Message , MsgType , Time , IsReceived , IsSeen , Audio , Picture , ChatID) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
          let sql2 = `
                    UPDATE contacts 
                    SET 
                      isDisplay = ?, 
                      LastMsg = ?, 
                      LastMsgType = ?, 
                      LastMsgTime = ?, 
                      lastMsgSenderID = ?, 
                      msgCount = ${
                        e_data.action === "r" ? "msgCount + 1" : "0"
                      } 
                    WHERE 
                      UserID = ? 
                      AND ContactID = ?
                  `;
          msgDB.run(
            sql,
            [
              UserData.id,
              parseInt(e_data.SenderID),
              parseInt(e_data.ReceiverID),
              e_data.Message,
              e_data.MsgType,
              e_data.Time,
              e_data.IsReceived,
              e_data.IsSeen,
              e_data.Audio,
              e_data.Picture,
              e_data.ChatID,
            ],
            (err) => {
              if (err) {
                console.log(err);
              } else {
                console.log("Opponent Insert Chat");
                let AllSocket = [];
                UsersSocket.forEach((user) => {
                  AllSocket.push(user);
                });
                let findInSocket = AllSocket.filter(
                  (soc) => soc.AccountID === e_data.SenderID
                );
                console.log(findInSocket);
                if (findInSocket.length > 0) {
                  socket.broadcast
                    .to(findInSocket[0].SocketID)
                    .emit("ReceivedMsg", { id: UserData.id , action : e_data.action });
                } else {
                  new offlineReceivedMsg({
                    UserID: parseInt(e_data.SenderID),
                    ReceiverID: UserData.id,
                    action: "r",
                  }).save();
                }
                console.log("I Receive Msg ");
                contactDB.run(
                  sql2,
                  [
                    1,
                    e_data.Message,
                    e_data.MsgType,
                    e_data.Time,
                    e_data.SenderID,
                    parseInt(e_data.ReceiverID),
                    parseInt(e_data.SenderID),
                  ],
                  (err) => {
                    if (err) {
                      console.log(err);
                      return;
                    }
                    console.log("Update Contact ");
                    contactDB.all(
                      "SELECT * FROM contacts WHERE UserID = ?",
                      [UserData.id],
                      (err, row) => {
                        if (err) {
                          console.log("Error getting contact", err);
                          return;
                        }
                        socket.emit("all contact", { row });
                      }
                    );
                  }
                );
                msgDB.all(
                  "SELECT * FROM msg WHERE userID = ?",
                  [UserData.id],
                  (err, row) => {
                    socket.emit("all chats", { row });
                  }
                );

                socket.emit("msgNotification", { row: e_data });

                // msgDB.all(
                //   "SELECT * FROM msg WHERE userID = ?",
                //   [UserData.id],
                //   (err, row) => {
                //     socket.emit("all chats", { row });
                //   }
                // );
              }
            }
          );
        });

        socket.on("UpdateMsgReceived", (e_data) => {
          console.log("Reciveid msg Update Request Msg" , e_data);
          let sql =
            `UPDATE msg SET IsReceived = ? , isSeen = ${e_data.action === 's' ? '1' : '0'} WHERE UserID = ? AND SenderID = ? AND ReceiverID = ?`;
          msgDB.run(
            sql,
            [1, UserData.id, UserData.id, parseInt(e_data.id)],
            (err) => {
              if (err) {
                console.log(err);
                return;
              }
              console.log("Sussfully update received message requet");
              msgDB.all(
                "SELECT * FROM msg WHERE userID = ?",
                [UserData.id],
                (err, row) => {
                  if (err) {
                    console.log("Error getting message" + err);
                    return;
                  }
                  socket.emit("all chats", { row });
                }
              );
            }
          );
        });

        // update User Profile Image
        socket.on("OpponentSaveMeUpdateImageData", (e_data) => {
          console.log(e_data);
          const sql =
            "UPDATE contacts SET ProfileImage = ? , OpponentSaved = ? , About = ? WHERE ContactID = ? AND UserID = ?";
          contactDB.run(
            sql,
            [e_data.image, 1, e_data.about, e_data.id, UserData.id],
            (err) => {
              if (err) {
                console.error("Error updating database:", err.message);
                return;
              }
              console.log("Database updated successfully");
              contactDB.all(
                "SELECT * FROM contacts WHERE userID = ?",
                [UserData.id],
                (err, row) => {
                  if (err) {
                    console.error("Error fetching data:", err.message);
                  } else {
                    socket.emit("all contact", { row });
                    allContacts = row;
                  }
                }
              );
            }
          );
        });

        socket.on("disconnect", () => {
          UserData.isOnline = false;
          UserData.save();
          let allSocketdata = [];
          UsersSocket.forEach((us) => {
            if (us.AccountID === UserData.id) {
              UsersSocket.delete(us);
            }
            allSocketdata.push(us);
          });

          // Notify Opponent about the Disconnect

          contactDB.all(
            "SELECT * FROM contacts WHERE UserID = ?",
            [UserData.id],
            (err, row) => {
              if (err) {
                console.error("Error fetching data:", err.message);
              } else {
                row.forEach((user) => {
                  let findincontcat = allSocketdata.filter(
                    (data) => data.AccountID === user.ContactID
                  );
                  if (findincontcat.length > 0) {
                    socket.broadcast
                      .to(findincontcat[0].SocketID)
                      .emit("OfflineUser", {
                        id: UserData.id,
                      });
                  }
                });
              }
            }
          );
        });

        socket.on("offlineUser", (e_data) => {
          contactDB.all(
            "UPDATE contacts SET IsOnline = ? WHERE ContactID = ? AND UserID = ?",
            [0, e_data.id, UserData.id],
            (err) => {
              if (err) {
                console.error("Error updating database:", err.message);
                return;
              }
              console.log("Database updated successfully");
              contactDB.all(
                "SELECT * FROM contacts WHERE userID = ?",
                [UserData.id],
                (err, row) => {
                  if (err) {
                    console.error("Error fetching data:", err.message);
                  } else {
                    socket.emit("all contact", { row });
                  }
                }
              );
            }
          );
        });
        socket.on("onlineUser", (e_data) => {
          contactDB.all(
            "UPDATE contacts SET IsOnline = ? WHERE ContactID = ? AND UserID = ?",
            [1, e_data.id, UserData.id],
            (err) => {
              if (err) {
                console.error("Error updating database:", err.message);
                return;
              }
              console.log("Database updated successfully");
              contactDB.all(
                "SELECT * FROM contacts WHERE userID = ?",
                [UserData.id],
                (err, row) => {
                  if (err) {
                    console.error("Error fetching data:", err.message);
                  } else {
                    socket.emit("all contact", { row });
                  }
                }
              );
            }
          );
        });
      }
    });
    socket.on("error", (err) => {
      console.error("Server error:", err);
    });
  });
};

module.exports = SocketEvents;
