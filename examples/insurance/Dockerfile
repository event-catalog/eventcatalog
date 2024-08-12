FROM node:lts AS build
WORKDIR /app
COPY . .
# Fix for astro in docker https://github.com/withastro/astro/issues/2596
ENV NODE_OPTIONS=--max_old_space_size=2048
RUN npm i
RUN npm run build

FROM httpd:2.4 AS runtime
COPY --from=build /app/dist /usr/local/apache2/htdocs/
EXPOSE 80