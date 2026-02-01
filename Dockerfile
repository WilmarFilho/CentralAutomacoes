# --- ESTÁGIO 1: BUILD ---
FROM node:20-alpine AS builder
WORKDIR /app

# Instala as dependências primeiro para aproveitar o cache do Docker
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante dos arquivos e faz o build
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# --- ESTÁGIO 2: RUNTIME ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3003

# Configurações de segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# COPIA OS ARQUIVOS DO ESTÁGIO 'builder'
# 1. Copia o servidor otimizado
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 2. Copia os arquivos estáticos (CSS/JS do navegador) para o local correto
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 3. Copia as imagens e assets da pasta public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3003

# No modo standalone, o Next gera um server.js que deve ser iniciado diretamente
CMD ["node", "server.js"]