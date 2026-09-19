package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"zut-web-game/backend/internal/realtime"
)

func main() {
	port := environmentValue("PORT", "8080")
	originPatterns := commaSeparatedValues(os.Getenv("ALLOWED_ORIGINS"))

	hub := realtime.NewHub()
	mux := http.NewServeMux()
	mux.Handle("/ws", realtime.NewHandler(hub, originPatterns))
	mux.HandleFunc("/healthz", healthHandler)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	shutdownContext, stopSignals := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stopSignals()

	go func() {
		log.Printf("realtime server listening on http://0.0.0.0:%s", port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server failed: %v", err)
		}
	}()

	<-shutdownContext.Done()

	gracefulContext, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(gracefulContext); err != nil {
		log.Printf("server shutdown failed: %v", err)
	}
}

func healthHandler(response http.ResponseWriter, _ *http.Request) {
	response.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(response).Encode(map[string]string{"status": "ok"}); err != nil {
		log.Printf("health response failed: %v", err)
	}
}

func environmentValue(name string, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}

func commaSeparatedValues(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	var values []string
	for _, item := range strings.Split(value, ",") {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			values = append(values, trimmed)
		}
	}
	return values
}
