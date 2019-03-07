FROM node:9-alpine
RUN apk update && apk add --no-cache \
	nano \
	git
WORKDIR /app
COPY . /app
ENTRYPOINT /app/entrypoint.sh
EXPOSE 4567
RUN npm install