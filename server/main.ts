import cors from "cors";
import express from "express";
import { Request, Response } from "express";
import expressWs from "express-ws";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import MemoryStore from "memorystore";
import path from "path";

import winston from "winston";
import expressWinston from "express-winston";

import router from "./routes/api";

let ews = expressWs(express());
const mStore = MemoryStore(session);
const app = ews.app;
// Render (and most container platforms) provide the port at runtime. Keep the
// local-development default so `npm run dev` continues to work unchanged.
const port = Number(process.env.PORT) || 8080;

const isProd = process.env.NODE_ENV == "production";

/*
  Setup the session and cookie parser.
  Based on - https://stackoverflow.com/a/55597997/1403643
*/
app.use(
  cors({
    origin: [process.env.ORIGIN || "http://localhost:8080"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // enable set cookie
  })
);

const secret = process.env.SESSION_SECRET || "secret";
app.use(bodyParser.json());
app.use(cookieParser(secret));
app.use(
  session({
    secret: secret,
    store: new mStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: false,
      secure: isProd,
    },
    resave: false,
    saveUninitialized: true,
  })
);

app.use(function (req: Request, res: Response, next: CallableFunction) {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Origin", process.env.ORIGIN);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-   Type, Accept, Authorization"
  );
  next();
});

if (isProd) app.set("trust proxy", 1);

app.use(
  expressWinston.logger({
    transports: [new winston.transports.Console()],
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.json()
    ),
    expressFormat: true,
    colorize: false,
  })
);

// To fix 304 responses.
app.disable("etag");

// Keep the public API under /api in every environment. The Vite development
// proxy forwards this prefix unchanged, matching the production container.
const routePrefix = process.env.ROUTE_PREFIX || "/api";
app.use(routePrefix, router);

// The production image puts Vite's built files in `server/public`. Serving
// them from the same Express process keeps the API, WebSocket and browser on
// one origin, which is required for the session cookie and Google OAuth flow.
const webRoot = path.join(__dirname, "../../public");
app.use(express.static(webRoot));
app.get("/{*path}", (req: Request, res: Response, next) => {
  if (req.path.startsWith(`${routePrefix}/`) || req.path === routePrefix) {
    return next();
  }
  res.sendFile(path.join(webRoot, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Listening on port ${port}`);
});
