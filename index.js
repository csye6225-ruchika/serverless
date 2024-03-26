import { cloudEvent } from "@google-cloud/functions-framework";
import mailgun from "mailgun-js";

// Variables
const mailgunApiKey = process.env.MAILGUN_API_KEY || "xxx";
const mailgunDomain = process.env.MAILGUN_DOMAIN || "firstnamelastname.me";
const mailgunFrom =
  process.env.MAILGUN_FROM || "Firstname Lastname <firstnamelastname.me>";
const verifyEmailLink =
  process.env.VERIFY_EMAIL_LINK || "https://example.com/verify";

// Clients
const mailgunClient = mailgun({ apiKey: mailgunApiKey, domain: mailgunDomain });

cloudEvent("sendVerifyEmail", async (payload) => {
  const payloadMessage = payload.data.message.data;

  const message = JSON.parse(Buffer.from(payloadMessage, "base64").toString());

  const id = message.id;
  const email = message.email;

  await sendVerificationEmail(email, id);
});

const sendVerificationEmail = async (email, id) => {
  const emailData = {
    from: mailgunFrom,
    to: email,
    subject: "Webapp: Verify your email address",
    text: `Click here to verify your email:\n${verifyEmailLink}/${id}\n`,
  };

  mailgunClient.messages().send(emailData, (error, body) => {
    if (error) {
      console.error(
        `[Cloud Function: Send Verification Email] Error sending verification email to ${email}, error:` +
          error.message
      );
    } else {
      console.info(
        `[Cloud Function: Send Verification Email] Verification email sent to ${email} with id ${id}`
      );
    }
  });
};
