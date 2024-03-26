import { cloudEvent } from "@google-cloud/functions-framework";
import { PubSub } from "@google-cloud/pubsub";
import mailgun from "mailgun-js";

// Clients

// Variables
const verifyEmailTopic = process.env.TOPIC_VERIFY_EMAIL || "sendVerifyEmail";
const mailgunApiKey = process.env.MAILGUN_API_KEY || "mailgunApiKey";
const mailgunDomain = process.env.MAILGUN_DOMAIN || "mailgunDomain";
const mailgunFrom = process.env.MAILGUN_FROM || "mailgunFrom";

cloudEvent("sendVerifyEmail", async (payload) => {
  const payloadMessage = payload.data.message.data;

  const message = JSON.parse(Buffer.from(payloadMessage, "base64").toString());

  const id = message.id;
  const email = message.email;

  console.info(`Send, ${email} with ${id} path variable!`);
  console.info(`env vars: ${verifyEmailTopic}, ${mailgunApiKey}, ${mailgunDomain}, ${mailgunFrom}`);
});
