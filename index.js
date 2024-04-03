import { cloudEvent } from "@google-cloud/functions-framework";
import mailgun from "mailgun-js";
import { DataTypes, Model, Sequelize } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// Variables
dotenv.config();
const mailgunApiKey = process.env.MAILGUN_API_KEY || "xxx";
const mailgunDomain = process.env.MAILGUN_DOMAIN || "firstnamelastname.me";
const mailgunFrom =
  process.env.MAILGUN_FROM || "Firstname Lastname <firstnamelastname.me>";
const verifyEmailLink =
  process.env.VERIFY_EMAIL_LINK || "https://example.com/verify";
const postgresDBName = process.env.DATABASE_NAME || "webapp";
const postgresDBUser = process.env.DATABASE_USER || "webapp";
const postgresDBPassword = process.env.DATABASE_PASSWORD || "password";
const postgresDBHost = process.env.DATABASE_HOST || "localhost";
const verifyEmailExpiryInSeconds =
  parseInt(process.env.VERIFY_EMAIL_EXPIRY_SECONDS) || 120;

// Clients
const mailgunClient = mailgun({ apiKey: mailgunApiKey, domain: mailgunDomain });
export const postgresDBConnection = new Sequelize(
  postgresDBName,
  postgresDBUser,
  postgresDBPassword,
  {
    host: postgresDBHost,
    dialect: "postgres",
  }
);

// Models
export const User = postgresDBConnection.define(
  "User",
  {
    id: {
      // read only
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      // write only
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verification_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verification_expiry_timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    indexes: [
      {
        unique: true,
        fields: ["username"],
      },
    ],
    timestamps: true,
    createdAt: "account_created",
    updatedAt: "account_updated",
  }
);

cloudEvent("sendVerifyEmail", async (payload) => {
  const payloadMessage = payload.data.message.data;

  const message = JSON.parse(Buffer.from(payloadMessage, "base64").toString());

  const token = message.token;
  const email = message.email;

  await sendVerificationEmail(email, token);
});

export const sendVerificationEmail = async (email, token) => {
  const emailData = {
    from: mailgunFrom,
    to: email,
    subject: "Webapp: Verify your email address",
    text: `Click here to verify your email:\n${verifyEmailLink}/${token}\n`,
  };

  mailgunClient.messages().send(emailData, async (error, body) => {
    if (error) {
      console.error(
        `[Cloud Function: Send Verification Email] Error sending verification email to ${email}, error:` +
          error.message
      );
    } else {
      console.info(
        `[Cloud Function: Send Verification Email] Verification email sent to ${email} with token ${token} and messageId ${body.id}`
      );
      await updateVerificationExpiryTimestamp(email, token);
    }
  });
};

export const updateVerificationExpiryTimestamp = async (email, token) => {
  try {
    const user = await User.findOne({
      where: {
        username: email,
      },
    });
    user.verification_expiry_timestamp = new Date(
      new Date().getTime() + verifyEmailExpiryInSeconds * 1000
    );
    await user.save();

    console.info(
      `[Cloud Function: Send Verification Email] ${user.id} verification email expiry timestamp set as ${user.verification_expiry_timestamp}`
    );
  } catch (error) {
    console.error(
      `[Cloud Function: Send Verification Email] Error updating verification email sent timestamp for token ${token}, error:` +
        error.message
    );
    throw error;
  }
};
