import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { flowRoutes } from "./routes/flowRoutes.js";
import { whatsappRoutes } from "./routes/whatsappRoutes.js";


const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true, // libera para o frontend local, ajustar em produção
});

await app.register(flowRoutes);
await app.register(whatsappRoutes);

app.get("/health", async () => ({ status: "ok" }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
