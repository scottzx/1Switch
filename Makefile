.PHONY: build run clean tidy

BINARY_NAME=admin-api
PORT=8080

build:
	go build -o bin/$(BINARY_NAME) ./cmd/admin-api

run: build
	./bin/$(BINARY_NAME)

clean:
	rm -rf bin/

tidy:
	go mod tidy

deps:
	go mod download
