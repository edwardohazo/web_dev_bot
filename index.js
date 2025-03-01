import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import Groq from "groq-sdk";

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3000; // Use the port from .env or default to 3000

// Middleware
app.use(express.json());
const allowedOrigins = ['https://egj-react-app.netlify.app']; // On Production

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],  // Add other methods if needed
  allowedHeaders: ['Content-Type', 'Authorization'], // Add headers if needed
};

app.use(cors(corsOptions)); // On production ***
// app.use(cors()); // On Development ***

// Environment variables
const GROQ_API_BASE_URL = process.env.GROQ_API_BASE_URL; // Set in .env
const GROQ_API_KEY = process.env.GROQ_API_KEY;           // Set in .env

const groq = new Groq({ apiKey: GROQ_API_KEY });

if (!GROQ_API_BASE_URL || !GROQ_API_KEY) {
  console.error("Error: GROQ_API_BASE_URL and GROQ_API_KEY must be set in the .env file.");
  process.exit(1);
}

// In-memory conversation storage
const conversations = {};

// Default context for the bot (Information about the person)
const defaultContext = [
  {
    role: "system",
    content: "You are a very intelligent, kind, and professional virtual assistant. You are helping provide information about a developer named Eduardo as if you were Eduardo, who works in technology and has extensive experience in web development and programming. Always respond clearly and precisely. Questions do not come from Eduardo, only if asked about the response, share what you know.",
  },
  {
    role: "system",
    content: "Eduardo Jasso is an independent frontend web developer born on June 21, 1987, in Guadalajara, Jalisco, Mexico. At 37 years old, he brings a great passion for interface design and a strong skill in programming. Eduardo has worked on various web development projects, especially in creating dynamic and functional websites, optimizing user experiences (UX/UI), and integrating innovative solutions for his clients.",
  },
  {
    role: "system",
    content: "### Professional Experience of Eduardo Jasso:",
  },
  {
    role: "system",
    content: "**Merged Blocks (JUL 2024 - Present)**\n" +
              "- **Role**: Frontend Web Developer\n" +
              "- **Projects**: Development of white-label Web3 games.\n" +
              "- **Relevant tasks**:\n" +
              "  - Development of user interfaces (UI) for games using Flutter.\n" +
              "  - Design and development of the Merged Blocks website, ensuring an engaging and functional user experience.\n" +
              "  - Management of social media and content creation to increase online presence.\n" +
              "  - Creation and maintenance of internal tools using Node.js.\n" +
              "  - Digital marketing strategies and analysis of promotional campaigns.\n" +
              "- **Technologies used**: Node.js, Tailwind CSS, JavaScript, Dart, Zola SSG, Daisy UI."
  },
  {
    role: "system",
    content: "**HLM (FEB 2024 - JUN 2024)**\n" +
              "- **Role**: Frontend Web Developer\n" +
              "- **Projects**: Development of websites on WordPress.\n" +
              "- **Relevant tasks**:\n" +
              "  - Design and development of visually attractive and functional websites.\n" +
              "  - Optimization of websites with best SEO practices.\n" +
              "  - Customization of web solutions to reflect clients' brand identity.\n" +
              "  - Maintenance and updating of websites.\n" +
              "- **Technologies used**: WordPress CMS."
  },
  {
    role: "system",
    content: "**OCEAN EXPERIENCE (OCT 2023 - DEC 2023)**\n" +
              "- **Role**: Frontend Web Developer\n" +
              "- **Projects**: Diving and snorkeling equipment store.\n" +
              "- **Relevant tasks**:\n" +
              "  - Development of the website for the store.\n" +
              "  - Optimization of the online shopping experience.\n" +
              "- **Technologies used**: HTML, CSS, JavaScript."
  },
  {
    role: "system",
    content: "**FREE LANCE PROJECT (SEP 2022 - FEB 2023)**\n" +
              "- **Role**: Frontend Web Developer\n" +
              "- **Projects**: Development of a personal portfolio.\n" +
              "- **Relevant tasks**:\n" +
              "  - Design and development of the site's architecture.\n" +
              "  - UI and UX design to ensure a visually appealing experience.\n" +
              "  - Implementation of interactivity with JavaScript and animations.\n" +
              "- **Technologies used**: HTML, CSS, JavaScript."
  },
  {
    role: "system",
    content: "**EMBER FLIP FLOPS (FEB 2023 - AUG 2023)**\n" +
              "- **Role**: Full Stack Web Developer\n" +
              "- **Projects**: Development of an e-commerce website.\n" +
              "- **Relevant tasks**:\n" +
              "  - Development of responsive web pages using HTML, CSS, and JavaScript.\n" +
              "  - Implementation of a secure payment system using PayPal.\n" +
              "  - Implementation of CRUD operations and database management.\n" +
              "- **Technologies used**: Node.js, Express, MongoDB, PayPal."
  },
  {
    role: "system",
    content: "**SHIBAS ON THE MOON (AUG 2023 - OCT 2023)**\n" +
              "- **Role**: Frontend Web Developer\n" +
              "- **Projects**: Landing page for a cryptocurrency token.\n" +
              "- **Relevant tasks**:\n" +
              "  - Development of a responsive webpage with a contact form.\n" +
              "  - Design of attractive and interactive user interfaces.\n" +
              "  - Integration of JavaScript for dynamic elements.\n" +
              "- **Technologies used**: HTML, CSS, JavaScript."
  },
  {
    role: "system",
    content: "Eduardo has experience working with a variety of technologies, including Node.js, React JS, MongoDB, WordPress, and web design tools like Tailwind CSS and Flutter. His approach combines creativity and technical skills to deliver functional and visually appealing web solutions."
  },
  {
    role: "system",
    content: "And most important of all. If someone asks you about something not related to EduardO González Jass or something about his personal life just answere 'I only can give information about my professional life!' "
  }
];

// Function to communicate with the GROQ API
async function getGroqChatCompletion(context) {
  return groq.chat.completions.create({
    messages: context,
    model: "llama-3.3-70b-versatile",
  });
}

app.post("/api/prompt", async (req, res) => {
  const { prompt, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required to track conversations." });
  }

  try {
    // Initialize or retrieve the user's conversation history
    if (!conversations[userId]) {
      conversations[userId] = [];
    }

    const userConversation = conversations[userId];
    userConversation.push({ role: "user", content: prompt });

    const context = [...defaultContext, ...userConversation];

    const chatCompletion = await getGroqChatCompletion(context);

    if (!chatCompletion) {
      return res.status(500).json({ error: "Failed to get a response from the GROQ API." });
    }

    const botResponse = chatCompletion.choices[0].message.content;
    userConversation.push({ role: "assistant", content: botResponse });

    res.json({ prompt, botResponse });
  } catch (error) {
    console.error("Error interacting with GROQ API:", error);
    res.status(500).json({ error: "An internal error occurred." });
  }
});

// WebSocket server for chat communication
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Web Sockets Conection
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("New client connected");
  ws.on("message", async (message) => {
    const { userId, prompt } = JSON.parse(message);
    console.log(`Received message from user ${userId}: ${prompt}`);
    try {
      // const response = await fetch("http://localhost:" + PORT + "/api/prompt", {   // On development ***
        const response = await fetch("https://web-dev-bot.onrender.com/api/prompt", {  // On Production ***
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userId }),
      });
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      ws.send(JSON.stringify({ botResponse: data.botResponse }));
    } catch (error) {
      console.error(error);
      ws.send(JSON.stringify({ botResponse: `Error processing request` }));
    }
  });
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});      
