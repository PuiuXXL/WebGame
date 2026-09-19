package realtime

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
)

func TestHandlerForwardsInputFromControllerToGame(t *testing.T) {
	server := httptest.NewServer(NewHandler(NewHub(), []string{"example.com"}))
	defer server.Close()

	websocketURL := "ws" + strings.TrimPrefix(server.URL, "http")
	contextWithTimeout, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	game := dialTestClient(t, contextWithTimeout, websocketURL)
	defer game.CloseNow()
	writeTestMessage(t, contextWithTimeout, game, Message{Type: MessageTypeJoin, Role: RoleGame})
	assertMessageType(t, readTestMessage(t, contextWithTimeout, game), MessageTypeStatus)

	controller := dialTestClient(t, contextWithTimeout, websocketURL)
	defer controller.CloseNow()
	writeTestMessage(t, contextWithTimeout, controller, Message{Type: MessageTypeJoin, Role: RoleController})
	assertMessageType(t, readTestMessage(t, contextWithTimeout, controller), MessageTypeStatus)
	controllerStatus := readTestMessage(t, contextWithTimeout, game)
	if controllerStatus.Status != "controller_connected" {
		t.Fatalf("game status = %q, want controller_connected", controllerStatus.Status)
	}

	pressed := true
	writeTestMessage(t, contextWithTimeout, controller, Message{
		Type:    MessageTypeInput,
		Key:     InputKeyRight,
		Pressed: &pressed,
	})

	input := readTestMessage(t, contextWithTimeout, game)
	if input.Type != MessageTypeInput || input.Key != InputKeyRight || input.Pressed == nil || !*input.Pressed {
		t.Fatalf("game received %#v, want right pressed", input)
	}
}

func dialTestClient(t *testing.T, ctx context.Context, url string) *websocket.Conn {
	t.Helper()
	connection, _, err := websocket.Dial(ctx, url, &websocket.DialOptions{
		HTTPHeader: http.Header{"Origin": []string{"http://example.com"}},
	})
	if err != nil {
		t.Fatalf("websocket.Dial() error = %v", err)
	}
	return connection
}

func writeTestMessage(t *testing.T, ctx context.Context, connection *websocket.Conn, message Message) {
	t.Helper()
	if err := wsjson.Write(ctx, connection, message); err != nil {
		t.Fatalf("wsjson.Write() error = %v", err)
	}
}

func readTestMessage(t *testing.T, ctx context.Context, connection *websocket.Conn) Message {
	t.Helper()
	var message Message
	if err := wsjson.Read(ctx, connection, &message); err != nil {
		t.Fatalf("wsjson.Read() error = %v", err)
	}
	return message
}

func assertMessageType(t *testing.T, message Message, messageType MessageType) {
	t.Helper()
	if message.Type != messageType {
		t.Fatalf("message type = %q, want %q", message.Type, messageType)
	}
}
