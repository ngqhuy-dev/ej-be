// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

const API_URL = process.env.API_URL;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${API_URL}/auth/google/callback`,
      scope: ['profile', 'email'],
      prompt: 'select_account',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = {
          authProvider: 'google',
          googleId: profile.id,
          fullname: profile.displayName,
          email: profile.emails?.[0].value,
          avatar: {
            url: profile.photos?.[0].value,
            publicId: '',
          },
        };
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

module.exports = passport;
