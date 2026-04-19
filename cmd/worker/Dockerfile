## Stage 1: build the Go binary
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o worker ./cmd/worker

## Stage 2: minimal runtime image
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/worker .
COPY --from=builder /app/internal/db/migrations ./internal/db/migrations
CMD ["./worker"]
