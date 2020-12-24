#!/usr/bin/env bash

go get -u \
    github.com/aws/aws-sdk-go github.com/mitchellh/mapstructure \
    gopkg.in/yaml.v2 \
    github.com/satori/go.uuid github.com/dgrijalva/jwt-go \
    github.com/360EntSecGroup-Skylar/excelize/v2 \
    github.com/360EntSecGroup-Skylar/excelize

curl -sfL https://install.goreleaser.com/github.com/golangci/golangci-lint.sh \
    | sh -s -- -b $(go env GOPATH)/bin v1.17.1

