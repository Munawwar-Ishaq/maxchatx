const AccountVerificationMail = (username , link) => {
   return (
    `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      Subject: Welcome to MaxChat - Account Verification
      <br><br>
      Hello ${username},
      <br><br>
      Thank you for registering with MaxChat! To complete your account setup and
      start chatting,      
      <br><br>
      please verify your email address by clicking the link
      below: 
      <br><br>
      <a href="${link}">Click Here To Verify Your Account</a>
      <br><br>
      If you did not sign up for MaxChat, please
      disregard this email.
      <br><br>
      Happy chatting!
      <br><br>
      Best Regards, The MaxChat Team
    </div>
    `
   )
}


module.exports = {
  AccountVerificationMail,

}