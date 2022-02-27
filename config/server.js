module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('URL', 'http://api.bakerrae.com'),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'df67d1a842f5996e532fbc0d343ebfae'),
    },
  },
});
