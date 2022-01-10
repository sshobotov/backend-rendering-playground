FROM node:17.3.0-alpine
# see https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-on-alpine
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont
# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm i
COPY experiment-k8s.js ./
COPY render.js ./
COPY random.js ./

CMD npm start
# > docker build -t render-server .
# + for minikube
# > docker tag render-server localhost:5000/render-server
# > docker push localhost:5000/render-server