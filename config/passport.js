// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const Users = require('../models/userModel'); // Adjust path as needed

console.log('CLIENT_ID in passport.js:', process.env.CLIENT_ID);
console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET);

passport.use(new GoogleStrategy(
  {
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    // callbackURL:
    //   process.env.NODE_ENV === 'production'
    //     ? 'https://specterra.in/auth/google/callback'
    //     : 'http://localhost:3000/auth/google/callback',
    callbackURL: 'http://localhost:3000/auth/google/callback', // Adjust for your environment
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      let user = await Users.findOne({ email });

      if (user) {
        return done(null, user); // User already exists
      } else {
        // Generate a random UID
        const randomNumbers = Math.floor(1000 + Math.random() * 9000);

        // Create new user without password (or set a dummy password)
        user = new Users({
          userId: `UID-${randomNumbers}`,
          name: profile.displayName,
          email: email,
          password: 'google_oauth_dummy_password_' + Date.now(), // Add dummy password
        });

        await user.save();
        return done(null, user);
      }
    } catch (error) {
      console.error('Google auth error:', error);
      return done(error, null);
    }
  }
));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await Users.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
