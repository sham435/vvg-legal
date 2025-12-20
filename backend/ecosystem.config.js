module.exports = {
  apps: [
    {
      name: "viral-video-backend",
      script: "npm",
      args: "run start:dev",
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
