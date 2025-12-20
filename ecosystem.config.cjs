module.exports = {
  apps: [
    {
      name: "vvg-backend",
      script: "npm",
      args: "run start:dev",
      cwd: "./backend",
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },
    {
      name: "vvg-frontend",
      script: "npm",
      args: "run dev",
      cwd: "./frontend",
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },
    {
      name: "vvg-ai-engine",
      script: "server.py",
      interpreter: "python3",
      cwd: "./backend/cogvideox",
      watch: false, // Python reloading handled internally or restart manually
      autorestart: true,
      max_memory_restart: "20G", // Protect system from OOM
    },
  ],
};
