# --- STAGE 1: BUILD ---
FROM node:20-alpine AS builder
WORKDIR /app

# Cache de dependências
COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Desabilita telemetria durante o build
ENV NEXT_TELEMETRY_DISABLED 1

# IMPORTANTE: Para usar o standalone, seu next.config.js 
# deve ter: output: 'standalone'
RUN npm run build

# --- STAGE 2: RUNTIME ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3003

# Criar usuário de sistema para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Ajuste para a pasta public: Copia apenas se existir
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/static ./.next/static

# Truque para copiar a pasta public apenas se ela existir no builder
# Isso evita o erro "file does not exist" que quebrou seu deploy
RUN if [ -d /app/public ]; then cp -r /app/public ./public; fi

# Copia o output standalone (requer a config no next.config.js)
# Isso já inclui os node_modules necessários, você não precisa copiar a pasta toda
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3003

# No modo standalone, rodamos o server.js diretamente com node, é muito mais rápido
CMD ["node", "server.js"]