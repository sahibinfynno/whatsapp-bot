import express from "express";
import { config } from "dotenv";
import axios from "axios";
import bodyParser from "body-parser";
config();

const app = express();
app.use(bodyParser.json());

app.get("/webhooks", (req, res) => {
  if (req.query["hub.verify_token"] === process.env.WHATSAPP_SECRET) {
    return res.send(req.query["hub.challenge"]);
  }
  res.status(400);
});

app.post("/webhooks", async (req, res) => {
  if (req.body.entry[0]?.changes[0]?.value.messages[0].type !== "text") return;

  const message = req.body.entry[0]?.changes[0]?.value.messages[0]?.text.body;
  const phoneNumber = req.body.entry[0]?.changes[0]?.value.messages[0]?.from;
  const phoneNumberId =
    req.body.entry[0]?.changes[0]?.value?.metadata?.phone_number_id;

  console.log(phoneNumber, "phone number");
  console.log(message, "message");

  if (!message || !phoneNumber || !phoneNumberId) return;

  const gptRes = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  const gptResponse = gptRes.data.choices[0]?.message?.content;
  console.log(gptResponse, "chatGpt response");

  await axios.post(
    `https://graph.facebook.com/v16.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to: phoneNumber,
      text: {
        body: gptResponse,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.status(200).send();
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
