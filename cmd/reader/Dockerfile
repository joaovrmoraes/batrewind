## Stage 1: build the Go binary
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o reader ./cmd/reader

## Stage 2: minimal runtime image
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata wget
WORKDIR /app
COPY --from=builder /app/reader .
COPY --from=builder /app/internal/db/migrations ./internal/db/migrations
EXPOSE 8081
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD wget -qO- http://localhost:8081/health || exit 1
CMD ["./reader"]
