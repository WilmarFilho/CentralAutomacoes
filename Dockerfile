# --- STAGE 2: RUNTIME ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3003

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 1. Copia o standalone primeiro
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 2. Copia os arquivos estáticos para DENTRO da pasta que o standalone espera
# O Next standalone espera encontrar a pasta 'static' dentro de '.next'
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 3. Copia a pasta public para a raiz do runtime
# O standalone também precisa da 'public' no mesmo nível do 'server.js'
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3003

CMD ["node", "server.js"]