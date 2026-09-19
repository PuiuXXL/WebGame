package realtime

import (
	"testing"
	"time"
)

func TestHubForwardsControllerInputToGame(t *testing.T) {
	hub := NewHub()
	game := newClient(RoleGame, nil)
	controller := newClient(RoleController, nil)
	hub.register(game)
	hub.register(controller)
	drainMessages(game)
	drainMessages(controller)

	pressed := true
	input := Message{Type: MessageTypeInput, Key: InputKeyRight, Pressed: &pressed}
	if err := hub.forwardInput(controller, input); err != nil {
		t.Fatalf("forwardInput() error = %v", err)
	}

	message := receiveMessage(t, game)
	if message.Type != MessageTypeInput || message.Key != InputKeyRight || message.Pressed == nil || !*message.Pressed {
		t.Fatalf("received message = %#v, want right pressed", message)
	}
}

func TestHubResetsInputWhenControllerDisconnects(t *testing.T) {
	hub := NewHub()
	game := newClient(RoleGame, nil)
	controller := newClient(RoleController, nil)
	hub.register(game)
	hub.register(controller)
	drainMessages(game)
	drainMessages(controller)

	hub.unregister(controller)

	reset := receiveMessage(t, game)
	if reset.Type != MessageTypeInputReset {
		t.Fatalf("first message type = %q, want %q", reset.Type, MessageTypeInputReset)
	}
	status := receiveMessage(t, game)
	if status.Type != MessageTypeStatus || status.Status != "controller_disconnected" {
		t.Fatalf("second message = %#v, want controller_disconnected status", status)
	}
}

func TestHubReplacesExistingController(t *testing.T) {
	hub := NewHub()
	first := newClient(RoleController, nil)
	second := newClient(RoleController, nil)
	hub.register(first)
	hub.register(second)

	select {
	case <-first.done:
	case <-time.After(time.Second):
		t.Fatal("replaced controller was not closed")
	}
}

func drainMessages(client *client) {
	for {
		select {
		case <-client.send:
		default:
			return
		}
	}
}

func receiveMessage(t *testing.T, client *client) Message {
	t.Helper()
	select {
	case message := <-client.send:
		return message
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for message")
		return Message{}
	}
}
