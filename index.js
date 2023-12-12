const https = require("https");
const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const passport = require("passport");
const cookieSession = require("cookie-session");
require("dotenv").config();
const { Strategy } = require("passport-google-oauth20");

const PORT = 3000;
const config = {
  CLIENT_ID: process.env["CLIENT_ID"],
  CLIENT_SECRET: process.env["CLIENT_SECRET"],
  COOKIE_KEY1: process.env["COOKIE_KEY1"],
  COOKIE_KEY2: process.env["COOKIE_KEY2"],
};
const AUTH_OPTIONS = {
  callbackURL: "/auth/google/callback",
  clientID: config.CLIENT_ID,
  clientSecret: config.CLIENT_SECRET,
};
function verifyCallback(accessToken, refreshToken, profile, done) {
  //   console.log("Profile: ", profile);
  done(null, profile);
}
passport.use(new Strategy(AUTH_OPTIONS, verifyCallback));
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  done(null, id);
});
const app = express();
app.use(helmet());
app.use(
  cookieSession({
    name: "session",
    maxAge: 24 * 60 * 60 * 1000,
    keys: [config.COOKIE_KEY1, config.COOKIE_KEY2],
  })
);
app.use((req, res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb) => cb();
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb) => cb();
  }
  next();
});
app.use(passport.initialize());
app.use(passport.session());
function checkIsLoggedIn(req, res, next) {
  console.log("Current user is ", req.user);
  const isLoggedIn = req.isAuthenticated() && req.user;
  if (!isLoggedIn) {
    return res.status(401).json({
      error: "You must log in.",
    });
  }
  next();
}
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email"],
  })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/failure",
    successRedirect: "/",
    session: true,
  }),
  (req, res) => {
    console.log("Google called us back");
  }
);
app.get("/auth/logout", (req, res, next) => {
  // remove req.user and clear session
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
  return res.redirect("/");
});
app.get("/secret", checkIsLoggedIn, (req, res) => {
  return res.send("your personal secret value is 42.");
});
app.get("failure", (req, res) => {
  res.send("Failed to log in");
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
https
  .createServer(
    {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    },
    app
  )
  .listen(PORT, () => {
    // console.log(fs.readFileSync("cert.pem"));

    console.log(`Listening on the port ${PORT}`);
  });
