FROM ubuntu:18.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        npm \
        nodejs \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

RUN curl -o go.tgz -O https://dl.google.com/go/go1.11.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go.tgz \
    && rm go.tgz

ENV GOPATH /go
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH

WORKDIR /opt/scalabel

COPY . .
RUN npm install \
    && sh scripts/install_go_packages.sh \
    && ./node_modules/.bin/webpack --config webpack.config.js --mode=development \
    && go build -i -o bin/scalabel ./server/http

CMD ['/opt/scalabel/bin/scalabel', '--config', '/opt/scalabel/data/config.yml']

EXPOSE 8686