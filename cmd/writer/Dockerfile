## Stage 1: build the Go binary
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o writer ./cmd/writer

## Stage 2: minimal runtime image
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata wget
WORKDIR /app
COPY --from=builder /app/writer .
COPY --from=builder /app/internal/db/migrations ./internal/db/migrations
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["./writer"]
