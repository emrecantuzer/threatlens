# --- Stage 1: Builder (Derleme Aşaması) ---
# Bu aşamada projeyi derleyeceğiz, zafiyetli araçlar burada kalacak
FROM node:18-alpine AS builder

# Native modüller için gerekli araçlar
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
# Tüm bağımlılıkları yükle (devDependencies dahil - esbuild burada iner)
RUN npm install

COPY . .

# Veritabanını hazırla
RUN mkdir -p data
RUN npm run db:init

# Frontend'i derle (esbuild burada kullanılır ve işini bitirir)
RUN npm run build

# --- Stage 2: Runner (Üretim Aşaması) ---
# Temiz bir sayfa açıyoruz, buraya sadece lazım olanları alacağız
FROM node:18-alpine

# Production bağımlılıkları (better-sqlite3) için gerekli araçlar
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# KRİTİK ADIM: SADECE production bağımlılıklarını yükle (--omit=dev)
# Bu sayede esbuild, vite ve Go zafiyetleri bu imaja GİREMEZ.
RUN npm install --omit=dev

# Builder aşamasından sadece çalışan uygulamayı (dist, data, server.js) kopyala
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/server.js .
COPY --from=builder /app/scripts ./scripts

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "server.js"]